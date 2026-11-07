/* Mercy Seat Chapel content dashboard (Sanity Studio).
   Project ID and dataset come from studio/.env (see .env.example). */
import { defineConfig, buildLegacyTheme } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes, SINGLETONS } from "./schemas/index.js";
import { structure, defaultDocumentNode } from "./structure.js";
import { dashboardTool } from "./components/Dashboard.jsx";
import { canPublish } from "./access.js";
import { Logo } from "./components/Logo.jsx";

// Brand colours from the website's design system (assets/css/style.css)
const BLUE = "#1B3068", CORAL = "#FF485E", INK = "#101C33", MUTED = "#64748B";
const theme = buildLegacyTheme({
  "--black": INK,
  "--white": "#ffffff",
  "--gray": MUTED,
  "--gray-base": MUTED,
  "--component-bg": "#ffffff",
  "--component-text-color": INK,
  "--brand-primary": BLUE,
  "--default-button-color": MUTED,
  "--default-button-primary-color": BLUE,
  "--default-button-success-color": "#1F8A5B",
  "--default-button-warning-color": "#C77700",
  "--default-button-danger-color": "#CF2444",
  "--state-info-color": BLUE,
  "--state-success-color": "#1F8A5B",
  "--state-warning-color": "#C77700",
  "--state-danger-color": "#CF2444",
  "--main-navigation-color": BLUE,
  "--main-navigation-color--inverted": "#ffffff",
  "--focus-color": CORAL
});

const SINGLETON_ACTIONS = new Set(["publish", "discardChanges", "restore"]);
const PUBLISH_ACTIONS = new Set(["publish", "unpublish", "delete"]);

export default defineConfig({
  name: "default",
  title: "Mercy Seat Chapel",
  icon: Logo,
  projectId: import.meta.env.SANITY_STUDIO_PROJECT_ID || "missing-project-id",
  dataset: import.meta.env.SANITY_STUDIO_DATASET || "production",
  theme,
  plugins: [dashboardTool(), structureTool({ title: "Content", structure, defaultDocumentNode })],
  schema: {
    types: schemaTypes,
    // Settings and Homepage are single pages: they can't be created again from "New document"
    templates: (prev) => prev.filter((t) => !SINGLETONS.includes(t.schemaType))
  },
  document: {
    actions: (prev, ctx) => {
      let actions = prev;
      if (SINGLETONS.includes(ctx.schemaType)) actions = actions.filter((a) => SINGLETON_ACTIONS.has(a.action));
      // Staff not on the publishers list can save drafts, which a publisher then reviews and publishes
      if (!canPublish(ctx.currentUser)) actions = actions.filter((a) => !PUBLISH_ACTIONS.has(a.action));
      return actions;
    },
    newDocumentOptions: (prev) => prev.filter((t) => !SINGLETONS.includes(t.templateId))
  }
});
