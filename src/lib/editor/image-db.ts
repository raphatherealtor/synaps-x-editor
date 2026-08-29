import { uid } from "@/lib/utils";

export interface ImageAssetRecord {
  id: string;
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
  fingerprint: string;
  createdAt: number;
  updatedAt: number;
  blob: Blob;
}

const DB_NAME = "synaps-x-images";
const DB_VERSION = 1;
const STORE = "assets";

const urlCache = new Map<string, { url: string; refs: number }>();
const pendingUrls = new Map<string, Promise<string>>();
const revokeTimers = new Map<string, ReturnType<typeof setTimeout>>();

let dbPromise: Promise<IDBDatabase> | null = null;

export class StorageQuotaError extends Error {
  readonly code = "quota" as const;
  constructor(message = "This device is out of storage for images.") {
    super(message);
    this.name = "StorageQuotaError";
  }
}

export function isQuotaError(err: unknown): boolean {
  if (err instanceof StorageQuotaError) return true;
  if (err instanceof DOMException) {
    return (
      err.name === "QuotaExceededError" ||
      err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      err.code === 22
    );
  }
  return false;
}

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available"));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("fingerprint", "fingerprint", { unique: false });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onclose = () => {
        dbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error("IndexedDB open failed"));
    };
  });
  return dbPromise;
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      const err = req.error;
      if (isQuotaError(err)) reject(new StorageQuotaError());
      else reject(err ?? new Error("IndexedDB request failed"));
    };
  });
}

export async function putAsset(record: ImageAssetRecord): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await reqToPromise(tx.objectStore(STORE).put(record));
  } catch (err) {
    if (isQuotaError(err)) throw new StorageQuotaError();
    throw err;
  }
}

export async function getAsset(id: string): Promise<ImageAssetRecord | undefined> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  return (await reqToPromise(tx.objectStore(STORE).get(id))) as
    | ImageAssetRecord
    | undefined;
}

export async function getAssetByFingerprint(
  fingerprint: string,
): Promise<ImageAssetRecord | undefined> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const index = tx.objectStore(STORE).index("fingerprint");
  return (await reqToPromise(index.get(fingerprint))) as ImageAssetRecord | undefined;
}

export async function deleteAsset(id: string): Promise<void> {
  releaseCachedUrl(id, true);
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  await reqToPromise(tx.objectStore(STORE).delete(id));
}

export async function listAssetIds(): Promise<string[]> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  return (await reqToPromise(tx.objectStore(STORE).getAllKeys())) as string[];
}

export async function pruneUnreferencedAssets(keep: Set<string>): Promise<number> {
  const ids = await listAssetIds();
  let removed = 0;
  for (const id of ids) {
    if (!keep.has(id)) {
      await deleteAsset(id);
      removed += 1;
    }
  }
  return removed;
}

function cacheRetain(id: string, url: string): string {
  const hit = urlCache.get(id);
  if (hit) {
    hit.refs += 1;
    const t = revokeTimers.get(id);
    if (t) {
      clearTimeout(t);
      revokeTimers.delete(id);
    }
    return hit.url;
  }
  urlCache.set(id, { url, refs: 1 });
  return url;
}

function releaseCachedUrl(id: string, force = false) {
  const hit = urlCache.get(id);
  if (!hit) return;
  hit.refs = force ? 0 : Math.max(0, hit.refs - 1);
  if (hit.refs > 0) return;
  const existing = revokeTimers.get(id);
  if (existing) clearTimeout(existing);
  revokeTimers.set(
    id,
    setTimeout(() => {
      revokeTimers.delete(id);
      const cur = urlCache.get(id);
      if (!cur || cur.refs > 0) return;
      URL.revokeObjectURL(cur.url);
      urlCache.delete(id);
    }, 4000),
  );
}

export async function retainAssetUrl(id: string): Promise<string> {
  const cached = urlCache.get(id);
  if (cached) {
    cached.refs += 1;
    const t = revokeTimers.get(id);
    if (t) {
      clearTimeout(t);
      revokeTimers.delete(id);
    }
    return cached.url;
  }
  let pending = pendingUrls.get(id);
  if (!pending) {
    pending = (async () => {
      const asset = await getAsset(id);
      if (!asset) throw new Error(`Missing image asset ${id}`);
      const url = URL.createObjectURL(asset.blob);
      if (!urlCache.has(id)) urlCache.set(id, { url, refs: 0 });
      return urlCache.get(id)!.url;
    })().finally(() => {
      pendingUrls.delete(id);
    });
    pendingUrls.set(id, pending);
  }
  const url = await pending;
  return cacheRetain(id, url);
}

export function releaseAssetUrl(id: string) {
  releaseCachedUrl(id, false);
}

export function newAssetId() {
  return uid("img");
}

export async function fingerprintBytes(data: ArrayBuffer): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", data);
    const bytes = new Uint8Array(digest);
    let hex = "";
    for (let i = 0; i < 16; i++) hex += bytes[i].toString(16).padStart(2, "0");
    return hex;
  }
  const bytes = new Uint8Array(data);
  let hash = 2166136261;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
