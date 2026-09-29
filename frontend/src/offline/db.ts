const DB_NAME = "marketplace-offline";
const DB_VERSION = 1;

export type CachedResponse<T = unknown> = {
  key: string;
  value: T;
  updatedAt: string;
};

export type QueuedAction = {
  id: string;
  path: string;
  method: string;
  headers: [string, string][];
  body: string | null;
  authenticated: boolean;
  createdAt: string;
  status: "pending" | "syncing" | "failed";
  lastError?: string;
};

export type ListingDraftSnapshot = {
  id: string;
  listingId: string | null;
  updatedAt: string;
  data: unknown;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("apiCache")) {
        db.createObjectStore("apiCache", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("queue")) {
        db.createObjectStore("queue", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("listingDrafts")) {
        db.createObjectStore("listingDrafts", { keyPath: "id" });
      }
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function store<T>(
  name: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(name, mode);
    const request = action(transaction.objectStore(name));

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function putCache<T>(key: string, value: T) {
  await store("apiCache", "readwrite", objectStore =>
    objectStore.put({
      key,
      value,
      updatedAt: new Date().toISOString(),
    } satisfies CachedResponse<T>),
  );
}

export async function getCache<T>(key: string): Promise<CachedResponse<T> | undefined> {
  return store("apiCache", "readonly", objectStore => objectStore.get(key));
}

export async function enqueueAction(action: Omit<QueuedAction, "id" | "createdAt" | "status">) {
  const queued: QueuedAction = {
    ...action,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  await store("queue", "readwrite", objectStore => objectStore.put(queued));
  return queued;
}

export async function listQueuedActions(): Promise<QueuedAction[]> {
  return store("queue", "readonly", objectStore => objectStore.getAll());
}

export async function updateQueuedAction(action: QueuedAction) {
  await store("queue", "readwrite", objectStore => objectStore.put(action));
}

export async function deleteQueuedAction(id: string) {
  await store("queue", "readwrite", objectStore => objectStore.delete(id));
}

export async function saveListingDraft(snapshot: ListingDraftSnapshot) {
  await store("listingDrafts", "readwrite", objectStore => objectStore.put(snapshot));
}
