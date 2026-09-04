import assert from "node:assert/strict";
import { test } from "node:test";
import { transactionDone } from "./idb-transaction.ts";
import { parseBackup } from "./backup-schema.ts";
import { journalStorage, flushPersistStorage, setPersistStatusHandler } from "./persist-storage.ts";

function fixture() {
  return {
    format: "synaps-x-backup",
    version: 1,
    exportedAt: 1,
    activeNoteId: "n",
    settings: { fontScale: "m", showRails: true, compact: false, focusMode: false },
    notes: [
      {
        id: "n",
        project: "Test",
        createdAt: 1,
        updatedAt: 1,
        blocks: [
          {
            id: "b",
            semanticType: "image",
            content: "",
            order: 0,
            createdAt: 1,
            updatedAt: 1,
            linkedNodeIds: [],
            imageAssetId: "i",
          },
        ],
      },
    ],
    assets: [{ id: "i", mimeType: "image/png", width: 1, height: 1, data: "YQ==" }],
  };
}
test("backup schema round-trips and rejects missing images, duplicate IDs, unknown versions", () => {
  assert.deepEqual(parseBackup(JSON.parse(JSON.stringify(fixture()))), fixture());
  const missing = fixture();
  missing.assets = [];
  assert.throws(() => parseBackup(missing));
  const duplicate = fixture();
  duplicate.notes.push(duplicate.notes[0]);
  assert.throws(() => parseBackup(duplicate));
  assert.throws(() => parseBackup({ ...fixture(), version: 2 }));
  assert.throws(() => parseBackup({ ...fixture(), activeNoteId: "missing" }));
});
test("backup rejects unsafe image refs, broken links, invalid base64 and empty notes", () => {
  const unsafe = fixture();
  Object.assign(unsafe.notes[0].blocks[0], { imageSrc: "https://example.com/tracker" });
  assert.throws(() => parseBackup(unsafe));
  const links = fixture();
  Object.assign(links.notes[0].blocks[0], { linkedNodeIds: ["missing"] });
  assert.throws(() => parseBackup(links));
  const bytes = fixture();
  bytes.assets[0].data = "!!!!";
  assert.throws(() => parseBackup(bytes));
  assert.throws(() => parseBackup({ ...fixture(), notes: [] }));
});
test("IDB promise waits for commit and rejects abort including quota", async () => {
  const tx = {
    oncomplete: null,
    onabort: null,
    onerror: null,
    error: null,
  } as unknown as IDBTransaction;
  let settled = false;
  const done = transactionDone(tx).then(() => {
    settled = true;
  });
  await Promise.resolve();
  assert.equal(settled, false);
  tx.oncomplete!.call(tx, new Event("complete"));
  await done;
  assert.equal(settled, true);
  const failed = {
    oncomplete: null,
    onabort: null,
    onerror: null,
    error: new DOMException("Full", "QuotaExceededError"),
  } as unknown as IDBTransaction;
  const rejected = transactionDone(failed);
  failed.onabort!.call(failed, new Event("abort"));
  await assert.rejects(rejected, { name: "QuotaExceededError" });
});
test("saving acknowledges successful writes; quota retains pending data for retry", () => {
  const statuses: string[] = [];
  let full = true;
  let stored = "";
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => null,
      removeItem: () => {},
      setItem: (_key: string, value: string) => {
        if (full) throw new DOMException("Full", "QuotaExceededError");
        stored = value;
      },
    },
  });
  setPersistStatusHandler((status) => statuses.push(status));
  journalStorage!.setItem("test", { state: { text: "keep me" }, version: 2 });
  assert.equal(flushPersistStorage(), false);
  assert.equal(statuses.at(-1), "offline");
  full = false;
  assert.equal(flushPersistStorage(), true);
  assert.equal(statuses.at(-1), "saved");
  assert.match(stored, /keep me/);
  setPersistStatusHandler(null);
});
