#!/usr/bin/env node
/* Builds the dashboard's starting content from the website as it is today,
   so nothing has to be retyped and nothing is replaced by sample text.

   node tools/seed-from-site.mjs
     → seed/seed.ndjson  (import into Sanity: npx sanity dataset import seed/seed.ndjson production)
     → seed/seed.json    (same content, for testing the website build offline)

   Pictures are referenced from assets/images; Sanity uploads each once on import. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "node-html-parser";

const STUDIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE_DIR = path.resolve(STUDIO, "..");
const page = async (f) => parse(await readFile(path.join(SITE_DIR, f), "utf8"), { comment: false });
let k = 0;
const key = () => "k" + (++k).toString(36).padStart(5, "0");
const keyed = (arr) => arr.map((x) => ({ _key: key(), ...x }));
const ref = (id) => ({ _type: "reference", _ref: id, _key: key() });
const txt = (n) => (n ? n.text.replace(/\s+/g, " ").trim() : "");

/* ---------- Pictures ---------- */
const asset = (src, kind = "image") => `${kind}@${pathToFileURL(path.join(SITE_DIR, src)).href}`;
function hotspotFrom(pos) {
  if (!pos) return undefined;
  const W = { left: 0, top: 0, center: 0.5, right: 1, bottom: 1 };
  const [x, y = "center"] = pos.trim().split(/\s+/);
  const v = (s) => (s in W ? W[s] : parseFloat(s) / 100);
  return { _type: "sanity.imageHotspot", x: v(x), y: v(y), width: 0.4, height: 0.4 };
}
const styleProp = (el, prop) => (el?.getAttribute("style") || "").match(new RegExp(`${prop}:\\s*([^;]+)`))?.[1]?.trim();
function image(el, alt) {
  if (!el) return undefined;
  const src = el.getAttribute("src");
  const hotspot = hotspotFrom(styleProp(el, "object-position"));
  return { _type: "image", _sanityAsset: asset(src), alt: alt ?? el.getAttribute("alt") ?? "", ...(hotspot && { hotspot }) };
}

/* ---------- Links & buttons ---------- */
const PAGES = new Set(["index.html", "about.html", "about.html#leadership", "rccg.html", "ministries.html", "departments.html", "marriage-counselling.html", "outreach.html",
  "events.html", "seeking-his-presence.html", "foundation-academy.html", "sermons.html", "live.html", "plan-a-visit.html", "plan-a-visit.html#ride", "give.html",
  "contact.html", "contact.html#prayer", "testimonies.html", "gallery.html", "job-center.html", "index.html#service-times"]);
function link(a) {
  const href = a.getAttribute("href") || "";
  const newTab = a.getAttribute("target") === "_blank";
  if (PAGES.has(href)) return { page: href, newTab };
  if (/^assets\//.test(href)) return { file: { _type: "file", _sanityAsset: asset(href, "file") }, newTab: true };
  return { url: href, newTab };
}
function button(a) {
  const style = (a.classList.value.find((c) => /^btn--(primary|secondary|outline|live)$/.test(c)) || "btn--primary").slice(5);
  const ic = a.querySelector("i")?.getAttribute("data-lucide") || "";
  return { _type: "button", _key: key(), label: txt(a), link: link(a), style, icon: style === "live" && ic === "play-circle" ? "" : ic };
}
const buttonsIn = (el) => (el ? el.querySelectorAll("a.btn").map(button) : []);

/* ---------- Rich text ---------- */
function blockFrom(el, extra = {}) {
  const markDefs = [], children = [];
  const walk = (n, marks) => {
    if (n.nodeType === 3) { if (n.text) children.push({ _type: "span", _key: key(), text: n.text.replace(/\s+/g, " "), marks }); return; }
    const tag = n.rawTagName?.toLowerCase();
    let m = marks;
    if (tag === "em" || tag === "i") m = [...marks, "em"];
    else if (tag === "strong" || tag === "b") m = [...marks, "strong"];
    else if (tag === "a") {
      const def = { _key: key(), _type: "link" };
      if (n.getAttribute("data-site")) def.site = n.getAttribute("data-site"); else def.href = n.getAttribute("href");
      if (n.getAttribute("target") === "_blank") def.newTab = true;
      markDefs.push(def); m = [...marks, def._key];
    }
    n.childNodes.forEach((c) => walk(c, m));
  };
  el.childNodes.forEach((c) => walk(c, []));
  if (children.length) { children[0].text = children[0].text.trimStart(); children[children.length - 1].text = children[children.length - 1].text.trimEnd(); }
  return { _type: "block", _key: key(), style: "normal", markDefs, children, ...extra };
}
function richText(nodes) {
  const out = [];
  for (const n of nodes) {
    const tag = n.rawTagName?.toLowerCase();
    if (tag === "p") out.push(blockFrom(n));
    else if (tag === "h3") out.push(blockFrom(n, { style: "h3" }));
    else if (tag === "ul") n.querySelectorAll("li").forEach((li) => out.push(blockFrom(li, { listItem: "bullet", level: 1 })));
    else if (tag === "blockquote") {
      const cite = n.querySelector("cite"); const c = txt(cite); cite?.remove();
      out.push({ _type: "scripture", _key: key(), text: txt(n), cite: c });
    }
  }
  return out;
}

/** One photo-beside-text row (Ministries / Departments / Outreach pages). */
function zzRow(row, i) {
  const media = row.querySelector(".zz__media"), body = row.querySelector(".zz__body");
  const imgs = media.childNodes.filter((n) => n.rawTagName?.toLowerCase() === "img");
  const kids = body.childNodes.filter((n) => n.nodeType === 1);
  const sub = kids.find((n) => n.classList?.contains("subtitle"));
  const content = kids.filter((n) => !n.classList?.contains("zz__tag") && n.rawTagName !== "h2" && n !== sub && !n.classList?.contains("btn-row") && !n.classList?.contains("btn"));
  const aside = row.querySelector(".zz__aside");
  let asideObj;
  if (aside) { const cite = aside.querySelector("cite"); const c = txt(cite); cite?.remove(); asideObj = { text: txt(aside), cite: c }; }
  return {
    name: txt(body.querySelector("h2")),
    anchor: { _type: "slug", current: row.getAttribute("id") },
    tag: txt(body.querySelector(".zz__tag")),
    ...(sub && { subtitle: txt(sub) }),
    body: richText(content),
    image: image(imgs[0]),
    ...(imgs[1] && { logo: image(imgs[1]) }),
    buttons: buttonsIn(body),
    ...(media.querySelectorAll(".icon-card").length && { cards: keyed(media.querySelectorAll(".icon-card").map((c) => ({ title: txt(c.querySelector("h3")), text: txt(c.querySelector("p")) }))) }),
    ...(asideObj && { aside: asideObj }),
    order: i + 1,
    archived: false
  };
}

/* ---------- Content ---------- */
const docs = [];
const add = (d) => { docs.push(d); return d._id; };

async function main() {
  // Site Settings: read the current values from main.js
  const mainJs = await readFile(path.join(SITE_DIR, "assets/js/main.js"), "utf8");
  const block = mainJs.match(/const SITE_SETTINGS = (\{[\s\S]*?\n\});/)[1];
  const S = new Function(`return ${block}`)();
  const social = Object.fromEntries(Object.entries(S.social).filter(([, v]) => v && v !== "#"));
  add({
    _id: "siteSettings", _type: "siteSettings",
    phone: S.phone, prayerLine: S.prayerLine,
    prayerLineDial: S.prayerLineHref.replace(/^tel:\+/, "").replace(/#$/, "").replace(",,", ","),
    email: S.email, address: S.address, mailingAddress: S.mailingAddress,
    serviceTimes: keyed(S.times.map((t) => ({ _type: "time", ...t }))),
    liveVideo: S.liveVideoId ? `https://www.youtube.com/watch?v=${S.liveVideoId}` : "",
    youtubeChannelId: S.youtubeChannelId, youtubeLiveUrl: S.youtubeLiveUrl,
    social, givingUrl: S.givingUrl,
    ...(S.appStoreUrl !== "#" && { appStoreUrl: S.appStoreUrl }), ...(S.playStoreUrl !== "#" && { playStoreUrl: S.playStoreUrl })
  });

  const index = await page("index.html");
  const eventsPage = await page("events.html");
  const live = await page("live.html");

  // ---- Regular gatherings (one record each; texts copied from the Events page) ----
  const cardsByTitle = Object.fromEntries(index.querySelectorAll("#service-times .time-card").map((c) => [txt(c.querySelector("h3")), c]));
  const liveByTitle = Object.fromEntries(live.querySelectorAll(".time-card").map((c) => [txt(c.querySelector("h3")), c]));
  const rowsByTitle = Object.fromEntries(eventsPage.querySelectorAll(".event-row").map((r) => [txt(r.querySelector("h3")), r]));
  const R = (frequency, weekday, weekOfMonth) => ({ frequency, ...(weekday && { weekday }), ...(weekOfMonth && { weekOfMonth }) });
  const detail = (icon, text) => ({ _type: "detail", _key: key(), icon, text });
  const regular = [
    { id: "event-sunday-service", title: "Sunday Service", category: "Service", recurrence: R("weekly", "sunday"), startTime: "10:00 AM", location: "Main auditorium & online", attendance: "both" },
    { id: "event-sunday-school", title: "Sunday School", category: "Bible Study", recurrence: R("weekly", "sunday"), startTime: "9:00 AM", details: [detail("users", "Open to everyone")] },
    { id: "event-bible-study", title: "Bible Study", category: "Bible Study", recurrence: R("weekly", "tuesday"), startTime: "7:30 PM", attendance: "both", details: [detail("radio", "In person & online")] },
    { id: "event-strength-in-prayer", title: "Strength in Prayer", category: "Prayer", recurrence: R("weekly", "wednesday"), startTime: "9:00 PM", attendance: "online", showPrayerLine: true },
    { id: "event-thanksgiving-sunday", title: "Thanksgiving Sunday", category: "Service", recurrence: R("monthly", "sunday", 1), startTime: "10:00 AM", details: [detail("calendar", "Monthly")], badge: { top: "1st", bottom: "Sunday" } },
    { id: "event-holy-communion", title: "Holy Communion Service", shortTitle: "Holy Communion", category: "Service", recurrence: R("monthly", "tuesday", 1), startTime: "7:30 PM", details: [detail("calendar", "Monthly")] },
    { id: "event-seed-and-future", title: "The Seed & the Future", category: "Prayer", recurrence: R("monthly", "saturday", 2), startTime: "12:00 PM", endTime: "1:00 PM", attendance: "online", details: [detail("calendar", "Monthly"), detail("video", "Virtual")] },
    { id: "event-evangelism", title: "Evangelism", category: "Outreach", recurrence: R("monthly", "sunday", 2), timeNote: "Immediately after Sunday Service", details: [detail("calendar", "Monthly"), detail("megaphone", "Evangelism Department")], badge: { top: "2nd", bottom: "Sunday" } },
    { id: "event-nursing-home-visits", title: "Nursing Home & Shelter Visits", category: "Outreach", recurrence: R("irregular"), details: [detail("heart-handshake", "Mercy For Many")] }
  ];
  regular.forEach((e, i) => {
    const row = rowsByTitle[e.title];
    const card = cardsByTitle[e.shortTitle || e.title], lc = liveByTitle[e.shortTitle || e.title];
    const { id, ...rest } = e;
    add({
      _id: id, _type: "event", kind: "recurring", ...rest,
      summary: txt(row.querySelector("p")),
      buttons: buttonsIn(row),
      ...(card && { image: image(card.querySelector("img"), ""), icon: card.querySelector(".time-card__icon i").getAttribute("data-lucide"), homeNote: txt(card.querySelector("p")) }),
      ...(lc && { liveNote: txt(lc.querySelector("p")), icon: lc.querySelector(".time-card__icon i").getAttribute("data-lucide") }),
      listed: true, order: i + 1, archived: false
    });
  });

  // ---- Yearly programs (Events page → Seasonal outreaches) ----
  const MONTH = { August: 8, November: 11, December: 12 };
  eventsPage.querySelectorAll("section.section--soft .grid--3 .card").forEach((card, i) => {
    const a = card.querySelector("a.link-arrow");
    add({
      _id: `event-${txt(card.querySelector("h3")).toLowerCase().replace(/[^a-z]+/g, "-")}`, _type: "event", kind: "recurring",
      title: txt(card.querySelector("h3")), category: "Outreach", recurrence: { frequency: "yearly", month: MONTH[txt(card.querySelector(".card__tag"))] },
      summary: txt(card.querySelector("p")), image: image(card.querySelector("img"), ""),
      buttons: [{ _type: "button", _key: key(), label: txt(a), link: link(a), style: "outline", icon: "" }],
      listed: true, order: 20 + i, archived: false
    });
  });

  // ---- Special events (the shared "What's happening" slider) ----
  add({
    _id: "event-daniel-fast-2026", _type: "event", kind: "oneoff", title: "Daniel Fast", category: "Fast",
    eyebrow: "Church-wide fast · 14 days", theme: "Possession",
    summary: "A plant-based fast of whole foods (fruits, vegetables, legumes, whole grains, nuts and water) with a focus on prayer and Scripture throughout.",
    startDate: "2026-10-26", endDate: "2026-11-08", timeLines: ["Daily prayer: 6 AM & 9 PM", "Tuesdays: 6 AM & 7:30 PM"], showPrayerLine: true,
    image: { _type: "image", _sanityAsset: asset("assets/images/daniel-fast.jpg"), alt: "Daniel Fast flyer: Monday October 26 to Sunday November 8, theme Possession, prayer daily at 6 AM and 9 PM, Tuesdays at 6 AM and 7:30 PM" },
    buttons: [{ _type: "button", _key: key(), label: "Fasting food guide", style: "primary", icon: "arrow-up-right", link: { file: { _type: "file", _sanityAsset: asset("assets/images/daniel-fast-guide.jpg", "file") }, newTab: true } }],
    featured: true, attendance: "both", archived: false
  });
  add({
    _id: "event-grace-to-finish-well-2026", _type: "event", kind: "oneoff", title: "Grace to Finish Well", category: "Ministry program",
    eyebrow: "Special program · Pillars of Mercy", verse: { text: "My grace is sufficient for you, for my power is made perfect in weakness.", cite: "II Cor. 12:9" },
    summary: "With Pastor Ola Olarinde, Pastor Olu Olarinde, Sis. Princess Pyne-Caulker, Sis. Jamelia Georgestone and Minister Elizabeth Osuhon.",
    startDate: "2026-10-30", timeLines: ["10:00 PM – 1:00 AM"], location: "Mercy Seat Chapel & live on YouTube", attendance: "both",
    image: { _type: "image", _sanityAsset: asset("assets/images/grace-to-finish-well.jpg"), alt: "Grace to Finish Well flyer: Pillars of Mercy Women Ministry, Friday October 30th, 10 PM to 1 AM, at Mercy Seat Chapel and live on YouTube" },
    buttons: [{ _type: "button", _key: key(), label: "Live on YouTube", style: "live", icon: "", link: { page: "live.html", newTab: false } }],
    featured: true, archived: false
  });

  // ---- Ministries (+ their homepage tab) ----
  const panels = Object.fromEntries(index.querySelectorAll(".place__panel").map((p) => [p.querySelector("a.btn").getAttribute("href").split("#")[1], p]));
  const tabs = Object.fromEntries(index.querySelectorAll(".place__tab").map((t) => [t.getAttribute("aria-controls"), txt(t)]));
  const ministries = (await page("ministries.html")).querySelectorAll(".zz__row");
  const ministryIds = [];
  ministries.forEach((row, i) => {
    const d = zzRow(row, i), p = panels[d.anchor.current];
    const id = `ministry-${d.anchor.current}`;
    let home = {};
    if (p) {
      ministryIds.push(id);
      const img = p.querySelector(".place__media img");
      home = {
        homeTab: tabs[p.getAttribute("id")], homeSummary: txt(p.querySelector(".place__text p")),
        audience: txt(p.querySelector(".place__meta span")), audienceIcon: p.querySelector(".place__meta i")?.getAttribute("data-lucide"),
        homeWord: txt(p.querySelector(".place__word")),
        ...(img.getAttribute("src") !== row.querySelector(".zz__media img").getAttribute("src") || img.getAttribute("alt") !== d.image.alt || img.getAttribute("style") !== row.querySelector(".zz__media img").getAttribute("style") ? { homeImage: image(img) } : {})
      };
    }
    add({ _id: id, _type: "ministry", ...d, ...home });
  });

  add_all("department", (await page("departments.html")).querySelectorAll(".zz__row"));

  // ---- Outreach (+ overview boxes and homepage cards) ----
  const outreachPage = await page("outreach.html");
  const overview = outreachPage.querySelectorAll("#overview .icon-card");
  const homeCards = Object.fromEntries(index.querySelectorAll("#outreach .card").map((c) => [c.querySelector("a").getAttribute("href").split("#")[1], c]));
  const outreachIds = [];
  outreachPage.querySelectorAll(".zz__row").forEach((row, i) => {
    const d = zzRow(row, i), ov = overview[i], hc = homeCards[d.anchor.current];
    const id = `outreach-${d.anchor.current}`;
    if (hc) outreachIds.push(id);
    add({
      _id: id, _type: "outreach", ...d, featured: !!hc,
      ...(ov && { overviewIcon: ov.querySelector("i").getAttribute("data-lucide"), overviewTitle: txt(ov.querySelector("h3")), overviewText: txt(ov.querySelector("p")) }),
      ...(hc && { cardTag: txt(hc.querySelector(".card__tag")), cardText: txt(hc.querySelector(".card__body p")), cardImage: image(hc.querySelector("img")) })
    });
  });

  // ---- Leaders ----
  (await page("about.html")).querySelectorAll("#leadership .leader").forEach((l, i) => add({
    _id: `leader-${i + 1}`, _type: "leader", name: txt(l.querySelector("h3")), role: txt(l.querySelector(".leader__role")),
    photo: image(l.querySelector("img")), message: txt(l.querySelector("blockquote")), order: i + 1, archived: false
  }));

  // ---- Jobs ----
  (await page("job-center.html")).querySelectorAll("article.job").forEach((j, i) => {
    const [location, employmentType, pay] = txt(j.querySelector("p")).split(" • ");
    const href = j.querySelector("a").getAttribute("href");
    add({ _id: `job-${href.replace(/^job-|\.html$/g, "")}`, _type: "job", title: txt(j.querySelector("h3")), status: "open", department: txt(j.querySelector(".pill")),
      location, employmentType, pay, page: href, order: i + 1 });
  });

  // ---- Sermons ("More messages" on the Sermons page) ----
  const sermons = [
    ["px9hMO3-Yw0", "Positioned To Win", "DAY 6 - Positioned To Win | Pst. Adeyinka ARE", "Day 6", "Pst. Adeyinka Are", "", "August 2026", "Seeking His Presence"],
    ["r5SShtgKHO0", "Conquering The Storm", "DAY 4 - Conquering The Storm | PRAYER NIGHT", "Prayer Night", "", "", "Day 4 · August 2026", "Prayer"],
    ["im8mYJoBWV8", "My Seed are Overcomers", "DAY 4 - My Seed are Overcomers | Pst. Olu OLARINDE", "Day 4", "Pst. Olu Olarinde", "", "August 2026", "Seeking His Presence"],
    ["NBZF-eCAVAY", "Build For God, Build Your Dynasty", "Build For God, Build Your Dynasty | SHP 2023 | Pst. Ola Olarinde", "SHP 2023", "Pst. Ola Olarinde", "", "", "Seeking His Presence"],
    ["FSbnlBd7BG0", "Commissioned To Build", "Commissioned To Build | SHP 2023 | Rev. Kathy Kiuna", "SHP 2023", "Rev. Kathy Kiuna", "2023-09-07", "September 7, 2023", "Seeking His Presence"],
    ["plkOw2d5O80", "Commissioned To Build", "Commissioned To Build | SHP 2023 | Rev. Dillimono Frama", "SHP 2023", "Rev. Dillimono Frama", "2023-09-07", "September 7, 2023", "Seeking His Presence"]
  ];
  sermons.forEach(([id, title, videoTitle, series, speaker, date, dateLabel, category], i) => add({
    _id: `sermon-${id.toLowerCase().replace(/[^a-z0-9]/g, "")}`, _type: "sermon", title, videoTitle, series, category,
    youtube: `https://www.youtube.com/watch?v=${id}`, ...(speaker && { speaker }), ...(date && { date }), dateLabel, featured: true, order: i + 1, archived: false
  }));

  // ---- Homepage ----
  const toClock = (s) => { s = Number(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? `${h}:${String(m).padStart(2, "0")}` : `${m}`) + `:${String(x).padStart(2, "0")}`; };
  const texts = index.querySelectorAll(".hero__text"), thumbs = index.querySelectorAll(".hero__thumb");
  add({
    _id: "homepage", _type: "homepage",
    kicker: txt(index.querySelector(".hero__kicker")),
    heroSlides: index.querySelectorAll(".hero__slide").map((s, i) => {
      const bgSrc = styleProp(s, "background-image").match(/url\('?([^')]+)/)[1];
      const hotspot = hotspotFrom(styleProp(s, "background-position"));
      return {
        _type: "heroSlide", _key: key(), enabled: true,
        heading: texts[i].querySelector("h1").innerHTML.replace(/<em>(.*?)<\/em>/g, "*$1*").replace(/&amp;/g, "&"),
        lead: txt(texts[i].querySelector(".hero__lead")),
        thumbLabel: thumbs[i].getAttribute("aria-label").replace(/^Slide \d+:\s*/, ""),
        image: { _type: "image", _sanityAsset: asset(bgSrc), alt: "", ...(hotspot && { hotspot }) },
        youtube: `https://www.youtube.com/watch?v=${s.getAttribute("data-video-id")}`,
        videoStart: toClock(s.getAttribute("data-video-start")),
        seconds: Number(s.getAttribute("data-duration")) / 1000
      };
    }),
    heroButtons: buttonsIn(index.querySelector(".hero .btn-row")),
    serviceTimes: ["event-sunday-service", "event-bible-study", "event-holy-communion", "event-strength-in-prayer", "event-seed-and-future", "event-thanksgiving-sunday"].map(ref),
    liveSchedule: ["event-sunday-service", "event-bible-study", "event-holy-communion"].map(ref),
    featuredMinistries: ministryIds.map(ref),
    featuredOutreach: outreachIds.map(ref)
  });

  await mkdir(path.join(STUDIO, "seed"), { recursive: true });
  await writeFile(path.join(STUDIO, "seed/seed.ndjson"), docs.map((d) => JSON.stringify(d)).join("\n") + "\n");
  await writeFile(path.join(STUDIO, "seed/seed.json"), JSON.stringify(docs, null, 1));
  console.log(`Seed written: ${docs.length} documents → studio/seed/seed.ndjson`);
}

function add_all(type, rows) {
  rows.forEach((row, i) => { const d = zzRow(row, i); add({ _id: `${type}-${d.anchor.current}`, _type: type, ...d }); });
}

main().catch((e) => { console.error(e); process.exit(1); });
