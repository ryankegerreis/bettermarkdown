# Feature Audit — bettermarkdown

_Audited 2026-07-14, at commit `6310d79` (post-M4)._

A survey of what the app has today, gaps in existing features, and candidate
features drawn from world-class markdown editors (Obsidian, Typora, iA Writer,
Bear), tiered by fit with the locked decisions in [PLAN.md](../PLAN.md).

## What exists today

The app has fully delivered on PLAN.md through M4:

- **File safety**: atomic saves, external-change detection with a reload/keep
  bar, dirty tracking with close guard, autosave, recent files, drag-drop and
  file-association opening, single-instance handling.
- **Live preview** (the core product): headings, bold/italic/strikethrough,
  inline code, links with ⌘-click, inline image widgets, blockquotes, lists
  with clickable checkboxes, HR widgets, fence styling — with correct
  cursor-reveal behavior and viewport-only decoration.
- **Editing**: smart Enter list continuation, ⌘B/I/E/K toggles, multiple
  selections, bracket matching, selection-match highlighting.
- **Polish**: command palette, in-file search, settings (font / size / line
  width / theme / autosave), light/dark/system themes, status bar, HTML export
  + print-to-PDF, window-state restore.
- **Distribution**: CI on three OSes, signed releases via tauri-action,
  auto-update.

## Gaps in existing features

Half-finished surfaces rather than new features — do these first:

1. **Syntax highlighting inside fenced code blocks.** `src/editor/extensions.ts`
   calls `markdown({ base: markdownLanguage })` without
   `codeLanguages: languages` (from `@codemirror/language-data`), so a
   ` ```ts ` block renders as plain mono text. Table stakes in every serious
   markdown editor; roughly a two-line change.
2. **Find & replace as a first-class command.** The search keymap is wired, but
   the palette only exposes "Find in file." Surface replace, and consider
   restyling the panel (match count, etc.).
3. **Selection stats and reading time** in the status bar. When text is
   selected, show "X words selected"; add an iA Writer–style reading-time
   estimate.
4. **Reopen last file on launch.** Recent files are tracked, but the app starts
   on the empty state every time. Session restore is expected behavior in this
   category.

## New features

### Tier 1 — high value, zero architectural tension

All of these keep the single-file, no-database, buffer-is-plain-text model:

- **Document outline panel + "jump to heading" (⌘⇧O).** A collapsible sidebar
  built from the Lezer tree of the open file. The single highest-leverage
  navigation feature available.
- **Heading and list folding.** CodeMirror's fold service makes this natural.
- **Smart paste.** Three behaviors:
  - Paste a URL over selected text → `[selection](url)`.
  - Paste rich HTML → converted markdown (the unified/rehype toolchain from
    export, run in reverse with `rehype-remark`).
  - Paste an image from the clipboard → write it next to the file (e.g.
    `./assets/`) and insert `![](...)`. Same for drag-dropping an image into
    the document.
- **Table editing.** Rendering stays punted, but add: Tab/Shift-Tab to move
  between cells, Enter to add a row, auto-realign pipes on edit, and an
  "Insert table" command. Even the keyboard-only half of Typora's table UX is
  a big win.
- **Focus mode and typewriter scrolling.** Dim everything but the current
  sentence/paragraph; keep the cursor line vertically centered. Pure
  view-layer CodeMirror work.
- **More markdown surface in live preview**: YAML frontmatter (dim/collapse),
  `==highlight==`, footnotes, and Obsidian-style callouts (`> [!note]`). All
  are Lezer extensions plus decoration cases with existing patterns to follow.
- **Math via KaTeX** (`$...$`, `$$...$$`) and **Mermaid diagrams** in fences,
  rendered as widgets under the same cursor-reveal rule. The two most-cited
  reasons people pick Typora/Obsidian over simpler editors.
- **Local file history.** Disk-first version of Obsidian's File Recovery: on
  save, keep rolling timestamped snapshots in the app data dir with a
  "Restore previous version" browser. No database — deepens the "never lose a
  byte" promise.
- **Smart typography option** (curly quotes, em dashes as you type) and
  **auto-pair/wrap** — typing `**` with a selection wraps it.
- **List power-editing**: Tab/Shift-Tab to indent/outdent list items with
  renumbering; ⌥↑/⌥↓ moves whole list items (not just lines).
- **Spellcheck toggle** (the webview's native spellcheck gets most of the way)
  and optional **Vim keybindings** (`@replit/codemirror-vim`) — cheap, and
  each wins a dedicated audience.
- **Export upgrades**: copy-as-rich-text/HTML to clipboard, export theme
  matching the editor, DOCX via pandoc when installed.

### Tier 2 — touches the "do not revisit" list; decide deliberately

- **Quick switcher (⌘P) over a folder.** Letting users "open a folder" is one
  step from a vault. Middle path: a switcher over recent files only — no
  index, no scope change.
- **Tabs or multiple windows.** Tabs are explicitly out of scope; multiple OS
  windows is a smaller philosophical step and Tauri supports it well.
- **Wiki links / backlinks / multi-file search.** Obsidian's moat, but they
  require an index — directly against the no-database decision. Recommended:
  leave these out; they'd change what the product is.

## Suggested build order

Code-block highlighting → smart paste → outline panel → focus/typewriter →
table keyboard UX → math/Mermaid → file history.

This sequence front-loads the features users notice in the first ten minutes.
