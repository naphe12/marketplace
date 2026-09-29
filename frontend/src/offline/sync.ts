import { API_URL } from "../api/client";
import {
  deleteQueuedAction,
  listQueuedActions,
  updateQueuedAction,
  type QueuedAction,
} from "./db";

let syncing = false;

function withAuthHeaders(action: QueuedAction) {
  const headers = new Headers(action.headers);

  if (action.authenticated) {
    const token = localStorage.getItem("access_token");
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

export async function syncQueuedActions() {
  if (syncing || !navigator.onLine) {
    return;
  }

  syncing = true;

  try {
    const actions = (await listQueuedActions())
      .filter(action => action.status !== "syncing")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    for (const action of actions) {
      await updateQueuedAction({ ...action, status: "syncing" });

      try {
        const response = await fetch(`${API_URL}${action.path}`, {
          method: action.method,
          headers: withAuthHeaders(action),
          body: action.body,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        await deleteQueuedAction(action.id);
        window.dispatchEvent(new CustomEvent("offline-action-synced", { detail: action }));
      } catch (cause) {
        await updateQueuedAction({
          ...action,
          status: "failed",
          lastError: cause instanceof Error ? cause.message : "Synchronisation impossible.",
        });
      }
    }
  } finally {
    syncing = false;
  }
}

export function startOfflineSync() {
  window.addEventListener("online", () => void syncQueuedActions());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void syncQueuedActions();
    }
  });

  void syncQueuedActions();
}
