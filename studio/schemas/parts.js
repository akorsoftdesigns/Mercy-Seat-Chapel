/* Reusable field definitions for the content models.
   Keeping them here means every module labels, validates and stores
   images, links, buttons and rich text the same way. */
import { defineField, defineArrayMember } from "sanity";

// Pages that exist on the website, offered as link choices so editors don't type file names
export const SITE_PAGES = [
  ["Home", "index.html"], ["About", "about.html"], ["Leadership", "leadership.html"], ["RCCG", "rccg.html"],
  ["Ministries", "ministries.html"], ["Departments", "departments.html"], ["Marriage Counselling", "marriage-counselling.html"],
  ["Outreach & Community", "outreach.html"], ["Events & Programs", "events.html"], ["Seeking His Presence", "seeking-his-presence.html"],
  ["Foundation Academy", "foundation-academy.html"], ["Sermons", "sermons.html"], ["Watch Live", "live.html"],
  ["Plan a Visit", "plan-a-visit.html"], ["Need a Ride", "plan-a-visit.html#ride"], ["Give", "give.html"], ["Contact", "contact.html"],
  ["Prayer request", "contact.html#prayer"], ["Testimonies", "testimonies.html"], ["Gallery", "gallery.html"], ["Job Center", "job-center.html"],
  ["Service times (homepage)", "index.html#service-times"]
].map(([title, value]) => ({ title, value }));

/** Link: a website page, an uploaded file, or an approved web address. */
export const linkTarget = (name = "link", title = "Link to") => defineField({
  name, title, type: "object",
  options: { collapsible: false },
  fields: [
    defineField({ name: "page", title: "Website page", type: "string", options: { list: SITE_PAGES }, description: "Choose a page of this website…" }),
    defineField({ name: "url", title: "…or a web address", type: "url", description: "Full address starting with https://, or a page such as events.html#upcoming. Leave empty if you chose a page above.",
      validation: (R) => R.uri({ scheme: ["https", "mailto", "tel"], allowRelative: true }) }),
    defineField({ name: "file", title: "…or a file to open", type: "file", description: "For a flyer, guide or PDF people can open." }),
    defineField({ name: "newTab", title: "Open in a new tab", type: "boolean", initialValue: false })
  ],
  validation: (R) => R.custom((v) => {
    if (!v) return true;
    const n = [v.page, v.url, v.file?.asset].filter(Boolean).length;
    return n > 1 ? "Choose only one: a page, a web address or a file." : true;
  })
});

/** Button: label + link + style (styles match the website's button set). */
export const button = defineArrayMember({
  type: "object", name: "button", title: "Button",
  fields: [
    defineField({ name: "label", title: "Button text", type: "string", validation: (R) => R.required().max(40) }),
    linkTarget(),
    defineField({ name: "style", title: "Style", type: "string", initialValue: "primary",
      options: { list: [
        { title: "Coral (main action)", value: "primary" },
        { title: "Blue", value: "secondary" },
        { title: "Outline", value: "outline" },
        { title: "Watch Live (red)", value: "live" }
      ], layout: "radio" } }),
    defineField({ name: "icon", title: "Icon", type: "string", description: "Optional small icon after the text.",
      options: { list: [
        { title: "None", value: "" }, { title: "Arrow right", value: "arrow-right" }, { title: "Arrow up-right (opens elsewhere)", value: "arrow-up-right" },
        { title: "Play", value: "play-circle" }, { title: "Live", value: "radio" }
      ] } })
  ],
  preview: { select: { title: "label", subtitle: "link.page" } }
});
export const buttons = (name = "buttons", title = "Buttons") => defineField({ name, title, type: "array", of: [button], validation: (R) => R.max(3) });

/** Image with required alternative text and the focus-point (hotspot) tool. */
export const imageField = (name, title, { required = false, description, decorative = false } = {}) => defineField({
  name, title, type: "image", description,
  options: { hotspot: true },
  fields: [
    defineField({
      name: "alt", title: "Describe the picture (alt text)", type: "string",
      description: decorative ? "Optional: this picture is decorative here." : "Describe what the picture shows for people using screen readers, e.g. “Children receiving Christmas gifts”.",
      validation: decorative ? undefined : (R) => R.custom((alt, ctx) => ctx.parent?.asset && !alt ? "Please describe the picture." : true)
    })
  ],
  validation: required ? (R) => R.required() : undefined
});

/** Icons used on the website (Lucide icon names). */
export const ICONS = ["church", "book-open", "wine", "hand-heart", "sprout", "party-popper", "clock", "calendar", "map-pin", "users", "radio", "phone",
  "video", "megaphone", "heart-handshake", "heart", "shield", "briefcase", "gift", "utensils", "globe", "music", "mic", "star", "sparkles"]
  .map((v) => ({ title: v.replace(/-/g, " "), value: v }));
export const iconField = (name = "icon", title = "Icon") => defineField({ name, title, type: "string", options: { list: ICONS } });

/** Rich text with only the styles the website supports (paragraph, subheading, check list, scripture quote). */
export const richText = (name = "body", title = "Main text") => defineField({
  name, title, type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [{ title: "Paragraph", value: "normal" }, { title: "Subheading", value: "h3" }],
      lists: [{ title: "Check list", value: "bullet" }],
      marks: {
        decorators: [{ title: "Bold", value: "strong" }, { title: "Italic", value: "em" }],
        annotations: [
          defineArrayMember({ name: "link", type: "object", title: "Link", fields: [
            defineField({ name: "href", title: "Address", type: "url", validation: (R) => R.uri({ scheme: ["https", "mailto", "tel"], allowRelative: true }) }),
            defineField({ name: "site", title: "…or a church link", type: "string", description: "Uses the address saved in Site Settings, so it stays up to date.",
              options: { list: ["youtube", "instagram", "facebook", "twitter", "tiktok", "giving", "phone", "email", "prayer-line"] } }),
            defineField({ name: "newTab", title: "Open in a new tab", type: "boolean" })
          ] })
        ]
      }
    }),
    defineArrayMember({
      type: "object", name: "scripture", title: "Scripture quote",
      fields: [
        defineField({ name: "text", title: "Verse text", type: "text", rows: 3, validation: (R) => R.required() }),
        defineField({ name: "cite", title: "Reference", type: "string", description: "e.g. Psalm 98:1, 4-6" })
      ],
      preview: { select: { title: "cite", subtitle: "text" }, prepare: ({ title, subtitle }) => ({ title: `Scripture: ${title || ""}`, subtitle }) }
    })
  ]
});

export const scriptureField = (name, title, description) => defineField({
  name, title, type: "object", description, options: { collapsible: true, collapsed: true },
  fields: [
    defineField({ name: "text", title: "Verse text", type: "text", rows: 3 }),
    defineField({ name: "cite", title: "Reference", type: "string" })
  ]
});

export const orderField = defineField({ name: "order", title: "Display order", type: "number", description: "Lower numbers show first (1, 2, 3…).", validation: (R) => R.integer().min(0) });

/** Anchor used in the page address (e.g. ministries.html#revive). Changing it breaks existing links. */
export const anchorField = defineField({
  name: "anchor", title: "Page anchor", type: "slug",
  description: "The part after # in links to this section (e.g. ministries.html#revive). Avoid changing it once published: links elsewhere use it.",
  options: { source: "name", maxLength: 40 },
  validation: (R) => R.required()
});

/** Puts a shared field into one of the document's tabs. */
export const inGroup = (field, group) => ({ ...field, group });

export const ordering = [{ title: "Display order", name: "orderAsc", by: [{ field: "order", direction: "asc" }] }];
