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
import { scheduleLabel, scheduleBadge, formatTimeRange, formatDateRange, upcomingChanges } from "./schedule.js";

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
        indent(cards.map((x) => `<div class="icon-card" style="padding:22px"><h3 style="font-size:17px">${esc(x.title)}</h3><p>${esc(x.text)}</p></div>`).join("\n")),
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

/** One slide of the "What's happening" slider (special event or announcement). */
export function eventSlide(c, e) {
  const dateText = e.dateLabel || formatDateRange(e.startDate, e.endDate);
  const meta = [
    dateText && `<span>${icon("calendar")}${esc(dateText)}</span>`,
    ...(e.timeLines || []).map((t) => `<span>${icon("clock")}${esc(t)}</span>`),
    e.location && `<span>${icon("map-pin")}${esc(e.location)}</span>`,
    e.showPrayerLine && `<span>${icon("phone")}Prayer line:&nbsp;<a data-site="prayer-line" href="#">${esc(c.site.prayerLine)}</a></span>`,
    ...(e.details || []).map((x) => `<span>${icon(x.icon)}${esc(x.text)}</span>`)
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
        e.verse?.text && `<p class="special-program__verse">“${esc(e.verse.text)}” ${e.verse.cite ? `<span>${esc(e.verse.cite)}</span>` : ""}</p>`.replace(" </p>", "</p>"),
        meta.length && lines(`<div class="special-program__meta">`, indent(meta.join("\n")), `</div>`),
        e.summary && `<p class="special-program__people">${esc(e.summary)}</p>`,
        buttonRow(c, e.buttons)
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
     automatically and leave after their end date. Changes made by hand are replaced
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

/** Announcements become slides of the same slider, so no new layout is needed. */
export const announcementAsSlide = (a) => ({
  title: a.title, eyebrow: "Announcement", image: a.image, summary: a.summary, buttons: a.buttons,
  dateLabel: a.relatedEvent ? (a.relatedEvent.dateLabel || formatDateRange(a.relatedEvent.startDate, a.relatedEvent.endDate)) : "",
  timeLines: a.relatedEvent?.timeLines || [], location: a.relatedEvent?.location
});

/** Events page: one row of "Regular gatherings". */
export function eventRow(c, e, today) {
  const [top, bottom] = e.badge?.top || e.badge?.bottom ? [e.badge.top || "", e.badge.bottom || ""] : scheduleBadge(e.recurrence);
  const time = eventTime(e, false);
  const meta = [
    time && `<span>${icon("clock")}${esc(time)}</span>`,
    e.location && `<span>${icon("map-pin")}${esc(e.location)}</span>`,
    e.showPrayerLine && `<span>${icon("phone")}<a data-site="prayer-line" href="#">${esc(c.site.prayerLine)}</a></span>`,
    ...(e.details || []).map((x) => `<span>${icon(x.icon)}${esc(x.text)}</span>`),
    ...upcomingChanges(e.recurrence, e.exceptions, today).map((t) => `<span class="event-row__change">${icon("info")}${esc(t)}</span>`)
  ].filter(Boolean).join("");
  const btn = e.buttons?.[0] ? buttonHtml(c, { ...e.buttons[0], style: "outline", icon: "" }, " btn--sm") : "";
  return `<div class="event-row reveal"><div class="date-block"><b>${esc(top)}</b><span>${esc(bottom)}</span></div><div><h3>${esc(e.title)}</h3>${e.summary ? `<p>${esc(e.summary)}</p>` : ""}${meta ? `<div class="event-row__meta">${meta}</div>` : ""}</div>${btn}</div>`;
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
    `  <h1>${emphasis(s.heading)}</h1>`,
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
    const image = m.homeImage?.asset || m.homeImage?.src ? m.homeImage : m.image;
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
    `<div class="card__media">${imgTag(c, o.cardImage?.asset || o.cardImage?.src ? o.cardImage : o.image)}</div>`,
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
