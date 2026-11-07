import siteSettings from "./siteSettings.js";
import homepage from "./homepage.js";
import event from "./event.js";
import { ministry, department, outreach } from "./sections.js";
import { sermon, announcement, leader, job } from "./content.js";

export const schemaTypes = [siteSettings, homepage, announcement, event, sermon, ministry, department, outreach, leader, job];

// One-of-a-kind documents: no "create new" or "delete" for these
export const SINGLETONS = ["siteSettings", "homepage"];
