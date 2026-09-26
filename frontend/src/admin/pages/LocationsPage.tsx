import { useEffect, useMemo, useState, type FormEvent } from "react";

import { apiRequest } from "../../api/client";
import LocationPicker from "../../components/location/LocationPicker";
import type { AdminArea } from "../types";

const areaTypes = ["PROVINCE", "COMMUNE", "ZONE", "COLLINE", "QUARTIER"];
const emptyArea = { name: "", area_type: "PROVINCE", parent_id: "", code: "", latitude: "", longitude: "", active: true };

export default function LocationsPage() {
  const [areas, setAreas] = useState<AdminArea[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(emptyArea);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);
  const selected = useMemo(() => areas.find(area => area.id === selectedId) ?? null, [areas, selectedId]);
  const visibleAreaIds = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return null;
    }

    const byId = new Map(areas.map(area => [area.id, area]));
    const ids = new Set<string>();

    areas.forEach(area => {
      const haystack = `${area.name} ${area.area_type} ${area.code ?? ""}`.toLowerCase();

      if (!haystack.includes(normalized)) {
        return;
      }

      let current: AdminArea | undefined = area;

      while (current) {
        ids.add(current.id);
        current = current.parent_id ? byId.get(current.parent_id) : undefined;
      }
    });

    return ids;
  }, [areas, query]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, AdminArea[]>();
    areas.forEach(area => {
      if (visibleAreaIds && !visibleAreaIds.has(area.id)) {
        return;
      }

      const key = area.parent_id ?? "root";
      map.set(key, [...(map.get(key) ?? []), area]);
    });
    return map;
  }, [areas, visibleAreaIds]);

  useEffect(() => {
    apiRequest<AdminArea[]>("/admin/administrative-areas", { authenticated: true })
      .then(items => {
        setAreas(items);
        if (!selectedId && items[0]) setSelectedId(items[0].id);
      })
      .catch(cause => setError(cause instanceof Error ? cause.message : "Impossible de charger les localisations."));
  }, [attempt]);

  function renderTree(parentId: string | null = null, depth = 0) {
    return (childrenByParent.get(parentId ?? "root") ?? []).map(area => (
      <div key={area.id}>
        <button type="button" className={area.id === selectedId ? "admin-tree-item admin-tree-item--active" : "admin-tree-item"} style={{ paddingLeft: 12 + depth * 18 }} onClick={() => setSelectedId(area.id)}>
          <span>{area.area_type}</span>
          <strong>{area.name}</strong>
          {!area.active && <small>inactive</small>}
        </button>
        {renderTree(area.id, depth + 1)}
      </div>
    ));
  }

  async function createArea(event: FormEvent) {
    event.preventDefault();
    await apiRequest("/admin/administrative-areas", {
      method: "POST",
      authenticated: true,
      body: JSON.stringify({
        ...draft,
        parent_id: draft.parent_id || null,
        latitude: draft.latitude ? Number(draft.latitude) : null,
        longitude: draft.longitude ? Number(draft.longitude) : null,
      }),
    });
    setDraft(emptyArea);
    setAttempt(value => value + 1);
  }

  function isValidCoordinate(field: string, value: unknown) {
    if (value === null || value === "") {
      return true;
    }

    const numberValue = Number(value);
    const limit = field === "latitude" ? 90 : field === "longitude" ? 180 : null;

    return limit === null || (Number.isFinite(numberValue) && Math.abs(numberValue) <= limit);
  }

  async function updateArea(field: string, value: unknown) {
    if (!selected) return;

    if (!isValidCoordinate(field, value)) {
      setError(field === "latitude" ? "Latitude invalide." : "Longitude invalide.");
      return;
    }

    setError("");

    await apiRequest(`/admin/administrative-areas/${selected.id}`, {
      method: "PATCH",
      authenticated: true,
      body: JSON.stringify({ [field]: value }),
    });
    setAttempt(value => value + 1);
  }

  async function updateCoordinates(latitude: number, longitude: number) {
    if (!selected) return;

    setError("");

    await apiRequest(`/admin/administrative-areas/${selected.id}`, {
      method: "PATCH",
      authenticated: true,
      body: JSON.stringify({ latitude, longitude }),
    });

    setAttempt(value => value + 1);
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span>Dataset géographique</span>
          <h1>Localisation</h1>
          <p>Corrigez progressivement province, commune, zone et colline/quartier.</p>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="admin-split">
        <aside className="admin-panel admin-tree">
          <strong>Burundi</strong>
          <input
            className="admin-location-search"
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Rechercher une zone"
          />
          {renderTree()}
        </aside>
        <div className="admin-stack">
          <form className="admin-panel admin-editor-grid" onSubmit={createArea}>
            <h2>Nouvelle zone</h2>
            <input placeholder="Nom" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} />
            <select value={draft.area_type} onChange={event => setDraft({ ...draft, area_type: event.target.value })}>{areaTypes.map(type => <option key={type}>{type}</option>)}</select>
            <select value={draft.parent_id} onChange={event => setDraft({ ...draft, parent_id: event.target.value })}><option value="">Sans parent</option>{areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}</select>
            <input placeholder="Code" value={draft.code} onChange={event => setDraft({ ...draft, code: event.target.value })} />
            <input placeholder="Latitude" value={draft.latitude} onChange={event => setDraft({ ...draft, latitude: event.target.value })} />
            <input placeholder="Longitude" value={draft.longitude} onChange={event => setDraft({ ...draft, longitude: event.target.value })} />
            <button type="submit">Ajouter</button>
          </form>
          {selected && (
            <section className="admin-panel admin-stack">
              <h2>{selected.name}</h2>
              <div className="admin-editor-grid">
                <input defaultValue={selected.name} onBlur={event => updateArea("name", event.target.value)} />
                <select defaultValue={selected.area_type} onChange={event => updateArea("area_type", event.target.value)}>{areaTypes.map(type => <option key={type}>{type}</option>)}</select>
                <input defaultValue={selected.code ?? ""} onBlur={event => updateArea("code", event.target.value || null)} />
                <input defaultValue={selected.latitude ?? ""} onBlur={event => updateArea("latitude", event.target.value ? Number(event.target.value) : null)} />
                <input defaultValue={selected.longitude ?? ""} onBlur={event => updateArea("longitude", event.target.value ? Number(event.target.value) : null)} />
                <label><input type="checkbox" defaultChecked={selected.active} onChange={event => updateArea("active", event.target.checked)} /> Active</label>
              </div>
              <LocationPicker
                latitude={selected.latitude == null ? null : Number(selected.latitude)}
                longitude={selected.longitude == null ? null : Number(selected.longitude)}
                defaultLatitude={selected.latitude == null ? null : Number(selected.latitude)}
                defaultLongitude={selected.longitude == null ? null : Number(selected.longitude)}
                onChange={(latitude, longitude) => void updateCoordinates(latitude, longitude)}
              />
              {selected.latitude != null && selected.longitude != null && (
                <a className="text-button" href={`https://www.openstreetmap.org/?mlat=${selected.latitude}&mlon=${selected.longitude}#map=14/${selected.latitude}/${selected.longitude}`} target="_blank" rel="noreferrer">Ouvrir dans OpenStreetMap</a>
              )}
            </section>
          )}
        </div>
      </div>
    </section>
  );
}
