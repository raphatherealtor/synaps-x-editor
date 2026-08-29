import { Plus, Trash2 } from "lucide-react";
import { formatStamp } from "@/lib/utils";
import {
  noteBlockCount,
  noteTitle,
  noteWordCount,
  useEditorStore,
} from "@/lib/editor/store";

export function NotesLibrary() {
  const notes = useEditorStore((s) => s.notes);
  const activeId = useEditorStore((s) => s.activeNoteId);
  const setActiveNote = useEditorStore((s) => s.setActiveNote);
  const createNote = useEditorStore((s) => s.createNote);
  const deleteNote = useEditorStore((s) => s.deleteNote);

  return (
    <div className="flex flex-1 flex-col px-4 py-3">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
            Journal
          </p>
          <h2 className="mt-1 font-display text-lg font-semibold tracking-tight">
            Signals
          </h2>
        </div>
        <button
          type="button"
          onClick={() => createNote()}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-cyan px-3 text-sm font-medium text-bg transition-[scale] duration-150 ease-out active:scale-[0.96]"
        >
          <Plus className="size-4" />
          New
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {notes.map((note) => {
          const active = note.id === activeId;
          return (
            <li key={note.id}>
              <div
                className={
                  active
                    ? "flex items-stretch overflow-hidden rounded-xl shadow-glow-title"
                    : "flex items-stretch overflow-hidden rounded-xl bg-surface/80 shadow-border"
                }
              >
                <button
                  type="button"
                  onClick={() => setActiveNote(note.id)}
                  className="min-w-0 flex-1 px-3 py-3 text-left"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
                    {note.project}
                  </p>
                  <p className="mt-0.5 truncate font-display text-base font-medium text-fg">
                    {noteTitle(note)}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-fg-muted">
                    {noteWordCount(note)} words · {noteBlockCount(note)} blocks ·{" "}
                    {formatStamp(note.updatedAt)}
                  </p>
                </button>
                {notes.length > 1 ? (
                  <button
                    type="button"
                    aria-label={`Delete ${noteTitle(note)}`}
                    onClick={() => deleteNote(note.id)}
                    className="icon-btn m-2 size-10 min-h-10 min-w-10 self-center text-fg-subtle hover:text-danger"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
