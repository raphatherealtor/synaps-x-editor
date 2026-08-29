export type CaretPos = number | "start" | "end";

/** Column on last line of the current block (ArrowUp → previous). */
export const CARET_PREV_LINE = 1_000_000;
/** Column on first line of the current block (ArrowDown → next). */
export const CARET_NEXT_LINE = 2_000_000;

export function isComposingKey(e: {
  nativeEvent?: { isComposing?: boolean };
  isComposing?: boolean;
  key?: string;
  keyCode?: number;
}): boolean {
  if (e.nativeEvent?.isComposing || e.isComposing) return true;
  if (e.key === "Process") return true;
  if (e.keyCode === 229) return true;
  return false;
}

export function caretOnFirstLine(value: string, start: number, end: number) {
  if (start !== end) return false;
  return !value.slice(0, start).includes("\n");
}

export function caretOnLastLine(value: string, start: number, end: number) {
  if (start !== end) return false;
  return !value.slice(start).includes("\n");
}

export function columnOf(value: string, start: number) {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  return start - lineStart;
}

export function decodeCaret(value: string, caret: CaretPos): number {
  if (caret === "start") return 0;
  if (caret === "end") return value.length;
  if (typeof caret === "number" && caret >= CARET_NEXT_LINE) {
    const col = caret - CARET_NEXT_LINE;
    const lineEnd = value.indexOf("\n");
    const lineLen = lineEnd < 0 ? value.length : lineEnd;
    return Math.min(col, lineLen);
  }
  if (typeof caret === "number" && caret >= CARET_PREV_LINE) {
    const col = caret - CARET_PREV_LINE;
    const lineStart = value.lastIndexOf("\n") + 1;
    return lineStart + Math.min(col, value.length - lineStart);
  }
  if (typeof caret !== "number") return 0;
  return Math.max(0, Math.min(caret, value.length));
}

export function isElementInView(el: HTMLElement, container: HTMLElement): boolean {
  const er = el.getBoundingClientRect();
  const cr = container.getBoundingClientRect();
  return er.top >= cr.top && er.bottom <= cr.bottom;
}
