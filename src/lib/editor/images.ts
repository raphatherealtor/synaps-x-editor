import {
  fingerprintBytes,
  getAssetByFingerprint,
  newAssetId,
  putAsset,
  StorageQuotaError,
  type ImageAssetRecord,
} from "./image-db";

export const MAX_EDGE = 1400;
export const JPEG_QUALITY = 0.78;
export const MAX_INPUT_BYTES = 24 * 1024 * 1024;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"]);

export class ImageIngestError extends Error {
  readonly code: "type" | "size" | "decode" | "quota";
  constructor(code: "type" | "size" | "decode" | "quota", message: string) {
    super(message);
    this.name = "ImageIngestError";
    this.code = code;
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new ImageIngestError("decode", "Could not read image");
  const head = dataUrl.slice(0, comma);
  const body = dataUrl.slice(comma + 1);
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? "image/jpeg";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function isAllowedType(type: string) {
  return ALLOWED.has(type) || type === "image/jpg";
}

async function decodeToBitmap(
  source: Blob | ImageBitmapSource,
): Promise<{ bitmap: ImageBitmap; width: number; height: number }> {
  try {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(source as Blob, {
        imageOrientation: "from-image",
      } as ImageBitmapOptions);
      return { bitmap, width: bitmap.width, height: bitmap.height };
    }
  } catch {
    /* fall through */
  }
  const blob = source instanceof Blob ? source : null;
  if (!blob) throw new ImageIngestError("decode", "Could not read image");
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new ImageIngestError("decode", "Could not read image"));
      el.src = url;
    });
    const bitmap = await createImageBitmap(img);
    return { bitmap, width: bitmap.width, height: bitmap.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function scaleSize(width: number, height: number) {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height, 1));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function canvasToJpeg(bitmap: ImageBitmap, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new ImageIngestError("decode", "Could not compress image");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY);
  });
  if (!blob) throw new ImageIngestError("decode", "Could not compress image");
  return blob;
}

export async function ingestBlob(
  blob: Blob,
  opts: { fingerprintHint?: string } = {},
): Promise<ImageAssetRecord> {
  const { bitmap, width, height } = await decodeToBitmap(blob);
  const size = scaleSize(width, height);
  const jpeg = await canvasToJpeg(bitmap, size.width, size.height);
  const bytes = await jpeg.arrayBuffer();
  const fingerprint = opts.fingerprintHint ?? (await fingerprintBytes(bytes));
  const existing = await getAssetByFingerprint(fingerprint).catch(() => undefined);
  if (existing) return existing;
  const now = Date.now();
  const record: ImageAssetRecord = {
    id: newAssetId(),
    mimeType: "image/jpeg",
    width: size.width,
    height: size.height,
    byteSize: jpeg.size,
    fingerprint,
    createdAt: now,
    updatedAt: now,
    blob: jpeg,
  };
  try {
    await putAsset(record);
  } catch (err) {
    if (err instanceof StorageQuotaError) {
      throw new ImageIngestError("quota", err.message);
    }
    throw err;
  }
  return record;
}

export async function ingestImageFile(file: File): Promise<ImageAssetRecord> {
  const type = file.type || "application/octet-stream";
  if (!type.startsWith("image/") || !isAllowedType(type)) {
    throw new ImageIngestError("type", "That file type is not supported.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageIngestError("size", "That image is too large (24 MB max).");
  }
  return ingestBlob(file);
}

export async function ingestDataUrl(dataUrl: string): Promise<ImageAssetRecord> {
  const blob = dataUrlToBlob(dataUrl);
  const fp = await fingerprintBytes(await blob.arrayBuffer());
  const existing = await getAssetByFingerprint(fp).catch(() => undefined);
  if (existing) return existing;
  return ingestBlob(blob, { fingerprintHint: fp });
}

export function isStaticImageSrc(src: string | undefined): boolean {
  if (!src) return false;
  return src.startsWith("/") && !src.startsWith("/data:");
}

export function isLegacyDataUrl(src: string | undefined): boolean {
  return Boolean(src?.startsWith("data:image/"));
}
