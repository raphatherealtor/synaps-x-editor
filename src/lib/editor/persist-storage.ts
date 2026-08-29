import { createJSONStorage, type StateStorage } from "zustand/middleware";
import { isQuotaError, StorageQuotaError } from "./image-db";

type QuotaHandler = (err: StorageQuotaError) => void;

let onQuota: QuotaHandler | null = null;
let beforeFlush: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let pending: { name: string; value: string } | null = null;

export function setPersistQuotaHandler(handler: QuotaHandler | null) {
  onQuota = handler;
}

export function setBeforePersistFlush(fn: (() => void) | null) {
  beforeFlush = fn;
}

function writeNow(name: string, value: string) {
  try {
    localStorage.setItem(name, value);
  } catch (err) {
    if (isQuotaError(err)) {
      onQuota?.(new StorageQuotaError("Note text could not be saved — storage is full."));
      return;
    }
    throw err;
  }
}

const raw: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    pending = { name, value };
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const job = pending;
      pending = null;
      if (job) writeNow(job.name, job.value);
    }, 360);
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

export function flushPersistStorage() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (pending) {
    const job = pending;
    pending = null;
    writeNow(job.name, job.value);
  }
}

function flushAll() {
  try {
    beforeFlush?.();
  } catch {
    /* keep going — persist whatever is already in the store */
  }
  flushPersistStorage();
}

export const journalStorage = createJSONStorage(() => raw);

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushAll);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAll();
  });
}
