import { createContext, useContext } from "react";
import type { CaretPos } from "@/lib/editor/caret";

export type { CaretPos };

export type EditorApi = {
  register: (id: string, el: HTMLTextAreaElement | null) => void;
  focusBlock: (id: string, caret?: CaretPos) => void;
  wrapActive: (left: string, right?: string) => void;
  getActiveEl: () => HTMLTextAreaElement | null;
  pickImage: (afterId: string | null) => void;
  blockIds: string[];
};

export const EditorApiContext = createContext<EditorApi | null>(null);

export function useEditorApi(): EditorApi {
  const ctx = useContext(EditorApiContext);
  if (!ctx) {
    throw new Error("useEditorApi must be used inside the editor");
  }
  return ctx;
}
