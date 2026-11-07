/* Preview tab: shows the item being edited (including unpublished changes)
   with the website's own styles, using the same templates as the website update.
   It runs inside the signed-in dashboard, so drafts are never exposed publicly. */
import { useEffect, useMemo, useState } from "react";
import { useClient } from "sanity";
import { Box, Card, Flex, Text, Spinner } from "@sanity/ui";
import * as R from "../shared/render.js";
import { todayInChurchTz } from "../shared/schedule.js";

const SITE_URL = (import.meta.env.SANITY_STUDIO_SITE_URL || "https://akorsoftdesigns.github.io/Mercy-Seat-Chapel/").replace(/\/?$/, "/");

// Asset reference → public CDN address (pictures in a public dataset are public once uploaded)
function assetUrl(ref, { projectId, dataset }) {
  if (!ref) return "";
  const [kind, id, ...rest] = ref.split("-");
  const ext = rest.pop();
  if (kind === "image") return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${rest.join("-")}.${ext}?w=1200&fit=max&auto=format`;
  if (kind === "file") return `https://cdn.sanity.io/files/${projectId}/${dataset}/${id}.${ext}`;
  return "";
}

const wrap = (inner, cls = "section") => `<section class="${cls}"><div class="container">${inner}</div></section>`;

function render(doc, c, refs) {
  const today = todayInChurchTz();
  switch (doc._type) {
    case "event":
      if (doc.kind === "recurring") {
        const yearly = doc.recurrence?.frequency === "yearly";
        return wrap(yearly ? `<div class="grid grid--3">${R.seasonalCard(c, doc, 0)}</div>` : `<div class="event-list">${R.eventRow(c, doc, today)}</div>`, "section section--white")
          + wrap(`<div class="times-grid times-grid--feature">${R.timeCard(c, doc, 0)}</div>`)
          + (doc.liveNote ? wrap(`<div class="grid grid--3">${R.liveCard(c, doc, 0)}</div>`, "section section--white") : "");
      }
      return wrap(R.upcomingEventsPartial(c, [doc]), "section section--soft");
    case "announcement": return wrap(R.upcomingEventsPartial(c, [R.announcementAsSlide({ ...doc, relatedEvent: refs[doc.relatedEvent?._ref] })]), "section section--soft");
    case "sermon": return wrap(`<div class="grid grid--3">${R.sermonCard(c, doc, 0)}</div>`, "section section--white");
    case "ministry": return wrap(`<div class="zz zz--top">${R.zzRow(c, doc, 0)}</div>`) + `<section class="place"><div class="container" data-tabs>${R.placeTabs(c, [doc])}</div></section>`;
    case "department": return wrap(`<div class="zz zz--top">${R.zzRow(c, doc, 0)}</div>`);
    case "outreach": return wrap(`<div class="zz zz--top">${R.zzRow(c, doc, 0)}</div>`, "section section--white") + wrap(`<div class="grid grid--4">${R.outreachHomeCard(c, doc, 0)}</div>`);
    case "leader": return wrap(R.leaderHtml(c, doc), "section section--soft");
    case "job": return wrap(doc.status === "open" ? R.jobsHtml([doc]) : `<p class="muted">This job is “${doc.status}”, so it won't be listed. Set it to Open and publish to list it.</p>`);
    case "homepage": {
      const h = R.heroParts(c, doc);
      const list = (k) => (doc[k] || []).map((r) => refs[r._ref]).filter(Boolean);
      return `<section class="hero" aria-label="Welcome"><div class="hero__slides" aria-hidden="true">${h.slides}</div><div class="container hero__inner"><div class="hero__grid"><div>
          <div class="hero__kicker">${h.kicker}</div><div class="hero__copy">${h.texts}</div><div class="btn-row">${h.buttons}</div></div>
          <div><div class="hero__thumbs">${h.thumbs}</div><div class="hero__progress"><span></span></div></div></div></div></section>`
        + wrap(`<div class="times-grid times-grid--feature">${list("serviceTimes").map((e, i) => R.timeCard(c, e, i)).join("")}</div>`, "section section--white")
        + `<section class="place"><div class="container" data-tabs>${R.placeTabs(c, list("featuredMinistries"))}</div></section>`
        + wrap(`<div class="grid grid--4">${list("featuredOutreach").map((o, i) => R.outreachHomeCard(c, o, i)).join("")}</div>`);
    }
    default: return `<p>No preview for this item.</p>`;
  }
}

export function Preview({ document: { displayed } }) {
  const client = useClient({ apiVersion: "2025-02-19" });
  const cfg = client.config();
  const [state, setState] = useState({ settings: null, refs: {}, error: "" });

  // Referenced items (e.g. the events the homepage features), latest draft first
  const refIds = useMemo(() => {
    const ids = new Set();
    JSON.stringify(displayed || {}, (k, v) => { if (k === "_ref" && !/^(image|file)-/.test(v)) ids.add(v); return v; });
    return [...ids];
  }, [displayed]);

  useEffect(() => {
    let live = true;
    const ids = refIds.flatMap((id) => [id, `drafts.${id}`]);
    client.fetch(`{"settings": coalesce(*[_id == "drafts.siteSettings"][0], *[_id == "siteSettings"][0]), "refs": *[_id in $ids]}`, { ids }, { perspective: "raw" })
      .then(({ settings, refs }) => {
        if (!live) return;
        const map = {};
        // A draft replaces the published version of the same item
        const isDraft = (d) => (d._id.startsWith("drafts.") ? 1 : 0);
        refs.sort((a, b) => isDraft(a) - isDraft(b)).forEach((d) => { map[d._id.replace(/^drafts\./, "")] = d; });
        setState({ settings, refs: map, error: "" });
      })
      .catch((e) => live && setState((s) => ({ ...s, error: e.message })));
    return () => { live = false; };
  }, [client, refIds.join(",")]);

  if (!displayed) return <Box padding={4}><Text muted>Nothing to preview yet.</Text></Box>;
  if (!state.settings && !state.error) return <Flex padding={5} justify="center"><Spinner muted /></Flex>;

  const s = state.settings || {};
  const c = {
    site: { prayerLine: s.prayerLine, social: s.social || {}, phoneHref: "#", prayerLineHref: "#", givingUrl: s.givingUrl, email: s.email },
    img: (image) => ({ src: assetUrl(image?.asset?._ref, cfg), pos: R.cssPosition(image?.hotspot) }),
    link: (l) => ({ href: l?.page ? SITE_URL + l.page : l?.url || assetUrl(l?.file?.asset?._ref, cfg) || "#", newTab: true })
  };
  let body;
  try { body = render(displayed, c, state.refs); } catch (e) { body = `<p>Preview couldn't be drawn: ${R.esc(e.message)}</p>`; }

  const html = `<!doctype html><html lang="en" class="no-js"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<base href="${SITE_URL}" target="_blank">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap">
<link rel="stylesheet" href="${SITE_URL}assets/css/style.css">
<style>.hero{min-height:560px}.hero__slide:first-child,.hero__text:first-child,.event-slider__slide:first-child{opacity:1;visibility:visible}</style>
</head><body><main>${body}</main>
<script src="https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js"></script>
<script>document.querySelectorAll(".reveal").forEach(function(e){e.classList.add("is-in")});
document.querySelectorAll(".event-slider__slide,.hero__slide,.hero__text,.hero__thumb").forEach(function(e,i,all){if(e===e.parentNode.firstElementChild)e.classList.add("is-active")});
window.lucide&&lucide.createIcons();</script></body></html>`;

  return (
    <Flex direction="column" height="fill">
      <Card padding={3} tone="caution" borderBottom>
        <Text size={1}>Preview of your latest changes{displayed._id?.startsWith("drafts.") ? " (not published yet)" : ""}. The page around it is simplified; publish to update the website.</Text>
      </Card>
      {state.error && <Card padding={3} tone="critical"><Text size={1}>Some linked items couldn't be loaded: {state.error}</Text></Card>}
      <Box flex={1}>
        <iframe title="Preview" srcDoc={html} sandbox="allow-scripts allow-popups" style={{ border: 0, width: "100%", height: "100%", minHeight: 600 }} />
      </Box>
    </Flex>
  );
}
