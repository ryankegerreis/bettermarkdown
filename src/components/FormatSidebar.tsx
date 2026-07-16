import { useState, type MouseEvent, type ReactNode } from "react";
import {
  Bold,
  ChevronDown,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  SquareCode,
  Strikethrough,
  Table2,
  TextQuote,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { FormatAction } from "@/editor/livePreview/commands";
import { cn } from "@/lib/utils";

interface FormatSidebarProps {
  onFormat: (action: FormatAction) => void;
}

interface FormatRowProps {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  onClick: () => void;
}

const keepEditorFocus = (event: MouseEvent) => event.preventDefault();

function FormatRow({ icon: Icon, label, shortcut, onClick }: FormatRowProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-8 w-full justify-start gap-2.5 px-2 text-[13px] font-normal text-foreground"
      onMouseDown={keepEditorFocus}
      onClick={onClick}
    >
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <kbd className="text-[10px] tracking-wide text-muted-foreground">
          {shortcut}
        </kbd>
      )}
    </Button>
  );
}

interface FormatSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

function FormatSection({
  title,
  defaultOpen = true,
  children,
}: FormatSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section>
      <button
        type="button"
        className="flex h-8 w-full items-center gap-1.5 px-2 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase hover:text-foreground"
        aria-expanded={open}
        onMouseDown={keepEditorFocus}
        onClick={() => setOpen((current) => !current)}
      >
        <ChevronDown
          className={cn(
            "size-3 transition-transform duration-150",
            !open && "-rotate-90",
          )}
        />
        {title}
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-150 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="pb-1">{children}</div>
        </div>
      </div>
    </section>
  );
}

function TablePicker({ onFormat }: FormatSidebarProps) {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState({ rows: 2, cols: 2 });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-8 w-full justify-start gap-2.5 px-2 text-[13px] font-normal text-foreground"
          onMouseDown={keepEditorFocus}
        >
          <Table2 className="size-3.5 text-muted-foreground" />
          <span className="flex-1 text-left">Table</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="left"
        align="end"
        sideOffset={8}
        className="w-auto p-3"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div className="mb-2 flex items-baseline justify-between gap-5">
          <span className="text-xs font-medium">Insert table</span>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {size.cols} × {size.rows}
          </span>
        </div>
        <div
          className="grid grid-cols-8 gap-1"
          role="grid"
          aria-label="Choose table size"
        >
          {Array.from({ length: 6 }, (_, rowIndex) =>
            Array.from({ length: 8 }, (_, colIndex) => {
              const rows = rowIndex + 1;
              const cols = colIndex + 1;
              const selected = rows <= size.rows && cols <= size.cols;
              return (
                <button
                  key={`${rows}-${cols}`}
                  type="button"
                  role="gridcell"
                  aria-label={`${cols} columns by ${rows} rows`}
                  className={cn(
                    "size-4 rounded-[2px] border transition-colors",
                    selected
                      ? "border-primary bg-primary/25"
                      : "border-border bg-background hover:border-primary/60",
                  )}
                  onMouseDown={keepEditorFocus}
                  onMouseEnter={() => setSize({ rows, cols })}
                  onFocus={() => setSize({ rows, cols })}
                  onClick={() => {
                    onFormat({ kind: "table", rows, cols });
                    setOpen(false);
                  }}
                />
              );
            }),
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function FormatSidebar({ onFormat }: FormatSidebarProps) {
  return (
    <aside
      className="h-full w-52 shrink-0 overflow-y-auto border-l border-border bg-muted/20 px-2 py-2"
      aria-label="Formatting"
    >
      <FormatSection title="Headings">
        <FormatRow
          icon={Heading1}
          label="Heading 1"
          onClick={() => onFormat({ kind: "heading", level: 1 })}
        />
        <FormatRow
          icon={Heading2}
          label="Heading 2"
          onClick={() => onFormat({ kind: "heading", level: 2 })}
        />
        <FormatRow
          icon={Heading3}
          label="Heading 3"
          onClick={() => onFormat({ kind: "heading", level: 3 })}
        />
      </FormatSection>

      <FormatSection title="Text style">
        <FormatRow
          icon={Bold}
          label="Bold"
          shortcut="⌘B"
          onClick={() => onFormat({ kind: "bold" })}
        />
        <FormatRow
          icon={Italic}
          label="Italic"
          shortcut="⌘I"
          onClick={() => onFormat({ kind: "italic" })}
        />
        <FormatRow
          icon={Strikethrough}
          label="Strikethrough"
          onClick={() => onFormat({ kind: "strikethrough" })}
        />
        <FormatRow
          icon={Code2}
          label="Inline code"
          shortcut="⌘E"
          onClick={() => onFormat({ kind: "inlineCode" })}
        />
      </FormatSection>

      <FormatSection title="Lists">
        <FormatRow
          icon={List}
          label="Bullet list"
          onClick={() => onFormat({ kind: "bulletList" })}
        />
        <FormatRow
          icon={ListOrdered}
          label="Numbered list"
          onClick={() => onFormat({ kind: "numberedList" })}
        />
        <FormatRow
          icon={ListChecks}
          label="Task list"
          onClick={() => onFormat({ kind: "taskList" })}
        />
      </FormatSection>

      <FormatSection title="Blocks">
        <FormatRow
          icon={TextQuote}
          label="Blockquote"
          onClick={() => onFormat({ kind: "blockquote" })}
        />
        <FormatRow
          icon={SquareCode}
          label="Code block"
          onClick={() => onFormat({ kind: "codeBlock" })}
        />
        <FormatRow
          icon={Minus}
          label="Horizontal rule"
          onClick={() => onFormat({ kind: "horizontalRule" })}
        />
      </FormatSection>

      <FormatSection title="Insert">
        <FormatRow
          icon={Link}
          label="Link"
          shortcut="⌘K"
          onClick={() => onFormat({ kind: "link" })}
        />
        <FormatRow
          icon={Image}
          label="Image"
          onClick={() => onFormat({ kind: "image" })}
        />
        <TablePicker onFormat={onFormat} />
      </FormatSection>
    </aside>
  );
}
