# bettermarkdown — Implementation Plan

A fast, disk-first markdown editor for macOS, Windows, and (best-effort) Linux.
The defining feature is **Obsidian-style live preview**: the document is always
plain markdown, but syntax renders as formatted output the moment the cursor is
no longer touching it. Type `# Hi` and press space/move on — "Hi" is now
visually an H1. Move the cursor back onto it — the raw `# Hi` reappears.

## Locked decisions (do not revisit)

1. **Editor engine: CodeMirror 6** with a custom live-preview decoration layer.
   Not Milkdown, not ProseMirror, not Monaco, not a textarea + preview pane.
2. **Storage: plain files on the user's disk.** No SQLite. No database of any
   kind. No vault index. The user opens a file, edits it, saves it. Settings
   live in a JSON file via `tauri-plugin-store`.
3. **The document is always markdown text.** Live preview is purely visual
   (decorations). Serialization must never pass through an AST round-trip.
4. **Tauri 2 + React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui.**
5. **CI on GitHub Actions from day one**, building macOS, Windows, and Linux.

## Tech stack (exact)

Use latest stable versions of everything at implementation time.

**Frontend**
- `react`, `react-dom`, `typescript`, `vite`, `@vitejs/plugin-react`
- `tailwindcss` v4 via `@tailwindcss/vite` (no tailwind.config.js; use CSS `@theme`)
- shadcn/ui (init with the CLI) — used for: dialogs, dropdown/context menus,
  settings UI, command palette (`cmdk`), tooltips
- `zustand` for app state (open file, dirty flag, settings, recent files)
- CodeMirror: `@codemirror/state`, `@codemirror/view`, `@codemirror/language`,
  `@codemirror/commands`, `@codemirror/search`, `@codemirror/lang-markdown`,
  `@lezer/markdown` (for the GFM extension: `markdown({ base: markdownLanguage, extensions: [GFM] })` —
  note `markdownLanguage` from `@codemirror/lang-markdown` already includes GFM;
  verify tables/strikethrough/task lists parse and add extensions only if missing)
- `@tauri-apps/api` plus JS bindings for each Tauri plugin used

**Rust (src-tauri)**
- `tauri` v2, `serde`, `serde_json`
- Plugins: `tauri-plugin-dialog`, `tauri-plugin-fs`, `tauri-plugin-store`,
  `tauri-plugin-window-state`, `tauri-plugin-single-instance`,
  `tauri-plugin-opener` (open links in browser), `tauri-plugin-updater` (M4 only)
- `notify` + `notify-debouncer-full` for the file watcher
- `tempfile` for atomic writes

## Repository layout

```
bettermarkdown/
├── PLAN.md
├── package.json
├── vite.config.ts
├── index.html
├── src/                        # React frontend
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/             # shadcn-based UI (TitleBar, StatusBar, dialogs…)
│   ├── editor/
│   │   ├── Editor.tsx          # React wrapper mounting the CM6 EditorView
│   │   ├── extensions.ts       # assembled Extension[] for the editor
│   │   ├── theme.ts            # CM theme(s), light + dark
│   │   └── livePreview/
│   │       ├── index.ts        # exports livePreview(): Extension
│   │       ├── decorate.ts     # syntax-tree walk → RangeSet<Decoration>
│   │       ├── reveal.ts       # cursor/selection ↔ node intersection logic
│   │       └── widgets/        # WidgetType subclasses: checkbox, hr, image…
│   ├── store/                  # zustand stores (file, settings)
│   ├── lib/
│   │   ├── files.ts            # invoke() wrappers for Rust commands
│   │   └── shortcuts.ts
│   └── styles/globals.css
├── src-tauri/
│   ├── tauri.conf.json
│   ├── capabilities/default.json
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── commands/fs.rs      # read_file, save_file (atomic), file metadata
│   │   └── watcher.rs          # notify-based watcher, emits "file-changed"
│   └── icons/
└── .github/workflows/
    ├── ci.yml                  # lint + typecheck + build, all 3 OSes, on PR/push
    └── release.yml             # tauri-action release on tag push v*
```

---

## M0 — Scaffold

- `npm create tauri-app@latest` (React + TypeScript + Vite template), app
  identifier `com.bettermarkdown.app`, product name `bettermarkdown`.
- Add Tailwind v4 (`@tailwindcss/vite` plugin + `@import "tailwindcss"` in
  globals.css), run `npx shadcn@latest init`.
- ESLint + Prettier for TS; `cargo fmt` + `cargo clippy -D warnings` for Rust.
- `ci.yml`: matrix `[macos-latest, windows-latest, ubuntu-22.04]`. Ubuntu needs
  system deps before `tauri build`:
  `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf build-essential libssl-dev`.
  Steps: checkout → setup node + rust (with `swatinem/rust-cache`) → npm ci →
  `npm run lint && tsc --noEmit` → `cargo clippy` → `tauri build` (debug
  bundle is fine on CI; skip signing here).

**Done when:** `npm run tauri dev` opens a window rendering a Tailwind-styled
placeholder, and CI is green on all three OSes.

## M1 — File loop (trustworthy plain editor)

Rust commands (all `#[tauri::command]`, async where they do I/O):
- `read_file(path: String) -> Result<String, String>` — read as UTF-8; reject
  non-UTF-8 with a clear error (surface it in a toast).
- `save_file(path: String, contents: String) -> Result<(), String>` —
  **atomic**: write to a `tempfile::NamedTempFile` in the same directory,
  fsync, then `persist()` (rename) over the target. Never truncate-then-write.
- `watch_file(path) / unwatch_file(path)` — `notify` with a ~500ms debouncer;
  on modification emit `file-changed { path }` to the window. Suppress the
  event for our own saves (set a "just-saved" flag with the file's new mtime,
  ignore one event that matches it).

Frontend behavior:
- **Open** (⌘O / Ctrl+O): native dialog filtered to `md,markdown,txt`. Load
  into a fresh CM6 state (plain `markdown()` language + syntax highlighting for
  now — live preview comes in M2). Start watching the file.
- **Save** (⌘S), **Save As** (⇧⌘S), **New** (⌘N — untitled buffer, Save As on
  first save).
- **Dirty tracking**: compare against last-saved doc via CM's update listener;
  show `●` in the title bar (`getCurrentWindow().setTitle(...)` →
  `● notes.md — bettermarkdown`).
- **Close guard**: `onCloseRequested` → if dirty, `event.preventDefault()` and
  show a Save / Don't Save / Cancel dialog.
- **External change** (`file-changed` event): if buffer is clean, reload
  silently; if dirty, show a "File changed on disk — Reload / Keep mine" bar.
- **Open with…**: handle files passed as CLI args and via the
  single-instance plugin callback, so double-clicking a second file focuses the
  existing window and opens the file. Also accept OS drag-drop onto the window
  (`onDragDropEvent`).
- **Recent files**: last 10 paths in the settings store; listed on the empty
  state screen and in a menu.
- **Autosave**: settings toggle, default off, 2s debounce after last edit.

Capabilities: scope `fs`/`dialog` permissions appropriately; the custom
`read_file`/`save_file` commands take absolute paths from the dialog plugin,
so keep the fs plugin scope minimal.

**Done when:** you can live in it for plain-text markdown all day and never
lose a byte: open, edit, save, quit-with-guard, external-edit reload all work.

## M2 — Live preview (the product)

### Architecture

One CM6 extension, `livePreview()`, combining:

1. **A `ViewPlugin`** that computes a `DecorationSet` for the *visible ranges*
   only (`view.visibleRanges`), recomputing on `docChanged`, `viewportChanged`,
   and `selectionSet`. It walks the Lezer syntax tree
   (`syntaxTree(state).iterate({ from, to, enter })`) and emits decorations.
2. **The reveal rule** (`reveal.ts`): a node's syntax markers are hidden *only
   if* no selection range touches the node's full extent. "Touches" means
   `selection.from <= node.to && selection.to >= node.from` — inclusive at
   both edges, so clicking immediately before/after a formatted span reveals
   it. For multi-line nodes (fenced code, blockquotes) test against the whole
   node. For headings, test against the entire line. This yields exactly the
   requested behavior: type `# Hi`, then a space keeps the cursor adjacent
   (still revealed as raw text is fine while typing the heading itself —
   marker hiding kicks in once the cursor leaves the line).
3. **Decoration kinds** per element (see table below):
   `Decoration.replace({})` to hide marker chars, `Decoration.mark({class})`
   to style content, `Decoration.line({class})` for line-level styling,
   `Decoration.replace({widget})` / `Decoration.widget` for widgets.

**Critical CM6 constraint:** decorations that affect vertical layout (block
widgets, replacements spanning line breaks) may NOT come from a `ViewPlugin`
— they must be provided by a `StateField`. Keep everything inline/line-level
in the ViewPlugin; if a block-level replacement ever becomes necessary
(probably only images), put that one in a small companion `StateField`.
Prefer inline widgets to avoid the issue entirely.

Styling lives in `theme.ts` as a CM `EditorView.theme`/`baseTheme` keyed on
classes like `.cm-h1`, using CSS variables that the Tailwind theme also uses,
so light/dark mode is one variable swap.

### Element behavior spec

| Element | Cursor away (formatted) | Cursor touching (revealed) |
|---|---|---|
| `# H1`–`###### H6` | `#`s + trailing space hidden; line styled (size/weight per level) | full raw line, still size-styled |
| `**bold**` `*italic*` `~~strike~~` | markers hidden, content styled | markers visible, content styled |
| `` `code` `` | backticks hidden, content in mono w/ subtle bg | backticks visible |
| `[text](url)` | renders as link text only, colored/underlined; Cmd/Ctrl+click opens via opener plugin | full raw syntax |
| `![alt](src)` | inline image widget below/inline (resolve relative paths against the file's dir via `convertFileSrc`) | raw syntax |
| `> quote` | `>` hidden, line gets left border + muted color | raw |
| `- ` / `1. ` lists | bullet rendered as `•` (styled), numbers kept; indent guides | raw marker |
| `- [ ]` / `- [x]` | real checkbox widget; clicking toggles `x` in the doc (dispatch a change) | raw |
| `---` hr | replaced with an `<hr>`-style widget | raw |
| ```` ``` ```` fences | fence lines de-emphasized, block gets bg + mono; keep contents visible (no hiding inside) | same, fences fully visible |
| tables | punt: always show raw markdown, lightly styled (mono, aligned) — do not attempt in-place table rendering |

Build order within M2 (each step is shippable): headings → bold/italic/strike
→ inline code → blockquote + hr → lists + checkboxes → links → images → fence
styling. Headings first proves the whole pattern end-to-end.

### Editing niceties that belong with M2

- Smart Enter in lists: continue `- ` / `1. ` / `- [ ]`; Enter on an empty
  list item removes the marker (use/extend `@codemirror/lang-markdown`'s
  built-in `insertNewlineContinueMarkup` — it already does most of this).
- ⌘B / ⌘I / ⌘E (code) / ⌘K (link) toggle wrapping on the selection.
- Performance: decoration build must stay O(visible viewport), never O(doc).
  Test with a 10k-line file — typing latency must stay imperceptible.

**Done when:** the table above is fully implemented, a 10k-line document types
smoothly, and toggling a checkbox edits the underlying text correctly.

## M3 — Polish

- **Themes:** light/dark following OS (`matchMedia` + Tauri window theme),
  manual override in settings. All colors as CSS variables.
- **Settings UI** (shadcn dialog): font family/size, line width (ch-based
  content column, centered), autosave, theme. Persist via `tauri-plugin-store`;
  apply live through CM compartments.
- **Status bar:** word count, char count, cursor position, saved-state.
- **Command palette** (⌘⇧P, `cmdk`): every command lives in a registry
  (id, title, shortcut, run) that both the palette and keybindings consume.
- **In-file search:** CM's `@codemirror/search` panel, restyled to match.
- **Export:** HTML export (render with `unified`/`remark`/`rehype` — the only
  place an AST is used, and it's one-way) and print-to-PDF via a hidden
  print view. Keep the export stylesheet consistent with the editor theme.
- **Window state:** restore size/position (`tauri-plugin-window-state`).

## M4 — Distribution

- `release.yml` on tag `v*` using `tauri-apps/tauri-action`: macOS
  `universal-apple-darwin` DMG, Windows NSIS `.exe`, Linux AppImage + `.deb`,
  publishing a draft GitHub Release.
- **macOS signing + notarization** via the standard tauri-action secrets
  (`APPLE_CERTIFICATE`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`).
  **Windows signing** can start unsigned; leave a TODO wiring Azure Trusted
  Signing. Document both in a `docs/RELEASING.md`.
- **Auto-update:** `tauri-plugin-updater` pointed at GitHub Releases
  (`latest.json` from tauri-action), update-available toast → restart.
- **File associations:** `bundle.fileAssociations` in `tauri.conf.json` for
  `.md`/`.markdown` so the OS offers bettermarkdown as a handler; verify the
  file-open path from M1 handles the association launch on both macOS
  (RunEvent::Opened) and Windows (argv).

---

## Guidance for the implementing agent

- **Work milestone by milestone, in order.** Each milestone ends with a
  passing CI run and a commit. Don't start M2 while M1 file safety is flaky.
- **Verify in the running app**, not just by compiling: `npm run tauri dev`,
  open a real file, edit, save, check the bytes on disk. For M2, keyboard
  through a document and watch decorations reveal/collapse at every boundary.
- **Do not add a database, index, sync, plugins, multi-file search, tabs, or a
  split preview pane.** They are explicitly out of scope.
- The markdown buffer is sacred: no feature may rewrite the user's text except
  as a direct, minimal edit the user initiated (checkbox toggle, ⌘B wrap).
- When CM6 APIs are ambiguous, prefer reading the official CodeMirror 6 docs
  and examples (codemirror.net/docs, the "Decorations" and "ViewPlugin"
  examples) over guessing; the decoration/StateField distinction above is the
  #1 place naive implementations break.
- Keep Rust minimal. If a feature can be done safely in the frontend, do it
  there; Rust exists for atomic file I/O, watching, and OS integration.
