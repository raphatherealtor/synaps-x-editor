import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/utils";
import { countWords, firstLine, toMarkdown } from "./markdown";
import { DEFAULT_SETTINGS, SEED_NOTES } from "./seed";
import { journalStorage, setPersistQuotaHandler } from "./persist-storage";
import { pruneUnreferencedAssets } from "./image-db";
import { collectAssetIds } from "./migrate-images";
import type {
  AppTab,
  Block,
  EditorSettings,
  FontScale,
  Note,
  SaveState,
  SemanticType,
} from "./types";

export interface PendingFocus {
  id: string;
  caret: number | "start" | "end";
}

export interface EditorStore {
  notes: Note[];
  activeNoteId: string;
  activeBlockId: string | null;
  tab: AppTab;
  settings: EditorSettings;
  saveState: SaveState;
  mcpActive: boolean;
  pendingFocus: PendingFocus | null;
  hydrated: boolean;
  storageWarning: string | null;

  hydrateFlag: () => void;
  replaceNotes: (notes: Note[]) => void;
  setStorageWarning: (msg: string | null) => void;
  setTab: (tab: AppTab) => void;
  setActiveNote: (id: string) => void;
  setActiveBlock: (id: string | null) => void;
  consumePendingFocus: () => PendingFocus | null;
  setFocusMode: (on: boolean) => void;
  setFontScale: (scale: FontScale) => void;
  setShowRails: (on: boolean) => void;
  setCompact: (on: boolean) => void;
  setProject: (name: string) => void;

  updateBlock: (id: string, patch: Partial<Block>) => void;
  changeType: (id: string, type: SemanticType) => void;
  addBlock: (afterId: string | null, type?: SemanticType, initial?: Partial<Block>) => string;
  insertImage: (afterId: string | null, assetId: string, alt?: string) => string;
  deleteBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
  moveBlock: (id: string, dir: -1 | 1) => void;
  splitBlock: (id: string, before: string, after: string) => string;
  mergeWithPrevious: (id: string) => void;
  mergeWithNext: (id: string) => void;
  toggleChecked: (id: string) => void;
  toggleLink: (fromId: string, toId: string) => void;
  applyPaste: (id: string, before: string, lines: string[], after: string) => void;

  createNote: (project?: string) => string;
  deleteNote: (id: string) => void;
  resetDemo: () => void;
  exportActiveMarkdown: () => string;
}

function reindex(blocks: Block[]): Block[] {
  return blocks.map((b, i) => (b.order === i ? b : { ...b, order: i }));
}

function touchNote(note: Note, blocks: Block[]): Note {
  return { ...note, blocks: reindex(blocks), updatedAt: Date.now() };
}

function patchActive(
  notes: Note[],
  activeNoteId: string,
  mutator: (note: Note) => Note,
): Note[] {
  return notes.map((n) => (n.id === activeNoteId ? mutator(n) : n));
}

function findBlock(note: Note, id: string): { block: Block; index: number } | null {
  const index = note.blocks.findIndex((b) => b.id === id);
  if (index < 0) return null;
  return { block: note.blocks[index], index };
}

function makeBlock(type: SemanticType, order: number, extra: Partial<Block> = {}): Block {
  const now = Date.now();
  return {
    id: extra.id ?? uid("b"),
    semanticType: type,
    content: extra.content ?? "",
    order,
    createdAt: extra.createdAt ?? now,
    updatedAt: now,
    linkedNodeIds: extra.linkedNodeIds ?? [],
    checked: extra.checked,
    imageAssetId: extra.imageAssetId,
    imageSrc: extra.imageSrc,
    imageAlt: extra.imageAlt,
    imageWidth: extra.imageWidth ?? (type === "image" ? 100 : undefined),
    calloutTone: extra.calloutTone ?? (type === "callout" ? "idea" : undefined),
  };
}

function isTextBlock(type: SemanticType): boolean {
  return type !== "image";
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pruneTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePrune(notes: Note[]) {
  if (typeof indexedDB === "undefined") return;
  if (pruneTimer) clearTimeout(pruneTimer);
  const keep = collectAssetIds(notes);
  pruneTimer = setTimeout(() => {
    void pruneUnreferencedAssets(keep).catch(() => undefined);
  }, 800);
}

function withSave<T extends EditorStore>(
  set: (partial: Partial<T> | ((s: T) => Partial<T>)) => void,
  extra: Partial<T>,
) {
  set({ ...extra, saveState: "saving" } as Partial<T>);
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    set({ saveState: "saved" } as Partial<T>);
  }, 480);
}

function stripHeavyImages(notes: Note[]): Note[] {
  return notes.map((note) => ({
    ...note,
    blocks: note.blocks.map((b) => {
      if (b.imageSrc?.startsWith("data:") && b.imageAssetId) {
        return { ...b, imageSrc: undefined };
      }
      if (b.imageSrc?.startsWith("blob:")) {
        return { ...b, imageSrc: b.imageAssetId ? undefined : b.imageSrc };
      }
      return b;
    }),
  }));
}

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
      notes: SEED_NOTES,
      activeNoteId: SEED_NOTES[0].id,
      activeBlockId: null as string | null,
      tab: "editor",
      settings: { ...DEFAULT_SETTINGS },
      saveState: "saved",
      mcpActive: true,
      pendingFocus: null,
      hydrated: false,
      storageWarning: null,

      hydrateFlag: () => set({ hydrated: true }),
      replaceNotes: (notes) => set({ notes }),
      setStorageWarning: (msg) =>
        set({
          storageWarning: msg,
          saveState: msg ? "offline" : "saved",
        }),

      setTab: (tab) => set({ tab }),
      setActiveNote: (id) => {
        set({
          activeNoteId: id,
          activeBlockId: null,
          tab: "editor",
        });
      },
      setActiveBlock: (id) => {
        if (get().activeBlockId === id) return;
        set({ activeBlockId: id });
      },
      consumePendingFocus: () => {
        const p = get().pendingFocus;
        if (p) set({ pendingFocus: null });
        return p;
      },
      setFocusMode: (on) =>
        set((s) => ({ settings: { ...s.settings, focusMode: on } })),
      setFontScale: (fontScale) =>
        set((s) => ({ settings: { ...s.settings, fontScale } })),
      setShowRails: (showRails) =>
        set((s) => ({ settings: { ...s.settings, showRails } })),
      setCompact: (compact) =>
        set((s) => ({ settings: { ...s.settings, compact } })),
      setProject: (name) => {
        const { notes, activeNoteId } = get();
        withSave(set, {
          notes: patchActive(notes, activeNoteId, (n) => ({
            ...n,
            project: name.trim().toUpperCase() || n.project,
            updatedAt: Date.now(),
          })),
        });
      },

      updateBlock: (id, patch) => {
        const { notes, activeNoteId } = get();
        const note = notes.find((n) => n.id === activeNoteId);
        const current = note?.blocks.find((b) => b.id === id);
        if (!current) return;
        const keys = Object.keys(patch) as (keyof Block)[];
        const same = keys.every((k) => current[k] === patch[k]);
        if (same) return;
        withSave(set, {
          notes: patchActive(notes, activeNoteId, (n) => ({
            ...n,
            updatedAt: Date.now(),
            blocks: n.blocks.map((b) =>
              b.id === id ? { ...b, ...patch, updatedAt: Date.now() } : b,
            ),
          })),
        });
      },

      changeType: (id, type) => {
        const { notes, activeNoteId } = get();
        withSave(set, {
          notes: patchActive(notes, activeNoteId, (n) => ({
            ...n,
            updatedAt: Date.now(),
            blocks: n.blocks.map((b) =>
              b.id === id
                ? {
                    ...b,
                    semanticType: type,
                    updatedAt: Date.now(),
                    checked: type === "checklist" ? Boolean(b.checked) : undefined,
                    calloutTone:
                      type === "callout" ? b.calloutTone ?? "idea" : undefined,
                    imageWidth: type === "image" ? b.imageWidth ?? 100 : b.imageWidth,
                  }
                : b,
            ),
          })),
        });
      },

      addBlock: (afterId, type = "body", initial = {}) => {
        const { notes, activeNoteId } = get();
        const newBlock = makeBlock(type, 0, initial);
        withSave(set, {
          notes: patchActive(notes, activeNoteId, (n) => {
            const idx = afterId
              ? n.blocks.findIndex((b) => b.id === afterId)
              : n.blocks.length - 1;
            const at = idx < 0 ? n.blocks.length : idx + 1;
            const blocks = [...n.blocks];
            blocks.splice(at, 0, newBlock);
            return touchNote(n, blocks);
          }),
          activeBlockId: newBlock.id,
          pendingFocus: { id: newBlock.id, caret: "start" },
        });
        return newBlock.id;
      },

      insertImage: (afterId, assetId, alt) => {
        const id = get().addBlock(afterId, "image", {
          imageAssetId: assetId,
          imageAlt: alt ?? "Inserted image",
          imageWidth: 100,
        });
        const captionId = uid("b");
        const { notes, activeNoteId } = get();
        withSave(set, {
          notes: patchActive(notes, activeNoteId, (n) => {
            const idx = n.blocks.findIndex((b) => b.id === id);
            const blocks = [...n.blocks];
            blocks.splice(
              idx + 1,
              0,
              makeBlock("caption", 0, { id: captionId, content: "" }),
            );
            return touchNote(n, blocks);
          }),
          activeBlockId: captionId,
          pendingFocus: { id: captionId, caret: "start" },
        });
        return id;
      },

      deleteBlock: (id) => {
        const { notes, activeNoteId } = get();
        const note = notes.find((n) => n.id === activeNoteId);
        if (!note) return;
        if (note.blocks.length <= 1) {
          get().updateBlock(id, {
            content: "",
            imageSrc: undefined,
            imageAssetId: undefined,
            checked: false,
          });
          set({ pendingFocus: { id, caret: "start" }, activeBlockId: id });
          schedulePrune(get().notes);
          return;
        }
        const idx = note.blocks.findIndex((b) => b.id === id);
        const neighbor =
          note.blocks[idx - 1] ?? note.blocks[idx + 1] ?? note.blocks[0];
        withSave(set, {
          notes: patchActive(notes, activeNoteId, (n) =>
            touchNote(
              n,
              n.blocks.filter((b) => b.id !== id),
            ),
          ),
          activeBlockId: neighbor.id,
          pendingFocus: {
            id: neighbor.id,
            caret: idx > 0 ? "end" : "start",
          },
        });
        schedulePrune(get().notes);
      },

      duplicateBlock: (id) => {
        const { notes, activeNoteId } = get();
        const note = notes.find((n) => n.id === activeNoteId);
        if (!note) return;
        const found = findBlock(note, id);
        if (!found) return;
        const copy = makeBlock(found.block.semanticType, 0, {
          ...found.block,
          id: uid("b"),
          linkedNodeIds: [...found.block.linkedNodeIds],
        });
        withSave(set, {
          notes: patchActive(notes, activeNoteId, (n) => {
            const blocks = [...n.blocks];
            blocks.splice(found.index + 1, 0, copy);
            return touchNote(n, blocks);
          }),
          activeBlockId: copy.id,
          pendingFocus: { id: copy.id, caret: "end" },
        });
      },

      moveBlock: (id, dir) => {
        const { notes, activeNoteId } = get();
        withSave(set, {
          notes: patchActive(notes, activeNoteId, (n) => {
            const idx = n.blocks.findIndex((b) => b.id === id);
            const next = idx + dir;
            if (idx < 0 || next < 0 || next >= n.blocks.length) return n;
            const blocks = [...n.blocks];
            const [item] = blocks.splice(idx, 1);
            blocks.splice(next, 0, item);
            return touchNote(n, blocks);
          }),
        });
      },

      splitBlock: (id, before, after) => {
        const { notes, activeNoteId } = get();
        const note = notes.find((n) => n.id === activeNoteId);
        if (!note) return id;
        const found = findBlock(note, id);
        if (!found) return id;
        const type = found.block.semanticType;
        const atEnd = after.length === 0;
        let nextType: SemanticType = "body";
        if (type === "checklist") nextType = "checklist";
        else if (type === "code" && !atEnd) nextType = "code";
        else if (type === "quote" && !atEnd) nextType = "quote";
        else nextType = "body";

        const newBlock = makeBlock(nextType, 0, {
          content: after,
          checked: nextType === "checklist" ? false : undefined,
        });

        withSave(set, {
          notes: patchActive(notes, activeNoteId, (n) => {
            const blocks = n.blocks.map((b) =>
              b.id === id ? { ...b, content: before, updatedAt: Date.now() } : b,
            );
            const idx = blocks.findIndex((b) => b.id === id);
            blocks.splice(idx + 1, 0, newBlock);
            return touchNote(n, blocks);
          }),
          activeBlockId: newBlock.id,
          pendingFocus: { id: newBlock.id, caret: "start" },
        });
        return newBlock.id;
      },

      mergeWithPrevious: (id) => {
        const { notes, activeNoteId } = get();
        const note = notes.find((n) => n.id === activeNoteId);
        if (!note) return;
        const found = findBlock(note, id);
        if (!found || found.index === 0) return;
        const prev = note.blocks[found.index - 1];
        const current = found.block;
        if (!isTextBlock(prev.semanticType)) {
          if (!current.content) get().deleteBlock(id);
          else
            set({
              activeBlockId: prev.id,
              pendingFocus: { id: prev.id, caret: "end" },
            });
          return;
        }
        if (!isTextBlock(current.semanticType)) {
          get().deleteBlock(id);
          return;
        }
        const caret = prev.content.length;
        const joined = prev.content + current.content;
        withSave(set, {
          notes: patchActive(notes, activeNoteId, (n) =>
            touchNote(
              n,
              n.blocks
                .filter((b) => b.id !== id)
                .map((b) =>
                  b.id === prev.id
                    ? { ...b, content: joined, updatedAt: Date.now() }
                    : b,
                ),
            ),
          ),
          activeBlockId: prev.id,
          pendingFocus: { id: prev.id, caret },
        });
      },

      mergeWithNext: (id) => {
        const { notes, activeNoteId } = get();
        const note = notes.find((n) => n.id === activeNoteId);
        if (!note) return;
        const found = findBlock(note, id);
        if (!found || found.index >= note.blocks.length - 1) return;
        const next = note.blocks[found.index + 1];
        const current = found.block;
        if (!isTextBlock(current.semanticType) || !isTextBlock(next.semanticType)) {
          set({
            activeBlockId: next.id,
            pendingFocus: { id: next.id, caret: "start" },
          });
          return;
        }
        const caret = current.content.length;
        withSave(set, {
          notes: patchActive(notes, activeNoteId, (n) =>
            touchNote(
              n,
              n.blocks
                .filter((b) => b.id !== next.id)
                .map((b) =>
                  b.id === id
                    ? {
                        ...b,
                        content: current.content + next.content,
                        updatedAt: Date.now(),
                      }
                    : b,
                ),
            ),
          ),
          activeBlockId: id,
          pendingFocus: { id, caret },
        });
      },

      toggleChecked: (id) => {
        const { notes, activeNoteId } = get();
        withSave(set, {
          notes: patchActive(notes, activeNoteId, (n) => ({
            ...n,
            updatedAt: Date.now(),
            blocks: n.blocks.map((b) =>
              b.id === id ? { ...b, checked: !b.checked, updatedAt: Date.now() } : b,
            ),
          })),
        });
      },

      toggleLink: (fromId, toId) => {
        if (fromId === toId) return;
        const { notes, activeNoteId } = get();
        withSave(set, {
          notes: patchActive(notes, activeNoteId, (n) => ({
            ...n,
            updatedAt: Date.now(),
            blocks: n.blocks.map((b) => {
              if (b.id !== fromId) return b;
              const has = b.linkedNodeIds.includes(toId);
              return {
                ...b,
                linkedNodeIds: has
                  ? b.linkedNodeIds.filter((x) => x !== toId)
                  : [...b.linkedNodeIds, toId],
                updatedAt: Date.now(),
              };
            }),
          })),
        });
      },

      applyPaste: (id, before, lines, after) => {
        const { notes, activeNoteId } = get();
        const note = notes.find((n) => n.id === activeNoteId);
        if (!note) return;
        const found = findBlock(note, id);
        if (!found) return;
        const first = before + (lines[0] ?? "") + (lines.length === 1 ? after : "");
        const extras = lines.slice(1).map((line, i) => {
          const content = i === lines.length - 2 ? line + after : line;
          return makeBlock("body", 0, { content });
        });
        const last = extras[extras.length - 1];
        withSave(set, {
          notes: patchActive(notes, activeNoteId, (n) => {
            const blocks = n.blocks.map((b) =>
              b.id === id ? { ...b, content: first, updatedAt: Date.now() } : b,
            );
            const idx = blocks.findIndex((b) => b.id === id);
            blocks.splice(idx + 1, 0, ...extras);
            return touchNote(n, blocks);
          }),
          activeBlockId: last ? last.id : id,
          pendingFocus: last
            ? { id: last.id, caret: "end" }
            : { id, caret: first.length },
        });
      },

      createNote: (project = "NEW SIGNAL") => {
        const title = makeBlock("title", 0, { content: "" });
        const body = makeBlock("body", 1, { content: "" });
        const note: Note = {
          id: uid("note"),
          project,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          blocks: [title, body],
        };
        withSave(set, {
          notes: [note, ...get().notes],
          activeNoteId: note.id,
          activeBlockId: title.id,
          tab: "editor",
          pendingFocus: { id: title.id, caret: "start" },
        });
        return note.id;
      },

      deleteNote: (id) => {
        const { notes, activeNoteId } = get();
        if (notes.length <= 1) return;
        const next = notes.filter((n) => n.id !== id);
        const fallback =
          id === activeNoteId
            ? next[0]
            : next.find((n) => n.id === activeNoteId) ?? next[0];
        withSave(set, {
          notes: next,
          activeNoteId: fallback.id,
          activeBlockId: fallback.blocks[0]?.id ?? null,
        });
        schedulePrune(next);
      },

      resetDemo: () => {
        withSave(set, {
          notes: SEED_NOTES,
          activeNoteId: SEED_NOTES[0].id,
          activeBlockId: SEED_NOTES[0].blocks[0]?.id ?? null,
          settings: { ...DEFAULT_SETTINGS },
          tab: "editor",
        });
        schedulePrune(SEED_NOTES);
      },

      exportActiveMarkdown: () => {
        const { notes, activeNoteId } = get();
        const note = notes.find((n) => n.id === activeNoteId);
        if (!note) return "";
        return toMarkdown(note.blocks);
      },
    }),
    {
      name: "synaps-x-journal",
      version: 2,
      storage: journalStorage,
      skipHydration: true,
      migrate: (persisted) => persisted as EditorStore,
      merge: (persisted, current) => {
        const p = persisted as Partial<EditorStore> | undefined;
        if (!p?.notes?.length) return current;
        const notes = p.notes;
        const activeNoteId = notes.some((n) => n.id === p.activeNoteId)
          ? (p.activeNoteId as string)
          : notes[0].id;
        return {
          ...current,
          notes,
          activeNoteId,
          activeBlockId:
            notes.find((n) => n.id === activeNoteId)?.blocks[0]?.id ?? null,
          settings: {
            ...current.settings,
            ...p.settings,
            focusMode: false,
          },
        };
      },
      partialize: (s) => ({
        notes: stripHeavyImages(s.notes),
        activeNoteId: s.activeNoteId,
        settings: {
          fontScale: s.settings.fontScale,
          showRails: s.settings.showRails,
          compact: s.settings.compact,
          focusMode: false,
        },
      }),
    },
  ),
);

setPersistQuotaHandler((err) => {
  useEditorStore.getState().setStorageWarning(err.message);
});

export function selectActiveNote(s: EditorStore): Note | undefined {
  return s.notes.find((n) => n.id === s.activeNoteId);
}

export function noteTitle(note: Note): string {
  const titled = note.blocks.find(
    (b) =>
      (b.semanticType === "title" || b.semanticType === "heading") &&
      b.content.trim(),
  );
  if (titled) return firstLine(titled.content);
  const any = note.blocks.find((b) => b.content.trim());
  return any ? firstLine(any.content) : "Untitled signal";
}

export function noteWordCount(note: Note): number {
  return countWords(
    note.blocks
      .filter((b) => b.semanticType !== "image")
      .map((b) => b.content)
      .join(" "),
  );
}

export function noteBlockCount(note: Note): number {
  return note.blocks.length;
}
