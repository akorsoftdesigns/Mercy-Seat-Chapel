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
const TYPES = ["siteSettings", "homepage", "aboutPage", "announcement", "event", "sermon", "ministry", "department", "outreach", "leader", "job"];
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

/* ---------- 3a. Which stream is live (YouTube Data API) ----------
   Uses the YOUTUBE_API_KEY secret, which exists only inside GitHub Actions (GitHub →
   Settings → Secrets and variables → Actions). The key is never written into any file,
   page or log: only the chosen video ID goes on the website. No key = this step is skipped
   and the dashboard's "Current livestream link" is used as before.
   Costs 3 of the 10,000 free daily quota units per run. */
async function youtubeLive(channel, key) {
  const api = async (endpoint, params) => {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${new URLSearchParams({ ...params, key })}`).catch(() => null);
    if (!res?.ok) throw new Error(`YouTube API ${endpoint} answered ${res ? res.status : "nothing"}`); // (message never includes the key)
    return res.json();
  };
  // Newest items of the channel's uploads (UU…) and live streams (UULV…): a broadcast that is live
  // or scheduled shows up there; then one call tells us which of them is live, upcoming or finished.
  const lists = await Promise.all(["UU", "UULV"].map((p) =>
    api("playlistItems", { part: "contentDetails", playlistId: p + channel.slice(2), maxResults: "5" })));
  const ids = [...new Set(lists.flatMap((l) => (l.items || []).map((i) => i.contentDetails?.videoId)).filter(Boolean))];
  if (!ids.length) return { live: "", latest: "" };
  const { items = [] } = await api("videos", { part: "snippet,liveStreamingDetails", id: ids.join(",") });
  // The most recent livestream that has finished (scheduled, not-yet-started streams are ignored)
  const latest = items.filter((v) => v.liveStreamingDetails?.actualEndTime)
    .sort((a, b) => Date.parse(b.liveStreamingDetails.actualEndTime) - Date.parse(a.liveStreamingDetails.actualEndTime))[0];
  return {
    live: items.find((v) => v.snippet?.liveBroadcastContent === "live")?.id || "",
    latest: latest?.id || ""
  };
}

/* ---------- 3b. A channel's livestreams (its YouTube "Live" tab), newest first ----------
   With the YouTube API key (GitHub secret): up to 25, dated by when each stream started,
   scheduled streams that haven't started left out (2 quota units). Without the key, or if
   the API fails: YouTube's public feed (15 newest). Only video IDs, titles and dates are saved. */
const churchDay = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
async function channelStreams(channel, key) {
  if (key) {
    try {
      const api = async (endpoint, params) => {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${new URLSearchParams({ ...params, key })}`).catch(() => null);
        if (!res?.ok) throw new Error(`YouTube API ${endpoint} answered ${res ? res.status : "nothing"}`); // (message never includes the key)
        return res.json();
      };
      const list = await api("playlistItems", { part: "contentDetails", playlistId: "UULV" + channel.slice(2), maxResults: "25" });
      const ids = (list.items || []).map((i) => i.contentDetails?.videoId).filter(Boolean);
      if (!ids.length) return [];
      const { items = [] } = await api("videos", { part: "snippet,liveStreamingDetails", id: ids.join(",") });
      return items.filter((v) => v.snippet?.liveBroadcastContent !== "upcoming")
        .map((v) => { const published = v.liveStreamingDetails?.actualStartTime || v.snippet.publishedAt; return { id: v.id, title: v.snippet.title, published, date: churchDay(published) }; })
        .sort((a, b) => (a.published < b.published ? 1 : -1));
    } catch (e) {
      console.warn("[cms] YouTube API unavailable for channel streams, using the public feed:", e.message);
    }
  }
  return youtubeFeed(channel, true);
}

/* ---------- 3c. Every video, by playlist, for Watch Live "Recent livestreams" ----------
   Needs the YouTube API key. "All" = every video on the channel (its uploads list); each button =
   every video in that playlist, newest first, so "Show more" can go to the very last one.
   Buttons: "Sunday Service" first, then the other playlists by their newest video. Only playlists
   with a video in the last PLAYLIST_MAX_AGE_DAYS days get a button, at most PLAYLIST_BUTTONS.
   Refreshed at most once an hour (1 quota unit per 50 videos read); otherwise, and without the key,
   the saved file (assets/data/youtube-playlists.json) is kept. The page loads that file only when
   someone presses "Show more". */
const PLAYLIST_BUTTONS = 10, PLAYLIST_MAX_AGE_DAYS = 365, PLAYLIST_FIRST = /^sunday service$/i;
const MAX_PAGES = 40; // 40 × 50 = up to 2,000 videos per list
async function channelPlaylists(channel, key) {
  const api = async (endpoint, params) => {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${new URLSearchParams({ ...params, key })}`).catch(() => null);
    if (!res?.ok) throw new Error(`YouTube API ${endpoint} answered ${res ? res.status : "nothing"}`); // (message never includes the key)
    return res.json();
  };
  // Every video in a playlist, newest first (private and deleted videos left out)
  const playlistVideos = async (playlistId) => {
    const videos = [];
    for (let page = 0, pageToken = ""; page < MAX_PAGES; page++) {
      const r = await api("playlistItems", { part: "snippet,contentDetails", playlistId, maxResults: "50", ...(pageToken && { pageToken }) });
      for (const it of r.items || []) {
        const published = it.contentDetails?.videoPublishedAt; // missing for private or deleted videos
        if (published) videos.push({ id: it.contentDetails.videoId, title: it.snippet.title, published, date: churchDay(published) });
      }
      if (!(pageToken = r.nextPageToken)) break;
    }
    return videos.sort((a, b) => (a.published < b.published ? 1 : -1));
  };
  // Every public playlist on the channel (50 per page; up to 200), so new ones are picked up automatically
  const lists = [];
  for (let page = 0, pageToken = ""; page < 4; page++) {
    const r = await api("playlists", { part: "snippet", channelId: channel, maxResults: "50", ...(pageToken && { pageToken }) });
    lists.push(...(r.items || []));
    if (!(pageToken = r.nextPageToken)) break;
  }
  const out = [];
  for (const p of lists) {
    const videos = await playlistVideos(p.id);
    if (videos.length) out.push({ id: p.id, title: p.snippet.title.trim(), latest: videos[0].published, videos });
  }
  const since = new Date(Date.now() - PLAYLIST_MAX_AGE_DAYS * 864e5).toISOString();
  const playlists = out.filter((p) => PLAYLIST_FIRST.test(p.title) || p.latest >= since)
    .sort((a, b) => (PLAYLIST_FIRST.test(b.title) - PLAYLIST_FIRST.test(a.title)) || (a.latest < b.latest ? 1 : -1))
    .slice(0, PLAYLIST_BUTTONS);
  return { all: await playlistVideos("UU" + channel.slice(2)), playlists };
}

/* ---------- 3d. YouTube lists (replaces the old /youtube-feed server route) ---------- */
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

  // ---- Live stream for the Watch Live player ----
  // Order: what's live right now → the most recent finished livestream. The dashboard's
  // "Current livestream link" is only a fallback when YouTube finds neither (or the API fails).
  const ytKey = process.env.YOUTUBE_API_KEY;
  const ytChannel = site?.youtubeChannelId || (await file("assets/js/main.js")).match(/youtubeChannelId:\s*"(UC[\w-]{22})"/)?.[1];
  if (site && ytKey && ytChannel && !flag("--no-youtube")) {
    try {
      const yt = await youtubeLive(ytChannel, ytKey);
      const chosen = yt.live || yt.latest || site.liveVideoId;
      const status = yt.live ? "live" : yt.latest ? "latest" : site.liveVideoId ? "dashboard" : "none";
      site.liveVideoId = chosen || "";
      // Public status file (no key in it): lets the mobile app show the same stream
      await writeWhole("assets/data/youtube-live.json", JSON.stringify({ liveVideoId: site.liveVideoId, status }, null, 1) + "\n");
      log(`YouTube live: ${status}${chosen ? ` (${chosen})` : ""}`);
    } catch (e) {
      console.warn("[cms] YouTube live check failed; using the dashboard's livestream link:", e.message);
    }
  }

  // ---- Shared details (SITE) ----
  if (site) await region("assets/js/main.js", "site-settings", siteJs(site));
  if (site) await region("index.html", "church-schema", R.churchSchema(site));

  // ---- Events & announcements ----
  const events = byType("event").filter((e) => !e.archived);
  const live = (e) => R.specialEventDue(e, today);
  // Regular gatherings marked "Show in slider" join it a few days before their next date,
  // and stay until the end of that day; sorted with special events by date (the build runs every 30 minutes, so it moves on by itself)
  const dueRecurring = events.filter((e) => e.kind === "recurring" && e.inSlider && !e.archived).map((e) => R.recurringAsSlide(e, today)).filter(Boolean);
  const slides = [
    ...byType("announcement").filter((a) => a.featured && (a.image?.asset || a.image?._sanityAsset) && R.announcementDue(a, byId[a.relatedEvent?._ref], today))
      .sort((a, b) => (a.publishDate < b.publishDate ? 1 : -1))
      .map((a) => R.announcementAsSlide({ ...a, relatedEvent: byId[a.relatedEvent?._ref] })),
    ...[...events.filter((e) => live(e) && e.featured !== false), ...dueRecurring].sort((a, b) => (a.startDate < b.startDate ? -1 : 1))
  ];
  if (byType("event").length || byType("announcement").length) await writeWhole("assets/partials/upcoming-events.html", R.upcomingEventsPartial(c, slides));
  const regular = sorted(events.filter((e) => e.kind === "recurring" && e.listed !== false && e.recurrence?.frequency !== "yearly" && (!e.recurrence?.endsOn || e.recurrence.endsOn >= today)));
  const seasonal = sorted(events.filter((e) => e.kind === "recurring" && e.listed !== false && e.recurrence?.frequency === "yearly"));
  if (regular.length) await region("events.html", "events-regular", regular.map((e) => R.eventRow(c, e, today)).join("\n"));
  if (regular.length) await region("plan-a-visit.html", "visit-gatherings", R.gatheringsSentence(regular));
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
    // Watch Live: "When we stream" is a short line under the player (the cards section was removed, Nov 2026)
    if (liveTimes.length) await region("live.html", "live-schedule-note", R.liveScheduleNote(liveTimes));
    const mins = deref(home.featuredMinistries);
    if (mins.length) await region("index.html", "place-tabs", R.placeTabs(c, mins));
    const outs = deref(home.featuredOutreach);
    if (outs.length) await region("index.html", "outreach-cards", outs.map((o, i) => R.outreachHomeCard(c, o, i)).join("\n"));
  }

  // ---- "About page" content: Vision, Growth Pillars, Journey, membership CTA (on their own pages) ----
  const about = byId.aboutPage;
  if (about) {
    // Vision & pillars → Our Vision & Values page; journey & membership call to action → Become a Member page
    if (about.values?.length) await region("our-vision-values.html", "about-vision", R.aboutVision(c, about));
    if (about.pillars?.length) await region("our-vision-values.html", "about-pillars", R.aboutPillars(about));
    if (about.journeySteps?.length) await region("become-a-member.html", "about-journey", R.aboutJourney(about));
    if (about.ctaHeading) await region("become-a-member.html", "about-cta", R.aboutCta(c, about));
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
  // The Sermons page "Teaching series" now comes from the MSC Sermons YouTube channel (below),
  // so the dashboard's Sermons no longer fill a page section (the mobile app still lists them).
  // To bring the dashboard list back: put <!-- cms:sermons-more --> markers in sermons.html and
  // restore: region("sermons.html", "sermons-more", sermons.map((s, i) => R.sermonCard(c, s, i)).join("\n"))

  // ---- YouTube lists ----
  const channel = site?.youtubeChannelId || (await file("assets/js/main.js")).match(/youtubeChannelId:\s*"(UC[\w-]{22})"/)?.[1];
  if (!flag("--no-youtube") && channel) {
    try {
      const [uploads, streams] = await Promise.all([youtubeFeed(channel, false), youtubeFeed(channel, true)]);
      const name = "Mercy Seat Chapel";
      await writeWhole("assets/data/youtube-uploads.json", JSON.stringify(uploads, null, 1) + "\n");
      await writeWhole("assets/data/youtube-streams.json", JSON.stringify(streams, null, 1) + "\n");
      if (streams.length) await region("index.html", "latest-messages", R.messagesHtml(streams.slice(0, 5), name));
      // Sermons page: one big player with the newest video (the list beside it was removed, Nov 2026)
      if (uploads.length) await region("sermons.html", "sermon-feature", R.sermonFeature(uploads[0], name));
      // Watch Live "Recent livestreams": playlist buttons + cards that open on YouTube
      const saved = existsSync(path.join(ROOT, "assets/data/youtube-playlists.json")) ? JSON.parse(await file("assets/data/youtube-playlists.json")) : { updated: "", playlists: [] };
      let { playlists = [], all = [] } = saved;
      if (ytKey && (!saved.updated || Date.now() - Date.parse(saved.updated) > 55 * 60e3)) {
        try {
          ({ playlists, all } = await channelPlaylists(channel, ytKey));
          // One compact file (one line per list), read by the page only when "Show more" is pressed
          const lines = [`{"updated":${JSON.stringify(new Date().toISOString())},`, `"all":${JSON.stringify(all)},`, `"playlists":[`,
            playlists.map((p) => JSON.stringify(p)).join(",\n"), `]}`];
          await writeWhole("assets/data/youtube-playlists.json", lines.join("\n") + "\n");
          log(`YouTube: ${all.length} videos and ${playlists.length} playlists for Watch Live`);
        } catch (e) { console.warn("[cms] YouTube playlists unavailable, kept the saved list:", e.message); }
      }
      // "All" = every channel video once the key has filled the file; until then the 15 newest livestreams
      const live = R.livestreamFilters(playlists, all.length ? all : streams, site?.liveVideoId);
      if (streams.length) {
        await region("live.html", "livestream-tabs", live.tabs);
        await region("live.html", "recent-livestreams", live.cards);
      }
      log(`YouTube: ${uploads.length} uploads, ${streams.length} live streams`);
    } catch (e) {
      console.warn("[cms] YouTube feed unavailable, video lists left as they were:", e.message);
    }
  }

  // ---- Sermons page "Teaching series": livestreams of the MSC Sermons channel, newest first ----
  const sermonsChannel = (await file("assets/js/main.js")).match(/sermonsChannelId:\s*"(UC[\w-]{22})"/)?.[1];
  if (!flag("--no-youtube") && sermonsChannel) {
    try {
      const talks = await channelStreams(sermonsChannel, process.env.YOUTUBE_API_KEY);
      await writeWhole("assets/data/youtube-sermons.json", JSON.stringify(talks, null, 1) + "\n");
      if (talks.length) await region("sermons.html", "teaching-series", talks.slice(0, 12).map((v, i) => R.teachingCard(v, i, "MSC Sermons")).join("\n"));
      log(`YouTube: ${talks.length} MSC Sermons livestreams`);
    } catch (e) {
      console.warn("[cms] MSC Sermons channel unavailable, Teaching series left as it was:", e.message);
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
