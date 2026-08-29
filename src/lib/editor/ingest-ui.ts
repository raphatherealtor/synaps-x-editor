import { ImageIngestError, ingestImageFile } from "./images";
import { pruneUnreferencedAssets } from "./image-db";
import { collectAssetIds } from "./migrate-images";
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
  try {
    const asset = await ingestImageFile(file);
    useEditorStore.getState().setStorageWarning(null);
    const alt = file.name.replace(/\.[^.]+$/, "") || "Inserted image";
    return useEditorStore.getState().insertImage(afterId, asset.id, alt);
  } catch (err) {
    reportImageError(err);
    return null;
  }
}

export async function ingestAndReplace(blockId: string, file: File) {
  try {
    const asset = await ingestImageFile(file);
    useEditorStore.getState().setStorageWarning(null);
    const alt = file.name.replace(/\.[^.]+$/, "") || "Inserted image";
    useEditorStore.getState().updateBlock(blockId, {
      imageAssetId: asset.id,
      imageSrc: undefined,
      imageAlt: alt,
    });
    void pruneUnreferencedAssets(collectAssetIds(useEditorStore.getState().notes)).catch(
      () => undefined,
    );
    return asset.id;
  } catch (err) {
    reportImageError(err);
    return null;
  }
}
