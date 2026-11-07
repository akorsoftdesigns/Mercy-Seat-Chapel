/* Homepage: hero slides and which shared records the homepage features.
   Events, ministries and outreach programs are not copied here: the homepage
   points at the same records the other pages use. */
import { defineType, defineField, defineArrayMember } from "sanity";
import { HomeIcon } from "../icons.js";
import { youtubeRule, toSeconds } from "../shared/youtube.js";
import { imageField, buttons } from "./parts.js";

const startRule = (R) => R.custom((v) => !v || /^\d+$|^\d{1,2}(:\d{2}){1,2}$/.test(v) ? true : "Write the start point like 59:26 or 1:02:30.");

export default defineType({
  name: "homepage",
  title: "Homepage",
  type: "document",
  icon: HomeIcon,
  groups: [{ name: "hero", title: "Hero slides", default: true }, { name: "sections", title: "Featured sections" }],
  fields: [
    defineField({ name: "kicker", title: "Small line above the headline", type: "string", group: "hero", initialValue: "Welcome to Mercy Seat Chapel" }),
    defineField({
      name: "heroSlides", title: "Hero slides", type: "array", group: "hero",
      description: "Drag to change the order. Each slide shows a photo, and plays a few silent seconds of a YouTube video over it when one is set.",
      validation: (R) => R.min(1).max(6),
      of: [defineArrayMember({
        type: "object", name: "heroSlide", title: "Slide",
        fields: [
          defineField({ name: "enabled", title: "Show this slide", type: "boolean", initialValue: true }),
          defineField({ name: "heading", title: "Headline", type: "string", validation: (R) => R.required().max(90),
            description: "Put *stars* around words to show them in coral italic, e.g. We come together to obtain *Mercy* and *Grace*" }),
          defineField({ name: "lead", title: "Short description", type: "text", rows: 2, validation: (R) => R.max(220) }),
          defineField({ name: "thumbLabel", title: "Name of the slide (for screen readers)", type: "string", description: "e.g. Mercy and Grace" }),
          imageField("image", "Background photo", { required: true, decorative: true, description: "Shown while the video loads, on slow connections and for visitors who turn off motion. Use a wide photo." }),
          defineField({ name: "youtube", title: "Background video (YouTube link)", type: "string", validation: (R) => youtubeRule(R),
            description: "Optional. The video plays muted, without controls." }),
          defineField({ name: "videoStart", title: "Start the video at", type: "string", validation: startRule, description: "Minutes:seconds or hours:minutes:seconds, e.g. 59:26" }),
          defineField({ name: "seconds", title: "Seconds on screen", type: "number", initialValue: 8, validation: (R) => R.min(4).max(20) })
        ],
        preview: {
          select: { title: "heading", enabled: "enabled", media: "image", start: "videoStart" },
          prepare: ({ title, enabled, media, start }) => ({ title: (title || "").replace(/\*/g, ""), subtitle: `${enabled === false ? "Hidden · " : ""}${start ? `video from ${start} (${toSeconds(start)}s)` : "photo only"}`, media })
        }
      })]
    }),
    buttons("heroButtons", "Hero buttons"),

    defineField({ name: "serviceTimes", title: "“Worship, Grow and Connect” cards", type: "array", group: "sections",
      description: "Choose regular gatherings from Events. The first two show as large cards. Each card uses that event's photo, icon and homepage line.",
      of: [{ type: "reference", to: [{ type: "event" }], options: { filter: "kind == 'recurring'" } }], validation: (R) => R.max(8).unique() }),
    defineField({ name: "liveSchedule", title: "Watch Live page: “When we stream” cards", type: "array", group: "sections",
      of: [{ type: "reference", to: [{ type: "event" }], options: { filter: "kind == 'recurring'" } }], validation: (R) => R.max(6).unique() }),
    defineField({ name: "featuredMinistries", title: "“Find your place” tabs", type: "array", group: "sections",
      description: "Ministries shown as tabs on the homepage, in this order. Text comes from each ministry's Homepage tab fields.",
      of: [{ type: "reference", to: [{ type: "ministry" }] }], validation: (R) => R.max(6).unique() }),
    defineField({ name: "featuredOutreach", title: "“Mercy for Many” cards", type: "array", group: "sections",
      of: [{ type: "reference", to: [{ type: "outreach" }] }], validation: (R) => R.max(4).unique() })
  ],
  preview: { prepare: () => ({ title: "Homepage" }) }
});
