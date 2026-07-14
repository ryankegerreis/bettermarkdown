# bettermarkdown

A fast, disk-first markdown editor for macOS, Windows, and (best-effort) Linux.

The defining feature is **Obsidian-style live preview**: the document is always
plain markdown, but syntax renders as formatted output the moment the cursor
leaves it. Type `# Hi`, move on — it becomes an H1. Move the cursor back — the
raw `# Hi` reappears.

Files are plain markdown on your disk. No database, no vault index, no sync.

## Tech stack

- **Editor:** CodeMirror 6 with a custom live-preview decoration layer
- **Shell:** Tauri 2 (Rust) + React 19 + TypeScript + Vite
- **Styling:** Tailwind v4 + shadcn/ui

See [PLAN.md](./PLAN.md) for the full implementation plan and milestones.

## Development

```sh
npm install
npm run tauri dev      # run the app
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm run format         # prettier --write
```

Rust checks (from the repo root):

```sh
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

Release builds and signing prerequisites are documented in
[docs/RELEASING.md](./docs/RELEASING.md).

## Recommended IDE setup

[VS Code](https://code.visualstudio.com/) +
[Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) +
[rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
