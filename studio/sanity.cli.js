import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET || "production"
  },
  // Dashboard address when published with `npm run deploy`: https://<studioHost>.sanity.studio
  studioHost: process.env.SANITY_STUDIO_HOST || "mercyseatchapel",
  // appId: the online dashboard Sanity created on first deploy (not secret); lets later deploys skip a prompt
  deployment: { autoUpdates: true, appId: "mcya4y1r2lvurt9oq03cpaik" }
});
