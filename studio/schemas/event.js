/* Events & programs: one record per event.
   - Special event: has dates (e.g. Daniel Fast, a women's ministry night). Shown in the
     "What's happening" slider on the homepage and Events page until it ends.
   - Regular gathering: repeats (weekly, monthly, yearly). One record covers every
     occurrence; cancellations and one-off changes go in "Exceptions". */
import { defineType, defineField, defineArrayMember } from "sanity";
import { CalendarIcon } from "../icons.js";
import { imageField, buttons, iconField, orderField, ordering, scriptureField, inGroup } from "./parts.js";
import { timeRule, scheduleLabel, WEEKDAYS, MONTHS } from "../shared/schedule.js";

const isOneOff = ({ document }) => document?.kind !== "oneoff";
const isRecurring = ({ document }) => document?.kind !== "recurring";
const rec = (p) => p.document?.recurrence || {};

export default defineType({
  name: "event",
  title: "Event",
  type: "document",
  icon: CalendarIcon,
  groups: [
    { name: "main", title: "Details", default: true },
    { name: "when", title: "When & where" },
    { name: "display", title: "Display" }
  ],
  fields: [
    defineField({ name: "kind", title: "Type of event", type: "string", group: "main", initialValue: "oneoff",
      options: { list: [{ title: "Special event (has dates)", value: "oneoff" }, { title: "Regular gathering (repeats)", value: "recurring" }], layout: "radio" },
      validation: (R) => R.required() }),
    defineField({ name: "title", title: "Event name", type: "string", group: "main", validation: (R) => R.required().max(80) }),
    defineField({ name: "shortTitle", title: "Short name for cards (optional)", type: "string", group: "main", hidden: isRecurring, description: "e.g. Holy Communion, if the full name is too long for the schedule cards." }),
    defineField({ name: "category", title: "Category", type: "string", group: "main",
      options: { list: ["Service", "Bible Study", "Prayer", "Fast", "Ministry program", "Outreach", "Conference", "Children & Teens", "Other"] } }),
    defineField({ name: "eyebrow", title: "Small line above the name", type: "string", group: "main", hidden: isOneOff, description: "e.g. Special program · Pillars of Mercy" }),
    defineField({ name: "theme", title: "Theme", type: "string", group: "main", hidden: isOneOff }),
    inGroup(scriptureField("verse", "Scripture", "Optional verse shown under the name."), "main"),
    defineField({ name: "summary", title: "Description", type: "text", rows: 3, group: "main", validation: (R) => R.max(400),
      description: "A sentence or two. For special events this is the text under the dates." }),
    defineField({ name: "homeNote", title: "Short line on the homepage card", type: "string", group: "main", hidden: isRecurring, description: "e.g. Main auditorium & streamed live" }),
    defineField({ name: "liveNote", title: "Short line on the Watch Live page", type: "string", group: "main", hidden: isRecurring, description: "Only if this gathering is streamed." }),

    // ---- When (special events)
    defineField({ name: "startDate", title: "Start date", type: "date", group: "when", hidden: isOneOff,
      validation: (R) => R.custom((v, c) => c.document?.kind === "oneoff" && !v ? "Add the date of the event." : true) }),
    defineField({ name: "endDate", title: "End date", type: "date", group: "when", hidden: isOneOff, description: "For events over several days. The event leaves the website the day after this date.",
      validation: (R) => R.custom((v, c) => v && c.document?.startDate && v < c.document.startDate ? "The end date is before the start date." : true) }),
    defineField({ name: "dateLabel", title: "Dates as shown (optional)", type: "string", group: "when", hidden: isOneOff, description: "Leave empty to show the dates automatically, e.g. “Mon, Oct 26 – Sun, Nov 8”." }),
    defineField({ name: "timeLines", title: "Times", type: "array", group: "when", hidden: isOneOff, of: [{ type: "string" }],
      description: "One line each, e.g. “10:00 PM – 1:00 AM” or “Daily prayer: 6 AM & 9 PM”." }),

    // ---- When (regular gatherings)
    defineField({ name: "recurrence", title: "Repeats", type: "object", group: "when", hidden: isRecurring,
      fields: [
        defineField({ name: "frequency", title: "How often", type: "string", initialValue: "weekly",
          options: { list: [{ title: "Every week", value: "weekly" }, { title: "Every month, on a set day", value: "monthly" }, { title: "Every year", value: "yearly" }, { title: "Monthly, date varies", value: "irregular" }], layout: "radio" } }),
        defineField({ name: "weekOfMonth", title: "Which week", type: "number", hidden: (p) => p.parent?.frequency !== "monthly",
          options: { list: [{ title: "1st", value: 1 }, { title: "2nd", value: 2 }, { title: "3rd", value: 3 }, { title: "4th", value: 4 }, { title: "Last", value: -1 }] } }),
        defineField({ name: "weekday", title: "Day", type: "string", hidden: (p) => !["weekly", "monthly"].includes(p.parent?.frequency),
          options: { list: WEEKDAYS.map((d) => ({ title: d[0].toUpperCase() + d.slice(1), value: d })) } }),
        defineField({ name: "month", title: "Month", type: "number", hidden: (p) => p.parent?.frequency !== "yearly",
          options: { list: MONTHS.map((m, i) => ({ title: m, value: i + 1 })) } }),
        defineField({ name: "startsOn", title: "First date (optional)", type: "date" }),
        defineField({ name: "endsOn", title: "Stops after (optional)", type: "date", description: "Leave empty if it continues." })
      ],
      validation: (R) => R.custom((r, c) => {
        if (c.document?.kind !== "recurring") return true;
        if (!r?.frequency) return "Choose how often it repeats.";
        if (["weekly", "monthly"].includes(r.frequency) && !r.weekday) return "Choose the day.";
        if (r.frequency === "monthly" && !r.weekOfMonth) return "Choose which week of the month.";
        return true;
      }),
      description: "Shown as e.g. “Every Sunday” or “1st Tuesday · Monthly”." }),
    defineField({ name: "startTime", title: "Starts at", type: "string", group: "when", hidden: isRecurring, validation: timeRule, description: "e.g. 10:00 AM" }),
    defineField({ name: "endTime", title: "Ends at (optional)", type: "string", group: "when", hidden: isRecurring, validation: timeRule }),
    defineField({ name: "timeNote", title: "Time as words (optional)", type: "string", group: "when", hidden: isRecurring, description: "Use instead of a time, e.g. “Immediately after Sunday Service”." }),
    defineField({ name: "exceptions", title: "Exceptions", type: "array", group: "when", hidden: isRecurring,
      description: "Cancel one date, change its time or add an extra date, without changing the normal schedule. Shown on the Events page for the three weeks before.",
      of: [defineArrayMember({ type: "object", name: "exception", fields: [
        defineField({ name: "date", title: "Date", type: "date", validation: (R) => R.required() }),
        defineField({ name: "kind", title: "What happens", type: "string", initialValue: "cancelled",
          options: { list: [{ title: "Cancelled", value: "cancelled" }, { title: "Different time", value: "changed" }, { title: "Extra date", value: "special" }], layout: "radio" } }),
        defineField({ name: "time", title: "New start time", type: "string", validation: timeRule, hidden: (p) => p.parent?.kind === "cancelled" }),
        defineField({ name: "endTime", title: "New end time", type: "string", validation: timeRule, hidden: (p) => p.parent?.kind === "cancelled" }),
        defineField({ name: "note", title: "Note", type: "string", description: "e.g. Combined service at the convention" })
      ], preview: { select: { title: "date", subtitle: "kind" } } })] }),

    defineField({ name: "location", title: "Where", type: "string", group: "when", description: "e.g. Main auditorium, or Mercy Seat Chapel & live on YouTube" }),
    defineField({ name: "attendance", title: "In person or online", type: "string", group: "when", initialValue: "inperson",
      options: { list: [{ title: "In person", value: "inperson" }, { title: "Online", value: "online" }, { title: "In person & online", value: "both" }], layout: "radio" } }),
    defineField({ name: "joinUrl", title: "Online meeting or registration link", type: "url", group: "when", validation: (R) => R.uri({ scheme: ["https"] }) }),
    defineField({ name: "showPrayerLine", title: "Show the prayer line number", type: "boolean", group: "when", initialValue: false }),
    defineField({ name: "details", title: "Extra details", type: "array", group: "when", hidden: isRecurring,
      description: "Small icon + text items shown with the time, e.g. Open to everyone, Mercy For Many.",
      of: [{ type: "object", name: "detail", fields: [iconField(), defineField({ name: "text", type: "string", title: "Text" })], preview: { select: { title: "text", subtitle: "icon" } } }] }),

    // ---- Display
    inGroup(imageField("image", "Poster or photo", { decorative: true, description: "Special events: the flyer. Regular gatherings: the photo on homepage cards." }), "display"),
    inGroup(iconField("icon", "Icon for schedule cards"), "display"),
    inGroup(buttons(), "display"),
    defineField({ name: "featured", title: "Show in “What’s happening” slider", type: "boolean", group: "display", initialValue: true, hidden: isOneOff,
      description: "The slider on the homepage and Events page. Events leave it automatically after their end date." }),
    defineField({ name: "listed", title: "Show on the Events page", type: "boolean", group: "display", initialValue: true, hidden: isRecurring }),
    defineField({ name: "badge", title: "Calendar badge (optional)", type: "object", group: "display", hidden: isRecurring, options: { collapsible: true, collapsed: true },
      description: "The two short lines in the date square. Leave empty to fill automatically.",
      fields: [defineField({ name: "top", type: "string", title: "Top" }), defineField({ name: "bottom", type: "string", title: "Bottom" })] }),
    defineField({ name: "dayLabel", title: "Day as shown on cards (optional)", type: "string", group: "display", hidden: isRecurring, description: "Leave empty to fill automatically, e.g. “Every Sunday”." }),
    inGroup(orderField, "display"),
    defineField({ name: "archived", title: "Archived", type: "boolean", group: "display", initialValue: false, description: "Hides it from the website but keeps the record." })
  ],
  orderings: [...ordering, { title: "Start date", name: "startDesc", by: [{ field: "startDate", direction: "desc" }] }],
  preview: {
    select: { title: "title", kind: "kind", start: "startDate", end: "endDate", r: "recurrence", media: "image", archived: "archived" },
    prepare: ({ title, kind, start, end, r, media, archived }) => ({
      title, media,
      subtitle: `${archived ? "Archived · " : ""}${kind === "recurring" ? scheduleLabel(r) : [start, end].filter(Boolean).join(" → ") || "No date"}`
    })
  }
});
