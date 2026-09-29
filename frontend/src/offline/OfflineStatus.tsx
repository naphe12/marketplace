import { useEffect, useState } from "react";

import { listQueuedActions } from "./db";
import { syncQueuedActions } from "./sync";

export default function OfflineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  async function refreshQueue() {
    const actions = await listQueuedActions();
    setPendingCount(actions.length);
  }

  useEffect(() => {
    const refresh = () => {
      setOnline(navigator.onLine);
      void refreshQueue();
    };

    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.addEventListener("offline-action-queued", refresh);
    window.addEventListener("offline-action-synced", refresh);
    void refreshQueue();

    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("offline-action-queued", refresh);
      window.removeEventListener("offline-action-synced", refresh);
    };
  }, []);

  if (online && pendingCount === 0) {
    return null;
  }

  return (
    <div className="offline-status" role="status">
      <span>{online ? `${pendingCount} action${pendingCount > 1 ? "s" : ""} en synchronisation` : "Hors ligne"}</span>
      {online && pendingCount > 0 && (
        <button type="button" onClick={() => void syncQueuedActions()}>Synchroniser</button>
      )}
    </div>
  );
}
