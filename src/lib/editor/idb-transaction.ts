export function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("Image transaction was aborted"));
    tx.onerror = () => {
      /* onabort is the final outcome */
    };
  });
}
