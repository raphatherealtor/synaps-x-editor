import { ImageIngestError, ingestImageFile } from "./images";
import { useEditorStore } from "./store";

export function reportImageError(err: unknown) {
  const setWarning = useEditorStore.getState().setStorageWarning;
  if (err instanceof ImageIngestError) {
    setWarning(err.message);
    return;
  }
  setWarning("Could not save that image.");
}

export async function ingestAndInsert(afterId: string | null, file: File) {
  const noteId = useEditorStore.getState().activeNoteId;
  try {
    const asset = await ingestImageFile(file);
    if (useEditorStore.getState().activeNoteId !== noteId) {
      useEditorStore
        .getState()
        .setStorageWarning("The selected note changed. Please insert the image again.");
      return null;
    }
    useEditorStore.getState().setStorageWarning(null);
    const alt = file.name.replace(/\.[^.]+$/, "") || "Inserted image";
    return useEditorStore.getState().insertImage(afterId, asset.id, alt);
  } catch (err) {
    reportImageError(err);
    return null;
  }
}

export async function ingestAndReplace(blockId: string, file: File) {
  const noteId = useEditorStore.getState().activeNoteId;
  try {
    const asset = await ingestImageFile(file);
    if (useEditorStore.getState().activeNoteId !== noteId) {
      useEditorStore
        .getState()
        .setStorageWarning("The selected note changed. Please insert the image again.");
      return null;
    }
    useEditorStore.getState().setStorageWarning(null);
    const alt = file.name.replace(/\.[^.]+$/, "") || "Inserted image";
    useEditorStore.getState().updateBlock(blockId, {
      imageAssetId: asset.id,
      imageSrc: undefined,
      imageAlt: alt,
    });
    return asset.id;
  } catch (err) {
    reportImageError(err);
    return null;
  }
}
