import { uid } from "@/lib/utils";
import {
  getAsset,
  putAsset,
  deleteAsset,
  fingerprintBytes,
  type ImageAssetRecord,
} from "./image-db";
import { parseBackup, type JournalBackup } from "./backup-schema";
import { flushAll, flushPersistStorage } from "./persist-storage";
import { useEditorStore } from "./store";

export const MAX_BACKUP_BYTES = 96 * 1024 * 1024;

function encode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 32768)
    binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(binary);
}

export async function exportJournal(): Promise<JournalBackup> {
  flushAll(); // Keep exporting possible even if the device has run out of storage.
  const state = useEditorStore.getState();
  const notes = structuredClone(state.notes);
  const assets = new Map<string, JournalBackup["assets"][number]>();
  for (const note of notes)
    for (const block of note.blocks) {
      if (block.imageAssetId && !assets.has(block.imageAssetId)) {
        const asset = await getAsset(block.imageAssetId);
        if (!asset)
          throw new Error(
            "An image is missing on this device. Backup stopped to avoid an incomplete export.",
          );
        assets.set(asset.id, {
          id: asset.id,
          mimeType: asset.mimeType as "image/jpeg",
          width: asset.width,
          height: asset.height,
          data: encode(new Uint8Array(await asset.blob.arrayBuffer())),
        });
      } else if (!block.imageAssetId && block.imageSrc) {
        const src = block.imageSrc;
        if (!(src.startsWith("/demo/") || /^data:image\/(jpeg|png|webp|gif);base64,/.test(src))) {
          throw new Error("An unsupported image reference cannot be included in the backup.");
        }
        const response = await fetch(src);
        if (!response.ok) throw new Error("Could not read a demo image for backup.");
        const blob = await response.blob();
        const assetId = uid("backup-image");
        assets.set(assetId, {
          id: assetId,
          mimeType: blob.type as "image/jpeg",
          width: 0,
          height: 0,
          data: encode(new Uint8Array(await blob.arrayBuffer())),
        });
        block.imageAssetId = assetId;
      }
      delete block.imageSrc;
    }
  // Old journals may contain links to deliberately deleted blocks.
  const ids = new Set(notes.flatMap((n) => n.blocks.map((b) => b.id)));
  for (const note of notes)
    for (const block of note.blocks)
      block.linkedNodeIds = block.linkedNodeIds.filter((id) => ids.has(id));
  const backup = parseBackup({
    format: "synaps-x-backup",
    version: 1,
    exportedAt: Date.now(),
    notes,
    assets: [...assets.values()],
    settings: state.settings,
    activeNoteId: state.activeNoteId,
  });
  if (new Blob([JSON.stringify(backup)]).size > MAX_BACKUP_BYTES)
    throw new Error("Backup exceeds the beta's 96 MB limit.");
  return backup;
}

/** Additive restore: original notes and blobs are never overwritten. */
export async function importJournal(file: File): Promise<number> {
  if (file.size > MAX_BACKUP_BYTES) throw new Error("Backup exceeds 96 MB.");
  const backup = parseBackup(JSON.parse(await file.text()));
  const ids = new Map<string, string>();
  for (const note of backup.notes) {
    ids.set(note.id, uid("note"));
    for (const block of note.blocks) ids.set(block.id, uid("b"));
  }
  const assetIds = new Map(backup.assets.map((a) => [a.id, uid("img")]));
  const written: string[] = [];
  try {
    for (const asset of backup.assets) {
      const data = Uint8Array.from(atob(asset.data), (c) => c.charCodeAt(0));
      const blob = new Blob([data], { type: asset.mimeType });
      const bitmap = await createImageBitmap(blob); // Reject malformed binary before storing.
      const record: ImageAssetRecord = {
        id: assetIds.get(asset.id)!,
        blob,
        mimeType: asset.mimeType,
        width: bitmap.width,
        height: bitmap.height,
        byteSize: blob.size,
        fingerprint: await fingerprintBytes(await blob.arrayBuffer()),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      bitmap.close();
      await putAsset(record);
      written.push(record.id);
    }
    const imported = backup.notes.map((note) => ({
      ...note,
      id: ids.get(note.id)!,
      blocks: note.blocks.map((block) => ({
        ...block,
        id: ids.get(block.id)!,
        linkedNodeIds: block.linkedNodeIds.map((id) => ids.get(id)!),
        imageAssetId: block.imageAssetId ? assetIds.get(block.imageAssetId)! : undefined,
      })),
    }));
    flushAll();
    const previous = useEditorStore.getState();
    useEditorStore.setState({
      notes: [...imported, ...previous.notes],
      activeNoteId: ids.get(backup.activeNoteId)!,
      activeBlockId: null,
      settings: { ...backup.settings, focusMode: false },
    });
    if (!flushPersistStorage()) {
      useEditorStore.setState({
        notes: previous.notes,
        activeNoteId: previous.activeNoteId,
        activeBlockId: previous.activeBlockId,
        settings: previous.settings,
      });
      flushPersistStorage();
      throw new Error("Not enough storage to restore these notes. Your original journal was kept.");
    }
    return imported.length;
  } catch (error) {
    await Promise.all(written.map((id) => deleteAsset(id).catch(() => undefined)));
    throw error;
  }
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
