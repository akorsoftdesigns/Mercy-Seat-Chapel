/* Who may change what in the dashboard.

   IMPORTANT: Sanity's free plan has two roles: Administrator (can edit and
   publish everything) and Viewer (read-only). The checks below only shape the
   dashboard screens: they hide or lock buttons for staff who are not listed.
   They are a safety rail against mistakes, not a security boundary: anyone with
   the Administrator role could still change content through Sanity's API.
   True Editor / Contributor roles need Sanity's paid Growth plan.

   To give someone publishing rights, add their sign-in email to PUBLISHERS.
   To let someone change Site Settings (phone, email, links), add it to SETTINGS_EDITORS.
   Leave a list empty to allow every Administrator. */

const list = (v) => String(v || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

// Set in studio/.env (see .env.example) so the lists aren't hard-coded here
export const PUBLISHERS = list(import.meta.env?.SANITY_STUDIO_PUBLISHERS);
export const SETTINGS_EDITORS = list(import.meta.env?.SANITY_STUDIO_SETTINGS_EDITORS);

const roleNames = (user) => (user?.roles || []).map((r) => r.name);
const isAdmin = (user) => roleNames(user).includes("administrator");
const listed = (names, user) => !names.length || names.includes(String(user?.email || "").toLowerCase());

export const canPublish = (user) => isAdmin(user) && listed(PUBLISHERS, user);
export const canEditSettings = (user) => isAdmin(user) && listed(SETTINGS_EDITORS, user);
