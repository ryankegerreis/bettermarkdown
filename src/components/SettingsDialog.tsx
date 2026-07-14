import { Monitor, Moon, Sun } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useSettings,
  type EditorFont,
  type ThemePreference,
} from "@/store/settings";
import { cn } from "@/lib/utils";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const themes: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof Monitor;
}> = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const fonts: Array<{ value: EditorFont; label: string; sample: string }> = [
  { value: "sans", label: "Sans", sample: "Clean and direct" },
  { value: "serif", label: "Serif", sample: "Made for long reads" },
  { value: "mono", label: "Mono", sample: "Every mark aligned" },
];

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const autosave = useSettings((state) => state.autosave);
  const theme = useSettings((state) => state.theme);
  const editor = useSettings((state) => state.editor);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Changes are applied to the editor as you make them.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-7 px-6 py-6">
          <section className="grid gap-3" aria-labelledby="appearance-heading">
            <h3 id="appearance-heading" className="text-sm font-medium">
              Appearance
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {themes.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => void useSettings.getState().setTheme(value)}
                  className={cn(
                    "flex h-10 items-center justify-center gap-2 rounded-md border text-sm transition-colors",
                    theme === value
                      ? "border-foreground bg-foreground text-background"
                      : "bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                  aria-pressed={theme === value}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-3" aria-labelledby="type-heading">
            <div className="flex items-baseline justify-between gap-4">
              <h3 id="type-heading" className="text-sm font-medium">
                Editor type
              </h3>
              <span className="text-xs tabular-nums text-muted-foreground">
                {editor.fontSize}px · {editor.lineWidth}ch
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {fonts.map(({ value, label, sample }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    void useSettings.getState().setEditor({ fontFamily: value })
                  }
                  className={cn(
                    "grid gap-0.5 rounded-md border px-3 py-2.5 text-left transition-colors",
                    editor.fontFamily === value
                      ? "border-foreground"
                      : "hover:bg-accent",
                    value === "serif" && "font-serif",
                    value === "mono" && "font-mono",
                  )}
                  aria-pressed={editor.fontFamily === value}
                >
                  <span className="text-xs font-semibold">{label}</span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {sample}
                  </span>
                </button>
              ))}
            </div>
            <label className="grid grid-cols-[7rem_1fr] items-center gap-4 text-sm">
              <span className="text-muted-foreground">Font size</span>
              <input
                type="range"
                min="13"
                max="22"
                step="1"
                value={editor.fontSize}
                onChange={(event) =>
                  void useSettings
                    .getState()
                    .setEditor({ fontSize: Number(event.target.value) })
                }
                className="settings-range"
              />
            </label>
            <label className="grid grid-cols-[7rem_1fr] items-center gap-4 text-sm">
              <span className="text-muted-foreground">Line width</span>
              <input
                type="range"
                min="48"
                max="90"
                step="2"
                value={editor.lineWidth}
                onChange={(event) =>
                  void useSettings
                    .getState()
                    .setEditor({ lineWidth: Number(event.target.value) })
                }
                className="settings-range"
              />
            </label>
          </section>

          <section className="flex items-center justify-between gap-6 border-t pt-5">
            <div className="grid gap-0.5">
              <label htmlFor="autosave" className="text-sm font-medium">
                Autosave
              </label>
              <p className="text-xs text-muted-foreground">
                Save two seconds after you stop typing.
              </p>
            </div>
            <button
              id="autosave"
              type="button"
              role="switch"
              aria-checked={autosave}
              onClick={() => void useSettings.getState().setAutosave(!autosave)}
              className={cn(
                "relative h-6 w-10 rounded-full border transition-colors",
                autosave ? "border-primary bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-4.5 rounded-full bg-background shadow-sm transition-transform",
                  autosave ? "translate-x-4" : "translate-x-0.5",
                )}
              />
              <span className="sr-only">Toggle autosave</span>
            </button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
