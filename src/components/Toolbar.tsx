import {
  Command,
  FilePlus2,
  FolderOpen,
  PanelRight,
  Save,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  fileName: string;
  dirty: boolean;
  autosave: boolean;
  sidebarOpen: boolean;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onToggleAutosave: () => void;
  onToggleSidebar: () => void;
  onOpenCommands: () => void;
  onOpenSettings: () => void;
}

/** Slim header with the file name, dirty indicator, and core file actions. */
export function Toolbar({
  fileName,
  dirty,
  autosave,
  sidebarOpen,
  onNew,
  onOpen,
  onSave,
  onToggleAutosave,
  onToggleSidebar,
  onOpenCommands,
  onOpenSettings,
}: ToolbarProps) {
  return (
    <header className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-2">
      <Button variant="ghost" size="icon" onClick={onNew} title="New (⌘N)">
        <FilePlus2 className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onOpen} title="Open (⌘O)">
        <FolderOpen className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onSave} title="Save (⌘S)">
        <Save className="size-4" />
      </Button>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5">
        {dirty && (
          <span
            className="size-1.5 shrink-0 rounded-full bg-foreground"
            aria-label="Unsaved changes"
          />
        )}
        <span className="truncate text-sm text-muted-foreground">
          {fileName}
        </span>
      </div>

      <button
        type="button"
        onClick={onToggleAutosave}
        className={cn(
          "rounded-md px-2 py-1 text-xs font-medium",
          autosave
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent",
        )}
        title="Toggle autosave"
      >
        Autosave {autosave ? "on" : "off"}
      </button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onToggleSidebar}
        aria-pressed={sidebarOpen}
        title="Formatting sidebar (⌘⇧B)"
      >
        <PanelRight className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onOpenCommands}
        title="Commands (⌘⇧P)"
      >
        <Command className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onOpenSettings}
        title="Settings (⌘,)"
      >
        <Settings className="size-3.5" />
      </Button>
    </header>
  );
}
