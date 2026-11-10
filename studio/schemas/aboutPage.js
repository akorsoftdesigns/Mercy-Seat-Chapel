/* About page: the Vision, Growth Pillars, membership Journey and membership
   call-to-action shown under "Our Beliefs" on about.html. Numbers (01, 02…)
   are added automatically from the order of each list. */
import { defineType, defineField, defineArrayMember } from "sanity";
import { InfoOutlineIcon } from "../icons.js";
import { buttons } from "./parts.js";

const headingHelp = "Put *stars* around words to show them in coral, e.g. Growing Stronger, *Together*";

// Small label, heading and introduction at the top of each part
const head = (prefix, group, eyebrow) => [
  defineField({ name: `${prefix}Eyebrow`, title: "Small label above the heading", type: "string", group, initialValue: eyebrow }),
  defineField({ name: `${prefix}Heading`, title: "Heading", type: "string", group, description: headingHelp, validation: (R) => R.max(90) }),
  defineField({ name: `${prefix}Intro`, title: "Introduction", type: "text", rows: 4, group, validation: (R) => R.max(600) })
];

// A numbered item: heading, optional second line, text
const item = (name, title, { label, labelHelp, subtitle } = {}) => defineArrayMember({
  type: "object", name, title,
  fields: [
    label && defineField({ name: "label", title: label, type: "string", description: labelHelp, validation: (R) => R.required().max(24) }),
    defineField({ name: "title", title: "Heading", type: "string", validation: (R) => R.required().max(60) }),
    subtitle && defineField({ name: "subtitle", title: subtitle, type: "string", validation: (R) => R.max(70) }),
    defineField({ name: "text", title: "Text", type: "text", rows: 4, validation: (R) => R.required().max(500) })
  ].filter(Boolean),
  preview: { select: { title: "title", label: "label", subtitle: "subtitle" },
    prepare: ({ title, label, subtitle }) => ({ title: label ? `${label}: ${title}` : title, subtitle }) }
});

const list = (name, title, group, of, max, description) => defineField({
  name, title, type: "array", group, of: [of], description: `${description} Drag to change the order; numbers follow the order.`,
  validation: (R) => R.max(max)
});

export default defineType({
  name: "aboutPage",
  title: "About page",
  type: "document",
  icon: InfoOutlineIcon,
  groups: [
    { name: "vision", title: "Our Vision", default: true },
    { name: "pillars", title: "Growth Pillars" },
    { name: "journey", title: "Your Journey" },
    { name: "cta", title: "Membership call to action" }
  ],
  fields: [
    ...head("vision", "vision", "Our Vision"),
    list("values", "Values", "vision", item("value", "Value"), 8, "Shown as numbered cards."),

    ...head("pillars", "pillars", "Our Growth Pillars"),
    list("pillars", "Pillars", "pillars", item("pillar", "Pillar", { subtitle: "Second line (optional)" }), 6,
      "e.g. Bonding / Building a Caring Church Family."),

    ...head("journey", "journey", "Your Journey at MSC"),
    list("journeySteps", "Stages", "journey", item("stage", "Stage", { label: "Stage name", labelHelp: "One or two words, e.g. Meet, Decide, Learn" }), 8,
      "Shown as a numbered path from the first stage to the last."),

    defineField({ name: "ctaHeading", title: "Heading", type: "string", group: "cta", validation: (R) => R.max(80) }),
    defineField({ name: "ctaText", title: "Text", type: "text", rows: 3, group: "cta", validation: (R) => R.max(300) }),
    { ...buttons("ctaButtons", "Buttons"), group: "cta" }
  ],
  preview: { prepare: () => ({ title: "About page" }) }
});
