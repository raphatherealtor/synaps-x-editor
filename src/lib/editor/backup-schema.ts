import { z } from "zod";
import { SEMANTIC_TYPES } from "./types.ts";

const id = z.string().min(1).max(200);
const stamp = z.number().finite().nonnegative();
export const settingsSchema = z.object({
  fontScale: z.enum(["s", "m", "l"]),
  showRails: z.boolean(),
  compact: z.boolean(),
  focusMode: z.boolean(),
});
const blockSchema = z.object({
  id,
  semanticType: z.enum(SEMANTIC_TYPES),
  content: z.string().max(2_000_000),
  order: z.number().int().nonnegative(),
  createdAt: stamp,
  updatedAt: stamp,
  linkedNodeIds: z.array(id).max(10000),
  checked: z.boolean().optional(),
  imageAssetId: id.optional(),
  imageSrc: z.never().optional(),
  imageAlt: z.string().max(10000).optional(),
  imageWidth: z.number().min(1).max(100).optional(),
  calloutTone: z.enum(["info", "idea", "warn"]).optional(),
});
export const backupSchema = z.object({
  format: z.literal("synaps-x-backup"),
  version: z.literal(1),
  exportedAt: stamp,
  activeNoteId: id,
  settings: settingsSchema,
  notes: z
    .array(
      z.object({
        id,
        project: z.string().max(10000),
        createdAt: stamp,
        updatedAt: stamp,
        blocks: z.array(blockSchema).min(1).max(10000),
      }),
    )
    .min(1)
    .max(2000),
  assets: z
    .array(
      z.object({
        id,
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
        width: z.number().nonnegative().finite(),
        height: z.number().nonnegative().finite(),
        data: z
          .string()
          .max(34_000_000)
          .regex(/^[A-Za-z0-9+/]*={0,2}$/),
      }),
    )
    .max(10000),
});
export type JournalBackup = z.infer<typeof backupSchema>;

export function parseBackup(value: unknown): JournalBackup {
  const backup = backupSchema.parse(value);
  const noteIds = new Set<string>(),
    blockIds = new Set<string>(),
    assetIds = new Set<string>();
  for (const asset of backup.assets) {
    if (assetIds.has(asset.id) || !asset.data || asset.data.length % 4)
      throw new Error("Invalid or duplicate image asset");
    assetIds.add(asset.id);
  }
  let totalBlocks = 0;
  for (const note of backup.notes) {
    if (noteIds.has(note.id)) throw new Error("Duplicate note ID");
    noteIds.add(note.id);
    totalBlocks += note.blocks.length;
    if (totalBlocks > 20000) throw new Error("Backup exceeds 20,000 blocks");
    for (const block of note.blocks) {
      if (blockIds.has(block.id)) throw new Error("Duplicate block ID");
      blockIds.add(block.id);
      if (block.imageAssetId && !assetIds.has(block.imageAssetId))
        throw new Error("Backup is missing an image");
    }
  }
  if (!noteIds.has(backup.activeNoteId)) throw new Error("Active note is missing");
  if ([...noteIds].some((noteId) => blockIds.has(noteId)))
    throw new Error("Note and block IDs must be distinct");
  for (const note of backup.notes)
    for (const block of note.blocks) {
      if (block.linkedNodeIds.some((link) => !blockIds.has(link)))
        throw new Error("Backup contains a broken block link");
    }
  return backup;
}
