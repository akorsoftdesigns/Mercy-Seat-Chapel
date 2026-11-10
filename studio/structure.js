/* The dashboard's left-hand menu, in the order staff use it most. */
import { CogIcon, HomeIcon, InfoOutlineIcon, CalendarIcon, BellIcon, PlayIcon, UsersIcon, CaseIcon, HeartIcon, UserIcon, DocumentTextIcon, ArchiveIcon } from "./icons.js";
import { Preview } from "./components/Preview.jsx";

const PREVIEWABLE = ["event", "announcement", "sermon", "ministry", "department", "outreach", "leader", "job", "homepage", "aboutPage"];

export const defaultDocumentNode = (S, { schemaType }) =>
  PREVIEWABLE.includes(schemaType)
    ? S.document().views([S.view.form().title("Edit"), S.view.component(Preview).title("Preview")])
    : S.document();

const list = (S, type, title, icon, filter, params) => {
  const l = S.documentTypeList(type).title(title);
  return S.listItem().title(title).icon(icon).child(filter ? l.filter(filter).params(params || {}) : l);
};

export const structure = (S) => S.list().title("Content").items([
  S.listItem().title("Homepage").icon(HomeIcon).child(S.document().schemaType("homepage").documentId("homepage").views([S.view.form().title("Edit"), S.view.component(Preview).title("Preview")])),
  S.listItem().title("About page").icon(InfoOutlineIcon).child(S.document().schemaType("aboutPage").documentId("aboutPage").views([S.view.form().title("Edit"), S.view.component(Preview).title("Preview")])),
  S.listItem().title("Site Settings").icon(CogIcon).child(S.document().schemaType("siteSettings").documentId("siteSettings")),
  S.divider(),
  list(S, "announcement", "Announcements", BellIcon),
  S.listItem().title("Events & Programs").icon(CalendarIcon).child(
    S.list().title("Events & Programs").items([
      list(S, "event", "Special events", CalendarIcon, "_type == 'event' && kind == 'oneoff' && archived != true"),
      list(S, "event", "Regular gatherings", CalendarIcon, "_type == 'event' && kind == 'recurring' && archived != true"),
      list(S, "event", "Archived", ArchiveIcon, "_type == 'event' && archived == true")
    ])),
  list(S, "sermon", "Sermons", PlayIcon),
  S.divider(),
  list(S, "ministry", "Ministries", UsersIcon),
  list(S, "department", "Departments", CaseIcon),
  list(S, "outreach", "Outreach", HeartIcon),
  list(S, "leader", "Leadership", UserIcon),
  list(S, "job", "Job Center", DocumentTextIcon)
]);
