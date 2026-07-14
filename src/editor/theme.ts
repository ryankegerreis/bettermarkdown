import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import type { Extension } from "@codemirror/state";
import type { EditorPreferences } from "@/store/settings";

const editorFonts: Record<EditorPreferences["fontFamily"], string> = {
  sans: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  serif: "ui-serif, Charter, 'Bitstream Charter', 'Sitka Text', Cambria, serif",
  mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
};

/** Live-reconfigurable reader preferences, installed in a CM compartment. */
export function editorAppearance(preferences: EditorPreferences): Extension {
  return EditorView.theme({
    "&": { fontSize: `${preferences.fontSize}px` },
    ".cm-scroller": { fontFamily: editorFonts[preferences.fontFamily] },
    ".cm-content": { maxWidth: `${preferences.lineWidth}ch` },
  });
}

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
    fontSize: "16px",
  },
  ".cm-scroller": {
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    lineHeight: "1.7",
  },
  ".cm-content": {
    maxWidth: "72ch",
    margin: "0 auto",
    padding: "2rem 1.5rem 40vh",
    caretColor: "var(--foreground)",
  },
  ".cm-line": {
    transition: "color 120ms ease-out, background-color 120ms ease-out",
  },
  ".cm-live-h1": {
    fontSize: "2rem",
    fontWeight: "760",
    lineHeight: "1.22",
    letterSpacing: "-0.035em",
    paddingTop: "0.65em",
    paddingBottom: "0.18em",
  },
  ".cm-live-h2": {
    fontSize: "1.6rem",
    fontWeight: "720",
    lineHeight: "1.28",
    letterSpacing: "-0.025em",
    paddingTop: "0.55em",
    paddingBottom: "0.12em",
  },
  ".cm-live-h3": {
    fontSize: "1.3rem",
    fontWeight: "680",
    lineHeight: "1.35",
    letterSpacing: "-0.015em",
    paddingTop: "0.4em",
  },
  ".cm-live-h4": {
    fontSize: "1.08rem",
    fontWeight: "680",
    paddingTop: "0.3em",
  },
  ".cm-live-h5": {
    fontSize: "0.96rem",
    fontWeight: "700",
    letterSpacing: "0.025em",
    paddingTop: "0.25em",
  },
  ".cm-live-h6": {
    color: "var(--muted-foreground)",
    fontSize: "0.86rem",
    fontWeight: "700",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    paddingTop: "0.25em",
  },
  ".cm-live-strong": { fontWeight: "750" },
  ".cm-live-emphasis": { fontStyle: "italic" },
  ".cm-live-strike": { textDecoration: "line-through" },
  ".cm-live-inline-code": {
    borderRadius: "0.3rem",
    backgroundColor: "var(--muted)",
    boxDecorationBreak: "clone",
    color: "var(--foreground)",
    fontFamily:
      "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
    fontSize: "0.9em",
    padding: "0.12em 0.32em",
    WebkitBoxDecorationBreak: "clone",
  },
  ".cm-live-blockquote": {
    borderLeft: "2px solid var(--border)",
    color: "var(--muted-foreground)",
    fontStyle: "italic",
    paddingLeft: "1rem",
  },
  ".cm-live-bullet": {
    boxSizing: "border-box",
    color: "var(--muted-foreground)",
    display: "inline-block",
    fontSize: "1.1em",
    fontWeight: "800",
    textAlign: "center",
    width: "1ch",
  },
  ".cm-live-list-number": {
    color: "var(--muted-foreground)",
    fontVariantNumeric: "tabular-nums",
    fontWeight: "600",
  },
  ".cm-live-list-depth-2": {
    backgroundImage: "linear-gradient(to bottom, var(--border), var(--border))",
    backgroundPosition: "0.45rem 0",
    backgroundRepeat: "no-repeat",
    backgroundSize: "1px 100%",
  },
  ".cm-live-list-depth-3": {
    backgroundImage:
      "linear-gradient(to bottom, var(--border), var(--border)), linear-gradient(to bottom, var(--border), var(--border))",
    backgroundPosition: "0.45rem 0, 2.25rem 0",
    backgroundRepeat: "no-repeat",
    backgroundSize: "1px 100%, 1px 100%",
  },
  ".cm-live-list-depth-4": {
    backgroundImage:
      "linear-gradient(to bottom, var(--border), var(--border)), linear-gradient(to bottom, var(--border), var(--border)), linear-gradient(to bottom, var(--border), var(--border))",
    backgroundPosition: "0.45rem 0, 2.25rem 0, 4.05rem 0",
    backgroundRepeat: "no-repeat",
    backgroundSize: "1px 100%, 1px 100%, 1px 100%",
  },
  ".cm-live-checkbox": {
    accentColor: "var(--primary)",
    cursor: "pointer",
    height: "1rem",
    margin: "0 0.45rem 0 0.15rem",
    verticalAlign: "-0.12rem",
    width: "1rem",
  },
  ".cm-live-hr": {
    borderTop: "1px solid var(--border)",
    display: "inline-block",
    margin: "0.15rem 0",
    verticalAlign: "middle",
    width: "100%",
  },
  ".cm-live-link": {
    color: "var(--primary)",
    cursor: "pointer",
    textDecoration: "underline",
    textDecorationColor: "color-mix(in srgb, var(--primary) 45%, transparent)",
    textUnderlineOffset: "0.16em",
  },
  ".cm-live-image-frame": {
    alignItems: "center",
    borderRadius: "0.4rem",
    display: "inline-flex",
    margin: "0.5rem 0",
    maxWidth: "100%",
    overflow: "hidden",
    verticalAlign: "middle",
  },
  ".cm-live-image": {
    display: "block",
    maxHeight: "22rem",
    maxWidth: "100%",
    objectFit: "contain",
  },
  ".cm-live-image-error": {
    backgroundColor: "var(--muted)",
    color: "var(--muted-foreground)",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "0.85rem",
    padding: "0.6rem 0.8rem",
  },
  ".cm-live-code-block": {
    backgroundColor: "color-mix(in srgb, var(--muted) 72%, transparent)",
    fontFamily:
      "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
    fontSize: "0.92em",
    paddingLeft: "0.85rem",
    paddingRight: "0.85rem",
  },
  ".cm-live-code-block:not(.cm-live-code-fence)": {
    color: "var(--foreground)",
  },
  ".cm-live-code-fence": {
    color: "var(--muted-foreground)",
    fontSize: "0.86em",
  },
  ".cm-live-table": {
    color: "var(--muted-foreground)",
    fontFamily:
      "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
    fontSize: "0.9em",
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
    fontFamily: "inherit",
    fontSize: "0.8rem",
    outline: "none",
    padding: "0.3rem 0.45rem",
  },
  ".cm-panel.cm-search": {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: "0.35rem",
    padding: "0.45rem 0.6rem",
  },
  ".cm-panel.cm-search button": {
    backgroundColor: "var(--secondary)",
    backgroundImage: "none",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    color: "var(--secondary-foreground)",
    fontFamily: "inherit",
    fontSize: "0.72rem",
    padding: "0.28rem 0.5rem",
  },
  ".cm-panel.cm-search button:hover": {
    backgroundColor: "var(--accent)",
  },
  ".cm-panel.cm-search label": {
    color: "var(--muted-foreground)",
    fontSize: "0.72rem",
  },
  ".cm-panel.cm-search .cm-button[name=close]": {
    border: "0",
    marginLeft: "auto",
  },
});

/**
 * Token styling for raw markdown. In M1 the document is shown as plain markdown
 * with syntax highlighting; M2 layers live-preview decorations on top of this.
 */
const markdownHighlight = HighlightStyle.define([
  { tag: [t.heading1, t.heading2, t.heading3], fontWeight: "700" },
  { tag: [t.heading4, t.heading5, t.heading6], fontWeight: "650" },
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
