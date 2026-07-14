// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { markdownDocument, printDocument } from "./export";

afterEach(() => {
  document.querySelector(".bm-print-view")?.remove();
  vi.restoreAllMocks();
});

describe("markdownDocument", () => {
  it("renders GFM into a standalone themed document", async () => {
    const html = await markdownDocument(
      "# Notes\n\n- [x] shipped\n\n| A | B |\n| - | - |\n| 1 | 2 |",
      "Notes & plans",
      "dark",
    );

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<title>Notes &amp; plans</title>");
    expect(html).toContain('<input type="checkbox" checked disabled>');
    expect(html).toContain("<table>");
    expect(html).toContain("color-scheme: dark");
  });

  it("does not pass raw HTML from markdown into the export", async () => {
    const html = await markdownDocument(
      '<script>alert("nope")</script>\n\nSafe',
      "Safe",
      "light",
    );

    expect(html).not.toContain("alert(");
    expect(html).toContain("<p>Safe</p>");
  });

  it("mounts a print-only article and invokes the native print path", async () => {
    const print = vi.fn().mockResolvedValue(undefined);

    await printDocument(
      "<!doctype html><html><body><article><h1>Print me</h1></article></body></html>",
      print,
    );

    expect(print).toHaveBeenCalledOnce();
    expect(document.querySelector(".bm-print-view article")?.textContent).toBe(
      "Print me",
    );
    window.dispatchEvent(new Event("afterprint"));
    expect(document.querySelector(".bm-print-view")).toBeNull();
  });
});
