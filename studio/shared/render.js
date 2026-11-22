/* HTML templates for dashboard-managed sections of the website.
   Used by the website build (scripts/cms-build.mjs) and by the dashboard's
   Preview tab, so a preview matches what gets published.

   Each template reproduces the markup the site already uses (same classes,
   animations and accessibility attributes); only the content comes from the dashboard.

   `c` (context) supplies:
     c.img(image)  → { src, pos }  picture address + CSS focus position ("" when centred)
     c.link(link)  → { href, newTab }
     c.site        → Site Settings */
import { youtubeId, ytThumb, toSeconds } from "./youtube.js";
import { scheduleLabel, scheduleBadge, formatTimeRange, formatDateRange, upcomingChanges, nextOccurrence, addDays } from "./schedule.js";

export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const attr = (s) => esc(s).replace(/"/g, "&quot;");
const delay = (n) => (n === 0 ? "0s" : `${+n.toFixed(2)}s`.replace(/^0\./, "."));
const dStyle = (n, keepZero = false) => (n || keepZero ? ` style="--d:${delay(n)}"` : "");
const icon = (name) => (name ? `<i data-lucide="${attr(name)}"></i>` : "");
const lines = (...parts) => parts.flat(Infinity).filter((x) => x !== false && x !== null && x !== undefined && x !== "").join("\n");
const indent = (html, n = 2) => html.split("\n").map((l) => (l ? " ".repeat(n) + l : l)).join("\n");

/** Hotspot (0–1) → CSS position words/percentages, matching how the site writes them. */
export function cssPosition(h) {
  if (!h || (Math.abs(h.x - 0.5) < 0.005 && Math.abs(h.y - 0.5) < 0.005)) return "";
  const word = (v, lo, hi) => (Math.abs(v - 0.5) < 0.005 ? "center" : v <= 0.001 ? lo : v >= 0.999 ? hi : `${Math.round(v * 100)}%`);
  return `${word(h.x, "left", "right")} ${word(h.y, "top", "bottom")}`;
}

/** True when an image field has a picture (uploaded, or a local seed file). */
export const hasImage = (i) => !!(i?.asset || i?._sanityAsset);

function imgTag(c, image, { cls = "", alt, lazy = true, extraStyle = "" } = {}) {
  const { src, pos } = c.img(image);
  if (!src) return "";
  const styles = [pos && `object-position:${pos}`, extraStyle].filter(Boolean).join("; ");
  return `<img${cls ? ` class="${cls}"` : ""} src="${attr(src)}" alt="${attr(alt ?? image?.alt ?? "")}"${lazy ? ' loading="lazy"' : ""}${styles ? ` style="${styles}"` : ""}>`;
}

/* ---------- Buttons ---------- */
const BEFORE = new Set(["play-circle", "radio"]);
export function buttonHtml(c, b, extraCls = "") {
  if (!b?.label) return "";
  const { href, newTab } = c.link(b.link);
  const ic = b.icon || (b.style === "live" ? "play-circle" : "");
  const text = BEFORE.has(ic) ? `${icon(ic)} ${esc(b.label)}` : `${esc(b.label)}${ic ? ` ${icon(ic)}` : ""}`;
  return `<a class="btn btn--${b.style || "primary"}${extraCls}" href="${attr(href)}"${newTab ? ' target="_blank" rel="noopener"' : ""}>${text}</a>`;
}
const buttonRow = (c, list, style = "") => (list?.length ? `<div class="btn-row"${style}>${list.map((b) => buttonHtml(c, b)).join("")}</div>` : "");

/* ---------- Rich text (Portable Text) ---------- */
const SITE_HREF = (site, key) => ({
  phone: site.phoneHref, email: `mailto:${site.email}`, "prayer-line": site.prayerLineHref, giving: site.givingUrl
}[key] || site.social?.[key] || "#");

function spans(c, block) {
  const defs = Object.fromEntries((block.markDefs || []).map((m) => [m._key, m]));
  return (block.children || []).map((s) => {
    let html = esc(s.text);
    for (const m of s.marks || []) {
      if (m === "strong") html = `<strong>${html}</strong>`;
      else if (m === "em") html = `<em>${html}</em>`;
      else if (defs[m]?._type === "link") {
        const d = defs[m];
        const blank = d.newTab || d.site ? ' target="_blank" rel="noopener"' : "";
        html = d.site
          ? `<a data-site="${attr(d.site)}" href="${attr(SITE_HREF(c.site, d.site))}"${["phone", "email", "prayer-line"].includes(d.site) ? "" : blank}>${html}</a>`
          : `<a href="${attr(d.href || "#")}"${blank}>${html}</a>`;
      }
    }
    return html;
  }).join("");
}

export function portableText(c, blocks = []) {
  const out = [];
  let list = null, firstH3 = true;
  for (const b of blocks || []) {
    if (b._type === "block" && b.listItem) {
      if (!list) { list = []; out.push(list); }
      list.push(`  <li>${spans(c, b)}</li>`);
      continue;
    }
    list = null;
    if (b._type === "scripture") out.push(`<blockquote class="scripture">${esc(b.text)}${b.cite ? `<cite>${esc(b.cite)}</cite>` : ""}</blockquote>`);
    else if (b._type === "block" && b.style === "h3") { out.push(`<h3 style="font-size:19px${firstH3 ? "; margin-top:24px" : ""}">${spans(c, b)}</h3>`); firstH3 = false; }
    else if (b._type === "block") out.push(`<p>${spans(c, b)}</p>`);
  }
  return out.map((x) => (Array.isArray(x) ? `<ul class="check-list">\n${x.join("\n")}\n</ul>` : x)).join("\n");
}

/** Plain text of rich text (for search descriptions and the app). */
export const plainText = (blocks = []) => (blocks || []).map((b) => b.text || (b.children || []).map((s) => s.text).join("")).join("\n\n");

/* ---------- Photo-beside-text rows (Ministries, Departments, Outreach) ---------- */
export function zzRow(c, d, i) {
  const [m, t] = i % 2 ? ["right", "left"] : ["left", "right"];
  const logo = d.logo && c.img(d.logo).src ? imgTag(c, d.logo, { cls: "zz__logo", extraStyle: /\.png(\?|$)/i.test(c.img(d.logo).src) ? "object-fit:contain" : "" }) : "";
  const cards = (d.cards || []).filter((x) => x.title || x.text);
  const media = cards.length
    ? lines(`<div class="zz__media reveal reveal--${m}">`, indent(lines(imgTag(c, d.image),
        `<div class="grid grid--2" style="gap:16px; margin-top:24px">`,
        indent(cards.map((x) => `<div class="icon-card icon-card--compact"><h3 style="font-size:17px">${esc(x.title)}</h3><p>${esc(x.text)}</p></div>`).join("\n")),
        `</div>`)), `</div>`)
    : `<div class="zz__media reveal reveal--${m}">${imgTag(c, d.image)}${logo}</div>`;
  const aside = d.aside?.text ? `<blockquote class="scripture zz__aside reveal reveal--${m}">${esc(d.aside.text)}${d.aside.cite ? `<cite>${esc(d.aside.cite)}</cite>` : ""}</blockquote>` : "";
  return lines(
    `<article class="zz__row${aside ? " zz__row--aside" : ""}" id="${attr(d.anchor?.current || d.anchor || "")}">`,
    indent(lines(
      media,
      `<div class="zz__body reveal reveal--${t}">`,
      indent(lines(
        d.tag && `<div class="zz__tag">${esc(d.tag)}</div>`,
        `<h2>${esc(d.name)}</h2>`,
        d.subtitle && `<p class="subtitle">${esc(d.subtitle)}</p>`,
        portableText(c, d.body),
        d.contact && `<p class="muted">${esc(d.contact)}</p>`,
        buttonRow(c, d.buttons)
      )),
      `</div>`,
      aside
    )),
    `</article>`
  );
}
export const zzRows = (c, docs) => docs.map((d, i) => zzRow(c, d, i)).join("\n\n");

/* ---------- Events ---------- */
const cardTitle = (e) => e.shortTitle || e.title;
const eventTime = (e, compact) => e.timeNote || formatTimeRange(e.startTime, e.endTime, { compact });

/** Where a slide's event happens, as short lines (no meeting IDs, passcodes or phone numbers:
    those are on the flyer). Uses the event's "Where" when filled in; otherwise its
    "In person or online" setting: in person → the church address (Site Settings),
    online → "Zoom" when the join link or details mention Zoom, else "Online".
    The online part is left out for prayer-line events (the number is on the flyer). */
function slidePlaces(c, e) {
  if (e.location) return [["map-pin", e.location]];
  const att = e.attendance || "inperson";
  const zoom = /zoom\.us/i.test(e.joinUrl || "") || (e.details || []).some((x) => /zoom/i.test(x.text || ""));
  return [
    att !== "online" && c.site.address && ["map-pin", c.site.address],
    att !== "inperson" && !e.showPrayerLine && ["video", zoom ? "Zoom" : "Online"]
  ].filter(Boolean);
}

/** Slide date with the year, e.g. "Tuesday, November 17, 2026" or
    "Mon, Oct 26 – Sun, Nov 8, 2026" (both years shown when a range crosses New Year). */
const slideDay = (ymd, opts) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
function slideDate(start, end) {
  if (!start) return "";
  if (!end || end === start) return slideDay(start, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const short = { weekday: "short", month: "short", day: "numeric" };
  return `${slideDay(start, { ...short, ...(start.slice(0, 4) !== end.slice(0, 4) && { year: "numeric" }) })} – ${slideDay(end, { ...short, year: "numeric" })}`;
}

/** One slide of the "What's happening" slider. Every slide has the same layout:
    eyebrow, title, theme, then date (with year), time and place. No buttons.
    Only announcements keep their summary text, since that is their message. */
export function eventSlide(c, e) {
  const dateText = e.dateLabel || slideDate(e.startDate, e.endDate);
  const meta = [
    dateText && `<span>${icon("calendar")}${esc(dateText)}</span>`,
    ...(e.timeLines || []).map((t) => `<span>${icon("clock")}${esc(t)}</span>`),
    ...(e.isAnnouncement && !e.location ? [] : slidePlaces(c, e)).map(([i, t]) => `<span>${icon(i)}${esc(t)}</span>`)
  ].filter(Boolean);
  return lines(
    `<article class="special-program event-slider__slide" aria-roledescription="slide">`,
    indent(lines(
      `<div class="special-program__media">${imgTag(c, e.image)}</div>`,
      `<div class="special-program__body on-dark">`,
      indent(lines(
        e.eyebrow && `<span class="eyebrow">${esc(e.eyebrow)}</span>`,
        `<h3>${esc(e.title)}</h3>`,
        e.theme && `<p class="special-program__theme"><span>Theme</span>${esc(e.theme)}</p>`,
        meta.length && lines(`<div class="special-program__meta">`, indent(meta.join("\n")), `</div>`),
        e.isAnnouncement && e.summary && `<p class="special-program__people">${esc(e.summary)}</p>`
        // Buttons left off on purpose (user's choice, Nov 2026). To bring them back: buttonRow(c, e.buttons)
      )),
      `</div>`
    )),
    `</article>`
  );
}

/** The whole shared slider file (assets/partials/upcoming-events.html). */
export function upcomingEventsPartial(c, slides) {
  const header = `<!-- ==========================================================================
     UPCOMING EVENTS — shared by the homepage (index.html) and the Events page (events.html).
     Managed in the dashboard: special events and featured announcements appear here
     automatically and leave after their end date; regular gatherings set to "Show in
     slider" appear a few days before their next date. Changes made by hand are replaced
     the next time the website is updated from the dashboard.
     ========================================================================== -->`;
  if (!slides.length) {
    return `${header}\n<div class="notice reveal"><i data-lucide="calendar-check"></i><p>No special events are scheduled right now. See our <a href="events.html#regular">regular gatherings</a> and follow us on social media for announcements.</p></div>\n`;
  }
  return lines(header,
    `<div class="event-slider reveal" data-slider aria-roledescription="carousel" aria-label="Upcoming events">`,
    `  <div class="event-slider__track">`,
    indent(slides.map((e) => eventSlide(c, e)).join("\n"), 4),
    `  </div>`,
    `  <div class="event-slider__nav">`,
    `    <button class="event-slider__arrow" type="button" data-prev aria-label="Previous event"><i data-lucide="arrow-left"></i></button>`,
    `    <div class="event-slider__dots" role="group" aria-label="Choose an event"></div>`,
    `    <button class="event-slider__arrow" type="button" data-next aria-label="Next event"><i data-lucide="arrow-right"></i></button>`,
    `  </div>`,
    `</div>`) + "\n";
}

/** Slider rules for things that aren't regular gatherings: shown from the day they're
    published until 11:59 PM on their last day (the build runs every 30 minutes, so they
    go after midnight). A special event's last day is its end date (or its date).
    An announcement uses its expiry date; without one, the date of its related event. */
export const specialEventDue = (e, today) => e.kind === "oneoff" && !!(e.endDate || e.startDate) && (e.endDate || e.startDate) >= today;
export function announcementDue(a, relatedEvent, today) {
  if (a.publishDate && a.publishDate > today) return false;
  const lastDay = a.expiryDate || relatedEvent?.endDate || relatedEvent?.startDate;
  return !lastDay || lastDay >= today;
}

/** Announcements become slides of the same slider, so no new layout is needed. */
export const announcementAsSlide = (a) => ({
  title: a.title, eyebrow: "Announcement", image: a.image, summary: a.summary, buttons: a.buttons, isAnnouncement: true,
  dateLabel: a.relatedEvent ? (a.relatedEvent.dateLabel || slideDate(a.relatedEvent.startDate, a.relatedEvent.endDate)) : "",
  timeLines: a.relatedEvent?.timeLines || [], location: a.relatedEvent?.location
});

/** How many days before its date a regular gathering joins the slider: the dashboard's
    "Days before to show it", or by default 3 for weekly gatherings and 7 for the rest. */
export const sliderLeadDays = (e) => e.sliderDaysBefore ?? (e.recurrence?.frequency === "weekly" ? 3 : 7);

/** Sunday that starts the week of a date (church weeks run Sunday to Saturday). */
const weekOf = (ymd) => addDays(ymd, -new Date(`${ymd}T00:00:00Z`).getUTCDay());

/** "Every Tuesday" → "This Tuesday" when the date is in the current week (Sunday–Saturday),
    "Next Tuesday" when it falls in the following week. */
export const weekLabel = (label, date, today) =>
  String(label || "").replace(/^Every /, weekOf(date) === weekOf(today) ? "This " : "Next ");

/** A regular gathering as a slide for its next date (or null when it isn't due yet).
    It appears `sliderLeadDays` days ahead, stays until 11:59 PM on the day, then moves
    on to the following date, so the slider always shows what's coming next. */
export function recurringAsSlide(e, today) {
  const next = nextOccurrence(e, today, sliderLeadDays(e));
  if (!next) return null;
  const time = e.timeNote || formatTimeRange(next.time, next.endTime);
  return {
    ...e, image: hasImage(e.sliderImage) ? e.sliderImage : e.image,
    // The slide is about one date, so "Every Tuesday" reads "This Tuesday" or "Next Tuesday"
    eyebrow: e.eyebrow || [weekLabel(e.dayLabel || scheduleLabel(e.recurrence), next.date, today), e.category].filter(Boolean).join(" · "),
    startDate: next.date, endDate: "", dateLabel: "",
    timeLines: [time, next.note].filter(Boolean)
  };
}

/** Events page: one row of "Regular gatherings". */
/** Homepage <head>: schema.org "Church" details for search engines (name, address, phone,
    email, social profiles), taken from Site Settings so they never disagree with the footer. */
export function churchSchema(site, base = "https://www.mercyseatchapel.org") {
  const m = String(site.address || "").match(/^(.+?),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5})/); // "street, city, ST 12345"
  const data = {
    "@context": "https://schema.org",
    "@type": "Church",
    name: "Mercy Seat Chapel",
    url: base + "/",
    logo: base + "/assets/images/mercy-seat-logo-blue.png",
    image: base + "/assets/images/church-1705.jpg", // same picture as the homepage link preview
    telephone: site.phoneHref ? site.phoneHref.replace(/^tel:/, "") : undefined,
    email: site.email || undefined,
    address: m ? { "@type": "PostalAddress", streetAddress: m[1], addressLocality: m[2], addressRegion: m[3], postalCode: m[4], addressCountry: "US" } : undefined,
    hasMap: site.mapsUrl || undefined,
    parentOrganization: { "@type": "Organization", name: "The Redeemed Christian Church of God", url: "https://rccg.org" },
    sameAs: Object.values(site.social || {}).filter((u) => /^https?:/.test(u))
  };
  return `<script type="application/ld+json">\n${JSON.stringify(data, null, 2).replace(/</g, "\\u003c")}\n</script>`;
}

/** Plan a Visit FAQ: every regular gathering in one sentence, with when it happens in brackets, e.g.
    "Our regular gatherings include Sunday Service (every Sunday, 10:00 AM), …, and Morning Glory (1st of every month, 6:00 AM)." */
const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const whenInWords = (e) => {
  const day = (e.dayLabel || scheduleLabel(e.recurrence)).replace(/^(.+) · Monthly$/, "every $1"); // "1st Sunday · Monthly" → "every 1st Sunday"
  return [day, eventTime(e, false)].filter(Boolean).map(lowerFirst).join(", ");
};
export const gatheringsSentence = (events) => {
  const parts = events.map((e) => `${esc(e.title)} (${esc(whenInWords(e))})`);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];
  return `<p>Our regular gatherings include ${list}.</p>`;
};

/** Events page calendar badge: the next date the gathering takes place, e.g. "Next Sun / 22 / Nov 2026"
    ("Today" on the day itself; cancelled dates are skipped). The site rebuilds every 30 minutes, so it
    moves on after 11:59 PM. Gatherings with no fixed day keep the dashboard badge or "1× / Month". */
function dateBadge(e, today) {
  const next = today && nextOccurrence(e, today, 70);
  if (!next) {
    const [top, bottom] = e.badge?.top || e.badge?.bottom ? [e.badge.top || "", e.badge.bottom || ""] : scheduleBadge(e.recurrence);
    return `<div class="date-block"><b>${esc(top)}</b><span>${esc(bottom)}</span></div>`;
  }
  const d = new Date(next.date + "T00:00:00Z");
  const part = (o) => d.toLocaleDateString("en-US", { ...o, timeZone: "UTC" });
  const label = next.date === today ? "Today" : `Next ${part({ weekday: "short" })}`;
  const full = part({ weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return `<time class="date-block date-block--next" datetime="${next.date}" aria-label="${attr(`${label === "Today" ? "Today" : "Next"}: ${full}`)}"><small>${esc(label)}</small><b>${d.getUTCDate()}</b><span>${esc(part({ month: "short" }))} ${d.getUTCFullYear()}</span></time>`;
}

export function eventRow(c, e, today) {
  const time = eventTime(e, false);
  const meta = [
    time && `<span>${icon("clock")}${esc(time)}</span>`,
    e.location && `<span>${icon("map-pin")}${esc(e.location)}</span>`,
    e.showPrayerLine && `<span>${icon("phone")}<a data-site="prayer-line" href="#">${esc(c.site.prayerLine)}</a></span>`,
    ...(e.details || []).map((x) => `<span>${icon(x.icon)}${esc(x.text)}</span>`),
    ...upcomingChanges(e.recurrence, e.exceptions, today).map((t) => `<span class="event-row__change">${icon("info")}${esc(t)}</span>`)
  ].filter(Boolean).join("");
  const btn = e.buttons?.[0] ? buttonHtml(c, { ...e.buttons[0], style: "outline", icon: "" }, " btn--sm") : "";
  return `<div class="event-row reveal">${dateBadge(e, today)}<div><h3>${esc(e.title)}</h3>${e.summary ? `<p>${esc(e.summary)}</p>` : ""}${meta ? `<div class="event-row__meta">${meta}</div>` : ""}</div>${btn}</div>`;
}

/** Events page: "Seasonal outreaches" cards (yearly events). */
export function seasonalCard(c, e, i) {
  const { href } = c.link(e.buttons?.[0]?.link);
  const label = e.buttons?.[0]?.label || "Learn more";
  return `<article class="card reveal"${dStyle((i % 3) * 0.08)}><div class="card__media">${imgTag(c, e.image)}</div><div class="card__body"><div class="card__tag">${esc(e.dayLabel || scheduleLabel(e.recurrence))}</div><h3>${esc(e.title)}</h3>${e.summary ? `<p>${esc(e.summary)}</p>` : ""}${e.buttons?.[0] ? `<a class="link-arrow" href="${attr(href)}">${esc(label)} ${icon("arrow-right")}</a>` : ""}</div></article>`;
}

/** Homepage: "Worship, Grow and Connect" card. First two are large; the first is highlighted. */
export function timeCard(c, e, i) {
  const delayN = i < 2 ? i * 0.08 : (i - 2) * 0.35;
  return lines(
    `<article class="time-card time-card--photo${i < 2 ? " time-card--lg" : ""}${i === 0 ? " time-card--featured" : ""} reveal" style="--d:${delay(delayN)}">`,
    indent(lines(
      imgTag(c, e.image, { alt: "", lazy: false }),
      `<div class="time-card__icon">${icon(e.icon || "calendar")}</div>`,
      `<div class="time-card__day">${esc(e.dayLabel || scheduleLabel(e.recurrence))}</div>`,
      `<div class="time-card__time">${esc(eventTime(e, true))}</div>`,
      `<h3>${esc(cardTitle(e))}</h3>`,
      e.homeNote && `<p>${esc(e.homeNote)}</p>`
    )),
    `</article>`
  );
}

/** Watch Live page: "When we stream" card. */
export const liveCard = (c, e, i) =>
  `<div class="time-card${i === 0 ? " time-card--featured" : ""} reveal"${dStyle(i * 0.08)}><div class="time-card__icon">${icon(e.icon || "calendar")}</div><div class="time-card__day">${esc(e.dayLabel || scheduleLabel(e.recurrence))}</div><div class="time-card__time">${esc(eventTime(e, true))}</div><h3>${esc(cardTitle(e))}</h3>${e.liveNote ? `<p>${esc(e.liveNote)}</p>` : ""}</div>`;

/* ---------- Homepage hero ---------- */
const emphasis = (s) => esc(s).replace(/\*([^*]+)\*/g, "<em>$1</em>");

export function heroParts(c, home) {
  const slides = (home.heroSlides || []).filter((s) => s.enabled !== false);
  const bg = slides.map((s) => {
    const id = youtubeId(s.youtube);
    const { src, pos } = c.img(s.image);
    const style = `background-image:url('${attr(src)}')${pos ? `; background-position:${pos}` : ""}`;
    return id
      ? `<div class="hero__slide hero__slide--video" data-video-id="${id}" data-video-start="${toSeconds(s.videoStart)}" data-duration="${(s.seconds || 8) * 1000}" style="${style}"></div>`
      : `<div class="hero__slide" data-duration="${(s.seconds || 8) * 1000}" style="${style}"></div>`;
  }).join("\n");
  const texts = slides.map((s, i) => lines(
    `<div class="hero__text${i === 0 ? " is-active" : ""}">`,
    // One h1 per page: the first slide's headline; later slides use an h2 that looks the same
    i === 0 ? `  <h1>${emphasis(s.heading)}</h1>` : `  <h2 class="hero__title">${emphasis(s.heading)}</h2>`,
    s.lead && `  <p class="hero__lead">${esc(s.lead)}</p>`,
    `</div>`)).join("\n");
  const thumbs = slides.map((s, i) => {
    const id = youtubeId(s.youtube);
    const label = `Slide ${i + 1}: ${s.thumbLabel || String(s.heading || "").replace(/\*/g, "")}`;
    return id
      ? `<button class="hero__thumb hero__thumb--video" type="button" aria-label="${attr(label)}"><img src="${ytThumb(id, "mqdefault")}" alt=""><i data-lucide="play"></i></button>`
      : `<button class="hero__thumb" type="button" aria-label="${attr(label)}"><img src="${attr(c.img(s.image).src)}" alt=""></button>`;
  }).join("\n");
  return {
    slides: bg, texts, thumbs,
    kicker: `<span class="dot"></span>${esc(home.kicker || "")}`,
    buttons: (home.heroButtons || []).map((b) => buttonHtml(c, b)).join("\n")
  };
}

/* ---------- Homepage: Find your place (ministry tabs) ---------- */
export function placeTabs(c, ministries) {
  const id = (m) => m.anchor?.current || m.anchor;
  const tab = (m) => m.homeTab || m.name;
  const tabs = ministries.map((m, i) =>
    `<button class="place__tab" role="tab" id="t-${id(m)}" aria-controls="p-${id(m)}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ""}>${esc(tab(m))}</button>`).join("\n");
  const panels = ministries.map((m, i) => {
    const image = hasImage(m.homeImage) ? m.homeImage : m.image;
    const word = m.homeWord || m.name;
    return lines(
      `<div class="place__panel${i === 0 ? " reveal" : ""}" role="tabpanel" id="p-${id(m)}" aria-labelledby="t-${id(m)}"${i ? " hidden" : ""}>`,
      indent(lines(
        `<div class="place__text">`,
        indent(lines(
          `<h3>${esc(m.name)}</h3>`,
          m.homeSummary && `<p>${esc(m.homeSummary)}</p>`,
          m.audience && `<div class="place__meta"><span>${icon(m.audienceIcon || "users")}${esc(m.audience)}</span></div>`,
          `<a class="btn btn--primary" href="ministries.html#${id(m)}">Explore ${esc(tab(m))} ${icon("arrow-right")}</a>`
        )),
        `</div>`,
        `<div class="place__media">${imgTag(c, image)}<div class="place__word${word.length > 9 ? " place__word--long" : ""}" aria-hidden="true">${esc(word)}</div></div>`
      )),
      `</div>`);
  }).join("\n\n");
  return lines(`<div class="place__tabs reveal" role="tablist" aria-label="Ministries">`, indent(tabs), `</div>`, "", panels);
}

/* ---------- Outreach ---------- */
export const outreachHomeCard = (c, o, i) => lines(
  `<article class="card reveal" style="--d:${delay(i * 0.15)}">`,
  indent(lines(
    `<div class="card__media">${imgTag(c, hasImage(o.cardImage) ? o.cardImage : o.image)}</div>`,
    `<div class="card__body">${o.cardTag ? `<div class="card__tag">${esc(o.cardTag)}</div>` : ""}<h3>${esc(o.name)}</h3>${o.cardText ? `<p>${esc(o.cardText)}</p>` : ""}<a class="link-arrow" href="outreach.html#${attr(o.anchor?.current || o.anchor)}">Read More ${icon("arrow-right")}</a></div>`
  )),
  `</article>`);

export const outreachOverviewCard = (o) =>
  `<div class="icon-card reveal"><div class="icon-card__icon">${icon(o.overviewIcon || "heart-handshake")}</div><h3>${esc(o.overviewTitle || o.name)}</h3>${o.overviewText ? `<p>${esc(o.overviewText)}</p>` : ""}</div>`;

/* ---------- Leaders ---------- */
export const leaderHtml = (c, l) => lines(
  `<article class="leader">`,
  `  ${imgTag(c, l.photo, { cls: "reveal reveal--left", alt: l.photo?.alt || l.name })}`,
  `  <div class="reveal reveal--right" style="--d:.12s">`,
  `    <div class="leader__role">${esc(l.role)}</div>`,
  `    <h3>${esc(l.name)}</h3>`,
  l.message && `    <blockquote>${esc(l.message)}</blockquote>`,
  `  </div>`,
  `</article>`);

/* Compact leader card (About page summary): photo only; the name is kept in the alt text */
export const leaderCardHtml = (c, l, i = 0) => lines(
  `<li class="minister reveal"${i ? ` style="--d:${(i * 0.08).toFixed(2)}s"` : ""}>`,
  `  ${imgTag(c, l.photo, { alt: l.photo?.alt || l.name })}`,
  `</li>`);

/* ---------- About page: Vision, Growth Pillars, Journey, membership CTA ----------
   Each returns the inside of one marked block: Vision and Pillars on our-vision-values.html,
   Journey and the call to action on become-a-member.html. */
const num = (i) => String(i + 1).padStart(2, "0");
const sectionHead = (eyebrow, heading, intro) => lines(
  `<div class="section-head reveal">`,
  eyebrow && `  <span class="eyebrow">${esc(eyebrow)}</span>`,
  heading && `  <h2>${emphasis(heading)}</h2>`,
  intro && `  <p>${esc(intro)}</p>`,
  `</div>`);

/* Vision: centred heading, then one photo card per value (3 across, the rest centred
   below), built like the homepage "Mercy for Many" cards (without a Read More link) */
export const aboutVision = (c, doc) => lines(
  sectionHead(doc.visionEyebrow, doc.visionHeading, doc.visionIntro),
  `<div class="vision-grid">`,
  (doc.values || []).map((v, i) => indent(lines(
    `<article class="card value-card reveal"${dStyle((i % 3) * 0.12)}>`,
    `  <div class="card__media">${imgTag(c, v.photo, { alt: v.photo?.alt || "" })}</div>`,
    `  <div class="card__body"><div class="value-card__num">${num(i)}</div><h3>${esc(v.title)}</h3><p>${esc(v.text)}</p></div>`,
    `</article>`))),
  `</div>`);

export const aboutPillars = (doc) => lines(
  sectionHead(doc.pillarsEyebrow, doc.pillarsHeading, doc.pillarsIntro),
  `<div class="grid grid--2 pillars">`,
  (doc.pillars || []).map((p, i) => indent(lines(
    `<article class="pillar reveal"${dStyle((i % 2) * 0.1)}>`,
    `  <div class="pillar__num" aria-hidden="true">${num(i)}</div>`,
    `  <div>`,
    `    <h3>${esc(p.title)}</h3>`,
    p.subtitle && `    <p class="pillar__sub">${esc(p.subtitle)}</p>`,
    `    <p>${esc(p.text)}</p>`,
    `  </div>`,
    `</article>`))),
  `</div>`);

export const aboutJourney = (doc) => lines(
  sectionHead(doc.journeyEyebrow, doc.journeyHeading, doc.journeyIntro),
  // The list reveals as a whole; CSS then shows each stage and draws its line in turn (--i = position)
  `<ol class="journey reveal">`,
  (doc.journeySteps || []).map((s, i) => indent(lines(
    `<li class="journey__step" style="--i:${i}">`,
    `  <span class="journey__num" aria-hidden="true">${num(i)}</span>`,
    `  <span class="journey__stage">${esc(s.label)}</span>`,
    `  <h3>${esc(s.title)}</h3>`,
    `  <p>${esc(s.text)}</p>`,
    `</li>`))),
  `</ol>`);

export const aboutCta = (c, doc) => lines(
  `<div class="cta-band reveal">`,
  `  <div>`,
  doc.ctaHeading && `    <h2>${emphasis(doc.ctaHeading)}</h2>`,
  doc.ctaText && `    <p>${esc(doc.ctaText)}</p>`,
  `  </div>`,
  doc.ctaButtons?.length && `  ${buttonRow(c, doc.ctaButtons)}`,
  `</div>`);

/* ---------- Jobs ---------- */
export function jobsHtml(jobs) {
  if (!jobs.length) return `<p class="muted">There are no openings right now. Please check back soon.</p>`;
  return jobs.map((j) =>
    `<article class="job reveal"><div>${j.department ? `<span class="pill">${esc(j.department)}</span>` : ""}<h3>${esc(j.title)}</h3><p>${esc([j.location, j.employmentType, j.pay].filter(Boolean).join(" • "))}</p></div><a class="btn btn--outline btn--sm" href="${attr(j.page)}">More Info</a></article>`).join("\n");
}

/* ---------- Sermons & YouTube ---------- */
const MONTH_YEAR = { month: "long", year: "numeric", timeZone: "UTC" };
export function sermonCard(c, s, i) {
  const id = youtubeId(s.youtube);
  if (!id) return "";
  const date = s.dateLabel || (s.date ? new Date(s.date + "T00:00:00Z").toLocaleDateString("en-US", MONTH_YEAR) : "");
  const meta = [s.speaker, date].filter(Boolean).join(" · ");
  const full = s.videoTitle || s.title;
  const thumb = s.thumbnail && c.img(s.thumbnail).src
    ? `<img src="${attr(c.img(s.thumbnail).src)}" alt="" loading="lazy"><button class="yt__play" type="button" aria-label="Play: ${attr(full)}"><i data-lucide="play"></i></button>` : "";
  return `<article class="card reveal"${dStyle((i % 3) * 0.08)}><div class="yt" data-id="${id}" data-title="${attr(full)}">${thumb}</div><div class="card__body">${s.series ? `<div class="card__tag">${esc(s.series)}</div>` : ""}<h3>${esc(s.title)}</h3>${meta ? `<p>${esc(meta)}</p>` : ""}</div></article>`;
}

// YouTube feed items: { id, title, date: "YYYY-MM-DD" } (newest first)
const longDate = (ymd) => new Date(ymd + "T00:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
export const videoListItem = (v, i, name) =>
  `<button class="video-list__item${i === 0 ? " is-active" : ""}" data-id="${v.id}" data-title="${attr(v.title)}" data-meta="${attr(`${name} · ${longDate(v.date)}`)}"><img src="${ytThumb(v.id, "mqdefault")}" alt="" loading="lazy"><span><strong>${esc(v.title)}</strong><span>${longDate(v.date)}</span></span></button>`;

/** Homepage "Latest messages": featured player + list. */
export function messagesHtml(videos, name) {
  const v = videos[0];
  return lines(
    `<div class="video-feature">`,
    `  <div class="yt" data-id="${v.id}" data-title="${attr(v.title)}"></div>`,
    `  <div class="video-feature__body">`,
    `    <h3>${esc(v.title)}</h3>`,
    `    <p>${esc(`${name} · ${longDate(v.date)}`)}</p>`,
    `  </div>`,
    `</div>`,
    `<div class="video-list video-list--fit" aria-label="More messages">`,
    indent(videos.map((x, i) => videoListItem(x, i, name)).join("\n")),
    `</div>`);
}

/** Watch Live page "Recent livestreams" card. */
export const streamCard = (v, i) =>
  `<article class="card reveal"${dStyle(i * 0.08)}><div class="yt" data-id="${v.id}" data-title="${attr(v.title)}"></div><div class="card__body"><h3 style="font-size:18px">${esc(v.title)}</h3><p>${longDate(v.date)}</p></div></article>`;

/** Watch Live page: the dashboard's "When we stream" gatherings as one short line under the player,
    e.g. "When we stream: Sunday Service (every Sunday, 10:00 AM) and Bible Study (every Tuesday, 7:30 PM)." */
export function liveScheduleNote(events) {
  const parts = events.map((e) => `${esc(cardTitle(e))} (${esc(whenInWords(e))})`);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];
  return `<p><strong>When we stream:</strong> ${list}.</p>`;
}

/** One Watch Live video card: a link to the video on YouTube (new tab), never played on the site.
    The link sits inside an <article> so anything a browser extension adds next to YouTube links
    (e.g. a download button) stays inside the card instead of taking a space in the grid.
    main.js builds the same card (videoCardHtml) for the videos "Show more" adds. */
export const videoCard = (v, lists, hidden) =>
  `<article class="card card--video" data-lists="${attr(lists.join(" "))}"${hidden ? " hidden" : ""}><a class="card__link" href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener" aria-label="${attr(`${v.title}, ${longDate(v.date)} (opens YouTube in a new tab)`)}"><div class="yt"><img src="${ytThumb(v.id, "hqdefault")}" alt="" loading="lazy"><span class="yt__play" aria-hidden="true"><i data-lucide="play"></i></span></div><div class="card__body"><h3 style="font-size:18px">${esc(v.title)}</h3><p>${longDate(v.date)} · YouTube <i data-lucide="arrow-up-right" class="card__ext"></i></p></div></a></article>`;

/** Watch Live "Recent livestreams": filter buttons (All, then the channel's playlists, Sunday Service
    first) and the first `perPage` video cards of each filter. Every card lists the filters it belongs
    to (data-lists); each button says how many videos its filter has (data-total). "Show more" in
    main.js (initVideoFilters) loads assets/data/youtube-playlists.json and adds `perPage` at a time
    until the last video. Without JavaScript, the first `perPage` of "All" show.
    "All" includes the video in the Watch Live player too, like the playlist buttons (Nov 2026; until
    then it was left out). liveId is no longer used here; to leave it out again, filter allVideos by it. */
export function livestreamFilters(playlists, allVideos, liveId, perPage = 8) {
  const all = allVideos;
  const cards = new Map(); // video id → { video, lists }
  const add = (v, list) => {
    if (!cards.has(v.id)) cards.set(v.id, { v, lists: [] });
    cards.get(v.id).lists.push(list);
  };
  all.slice(0, perPage).forEach((v) => add(v, "all"));
  playlists.forEach((p) => p.videos.slice(0, perPage).forEach((v) => add(v, p.id)));
  const sorted = [...cards.values()].sort((a, b) => (a.v.published < b.v.published ? 1 : -1));
  // data-total (not data-count: main.js animates every [data-count] element as a count-up number)
  const tabs = [`<button class="place__tab" type="button" data-filter="all" data-total="${all.length}" aria-pressed="true">All</button>`,
    ...playlists.map((p) => `<button class="place__tab" type="button" data-filter="${attr(p.id)}" data-total="${p.videos.length}" aria-pressed="false">${esc(p.title)}</button>`)];
  return { tabs: tabs.join("\n"), cards: sorted.map(({ v, lists }) => videoCard(v, lists, !lists.includes("all"))).join("\n") };
}

/** Sermons page main player: the newest video from the church channel, with its title and date
    underneath. Teaching-series thumbnails play in this same player (main.js playInPlayer). */
export const sermonFeature = (v, name) => lines(
  `<div class="yt" data-id="${v.id}" data-title="${attr(v.title)}"></div>`,
  `<div class="video-feature__body"><h3>${esc(v.title)}</h3><p>${esc(`${name} · ${longDate(v.date)}`)}</p></div>`);

/** Sermons page "Teaching series" card: a livestream from the MSC Sermons channel.
    data-meta is the line shown under the main player when the card is played there. */
export const teachingCard = (v, i, name) =>
  `<article class="card reveal"${dStyle((i % 4) * 0.08)}><div class="yt" data-id="${v.id}" data-title="${attr(v.title)}" data-meta="${attr(`${name} · ${longDate(v.date)}`)}"></div><div class="card__body"><h3 style="font-size:18px">${esc(v.title)}</h3><p>${longDate(v.date)}</p></div></article>`;
