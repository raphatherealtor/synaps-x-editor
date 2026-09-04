import { useEffect, useState } from "react";
import {
  Activity,
  FileText,
  GitBranch,
  LayoutGrid,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
} from "lucide-react";
import { cn, formatClock } from "@/lib/utils";
import {
  noteBlockCount,
  noteWordCount,
  selectActiveNote,
  useEditorStore,
} from "@/lib/editor/store";
import { SynapsMark, SynapsWordmark } from "./SynapsMark";

export function StorageBanner() {
  const warning = useEditorStore((s) => s.storageWarning);
  const setWarning = useEditorStore((s) => s.setStorageWarning);
  if (!warning) return null;
  return (
    <div className="mx-3 mb-1 flex items-start gap-2 rounded-lg bg-surface px-3 py-2 shadow-border">
      <p className="min-w-0 flex-1 text-xs text-warn">{warning}</p>
      <button
        type="button"
        className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-muted"
        onClick={() => setWarning(null)}
      >
        Dismiss
      </button>
    </div>
  );
}

export function HeaderBar() {
  const [clock, setClock] = useState(() => formatClock());
  const setTab = useEditorStore((s) => s.setTab);

  useEffect(() => {
    const t = window.setInterval(() => setClock(formatClock()), 15_000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <header className="flex items-center gap-2 px-4 pb-1 pt-[max(10px,env(safe-area-inset-top))]">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="hidden font-mono text-[11px] tabular-nums text-fg-subtle sm:inline">
          {clock}
        </span>
        <SynapsWordmark />
      </div>
      <SynapsMark className="h-7" />
      <div className="flex flex-1 items-center justify-end gap-2">
        <span className="chip text-online">
          <span className="size-1.5 rounded-full bg-online" />
          Local
        </span>
        <button
          type="button"
          aria-label="Open notes"
          onClick={() => setTab("notes")}
          className="icon-btn size-9 min-h-9 min-w-9"
        >
          <LayoutGrid className="size-4" />
        </button>
      </div>
    </header>
  );
}

export function ContextBar() {
  const note = useEditorStore(selectActiveNote);
  const setTab = useEditorStore((s) => s.setTab);
  const setProject = useEditorStore((s) => s.setProject);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note?.project ?? "");

  useEffect(() => {
    setDraft(note?.project ?? "");
  }, [note?.project]);

  if (!note) return null;

  return (
    <div className="px-3 pb-2">
      <div className="glow-line mb-2" />
      <div className="flex items-center gap-2">
        {editing ? (
          <input
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              setProject(draft);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setProject(draft);
                setEditing(false);
              }
              if (e.key === "Escape") setEditing(false);
            }}
            className="min-w-0 flex-1 rounded-md bg-surface px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-fg shadow-border"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="min-w-0 flex-1 truncate text-left font-mono text-[11px] uppercase tracking-[0.16em] text-fg-muted"
          >
            Project
            <span className="text-fg-subtle"> // </span>
            <span className="text-fg">{note.project}</span>
          </button>
        )}
        <span className="chip text-fg-muted">Device only</span>
        <button
          type="button"
          aria-label="Note options"
          onClick={() => setTab("settings")}
          className="icon-btn size-8 min-h-8 min-w-8"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function BottomUtilityBar() {
  const note = useEditorStore(selectActiveNote);
  const saveState = useEditorStore((s) => s.saveState);
  const focusMode = useEditorStore((s) => s.settings.focusMode);
  const setFocusMode = useEditorStore((s) => s.setFocusMode);

  const words = note ? noteWordCount(note) : 0;
  const blocks = note ? noteBlockCount(note) : 0;

  return (
    <div className="flex items-center gap-2 border-t border-border px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-fg-subtle">Words</p>
        <p className="font-mono text-xs tabular-nums text-fg">{words.toLocaleString()}</p>
      </div>
      <button
        type="button"
        onClick={() => setFocusMode(!focusMode)}
        className={cn(
          "flex min-w-0 flex-1 flex-col items-center rounded-md px-2 py-0.5",
          focusMode ? "text-cyan" : "text-fg-muted",
        )}
      >
        <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.16em]">
          <Activity className="size-3" />
          Focus mode
        </span>
        <span className="font-mono text-[11px] uppercase tracking-widest">
          {focusMode ? "Active" : "Standby"}
        </span>
      </button>
      <div className="min-w-0 flex-1 text-right">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-fg-subtle">
          Device save
        </p>
        <p
          className={cn(
            "inline-flex items-center gap-1 font-mono text-xs uppercase",
            saveState === "saving"
              ? "text-warn"
              : saveState === "offline"
                ? "text-danger"
                : "text-online",
          )}
        >
          <RefreshCw className={cn("size-3", saveState === "saving" && "animate-spin")} />
          {saveState === "saving" ? "Writing" : saveState === "offline" ? "Not saved" : "Saved"}
        </p>
      </div>
      <span className="sr-only">{blocks} blocks</span>
    </div>
  );
}

export function BottomNav() {
  const tab = useEditorStore((s) => s.tab);
  const setTab = useEditorStore((s) => s.setTab);
  const addBlock = useEditorStore((s) => s.addBlock);
  const activeBlockId = useEditorStore((s) => s.activeBlockId);
  const createNote = useEditorStore((s) => s.createNote);

  const items = [
    { id: "editor" as const, label: "Editor", icon: Pencil },
    { id: "graph" as const, label: "Index", icon: GitBranch },
  ];
  const right = [
    { id: "notes" as const, label: "Notes", icon: FileText },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <nav className="flex items-end justify-between gap-1 border-t border-border px-2 pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
      {items.map((item) => (
        <NavItem
          key={item.id}
          label={item.label}
          icon={item.icon}
          active={tab === item.id}
          onClick={() => setTab(item.id)}
        />
      ))}
      <button
        type="button"
        aria-label={tab === "notes" ? "New note" : "Add block"}
        onClick={() => {
          if (tab === "notes") createNote();
          else {
            setTab("editor");
            addBlock(activeBlockId, "body");
          }
        }}
        className="mb-1 grid size-14 place-items-center rounded-full bg-bg text-cyan shadow-glow-title transition-[scale] duration-150 ease-out active:scale-[0.96]"
      >
        <span className="grid size-12 place-items-center rounded-full shadow-[0_0_0_1.5px_var(--color-cyan)]">
          <Plus className="size-6" strokeWidth={2} />
        </span>
      </button>
      {right.map((item) => (
        <NavItem
          key={item.id}
          label={item.label}
          icon={item.icon}
          active={tab === item.id}
          onClick={() => setTab(item.id)}
        />
      ))}
    </nav>
  );
}

function NavItem({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: typeof Pencil;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-12 min-w-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg transition-[color,background-color] duration-150 ease-out",
        active ? "text-cyan" : "text-fg-muted",
      )}
    >
      <Icon className="size-4" strokeWidth={active ? 2.2 : 1.8} />
      <span className="font-mono text-[9px] uppercase tracking-[0.14em]">{label}</span>
    </button>
  );
}

export function FocusChip() {
  const setFocusMode = useEditorStore((s) => s.setFocusMode);
  return (
    <button
      type="button"
      onClick={() => setFocusMode(false)}
      className="chip absolute right-3 top-[max(12px,env(safe-area-inset-top))] z-20 text-cyan"
    >
      <Activity className="size-3" />
      Exit focus
    </button>
  );
}
