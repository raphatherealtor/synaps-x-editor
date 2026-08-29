import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CARET_NEXT_LINE,
  CARET_PREV_LINE,
  caretOnFirstLine,
  caretOnLastLine,
  columnOf,
  decodeCaret,
  isComposingKey,
} from "./caret.ts";
import { toMarkdown } from "./markdown.ts";

test("decodeCaret start/end/clamps", () => {
  assert.equal(decodeCaret("hello", "start"), 0);
  assert.equal(decodeCaret("hello", "end"), 5);
  assert.equal(decodeCaret("hello", 3), 3);
  assert.equal(decodeCaret("hello", 99), 5);
  assert.equal(decodeCaret("hello", -4), 0);
});

test("decodeCaret column on prev/next line", () => {
  assert.equal(decodeCaret("abc\ndef", CARET_PREV_LINE + 2), 6);
  assert.equal(decodeCaret("abc\ndef", CARET_NEXT_LINE + 2), 2);
  assert.equal(decodeCaret("ab", CARET_NEXT_LINE + 9), 2);
});

test("first/last line caret helpers", () => {
  assert.equal(caretOnFirstLine("a\nb", 1, 1), true);
  assert.equal(caretOnFirstLine("a\nb", 3, 3), false);
  assert.equal(caretOnLastLine("a\nb", 3, 3), true);
  assert.equal(caretOnLastLine("a\nb", 0, 0), false);
  assert.equal(caretOnFirstLine("ab", 0, 2), false);
});

test("columnOf", () => {
  assert.equal(columnOf("hello", 3), 3);
  assert.equal(columnOf("ab\ncd", 4), 1);
});

test("isComposingKey", () => {
  assert.equal(isComposingKey({ isComposing: true }), true);
  assert.equal(isComposingKey({ key: "Process" }), true);
  assert.equal(isComposingKey({ keyCode: 229 }), true);
  assert.equal(isComposingKey({ key: "Enter" }), false);
});

test("markdown export does not inline data URLs", () => {
  const md = toMarkdown([
    {
      semanticType: "image",
      content: "",
      imageAlt: "shot",
      imageSrc: "data:image/jpeg;base64,xxx",
      imageAssetId: "img_abc",
    },
    {
      semanticType: "image",
      content: "",
      imageAlt: "demo",
      imageSrc: "/demo/bridge.jpg",
    },
    {
      semanticType: "image",
      content: "",
      imageAlt: "idb",
      imageAssetId: "img_only",
    },
    {
      semanticType: "image",
      content: "",
      imageAlt: "blob",
      imageSrc: "blob:https://example/1",
    },
  ]);
  assert.match(md, /synaps-asset:img_abc/);
  assert.match(md, /\/demo\/bridge\.jpg/);
  assert.match(md, /synaps-asset:img_only/);
  assert.match(md, /!\[blob\]\(embedded-image\)/);
  assert.doesNotMatch(md, /data:image/);
  assert.doesNotMatch(md, /blob:/);
});
