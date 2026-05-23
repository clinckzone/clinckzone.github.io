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
| _Page cover_  | External URL    | Must be an external URL (Notion-hosted covers will throw — the script reads `page.cover.external.url`) |

Categories `blog` and `projects` are the only ones with existing listing pages (`blog.html`, `projects.html`). Adding a new category means hand-creating a listing HTML for it.

## Publishing a new post

1. Write the post in your Notion database.
2. Fill in all required properties (above). Mark `Status = Complete`.
3. Locally:

   ```bash
   node scripts/downloadFilesFromNotion.js
   ```

4. Review changes with `git status` / `git diff` — you should see new files in the target category folder, new images in `images/`, and an appended card on the listing HTML.
5. Commit and push. GitHub Pages rebuilds on push.

The script is **idempotent** — re-running it skips any page whose card is already on the listing. Safe to rerun whenever Notion has new content.

## Re-publishing an existing post

The skip-if-already-listed check uses the listing card as the source of truth. To force a re-publish (e.g., to pick up edits you made in Notion):

1. Open the relevant listing page (`blog.html` or `projects.html`).
2. Delete the `<a>...</a>` card for the post you want to re-publish.
3. Optionally also delete the generated `.html`, `.md`, and `images/<category>-<slug>-*.png` files. Otherwise they'll be overwritten in place.
4. Re-run `node scripts/downloadFilesFromNotion.js`.

## Scripts

All scripts live in `scripts/` and run from the repo root.

### `scripts/downloadFilesFromNotion.js`

The main publishing pipeline. Reads from the Notion database (filtered to `Status = Complete`), generates `.md` + `.html` per page, downloads embedded images, and appends listing cards.

```bash
node scripts/downloadFilesFromNotion.js
```

### `scripts/bulkConvertFiles.js`

One-off utility to bulk-convert files between Markdown and HTML in a directory. Useful for regenerating per-post HTMLs after editing `template.html`.

```bash
# Regenerate every .html from its .md sibling
node scripts/bulkConvertFiles.js ../blog html
node scripts/bulkConvertFiles.js ../projects html

# Reverse direction: regenerate .md from .html (rarely used)
node scripts/bulkConvertFiles.js ../blog md
```

The path arg is resolved relative to `scripts/` (because the script uses `path.resolve(__dirname, …)` internally), hence the `../`.

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
