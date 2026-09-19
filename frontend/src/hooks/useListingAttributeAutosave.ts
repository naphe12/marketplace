import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "../api/client";
import type { CategoryAttribute } from "../types/category";
import type { SaveState } from "./useListingAutosave";

export function useListingAttributeAutosave(
  listingId: string | null,
  attributes: CategoryAttribute[],
  values: Record<string, string | number | boolean>,
) {
  const [state, setState] = useState<SaveState>("idle");
  const saved = useRef(new Map<string, string>());
  const queue = useRef<Promise<void>>(Promise.resolve());
  const generation = useRef(0);
  const snapshot = JSON.stringify(attributes.filter(a => values[a.id] !== undefined).map(attribute => {
    const value = values[attribute.id];
    const fields: Record<string, string> = {
      INTEGER: "value_integer", DECIMAL: "value_decimal", BOOLEAN: "value_boolean", DATE: "value_date",
    };
    const payload = value === "" ? {} : {
      [fields[attribute.data_type] ?? "value_text"]:
        attribute.data_type === "INTEGER" || attribute.data_type === "DECIMAL" ? Number(value)
          : attribute.data_type === "BOOLEAN" ? Boolean(value) : String(value),
    };
    return { id: attribute.id, payload };
  }));

  const flush = useCallback(() => {
    const version = generation.current;
    const task = queue.current.catch(() => {}).then(async () => {
      if (!listingId) return;
      const entries: { id: string; payload: Record<string, unknown> }[] = JSON.parse(snapshot);
      for (const entry of entries) {
        const key = `${listingId}/${entry.id}`;
        const body = JSON.stringify(entry.payload);
        if (saved.current.get(key) === body) continue;
        await apiRequest(`/listings/${listingId}/attributes/${entry.id}`, {
          method: "PUT", authenticated: true, body,
        });
        saved.current.set(key, body);
      }
    });
    queue.current = task;
    return task.then(() => {
      if (version === generation.current) setState(snapshot === "[]" ? "idle" : "saved");
    }, error => {
      if (version === generation.current) setState("error");
      throw error;
    });
  }, [listingId, snapshot]);

  useEffect(() => {
    generation.current += 1;
    if (!listingId || snapshot === "[]") { setState("idle"); return; }
    setState("saving");
    const timer = window.setTimeout(() => { void flush().catch(() => {}); }, 800);
    return () => { window.clearTimeout(timer); generation.current += 1; };
  }, [listingId, snapshot, flush]);

  return { state, flush };
}
