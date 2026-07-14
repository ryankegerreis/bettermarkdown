import type { LucideIcon } from "lucide-react";
import {
  Bold,
  Code2,
  Download,
  FilePlus2,
  FolderOpen,
  Italic,
  Link,
  Printer,
  RefreshCw,
  Save,
  SaveAll,
  Search,
  Settings,
} from "lucide-react";

export interface AppCommand {
  id: string;
  title: string;
  section: "File" | "Edit" | "View";
  shortcut?: string;
  keys?: string;
  icon: LucideIcon;
  enabled?: boolean;
  run: () => void;
}

export type CommandDefinition = Omit<AppCommand, "run" | "enabled"> & {
  requiresEditor?: boolean;
};

export const commandDefinitions: CommandDefinition[] = [
  {
    id: "file.new",
    title: "New file",
    section: "File",
    shortcut: "mod+n",
    keys: "⌘N",
    icon: FilePlus2,
  },
  {
    id: "file.open",
    title: "Open file…",
    section: "File",
    shortcut: "mod+o",
    keys: "⌘O",
    icon: FolderOpen,
  },
  {
    id: "file.save",
    title: "Save",
    section: "File",
    shortcut: "mod+s",
    keys: "⌘S",
    icon: Save,
    requiresEditor: true,
  },
  {
    id: "file.saveAs",
    title: "Save as…",
    section: "File",
    shortcut: "mod+shift+s",
    keys: "⇧⌘S",
    icon: SaveAll,
    requiresEditor: true,
  },
  {
    id: "file.exportHtml",
    title: "Export as HTML…",
    section: "File",
    icon: Download,
    requiresEditor: true,
  },
  {
    id: "file.print",
    title: "Print / Save as PDF…",
    section: "File",
    shortcut: "mod+p",
    keys: "⌘P",
    icon: Printer,
    requiresEditor: true,
  },
  {
    id: "edit.search",
    title: "Find in file",
    section: "Edit",
    shortcut: "mod+f",
    keys: "⌘F",
    icon: Search,
    requiresEditor: true,
  },
  {
    id: "edit.bold",
    title: "Toggle bold",
    section: "Edit",
    shortcut: "mod+b",
    keys: "⌘B",
    icon: Bold,
    requiresEditor: true,
  },
  {
    id: "edit.italic",
    title: "Toggle italic",
    section: "Edit",
    shortcut: "mod+i",
    keys: "⌘I",
    icon: Italic,
    requiresEditor: true,
  },
  {
    id: "edit.code",
    title: "Toggle inline code",
    section: "Edit",
    shortcut: "mod+e",
    keys: "⌘E",
    icon: Code2,
    requiresEditor: true,
  },
  {
    id: "edit.link",
    title: "Insert link",
    section: "Edit",
    shortcut: "mod+k",
    keys: "⌘K",
    icon: Link,
    requiresEditor: true,
  },
  {
    id: "app.checkUpdates",
    title: "Check for updates…",
    section: "View",
    icon: RefreshCw,
  },
  {
    id: "view.settings",
    title: "Open settings",
    section: "View",
    shortcut: "mod+,",
    keys: "⌘,",
    icon: Settings,
  },
  {
    id: "view.commands",
    title: "Show command palette",
    section: "View",
    shortcut: "mod+shift+p",
    keys: "⇧⌘P",
    icon: Search,
  },
];
