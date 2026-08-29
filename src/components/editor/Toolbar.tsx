import {
  Bold,
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  Info,
  Plus,
  Quote,
  Type,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TYPE_META, type SemanticType } from "@/lib/editor/types";
import { useEditorStore, selectActiveNote } from "@/lib/editor/store";
import { useEditorApi } from "./EditorContext";

function Tool({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn("icon-btn h-9 min-h-9 min-w-9 rounded-md", active && "is-active")}
    >
      {children}
    </button>
  );
}

export function Toolbar() {
  const note = useEditorStore(selectActiveNote);
  const activeId = useEditorStore((s) => s.activeBlockId);
  const changeType = useEditorStore((s) => s.changeType);
  const addBlock = useEditorStore((s) => s.addBlock);
  const block = note?.blocks.find((b) => b.id === activeId);
  const type = block?.semanticType ?? "body";
  const api = useEditorApi();

  const setType = (t: SemanticType) => {
    if (activeId) changeType(activeId, t);
  };

  return (
    <div className="device-panel border-t border-border px-2 py-1.5">
      <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
        <Tool label="Bold" onClick={() => api.wrapActive("**")}>
          <Bold className="size-4" />
        </Tool>
        <Tool label="Italic" onClick={() => api.wrapActive("*")}>
          <Italic className="size-4" />
        </Tool>
        <Tool label="Underline" onClick={() => api.wrapActive("_")}>
          <Underline className="size-4" />
        </Tool>
        <Tool
          label="Quote"
          active={type === "quote"}
          onClick={() => setType("quote")}
        >
          <Quote className="size-4" />
        </Tool>
        <Tool
          label="Code"
          active={type === "code"}
          onClick={() => setType("code")}
        >
          <Code2 className="size-4" />
        </Tool>
        <Tool
          label="Checklist"
          active={type === "checklist"}
          onClick={() => setType("checklist")}
        >
          <CheckSquare className="size-4" />
        </Tool>
        <Tool
          label="Callout"
          active={type === "callout"}
          onClick={() => setType("callout")}
        >
          <Info className="size-4" />
        </Tool>
        <Tool
          label="Link markdown"
          onClick={() => api.wrapActive("[", "](https://)")}
        >
          <Link2 className="size-4" />
        </Tool>
      </div>
      <div className="flex items-center gap-0.5 overflow-x-auto">
        <Tool
          label="Title"
          active={type === "title"}
          onClick={() => setType("title")}
        >
          <Heading1 className="size-4" />
        </Tool>
        <Tool
          label="Heading"
          active={type === "heading"}
          onClick={() => setType("heading")}
        >
          <Heading2 className="size-4" />
        </Tool>
        <Tool
          label="Subheading"
          active={type === "subheading"}
          onClick={() => setType("subheading")}
        >
          <Heading3 className="size-4" />
        </Tool>
        <Tool
          label="Body"
          active={type === "body"}
          onClick={() => setType("body")}
        >
          <Type className="size-4" />
        </Tool>
        <span className="mx-1 h-4 w-px bg-border" />
        <Tool
          label="Insert image"
          onClick={() => api.pickImage(activeId)}
        >
          <ImagePlus className="size-4" />
        </Tool>
        <Tool
          label="Add block"
          onClick={() => addBlock(activeId, "body")}
        >
          <Plus className="size-4" />
        </Tool>
        <span className="ml-auto pr-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg-subtle">
          {TYPE_META[type]?.label ?? "Body"}
        </span>
      </div>
    </div>
  );
}
