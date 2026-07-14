import { useEffect, useRef, useState } from "react";
import { getCurrentWindow, type Theme } from "@tauri-apps/api/window";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { toast } from "sonner";

import { Editor, type EditorHandle, type EditorStatus } from "@/editor/Editor";
import { Toolbar } from "@/components/Toolbar";
import { EmptyState } from "@/components/EmptyState";
import { ExternalChangeBar } from "@/components/ExternalChangeBar";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { Toaster } from "@/components/ui/sonner";
import { CommandPalette } from "@/components/CommandPalette";
import { SettingsDialog } from "@/components/SettingsDialog";
import { StatusBar } from "@/components/StatusBar";
import { useFile } from "@/store/file";
import { useSettings } from "@/store/settings";
import { registerShortcuts } from "@/lib/shortcuts";
import { commandDefinitions, type AppCommand } from "@/lib/commands";
import { cn } from "@/lib/utils";
import type { AppUpdate } from "@/lib/updates";
import {
  basename,
  initialFile,
  pickOpenPath,
  pickHtmlExportPath,
  pickSavePath,
  readFile,
  saveFile,
  unwatchFile,
  watchFile,
} from "@/lib/files";

/** Stable, latest-render view of the actions our one-time listeners call. */
interface AppApi {
  openPath: (path: string) => Promise<void>;
  openViaDialog: () => Promise<void>;
  newFile: () => Promise<void>;
  save: () => Promise<boolean>;
  saveAs: () => Promise<boolean>;
  checkForUpdates: (silent?: boolean) => Promise<void>;
  handleExternalChange: () => Promise<void>;
  runGuarded: (proceed: () => void) => void;
}

function App() {
  const editorRef = useRef<EditorHandle>(null);
  /** Content that currently matches what's on disk (the dirty baseline). */
  const savedContentRef = useRef<string>("");
  /** Disk content stashed while the reload/keep-mine bar is shown. */
  const externalDiskRef = useRef<string>("");
  const autosaveTimerRef = useRef<number | null>(null);

  const active = useFile((s) => s.active);
  const dirty = useFile((s) => s.dirty);
  const path = useFile((s) => s.path);
  const externalChanged = useFile((s) => s.externalChanged);
  const autosave = useSettings((s) => s.autosave);
  const theme = useSettings((s) => s.theme);
  const editorPreferences = useSettings((s) => s.editor);
  const recentFiles = useSettings((s) => s.recentFiles);

  const fileName = path ? basename(path) : "Untitled";

  const [guardOpen, setGuardOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [osTheme, setOsTheme] = useState<Theme>(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
  );
  const [editorStatus, setEditorStatus] = useState<EditorStatus>({
    words: 0,
    characters: 0,
    line: 1,
    column: 1,
  });
  const pendingProceedRef = useRef<(() => void) | null>(null);

  // --- Buffer / file operations -------------------------------------------

  /** Load `content` into the editor and adopt `path` as the buffer identity. */
  function loadBuffer(content: string, bufferPath: string | null) {
    savedContentRef.current = content;
    editorRef.current?.setContent(content);
    useFile.getState().open(bufferPath);
    editorRef.current?.focus();
  }

  async function writeTo(targetPath: string): Promise<boolean> {
    const content = editorRef.current?.getContent() ?? "";
    try {
      await saveFile(targetPath, content);
      savedContentRef.current = content;
      const store = useFile.getState();
      // Edits typed while the write was in flight must keep the buffer dirty.
      const stillDirty = (editorRef.current?.getContent() ?? "") !== content;
      if (store.path !== targetPath) {
        if (store.path) await unwatchFile(store.path).catch(() => {});
        store.open(targetPath);
        store.setDirty(stillDirty);
        await watchFile(targetPath).catch(() => {});
        await useSettings.getState().addRecent(targetPath);
      } else {
        store.setDirty(stillDirty);
        store.setExternalChanged(false);
      }
      return true;
    } catch (e) {
      toast.error(String(e));
      return false;
    }
  }

  async function saveAs(): Promise<boolean> {
    const current = useFile.getState().path;
    const target = await pickSavePath(current ?? "untitled.md");
    if (!target) return false;
    return writeTo(target);
  }

  async function save(): Promise<boolean> {
    const current = useFile.getState().path;
    return current ? writeTo(current) : saveAs();
  }

  async function openPath(target: string): Promise<void> {
    try {
      const content = await readFile(target);
      const prev = useFile.getState().path;
      if (prev && prev !== target) await unwatchFile(prev).catch(() => {});
      loadBuffer(content, target);
      await watchFile(target).catch(() => {});
      await useSettings.getState().addRecent(target);
    } catch (e) {
      toast.error(String(e));
      // A path that won't open is usually gone/renamed — drop it from recents.
      await useSettings.getState().removeRecent(target);
    }
  }

  async function openViaDialog(): Promise<void> {
    const target = await pickOpenPath();
    if (target) await openPath(target);
  }

  async function newFile(): Promise<void> {
    const prev = useFile.getState().path;
    if (prev) await unwatchFile(prev).catch(() => {});
    loadBuffer("", null);
  }

  async function handleExternalChange(): Promise<void> {
    const store = useFile.getState();
    if (!store.active || !store.path) return;
    let disk: string;
    try {
      disk = await readFile(store.path);
    } catch {
      return; // File may have been removed mid-edit; leave the buffer alone.
    }
    if (disk === savedContentRef.current) return; // No real change / our own save.
    if (store.dirty) {
      // Park any pending autosave so it can't clobber the on-disk version
      // while the user decides between reload and keep-mine.
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      externalDiskRef.current = disk;
      store.setExternalChanged(true);
    } else {
      loadBuffer(disk, store.path);
      toast("Reloaded from disk");
    }
  }

  async function exportHtml(): Promise<void> {
    const markdown = editorRef.current?.getContent() ?? "";
    const defaultPath = path
      ? path.replace(/\.(md|markdown|txt)$/i, "") + ".html"
      : "untitled.html";
    const target = await pickHtmlExportPath(defaultPath);
    if (!target) return;
    try {
      const { markdownDocument } = await import("@/lib/export");
      const html = await markdownDocument(
        markdown,
        fileName.replace(/\.[^.]+$/, ""),
        theme === "system" ? osTheme : theme,
      );
      await saveFile(target, html);
      toast.success(`Exported ${basename(target)}`);
    } catch (error) {
      toast.error(`HTML export failed: ${String(error)}`);
    }
  }

  async function printPdf(): Promise<void> {
    try {
      const { markdownDocument, printDocument } = await import("@/lib/export");
      const html = await markdownDocument(
        editorRef.current?.getContent() ?? "",
        fileName.replace(/\.[^.]+$/, ""),
        theme === "system" ? osTheme : theme,
      );
      await printDocument(html);
    } catch (error) {
      toast.error(`Print view failed: ${String(error)}`);
    }
  }

  async function installUpdate(update: AppUpdate): Promise<void> {
    const toastId = toast.loading(
      `Downloading bettermarkdown ${update.version}…`,
    );
    try {
      const { installAppUpdate } = await import("@/lib/updates");
      await installAppUpdate(update);
    } catch (error) {
      toast.error(`Update failed: ${String(error)}`, { id: toastId });
    }
  }

  async function checkForUpdates(silent = false): Promise<void> {
    try {
      const { checkForAppUpdate } = await import("@/lib/updates");
      const update = await checkForAppUpdate();
      if (!update) {
        if (!silent) toast.success("bettermarkdown is up to date");
        return;
      }
      toast.info(`bettermarkdown ${update.version} is available`, {
        description: update.body || "Download the update and restart the app.",
        duration: Infinity,
        action: {
          label: "Update & restart",
          onClick: () =>
            runGuarded(() => {
              void installUpdate(update);
            }),
        },
      });
    } catch (error) {
      if (!silent) toast.error(`Could not check for updates: ${String(error)}`);
    }
  }

  // --- Editor change / autosave -------------------------------------------

  function scheduleAutosave() {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      const s = useFile.getState();
      // Never autosave over an unresolved external change; the reload bar
      // decides which version wins.
      if (s.path && s.dirty && !s.externalChanged) void save();
    }, 2000);
  }

  function handleDocChange(content: string) {
    const isDirty = content !== savedContentRef.current;
    useFile.getState().setDirty(isDirty);
    if (isDirty && useSettings.getState().autosave) scheduleAutosave();
  }

  // --- Unsaved-changes guard ----------------------------------------------

  function runGuarded(proceed: () => void) {
    if (useFile.getState().dirty) {
      pendingProceedRef.current = proceed;
      setGuardOpen(true);
    } else {
      proceed();
    }
  }

  async function guardSave() {
    if (!(await save())) return; // Cancelled Save As or failed — keep dialog open.
    setGuardOpen(false);
    const proceed = pendingProceedRef.current;
    pendingProceedRef.current = null;
    proceed?.();
  }

  function guardDontSave() {
    setGuardOpen(false);
    const proceed = pendingProceedRef.current;
    pendingProceedRef.current = null;
    proceed?.();
  }

  function guardCancel() {
    setGuardOpen(false);
    pendingProceedRef.current = null;
  }

  // Latest actions for the once-registered listeners below. Refreshed on every
  // render (no deps) so listeners always call current closures without needing
  // to re-subscribe. Declared first so it runs before the listener effects.
  const apiRef = useRef<AppApi | null>(null);
  useEffect(() => {
    apiRef.current = {
      openPath,
      openViaDialog,
      newFile,
      save,
      saveAs,
      checkForUpdates,
      handleExternalChange,
      runGuarded,
    };
  });

  function runCommand(id: string) {
    switch (id) {
      case "file.new":
        runGuarded(() => void newFile());
        break;
      case "file.open":
        runGuarded(() => void openViaDialog());
        break;
      case "file.save":
        void save();
        break;
      case "file.saveAs":
        void saveAs();
        break;
      case "file.exportHtml":
        void exportHtml();
        break;
      case "file.print":
        void printPdf();
        break;
      case "app.checkUpdates":
        void checkForUpdates();
        break;
      case "edit.search":
        editorRef.current?.openSearch();
        break;
      case "edit.bold":
        editorRef.current?.toggleBold();
        break;
      case "edit.italic":
        editorRef.current?.toggleItalic();
        break;
      case "edit.code":
        editorRef.current?.toggleInlineCode();
        break;
      case "edit.link":
        editorRef.current?.toggleLink();
        break;
      case "view.settings":
        setSettingsOpen(true);
        break;
      case "view.commands":
        setCommandsOpen(true);
        break;
    }
  }

  const commands: AppCommand[] = commandDefinitions.map((definition) => ({
    ...definition,
    enabled: definition.requiresEditor ? active : undefined,
    run: () => runCommand(definition.id),
  }));
  const commandsRef = useRef<AppCommand[]>([]);
  useEffect(() => {
    commandsRef.current = commands;
  });

  // --- Effects: startup, shortcuts, OS + Tauri events ---------------------

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await useSettings.getState().hydrate();
      const launch = await initialFile();
      if (!cancelled && launch) await apiRef.current?.openPath(launch);
      if (!cancelled && import.meta.env.PROD) {
        void apiRef.current?.checkForUpdates(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const shortcutMap = Object.fromEntries(
      commandsRef.current
        .filter((command) => command.shortcut)
        .map((command) => [
          command.shortcut as string,
          () => {
            const current = commandsRef.current.find(
              (candidate) => candidate.id === command.id,
            );
            if (current?.enabled !== false) current?.run();
          },
        ]),
    );
    return registerShortcuts(shortcutMap);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onMediaChange = (event: MediaQueryListEvent) =>
      setOsTheme(event.matches ? "dark" : "light");
    media.addEventListener("change", onMediaChange);

    let disposed = false;
    let unlisten: UnlistenFn | undefined;
    const win = getCurrentWindow();
    void win
      .theme()
      .then((current) => {
        if (!disposed && current) setOsTheme(current);
      })
      .catch(() => {});
    void win
      .onThemeChanged(({ payload }) => setOsTheme(payload))
      .then((cleanup) => {
        if (disposed) cleanup();
        else unlisten = cleanup;
      })
      .catch(() => {});

    return () => {
      disposed = true;
      unlisten?.();
      media.removeEventListener("change", onMediaChange);
    };
  }, []);

  useEffect(() => {
    const effective = theme === "system" ? osTheme : theme;
    document.documentElement.classList.toggle("dark", effective === "dark");
    document.documentElement.style.colorScheme = effective;
    void getCurrentWindow()
      .setTheme(theme === "system" ? null : theme)
      .catch(() => {});
  }, [osTheme, theme]);

  useEffect(() => {
    const unlisteners: UnlistenFn[] = [];
    let disposed = false;
    const track = (p: Promise<UnlistenFn>) =>
      void p.then((u) => (disposed ? u() : unlisteners.push(u)));

    track(
      listen<string>("open-file", (event) => {
        const p = event.payload;
        apiRef.current?.runGuarded(() => void apiRef.current?.openPath(p));
      }),
    );
    track(
      listen("file-changed", () => void apiRef.current?.handleExternalChange()),
    );

    return () => {
      disposed = true;
      unlisteners.forEach((u) => u());
    };
  }, []);

  useEffect(() => {
    const win = getCurrentWindow();
    const unlisteners: UnlistenFn[] = [];
    let disposed = false;
    const track = (p: Promise<UnlistenFn>) =>
      void p.then((u) => (disposed ? u() : unlisteners.push(u)));

    track(
      win.onCloseRequested((event) => {
        if (useFile.getState().dirty) {
          event.preventDefault();
          apiRef.current?.runGuarded(() => void getCurrentWindow().destroy());
        }
      }),
    );
    track(
      win.onDragDropEvent((event) => {
        if (event.payload.type === "drop") {
          const paths = event.payload.paths;
          const md =
            paths.find((p) => /\.(md|markdown|txt)$/i.test(p)) ?? paths[0];
          if (md) {
            apiRef.current?.runGuarded(() => void apiRef.current?.openPath(md));
          }
        }
      }),
    );

    return () => {
      disposed = true;
      unlisteners.forEach((u) => u());
    };
  }, []);

  useEffect(() => {
    const title = active
      ? `${dirty ? "● " : ""}${path ? basename(path) : "Untitled"} — bettermarkdown`
      : "bettermarkdown";
    void getCurrentWindow().setTitle(title);
  }, [active, dirty, path]);

  // --- Render --------------------------------------------------------------

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {active && (
        <Toolbar
          fileName={fileName}
          dirty={dirty}
          autosave={autosave}
          onNew={() => runGuarded(() => void newFile())}
          onOpen={() => runGuarded(() => void openViaDialog())}
          onSave={() => void save()}
          onToggleAutosave={() =>
            void useSettings.getState().setAutosave(!autosave)
          }
          onOpenCommands={() => setCommandsOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}
      {active && externalChanged && (
        <ExternalChangeBar
          onReload={() => {
            const p = useFile.getState().path;
            if (p) loadBuffer(externalDiskRef.current, p);
            useFile.getState().setExternalChanged(false);
          }}
          onKeepMine={() => {
            useFile.getState().setExternalChanged(false);
            if (useSettings.getState().autosave) scheduleAutosave();
          }}
        />
      )}

      <div className="relative min-h-0 flex-1">
        {/* Editor stays mounted (only visually hidden on the empty state) so its
            imperative handle is ready before the first open/new. */}
        <div className={cn("absolute inset-0", !active && "invisible")}>
          <Editor
            ref={editorRef}
            filePath={path}
            onDocChange={handleDocChange}
            preferences={editorPreferences}
            onStatusChange={setEditorStatus}
          />
        </div>
        {!active && (
          <div className="absolute inset-0 bg-background">
            <EmptyState
              recentFiles={recentFiles}
              onNew={() => void newFile()}
              onOpen={() => void openViaDialog()}
              onOpenRecent={(p) => void openPath(p)}
              onRemoveRecent={(p) =>
                void useSettings.getState().removeRecent(p)
              }
              onOpenCommands={() => setCommandsOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          </div>
        )}
      </div>

      {active && (
        <StatusBar {...editorStatus} dirty={dirty} autosave={autosave} />
      )}

      <CommandPalette
        open={commandsOpen}
        onOpenChange={setCommandsOpen}
        commands={commands}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      <UnsavedChangesDialog
        open={guardOpen}
        fileName={fileName}
        onSave={() => void guardSave()}
        onDontSave={guardDontSave}
        onCancel={guardCancel}
      />
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;
