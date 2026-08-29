import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { wrapSelection } from "@/lib/editor/markdown";
import { fileToDataUrl } from "@/lib/editor/images";
import { useEditorStore, selectActiveNote } from "@/lib/editor/store";
import { EditorApiContext, type CaretPos, type EditorApi } from "./EditorContext";
import { SemanticBlock } from "./SemanticBlock";

function decodeCaret(el: HTMLTextAreaElement, caret: CaretPos): number {
  if (caret === "start") return 0;
  if (caret === "end") return el.value.length;
  if (caret >= 2_000_000) {
    const col = caret - 2_000_000;
    const lineEnd = el.value.indexOf("\n");
    const lineLen = lineEnd < 0 ? el.value.length : lineEnd;
    return Math.min(col, lineLen);
  }
  if (caret >= 1_000_000) {
    const col = caret - 1_000_000;
    const lineStart = el.value.lastIndexOf("\n") + 1;
    return lineStart + Math.min(col, el.value.length - lineStart);
  }
  return Math.max(0, Math.min(caret, el.value.length));
}

export function EditorSession({ children }: { children: ReactNode }) {
  const note = useEditorStore(selectActiveNote);
  const pending = useEditorStore((s) => s.pendingFocus);
  const consume = useEditorStore((s) => s.consumePendingFocus);
  const insertImage = useEditorStore((s) => s.insertImage);
  const setActiveBlock = useEditorStore((s) => s.setActiveBlock);
  const activeBlockId = useEditorStore((s) => s.activeBlockId);
  const addBlock = useEditorStore((s) => s.addBlock);

  const mapRef = useRef(new Map<string, HTMLTextAreaElement>());
  const fileRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<string | null>(null);

  const blockIds = useMemo(
    () => note?.blocks.map((b) => b.id) ?? [],
    [note],
  );

  const focusBlock = useCallback(
    (id: string, caret: CaretPos = "end") => {
      setActiveBlock(id);
      const apply = () => {
        const el = mapRef.current.get(id);
        if (!el) return false;
        el.focus();
        const pos = decodeCaret(el, caret);
        try {
          el.setSelectionRange(pos, pos);
        } catch {
          /* ignore */
        }
        el.scrollIntoView({ block: "nearest" });
        return true;
      };
      if (!apply()) {
        requestAnimationFrame(() => {
          if (!apply()) requestAnimationFrame(() => apply());
        });
      }
    },
    [setActiveBlock],
  );

  const wrapActive = useCallback((left: string, right = left) => {
    const id = useEditorStore.getState().activeBlockId;
    if (!id) return;
    const el = mapRef.current.get(id);
    if (!el) return;
    const next = wrapSelection(
      el.value,
      el.selectionStart,
      el.selectionEnd,
      left,
      right,
    );
    el.dispatchEvent(new CustomEvent("sx-wrap", { detail: next }));
  }, []);

  const pickImage = useCallback((afterId: string | null) => {
    afterRef.current = afterId;
    fileRef.current?.click();
  }, []);

  const api = useMemo<EditorApi>(
    () => ({
      register: (id, el) => {
        if (el) mapRef.current.set(id, el);
        else mapRef.current.delete(id);
      },
      focusBlock,
      wrapActive,
      getActiveEl: () => {
        const id = useEditorStore.getState().activeBlockId;
        return id ? (mapRef.current.get(id) ?? null) : null;
      },
      pickImage,
      blockIds,
    }),
    [blockIds, focusBlock, pickImage, wrapActive],
  );

  useLayoutEffect(() => {
    if (!pending) return;
    const p = consume();
    if (p) focusBlock(p.id, p.caret);
  }, [pending, consume, focusBlock]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        const id =
          useEditorStore.getState().activeBlockId ?? blockIds.at(-1) ?? null;
        addBlock(id, "body");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addBlock, blockIds]);

  return (
    <EditorApiContext.Provider value={api}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          void fileToDataUrl(file).then((src) => {
            insertImage(afterRef.current ?? activeBlockId, src, file.name);
          });
        }}
      />
      {children}
    </EditorApiContext.Provider>
  );
}

export function EditorBody() {
  const note = useEditorStore(selectActiveNote);
  const insertImage = useEditorStore((s) => s.insertImage);
  const activeBlockId = useEditorStore((s) => s.activeBlockId);

  if (!note) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-fg-muted">
        No signal loaded.
      </div>
    );
  }

  return (
    <div
      className="flex flex-col px-3 pb-4 pt-2"
      onDragOver={(e) => {
        if ([...e.dataTransfer.items].some((i) => i.type.startsWith("image/"))) {
          e.preventDefault();
        }
      }}
      onDrop={(e) => {
        const file = [...e.dataTransfer.files].find((f) =>
          f.type.startsWith("image/"),
        );
        if (!file) return;
        e.preventDefault();
        void fileToDataUrl(file).then((src) => {
          insertImage(activeBlockId, src, file.name);
        });
      }}
    >
      {note.blocks.map((b, i) => (
        <SemanticBlock
          key={b.id}
          id={b.id}
          index={i}
          total={note.blocks.length}
        />
      ))}
    </div>
  );
}
