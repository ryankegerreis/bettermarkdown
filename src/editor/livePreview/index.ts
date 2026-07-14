import { Facet, type Extension } from "@codemirror/state";
import { EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";

import { buildDecorations } from "./decorate";
import { hasProtocol, resolveLocalPath } from "./widgets";

export const markdownFilePath = Facet.define<string, string>({
  combine: (values) => values[values.length - 1] ?? "",
});

async function openLink(href: string, filePath: string) {
  if (hasProtocol(href) || href.startsWith("//")) {
    await openUrl(href);
  } else if (href.startsWith("#")) {
    return;
  } else {
    await openPath(resolveLocalPath(href, filePath));
  }
}

class LivePreviewView {
  decorations;

  constructor(readonly view: EditorView) {
    this.decorations = buildDecorations(
      view,
      view.state.facet(markdownFilePath),
    );
  }

  update(update: ViewUpdate) {
    const pathChanged =
      update.startState.facet(markdownFilePath) !==
      update.state.facet(markdownFilePath);
    if (
      update.docChanged ||
      update.viewportChanged ||
      update.selectionSet ||
      pathChanged
    ) {
      this.decorations = buildDecorations(
        update.view,
        update.state.facet(markdownFilePath),
      );
    }
  }
}

const previewPlugin = ViewPlugin.fromClass(LivePreviewView, {
  decorations: (plugin) => plugin.decorations,
});

const linkHandler = EditorView.domEventHandlers({
  mousedown(event, view) {
    if (!(event.metaKey || event.ctrlKey)) return false;
    const target = event.target;
    if (!(target instanceof Element)) return false;
    const link = target.closest<HTMLElement>(".cm-live-link");
    const href = link?.dataset.href;
    if (!href) return false;
    event.preventDefault();
    void openLink(href, view.state.facet(markdownFilePath));
    return true;
  },
});

/** Obsidian-style, byte-preserving live preview for visible markdown only. */
export function livePreview(): Extension {
  return [previewPlugin, linkHandler];
}
