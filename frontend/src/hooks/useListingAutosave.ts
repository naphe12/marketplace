import { useEffect, useRef, useState } from "react";

import { apiRequest } from "../api/client";

export type SaveState = "idle" | "saving" | "saved" | "error";

type ListingDraft = {
  title: string;
  description: string;

  condition: string;

  price: string;
  currency: string;
  price_type: string;

  allow_offers: boolean;

  administrative_area_id:
    string | null;

  latitude:
    number | null;

  longitude:
    number | null;
};

export function useListingAutosave(
  listingId: string | null,
  draft: ListingDraft,
) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const firstRun = useRef(true);

  useEffect(() => {
    if (!listingId) return;

    // Évite un PATCH inutile au premier rendu avec un identifiant.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    setSaveState("saving");

    const timeout = window.setTimeout(async () => {
      try {
        await apiRequest(`/listings/${listingId}`, {
          method: "PATCH",
          authenticated: true,
          body: JSON.stringify({
            title: draft.title,
            description: draft.description,
            condition: draft.condition,
            price: draft.price ? Number(draft.price) : null,
            currency: draft.currency,
            price_type: draft.price_type,
            allow_offers: draft.allow_offers,
            administrative_area_id: draft.administrative_area_id,
          }),
        });
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [
    listingId,
    draft.title,
    draft.description,
    draft.condition,
    draft.price,
    draft.currency,
    draft.price_type,
    draft.allow_offers,
    draft.administrative_area_id,
  ]);

  return saveState;
}
