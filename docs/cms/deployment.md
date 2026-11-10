# Setting up and deploying the content dashboard

Do these steps once, in this order. Steps marked **(you)** need the church's own accounts or passwords. Nobody else should do them for you.

## 1. Create the Sanity project (you)

1. Go to <https://www.sanity.io/> and sign up with the church's Google account or email. Use an account the church will keep, not a personal one.
2. At <https://www.sanity.io/manage>, click **Create project**. Name it *Mercy Seat Chapel* and choose the **Free** plan.
3. Create a dataset named **production** with visibility **Public**. "Public" means *published* content can be read without a key, which the website and the future app need. Drafts always stay private.
4. Copy the **Project ID** (8 characters).

## 2. Run the dashboard on your computer

Needs Node.js 22 or newer.

```bash
cd studio
```

```bash
copy .env.example .env
```

Open `studio/.env` and set `SANITY_STUDIO_PROJECT_ID` to the Project ID. Then:

```bash
npm install
```

```bash
npx sanity login
```

```bash
npm run dev
```

Open <http://localhost:3333> and sign in.

## 3. Load the current website content

This creates the starting records from the pages as they are today: settings, hero slides, events, sermons, ministries, departments, outreach, leaders and jobs. Pictures are uploaded once each.

```bash
npm run seed
```

```bash
npm run seed:import
```

`seed:import` uses `--missing`, so running it again never overwrites edits made in the dashboard.

The **About page** entry (Vision, Growth Pillars, Journey, membership call to action) was added later and has its own starting file. Load it once with:

```bash
npm run seed:about
```

It also uses `--missing`: it only creates the About page entry if there isn't one yet.

## 4. Publish the dashboard online

```bash
npm run deploy
```

The dashboard is then at **https://mercyseatchapel.sanity.studio** (the name comes from `SANITY_STUDIO_HOST` in `.env`). `https://www.mercyseatchapel.org/admin/` redirects there.

## 5. Connect GitHub (you)

In the repository on GitHub:

1. **Settings → Secrets and variables → Actions → Variables → New variable:** `SANITY_PROJECT_ID` = your Project ID.
2. **Settings → Actions → General → Workflow permissions:** choose **Read and write permissions**, so the Action can save updated pages.
3. Test it: **Actions → Update website from dashboard → Run workflow.** It should finish green and commit "Website update from the content dashboard" if anything changed.

Without the next step, updates still arrive within 30 minutes through the scheduled run.

### Instant updates on publish (recommended, you)

1. On GitHub, open **your profile → Settings → Developer settings → Fine-grained tokens → Generate new token**:
   - Repository access: only `akorsoftdesigns/Mercy-Seat-Chapel`
   - Permissions: **Contents: Read and write**
   - Expiry: 1 year (set a reminder to renew it)
2. In Sanity, open **sanity.io/manage → project → API → Webhooks → Create webhook**:
   - URL: `https://api.github.com/repos/akorsoftdesigns/Mercy-Seat-Chapel/dispatches`
   - Dataset: `production`
   - Trigger on: Create, Update, Delete
   - Filter: `_type in ["siteSettings","homepage","announcement","event","sermon","ministry","department","outreach","leader","job"]`
   - Projection: `{"event_type": "sanity-publish"}`
   - HTTP method: POST
   - HTTP headers: `Authorization` = `Bearer <the token>`, and `Accept` = `application/vnd.github+json`
   - Leave "Drafts" off, so only *published* changes trigger an update.

The token lives only in Sanity's webhook settings. It is never in the website or the repository.

## 6. Production on SiteGround (you)

1. On your computer, create a key with no passphrase, used only for this:

   ```bash
   ssh-keygen -t ed25519 -N "" -C "github-deploy" -f msc-deploy
   ```

2. In SiteGround **Site Tools → Devs → SSH Keys Manager → Import**, paste the contents of `msc-deploy.pub`. Note the **hostname, username and port** shown under *SSH Credentials* (the port is usually 18765).
3. In GitHub **Settings → Secrets and variables → Actions → Secrets**, add:
   - `SITEGROUND_HOST`, `SITEGROUND_USER`, `SITEGROUND_PORT`
   - `SITEGROUND_SSH_KEY`: the full contents of the private file `msc-deploy`
   - `SITEGROUND_PATH`: the site folder, e.g. `www/mercyseatchapel.org/public_html/`
4. Run the workflow by hand once. It uploads the website files only, skipping `studio/`, `scripts/`, `docs/`, `.github/` and notes. It never deletes files on the server.
5. Delete the local `msc-deploy` files once they are saved in GitHub.

**Domain:** point `www.mercyseatchapel.org` at SiteGround in its DNS settings, as for any SiteGround site. The dashboard address doesn't change. When the domain is live, set `SANITY_STUDIO_SITE_URL=https://www.mercyseatchapel.org/` in `studio/.env` and run `npm run deploy` again, so Preview loads the production styles.

## Staging and branches

- GitHub Pages serves the `main` branch. The dashboard work is on the `cms-dashboard` branch until it is reviewed and merged.
- The Action commits to `main` and runs only from `main` (scheduled runs always use the default branch).
- To try changes without publishing, run the build locally (see below) and preview with `node .claude/serve.js . 5527`.

## Running the build by hand

```bash
set SANITY_PROJECT_ID=xxxxxxxx
```

```bash
node scripts/cms-build.mjs
```

Options:
- `--dry-run`: list what would change without writing anything.
- `--no-youtube`: skip the video lists.
- `--data studio/seed/seed.json`: build from a file instead of Sanity (offline test).

## Pictures

- Upload pictures in the dashboard. Sanity stores the original, and the build saves a web-sized WebP copy (max 1600px) in `assets/cms/`.
- A picture that is already in `assets/images` (same file) is reused from there, not copied.
- Sanity refuses to delete a picture that is still used. Unused pictures can be removed under each image field's **Select → Browse**.

## Backups and recovery

- **Published content:** every update commits `assets/data/content.json` and the pages to Git, so any earlier version can be found in GitHub's history.
- **Dashboard history:** each item's **⋯ → History** shows changes. On the free plan, draft history is kept for 3 days.
- **Full export** (all content and pictures):

  ```bash
  cd studio
  ```

  ```bash
  npx sanity dataset export production backup.tar.gz
  ```

## Troubleshooting

| Problem | What to check |
|---|---|
| Published but the website didn't change | GitHub → Actions: did *Update website from dashboard* run and pass? If no run started, check the webhook (Sanity → API → Webhooks → attempts log) and the token's expiry. The 30-minute run catches up anyway. |
| Action failed at "Write published content" | Open the log. "SANITY_PROJECT_ID is not set" means step 5.1 is missing. The pages are left unchanged on any error. |
| Action failed at "Save the updated pages" | Workflow permissions (step 5.2). |
| SiteGround upload failed | Check the secrets, that the key was imported and authorized in SSH Keys Manager, and that the port is right. |
| Video lists not updating | YouTube's public feed sometimes returns errors for hours. Lists stay as they were and refresh on a later run. |
| Dashboard says "project not found" | `SANITY_STUDIO_PROJECT_ID` in `studio/.env`, then `npm run deploy` again. |
| Someone can't sign in | They need an invitation (see the admin guide) and must sign in with the same email or Google account. |
