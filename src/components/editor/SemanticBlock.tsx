import {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ClipboardEvent,
  type ReactNode,
} from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Link2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { renderInline } from "@/lib/editor/markdown";
import { compressDataUrl } from "@/lib/editor/images";
import { SLASH_LOOKUP, TYPE_META, type SemanticType } from "@/lib/editor/types";
import { TYPE_TONE } from "@/lib/editor/theme";
import { useEditorStore } from "@/lib/editor/store";
import { useEditorApi } from "./EditorContext";
import { ImageBlock } from "./ImageBlock";

const TEXT_TYPES: SemanticType[] = [
  "title",
  "heading",
  "subheading",
  "body",
  "quote",
  "code",
  "checklist",
  "callout",
  "caption",
];

function pad(n: number) {
  return String(n + 1).padStart(2, "0");
}

function caretOnFirstLine(el: HTMLTextAreaElement) {
  if (el.selectionStart !== el.selectionEnd) return false;
  return !el.value.slice(0, el.selectionStart).includes("\n");
}

function caretOnLastLine(el: HTMLTextAreaElement) {
  if (el.selectionStart !== el.selectionEnd) return false;
  return !el.value.slice(el.selectionStart).includes("\n");
}

function columnOf(el: HTMLTextAreaElement) {
  const start = el.selectionStart;
  const lineStart = el.value.lastIndexOf("\n", start - 1) + 1;
  return start - lineStart;
}

export const SemanticBlock = memo(function SemanticBlock({
  id,
  index,
  total,
}: {
  id: string;
  index: number;
  total: number;
}) {
  const block = useEditorStore((s) => {
    const note = s.notes.find((n) => n.id === s.activeNoteId);
    return note?.blocks.find((b) => b.id === id);
  });
  const active = useEditorStore((s) => s.activeBlockId === id);
  const showRails = useEditorStore((s) => s.settings.showRails);
  const compact = useEditorStore((s) => s.settings.compact);
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const changeType = useEditorStore((s) => s.changeType);
  const splitBlock = useEditorStore((s) => s.splitBlock);
  const mergeWithPrevious = useEditorStore((s) => s.mergeWithPrevious);
  const mergeWithNext = useEditorStore((s) => s.mergeWithNext);
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const toggleChecked = useEditorStore((s) => s.toggleChecked);
  const setActiveBlock = useEditorStore((s) => s.setActiveBlock);
  const applyPaste = useEditorStore((s) => s.applyPaste);
  const insertImage = useEditorStore((s) => s.insertImage);

  const api = useEditorApi();
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const [local, setLocal] = useState(block?.content ?? "");
  const [menu, setMenu] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const flushRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!block) return;
    if (document.activeElement !== taRef.current) {
      setLocal(block.content);
    }
  }, [block]);

  useLayoutEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.max(el.scrollHeight, 24)}px`;
  }, [local, block?.semanticType, compact, active]);

  useEffect(() => {
    return () => {
      if (flushRef.current) clearTimeout(flushRef.current);
    };
  }, []);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    const onWrap = (event: Event) => {
      const ce = event as CustomEvent<{ value: string; start: number; end: number }>;
      if (!ce.detail) return;
      setLocal(ce.detail.value);
      if (flushRef.current) clearTimeout(flushRef.current);
      updateBlock(id, { content: ce.detail.value });
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(ce.detail.start, ce.detail.end);
      });
    };
    el.addEventListener("sx-wrap", onWrap);
    return () => el.removeEventListener("sx-wrap", onWrap);
  }, [id, updateBlock, active]);

  if (!block) return null;

  const type = block.semanticType;
  const tone = TYPE_TONE[type];
  const meta = TYPE_META[type];
  const showPreview = !active;

  const flush = (value: string) => {
    if (flushRef.current) clearTimeout(flushRef.current);
    flushRef.current = setTimeout(() => {
      updateBlock(id, { content: value });
    }, 120);
  };

  const commitNow = (value: string) => {
    if (flushRef.current) clearTimeout(flushRef.current);
    updateBlock(id, { content: value });
  };

  const onChange = (value: string) => {
    setLocal(value);
    flush(value);
    const slash = value.trim();
    setSlashOpen(/^\/[a-z]*$/.test(slash));
  };

  const applySlash = (next: SemanticType) => {
    setSlashOpen(false);
    setLocal("");
    commitNow("");
    changeType(id, next);
    requestAnimationFrame(() => api.focusBlock(id, "start"));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = el.value;

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      api.wrapActive("**");
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      api.wrapActive("*");
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "u") {
      e.preventDefault();
      api.wrapActive("_");
      return;
    }

    const slash = value.trim();
    if (
      slashOpen &&
      (e.key === "Enter" || e.key === "Tab" || e.key === " ") &&
      SLASH_LOOKUP[slash]
    ) {
      e.preventDefault();
      applySlash(SLASH_LOOKUP[slash]);
      return;
    }
    if (slashOpen && e.key === "Escape") {
      setSlashOpen(false);
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commitNow(value);
      splitBlock(id, value.slice(0, start), value.slice(end));
      return;
    }

    if (e.key === "Backspace" && start === 0 && end === 0) {
      e.preventDefault();
      commitNow(value);
      mergeWithPrevious(id);
      return;
    }

    if (e.key === "Delete" && start === value.length && end === value.length) {
      e.preventDefault();
      commitNow(value);
      mergeWithNext(id);
      return;
    }

    if (e.key === "ArrowUp" && caretOnFirstLine(el)) {
      e.preventDefault();
      commitNow(value);
      const prevId = api.blockIds[index - 1];
      if (prevId) api.focusBlock(prevId, 1_000_000 + columnOf(el));
      return;
    }

    if (e.key === "ArrowDown" && caretOnLastLine(el)) {
      e.preventDefault();
      commitNow(value);
      const nextId = api.blockIds[index + 1];
      if (nextId) api.focusBlock(nextId, 2_000_000 + columnOf(el));
    }

    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "ArrowUp") {
      e.preventDefault();
      moveBlock(id, -1);
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "ArrowDown") {
      e.preventDefault();
      moveBlock(id, 1);
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const image = [...e.clipboardData.files].find((f) =>
      f.type.startsWith("image/"),
    );
    if (image) {
      e.preventDefault();
      const reader = new FileReader();
      reader.onload = () => {
        const src = String(reader.result);
        void compressDataUrl(src).then((out) => insertImage(id, out, image.name));
      };
      reader.readAsDataURL(image);
      return;
    }
    const text = e.clipboardData.getData("text/plain");
    if (!text) return;
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    if (lines.length <= 1) return;
    e.preventDefault();
    const el = e.currentTarget;
    const before = el.value.slice(0, el.selectionStart);
    const after = el.value.slice(el.selectionEnd);
    commitNow(el.value);
    applyPaste(id, before, lines, after);
  };

  if (type === "image") {
    return (
      <BlockFrame
        id={id}
        index={index}
        total={total}
        type={type}
        active={active}
        showRails={showRails}
        compact={compact}
        menu={menu}
        setMenu={setMenu}
        onActivate={() => setActiveBlock(id)}
        linked={block.linkedNodeIds.length}
      >
        <ImageBlock id={id} />
      </BlockFrame>
    );
  }

  const previewHtml = renderInline(local);

  return (
    <BlockFrame
      id={id}
      index={index}
      total={total}
      type={type}
      active={active}
      showRails={showRails}
      compact={compact}
      menu={menu}
      setMenu={setMenu}
      onActivate={() => setActiveBlock(id)}
      linked={block.linkedNodeIds.length}
    >
      {slashOpen ? (
        <SlashMenu query={local.trim()} onPick={applySlash} />
      ) : null}

      <div
        className={cn(
          "relative",
          type === "quote" && "border-l-2 border-sem-quote/50 pl-3 italic",
          type === "code" && "rounded-md bg-bg px-3 py-2 font-mono shadow-border",
          type === "callout" &&
            "rounded-md border-l-2 border-sem-callout/60 bg-sem-callout/10 px-3 py-2",
          type === "caption" && "px-1",
        )}
      >
        <div className="flex items-start gap-2">
          {type === "checklist" ? (
            <button
              type="button"
              aria-label={block.checked ? "Mark incomplete" : "Mark complete"}
              onClick={() => toggleChecked(id)}
              className={cn(
                "relative mt-0.5 grid size-5 shrink-0 place-items-center rounded-sm shadow-border transition-[background-color,scale] duration-150 ease-out after:absolute after:size-10 after:-translate-x-1/4 after:-translate-y-1/4",
                block.checked ? "bg-cyan text-bg" : "bg-surface-2 text-transparent",
              )}
            >
              <Check className="size-3" strokeWidth={3} />
            </button>
          ) : null}

          <div className="relative min-w-0 flex-1">
            {showPreview ? (
              <div
                className={cn(
                  "md-preview pointer-events-none",
                  tone.typeClass,
                  block.checked && "text-fg-subtle line-through",
                )}
                aria-hidden="true"
                dangerouslySetInnerHTML={{
                  __html:
                    previewHtml ||
                    `<span class="text-fg-subtle">${meta.placeholder}</span>`,
                }}
              />
            ) : null}
            <textarea
              ref={(el) => {
                taRef.current = el;
                api.register(id, el);
              }}
              value={local}
              rows={1}
              spellCheck={type !== "code"}
              aria-label={`${meta.label} block`}
              placeholder={showPreview ? undefined : meta.placeholder}
              onFocus={() => setActiveBlock(id)}
              onBlur={() => {
                commitNow(local);
                setSlashOpen(false);
              }}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              className={cn(
                "block-textarea caret-cyan",
                tone.typeClass,
                showPreview && "is-idle absolute inset-0",
                block.checked && !showPreview && "text-fg-subtle line-through",
              )}
            />
          </div>
        </div>
      </div>
    </BlockFrame>
  );
});

function SlashMenu({
  query,
  onPick,
}: {
  query: string;
  onPick: (t: SemanticType) => void;
}) {
  const matches = TEXT_TYPES.filter((t) =>
    TYPE_META[t].slash.some((s) => s.startsWith(query) || query === "/"),
  );
  if (matches.length === 0) return null;
  return (
    <div className="mb-2 overflow-hidden rounded-lg bg-surface-2 p-1 shadow-border">
      <p className="px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
        Convert type
      </p>
      {matches.map((t) => (
        <button
          key={t}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(t);
          }}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-fg hover:bg-fg/5"
        >
          <span className={cn("size-2 rounded-full", TYPE_TONE[t].swatch)} />
          <span>{TYPE_META[t].label}</span>
          <span className="ml-auto font-mono text-[10px] text-fg-subtle">
            {TYPE_META[t].slash[0]}
          </span>
        </button>
      ))}
    </div>
  );
}

function BlockFrame({
  id,
  index,
  total,
  type,
  active,
  showRails,
  compact,
  menu,
  setMenu,
  onActivate,
  linked,
  children,
}: {
  id: string;
  index: number;
  total: number;
  type: SemanticType;
  active: boolean;
  showRails: boolean;
  compact: boolean;
  menu: boolean;
  setMenu: (v: boolean) => void;
  onActivate: () => void;
  linked: number;
  children: ReactNode;
}) {
  const tone = TYPE_TONE[type];
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock);
  const deleteBlock = useEditorStore((s) => s.deleteBlock);
  const changeType = useEditorStore((s) => s.changeType);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu, setMenu]);

  return (
    <article
      onClick={onActivate}
      style={{ "--rail": tone.rail } as CSSProperties}
      className={cn("group relative flex gap-2", compact ? "py-1" : "py-1.5")}
    >
      {showRails ? (
        <div className="flex w-9 shrink-0 flex-col items-center pt-3">
          <button
            type="button"
            aria-label={`Block ${index + 1} actions`}
            onClick={(e) => {
              e.stopPropagation();
              setMenu(!menu);
            }}
            className={cn(
              "min-h-7 font-mono text-[11px] font-medium tabular-nums tracking-wider",
              tone.text,
            )}
          >
            {pad(index)}
          </button>
          <div className="rail-dots mt-1 min-h-6 w-[2px] flex-1 opacity-80" />
        </div>
      ) : (
        <div
          className="mt-4 w-0.5 shrink-0 rounded-full"
          style={{ background: tone.rail }}
        />
      )}

      <div
        className={cn(
          "min-w-0 flex-1 rounded-xl bg-surface/80 p-3 transition-[box-shadow,background-color] duration-200 ease-out",
          active ? tone.glow : "shadow-border",
        )}
      >
        {children}
        {linked > 0 ? (
          <p className="mt-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">
            <Link2 className="size-3" />
            {linked} linked
          </p>
        ) : null}
      </div>

      {menu ? (
        <div
          ref={menuRef}
          className="absolute left-10 top-8 z-30 w-48 overflow-hidden rounded-lg bg-surface-2 p-1 shadow-border"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
            {TYPE_META[type].label}
          </p>
          {TEXT_TYPES.concat("image").map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                changeType(id, t);
                setMenu(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs",
                t === type
                  ? "bg-fg/8 text-fg"
                  : "text-fg-muted hover:bg-fg/5 hover:text-fg",
              )}
            >
              <span className={cn("size-1.5 rounded-full", TYPE_TONE[t].swatch)} />
              {TYPE_META[t].label}
            </button>
          ))}
          <div className="my-1 h-px bg-border" />
          <MenuRow
            icon={ChevronUp}
            label="Move up"
            disabled={index === 0}
            onClick={() => {
              moveBlock(id, -1);
              setMenu(false);
            }}
          />
          <MenuRow
            icon={ChevronDown}
            label="Move down"
            disabled={index === total - 1}
            onClick={() => {
              moveBlock(id, 1);
              setMenu(false);
            }}
          />
          <MenuRow
            icon={Copy}
            label="Duplicate"
            onClick={() => {
              duplicateBlock(id);
              setMenu(false);
            }}
          />
          <MenuRow
            icon={Trash2}
            label="Delete"
            danger
            onClick={() => {
              deleteBlock(id);
              setMenu(false);
            }}
          />
        </div>
      ) : null}
    </article>
  );
}

function MenuRow({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: typeof Trash2;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs",
        danger ? "text-danger" : "text-fg-muted hover:bg-fg/5 hover:text-fg",
        disabled && "opacity-40",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}
