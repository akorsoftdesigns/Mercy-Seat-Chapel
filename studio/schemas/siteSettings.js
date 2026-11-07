/* Site Settings: the church's public details, shown in the header, footer
   and every page that uses them. Replaces hand-editing SITE in main.js. */
import { defineType, defineField } from "sanity";
import { CogIcon } from "../icons.js";
import { youtubeRule } from "../shared/youtube.js";
import { canEditSettings } from "../access.js";

const locked = ({ currentUser }) => !canEditSettings(currentUser);
const httpsUrl = (R) => R.uri({ scheme: ["https"] });

export default defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  icon: CogIcon,
  groups: [
    { name: "contact", title: "Contact", default: true },
    { name: "times", title: "Service times" },
    { name: "live", title: "Watch Live" },
    { name: "links", title: "Social & links" }
  ],
  fields: [
    defineField({ name: "phone", title: "Phone number", type: "string", group: "contact", readOnly: locked,
      description: "As people should see it, e.g. (301) 740-8118. The tap-to-call link is made from it automatically.",
      validation: (R) => R.required().custom((v) => (v || "").replace(/\D/g, "").length >= 10 ? true : "Include the area code.") }),
    defineField({ name: "prayerLine", title: "Prayer line", type: "string", group: "contact", readOnly: locked, description: "e.g. 1 857 216 6700, code 860476" }),
    defineField({ name: "prayerLineDial", title: "Prayer line: number to dial", type: "string", group: "contact", readOnly: locked,
      description: "Digits only, with the access code after a comma, e.g. 18572166700,860476. Phones dial the code automatically." }),
    defineField({ name: "email", title: "Public email", type: "string", group: "contact", readOnly: locked, validation: (R) => R.required().email() }),
    defineField({ name: "address", title: "Church address", type: "string", group: "contact", readOnly: locked, validation: (R) => R.required(),
      description: "One line, e.g. 17604 Washington Grove Lane, Gaithersburg, MD 20877. The map link is made from it automatically." }),
    defineField({ name: "mailingAddress", title: "Mailing address (for giving by mail)", type: "string", group: "contact", readOnly: locked }),

    defineField({ name: "serviceTimes", title: "Service times (footer)", type: "array", group: "times",
      description: "The short list in the footer of every page.",
      of: [{ type: "object", name: "time", fields: [
        defineField({ name: "label", title: "Name", type: "string", validation: (R) => R.required() }),
        defineField({ name: "time", title: "When", type: "string", description: "e.g. 10:00 AM or 1st Tue · 7:30 PM", validation: (R) => R.required() })
      ], preview: { select: { title: "label", subtitle: "time" } } }],
      validation: (R) => R.max(5) }),

    defineField({ name: "liveVideo", title: "Current livestream link", type: "string", group: "live",
      description: "Paste the YouTube link of today's broadcast (from YouTube Studio or the video's Share button). Leave empty to show whatever the channel is streaming at the time. This does not tell visitors we are live; YouTube shows that itself.",
      validation: (R) => youtubeRule(R) }),
    defineField({ name: "youtubeChannelId", title: "YouTube channel ID", type: "string", group: "live", readOnly: locked,
      description: "Starts with UC. Used for the automatic sermon lists. Only change if the church moves to a new channel.",
      validation: (R) => R.required().regex(/^UC[\w-]{22}$/, { name: "channel ID" }) }),
    defineField({ name: "youtubeLiveUrl", title: "“Watch on YouTube” link", type: "url", group: "live", readOnly: locked, validation: httpsUrl }),

    defineField({ name: "social", title: "Social media", type: "object", group: "links", readOnly: locked,
      description: "Verified church accounts only. Leave empty to hide an icon.",
      fields: ["youtube", "instagram", "facebook", "twitter", "tiktok"].map((k) =>
        defineField({ name: k, title: { twitter: "X (Twitter)", tiktok: "TikTok", youtube: "YouTube" }[k] || k[0].toUpperCase() + k.slice(1), type: "url", validation: httpsUrl })) }),
    defineField({ name: "givingUrl", title: "Online giving page", type: "url", group: "links", readOnly: locked, validation: (R) => R.required().uri({ scheme: ["https"] }) }),
    defineField({ name: "appStoreUrl", title: "App Store link", type: "url", group: "links", readOnly: locked, validation: httpsUrl, description: "Leave empty until the app is published." }),
    defineField({ name: "playStoreUrl", title: "Google Play link", type: "url", group: "links", readOnly: locked, validation: httpsUrl, description: "Leave empty until the app is published." })
  ],
  preview: { prepare: () => ({ title: "Site Settings", subtitle: "Contact details, service times, links" }) }
});
