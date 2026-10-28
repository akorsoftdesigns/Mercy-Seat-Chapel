/* ==========================================================================
   Mercy Seat Chapel — shared site script
   - SITE: single source of truth for contact details, service times & links
   - Renders the shared header (floating sticky nav) and footer on every page
   - Small, scoped interactions: menus, hero slider, tabs, video player,
     scroll-reveal animations, demo form handling
   ========================================================================== */

const SITE = {
  name: "Mercy Seat Chapel",
  logo: "assets/images/logo-mercy-seat-white.png", // white logo for the blue header, mobile menu and footer
  phone:"(301) 740-8118",
  phoneHref: "tel:+13017408118",
  prayerLine: "1 857 216 6700, code 860476",
  prayerLineHref: "tel:+18572166700,,860476#",
  email: "info@mercyseatchapel.org",
  website: "https://www.mercyseatchapel.org",
  address: "17604 Washington Grove Lane, Gaithersburg, MD 20877",
  // Postal address for giving by mail (shown on the Give page)
  mailingAddress: "P.O. Box 914, Washington Grove, MD 20880",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=17604+Washington+Grove+Lane+Gaithersburg+MD+20877",
  givingUrl: "https://msc.edgdmedia.com/giving/",
  dashboardUrl: "https://crm.mercyseatchapel.org/",
  // Mobile app store links — replace "#" with the real App Store / Google Play listing URLs
  appStoreUrl: "#",
  playStoreUrl: "#",
  youtubeChannelId: "UCVoCauuDqWoSh4fDPtVdt5g",
  // Watch Live page player: the YouTube video ID of the live broadcast to show
  // (the part after youtube.com/watch?v= or studio.youtube.com/video/). YouTube gives
  // each broadcast its own ID, so update this for each new stream; set it to ""
  // to show whatever the channel is streaming live at the time instead.
  liveVideoId: "Zg8AQ9CMOZ4",
  social: {
    youtube: "https://www.youtube.com/c/Mercyseatchapel",
    instagram: "https://www.instagram.com/mercyseatchapel/",
    facebook: "https://www.facebook.com/Mercyseatchapel/",
    twitter: "https://twitter.com/mercyseatchapel",
    tiktok: "#" // placeholder: replace with the TikTok profile URL
  },
  times: [
    { label: "Sunday Service", time: "10:00 AM" },
    { label: "Bible Study (Tue)", time: "7:30 PM" },
    { label: "Holy Communion", time: "1st Tue · 7:30 PM" }
  ]
};

const NAV = [
  { label: "Home", href: "index.html" },
  { label: "About", href: "about.html", children: [
    { label: "RCCG", href: "rccg.html" },
    { label: "About MSC", href: "about.html" },
    { label: "Our Beliefs", href: "about.html#beliefs" },
    { label: "Pastor’s Message", href: "about.html#pastor" },
    { label: "Leadership", href: "about.html#leadership" }
  ]},
  // Connect has no page of its own: the label opens the dropdown (href "#" is never followed)
  // "pages" = extra pages that should highlight this menu item as the current section
  { label: "Connect", href: "#", pages: ["foundation-academy.html", "marriage-counselling.html", "seeking-his-presence.html"], children: [
    { label: "Ministries", href: "ministries.html" },
    { label: "Departments", href: "departments.html" },
    { label: "Events & Programs", href: "events.html" },
    { label: "Outreach & Community", href: "outreach.html" },
    { label: "Testimonies", href: "testimonies.html" },
    { label: "Gallery", href: "gallery.html" }
  ]},
  { label: "Sermons", href: "sermons.html", children: [
    { label: "Latest Messages", href: "sermons.html" },
    { label: "Watch Live", href: "live.html" }
  ]},
  { label: "Contact", href: "contact.html" }
];

const BRAND_ICONS = {
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.6" cy="6.4" r=".6" fill="currentColor"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-8.2h2.8l.4-3.2h-3.2V8.5c0-.9.3-1.6 1.6-1.6h1.7V4.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.3v3.2h2.8V22h3.4Z"/></svg>',
  twitter: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.3 4.7H5.5l11.2 14.5Z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 2h-3.4v13.6a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9.3a6.3 6.3 0 1 0 5.4 6.3V8.7a8 8 0 0 0 4.6 1.5V6.8a4.6 4.6 0 0 1-4.6-4.6Z"/></svg>'
};
const SOCIAL_NAMES = { youtube: "YouTube", instagram: "Instagram", facebook: "Facebook", twitter: "X (Twitter)", tiktok: "TikTok" };

const currentPage = (location.pathname.split("/").pop() || "index.html").toLowerCase();
const isCurrent = (href) => href.split("#")[0].toLowerCase() === currentPage && !href.includes("#");

function socialLinks(cls) {
  return Object.entries(SITE.social).map(([k, url]) =>
    `<a class="${cls}" href="${url}" target="_blank" rel="noopener" aria-label="${SITE.name} on ${SOCIAL_NAMES[k] || k}">${BRAND_ICONS[k]}</a>`
  ).join("");
}

function renderHeader() {
  const el = document.querySelector("[data-site-header]");
  if (!el) return;
  const items = NAV.map((item, i) => {
    if (!item.children) {
      return `<li class="nav-item"><a class="nav-link" href="${item.href}"${isCurrent(item.href) ? ' aria-current="page"' : ""}>${item.label}</a></li>`;
    }
    const active = item.children.some((c) => isCurrent(c.href)) || (item.pages || []).includes(currentPage);
    const current = active ? ' aria-current="page"' : "";
    // A menu without its own page (href "#") is a button that only opens its dropdown
    const top = item.href === "#"
      ? `<button class="nav-link" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="dd-${i}"${current}>${item.label}<i data-lucide="chevron-down"></i></button>`
      : `<a class="nav-link" href="${item.href}"${current}>${item.label}<i data-lucide="chevron-down"></i></a>`;
    return `<li class="nav-item">
      ${top}
      <ul class="dropdown" id="dd-${i}">${item.children.map((c) => `<li><a href="${c.href}"${isCurrent(c.href) ? ' aria-current="page"' : ""}>${c.label}</a></li>`).join("")}</ul>
    </li>`;
  }).join("");

  const mobile = NAV.map((item) => {
    if (!item.children) return `<div class="m-group"><a href="${item.href}">${item.label}</a></div>`;
    return `<div class="m-group"><button type="button" aria-expanded="false">${item.label}<i data-lucide="plus"></i></button>
      <div class="m-sub"><div>${item.children.map((c) => `<a href="${c.href}">${c.label}</a>`).join("")}</div></div></div>`;
  }).join("");

  el.outerHTML = `
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header" id="site-header">
    <div class="nav-shell">
      <a class="brand" href="index.html" aria-label="${SITE.name} home"><img src="${SITE.logo}" alt="${SITE.name}" width="178" height="40"></a>
      <nav class="primary-nav" aria-label="Primary"><ul>${items}<li>${searchBtn("")}</li></ul></nav>
      <div class="nav-actions">
        ${searchBtn(" nav-search--compact")}
        <a class="btn btn--outline-light nav-cta nav-give" href="give.html">Give</a>
        <a class="btn btn--primary nav-cta nav-visit" href="plan-a-visit.html">Plan Your Visit</a>
        <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu"><i data-lucide="menu"></i><span>Menu</span></button>
      </div>
    </div>
  </header>
  <div class="mobile-menu" id="mobile-menu" role="dialog" aria-modal="true" aria-label="Site menu">
    <div class="mobile-menu__top">
      <img src="${SITE.logo}" alt="${SITE.name}">
      <button class="mobile-close" type="button" aria-label="Close menu"><i data-lucide="x"></i></button>
    </div>
    <nav aria-label="Mobile">${mobile}</nav>
    <div class="mobile-menu__cta">
      <a class="btn btn--primary" href="plan-a-visit.html">Plan Your Visit</a>
      <a class="btn btn--outline-light" href="give.html">Give an Offering</a>
    </div>
    <div class="mobile-menu__meta">${SITE.address}<br><a href="${SITE.phoneHref}" style="color:inherit">${SITE.phone}</a></div>
  </div>
  <div class="search-panel" id="site-search" role="dialog" aria-modal="true" aria-label="Search the site">
    <div class="search-panel__box">
      <form class="search-panel__form" role="search">
        <i data-lucide="search"></i>
        <input id="site-search-input" type="search" placeholder="Search the site" aria-label="Search the site" autocomplete="off">
        <button class="search-panel__close" type="button" aria-label="Close search"><i data-lucide="x"></i></button>
      </form>
      <p class="search-panel__status" aria-live="polite"></p>
      <ul class="search-panel__results"></ul>
    </div>
  </div>`;
}

// Search button in the header: one inside the centre menu (wide screens), one beside the Menu button (smaller screens)
function searchBtn(cls) {
  return `<button class="nav-search${cls}" type="button" aria-label="Search the site" aria-controls="site-search" aria-expanded="false"><i data-lucide="search"></i></button>`;
}

function renderFooter() {
  const el = document.querySelector("[data-site-footer]");
  if (!el) return;
  el.outerHTML = `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <img src="${SITE.logo}" alt="${SITE.name}">
          <p>MERCY SEAT CHAPEL is a mission of The Redeemed Christian Church of God (RCCG). We are bible-believing, multi-racial, loving and family oriented followers of Jesus Christ.</p>
        </div>
        <div>
          <h4>Quick Links</h4>
          <ul class="footer-links">
            <li><a href="about.html">About</a></li>
            <li><a href="ministries.html">Ministries</a></li>
            <li><a href="departments.html">Departments</a></li>
            <li><a href="sermons.html">Latest Messages</a></li>
            <li><a href="live.html">Livestream</a></li>
            <li><a href="events.html">Events</a></li>
            <li><a href="job-center.html">MSC Job Center</a></li>
          </ul>
        </div>
        <div>
          <h4>Service Times</h4>
          <ul class="footer-times">${SITE.times.map((t) => `<li><span>${t.label}</span><b>${t.time}</b></li>`).join("")}</ul>
          <div class="footer-cta">
            <a class="link-arrow" href="plan-a-visit.html">Plan a visit <i data-lucide="arrow-right"></i></a>
            <a class="link-arrow" href="plan-a-visit.html#ride">Need a Ride? <i data-lucide="arrow-right"></i></a>
          </div>
        </div>
        <div>
          <h4>Contact</h4>
          <ul class="footer-contact">
            <li><i data-lucide="map-pin"></i><a href="${SITE.mapsUrl}" target="_blank" rel="noopener">${SITE.address}</a></li>
            <li><i data-lucide="phone"></i><a href="${SITE.phoneHref}">${SITE.phone}</a></li>
            <li><i data-lucide="mail"></i><a href="mailto:${SITE.email}">${SITE.email}</a></li>
          </ul>
          <div class="footer-socials">${socialLinks("")}</div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>Copyright © ${new Date().getFullYear()} Mercy Seat Chapel. All rights reserved.</span>
        <a class="footer-parish" href="rccg.html"><img src="assets/images/rccg-logo-white.png" alt="" width="32" height="32">A parish of RCCG</a>
        <nav aria-label="Legal"><a href="privacy.html">Privacy Policy</a><a href="cookies.html">Cookie Policy</a><a href="terms.html">Terms of Use</a></nav>
      </div>
    </div>
    <div class="footer-marquee" aria-hidden="true"><div class="footer-marquee__track">${`<span>${SITE.name}</span>`.repeat(4)}</div></div>
  </footer>
  <button class="to-top" type="button" aria-label="Back to top"><i data-lucide="arrow-up"></i></button>`;
}

/* Shared snippets: <div data-include="assets/partials/x.html"> is replaced by that file,
   so one piece of content (e.g. upcoming events) can appear on several pages.
   If the file can't be loaded (e.g. page opened straight from disk), the div's own
   fallback content stays. */
async function loadIncludes() {
  await Promise.all([...document.querySelectorAll("[data-include]")].map(async (el) => {
    try {
      const res = await fetch(el.dataset.include);
      if (res.ok) el.outerHTML = await res.text();
    } catch (e) { /* keep fallback */ }
  }));
}

/* Fill any element marked data-site="phone|email|address|..." from SITE */
function fillSiteData() {
  document.querySelectorAll("[data-site]").forEach((el) => {
    const key = el.dataset.site;
    if (key === "phone") { el.textContent = SITE.phone; if (el.tagName === "A") el.href = SITE.phoneHref; }
    else if (key === "prayer-line") { el.textContent = SITE.prayerLine; if (el.tagName === "A") el.href = SITE.prayerLineHref; }
    else if (key === "email") { el.textContent = SITE.email; if (el.tagName === "A") el.href = "mailto:" + SITE.email; }
    else if (key === "address") { el.textContent = SITE.address; if (el.tagName === "A") el.href = SITE.mapsUrl; }
    else if (key === "website") { el.textContent = SITE.website.replace(/^https?:\/\//, ""); if (el.tagName === "A") el.href = SITE.website; }
    else if (key === "mailing-address") { el.textContent = SITE.mailingAddress; }
    else if (key === "maps") { if (el.tagName === "A") el.href = SITE.mapsUrl; }
    else if (key === "giving") { if (el.tagName === "A") el.href = SITE.givingUrl; }
    else if (key === "app-store") { if (el.tagName === "A") el.href = SITE.appStoreUrl; }
    else if (key === "play-store") { if (el.tagName === "A") el.href = SITE.playStoreUrl; }
    else if (key === "socials") { el.innerHTML = socialLinks(el.dataset.class || "social-btn"); }
    else if (SITE.social[key] && el.tagName === "A") { el.href = SITE.social[key]; }
  });
  // Links to other organisations' social pages: data-brand="facebook" adds that icon
  document.querySelectorAll("[data-brand]").forEach((el) => {
    if (BRAND_ICONS[el.dataset.brand]) el.insertAdjacentHTML("afterbegin", BRAND_ICONS[el.dataset.brand]);
  });
}

function initHeader() {
  const header = document.getElementById("site-header");
  const toTop = document.querySelector(".to-top");
  const onScroll = () => {
    const y = window.scrollY;
    header && header.classList.toggle("is-scrolled", y > 40);
    toTop && toTop.classList.toggle("is-visible", y > 700);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  toTop && toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  // Desktop dropdowns open on hover and keyboard focus (CSS); the top-level menu links go to their main page.
  // A menu without its own page (e.g. Connect) is a button: clicking/tapping it toggles its dropdown,
  // which touch screens need because they have no hover.
  document.querySelectorAll(".primary-nav button.nav-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.parentElement;
      const open = !item.classList.contains("is-open");
      item.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
    });
  });
  document.addEventListener("click", (e) => {
    document.querySelectorAll(".primary-nav .nav-item.is-open").forEach((item) => {
      if (item.contains(e.target)) return;
      item.classList.remove("is-open");
      item.querySelector("button.nav-link")?.setAttribute("aria-expanded", "false");
    });
  });

  // Mobile menu
  const menu = document.getElementById("mobile-menu");
  const toggle = document.querySelector(".nav-toggle");
  const close = document.querySelector(".mobile-close");
  if (!menu || !toggle) return;
  const setMenu = (open) => {
    menu.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    setTimeout(() => (open ? close : toggle).focus(), 60);
  };
  toggle.addEventListener("click", () => setMenu(true));
  close.addEventListener("click", () => setMenu(false));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (menu.classList.contains("is-open")) setMenu(false);
    document.querySelectorAll(".primary-nav .nav-item.is-open").forEach((i) => { i.classList.remove("is-open"); i.querySelector("button.nav-link")?.setAttribute("aria-expanded", "false"); });
  });
  menu.querySelectorAll(".m-group > button").forEach((b) => b.addEventListener("click", () => {
    const g = b.parentElement;
    const open = !g.classList.contains("is-open");
    g.classList.toggle("is-open", open);
    b.setAttribute("aria-expanded", String(open));
  }));
}

/* Site search: the header's search buttons open a panel that searches the text of
   every page linked from the header and footer (plus SEARCH_EXTRA_PAGES and the
   NAV "pages" lists). Pages are read the first time the panel opens, so nothing
   needs updating when content changes. Needs the site served over http (as when
   hosted); opened straight from disk it shows a short notice instead. */
const SEARCH_EXTRA_PAGES = ["first-timer.html"];
function initSearch() {
  const panel = document.getElementById("site-search");
  if (!panel) return;
  const input = panel.querySelector("input");
  const status = panel.querySelector(".search-panel__status");
  const list = panel.querySelector(".search-panel__results");
  const openers = document.querySelectorAll(".nav-search");
  let pages, opener, timer;

  const setOpen = (open, btn) => {
    panel.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    openers.forEach((b) => b.setAttribute("aria-expanded", String(open)));
    if (open) { opener = btn; pages ||= loadPages(); setTimeout(() => input.focus(), 60); }
    else opener?.focus();
  };
  openers.forEach((b) => b.addEventListener("click", () => setOpen(true, b)));
  panel.querySelector(".search-panel__close").addEventListener("click", () => setOpen(false));
  panel.addEventListener("click", (e) => { if (e.target === panel) setOpen(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && panel.classList.contains("is-open")) setOpen(false); });
  panel.querySelector("form").addEventListener("submit", (e) => e.preventDefault());
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(search, 150); });

  async function loadPages() {
    const links = [...document.querySelectorAll(".site-header a[href], .site-footer a[href]")].map((a) => a.getAttribute("href").split("#")[0]);
    const urls = [...new Set([...links, ...NAV.flatMap((n) => n.pages || []), ...SEARCH_EXTRA_PAGES])].filter((h) => /^[\w-]+\.html$/.test(h));
    const found = await Promise.all(urls.map(async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const doc = new DOMParser().parseFromString(await res.text(), "text/html");
        const main = doc.querySelector("main");
        if (!main) return null;
        main.querySelectorAll("script, style, [aria-hidden='true']").forEach((n) => n.remove());
        const title = url === "index.html" ? "Home" : doc.title.split(" – ")[0].trim();
        // Join text pieces with spaces so separate blocks ("Service times" / "Sundays") don't run together
        const parts = [], walk = doc.createTreeWalker(main, NodeFilter.SHOW_TEXT);
        while (walk.nextNode()) parts.push(walk.currentNode.nodeValue);
        return { url, title, text: parts.join(" ").replace(/\s+/g, " ").replace(/ ([,.;:!?’”)])/g, "$1").trim() };
      } catch (e) { return null; }
    }));
    return found.filter(Boolean);
  }

  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  async function search() {
    const q = input.value.trim();
    if (q.length < 2) { list.innerHTML = ""; status.textContent = ""; return; }
    const all = await pages;
    if (!all.length) { status.textContent = "Search works once the site is on a web server."; return; }
    const words = q.toLowerCase().split(/\s+/);
    // A page matches when every word appears in it; title matches rank first, then the exact phrase, then how often the words appear
    const phrase = words.join(" ");
    const hits = all.map((p) => {
      const text = p.text.toLowerCase(), title = p.title.toLowerCase();
      if (!words.every((w) => text.includes(w) || title.includes(w))) return null;
      const exact = text.indexOf(phrase);
      const score = words.reduce((n, w) => n + (title.includes(w) ? 50 : 0) + text.split(w).length - 1, exact >= 0 ? 30 : 0);
      return { p, score, at: exact >= 0 ? exact : text.indexOf(words[0]) };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 8);
    status.textContent = hits.length ? `${hits.length} page${hits.length > 1 ? "s" : ""} found` : `No results for “${q}”`;
    const mark = new RegExp(`(${words.map((w) => esc(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    list.innerHTML = hits.map(({ p, at }) => {
      const start = Math.max(0, at - 60);
      const snippet = (start ? "…" : "") + p.text.slice(start, start + 170) + "…";
      return `<li><a href="${p.url}"><strong>${esc(p.title)}</strong><span>${esc(snippet).replace(mark, "<mark>$1</mark>")}</span></a></li>`;
    }).join("");
  }
}

/* Home hero: crossfading slider (photos + optional background video) with thumbnails.
   A slide with data-video-id plays that YouTube video muted; its
   background-image is the poster shown while loading or with reduced motion.
   data-video-start (seconds) sets where playback begins. The first slide's video
   loads straight away and the others shortly after the page has loaded.
   Each time a slide comes round its video restarts from data-video-start and
   plays for as long as the slide shows (data-duration), then pauses.
   data-duration (ms) overrides the default 6s per slide.
   .hero__text blocks (headline + lead) switch in step with the slides. */
function initHero() {
  const hero = document.querySelector(".hero");
  if (!hero) return;
  const slides = [...hero.querySelectorAll(".hero__slide")];
  const thumbs = [...hero.querySelectorAll(".hero__thumb")];
  const texts = [...hero.querySelectorAll(".hero__text")];
  const bar = hero.querySelector(".hero__progress span");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // YouTube refuses to play ("Video player configuration error") without a referrer,
  // which a page opened straight from disk (file://) can't send — keep the poster there.
  const canEmbed = location.protocol.startsWith("http");
  // Every player is loaded once, then waits paused on its start frame; showing a
  // slide just presses play, so the video starts at once instead of loading each time.
  // Commands use YouTube's postMessage API (enablejsapi=1), no library needed.
  const YT = "https://www.youtube-nocookie.com";
  const cmd = (s, func, args = []) => s.querySelector("iframe")?.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), YT);
  const startOf = (s) => Number(s.dataset.videoStart) || 0;
  const loadVideo = (s) => {
    if (reduce || !canEmbed || !s.dataset.videoId || s.querySelector("iframe")) return;
    const id = s.dataset.videoId, origin = encodeURIComponent(location.origin);
    s.innerHTML = `<iframe src="${YT}/embed/${id}?autoplay=1&mute=1&start=${startOf(s)}&controls=0&disablekb=1&modestbranding=1&playsinline=1&rel=0&enablejsapi=1&origin=${origin}" title="Background video" tabindex="-1" allow="autoplay; encrypted-media" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    const frame = s.querySelector("iframe");
    // Ask the player to report its state
    frame.addEventListener("load", () => frame.contentWindow.postMessage(JSON.stringify({ event: "listening" }), YT));
  };
  // A player reporting "playing" (state 1): if its slide is showing, fade the video in over
  // the photo; if it was preloaded in the background, park it paused on its start frame
  addEventListener("message", (e) => {
    if (!/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(e.origin) || typeof e.data !== "string") return;
    let d; try { d = JSON.parse(e.data); } catch { return; }
    const state = d.event === "onStateChange" ? d.info : d.info && d.info.playerState;
    if (state !== 1) return;
    const s = slides.find((x) => x.querySelector("iframe")?.contentWindow === e.source);
    if (!s) return;
    s.classList.add("is-playing");
    if (!s.classList.contains("is-active")) { cmd(s, "pauseVideo"); cmd(s, "seekTo", [startOf(s), true]); }
  });
  if (slides.length < 2) { slides[0] && loadVideo(slides[0]); return; }
  // Once the page has loaded, warm up the other slides' players in the background
  addEventListener("load", () => setTimeout(() => slides.forEach(loadVideo), 1500));
  let i = 0, timer;
  const go = (n) => {
    const prev = slides[i];
    [slides, thumbs, texts].forEach((set) => set[i] && set[i].classList.remove("is-active"));
    texts[i] && texts[i].setAttribute("aria-hidden", "true");
    i = (n + slides.length) % slides.length;
    [slides, thumbs, texts].forEach((set) => set[i] && set[i].classList.add("is-active"));
    texts[i] && texts[i].removeAttribute("aria-hidden");
    // Park the slide we left on its start frame; play (or first load) the new one
    if (prev !== slides[i]) { cmd(prev, "pauseVideo"); cmd(prev, "seekTo", [startOf(prev), true]); }
    if (slides[i].querySelector("iframe")) { cmd(slides[i], "seekTo", [startOf(slides[i]), true]); cmd(slides[i], "playVideo"); }
    else loadVideo(slides[i]);
    const ms = Number(slides[i].dataset.duration) || 6000;
    if (bar) { bar.style.animationDuration = ms + "ms"; bar.classList.remove("run"); void bar.offsetWidth; if (!reduce) bar.classList.add("run"); }
    clearTimeout(timer); if (!reduce) timer = setTimeout(() => go(i + 1), ms);
  };
  thumbs.forEach((t, n) => t.addEventListener("click", () => go(n)));
  go(0);
}

/* Floating photo gallery: photos drift a little toward the mouse. The pointer only
   sets a target; one animation-frame loop eases each photo toward it (by its --depth),
   so the motion stays smooth instead of restarting on every mouse event. */
function initFloatGallery() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const RANGE = 16, EASE = 0.08; // max drift in px (× depth), follow speed per frame
  document.querySelectorAll("[data-float-gallery]").forEach((g) => {
    const items = [...g.querySelectorAll(".float-gallery__item")].map((el) => ({ el, depth: parseFloat(getComputedStyle(el).getPropertyValue("--depth")) || 1 }));
    let tx = 0, ty = 0, x = 0, y = 0, frame = 0;
    const tick = () => {
      x += (tx - x) * EASE; y += (ty - y) * EASE;
      items.forEach(({ el, depth }) => { el.style.translate = `${(x * depth * RANGE).toFixed(2)}px ${(y * depth * RANGE).toFixed(2)}px`; });
      frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(tick) : 0;
    };
    const start = () => { if (!frame) frame = requestAnimationFrame(tick); };
    g.addEventListener("pointermove", (e) => {
      const r = g.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width * 2 - 1; ty = (e.clientY - r.top) / r.height * 2 - 1;
      start();
    });
    g.addEventListener("pointerleave", () => { tx = 0; ty = 0; start(); });
  });
}

/* Photo gallery: turns the page's photo list into three full-width rows that scroll
   endlessly (left, right, left; the CSS animation pauses on hover), plus a lightbox (<dialog>)
   with previous/next, arrow keys and swipe. Each row holds its photos twice so the loop is
   seamless; only the first row's first set is focusable/announced, so keyboard and
   screen-reader users meet each photo once. Without JavaScript the list shows as a grid. */
const PHOTO_ROWS = 3;
const ROW_SPEED = { fastest: 20, slowest: 160, apart: 25 }; // seconds per full loop, picked at random on each visit; rows differ by at least "apart"
function randomRowSpeeds() {
  const speeds = [];
  while (speeds.length < PHOTO_ROWS) {
    const s = Math.round(ROW_SPEED.fastest + Math.random() * (ROW_SPEED.slowest - ROW_SPEED.fastest));
    if (speeds.every((t) => Math.abs(t - s) >= ROW_SPEED.apart)) speeds.push(s);
  }
  return speeds;
}
function initGallery() {
  document.querySelectorAll("[data-gallery]").forEach((root) => {
    const photos = [...root.querySelectorAll(".gallery__item")].map((a) => ({ href: a.getAttribute("href"), src: a.querySelector("img").getAttribute("src"), alt: a.querySelector("img").alt }));
    if (!photos.length) return;
    const tile = (n, quiet) => `<a class="photo-rows__item" href="${escAttr(photos[n].href)}" data-index="${n}"${quiet ? ' tabindex="-1" aria-hidden="true"' : ""}><img src="${escAttr(photos[n].src)}" alt="${quiet ? "" : escAttr(photos[n].alt)}" loading="lazy" decoding="async"></a>`;
    const speeds = randomRowSpeeds();
    const rows = Array.from({ length: PHOTO_ROWS }, (_, r) => {
      // Each row gets its own random order on every visit (Fisher–Yates shuffle of the photo numbers)
      const order = photos.map((_, k) => k);
      for (let k = order.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
      const set = (quiet) => order.map((n) => tile(n, quiet)).join("");
      return `<div class="photo-rows__row"><div class="photo-rows__track" style="--row-speed:${speeds[r]}s">${set(r > 0)}${set(true)}</div></div>`;
    }).join("");
    root.insertAdjacentHTML("afterbegin", `<div class="photo-rows__rows">${rows}</div>
      <div class="container photo-rows__bar"><button class="pause-toggle" type="button" aria-pressed="false"><i data-lucide="pause"></i><i data-lucide="play"></i><span>Pause scrolling</span></button></div>`);
    root.classList.add("is-scrolling");
    const toggle = root.querySelector(".pause-toggle");
    toggle.addEventListener("click", () => {
      const paused = root.classList.toggle("is-paused");
      toggle.setAttribute("aria-pressed", String(paused));
      toggle.querySelector("span").textContent = paused ? "Play scrolling" : "Pause scrolling";
    });

    const box = document.createElement("dialog");
    box.className = "lightbox";
    box.setAttribute("aria-label", "Photo viewer");
    box.innerHTML = `<figure class="lightbox__figure"><img alt=""><figcaption><span class="lightbox__cap"></span> <span class="lightbox__count"></span></figcaption></figure>
      <button class="lightbox__btn lightbox__close" type="button" aria-label="Close"><i data-lucide="x"></i></button>
      <button class="lightbox__btn lightbox__prev" type="button" aria-label="Previous photo"><i data-lucide="chevron-left"></i></button>
      <button class="lightbox__btn lightbox__next" type="button" aria-label="Next photo"><i data-lucide="chevron-right"></i></button>`;
    document.body.appendChild(box);
    const img = box.querySelector("img"), cap = box.querySelector(".lightbox__cap"), count = box.querySelector(".lightbox__count");
    let i = 0, opener = null;
    const show = (n) => {
      i = (n + photos.length) % photos.length;
      img.src = photos[i].href; img.alt = photos[i].alt;
      cap.textContent = photos[i].alt; count.textContent = `${i + 1} / ${photos.length}`;
    };
    root.addEventListener("click", (e) => {
      const link = e.target.closest(".photo-rows__item, .gallery__item");
      if (!link || typeof box.showModal !== "function") return; // old browsers: follow the link
      e.preventDefault();
      opener = link;
      show(link.dataset.index ? Number(link.dataset.index) : photos.findIndex((p) => p.href === link.getAttribute("href")));
      box.showModal();
    });
    box.addEventListener("close", () => opener?.focus({ preventScroll: true }));
    box.addEventListener("click", (e) => { if (e.target === box) box.close(); }); // click outside the photo
    box.querySelector(".lightbox__close").addEventListener("click", () => box.close());
    box.querySelector(".lightbox__prev").addEventListener("click", () => show(i - 1));
    box.querySelector(".lightbox__next").addEventListener("click", () => show(i + 1));
    box.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") show(i - 1);
      if (e.key === "ArrowRight") show(i + 1);
    });
    let sx = 0;
    box.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1));
    }, { passive: true });
  });
}

/* Flipbook: a two-page book that turns through the gallery's photos endlessly.
   Hovering the right page flips forward, the left page flips back (tap on touch screens).
   It only runs while on screen, has a Pause button, and doesn't auto-flip for reduced motion.
   Decorative (aria-hidden): every photo is also in the scrolling rows with its description. */
const FLIP = { turn: 900, auto: 3200, hover: 1500 }; // milliseconds: one page turn, auto pace, pace while hovering
function initFlipbook() {
  document.querySelectorAll("[data-flipbook]").forEach((root) => {
    const photos = [...document.querySelectorAll(".gallery img")].map((img) => img.getAttribute("src"));
    if (photos.length < 4) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const page = (cls) => `<div class="${cls}"><img alt="" decoding="async"></div>`;
    root.innerHTML = `<div class="flipbook__book" aria-hidden="true">
        ${page("flipbook__page flipbook__page--left")}${page("flipbook__page flipbook__page--right")}
        <div class="flipbook__leaf" hidden>${page("flipbook__face flipbook__face--front")}${page("flipbook__face flipbook__face--back")}</div>
      </div>
      <div class="flipbook__bar">
        <p class="flipbook__hint">Hover over a page to flip back or forward.</p>
        <button class="pause-toggle" type="button" aria-pressed="false"><i data-lucide="pause"></i><i data-lucide="play"></i><span>Pause</span></button>
      </div>`;
    const book = root.querySelector(".flipbook__book"), leaf = root.querySelector(".flipbook__leaf");
    const [left, right, front, back] = [...root.querySelectorAll("img")];
    const at = (k) => photos[((k % photos.length) + photos.length) % photos.length];
    let i = 0, busy = false, hoverDir = 0, paused = reduce, visible = false, timer;
    const show = () => { left.src = at(i); right.src = at(i + 1); new Image().src = at(i + 2); new Image().src = at(i + 3); };

    // One page turn: forward lifts the right page over the spine, back lifts the left page
    const flip = (dir) => {
      if (busy) return;
      const next = i + 2 * dir;
      if (reduce) { i = next; show(); return; }
      busy = true;
      leaf.className = `flipbook__leaf flipbook__leaf--${dir > 0 ? "forward" : "back"}`;
      front.src = dir > 0 ? at(i + 1) : at(i);
      back.src = dir > 0 ? at(next) : at(next + 1);
      (dir > 0 ? right : left).src = dir > 0 ? at(next + 1) : at(next); // page revealed underneath
      leaf.hidden = false;
      leaf.animate([{ transform: "rotateY(0deg)" }, { transform: `rotateY(${dir * -180}deg)` }],
        { duration: FLIP.turn, easing: "cubic-bezier(.45, .05, .35, 1)" }).finished.then(() => {
        i = next; show(); leaf.hidden = true; busy = false;
      });
    };
    const schedule = () => {
      clearTimeout(timer);
      if (!visible || (paused && !hoverDir)) return;
      timer = setTimeout(() => { flip(hoverDir || 1); schedule(); }, hoverDir ? FLIP.hover : FLIP.auto);
    };
    const side = (e) => { const r = book.getBoundingClientRect(); return e.clientX < r.left + r.width / 2 ? -1 : 1; };

    book.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse" || side(e) === hoverDir) return;
      hoverDir = side(e); flip(hoverDir); schedule();
    });
    book.addEventListener("pointerleave", () => { hoverDir = 0; schedule(); });
    book.addEventListener("click", (e) => { if (e.pointerType !== "mouse") { flip(side(e)); schedule(); } });

    const toggle = root.querySelector(".pause-toggle");
    if (reduce) toggle.remove();
    toggle.addEventListener("click", () => {
      paused = !paused;
      toggle.setAttribute("aria-pressed", String(paused));
      toggle.querySelector("span").textContent = paused ? "Play" : "Pause";
      schedule();
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; schedule(); }, { threshold: .3 }).observe(book);
    } else { visible = true; schedule(); }
    show();
  });
}

/* Events slider: arrows + dots + swipe (touch screens), auto-advances every 8s, pauses on hover/focus */
function initSliders() {
  document.querySelectorAll("[data-slider]").forEach((root) => {
    const slides = [...root.querySelectorAll(".event-slider__slide")];
    const dotsWrap = root.querySelector(".event-slider__dots");
    if (!slides.length) return;
    const dots = slides.map((s, n) => {
      const d = document.createElement("button");
      d.type = "button"; d.className = "event-slider__dot";
      d.setAttribute("aria-label", `Event ${n + 1} of ${slides.length}: ${s.querySelector("h3").textContent}`);
      d.addEventListener("click", () => go(n));
      dotsWrap && dotsWrap.appendChild(d);
      return d;
    });
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let i = 0, timer, paused = false;
    const go = (n) => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => { s.classList.toggle("is-active", k === i); s.setAttribute("aria-hidden", String(k !== i)); s.inert = k !== i; });
      dots.forEach((d, k) => d.setAttribute("aria-current", String(k === i)));
      clearTimeout(timer);
      if (!reduce && !paused && slides.length > 1) timer = setTimeout(() => go(i + 1), 8000);
    };
    root.querySelector("[data-prev]")?.addEventListener("click", () => go(i - 1));
    root.querySelector("[data-next]")?.addEventListener("click", () => go(i + 1));
    // Swipe: a mostly-sideways swipe of 40px+ moves to the next (left) or previous (right) event
    const track = root.querySelector(".event-slider__track");
    let sx = 0, sy = 0;
    track?.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    track?.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) go(i + (dx < 0 ? 1 : -1));
    }, { passive: true });
    const pause = (on) => { paused = on; go(i); };
    root.addEventListener("mouseenter", () => pause(true));
    root.addEventListener("mouseleave", () => pause(false));
    root.addEventListener("focusin", () => pause(true));
    root.addEventListener("focusout", (e) => { if (!root.contains(e.relatedTarget)) pause(false); });
    if (slides.length < 2) root.querySelector(".event-slider__nav")?.remove();
    go(0);
  });
}

/* Writes a panel's outlined ministry word out letter by letter, holds it, erases it
   and writes it again — a slow continuous loop while that panel is showing */
const TYPE_SPEED = { type: 180, erase: 90, hold: 2600, pause: 700 }; // milliseconds
function typeWord(el) {
  if (!el) return;
  const word = el.dataset.word || (el.dataset.word = el.textContent.trim());
  clearTimeout(el._typing);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = word; return; }
  let n = 0, dir = 1;
  el.textContent = ""; el.classList.add("is-typing");
  const step = () => {
    if (el.closest("[hidden]")) { el.textContent = word; return; } // panel closed: stop the loop
    n += dir;
    el.textContent = word.slice(0, n);
    let wait = dir > 0 ? TYPE_SPEED.type : TYPE_SPEED.erase;
    if (n >= word.length) { dir = -1; wait = TYPE_SPEED.hold; }
    else if (n <= 0) { dir = 1; wait = TYPE_SPEED.pause; }
    el._typing = setTimeout(step, wait);
  };
  el._typing = setTimeout(step, TYPE_SPEED.pause);
}

/* Tabs ("Find your place") */
function initTabs() {
  document.querySelectorAll("[data-tabs]").forEach((wrap) => {
    const tabs = [...wrap.querySelectorAll('[role="tab"]')];
    const select = (tab) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        panel.hidden = !on;
        if (on) { panel.classList.remove("is-entering"); void panel.offsetWidth; panel.classList.add("is-entering"); typeWord(panel.querySelector(".place__word")); }
      });
    };
    // First panel's word writes itself out when the section scrolls into view
    const first = wrap.querySelector('[role="tabpanel"]:not([hidden]) .place__word');
    if (first && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { typeWord(first); io.disconnect(); } }, { threshold: .4 });
      io.observe(first.parentElement);
    }
    tabs.forEach((t, n) => {
      t.addEventListener("click", () => select(t));
      t.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          const next = tabs[(n + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
          next.focus(); select(next);
        }
      });
    });
  });
}

/* Lite YouTube: thumbnail until clicked, then load the player */
const escAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
function ytMarkup(id, title) {
  return `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy">
    <button class="yt__play" type="button" aria-label="Play: ${escAttr(title)}"><i data-lucide="play"></i></button>`;
}
// A .yt[data-uploads] box embeds the channel's uploads playlist (channel ID
// UC… → playlist UU…), so it always opens on the newest video without edits
function ytUploadsMarkup() {
  const list = SITE.youtubeChannelId.replace(/^UC/, "UU");
  return `<iframe src="https://www.youtube-nocookie.com/embed/videoseries?list=${list}&rel=0" title="Latest videos from ${SITE.name}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
}
function initVideos() {
  // A .yt[data-live] box plays SITE.liveVideoId, or the channel's current live stream if that's empty
  document.querySelectorAll(".yt[data-live]").forEach((box) => {
    if (SITE.liveVideoId) { box.dataset.id = SITE.liveVideoId; delete box.dataset.src; }
    else box.dataset.src = `https://www.youtube-nocookie.com/embed/live_stream?channel=${SITE.youtubeChannelId}&autoplay=1`;
  });
  document.querySelectorAll(".yt[data-uploads]").forEach((box) => { box.innerHTML = ytUploadsMarkup(); });
  document.querySelectorAll(".yt[data-id], .yt[data-uploads]").forEach((box) => {
    if (!box.innerHTML.trim()) box.innerHTML = ytMarkup(box.dataset.id, box.dataset.title || "video");
    box.addEventListener("click", () => {
      if (box.querySelector("iframe")) return;
      const src = box.dataset.src || `https://www.youtube-nocookie.com/embed/${box.dataset.id}?autoplay=1&rel=0`;
      box.innerHTML = `<iframe src="${src}" title="${escAttr(box.dataset.title || "YouTube video")}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    });
  });

  // Playlist: clicking a list item swaps the featured video
  document.querySelectorAll("[data-playlist]").forEach((pl) => {
    const feature = pl.querySelector(".video-feature .yt");
    const title = pl.querySelector(".video-feature h3");
    const meta = pl.querySelector(".video-feature p");
    const select = (item, scroll) => {
      pl.querySelectorAll(".video-list__item").forEach((x) => x.classList.remove("is-active"));
      item.classList.add("is-active");
      if (item.hasAttribute("data-uploads")) {
        feature.dataset.uploads = "";
        feature.innerHTML = ytUploadsMarkup();
      } else {
        delete feature.dataset.uploads;
        feature.dataset.id = item.dataset.id;
        feature.dataset.title = item.dataset.title;
        feature.innerHTML = ytMarkup(item.dataset.id, item.dataset.title);
      }
      title.textContent = item.dataset.title;
      meta.textContent = item.dataset.meta || "";
      window.lucide && lucide.createIcons();
      if (scroll && window.innerWidth < 960) feature.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    pl.addEventListener("click", (e) => {
      const item = e.target.closest(".video-list__item");
      if (item) select(item, true);
    });
    if (pl.hasAttribute("data-youtube-feed")) loadChannelFeed(pl, select);
  });
}

/* Channel feed: [data-youtube-feed="N"] replaces the playlist's list with the
   channel's N newest uploads, newest first, and features the newest one.
   Add data-youtube-source="streams" to use only the channel's live streams
   (its YouTube "Live" tab). If the feed can't be reached, the hand-written
   list stays as a fallback. */
async function loadChannelFeed(pl, select) {
  const list = pl.querySelector(".video-list");
  const count = parseInt(pl.dataset.youtubeFeed, 10) || 8;
  const source = pl.dataset.youtubeSource === "streams" ? "&source=streams" : "";
  try {
    const res = await fetch(`/youtube-feed?channel=${SITE.youtubeChannelId}${source}`);
    if (!res.ok) return;
    const doc = new DOMParser().parseFromString(await res.text(), "application/xml");
    const videos = [...doc.getElementsByTagName("entry")].map((e) => ({
      id: e.getElementsByTagName("yt:videoId")[0]?.textContent,
      title: e.getElementsByTagName("title")[0]?.textContent || "",
      date: new Date(e.getElementsByTagName("published")[0]?.textContent)
    })).filter((v) => v.id && !isNaN(v.date))
      .sort((a, b) => b.date - a.date)
      .slice(0, count);
    if (!videos.length) return;
    list.replaceChildren(...videos.map((v) => {
      // Dates shown in the church's time zone, so a Sunday stream reads as Sunday
      const day = v.date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" });
      const item = document.createElement("button");
      item.className = "video-list__item";
      item.dataset.id = v.id;
      item.dataset.title = v.title;
      item.dataset.meta = `${SITE.name} · ${day}`;
      const img = document.createElement("img");
      img.src = `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`;
      img.alt = "";
      img.loading = "lazy";
      const text = document.createElement("span");
      const strong = document.createElement("strong");
      strong.textContent = v.title;
      const small = document.createElement("span");
      small.textContent = day;
      text.append(strong, small);
      item.append(img, text);
      return item;
    }));
    select(list.firstElementChild, false);
  } catch (e) { /* keep the fallback list */ }
}

/* Scroll reveal */
function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("is-in")); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
  }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  els.forEach((e) => io.observe(e));
}

/* Count-up numbers: <b data-count="10000" data-format="grouped" data-suffix="+">10,000+</b>
   counts from 0 the first time it scrolls into view. The final value stays in the HTML,
   so it shows as-is without JavaScript or with reduced motion.
   data-format: "plain" (1952, default), "grouped" (10,000) or "compact" (1M). */
function initCounters() {
  const els = document.querySelectorAll("[data-count]");
  if (!els.length || !("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const DURATION = 1800; // ms
  const fmt = (el) => {
    const f = el.dataset.format;
    const nf = new Intl.NumberFormat("en-US", f === "compact" ? { notation: "compact", maximumFractionDigits: 1 } : { useGrouping: f === "grouped" });
    return (n) => (el.dataset.prefix || "") + nf.format(n) + (el.dataset.suffix || "");
  };
  const run = (el) => {
    const end = Number(el.dataset.count), show = fmt(el), t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / DURATION, 1), eased = 1 - Math.pow(1 - p, 3); // ease-out
      el.textContent = show(p < 1 ? Math.round(end * eased) : end);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
  }), { threshold: 0.6 });
  els.forEach((el) => { el.textContent = fmt(el)(0); io.observe(el); });
}

/* Links to a collapsed FAQ item (e.g. plan-a-visit.html#ride) open it */
function openTargetDetails() {
  const el = location.hash && document.getElementById(location.hash.slice(1));
  if (el && el.tagName === "DETAILS") {
    el.open = true;
    // wait for the page (header, fonts, images) to settle before scrolling to it
    addEventListener("load", () => setTimeout(() => el.scrollIntoView({ behavior: "instant" }), 100));
  }
}

/* In-page sub-navigation highlight */
function initSubnav() {
  const nav = document.querySelector(".subnav");
  if (!nav) return;
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const targets = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id));
  }), { rootMargin: "-45% 0px -50% 0px" });
  targets.forEach((t) => io.observe(t));
}

/* Section tabs (About, Ministries, Departments). Links are plain #anchors, so smooth scrolling, deep links
   and Back/Forward stay native; this only (1) measures the floating header so the bar
   sticks 10px under it and anchors land below both, (2) hides the stuck bar while
   scrolling down and shows it on scroll up, (3) marks the tab whose section has
   reached the bar. One rAF-throttled scroll handler does all three. */
function initTabnav() {
  const nav = document.querySelector("[data-tabnav]");
  const shell = document.querySelector(".nav-shell");
  if (!nav || !shell) return;
  const GAP = 10;
  const root = document.documentElement;
  const before = nav.previousElementSibling; // the hero: its bottom is where the bar sits in flow
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const targets = links.map((a) => document.getElementById(a.hash.slice(1)));
  const canStick = () => getComputedStyle(nav).position === "sticky";
  let lastY = scrollY, frame = 0, locked = false, unlock;

  const setActive = (link) => links.forEach((a) => (a === link ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
  const update = () => {
    frame = 0;
    const top = shell.getBoundingClientRect().bottom + GAP;
    const sticky = canStick();
    const reserve = sticky ? top + nav.offsetHeight : top;
    root.style.setProperty("--tabnav-top", top + "px");
    root.style.setProperty("--tabnav-offset", reserve + 16 + "px");

    const y = scrollY, stuck = sticky && before.getBoundingClientRect().bottom <= top;
    if (!stuck || locked || y < lastY - 4) nav.classList.remove("is-hidden");
    else if (y > lastY + 4 && !nav.contains(document.activeElement)) nav.classList.add("is-hidden");
    if (Math.abs(y - lastY) > 4 || !stuck) lastY = y;

    if (locked) return;
    let current = 0;
    // A section counts once its top is within 64px of the bar: anchors land 16px below it,
    // with slack for the header shrinking after the jump
    targets.forEach((t, n) => { if (t && t.getBoundingClientRect().top <= reserve + 64) current = n; });
    setActive(links[current]);
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };

  // A click jumps the indicator straight to its tab and keeps the bar in view while
  // the page scrolls there, instead of flickering through the tabs in between.
  const lock = (a) => {
    setActive(a); locked = true; nav.classList.remove("is-hidden");
    clearTimeout(unlock); unlock = setTimeout(release, 1200);
  };
  links.forEach((a) => a.addEventListener("click", () => lock(a)));
  const release = () => { clearTimeout(unlock); if (locked) { locked = false; lastY = scrollY; schedule(); } };
  addEventListener("scrollend", release);
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  addEventListener("hashchange", schedule);
  document.getElementById("site-header")?.addEventListener("transitionend", schedule);
  nav.addEventListener("focusin", () => nav.classList.remove("is-hidden"));
  // Back/Forward onto a section entry: scroll to it (browsers don't always restore these)
  addEventListener("popstate", () => {
    const link = links.find((a) => a.hash === location.hash);
    if (link) { lock(link); document.getElementById(link.hash.slice(1)).scrollIntoView({ behavior: "instant" }); }
  });
  update();
  // Deep link (about.html#pastor): re-align once the header and fonts have settled
  const deep = links.find((a) => a.hash === location.hash);
  if (deep) addEventListener("load", () => { update(); lock(deep); document.getElementById(deep.hash.slice(1)).scrollIntoView({ behavior: "instant" }); });
}

/* US states for any form: <select data-us-states> gets one option per state
   (value = postal code, text = full name) after its own placeholder option */
const US_STATES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky",
  LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming"
};
function fillStateSelects() {
  document.querySelectorAll("select[data-us-states]").forEach((sel) => {
    sel.append(...Object.entries(US_STATES).map(([code, name]) => new Option(name, code)));
  });
}

/* City suggestions: <input data-city-for="state"> suggests the cities and towns of the
   state chosen in the select named "state", while still accepting any typed name.
   Lists are in assets/data/cities/XX.json (US Census Bureau 2024 Gazetteer places),
   loaded only for the state picked. Without them it stays a plain text box. */
function initCityLists() {
  const cache = {};
  document.querySelectorAll("input[data-city-for]").forEach((input) => {
    const state = input.form?.elements[input.dataset.cityFor];
    if (!state) return;
    const list = document.createElement("datalist");
    list.id = `${input.id}-options`;
    input.after(list);
    input.setAttribute("list", list.id);
    state.addEventListener("change", async () => {
      const code = state.value;
      list.replaceChildren();
      if (!code) return;
      try {
        cache[code] ||= fetch(`assets/data/cities/${code}.json`).then((r) => (r.ok ? r.json() : []));
        const cities = await cache[code];
        if (state.value !== code) return; // state changed again while loading
        list.append(...cities.map((c) => new Option(c)));
      } catch (e) { delete cache[code]; /* keep the plain text box */ }
    });
  });
}

/* Prototype forms: validate & show a confirmation (no data is sent anywhere) */
function initForms() {
  document.querySelectorAll("form[data-demo]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const ok = form.querySelector(".form-success");
      if (ok) { ok.classList.add("is-visible"); ok.focus(); }
      form.reset();
    });
  });
}

document.documentElement.classList.remove("no-js");
renderHeader();
renderFooter();
fillStateSelects();
initCityLists();
// Shared snippets load first so the setup below also covers their content
loadIncludes().then(() => {
  fillSiteData();
  initHeader();
  initSearch();
  initHero();
  initFloatGallery();
  initSliders();
  initGallery();
  initFlipbook();
  openTargetDetails();
  initTabs();
  initVideos();
  initReveal();
  initCounters();
  initSubnav();
  initTabnav();
  initForms();
  if (window.lucide) lucide.createIcons();
});
