# Content for the future mobile app

The app will read the **same published content** as the website, straight from Sanity. It needs no separate database and no extra service.

## Access

- **Endpoint:** `https://<projectId>.apicdn.sanity.io/v2025-02-19/data/query/production?query=<GROQ>`. This is the CDN, which is cached, fast and free within the plan.
- **No key needed.** The dataset is public, so only *published* content is returned and drafts are never visible. Don't put write tokens in the app.
- **Client libraries:** `@sanity/client` (React Native / JS), or plain HTTPS for Swift/Kotlin.
- **Fallback:** `https://www.mercyseatchapel.org/assets/data/content.json` holds a snapshot of all published content, refreshed on every update.

## Content types (stable IDs)

Each item has a permanent `_id`. Regular items use readable IDs such as `event-sunday-service` and `ministry-revive`; new ones get generated IDs. Use `_id` as the key in the app, and `_updatedAt` to detect changes.

| Type | Key fields |
|---|---|
| `siteSettings` (single: `_id == "siteSettings"`) | phone, prayerLine, prayerLineDial, email, address, mailingAddress, serviceTimes[], liveVideo (YouTube link), youtubeChannelId, youtubeLiveUrl, social{}, givingUrl, appStoreUrl, playStoreUrl |
| `announcement` | title, summary, body, image, publishDate, expiryDate, relatedEvent→event, buttons[], featured |
| `event` | kind (`oneoff` / `recurring`), title, shortTitle, category, summary, startDate, endDate, timeLines[], recurrence{frequency, weekday, weekOfMonth, month, startsOn, endsOn}, startTime, endTime, timeNote, exceptions[{date, kind, time, endTime, note}], location, attendance, joinUrl, image, featured, archived |
| `sermon` | title, youtube (link), speaker, date, series, category, scripture, description, thumbnail, featured, archived |
| `ministry` / `department` / `outreach` | name, anchor.current, tag, subtitle, body (Portable Text), image, buttons[], order, archived (+ ministry: audience, homeSummary; outreach: frequency, relatedEvents[], featured) |
| `leader` | name, role, photo, message, links[], order |
| `job` | title, status, department, location, employmentType, pay, deadline, summary, responsibilities[], requirements[] |

## Example queries

Upcoming special events:

```groq
*[_type == "event" && kind == "oneoff" && archived != true && coalesce(endDate, startDate) >= $today]
  | order(startDate asc){ _id, title, startDate, endDate, timeLines, location, summary, "image": image.asset->url }
```

Regular schedule:

```groq
*[_type == "event" && kind == "recurring" && archived != true] | order(order asc){ _id, title, recurrence, startTime, endTime, timeNote, exceptions, location }
```

Latest sermons:

```groq
*[_type == "sermon" && archived != true] | order(date desc)[0...20]{ _id, title, speaker, date, youtube, series, "thumb": thumbnail.asset->url }
```

Active announcements:

```groq
*[_type == "announcement" && publishDate <= $today && (!defined(expiryDate) || expiryDate >= $today)] | order(publishDate desc)
```

## Shared logic to reuse

`studio/shared/` contains dependency-free JavaScript that the app can reuse:
- `schedule.js`: next dates of a regular gathering, exceptions, time and label formatting, all in the church's time zone (America/New_York).
- `youtube.js`: turns any YouTube link into a video ID, and builds thumbnail addresses.

## Images

`image.asset->url` gives the original. Add `?w=800&auto=format` for a resized version. Use `hotspot` to keep the focus point when cropping.

## Notes

- Push notifications, accounts and giving inside the app are separate decisions for Project 2.
- Form submissions are not in Sanity and should not be.
