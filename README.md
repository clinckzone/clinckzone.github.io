# clinckzone.github.io

Static personal website served by GitHub Pages, with a Notion-backed content pipeline for blog posts and projects.

- **Live site:** https://clinckzone.github.io
- **Hosting:** GitHub Pages (root of `master`)
- **Stack:** Hand-written HTML/CSS/JS for the chrome, Node scripts for content publishing

## How content gets published

```
Notion DB                       blog/, projects/, blog.html, projects.html
   │                                   ▲
   │  downloadFilesFromNotion.js       │
   ▼                                   │
   ├─ pageToMarkdown ──▶  .md  ──▶  marked + template.html  ──▶  .html
   └─ external cover URL         + JSDOM appends a card to listing HTML
```

Each "Complete" Notion page becomes one `.md` file, one `.html` file (rendered via `template.html`), local copies of any embedded images, and a listing card on `blog.html` or `projects.html`.

## Prerequisites

- Node 20+
- A Notion workspace with a database containing the posts
- A Notion internal integration (for the API key)

## Setup

```bash
git clone git@github.com:clinckzone/clinckzone.github.io.git
cd clinckzone.github.io
npm install              # also auto-installs the Husky pre-commit hook
cp .env.example .env     # then fill in the values (see below)
```

Create a `.env` at the repo root with:

```
NOTION_API_KEY=ntn_...
NOTION_DATABASE_ID=...
```

To get these:

1. **`NOTION_API_KEY`** — create an internal integration at https://www.notion.so/profile/integrations and copy the Internal Integration Token.
2. **`NOTION_DATABASE_ID`** — the 32-char hex from your database URL: `https://www.notion.so/<workspace>/<DATABASE_ID>?v=...`
3. **Share the database with the integration**: in Notion, open the DB → `···` menu → Connections → Add connections → pick your integration. Without this, every API call returns `object_not_found`.

## Notion database schema

The publishing script reads the following properties off each page. Names are case-sensitive.

| Property      | Type            | Used for                                            |
| ------------- | --------------- | --------------------------------------------------- |
| `Name`        | Title           | Page title and (sanitized) output filename          |
| `Status`      | Select          | Gating — only `Complete` pages are published        |
| `Category`    | Select          | Output folder + listing target (e.g. `blog`, `projects`) |
| `Tags`        | Multi-select    | Rendered as tag chips on the listing card           |
| `Description` | Text (rich_text)| Card subtitle/description                           |
| `Created`     | Created time    | Date on the listing card                            |
| _Page cover_  | External URL or upload | Either works. The script downloads the cover to `images/` immediately, so Notion-uploaded covers (with short-lived signed URLs) are fine too. |

Categories `blog` and `projects` are the only ones with existing listing pages (`blog.html`, `projects.html`). Adding a new category means hand-creating a listing HTML for it.

## Publishing a new post

1. Write the post in your Notion database.
2. Fill in all required properties (above). Mark `Status = Complete`.
3. Locally:

   ```bash
   npm run pull-and-build
   ```

4. Review changes with `git status` / `git diff` — you should see new files in the target category folder, new images in `images/`, and a new card on the listing HTML.
5. Commit and push. GitHub Pages rebuilds on push.

The `Publish from Notion` GitHub Actions workflow does steps 3–5 for you every day, and on demand from the Actions tab.

## Updating a published post

Edit the page in Notion. On the next run, the script compares the page's Notion last-edited time with the time its `.md` file was last committed, and rebuilds the post if the Notion page is newer. Unchanged posts are skipped, so their files aren't touched.

Each card stores its Notion page ID (`data-notion-id`), so the script can find a post even after it changes:

- **Renamed** — the post moves to its new URL, its card is updated in place, and the old `.md`, `.html` and images are deleted.
- **Category changed** — the card moves to the other listing and the old files are deleted.

This needs the full git history: in a shallow clone every file looks like it was committed in the latest commit. The workflow checks out with `fetch-depth: 0`; locally, run it from a normal (non-shallow) clone.

To force a rebuild of a post without editing it in Notion, delete its `.md` file and re-run.

## Tooling

A pre-commit hook runs on every `git commit`. It only processes staged files — fast even on a full repo.

| Tool | Where | When |
|---|---|---|
| Prettier | All `.html`, `.css`, `.json`, `.js` files | pre-commit, on staged files (writes formatted version back to the index) |
| ESLint | `scripts/**/*.js`, `js/**/*.js` | pre-commit, on staged `.js` files (auto-fixes what it can; aborts commit on unfixable errors) |
| Husky | — | Installs the hook automatically on `npm install` |
| lint-staged | — | Glues Husky to Prettier/ESLint, scoped to staged files |

Run them manually any time:

```bash
npx prettier --check .         # report violations
npx prettier --write .         # fix in place
npx eslint scripts/ js/        # lint
npx eslint scripts/ js/ --fix  # auto-fix
```
