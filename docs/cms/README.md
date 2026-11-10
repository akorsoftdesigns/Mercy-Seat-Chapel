# Content dashboard: how it works

Church staff edit public website content in a dashboard (Sanity Studio) instead of editing HTML.

```
 Staff sign in ─► Dashboard (mercyseatchapel.sanity.studio) ─► Publish
                                                                  │  (Sanity webhook, plus a check every 30 min)
                                                                  ▼
                                   GitHub Action: scripts/cms-build.mjs
                     writes published content into the existing HTML pages
                                   │                         │
                                   ▼                         ▼
                      GitHub Pages (staging)        SiteGround (production, via SSH upload)

 Future mobile app ─► Sanity's public read-only API (same published content)
```

- **One source of truth.** Content lives in Sanity. The pages hold a generated copy between `<!-- cms:name -->` markers.
- **No server on SiteGround.** SiteGround serves plain HTML/CSS/JS, so there is no PHP, WordPress or Node.js there.
- **Readable by search engines and fast.** Content is written into the HTML before upload. Visitors never wait for Sanity, and the site keeps working if Sanity is down.
- **Safe failures.** If Sanity or YouTube can't be reached, the build changes nothing. A section is only rewritten when it has content.

## What the dashboard manages

| Dashboard section | Website location | Marker(s) |
|---|---|---|
| Site Settings | Header, footer, every `data-site` link, Give page, Watch Live player | `cms:site-settings` in `assets/js/main.js` |
| Homepage → Hero slides & buttons | Homepage hero | `hero-slides`, `hero-kicker`, `hero-texts`, `hero-buttons`, `hero-thumbs` |
| Homepage → featured sections | Service-time cards, ministry tabs, outreach cards, Watch Live schedule | `service-times`, `place-tabs`, `outreach-cards`, `live-schedule` |
| Announcements (featured) + Special events | “What’s happening” slider on Home and Events | `assets/partials/upcoming-events.html` (whole file) |
| Events → Regular gatherings | Events page list; yearly ones as “Seasonal outreaches” | `events-regular`, `events-seasonal` |
| Sermons (featured) | Sermons page “More messages” | `sermons-more` |
| YouTube channel (automatic) | Home “Latest messages”, Sermons “Recent services”, Watch Live “Recent livestreams” | `latest-messages`, `recent-services`, `recent-livestreams` + `assets/data/youtube-*.json` |
| Ministries | Ministries page | `ministries` |
| Departments | Departments page | `departments` |
| Outreach | Outreach page (rows + overview boxes) | `outreach-rows`, `outreach-overview` |
| Leadership | About page | `leaders` |
| Job Center | Job Center listing | `jobs` |

**Not managed by the dashboard (unchanged):**
- Every form and its submissions (contact, prayer, counselling, first-timer, membership, job applications)
- Giving and donations
- Page layouts, the menu, legal pages, the About/RCCG/beliefs text, the Gallery, Testimonies, Plan a Visit, the Foundation Academy and Seeking His Presence pages
- Job detail pages (each has its own application form)

These can be moved into the dashboard later if needed.

## Files

| Path | What it is |
|---|---|
| `studio/` | The dashboard: content models (`schemas/`), menu (`structure.js`), home screen and preview (`components/`), access rules (`access.js`) |
| `studio/shared/` | Templates and helpers shared by the dashboard preview and the website build |
| `studio/tools/seed-from-site.mjs` | Creates the starting dashboard content from the current pages |
| `scripts/cms-build.mjs` | Writes published content into the pages |
| `.github/workflows/cms-publish.yml` | Runs the build and uploads to SiteGround |
| `admin/index.html` | `/admin/` sends staff to the dashboard. It does not protect anything; signing in happens on Sanity. |
| `assets/data/` | `youtube-uploads.json` and `youtube-streams.json` (video lists) and `content.json` (snapshot of all published content: a backup, and a fallback for the app) |
| `assets/cms/` | Pictures uploaded in the dashboard, downloaded and resized (WebP, 1600px). Pictures already in `assets/images` are reused, not copied. |

## Costs and limits

| Service | Plan | Cost |
|---|---|---|
| Sanity | Free: 20 users, 10k documents, 100 GB assets/bandwidth, 2 webhooks | $0 |
| GitHub Actions | Free for public repositories | $0 |
| GitHub Pages | Free (staging) | $0 |
| SiteGround StartUp | Already paid | — |

**Known limits:**
- **Roles.** Sanity's free plan has only **Administrator** and **Viewer**. The dashboard hides Publish/Delete and locks Site Settings for anyone not on the lists in `studio/.env` (see the admin guide), but this is a guard against mistakes, not security. Real Editor/Contributor roles need Sanity Growth at **$15 per user per month**, which has not been turned on.
- **History.** The free plan keeps draft change history for **3 days**. Published content is also kept in Git through `assets/data/content.json` on every publish, so older versions can be recovered from the repository history.
- **Delay.** Updates appear about **1–3 minutes** after publishing, or within 30 minutes if the webhook isn't set up. Browsers and SiteGround may cache pages for a few more minutes.
- **YouTube lists** depend on YouTube's public feed, which sometimes returns errors for hours. The lists then stay as they were and refresh on a later run.
- **Job openings.** A new job needs its detail page and application form created by the web team first. The dashboard then lists it.
