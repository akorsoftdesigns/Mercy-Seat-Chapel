/* Schedule helpers shared by the dashboard and the website build.
   All dates are calendar dates ("YYYY-MM-DD") in the church's time zone,
   so a Sunday service is always a Sunday, wherever the build runs. */

export const TIME_ZONE = "America/New_York";
export const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ORDINAL = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", "-1": "Last" };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Today's date in the church's time zone, as "YYYY-MM-DD". */
export function todayInChurchTz(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

// Date-only arithmetic in UTC so daylight-saving changes can't shift a day
const toDate = (ymd) => new Date(ymd + "T00:00:00Z");
const toYmd = (d) => d.toISOString().slice(0, 10);
export const addDays = (ymd, n) => { const d = toDate(ymd); d.setUTCDate(d.getUTCDate() + n); return toYmd(d); };

/** "7:30 PM" → minutes after midnight, or null. */
export function parseTime(t) {
  const m = String(t || "").trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?$/i);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === "p") h += 12;
  return h * 60 + Number(m[2] || 0);
}

/** Sanity validation: empty, or a time like "7:30 PM". */
export const timeRule = (Rule) => Rule.custom((v) => !v || parseTime(v) !== null ? true : "Write the time like 10:00 AM or 7:30 PM.");

/** Normalises "7:30pm" to "7:30 PM". */
export function formatTime(t) {
  const mins = parseTime(t);
  if (mins === null) return String(t || "");
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** Time range text. compact: "12–1 PM" (cards); normal: "12:00 – 1:00 PM" (lists). */
export function formatTimeRange(start, end, { compact = false } = {}) {
  if (!start) return "";
  const a = formatTime(start);
  if (!end) return a;
  const b = formatTime(end);
  const [aT, aP] = a.split(" "), [bT, bP] = b.split(" ");
  if (compact) {
    const trim = (x) => x.replace(/:00$/, "");
    return aP === bP ? `${trim(aT)}–${trim(bT)} ${bP}` : `${trim(aT)} ${aP}–${trim(bT)} ${bP}`;
  }
  return aP === bP ? `${aT} – ${bT} ${bP}` : `${a} – ${b}`;
}

/** Label for schedule cards, e.g. "Every Sunday", "1st Tuesday · Monthly". */
export function scheduleLabel(r = {}) {
  const day = r.weekday ? cap(r.weekday) : "";
  switch (r.frequency) {
    case "weekly": return day ? `Every ${day}` : "Weekly";
    case "monthly": return day && r.weekOfMonth ? `${ORDINAL[r.weekOfMonth]} ${day} · Monthly` : "Monthly";
    case "yearly": return r.month ? MONTHS[r.month - 1] : "Annual";
    default: return "Monthly";
  }
}

/** Two-line calendar badge for the Events list, e.g. ["Sun","Weekly"], ["1st","Tue"]. */
export function scheduleBadge(r = {}) {
  const short = r.weekday ? cap(r.weekday).slice(0, 3) : "";
  if (r.frequency === "weekly") return [short || "1×", "Weekly"];
  if (r.frequency === "monthly" && r.weekday && r.weekOfMonth) return [ORDINAL[r.weekOfMonth], short];
  if (r.frequency === "yearly") return [r.month ? MONTHS[r.month - 1].slice(0, 3) : "1×", "Yearly"];
  return ["1×", "Month"];
}

// Does this date match the recurrence rule?
function matches(r, ymd) {
  const d = toDate(ymd);
  if (r.startsOn && ymd < r.startsOn) return false;
  if (r.endsOn && ymd > r.endsOn) return false;
  const wd = WEEKDAYS[d.getUTCDay()];
  if (r.frequency === "weekly") return wd === r.weekday;
  if (r.frequency === "monthly") {
    if (wd !== r.weekday || !r.weekOfMonth) return false;
    const dom = d.getUTCDate();
    if (Number(r.weekOfMonth) === -1) return toDate(addDays(ymd, 7)).getUTCMonth() !== d.getUTCMonth();
    return Math.ceil(dom / 7) === Number(r.weekOfMonth);
  }
  return false; // yearly / irregular: no fixed day to compute
}

/** Regular dates of the rule between from and from+days (exceptions applied). */
export function occurrences(r, exceptions = [], from = todayInChurchTz(), days = 60) {
  const out = [];
  for (let i = 0; i <= days; i++) {
    const ymd = addDays(from, i);
    if (matches(r, ymd)) out.push({ date: ymd });
  }
  // Special one-off dates are added; cancellations and changes are marked on the normal date
  for (const x of exceptions || []) {
    if (!x.date || x.date < from || x.date > addDays(from, days)) continue;
    const hit = out.find((o) => o.date === x.date);
    if (hit) Object.assign(hit, { exception: x });
    else if (x.kind === "special") out.push({ date: x.date, exception: x });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** "Sunday, Nov 9" */
export function formatDay(ymd, { weekday = "long", month = "short" } = {}) {
  return toDate(ymd).toLocaleDateString("en-US", { weekday, month, day: "numeric", timeZone: "UTC" });
}

/** Short date range, e.g. "Mon, Oct 26 – Sun, Nov 8" or "Friday, October 30". */
export function formatDateRange(start, end) {
  if (!start) return "";
  if (!end || end === start) return formatDay(start, { weekday: "long", month: "long" });
  return `${formatDay(start, { weekday: "short" })} – ${formatDay(end, { weekday: "short" })}`;
}

/** Notes about upcoming cancellations / changes (next `days` days), for display. */
export function upcomingChanges(r, exceptions, from, days = 21) {
  return occurrences(r, exceptions, from, days).filter((o) => o.exception).map(({ date, exception: x }) => {
    const day = formatDay(date);
    if (x.kind === "cancelled") return `Cancelled on ${day}${x.note ? ` (${x.note})` : ""}`;
    if (x.kind === "changed") return `${day}: ${x.time ? formatTimeRange(x.time, x.endTime) : "time changed"}${x.note ? ` · ${x.note}` : ""}`;
    return `Special date ${day}${x.time ? ` at ${formatTime(x.time)}` : ""}${x.note ? ` · ${x.note}` : ""}`;
  });
}
