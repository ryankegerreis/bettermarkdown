import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExternalChangeBarProps {
  onReload: () => void;
  onKeepMine: () => void;
}

/** Shown when the open file changes on disk while the buffer has unsaved edits. */
export function ExternalChangeBar({
  onReload,
  onKeepMine,
}: ExternalChangeBarProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border bg-accent px-4 py-2 text-sm">
      <span className="text-accent-foreground">
        This file changed on disk. Reload and lose your edits, or keep yours?
      </span>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="ghost" onClick={onKeepMine}>
          Keep mine
        </Button>
        <Button size="sm" onClick={onReload}>
          <RefreshCw className="size-3.5" />
          Reload
        </Button>
      </div>
    </div>
  );
}
