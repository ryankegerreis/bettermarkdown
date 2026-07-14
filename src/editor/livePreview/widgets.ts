import { convertFileSrc } from "@tauri-apps/api/core";
import { WidgetType, type EditorView } from "@codemirror/view";

export class BulletWidget extends WidgetType {
  toDOM(): HTMLElement {
    const bullet = document.createElement("span");
    bullet.className = "cm-live-bullet";
    bullet.textContent = "•";
    bullet.setAttribute("aria-hidden", "true");
    return bullet;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

export class CheckboxWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly markerFrom: number,
  ) {
    super();
  }

  eq(other: CheckboxWidget): boolean {
    return (
      other.checked === this.checked && other.markerFrom === this.markerFrom
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const checkbox = document.createElement("input");
    checkbox.className = "cm-live-checkbox";
    checkbox.type = "checkbox";
    checkbox.checked = this.checked;
    checkbox.setAttribute(
      "aria-label",
      this.checked ? "Mark task incomplete" : "Mark task complete",
    );
    checkbox.addEventListener("change", () => {
      view.dispatch({
        changes: {
          from: this.markerFrom + 1,
          to: this.markerFrom + 2,
          insert: checkbox.checked ? "x" : " ",
        },
      });
      view.focus();
    });
    return checkbox;
  }

  ignoreEvent(): boolean {
    // The input owns its pointer events. Letting CodeMirror process mousedown
    // moves the selection into the task marker, which reveals the raw syntax
    // and destroys the widget before its change event can dispatch.
    return true;
  }
}

export class HorizontalRuleWidget extends WidgetType {
  toDOM(): HTMLElement {
    const rule = document.createElement("span");
    rule.className = "cm-live-hr";
    rule.setAttribute("role", "separator");
    return rule;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function hasProtocol(value: string): boolean {
  return /^[a-z][a-z\d+.-]*:/i.test(value);
}

function isAbsolutePath(value: string): boolean {
  return value.startsWith("/") || /^[a-z]:[\\/]/i.test(value);
}

function dirname(path: string): string {
  const separator = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return separator < 0 ? "" : path.slice(0, separator);
}

function joinPath(directory: string, relative: string): string {
  const separator = directory.includes("\\") ? "\\" : "/";
  const parts = `${directory}${separator}${relative}`.split(/[\\/]/);
  const prefix = /^[a-z]:$/i.test(parts[0] ?? "") ? parts.shift() : "";
  const resolved: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") resolved.pop();
    else resolved.push(part);
  }
  const root = directory.startsWith("/")
    ? separator
    : prefix
      ? `${prefix}${separator}`
      : "";
  return `${root}${resolved.join(separator)}`;
}

export function resolveLocalPath(source: string, filePath: string): string {
  if (isAbsolutePath(source)) return source;
  const directory = dirname(filePath);
  return directory ? joinPath(directory, source) : source;
}

export function resolveImageSource(source: string, filePath: string): string {
  if (hasProtocol(source) || source.startsWith("//")) return source;
  return convertFileSrc(resolveLocalPath(source, filePath));
}

export class ImageWidget extends WidgetType {
  constructor(
    readonly source: string,
    readonly alt: string,
    readonly filePath: string,
  ) {
    super();
  }

  eq(other: ImageWidget): boolean {
    return (
      other.source === this.source &&
      other.alt === this.alt &&
      other.filePath === this.filePath
    );
  }

  toDOM(): HTMLElement {
    const frame = document.createElement("span");
    frame.className = "cm-live-image-frame";

    const image = document.createElement("img");
    image.className = "cm-live-image";
    image.src = resolveImageSource(this.source, this.filePath);
    image.alt = this.alt;
    image.loading = "lazy";
    image.addEventListener("error", () => {
      frame.classList.add("cm-live-image-error");
      frame.textContent = this.alt || "Image could not be loaded";
    });
    frame.append(image);
    return frame;
  }

  ignoreEvent(): boolean {
    return true;
  }
}
