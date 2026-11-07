/* Dashboard home: welcome, quick actions, drafts waiting for review,
   recent changes and upcoming events. Read-only: it only links to editing screens. */
import { useEffect, useState, useCallback } from "react";
import { definePlugin, useClient, useCurrentUser } from "sanity";
import { IntentLink } from "sanity/router";
import { Box, Button, Card, Container, Flex, Grid, Heading, Stack, Text, Badge, Spinner } from "@sanity/ui";
import { DashboardIcon, AddIcon, EditIcon, CalendarIcon, PlayIcon, BellIcon, HomeIcon, CogIcon, LaunchIcon } from "../icons.js";
import { todayInChurchTz, formatDateRange } from "../shared/schedule.js";
import { canPublish } from "../access.js";

const TYPES = ["siteSettings", "homepage", "announcement", "event", "sermon", "ministry", "department", "outreach", "leader", "job"];
const NAMES = { siteSettings: "Site Settings", homepage: "Homepage", announcement: "Announcement", event: "Event", sermon: "Sermon", ministry: "Ministry",
  department: "Department", outreach: "Outreach", leader: "Leader", job: "Job opening" };
const SITE_URL = import.meta.env.SANITY_STUDIO_SITE_URL || "https://akorsoftdesigns.github.io/Mercy-Seat-Chapel/";

const QUERY = `{
  "drafts": *[_id in path("drafts.**") && _type in $types] | order(_updatedAt desc)[0...10]{_id, _type, _updatedAt, "label": coalesce(title, name)},
  "recent": *[!(_id in path("drafts.**")) && _type in $types] | order(_updatedAt desc)[0...8]{_id, _type, _updatedAt, "label": coalesce(title, name)},
  "upcoming": *[_type == "event" && kind == "oneoff" && archived != true && !(_id in path("drafts.**")) && coalesce(endDate, startDate) >= $today] | order(startDate asc)[0...6]{_id, title, startDate, endDate, featured},
  "regular": count(*[_type == "event" && kind == "recurring" && archived != true && !(_id in path("drafts.**"))])
}`;

const when = (iso) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const docId = (id) => id.replace(/^drafts\./, "");

function Action({ icon, text, intent, params }) {
  return (
    <Button as={IntentLink} intent={intent} params={params} icon={icon} text={text} mode="ghost" tone="primary" padding={4} style={{ textDecoration: "none" }} />
  );
}

function DocList({ items, empty }) {
  if (!items?.length) return <Text size={1} muted>{empty}</Text>;
  return (
    <Stack space={2}>
      {items.map((d) => (
        <Card key={d._id} as={IntentLink} intent="edit" params={{ id: docId(d._id), type: d._type }} padding={3} radius={2} tone="default" border style={{ textDecoration: "none" }}>
          <Flex align="center" gap={3}>
            <Box flex={1}><Text size={1} weight="medium" textOverflow="ellipsis">{d.label || NAMES[d._type]}</Text></Box>
            <Badge tone="primary" fontSize={0}>{NAMES[d._type]}</Badge>
            <Text size={0} muted>{when(d._updatedAt)}</Text>
          </Flex>
        </Card>
      ))}
    </Stack>
  );
}

function Panel({ title, children }) {
  return (
    <Card padding={4} radius={3} shadow={1}>
      <Stack space={4}><Heading size={1} as="h2">{title}</Heading>{children}</Stack>
    </Card>
  );
}

function DashboardHome() {
  const client = useClient({ apiVersion: "2025-02-19" });
  const user = useCurrentUser();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setError("");
    client.fetch(QUERY, { types: TYPES, today: todayInChurchTz() }, { perspective: "raw" })
      .then(setData)
      .catch((e) => { console.error(e); setError("Couldn't load the overview. Check your connection and press Refresh."); });
  }, [client]);
  useEffect(load, [load]);

  const first = (user?.name || "").split(" ")[0];
  const publisher = canPublish(user);

  return (
    <Box padding={[3, 4, 5]} style={{ overflow: "auto", height: "100%" }}>
      <Container width={3}>
        <Stack space={5}>
          <Card padding={[4, 5]} radius={3} tone="primary" style={{ background: "#1B3068", color: "#fff" }}>
            <Stack space={4}>
              <Text size={1} style={{ color: "#FF9EAC", letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 600 }}>Mercy Seat Chapel dashboard</Text>
              <Heading size={[3, 4]} as="h1" style={{ color: "#fff" }}>Welcome{first ? `, ${first}` : ""}</Heading>
              <Text size={2} style={{ color: "rgba(255,255,255,.85)" }}>
                {publisher
                  ? "Edit content, then press Publish. The website updates by itself within a few minutes."
                  : "Edit content and your changes are saved as a draft. A publisher will review and publish them."}
              </Text>
              <Flex gap={3} wrap="wrap">
                <Button as="a" href={SITE_URL} target="_blank" rel="noopener" icon={LaunchIcon} text="View the website" tone="critical" />
                <Button text="Refresh" mode="ghost" onClick={load} style={{ color: "#fff" }} />
              </Flex>
            </Stack>
          </Card>

          <Panel title="Quick actions">
            <Grid columns={[1, 2, 3]} gap={3}>
              <Action icon={PlayIcon} text="Add a sermon" intent="create" params={{ type: "sermon" }} />
              <Action icon={CalendarIcon} text="Create an event" intent="create" params={{ type: "event" }} />
              <Action icon={BellIcon} text="Post an announcement" intent="create" params={{ type: "announcement" }} />
              <Action icon={HomeIcon} text="Edit the homepage" intent="edit" params={{ id: "homepage", type: "homepage" }} />
              <Action icon={CogIcon} text="Update service times & live link" intent="edit" params={{ id: "siteSettings", type: "siteSettings" }} />
              <Action icon={AddIcon} text="Add a job opening" intent="create" params={{ type: "job" }} />
            </Grid>
            <Text size={1} muted>To upload a picture, open the item it belongs to and use its image field. “Select” shows every picture already uploaded, so pictures can be reused.</Text>
          </Panel>

          {error && <Card padding={4} radius={3} tone="critical"><Text>{error}</Text></Card>}
          {!data && !error && <Flex justify="center" padding={5}><Spinner muted /></Flex>}
          {data && (
            <Grid columns={[1, 1, 2]} gap={4}>
              <Panel title={`Drafts waiting to be published (${data.drafts.length})`}>
                <DocList items={data.drafts} empty="Nothing waiting. All changes are published." />
              </Panel>
              <Panel title="Upcoming special events">
                <DocList items={data.upcoming.map((e) => ({ ...e, _type: "event", _updatedAt: e.startDate + "T12:00:00", label: `${e.title} · ${formatDateRange(e.startDate, e.endDate)}${e.featured ? "" : " (not in slider)"}` }))}
                  empty="No special events coming up." />
                <Text size={1} muted>{data.regular} regular gatherings are on the schedule.</Text>
              </Panel>
              <Panel title="Recently published">
                <DocList items={data.recent} empty="Nothing published yet." />
              </Panel>
              <Panel title="Need help?">
                <Stack space={3}>
                  <Text size={1}><EditIcon /> Fields with a red message must be fixed before publishing.</Text>
                  <Text size={1}>The <b>Preview</b> tab shows how an item will look with the website's styles before you publish.</Text>
                  <Text size={1}>Unpublishing removes an item from the website but keeps it here. Every change is kept in the item's history (⋯ menu → History).</Text>
                  <Text size={1}>Form submissions, prayer requests and donations are not managed here.</Text>
                </Stack>
              </Panel>
            </Grid>
          )}
        </Stack>
      </Container>
    </Box>
  );
}

export const dashboardTool = definePlugin({
  name: "msc-dashboard",
  tools: [{ name: "dashboard", title: "Dashboard", icon: DashboardIcon, component: DashboardHome }]
});
