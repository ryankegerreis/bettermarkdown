import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { invoke } from "@tauri-apps/api/core";

export type ExportTheme = "light" | "dark";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function exportStyles(theme: ExportTheme): string {
  const colors =
    theme === "dark"
      ? {
          background: "#181817",
          foreground: "#e9e7e1",
          muted: "#aaa69d",
          rule: "#37352f",
          code: "#262521",
          link: "#bd8f54",
        }
      : {
          background: "#faf9f6",
          foreground: "#292824",
          muted: "#706d65",
          rule: "#dedbd2",
          code: "#eeece6",
          link: "#865c2c",
        };

  return `
    :root { color-scheme: ${theme}; }
    * { box-sizing: border-box; }
    body { margin: 0; background: ${colors.background}; color: ${colors.foreground}; font: 17px/1.72 ui-serif, Charter, "Bitstream Charter", Cambria, serif; }
    article { width: min(72ch, calc(100% - 48px)); margin: 0 auto; padding: 64px 0 96px; }
    h1, h2, h3, h4, h5, h6 { font-family: ui-sans-serif, system-ui, sans-serif; line-height: 1.22; letter-spacing: -0.025em; margin: 1.6em 0 .55em; }
    h1 { font-size: 2.35rem; } h2 { font-size: 1.8rem; } h3 { font-size: 1.4rem; }
    a { color: ${colors.link}; text-underline-offset: .16em; }
    blockquote { margin: 1.5em 0; padding: .1em 1.2em; border-inline-start: 1px solid ${colors.rule}; color: ${colors.muted}; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: ${colors.code}; }
    code { border-radius: 4px; padding: .12em .32em; font-size: .9em; }
    pre { overflow: auto; border-radius: 6px; padding: 1.1rem 1.25rem; }
    pre code { padding: 0; background: transparent; }
    img { display: block; max-width: 100%; height: auto; margin: 1.5em auto; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: .55em .7em; border-bottom: 1px solid ${colors.rule}; text-align: start; }
    hr { border: 0; border-top: 1px solid ${colors.rule}; margin: 2.5em 0; }
    @media print { :root { color-scheme: light; } body { background: white; color: #292824; } article { width: auto; padding: 0; } a { color: inherit; } }
  `;
}

export async function markdownDocument(
  markdown: string,
  title: string,
  theme: ExportTheme,
): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>${exportStyles(theme)}</style>
</head>
<body><article>${String(result)}</article></body>
</html>`;
}

/** Mount a print-only view in the main webview, which Tauri can print natively. */
export async function printDocument(
  html: string,
  triggerPrint: () => Promise<void> = () => invoke<void>("print_window"),
): Promise<void> {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const article = parsed.querySelector("article");
  if (!article) throw new Error("Could not create the print view");

  document.querySelector(".bm-print-view")?.remove();
  const printView = document.createElement("div");
  printView.className = "bm-print-view";
  printView.setAttribute("aria-hidden", "true");
  printView.append(article.cloneNode(true));
  document.body.append(printView);

  const cleanup = () => printView.remove();
  window.addEventListener("afterprint", cleanup, { once: true });
  // Give the webview one rendering turn before the native runtime snapshots it.
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  await triggerPrint();
  // Some WebKit versions do not emit afterprint when the dialog is cancelled.
  window.setTimeout(cleanup, 2000);
}
