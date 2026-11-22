/* Live watcher: switches Watch Live to the stream within about a minute of going live.
   GitHub's scheduled website updates often run 10–40 minutes late, so on service days
   .github/workflows/live-watch.yml starts this script well before the service. It asks YouTube
   every CHECK_SECONDS whether the channel is live, from the start of a watch window until the
   end of it. As soon as it is, it starts the normal website update ("Update website from
   dashboard"), which puts the stream in the Watch Live player, and stops.

   Watch windows (Eastern time; change them here if service times change):
     Sunday 9:30–11:00 AM (service 10:00 AM), Tuesday 7:00–8:30 PM (Bible Study 7:30 PM).
   Cost: 2 of the 10,000 free daily YouTube quota units per check (about 240 per window).
   Needs YOUTUBE_API_KEY (GitHub secret; never printed or written anywhere). Prints:
   "live=<videoId>" when it finds the stream, or "live=" when the window ends without one.
   Test the clock without waiting or calling YouTube: node scripts/live-watch.mjs --dry-run */
import { readFile } from "node:fs/promises";
import { TIME_ZONE } from "../studio/shared/schedule.js";

const WINDOWS = [
  { day: 0, from: "09:30", to: "11:00" }, // Sunday Service
  { day: 2, from: "19:00", to: "20:30" }  // Tuesday Bible Study
];
const CHECK_SECONDS = 45;
const EARLY_MINUTES = 120; // started up to this long before a window: wait for it; earlier: stop

const dry = process.argv.includes("--dry-run");
const key = process.env.YOUTUBE_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Minutes since midnight and weekday, in the church's time zone
function churchClock(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday), minutes: +p.hour * 60 + +p.minute };
}
const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

// The window that is open now or starts within EARLY_MINUTES (null if none)
function windowNow(clock) {
  for (const w of WINDOWS) {
    if (w.day !== clock.day) continue;
    const from = toMin(w.from), to = toMin(w.to);
    if (clock.minutes >= from - EARLY_MINUTES && clock.minutes < to) return { ...w, waitMin: Math.max(0, from - clock.minutes), leftMin: to - clock.minutes };
  }
  return null;
}

// The channel's live broadcast right now, if any (same check as the website update)
async function liveNow(channel) {
  const api = async (endpoint, params) => {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${new URLSearchParams({ ...params, key })}`).catch(() => null);
    if (!res?.ok) throw new Error(`YouTube API ${endpoint} answered ${res ? res.status : "nothing"}`); // (message never includes the key)
    return res.json();
  };
  const list = await api("playlistItems", { part: "contentDetails", playlistId: "UULV" + channel.slice(2), maxResults: "3" });
  const ids = (list.items || []).map((i) => i.contentDetails?.videoId).filter(Boolean);
  if (!ids.length) return "";
  const { items = [] } = await api("videos", { part: "snippet", id: ids.join(",") });
  return items.find((v) => v.snippet?.liveBroadcastContent === "live")?.id || "";
}

async function main() {
  const w = windowNow(churchClock());
  if (dry) { console.log("church clock:", churchClock(), "window:", w); return; }
  if (!w) { console.log("No service window now or soon; nothing to watch."); return console.log("live="); }
  if (!key) { console.log("YOUTUBE_API_KEY is not set; cannot watch."); return console.log("live="); }
  const js = await readFile(new URL("../assets/js/main.js", import.meta.url), "utf8");
  const channel = js.match(/youtubeChannelId:\s*"(UC[\w-]{22})"/)?.[1];
  if (!channel) { console.log("Channel ID not found in main.js."); return console.log("live="); }
  const current = JSON.parse(await readFile(new URL("../assets/data/youtube-live.json", import.meta.url), "utf8").catch(() => "{}"));

  if (w.waitMin) { console.log(`Window opens in ${w.waitMin} min; waiting.`); await sleep(w.waitMin * 60e3); }
  const left = windowNow(churchClock())?.leftMin || 0;
  const end = Date.now() + left * 60e3;
  while (Date.now() < end) {
    try {
      const id = await liveNow(channel);
      if (id && current.status === "live" && current.liveVideoId === id) {
        console.log("Watch Live already shows this stream; nothing to do.");
        return console.log("live=");
      }
      if (id) return console.log(`live=${id}`);
    } catch (e) { console.warn("Check failed, trying again:", e.message); }
    await sleep(CHECK_SECONDS * 1000);
  }
  console.log("Window ended without a live stream.");
  console.log("live=");
}
main().catch((e) => { console.error("Live watcher stopped:", e.message); console.log("live="); });
