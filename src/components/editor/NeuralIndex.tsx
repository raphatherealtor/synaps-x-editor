import { GitBranch, Image as ImageIcon, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { firstLine } from "@/lib/editor/markdown";
import { TYPE_META } from "@/lib/editor/types";
import { TYPE_TONE } from "@/lib/editor/theme";
import {
  noteTitle,
  selectActiveNote,
  useEditorStore,
} from "@/lib/editor/store";

export function NeuralIndex() {
  const note = useEditorStore(selectActiveNote);
  const setTab = useEditorStore((s) => s.setTab);
  const setActiveBlock = useEditorStore((s) => s.setActiveBlock);
  const toggleLink = useEditorStore((s) => s.toggleLink);
  const activeId = useEditorStore((s) => s.activeBlockId);

  if (!note) return null;

  return (
    <div className="flex flex-1 flex-col px-4 py-3">
      <div className="mb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">
          Neural index
        </p>
        <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-fg text-balance">
          {noteTitle(note)}
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          A linear synapse map of this note. Tap a node to edit it. Link from the
          active block.
        </p>
      </div>

      <ol className="relative flex flex-col">
        {note.blocks.map((block, i) => {
          const tone = TYPE_TONE[block.semanticType];
          const label =
            block.semanticType === "image"
              ? block.imageAlt || "Image"
              : firstLine(block.content, TYPE_META[block.semanticType].label);
          const isActive = block.id === activeId;
          const linked = activeId
            ? note.blocks
                .find((b) => b.id === activeId)
                ?.linkedNodeIds.includes(block.id)
            : false;

          return (
            <li key={block.id} className="relative flex gap-3">
              <div className="flex w-8 flex-col items-center">
                <button
                  type="button"
                  aria-label={`Jump to ${label}`}
                  onClick={() => {
                    setActiveBlock(block.id);
                    setTab("editor");
                  }}
                  className={cn(
                    "relative z-10 mt-1 size-3 rounded-full shadow-border",
                    tone.swatch,
                    isActive && "scale-125",
                  )}
                />
                {i < note.blocks.length - 1 ? (
                  <div className="w-px flex-1 bg-border" />
                ) : (
                  <div className="flex-1" />
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveBlock(block.id);
                  setTab("editor");
                }}
                className={cn(
                  "mb-2 min-w-0 flex-1 rounded-lg px-3 py-2 text-left shadow-border transition-[box-shadow] duration-150 ease-out",
                  isActive ? tone.glow : "bg-surface/70",
                )}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
                  {String(i + 1).padStart(2, "0")} · {TYPE_META[block.semanticType].label}
                </p>
                <p className={cn("mt-0.5 truncate text-sm", tone.text)}>
                  {block.semanticType === "image" ? (
                    <span className="inline-flex items-center gap-1">
                      <ImageIcon className="size-3.5" />
                      {label}
                    </span>
                  ) : (
                    label
                  )}
                </p>
                {block.linkedNodeIds.length > 0 ? (
                  <p className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] text-fg-subtle">
                    <GitBranch className="size-3" />
                    {block.linkedNodeIds.length} synapse
                    {block.linkedNodeIds.length === 1 ? "" : "s"}
                  </p>
                ) : null}
              </button>
              {activeId && activeId !== block.id ? (
                <button
                  type="button"
                  aria-label={linked ? "Unlink" : "Link to active"}
                  onClick={() => toggleLink(activeId, block.id)}
                  className={cn(
                    "icon-btn mt-2 size-9 min-h-9 min-w-9",
                    linked && "is-active",
                  )}
                >
                  <Link2 className="size-4" />
                </button>
              ) : (
                <span className="w-9" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
