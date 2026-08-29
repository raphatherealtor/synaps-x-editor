import { uid } from "@/lib/utils";
import { putAsset, type ImageAssetRecord } from "./image-db";
import { useEditorStore } from "./store";
import type { Block, Note, SemanticType } from "./types";

function tinyJpegBlob(): Blob {
  const jpeg = Uint8Array.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
    0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x14, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x03, 0xff, 0xc4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
    0x4a, 0xff, 0xd9,
  ]);
  return new Blob([jpeg], { type: "image/jpeg" });
}

function block(
  type: SemanticType,
  content: string,
  extra: Partial<Block> = {},
): Block {
  const now = Date.now();
  return {
    id: uid("b"),
    semanticType: type,
    content,
    order: 0,
    createdAt: now,
    updatedAt: now,
    linkedNodeIds: [],
    ...extra,
  };
}

export async function buildStressNote(opts?: {
  textBlocks?: number;
  imageBlocks?: number;
  uniqueAssets?: number;
}): Promise<{ noteId: string; textBlocks: number; imageBlocks: number; assets: number }> {
  const textN = opts?.textBlocks ?? 320;
  const imageN = opts?.imageBlocks ?? 100;
  const unique = Math.max(1, opts?.uniqueAssets ?? 8);

  const assets: ImageAssetRecord[] = [];
  const blob = tinyJpegBlob();
  for (let i = 0; i < unique; i++) {
    const rec: ImageAssetRecord = {
      id: uid("img"),
      mimeType: "image/jpeg",
      width: 1,
      height: 1,
      byteSize: blob.size,
      fingerprint: `stress-${i}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      blob,
    };
    await putAsset(rec);
    assets.push(rec);
  }

  const blocks: Block[] = [
    block("title", "Stress lattice — capacity check"),
    block("heading", "Opening the long note"),
    block("body", "This note is generated to verify editor performance under load."),
  ];

  const types: SemanticType[] = [
    "body",
    "heading",
    "subheading",
    "quote",
    "checklist",
    "code",
    "callout",
    "caption",
  ];

  for (let i = 0; i < textN; i++) {
    const t = types[i % types.length];
    blocks.push(
      block(t, `Signal ${i + 1} — ${t} payload for scroll and caret stability.`, {
        checked: t === "checklist" ? i % 2 === 0 : undefined,
        calloutTone: t === "callout" ? "info" : undefined,
      }),
    );
    if (i < imageN) {
      const asset = assets[i % assets.length];
      blocks.push(
        block("image", "", {
          imageAssetId: asset.id,
          imageAlt: `stress-${i}`,
          imageWidth: 80,
        }),
      );
    }
  }

  const note: Note = {
    id: uid("note"),
    project: "STRESS",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    blocks: blocks.map((b, i) => ({ ...b, order: i })),
  };

  const store = useEditorStore.getState();
  store.replaceNotes([note, ...store.notes.filter((n) => n.project !== "STRESS")]);
  store.setActiveNote(note.id);
  return {
    noteId: note.id,
    textBlocks: blocks.filter((b) => b.semanticType !== "image").length,
    imageBlocks: blocks.filter((b) => b.semanticType === "image").length,
    assets: unique,
  };
}
