import type { Note } from "./types";
import { getAsset } from "./image-db";
import { ingestDataUrl, isLegacyDataUrl } from "./images";

/**
 * Copy legacy `data:` imageSrc values into IndexedDB and rewrite blocks
 * to `imageAssetId`. Static `/demo/` paths are left alone.
 * Re-runs are idempotent: fingerprint lookup reuses the same asset.
 * On failure the original block is unchanged.
 */
export async function migrateLegacyNotes(notes: Note[]): Promise<{
  notes: Note[];
  migrated: number;
  failed: number;
}> {
  let migrated = 0;
  let failed = 0;
  const nextNotes: Note[] = [];

  for (const note of notes) {
    let changed = false;
    const blocks = [];
    for (const block of note.blocks) {
      if (block.semanticType !== "image" || !isLegacyDataUrl(block.imageSrc)) {
        blocks.push(block);
        continue;
      }
      if (block.imageAssetId) {
        const existing = await getAsset(block.imageAssetId).catch(() => undefined);
        if (existing) {
          blocks.push({ ...block, imageSrc: undefined });
          changed = true;
          migrated += 1;
          continue;
        }
      }
      try {
        const asset = await ingestDataUrl(block.imageSrc as string);
        blocks.push({
          ...block,
          imageAssetId: asset.id,
          imageSrc: undefined,
          updatedAt: Date.now(),
        });
        changed = true;
        migrated += 1;
      } catch {
        failed += 1;
        blocks.push(block);
      }
    }
    nextNotes.push(changed ? { ...note, blocks } : note);
  }

  return { notes: nextNotes, migrated, failed };
}

export function collectAssetIds(notes: Note[]): Set<string> {
  const ids = new Set<string>();
  for (const note of notes) {
    for (const block of note.blocks) {
      if (block.imageAssetId) ids.add(block.imageAssetId);
    }
  }
  return ids;
}
