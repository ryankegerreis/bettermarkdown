import { FilePlus2, FolderOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { basename } from "@/lib/files";

interface EmptyStateProps {
  recentFiles: string[];
  onNew: () => void;
  onOpen: () => void;
  onOpenRecent: (path: string) => void;
  onRemoveRecent: (path: string) => void;
}

/** Landing screen shown when no buffer is open. */
export function EmptyState({
  recentFiles,
  onNew,
  onOpen,
  onOpenRecent,
  onRemoveRecent,
}: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          bettermarkdown
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          A fast, disk-first markdown editor with Obsidian-style live preview.
        </p>
      </div>

      <div className="flex gap-3">
        <Button onClick={onOpen}>
          <FolderOpen className="size-4" />
          Open file
        </Button>
        <Button variant="outline" onClick={onNew}>
          <FilePlus2 className="size-4" />
          New file
        </Button>
      </div>

      {recentFiles.length > 0 && (
        <div className="w-full max-w-md">
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recent
          </p>
          <ul className="flex flex-col">
            {recentFiles.map((path) => (
              <li key={path} className="group flex items-center">
                <button
                  type="button"
                  onClick={() => onOpenRecent(path)}
                  className="flex min-w-0 flex-1 flex-col items-start rounded-md px-2 py-1.5 text-left hover:bg-accent"
                  title={path}
                >
                  <span className="truncate text-sm">{basename(path)}</span>
                  <span className="w-full truncate text-xs text-muted-foreground">
                    {path}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveRecent(path)}
                  className="ml-1 rounded-md p-1 text-muted-foreground opacity-0 hover:bg-accent hover:text-foreground group-hover:opacity-100"
                  title="Remove from recent"
                  aria-label={`Remove ${basename(path)} from recent`}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
