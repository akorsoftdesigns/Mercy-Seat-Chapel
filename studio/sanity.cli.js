import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET || "production"
  },
  // Dashboard address when published with `npm run deploy`: https://<studioHost>.sanity.studio
  studioHost: process.env.SANITY_STUDIO_HOST || "mercyseatchapel",
  deployment: { autoUpdates: true }
});
