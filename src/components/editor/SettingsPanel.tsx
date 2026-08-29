import { Download, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { noteTitle, selectActiveNote, useEditorStore } from "@/lib/editor/store";
import type { FontScale } from "@/lib/editor/types";

export function SettingsPanel() {
  const note = useEditorStore(selectActiveNote);
  const settings = useEditorStore((s) => s.settings);
  const setFontScale = useEditorStore((s) => s.setFontScale);
  const setShowRails = useEditorStore((s) => s.setShowRails);
  const setCompact = useEditorStore((s) => s.setCompact);
  const setFocusMode = useEditorStore((s) => s.setFocusMode);
  const exportMd = useEditorStore((s) => s.exportActiveMarkdown);
  const resetDemo = useEditorStore((s) => s.resetDemo);

  const download = () => {
    if (!note) return;
    const blob = new Blob([exportMd()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${noteTitle(note).replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-3">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
          Device
        </p>
        <h2 className="mt-1 font-display text-lg font-semibold tracking-tight">
          Settings
        </h2>
      </div>

      <section className="rounded-xl bg-surface/80 p-3 shadow-border">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
          Type scale
        </p>
        <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-bg p-1">
          {(["s", "m", "l"] as FontScale[]).map((scale) => (
            <button
              key={scale}
              type="button"
              onClick={() => setFontScale(scale)}
              className={cn(
                "h-9 rounded-md font-mono text-xs uppercase tracking-[0.12em] transition-[background-color,color] duration-150 ease-out",
                settings.fontScale === scale
                  ? "bg-cyan text-bg"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              {scale === "s" ? "Small" : scale === "m" ? "Medium" : "Large"}
            </button>
          ))}
        </div>
      </section>

      <ToggleRow
        label="Block rails"
        hint="Index numbers and dotted spine"
        on={settings.showRails}
        onChange={setShowRails}
      />
      <ToggleRow
        label="Compact spacing"
        hint="Tighter stack for long notes"
        on={settings.compact}
        onChange={setCompact}
      />
      <ToggleRow
        label="Focus mode"
        hint="Hide chrome. Writing only."
        on={settings.focusMode}
        onChange={setFocusMode}
      />

      <section className="rounded-xl bg-surface/80 p-3 shadow-border">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
          Export
        </p>
        <p className="mt-1 text-sm text-fg-muted">
          Download the active note as markdown. Images stay as local references.
        </p>
        <button
          type="button"
          onClick={download}
          className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-surface-2 px-3 text-sm text-fg shadow-border transition-[scale] duration-150 ease-out active:scale-[0.96]"
        >
          <Download className="size-4" />
          Export .md
        </button>
      </section>

      <section className="rounded-xl bg-surface/80 p-3 shadow-border">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
          Restore
        </p>
        <p className="mt-1 text-sm text-fg-muted">
          Reset this device to the seeded journal. Local edits will be replaced.
        </p>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Restore the demo journal? This replaces local notes.")) {
              resetDemo();
            }
          }}
          className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-danger shadow-border transition-[scale] duration-150 ease-out active:scale-[0.96]"
        >
          <RotateCcw className="size-4" />
          Restore demo
        </button>
      </section>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex w-full items-center gap-3 rounded-xl bg-surface/80 px-3 py-3 text-left shadow-border"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-fg">{label}</span>
        <span className="block text-xs text-fg-muted">{hint}</span>
      </span>
      <span
        className={cn(
          "relative h-6 w-10 rounded-full transition-[background-color] duration-150 ease-out",
          on ? "bg-cyan" : "bg-surface-3",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-fg transition-[transform] duration-150 ease-out",
            on ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
