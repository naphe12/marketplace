import { useEffect, useMemo, useState, type FormEvent } from "react";

import { apiRequest, downloadApiFile } from "../../api/client";
import LocationPicker from "../../components/location/LocationPicker";
import type { AdminArea, AdminCountry } from "../types";

const areaTypes = ["PROVINCE", "COMMUNE", "ZONE", "COLLINE", "QUARTIER"];
const emptyCountry = {
  code: "",
  name: "",
  currency: "BIF",
  phone_prefix: "",
  default_language: "fr",
  active: true,
  sort_order: 0,
};
const emptyArea = {
  name: "",
  area_type: "PROVINCE",
  parent_id: "",
  code: "",
  latitude: "",
  longitude: "",
  active: true,
};

export default function LocationsPage() {
  const [countries, setCountries] = useState<AdminCountry[]>([]);
  const [countryDraft, setCountryDraft] = useState(emptyCountry);
  const [selectedCountryCode, setSelectedCountryCode] = useState("BI");
  const [areas, setAreas] = useState<AdminArea[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState(emptyArea);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);

  const selectedCountry = useMemo(
    () => countries.find(country => country.code === selectedCountryCode) ?? null,
    [countries, selectedCountryCode],
  );
  const selected = useMemo(() => areas.find(area => area.id === selectedId) ?? null, [areas, selectedId]);
  const countryAreas = useMemo(
    () => areas.filter(area => area.country_code === selectedCountryCode),
    [areas, selectedCountryCode],
  );
  const activeCountries = useMemo(
    () => countries.filter(country => country.active),
    [countries],
  );

  const visibleAreaIds = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return null;
    }

    const byId = new Map(countryAreas.map(area => [area.id, area]));
    const ids = new Set<string>();

    countryAreas.forEach(area => {
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
  }, [countryAreas, query]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, AdminArea[]>();
    countryAreas.forEach(area => {
      if (visibleAreaIds && !visibleAreaIds.has(area.id)) {
        return;
      }

      const key = area.parent_id ?? "root";
      map.set(key, [...(map.get(key) ?? []), area]);
    });
    return map;
  }, [countryAreas, visibleAreaIds]);

  useEffect(() => {
    Promise.all([
      apiRequest<AdminCountry[]>("/admin/countries", { authenticated: true }),
      apiRequest<AdminArea[]>("/admin/administrative-areas", { authenticated: true }),
    ])
      .then(([loadedCountries, loadedAreas]) => {
        setCountries(loadedCountries);
        setAreas(loadedAreas);

        const nextCountry =
          loadedCountries.find(country => country.code === selectedCountryCode) ??
          loadedCountries.find(country => country.active) ??
          loadedCountries[0];

        if (nextCountry) {
          setSelectedCountryCode(nextCountry.code);
        }

        const nextArea = loadedAreas.find(area => area.country_code === (nextCountry?.code ?? selectedCountryCode));
        setSelectedId(nextArea?.id ?? "");
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

  async function createCountry(event: FormEvent) {
    event.preventDefault();
    await apiRequest("/admin/countries", {
      method: "POST",
      authenticated: true,
      body: JSON.stringify({
        ...countryDraft,
        code: countryDraft.code.toUpperCase(),
        currency: countryDraft.currency.toUpperCase(),
        phone_prefix: countryDraft.phone_prefix || null,
      }),
    });
    setCountryDraft(emptyCountry);
    setAttempt(value => value + 1);
  }

  async function updateCountry(country: AdminCountry, field: string, value: unknown) {
    await apiRequest(`/admin/countries/${country.id}`, {
      method: "PATCH",
      authenticated: true,
      body: JSON.stringify({ [field]: value }),
    });
    setAttempt(value => value + 1);
  }

  async function createArea(event: FormEvent) {
    event.preventDefault();
    await apiRequest("/admin/administrative-areas", {
      method: "POST",
      authenticated: true,
      body: JSON.stringify({
        ...draft,
        country_code: selectedCountryCode,
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

  async function exportCsv() {
    await downloadApiFile(
      `/admin/administrative-areas/export?country_code=${selectedCountryCode}`,
      `administrative-areas-${selectedCountryCode}.csv`,
    );
  }

  async function importCsv(file: File | null) {
    if (!file) {
      return;
    }

    setError("");

    const content = await file.text();
    await apiRequest<{ created: number; updated: number }>(
      `/admin/administrative-areas/import?country_code=${selectedCountryCode}`,
      {
        method: "POST",
        authenticated: true,
        headers: {
          "Content-Type": "text/csv",
        },
        body: content,
      },
    );
    setAttempt(value => value + 1);
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span>Dataset geographique</span>
          <h1>Localisation</h1>
          <p>Activez les pays ouverts au public, puis rattachez les zones au pays choisi.</p>
        </div>

        <div className="admin-location-actions">
          <button type="button" className="secondary-button inline-button" onClick={() => void exportCsv()}>
            Export CSV
          </button>
          <label className="secondary-button inline-button">
            Import CSV
            <input
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={event => {
                void importCsv(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}

      <section className="admin-panel admin-stack">
        <h2>Pays actifs</h2>
        <div className="admin-country-grid">
          {countries.map(country => (
            <button
              key={country.id}
              type="button"
              className={country.code === selectedCountryCode ? "admin-country-card admin-country-card--active" : "admin-country-card"}
              onClick={() => {
                setSelectedCountryCode(country.code);
                setSelectedId(areas.find(area => area.country_code === country.code)?.id ?? "");
              }}
            >
              <strong>{country.name}</strong>
              <span>{country.code} · {country.currency} · {country.phone_prefix ?? "sans indicatif"}</span>
              <label onClick={event => event.stopPropagation()}>
                <input type="checkbox" checked={country.active} onChange={event => void updateCountry(country, "active", event.target.checked)} /> Actif public
              </label>
            </button>
          ))}
        </div>

        <form className="admin-editor-grid" onSubmit={createCountry}>
          <input placeholder="Code pays, ex: RW" value={countryDraft.code} onChange={event => setCountryDraft({ ...countryDraft, code: event.target.value.toUpperCase().slice(0, 2) })} />
          <input placeholder="Nom" value={countryDraft.name} onChange={event => setCountryDraft({ ...countryDraft, name: event.target.value })} />
          <input placeholder="Devise" value={countryDraft.currency} onChange={event => setCountryDraft({ ...countryDraft, currency: event.target.value.toUpperCase().slice(0, 3) })} />
          <input placeholder="Indicatif, ex: +250" value={countryDraft.phone_prefix} onChange={event => setCountryDraft({ ...countryDraft, phone_prefix: event.target.value })} />
          <input placeholder="Langue" value={countryDraft.default_language} onChange={event => setCountryDraft({ ...countryDraft, default_language: event.target.value })} />
          <button type="submit">Ajouter un pays</button>
        </form>
      </section>

      <div className="admin-split">
        <aside className="admin-panel admin-tree">
          <strong>{selectedCountry?.name ?? selectedCountryCode}</strong>
          <p className="admin-muted">{activeCountries.length} pays actif(s) cote public</p>
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
            <h2>Nouvelle zone - {selectedCountry?.name ?? selectedCountryCode}</h2>
            <input placeholder="Nom" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} />
            <select value={draft.area_type} onChange={event => setDraft({ ...draft, area_type: event.target.value })}>{areaTypes.map(type => <option key={type}>{type}</option>)}</select>
            <select value={draft.parent_id} onChange={event => setDraft({ ...draft, parent_id: event.target.value })}><option value="">Sans parent</option>{countryAreas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}</select>
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
                <select defaultValue={selected.country_code} onChange={event => updateArea("country_code", event.target.value)}>{countries.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}</select>
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
