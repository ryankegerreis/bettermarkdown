import { FileText } from "lucide-react";

function App() {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-4 bg-background text-foreground">
      <div className="flex items-center gap-3">
        <FileText className="size-8 text-muted-foreground" />
        <h1 className="text-3xl font-semibold tracking-tight">
          bettermarkdown
        </h1>
      </div>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        A fast, disk-first markdown editor with Obsidian-style live preview.
      </p>
      <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
        M0 · scaffold
      </span>
    </main>
  );
}

export default App;
