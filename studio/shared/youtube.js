/* YouTube helpers shared by the dashboard (validation) and the website build.
   Accepts any normal YouTube link and returns the 11-character video ID. */

const ID = /^[\w-]{11}$/;

/** Returns the video ID from a YouTube link (or a bare ID), or "" if none is found. */
export function youtubeId(input) {
  const s = String(input || "").trim();
  if (!s) return "";
  if (ID.test(s)) return s;
  let url;
  try { url = new URL(s.startsWith("http") ? s : "https://" + s); } catch { return ""; }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id = "";
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "studio.youtube.com") {
    id = url.searchParams.get("v") || "";
    if (!id) {
      const m = url.pathname.match(/^\/(?:embed|live|shorts|v|video)\/([\w-]{11})/);
      if (m) id = m[1];
    }
  }
  return ID.test(id) ? id : "";
}

/** Sanity validation rule: the field must be empty or a recognisable YouTube link. */
export function youtubeRule(Rule, { required = false } = {}) {
  return Rule.custom((value) => {
    if (!value) return required ? "Paste the YouTube link." : true;
    return youtubeId(value) ? true : "This doesn't look like a YouTube video link. Copy the link from the video's Share button.";
  });
}

export const ytThumb = (id, size = "hqdefault") => `https://i.ytimg.com/vi/${id}/${size}.jpg`;

/** "1:02:30", "59:26" or "3566" → seconds. Returns 0 for empty/invalid. */
export function toSeconds(v) {
  const s = String(v ?? "").trim();
  if (!s) return 0;
  if (/^\d+$/.test(s)) return Number(s);
  const parts = s.split(":").map(Number);
  if (parts.some((n) => isNaN(n))) return 0;
  return parts.reduce((t, n) => t * 60 + n, 0);
}
