import { Command } from "cmdk";
import { Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AppCommand } from "@/lib/commands";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: AppCommand[];
}

export function CommandPalette({
  open,
  onOpenChange,
  commands,
}: CommandPaletteProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[28%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search and run a bettermarkdown command.
        </DialogDescription>
        <Command className="command-palette" loop>
          <div className="flex h-12 items-center gap-3 border-b px-4">
            <Search className="size-4 text-muted-foreground" />
            <Command.Input
              autoFocus
              placeholder="Type a command…"
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              esc
            </kbd>
          </div>
          <Command.List className="max-h-[min(390px,55vh)] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-10 text-center text-sm text-muted-foreground">
              No matching command
            </Command.Empty>
            {(["File", "Edit", "View"] as const).map((section) => {
              const items = commands.filter(
                (command) => command.section === section,
              );
              return (
                <Command.Group
                  key={section}
                  heading={section}
                  className="command-group"
                >
                  {items.map((command) => {
                    const Icon = command.icon;
                    return (
                      <Command.Item
                        key={command.id}
                        value={`${command.title} ${section}`}
                        disabled={command.enabled === false}
                        onSelect={() => {
                          onOpenChange(false);
                          command.run();
                        }}
                        className="command-item"
                      >
                        <Icon className="size-4" />
                        <span className="flex-1">{command.title}</span>
                        {command.keys && <kbd>{command.keys}</kbd>}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              );
            })}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
