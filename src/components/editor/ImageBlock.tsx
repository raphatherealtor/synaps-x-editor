import { memo, useRef } from "react";
import { ImagePlus, Replace, Trash2 } from "lucide-react";
import { ingestAndReplace } from "@/lib/editor/ingest-ui";
import { useEditorStore } from "@/lib/editor/store";
import { useAssetUrl } from "./useAssetUrl";

export const ImageBlock = memo(function ImageBlock({ id }: { id: string }) {
  const block = useEditorStore((s) => {
    const note = s.notes.find((n) => n.id === s.activeNoteId);
    return note?.blocks.find((b) => b.id === id);
  });
  const active = useEditorStore((s) => s.activeBlockId === id);
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const deleteBlock = useEditorStore((s) => s.deleteBlock);
  const setActiveBlock = useEditorStore((s) => s.setActiveBlock);
  const inputRef = useRef<HTMLInputElement>(null);
  const url = useAssetUrl(block?.imageAssetId, block?.imageSrc);

  if (!block) return null;

  const width = Math.min(100, Math.max(40, block.imageWidth ?? 100));

  const onFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    void ingestAndReplace(id, file);
  };

  return (
    <div onClick={() => setActiveBlock(id)} className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          onFile(file);
        }}
      />

      {url ? (
        <figure className="mx-auto" style={{ width: `${width}%` }}>
          <img
            src={url}
            alt={block.imageAlt || "Note image"}
            className="framed aspect-square w-full rounded-lg object-cover"
            draggable={false}
            loading="lazy"
            decoding="async"
          />
        </figure>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-sem-image/40 bg-bg/60 text-sem-image"
        >
          <ImagePlus className="size-6" />
          <span className="font-mono text-[11px] uppercase tracking-[0.14em]">
            Insert image
          </span>
          <span className="text-xs text-fg-subtle">Tap, or paste from clipboard</span>
        </button>
      )}

      {active ? (
        <div className="flex items-center gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
            Size
            <input
              type="range"
              min={40}
              max={100}
              value={width}
              onChange={(e) =>
                updateBlock(id, { imageWidth: Number(e.target.value) })
              }
              className="range-cyan w-full"
              aria-label="Image width"
            />
            <span className="tabular-nums text-fg-muted">{width}%</span>
          </label>
          <button
            type="button"
            className="icon-btn size-9 min-h-9 min-w-9"
            aria-label="Replace image"
            onClick={() => inputRef.current?.click()}
          >
            <Replace className="size-4" />
          </button>
          <button
            type="button"
            className="icon-btn size-9 min-h-9 min-w-9 text-danger"
            aria-label="Remove image block"
            onClick={() => deleteBlock(id)}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
});
