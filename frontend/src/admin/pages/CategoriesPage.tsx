import { useEffect, useMemo, useState, type FormEvent } from "react";

import { apiRequest } from "../../api/client";
import type { AdminCategory } from "../types";

const emptyCategory = { name: "", slug: "", parent_id: "", icon: "", description: "", active: true, sort_order: 0 };
const emptyAttribute = { name: "", code: "", data_type: "STRING", required: false, filterable: false, searchable: false, options: "", sort_order: 0 };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [categoryDraft, setCategoryDraft] = useState(emptyCategory);
  const [attributeDraft, setAttributeDraft] = useState(emptyAttribute);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    apiRequest<AdminCategory[]>("/admin/categories", { authenticated: true })
      .then(items => {
        setCategories(items);
        if (!selectedId && items[0]) setSelectedId(items[0].id);
      })
      .catch(cause => setError(cause instanceof Error ? cause.message : "Impossible de charger les catégories."));
  }, [attempt]);

  const selected = useMemo(() => categories.find(item => item.id === selectedId) ?? null, [categories, selectedId]);
  const childrenByParent = useMemo(() => {
    const map = new Map<string, AdminCategory[]>();
    categories.forEach(category => {
      const key = category.parent_id ?? "root";
      map.set(key, [...(map.get(key) ?? []), category]);
    });
    return map;
  }, [categories]);

  function renderTree(parentId: string | null = null, depth = 0) {
    return (childrenByParent.get(parentId ?? "root") ?? []).map(category => (
      <div key={category.id}>
        <button type="button" className={category.id === selectedId ? "admin-tree-item admin-tree-item--active" : "admin-tree-item"} style={{ paddingLeft: 12 + depth * 18 }} onClick={() => setSelectedId(category.id)}>
          <span>{category.icon ?? "-"}</span>
          <strong>{category.name}</strong>
          {!category.active && <small>inactive</small>}
        </button>
        {renderTree(category.id, depth + 1)}
      </div>
    ));
  }

  async function createCategory(event: FormEvent) {
    event.preventDefault();
    await apiRequest("/admin/categories", {
      method: "POST",
      authenticated: true,
      body: JSON.stringify({ ...categoryDraft, parent_id: categoryDraft.parent_id || null }),
    });
    setCategoryDraft(emptyCategory);
    setAttempt(value => value + 1);
  }

  async function updateCategory(field: string, value: unknown) {
    if (!selected) return;
    await apiRequest(`/admin/categories/${selected.id}`, {
      method: "PATCH",
      authenticated: true,
      body: JSON.stringify({ [field]: value }),
    });
    setAttempt(value => value + 1);
  }

  async function createAttribute(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    await apiRequest(`/admin/categories/${selected.id}/attributes`, {
      method: "POST",
      authenticated: true,
      body: JSON.stringify({
        ...attributeDraft,
        options: attributeDraft.options ? { values: attributeDraft.options.split(",").map(item => item.trim()).filter(Boolean) } : null,
      }),
    });
    setAttributeDraft(emptyAttribute);
    setAttempt(value => value + 1);
  }

  async function updateAttribute(attributeId: string, field: string, value: unknown) {
    await apiRequest(`/admin/category-attributes/${attributeId}`, {
      method: "PATCH",
      authenticated: true,
      body: JSON.stringify({ [field]: value }),
    });
    setAttempt(value => value + 1);
  }

  async function deleteAttribute(attributeId: string) {
    await apiRequest(`/admin/category-attributes/${attributeId}`, { method: "DELETE", authenticated: true });
    setAttempt(value => value + 1);
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <span>Formulaire dynamique</span>
          <h1>Catégories et caractéristiques</h1>
          <p>Gérez l'arborescence et les attributs utilisés dans la publication.</p>
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="admin-split">
        <aside className="admin-panel admin-tree">{renderTree()}</aside>
        <div className="admin-stack">
          <form className="admin-panel admin-editor-grid" onSubmit={createCategory}>
            <h2>Nouvelle catégorie</h2>
            <input placeholder="Nom" value={categoryDraft.name} onChange={event => setCategoryDraft({ ...categoryDraft, name: event.target.value })} />
            <input placeholder="Slug" value={categoryDraft.slug} onChange={event => setCategoryDraft({ ...categoryDraft, slug: event.target.value })} />
            <select value={categoryDraft.parent_id} onChange={event => setCategoryDraft({ ...categoryDraft, parent_id: event.target.value })}><option value="">Sans parent</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
            <input placeholder="Icône" value={categoryDraft.icon} onChange={event => setCategoryDraft({ ...categoryDraft, icon: event.target.value })} />
            <input placeholder="Description" value={categoryDraft.description} onChange={event => setCategoryDraft({ ...categoryDraft, description: event.target.value })} />
            <button type="submit">Créer</button>
          </form>
          {selected && (
            <section className="admin-panel admin-stack">
              <h2>{selected.name}</h2>
              <div className="admin-editor-grid">
                <input defaultValue={selected.name} onBlur={event => updateCategory("name", event.target.value)} />
                <input defaultValue={selected.slug} onBlur={event => updateCategory("slug", event.target.value)} />
                <input defaultValue={selected.icon ?? ""} onBlur={event => updateCategory("icon", event.target.value || null)} />
                <input defaultValue={selected.description ?? ""} onBlur={event => updateCategory("description", event.target.value || null)} />
                <input type="number" defaultValue={selected.sort_order} onBlur={event => updateCategory("sort_order", Number(event.target.value))} />
                <label><input type="checkbox" defaultChecked={selected.active} onChange={event => updateCategory("active", event.target.checked)} /> Active</label>
              </div>
              <h3>Attributs</h3>
              <div className="admin-attribute-list">
                {selected.attributes.map(attribute => (
                  <div key={attribute.id} className="admin-attribute-row">
                    <input defaultValue={attribute.name} onBlur={event => updateAttribute(attribute.id, "name", event.target.value)} />
                    <input defaultValue={attribute.code} onBlur={event => updateAttribute(attribute.id, "code", event.target.value)} />
                    <select defaultValue={attribute.data_type} onChange={event => updateAttribute(attribute.id, "data_type", event.target.value)}>{["STRING", "INTEGER", "DECIMAL", "BOOLEAN", "DATE", "SELECT"].map(type => <option key={type}>{type}</option>)}</select>
                    <label><input type="checkbox" defaultChecked={attribute.required} onChange={event => updateAttribute(attribute.id, "required", event.target.checked)} /> Requis</label>
                    <label><input type="checkbox" defaultChecked={attribute.filterable} onChange={event => updateAttribute(attribute.id, "filterable", event.target.checked)} /> Filtre</label>
                    <label><input type="checkbox" defaultChecked={attribute.searchable} onChange={event => updateAttribute(attribute.id, "searchable", event.target.checked)} /> Recherche</label>
                    <button type="button" onClick={() => deleteAttribute(attribute.id)}>Supprimer</button>
                  </div>
                ))}
              </div>
              <form className="admin-editor-grid" onSubmit={createAttribute}>
                <input placeholder="Nom" value={attributeDraft.name} onChange={event => setAttributeDraft({ ...attributeDraft, name: event.target.value })} />
                <input placeholder="Code" value={attributeDraft.code} onChange={event => setAttributeDraft({ ...attributeDraft, code: event.target.value })} />
                <select value={attributeDraft.data_type} onChange={event => setAttributeDraft({ ...attributeDraft, data_type: event.target.value })}>{["STRING", "INTEGER", "DECIMAL", "BOOLEAN", "DATE", "SELECT"].map(type => <option key={type}>{type}</option>)}</select>
                <input placeholder="Options séparées par virgule" value={attributeDraft.options} onChange={event => setAttributeDraft({ ...attributeDraft, options: event.target.value })} />
                <button type="submit">Ajouter attribut</button>
              </form>
            </section>
          )}
        </div>
      </div>
    </section>
  );
}
