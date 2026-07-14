import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";

/**
 * Editor chrome. All colors are the same CSS variables the Tailwind theme uses
 * (defined in styles/globals.css), so toggling the `.dark` class on <html>
 * reskins the editor and the app chrome together — no separate dark CM theme.
 */
const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    color: "var(--foreground)",
    backgroundColor: "var(--background)",
    fontSize: "15px",
  },
  ".cm-scroller": {
    fontFamily:
      "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
    lineHeight: "1.7",
  },
  ".cm-content": {
    maxWidth: "72ch",
    margin: "0 auto",
    padding: "2rem 1.5rem 40vh",
    caretColor: "var(--foreground)",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--foreground)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
    {
      backgroundColor: "color-mix(in srgb, var(--primary) 22%, transparent)",
    },
  ".cm-activeLine": {
    backgroundColor: "color-mix(in srgb, var(--muted) 45%, transparent)",
  },
  ".cm-selectionMatch": {
    backgroundColor: "color-mix(in srgb, var(--primary) 16%, transparent)",
  },
  ".cm-searchMatch": {
    backgroundColor: "color-mix(in srgb, var(--primary) 25%, transparent)",
    outline: "1px solid color-mix(in srgb, var(--primary) 45%, transparent)",
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "color-mix(in srgb, var(--primary) 45%, transparent)",
  },
  ".cm-panels": {
    backgroundColor: "var(--popover)",
    color: "var(--popover-foreground)",
    borderColor: "var(--border)",
  },
  ".cm-panel.cm-search input": {
    backgroundColor: "var(--background)",
    color: "var(--foreground)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
  },
});

/**
 * Token styling for raw markdown. In M1 the document is shown as plain markdown
 * with syntax highlighting; M2 layers live-preview decorations on top of this.
 */
const markdownHighlight = HighlightStyle.define([
  { tag: t.heading1, fontSize: "1.6em", fontWeight: "700", lineHeight: "1.3" },
  { tag: t.heading2, fontSize: "1.4em", fontWeight: "700", lineHeight: "1.3" },
  { tag: t.heading3, fontSize: "1.2em", fontWeight: "600" },
  { tag: [t.heading4, t.heading5, t.heading6], fontWeight: "600" },
  { tag: t.strong, fontWeight: "700" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.link, color: "var(--primary)", textDecoration: "underline" },
  { tag: t.url, color: "var(--muted-foreground)" },
  {
    tag: t.monospace,
    fontFamily:
      "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
  },
  { tag: t.quote, color: "var(--muted-foreground)", fontStyle: "italic" },
  { tag: [t.processingInstruction, t.meta], color: "var(--muted-foreground)" },
  { tag: t.contentSeparator, color: "var(--muted-foreground)" },
]);

/** The full visual theme: chrome + markdown token highlighting. */
export const bettermarkdownTheme: Extension = [
  editorTheme,
  syntaxHighlighting(markdownHighlight),
];
