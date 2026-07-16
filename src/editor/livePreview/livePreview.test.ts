// @vitest-environment jsdom

import {
  insertNewlineContinueMarkup,
  markdown,
  markdownLanguage,
} from "@codemirror/lang-markdown";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { afterEach, describe, expect, it } from "vitest";

import { livePreview, markdownFilePath } from ".";
import {
  insertImage,
  insertTable,
  toggleBlockquote,
  toggleBold,
  toggleBulletList,
  toggleHeading,
  toggleLink,
  toggleTaskList,
} from "./commands";
import { selectionTouches } from "./reveal";

const views: EditorView[] = [];

function createView(doc: string, anchor = doc.length): EditorView {
  const view = new EditorView({
    parent: document.body,
    state: EditorState.create({
      doc,
      selection: EditorSelection.cursor(anchor),
      extensions: [
        markdown({ base: markdownLanguage }),
        markdownFilePath.of("/tmp/document.md"),
        livePreview(),
      ],
    }),
  });
  views.push(view);
  view.focus();
  return view;
}

afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
  document.body.replaceChildren();
});

describe("selection reveal rule", () => {
  it("treats both element edges as touching", () => {
    const state = EditorState.create({
      doc: "before **bold** after",
      selection: EditorSelection.cursor(7),
    });
    expect(selectionTouches(state, 7, 15)).toBe(true);
    expect(
      selectionTouches(
        state.update({ selection: EditorSelection.cursor(15) }).state,
        7,
        15,
      ),
    ).toBe(true);
    expect(
      selectionTouches(
        state.update({ selection: EditorSelection.cursor(16) }).state,
        7,
        15,
      ),
    ).toBe(false);
  });
});

describe("live preview decorations", () => {
  it("hides a heading marker away from the line and reveals it at the edge", () => {
    const view = createView("# Heading\nbody");
    const heading = view.dom.querySelector<HTMLElement>(".cm-live-h1");
    expect(heading?.textContent).toBe("Heading");

    view.dispatch({ selection: EditorSelection.cursor(9) });
    expect(
      view.dom.querySelector<HTMLElement>(".cm-live-h1")?.textContent,
    ).toBe("# Heading");
  });

  it("hides syntax from a stale document selection after editor focus leaves", async () => {
    const view = createView("# Heading\n\n> Quote\n\n- item");
    view.focus();
    view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } });
    expect(
      view.dom.querySelector<HTMLElement>(".cm-live-h1")?.textContent,
    ).toBe("# Heading");

    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
    await new Promise((resolve) => window.setTimeout(resolve, 30));

    expect(
      view.dom.querySelector<HTMLElement>(".cm-live-h1")?.textContent,
    ).toBe("Heading");
    expect(view.dom.querySelector(".cm-live-bullet")).not.toBeNull();
  });

  it("toggles the underlying task marker from its checkbox widget", () => {
    const view = createView("- [ ] task\n\nbody");
    const checkbox =
      view.dom.querySelector<HTMLInputElement>(".cm-live-checkbox");
    expect(checkbox).not.toBeNull();
    expect(view.dom.querySelector(".cm-live-bullet")).toBeNull();
    if (!checkbox) return;

    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));
    expect(view.state.doc.toString()).toBe("- [x] task\n\nbody");
  });

  it("formats links but preserves their markdown in editor state", () => {
    const markdownText = "A [useful link](https://example.com) here\nnext";
    const view = createView(markdownText);
    const link = view.dom.querySelector<HTMLElement>(".cm-live-link");
    expect(link?.textContent).toBe("useful link");
    expect(link?.dataset.href).toBe("https://example.com");
    expect(view.state.doc.toString()).toBe(markdownText);
  });
});

describe("formatting commands", () => {
  it("wraps and unwraps a selection without changing its selected content", () => {
    const view = createView("make bold", 4);
    view.dispatch({ selection: { anchor: 5, head: 9 } });
    toggleBold(view);
    expect(view.state.doc.toString()).toBe("make **bold**");
    expect(
      view.state.sliceDoc(
        view.state.selection.main.from,
        view.state.selection.main.to,
      ),
    ).toBe("bold");

    toggleBold(view);
    expect(view.state.doc.toString()).toBe("make bold");
  });

  it("creates a link and selects its URL placeholder", () => {
    const view = createView("read this", 9);
    view.dispatch({ selection: { anchor: 5, head: 9 } });
    toggleLink(view);
    expect(view.state.doc.toString()).toBe("read [this](url)");
    expect(
      view.state.sliceDoc(
        view.state.selection.main.from,
        view.state.selection.main.to,
      ),
    ).toBe("url");

    view.dispatch({ selection: { anchor: 6, head: 10 } });
    toggleLink(view);
    expect(view.state.doc.toString()).toBe("read this");
    expect(
      view.state.sliceDoc(
        view.state.selection.main.from,
        view.state.selection.main.to,
      ),
    ).toBe("this");
  });

  it("switches heading levels and toggles the active level off", () => {
    const view = createView("## First\n## Second");
    view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } });

    toggleHeading(3)(view);
    expect(view.state.doc.toString()).toBe("### First\n### Second");

    toggleHeading(3)(view);
    expect(view.state.doc.toString()).toBe("First\nSecond");
  });

  it("toggles multi-line lists and converts list types", () => {
    const view = createView("First\nSecond");
    view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } });

    toggleBulletList(view);
    expect(view.state.doc.toString()).toBe("- First\n- Second");

    toggleTaskList(view);
    expect(view.state.doc.toString()).toBe("- [ ] First\n- [ ] Second");

    toggleTaskList(view);
    expect(view.state.doc.toString()).toBe("First\nSecond");
  });

  it("toggles blockquotes across every selected line", () => {
    const view = createView("First\nSecond");
    view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } });

    toggleBlockquote(view);
    expect(view.state.doc.toString()).toBe("> First\n> Second");

    toggleBlockquote(view);
    expect(view.state.doc.toString()).toBe("First\nSecond");
  });

  it("inserts the requested table shape and selects its first header", () => {
    const view = createView("");
    insertTable(view, 3, 2);

    expect(view.state.doc.toString()).toBe(
      "| Header 1 | Header 2 |\n| --- | --- |\n|  |  |\n|  |  |",
    );
    expect(
      view.state.sliceDoc(
        view.state.selection.main.from,
        view.state.selection.main.to,
      ),
    ).toBe("Header 1");
  });

  it("inserts an image and selects its URL placeholder", () => {
    const view = createView("A portrait");
    view.dispatch({ selection: { anchor: 2, head: 10 } });
    insertImage(view);

    expect(view.state.doc.toString()).toBe("A ![portrait](url)");
    expect(
      view.state.sliceDoc(
        view.state.selection.main.from,
        view.state.selection.main.to,
      ),
    ).toBe("url");
  });
});

describe("editing behavior and performance", () => {
  it("continues list markup and removes an empty list marker", () => {
    const continued = createView("- item", 6);
    expect(insertNewlineContinueMarkup(continued)).toBe(true);
    expect(continued.state.doc.toString()).toBe("- item\n- ");

    const empty = createView("- ", 2);
    expect(insertNewlineContinueMarkup(empty)).toBe(true);
    expect(empty.state.doc.toString()).toBe("");
  });

  it("keeps a 10,000-line document virtualized while typing", () => {
    const document = Array.from(
      { length: 10_000 },
      (_, index) => `Line ${index} with **formatting**`,
    ).join("\n");
    const view = createView(document);
    const started = performance.now();
    view.dispatch({ changes: { from: document.length, insert: "!" } });
    const elapsed = performance.now() - started;

    expect(view.dom.querySelectorAll(".cm-line").length).toBeLessThan(200);
    expect(elapsed).toBeLessThan(500);
    expect(view.state.doc.sliceString(view.state.doc.length - 1)).toBe("!");
  });
});
