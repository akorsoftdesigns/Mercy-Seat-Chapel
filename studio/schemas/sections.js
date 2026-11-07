/* Ministries, Departments and Outreach programs share one layout on the website
   (photo beside text, alternating sides), so they share these fields. */
import { defineType, defineField } from "sanity";
import { UsersIcon, CaseIcon, HeartIcon } from "../icons.js";
import { imageField, buttons, richText, orderField, ordering, anchorField, scriptureField, iconField, inGroup } from "./parts.js";

const common = (noun) => [
  defineField({ name: "name", title: `${noun} name`, type: "string", group: "main", validation: (R) => R.required().max(60) }),
  inGroup(anchorField, "main"),
  defineField({ name: "tag", title: "Small label above the name", type: "string", group: "main", description: "e.g. Women’s Ministry, Music Department, Christmas" }),
  defineField({ name: "subtitle", title: "Tagline", type: "string", group: "main", description: "Optional short line under the name." }),
  inGroup(richText("body", "Description"), "main"),
  inGroup(imageField("image", "Photo", { required: true }), "main"),
  inGroup(buttons(), "main"),
  inGroup(orderField, "main"),
  defineField({ name: "archived", title: "Hide from the website", type: "boolean", group: "main", initialValue: false })
];

const preview = { select: { title: "name", subtitle: "tag", media: "image", archived: "archived" },
  prepare: ({ title, subtitle, media, archived }) => ({ title, media, subtitle: `${archived ? "Hidden · " : ""}${subtitle || ""}` }) };

export const ministry = defineType({
  name: "ministry", title: "Ministry", type: "document", icon: UsersIcon,
  groups: [{ name: "main", title: "Ministries page", default: true }, { name: "home", title: "Homepage tab" }],
  fields: [
    ...common("Ministry"),
    inGroup(imageField("logo", "Ministry logo (optional)"), "main"),
    defineField({ name: "audience", title: "Who it's for", type: "string", group: "home", description: "e.g. Single youths, ages 18–29" }),
    inGroup(iconField("audienceIcon", "Icon for “who it's for”"), "home"),
    defineField({ name: "homeTab", title: "Tab name", type: "string", group: "home", description: "e.g. Children & Teens. Defaults to the ministry name." }),
    defineField({ name: "homeSummary", title: "Short description", type: "text", rows: 3, group: "home", validation: (R) => R.max(320) }),
    defineField({ name: "homeWord", title: "Large background word", type: "string", group: "home", description: "One word shown faintly over the photo, e.g. Revive", validation: (R) => R.max(14) }),
    inGroup(imageField("homeImage", "Homepage photo (optional)", { description: "Leave empty to use the main photo." }), "home")
  ],
  orderings: ordering, preview
});

export const department = defineType({
  name: "department", title: "Department", type: "document", icon: CaseIcon,
  groups: [{ name: "main", title: "Departments page", default: true }],
  fields: [
    ...common("Department"),
    defineField({ name: "cards", title: "Boxes under the photo", type: "array", group: "main", description: "Optional, e.g. Our Vision / Goal.",
      of: [{ type: "object", name: "card", fields: [defineField({ name: "title", type: "string", title: "Heading" }), defineField({ name: "text", type: "text", rows: 3, title: "Text" })] }],
      validation: (R) => R.max(4) }),
    defineField({ name: "contact", title: "Approved contact (optional)", type: "string", group: "main", description: "Only details the department has agreed to publish." })
  ],
  orderings: ordering, preview
});

export const outreach = defineType({
  name: "outreach", title: "Outreach program", type: "document", icon: HeartIcon,
  groups: [{ name: "main", title: "Outreach page", default: true }, { name: "summary", title: "Cards" }],
  fields: [
    ...common("Program"),
    defineField({ name: "frequency", title: "How often", type: "string", group: "main", description: "e.g. Every Thanksgiving season, Monthly" }),
    inGroup(scriptureField("aside", "Scripture under the photo", "Optional verse shown under the photo."), "main"),
    defineField({ name: "relatedEvents", title: "Related events", type: "array", group: "main", of: [{ type: "reference", to: [{ type: "event" }] }] }),
    defineField({ name: "featured", title: "Featured program", type: "boolean", group: "summary", initialValue: false }),
    inGroup(iconField("overviewIcon", "Icon (overview box)"), "summary"),
    defineField({ name: "overviewTitle", title: "Overview box heading", type: "string", group: "summary", description: "Short, e.g. Turkey Drive" }),
    defineField({ name: "overviewText", title: "Overview box text", type: "string", group: "summary", description: "e.g. Every Thanksgiving season." }),
    defineField({ name: "cardTag", title: "Homepage card label", type: "string", group: "summary", description: "e.g. Christmas" }),
    defineField({ name: "cardText", title: "Homepage card text", type: "text", rows: 2, group: "summary", validation: (R) => R.max(160) }),
    inGroup(imageField("cardImage", "Homepage card photo (optional)", { description: "Leave empty to use the main photo." }), "summary")
  ],
  orderings: ordering, preview
});
