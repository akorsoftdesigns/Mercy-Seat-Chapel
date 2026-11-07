# Administrator guide

## Giving staff access

1. Go to **sanity.io/manage → Mercy Seat Chapel → Members → Invite members**.
2. Enter their email address and choose a role:
   - **Administrator:** can edit, publish and delete content, and manage members. This is the only editing role on the free plan.
   - **Viewer:** can look but not change anything.
3. They receive an email, and sign in at the dashboard with that email (or its Google account). Password reset is handled by Sanity or Google.

To remove access, open **Members → ⋯ → Remove**. They are signed out at once.

## Who can publish, and who can change Site Settings

On the free plan, every editor is an Administrator. To reduce mistakes, the dashboard reads two optional lists from `studio/.env`:

```
SANITY_STUDIO_PUBLISHERS=pastor@example.org,office@example.org
SANITY_STUDIO_SETTINGS_EDITORS=office@example.org
```

- People **not** on `PUBLISHERS` don't see Publish, Unpublish or Delete. They save drafts, which appear on the dashboard home under *Drafts waiting to be published* for a publisher to review.
- People **not** on `SETTINGS_EDITORS` see Site Settings (phone, email, address, links, giving page, channel) as read-only. Anyone can still update the **livestream link**.
- Leave a list empty to allow every Administrator.
- After changing the lists, run `npm run deploy` in `studio/`.

**Important:** these lists only change the dashboard's buttons. They are not security. An Administrator could still change content through Sanity's API. For enforced Editor/Contributor roles, upgrade to Sanity Growth ($15 per user per month). Ask before doing so.

## Reviewing and publishing

- Open a draft, use the **Preview** tab to check it, then press **Publish**. Fields with red messages must be fixed first, so incomplete items can't be published.
- **Unpublish** removes an item from the website but keeps it in the dashboard.
- **Archived / Hide from the website** fields keep an item without showing it.
- **History** (⋯ menu) lets you restore an earlier version.

## What updates when

- Publishing triggers a website update. Changes are visible in about 1–3 minutes, or within 30 minutes without the webhook.
- Special events leave the slider automatically after their end date. Announcements leave after their "Remove after" date. Jobs leave after their deadline.
- Cancellations and time changes for regular gatherings show on the Events page for the 3 weeks before the date.

## Things the dashboard deliberately does not do

- It has no form submissions, prayer requests, member records, job applications or donations. Those go to the church's inboxes and giving platform.
- It does not change page layouts. A new kind of section is a web-team job.
- It does not create new job detail pages (each has its own application form).

## If something looks wrong on the website

1. Check the item is **published** (not just saved as a draft).
2. Check GitHub → **Actions** for a failed run (see Troubleshooting in `deployment.md`).
3. Every update is a commit in GitHub. A web-team member can revert one commit to restore the previous pages straight away.
