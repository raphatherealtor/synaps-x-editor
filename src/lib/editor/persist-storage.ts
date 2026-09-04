import { createJSONStorage, type StateStorage } from "zustand/middleware";
import { isQuotaError, StorageQuotaError } from "./image-db.ts";

type Status = "saved" | "saving" | "offline";
let onQuota: ((err: StorageQuotaError) => void) | null = null;
let onStatus: ((state: Status) => void) | null = null;
let beforeFlush: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let pending: { name: string; value: string } | null = null;
let lastSaved: string | null = null;

export function setPersistQuotaHandler(handler: typeof onQuota) {
  onQuota = handler;
}
export function setPersistStatusHandler(handler: typeof onStatus) {
  onStatus = handler;
}
export function setBeforePersistFlush(fn: typeof beforeFlush) {
  beforeFlush = fn;
}

function writeNow(name: string, value: string): boolean {
  try {
    localStorage.setItem(name, value);
    lastSaved = value;
    pending = null;
    onStatus?.("saved");
    return true;
  } catch (err) {
    pending = { name, value };
    onStatus?.("offline");
    onQuota?.(
      new StorageQuotaError(
        isQuotaError(err)
          ? "Not saved: device storage is full. Export a full backup now."
          : "Not saved: browser storage is unavailable. Export a full backup now.",
      ),
    );
    return false;
  }
}

const raw: StateStorage = {
  getItem: (name) => {
    const value = localStorage.getItem(name);
    lastSaved = value;
    return value;
  },
  setItem: (name, value) => {
    if (pending?.value === value || (!pending && lastSaved === value)) return;
    pending = { name, value };
    if (timer) clearTimeout(timer);
    onStatus?.("saving");
    timer = setTimeout(() => {
      timer = null;
      flushPersistStorage();
    }, 360);
  },
  removeItem: (name) => {
    localStorage.removeItem(name);
    lastSaved = null;
  },
};

export function flushPersistStorage(): boolean {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  return pending ? writeNow(pending.name, pending.value) : true;
}

export function flushAll(): boolean {
  beforeFlush?.();
  return flushPersistStorage();
}

export const journalStorage = createJSONStorage(() => raw);
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    flushAll();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAll();
  });
}
