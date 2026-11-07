/* Sermons, announcements, leaders and job openings. */
import { defineType, defineField } from "sanity";
import { PlayIcon, BellIcon, UserIcon, DocumentTextIcon } from "../icons.js";
import { imageField, buttons, orderField, ordering, inGroup } from "./parts.js";
import { youtubeRule, youtubeId, ytThumb } from "../shared/youtube.js";

export const sermon = defineType({
  name: "sermon", title: "Sermon", type: "document", icon: PlayIcon,
  fields: [
    defineField({ name: "title", title: "Sermon title", type: "string", validation: (R) => R.required().max(90) }),
    defineField({ name: "youtube", title: "YouTube link", type: "string", validation: (R) => youtubeRule(R, { required: true }),
      description: "Paste the video's link. The thumbnail is taken from YouTube automatically." }),
    defineField({ name: "speaker", title: "Preacher or speaker", type: "string", description: "e.g. Pst. Olu Olarinde" }),
    defineField({ name: "date", title: "Service date", type: "date" }),
    defineField({ name: "dateLabel", title: "Date as shown (optional)", type: "string", description: "Leave empty to show the service date, e.g. “August 2026” or “Day 4 · August 2026”." }),
    defineField({ name: "videoTitle", title: "Full title on YouTube (optional)", type: "string", description: "Used for the play button's label. Defaults to the sermon title." }),
    defineField({ name: "series", title: "Series or label", type: "string", description: "Small label on the card, e.g. SHP 2023, Day 4, Prayer Night" }),
    defineField({ name: "category", title: "Category", type: "string", options: { list: ["Sunday Service", "Bible Study", "Holy Communion", "Thanksgiving", "Seeking His Presence", "Prayer", "Ministry program", "Special program"] } }),
    defineField({ name: "scripture", title: "Bible references", type: "string", description: "e.g. Isaiah 40:31; 2 Cor 12:9" }),
    defineField({ name: "description", title: "Description", type: "text", rows: 3 }),
    imageField("thumbnail", "Custom thumbnail (optional)", { description: "Only if the YouTube thumbnail isn't suitable." }),
    defineField({ name: "featured", title: "Show in “More messages” on the Sermons page", type: "boolean", initialValue: true }),
    orderField,
    defineField({ name: "archived", title: "Archived", type: "boolean", initialValue: false, description: "Hides it from the website but keeps the record." })
  ],
  orderings: [...ordering, { title: "Service date", name: "dateDesc", by: [{ field: "date", direction: "desc" }] }],
  preview: {
    select: { title: "title", speaker: "speaker", date: "date", yt: "youtube", archived: "archived" },
    prepare: ({ title, speaker, date, yt, archived }) => {
      const id = youtubeId(yt);
      return { title, subtitle: [archived && "Archived", speaker, date].filter(Boolean).join(" · "), imageUrl: id ? ytThumb(id, "mqdefault") : undefined };
    }
  }
});

export const announcement = defineType({
  name: "announcement", title: "Announcement", type: "document", icon: BellIcon,
  fields: [
    defineField({ name: "title", title: "Title", type: "string", validation: (R) => R.required().max(80) }),
    defineField({ name: "summary", title: "Short description", type: "text", rows: 3, validation: (R) => R.required().max(300) }),
    defineField({ name: "body", title: "Full details (optional)", type: "text", rows: 6, description: "For the future app and other places with more room." }),
    imageField("image", "Image", { description: "Needed to show in the “What’s happening” slider." }),
    defineField({ name: "publishDate", title: "Show from", type: "date", validation: (R) => R.required(), initialValue: () => new Date().toISOString().slice(0, 10) }),
    defineField({ name: "expiryDate", title: "Remove after (optional)", type: "date",
      validation: (R) => R.custom((v, c) => v && c.document?.publishDate && v < c.document.publishDate ? "This is before the “Show from” date." : true) }),
    defineField({ name: "relatedEvent", title: "Related event (optional)", type: "reference", to: [{ type: "event" }] }),
    buttons(),
    defineField({ name: "featured", title: "Show in “What’s happening” slider", type: "boolean", initialValue: false,
      validation: (R) => R.custom((v, c) => v && !c.document?.image?.asset ? "Add an image to show it in the slider." : true) })
  ],
  orderings: [{ title: "Newest", name: "newest", by: [{ field: "publishDate", direction: "desc" }] }],
  preview: { select: { title: "title", subtitle: "publishDate", media: "image" } }
});

export const leader = defineType({
  name: "leader", title: "Leader", type: "document", icon: UserIcon,
  fields: [
    defineField({ name: "name", title: "Name", type: "string", validation: (R) => R.required() }),
    defineField({ name: "role", title: "Title or position", type: "string", validation: (R) => R.required() }),
    imageField("photo", "Photo", { required: true }),
    defineField({ name: "message", title: "Message or biography", type: "text", rows: 6, description: "Shown as a quote on the About page." }),
    defineField({ name: "links", title: "Public links (optional)", type: "array", of: [{ type: "url" }], description: "Only links the leader has approved. Never personal phone numbers or addresses." }),
    orderField,
    defineField({ name: "archived", title: "Hide from the website", type: "boolean", initialValue: false })
  ],
  orderings: ordering,
  preview: { select: { title: "name", subtitle: "role", media: "photo" } }
});

// Detail pages that already exist (each has its own application form)
const JOB_PAGES = ["job-strategy-operations-coordinator.html", "job-childrens-ministry-coordinator.html", "job-executive-assistant.html"];

export const job = defineType({
  name: "job", title: "Job opening", type: "document", icon: DocumentTextIcon,
  groups: [{ name: "listing", title: "Listing", default: true }, { name: "details", title: "Details (for the app)" }],
  fields: [
    defineField({ name: "title", title: "Job title", type: "string", group: "listing", validation: (R) => R.required() }),
    defineField({ name: "status", title: "Status", type: "string", group: "listing", initialValue: "draft",
      description: "Only “Open” jobs appear on the Job Center, and only after they are published.",
      options: { list: [{ title: "Draft: waiting for approval", value: "draft" }, { title: "Open", value: "open" }, { title: "Closed", value: "closed" }, { title: "Archived", value: "archived" }], layout: "radio" },
      validation: (R) => R.required() }),
    defineField({ name: "department", title: "Area", type: "string", group: "listing", description: "Small label, e.g. Administration" }),
    defineField({ name: "location", title: "Location", type: "string", group: "listing", description: "e.g. Gaithersburg, MD" }),
    defineField({ name: "employmentType", title: "Employment type", type: "string", group: "listing", options: { list: ["Full-time", "Part-time", "Contract", "Volunteer", "Internship"] } }),
    defineField({ name: "pay", title: "Pay (approved wording)", type: "string", group: "listing", description: "e.g. Pay range & benefits on the job page" }),
    defineField({ name: "deadline", title: "Application deadline (optional)", type: "date", group: "listing", description: "The listing is removed automatically after this date." }),
    defineField({ name: "page", title: "Job details page", type: "string", group: "listing",
      description: "Each job has its own page with its own application form. A new job needs a new page set up by the web team before it can open.",
      options: { list: JOB_PAGES.map((p) => ({ title: p.replace(/^job-|\.html$/g, "").replace(/-/g, " "), value: p })) },
      validation: (R) => R.custom((v, c) => c.document?.status === "open" && !v ? "Open jobs need a details page." : true) }),
    defineField({ name: "summary", title: "Summary", type: "text", rows: 3, group: "details" }),
    defineField({ name: "responsibilities", title: "Responsibilities", type: "array", of: [{ type: "string" }], group: "details" }),
    defineField({ name: "requirements", title: "Requirements", type: "array", of: [{ type: "string" }], group: "details" }),
    inGroup(orderField, "listing")
  ],
  orderings: ordering,
  preview: { select: { title: "title", status: "status", location: "location" }, prepare: ({ title, status, location }) => ({ title, subtitle: [status, location].filter(Boolean).join(" · ") }) }
});
