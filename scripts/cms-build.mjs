#!/usr/bin/env node
/* ==========================================================================
   Mercy Seat Chapel — website update from the dashboard
   Reads published content from Sanity (public, read-only: no keys needed) and
   writes it into the marked sections of the existing HTML pages:

       <!-- cms:events-regular -->  …generated…  <!-- /cms:events-regular -->

   Also refreshes the YouTube lists and the shared details (SITE) in main.js.
   Runs in GitHub Actions after each publish (see .github/workflows/cms-publish.yml);
   it can also be run by hand:

       node scripts/cms-build.mjs                      (needs SANITY_PROJECT_ID)
       node scripts/cms-build.mjs --data seed.json     (offline, from a file)
       options: --no-youtube  --dry-run

   Safe by design: if Sanity can't be reached, nothing is changed; a section is
   only rewritten when there is content for it; pages keep their last good version.
   ========================================================================== */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as R from "../studio/shared/render.js";
import { todayInChurchTz, TIME_ZONE } from "../studio/shared/schedule.js";
import { youtubeId } from "../studio/shared/youtube.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const DRY = flag("--dry-run");
const API_VERSION = "v2025-02-19";
const TYPES = ["siteSettings", "homepage", "announcement", "event", "sermon", "ministry", "department", "outreach", "leader", "job"];
const log = (...a) => console.log("[cms]", ...a);

/* ---------- 1. Load published content ---------- */
async function loadFromSanity() {
  const projectId = process.env.SANITY_PROJECT_ID, dataset = process.env.SANITY_DATASET || "production";
  if (!projectId) throw new Error("SANITY_PROJECT_ID is not set (or pass --data file.json).");
  const query = `{"docs": *[_type in $types], "assets": *[_type in ["sanity.imageAsset","sanity.fileAsset"]]{_id, url, sha1hash, extension, originalFilename}}`;
  const url = `https://${projectId}.apicdn.sanity.io/${API_VERSION}/data/query/${dataset}?query=${encodeURIComponent(query)}&$types=${encodeURIComponent(JSON.stringify(TYPES))}&perspective=published`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const { result } = await res.json();
  return { docs: result.docs, assets: Object.fromEntries(result.assets.map((a) => [a._id, a])) };
}

async function loadFromFile(file) {
  const raw = await readFile(path.resolve(file), "utf8");
  const docs = file.endsWith(".ndjson") ? raw.split("\n").filter(Boolean).map((l) => JSON.parse(l)) : JSON.parse(raw);
  return { docs: docs.filter((d) => !String(d._id).startsWith("drafts.")), assets: {} };
}

/* ---------- 2. Pictures and files ----------
   A picture already in assets/images (same file contents) is used from there,
   so nothing is duplicated. New uploads are downloaded once into assets/cms/,
   resized for the web, so the site never depends on Sanity being reachable. */
let localBySha1;
async function localIndex() {
  if (localBySha1) return localBySha1;
  localBySha1 = {};
  const dir = path.join(ROOT, "assets/images");
  for (const f of await readdir(dir)) {
    const buf = await readFile(path.join(dir, f)).catch(() => null);
    if (buf) localBySha1[createHash("sha1").update(buf).digest("hex")] = `assets/images/${f}`;
  }
  return localBySha1;
}

function makeResolver(assets) {
  const cache = new Map(), pending = [];
  const resolve = (ref, crop, kind) => {
    if (!ref) return "";
    // Seed files reference local pictures directly
    if (typeof ref === "string" && ref.startsWith("local:")) return ref.slice(6);
    const key = ref + JSON.stringify(crop || {});
    if (cache.has(key)) return cache.get(key);
    const a = assets[ref];
    if (!a) { cache.set(key, ""); return ""; }
    const local = !crop && localBySha1[a.sha1hash];
    let out = local;
    if (!out) {
      const isImage = kind === "image" && !["svg", "gif"].includes(a.extension);
      const name = `${ref.replace(/^(image|file)-/, "").slice(0, 40)}${crop ? "-c" + createHash("sha1").update(JSON.stringify(crop)).digest("hex").slice(0, 6) : ""}.${isImage ? "webp" : a.extension}`;
      out = `assets/cms/${name}`;
      let src = a.url;
      if (isImage) {
        const p = new URLSearchParams({ w: "1600", fit: "max", fm: "webp", q: "80" });
        if (crop) p.set("rect", crop);
        src += "?" + p;
      }
      pending.push({ src, out });
    }
    cache.set(key, out);
    return out;
  };
  return { resolve, pending };
}

// Sanity stores crops as fractions; the image service wants a pixel rectangle
function cropRect(img, assets) {
  const c = img?.crop, a = assets[img?.asset?._ref];
  if (!c || !a || !(c.top || c.bottom || c.left || c.right)) return null;
  const m = a._id.match(/-(\d+)x(\d+)-/);
  if (!m) return null;
  const [w, h] = [Number(m[1]), Number(m[2])];
  const x = Math.round(c.left * w), y = Math.round(c.top * h);
  return `${x},${y},${Math.round(w - x - c.right * w)},${Math.round(h - y - c.bottom * h)}`;
}

async function download(pending) {
  if (!pending.length) return;
  await mkdir(path.join(ROOT, "assets/cms"), { recursive: true });
  for (const { src, out } of pending) {
    const file = path.join(ROOT, out);
    if (existsSync(file)) continue;
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Couldn't download ${src} (${res.status})`);
    if (!DRY) await writeFile(file, Buffer.from(await res.arrayBuffer()));
    log("downloaded", out);
  }
}

/* ---------- 3. YouTube lists (replaces the old /youtube-feed server route) ---------- */
const xmlText = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
async function youtubeFeed(channel, streams) {
  const q = streams ? "playlist_id=UULV" + channel.slice(2) : "channel_id=" + channel;
  // YouTube's feed sometimes answers 404 for a while; try a few times, then give up until the next run
  let res;
  for (let attempt = 1; attempt <= 3; attempt++) {
    res = await fetch("https://www.youtube.com/feeds/videos.xml?" + q).catch(() => null);
    if (res?.ok) break;
    if (attempt < 3) await new Promise((r) => setTimeout(r, 3000 * attempt));
  }
  if (!res?.ok) throw new Error(`YouTube feed ${res ? res.status : "unreachable"}`);
  const xml = await res.text();
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => {
    const published = (e.match(/<published>([^<]+)/) || [])[1];
    return { id: (e.match(/<yt:videoId>([^<]+)/) || [])[1], title: xmlText((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || ""), published, date: published ? ymd.format(new Date(published)) : "" };
  }).filter((v) => v.id && v.date).sort((a, b) => (a.published < b.published ? 1 : -1));
}

/* ---------- 4. Writing into pages ---------- */
const changed = new Set();
const files = new Map();
async function file(rel) {
  if (!files.has(rel)) files.set(rel, await readFile(path.join(ROOT, rel), "utf8"));
  return files.get(rel);
}
/** Replace the content between <!-- cms:name --> and <!-- /cms:name --> (or the JS equivalent). */
async function region(rel, name, html) {
  if (html === null || html === undefined) return;
  const js = rel.endsWith(".js");
  const [open, close] = js ? [`/* cms:${name} */`, `/* /cms:${name} */`] : [`<!-- cms:${name} -->`, `<!-- /cms:${name} -->`];
  const src = await file(rel);
  const start = src.indexOf(open), end = src.indexOf(close);
  if (start < 0 || end < start) { console.warn(`[cms] marker ${name} not found in ${rel}; section left unchanged`); return; }
  const lineStart = src.lastIndexOf("\n", start) + 1;
  const pad = src.slice(lineStart, start);
  const body = html.split("\n").map((l) => (l ? pad + l : l)).join("\n");
  const next = src.slice(0, start) + open + "\n" + body + "\n" + pad + src.slice(end);
  if (next !== src) { files.set(rel, next); changed.add(rel); }
}

async function writeWhole(rel, content) {
  const prev = existsSync(path.join(ROOT, rel)) ? await readFile(path.join(ROOT, rel), "utf8") : null;
  if (prev !== content) { files.set(rel, content); changed.add(rel); }
}

/* ---------- 5. Site Settings → SITE in main.js ---------- */
function siteSettings(s) {
  const digits = (v) => String(v || "").replace(/\D/g, "");
  const phone = digits(s.phone);
  const [dial, code] = String(s.prayerLineDial || "").split(",").map(digits);
  const social = Object.fromEntries(["youtube", "instagram", "facebook", "twitter", "tiktok"].map((k) => [k, s.social?.[k] || "#"]));
  return {
    phone: s.phone || "",
    phoneHref: phone ? `tel:+${phone.length === 10 ? "1" + phone : phone}` : "",
    prayerLine: s.prayerLine || "",
    prayerLineHref: dial ? `tel:+${dial}${code ? `,,${code}#` : ""}` : "",
    email: s.email || "",
    address: s.address || "",
    mailingAddress: s.mailingAddress || "",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=" + String(s.address || "").replace(/,/g, "").trim().split(/\s+/).map(encodeURIComponent).join("+"),
    givingUrl: s.givingUrl || "",
    appStoreUrl: s.appStoreUrl || "#",
    playStoreUrl: s.playStoreUrl || "#",
    youtubeChannelId: s.youtubeChannelId || "",
    liveVideoId: youtubeId(s.liveVideo),
    youtubeLiveUrl: s.youtubeLiveUrl || "",
    social,
    times: (s.serviceTimes || []).map(({ label, time }) => ({ label, time }))
  };
}
// Readable JS: one setting per line, small objects (social links, service times) kept on one line each
function siteJs(v) {
  const val = (x) => (Array.isArray(x) ? `[\n${x.map((o) => `    ${obj(o)}`).join(",\n")}\n  ]` : typeof x === "object" ? obj(x) : JSON.stringify(x));
  const obj = (o) => `{ ${Object.entries(o).map(([k, x]) => `${k}: ${JSON.stringify(x)}`).join(", ")} }`;
  return `const SITE_SETTINGS = {\n${Object.entries(v).map(([k, x]) => `  ${k}: ${val(x)}`).join(",\n")}\n};`;
}

/* ---------- Main ---------- */
async function main() {
  const source = opt("--data");
  const { docs, assets } = source ? await loadFromFile(source) : await loadFromSanity();
  log(`loaded ${docs.length} published items${source ? ` from ${source}` : " from Sanity"}`);
  const byType = (t) => docs.filter((d) => d._type === t);
  const byId = Object.fromEntries(docs.map((d) => [d._id, d]));
  const deref = (refs) => (refs || []).map((r) => byId[r?._ref]).filter((d) => d && !d.archived);
  const sorted = (list) => [...list].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  const today = todayInChurchTz();

  await localIndex();
  const { resolve, pending } = makeResolver(assets);
  const settingsDoc = byId.siteSettings;
  const site = settingsDoc ? siteSettings(settingsDoc) : null;

  const c = {
    site: site || {},
    img: (image) => {
      if (!image) return { src: "" };
      const ref = image.asset?._ref || (image._sanityAsset ? "local:" + localPathFromSeed(image._sanityAsset) : "");
      return { src: resolve(ref, cropRect(image, assets), "image"), pos: R.cssPosition(image.hotspot) };
    },
    link: (l) => {
      if (!l) return { href: "#" };
      if (l.page) return { href: l.page, newTab: !!l.newTab };
      if (l.url) return { href: l.url, newTab: l.newTab ?? /^https?:/.test(l.url) };
      const f = l.file?.asset?._ref || (l.file?._sanityAsset ? "local:" + localPathFromSeed(l.file._sanityAsset) : "");
      if (f) return { href: resolve(f, null, "file"), newTab: true };
      return { href: "#" };
    }
  };

  // ---- Shared details (SITE) ----
  if (site) await region("assets/js/main.js", "site-settings", siteJs(site));

  // ---- Events & announcements ----
  const events = byType("event").filter((e) => !e.archived);
  const live = (e) => e.kind === "oneoff" && (e.endDate || e.startDate) >= today;
  const slides = [
    ...byType("announcement").filter((a) => a.featured && (a.image?.asset || a.image?._sanityAsset) && (!a.publishDate || a.publishDate <= today) && (!a.expiryDate || a.expiryDate >= today))
      .sort((a, b) => (a.publishDate < b.publishDate ? 1 : -1))
      .map((a) => R.announcementAsSlide({ ...a, relatedEvent: byId[a.relatedEvent?._ref] })),
    ...events.filter((e) => live(e) && e.featured !== false).sort((a, b) => (a.startDate < b.startDate ? -1 : 1))
  ];
  if (byType("event").length || byType("announcement").length) await writeWhole("assets/partials/upcoming-events.html", R.upcomingEventsPartial(c, slides));
  const regular = sorted(events.filter((e) => e.kind === "recurring" && e.listed !== false && e.recurrence?.frequency !== "yearly" && (!e.recurrence?.endsOn || e.recurrence.endsOn >= today)));
  const seasonal = sorted(events.filter((e) => e.kind === "recurring" && e.listed !== false && e.recurrence?.frequency === "yearly"));
  if (regular.length) await region("events.html", "events-regular", regular.map((e) => R.eventRow(c, e, today)).join("\n"));
  if (seasonal.length) await region("events.html", "events-seasonal", seasonal.map((e, i) => R.seasonalCard(c, e, i)).join("\n"));

  // ---- Homepage ----
  const home = byId.homepage;
  if (home) {
    const h = R.heroParts(c, home);
    if (h.slides) {
      await region("index.html", "hero-slides", h.slides);
      await region("index.html", "hero-texts", h.texts);
      await region("index.html", "hero-thumbs", h.thumbs);
    }
    if (home.kicker) await region("index.html", "hero-kicker", h.kicker);
    if (h.buttons) await region("index.html", "hero-buttons", h.buttons);
    const times = deref(home.serviceTimes);
    if (times.length) await region("index.html", "service-times", times.map((e, i) => R.timeCard(c, e, i)).join("\n"));
    const liveTimes = deref(home.liveSchedule);
    if (liveTimes.length) await region("live.html", "live-schedule", liveTimes.map((e, i) => R.liveCard(c, e, i)).join("\n"));
    const mins = deref(home.featuredMinistries);
    if (mins.length) await region("index.html", "place-tabs", R.placeTabs(c, mins));
    const outs = deref(home.featuredOutreach);
    if (outs.length) await region("index.html", "outreach-cards", outs.map((o, i) => R.outreachHomeCard(c, o, i)).join("\n"));
  }

  // ---- Ministries, departments, outreach, leaders, jobs ----
  const visible = (t) => sorted(byType(t).filter((d) => !d.archived));
  if (visible("ministry").length) await region("ministries.html", "ministries", R.zzRows(c, visible("ministry")));
  if (visible("department").length) await region("departments.html", "departments", R.zzRows(c, visible("department")));
  if (visible("outreach").length) {
    await region("outreach.html", "outreach-rows", R.zzRows(c, visible("outreach")));
    await region("outreach.html", "outreach-overview", visible("outreach").filter((o) => o.overviewTitle).map(R.outreachOverviewCard).join("\n"));
  }
  if (visible("leader").length) {
    // About shows a compact summary (photo, name, role); the Leadership page shows the full cards
    await region("about.html", "leaders-summary", visible("leader").map((l, i) => R.leaderCardHtml(c, l, i)).join("\n"));
    await region("leadership.html", "leaders", visible("leader").map((l) => R.leaderHtml(c, l)).join("\n"));
  }
  if (byType("job").length) {
    const open = sorted(byType("job").filter((j) => j.status === "open" && j.page && (!j.deadline || j.deadline >= today)));
    await region("job-center.html", "jobs", R.jobsHtml(open));
  }

  // ---- Sermons ----
  const sermons = byType("sermon").filter((s) => !s.archived && s.featured !== false && youtubeId(s.youtube))
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || String(b.date || "").localeCompare(String(a.date || "")));
  if (sermons.length) await region("sermons.html", "sermons-more", sermons.map((s, i) => R.sermonCard(c, s, i)).join("\n"));

  // ---- YouTube lists ----
  const channel = site?.youtubeChannelId || (await file("assets/js/main.js")).match(/youtubeChannelId:\s*"(UC[\w-]{22})"/)?.[1];
  if (!flag("--no-youtube") && channel) {
    try {
      const [uploads, streams] = await Promise.all([youtubeFeed(channel, false), youtubeFeed(channel, true)]);
      const name = "Mercy Seat Chapel";
      await writeWhole("assets/data/youtube-uploads.json", JSON.stringify(uploads, null, 1) + "\n");
      await writeWhole("assets/data/youtube-streams.json", JSON.stringify(streams, null, 1) + "\n");
      if (streams.length) await region("index.html", "latest-messages", R.messagesHtml(streams.slice(0, 5), name));
      if (uploads.length) await region("sermons.html", "recent-services", uploads.slice(0, 4).map((v, i) => R.videoListItem(v, i + 1, name)).join("\n"));
      const liveId = site?.liveVideoId;
      const replays = streams.filter((v) => v.id !== liveId).slice(0, 4);
      if (replays.length) await region("live.html", "recent-livestreams", replays.map(R.streamCard).join("\n"));
      log(`YouTube: ${uploads.length} uploads, ${streams.length} live streams`);
    } catch (e) {
      console.warn("[cms] YouTube feed unavailable, video lists left as they were:", e.message);
    }
  }

  // ---- Public content file (backup of what's published + source for the future app) ----
  // (skipped for offline test runs: seed files contain local file paths)
  if (!source) {
  const publicDocs = docs.filter((d) => TYPES.includes(d._type)).map(({ _rev, ...d }) => d);
  await writeWhole("assets/data/content.json", JSON.stringify({ documents: publicDocs.sort((a, b) => a._id.localeCompare(b._id)) }, null, 1) + "\n");
  }

  // ---- Save ----
  await download(pending);
  for (const rel of changed) {
    if (!DRY) { await mkdir(path.dirname(path.join(ROOT, rel)), { recursive: true }); await writeFile(path.join(ROOT, rel), files.get(rel)); }
  }
  log(changed.size ? `${DRY ? "would update" : "updated"}: ${[...changed].join(", ")}` : "website already up to date");
}

// Seed files point at pictures as "image@file:///…/assets/images/x.jpg"
function localPathFromSeed(s) {
  const p = decodeURI(String(s).replace(/^(image|file)@file:\/\//, "")).replace(/\\/g, "/");
  const i = p.lastIndexOf("/assets/");
  return i >= 0 ? p.slice(i + 1) : p;
}

main().catch((e) => { console.error("[cms] update stopped, website left unchanged:", e.message); process.exit(1); });
