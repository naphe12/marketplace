import { Check, CloudOff, LoaderCircle } from "lucide-react";

import type { SaveState } from "../../hooks/useListingAutosave";

export default function AutosaveStatus({ state }: { state: SaveState }) {
  if (state === "idle") return null;

  if (state === "saving") {
    return (
      <div className="autosave-status" role="status" aria-live="polite">
        <LoaderCircle size={14} className="spin" aria-hidden="true" />
        Enregistrement...
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="autosave-status autosave-status--error" role="status" aria-live="polite">
        <CloudOff size={14} aria-hidden="true" />
        Non enregistré
      </div>
    );
  }

  return (
    <div className="autosave-status autosave-status--saved" role="status" aria-live="polite">
      <Check size={14} aria-hidden="true" />
      Enregistré
    </div>
  );
}
