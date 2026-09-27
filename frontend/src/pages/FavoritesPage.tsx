import {
  Folder,
  Heart,
  Plus,
  Scale,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  Link,
} from "react-router-dom";

import { apiRequest } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import ListingCard from "../components/listings/ListingCard";

import type {
  FavoriteFolder,
  FavoriteItem,
} from "../types/favorite";


export default function FavoritesPage() {
  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [favorites, setFavorites] =
    useState<FavoriteItem[]>([]);

  const [folders, setFolders] =
    useState<FavoriteFolder[]>([]);

  const [activeFolderId, setActiveFolderId] =
    useState<string | null>(null);

  const [folderName, setFolderName] =
    useState("");

  const [creatingFolder, setCreatingFolder] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [attempt, setAttempt] =
    useState(0);

  const [comparisonIds, setComparisonIds] =
    useState<string[]>([]);


  useEffect(() => {
    if (authLoading || !user) {
      setFavorites([]);
      setFolders([]);
      setLoading(false);
      setError("");
      return;
    }

    const controller =
      new AbortController();

    setLoading(true);
    setError("");

    Promise.all([
      apiRequest<FavoriteItem[]>(
        "/favorites/detailed",
        {
          authenticated: true,
          signal: controller.signal,
        },
      ),
      apiRequest<FavoriteFolder[]>(
        "/favorite-folders",
        {
          authenticated: true,
          signal: controller.signal,
        },
      ),
    ])
      .then(([loadedFavorites, loadedFolders]) => {
        if (!controller.signal.aborted) {
          setFavorites(
            loadedFavorites.map(item => ({
              ...item,
              listing: {
                ...item.listing,
                is_favorite: true,
              },
            })),
          );
          setFolders(loadedFolders);
        }
      })
      .catch(cause => {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Impossible de charger vos favoris.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [authLoading, user, attempt]);


  const filteredFavorites = useMemo(
    () => favorites.filter(item => (
      activeFolderId === null
        ? true
        : activeFolderId === "uncategorized"
          ? item.folder_id === null
          : item.folder_id === activeFolderId
    )),
    [favorites, activeFolderId],
  );


  const comparedFavorites = useMemo(
    () => comparisonIds
      .map(id => favorites.find(item => item.listing.id === id))
      .filter((item): item is FavoriteItem => Boolean(item)),
    [comparisonIds, favorites],
  );


  function folderCount(folderId: string | null) {
    return favorites.filter(item => item.folder_id === folderId).length;
  }


  function toggleComparison(listingId: string) {
    setComparisonIds(current => {
      if (current.includes(listingId)) {
        return current.filter(id => id !== listingId);
      }

      if (current.length >= 4) {
        return current;
      }

      return [...current, listingId];
    });
  }


  function formatPrice(value: string | null, currency: string) {
    if (!value) {
      return "Prix non renseigné";
    }

    return `${Number(value).toLocaleString("fr-FR")} ${currency}`;
  }


  function formatDate(value: string | null) {
    if (!value) {
      return "-";
    }

    return new Date(value).toLocaleDateString("fr-FR");
  }


  async function createFolder(event: FormEvent) {
    event.preventDefault();

    const name = folderName.trim();

    if (!name) {
      return;
    }

    setCreatingFolder(true);
    setError("");

    try {
      const folder = await apiRequest<FavoriteFolder>(
        "/favorite-folders",
        {
          method: "POST",
          authenticated: true,
          body: JSON.stringify({ name }),
        },
      );

      setFolders(current => [...current, folder].sort((a, b) => a.name.localeCompare(b.name)));
      setFolderName("");
      setActiveFolderId(folder.id);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de créer le dossier.",
      );
    } finally {
      setCreatingFolder(false);
    }
  }


  async function moveFavorite(
    listingId: string,
    folderId: string,
  ) {
    const targetFolderId = folderId || null;

    await apiRequest(
      `/favorites/${listingId}/folder`,
      {
        method: "PATCH",
        authenticated: true,
        body: JSON.stringify({
          folder_id: targetFolderId,
        }),
      },
    );

    setFavorites(current => current.map(item => (
      item.listing.id === listingId
        ? {
            ...item,
            folder_id: targetFolderId,
          }
        : item
    )));
  }


  async function deleteFolder(folder: FavoriteFolder) {
    if (!window.confirm(`Supprimer le dossier "${folder.name}" ? Les favoris resteront enregistrés.`)) {
      return;
    }

    await apiRequest(
      `/favorite-folders/${folder.id}`,
      {
        method: "DELETE",
        authenticated: true,
      },
    );

    setFolders(current => current.filter(item => item.id !== folder.id));
    setFavorites(current => current.map(item => (
      item.folder_id === folder.id
        ? {
            ...item,
            folder_id: null,
          }
        : item
    )));

    if (activeFolderId === folder.id) {
      setActiveFolderId(null);
    }
  }


  if (authLoading) {
    return (
      <div className="page">
        <p role="status">
          Chargement de votre compte...
        </p>
      </div>
    );
  }


  if (!user) {
    return (
      <div className="page empty-state">
        <Heart size={34} />

        <h1>Favoris</h1>

        <p>
          Connectez-vous pour retrouver les annonces
          que vous avez mises de côté.
        </p>

        <Link
          className="text-button"
          to="/login"
        >
          Se connecter
        </Link>
      </div>
    );
  }


  return (
    <div className="page favorites-page">
      <div className="page-heading">
        <div>
          <h1>Mes favoris</h1>

          <p>
            {favorites.length} annonce{favorites.length > 1 ? "s" : ""} enregistrée{favorites.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <section className="favorite-folder-panel">
        <div className="favorite-folder-tabs">
          <button
            type="button"
            className={activeFolderId === null ? "favorite-folder-tab favorite-folder-tab--active" : "favorite-folder-tab"}
            onClick={() => setActiveFolderId(null)}
          >
            <Heart size={16} />
            Tous
            <span>{favorites.length}</span>
          </button>

          <button
            type="button"
            className={activeFolderId === "uncategorized" ? "favorite-folder-tab favorite-folder-tab--active" : "favorite-folder-tab"}
            onClick={() => setActiveFolderId("uncategorized")}
          >
            <Folder size={16} />
            Sans dossier
            <span>{folderCount(null)}</span>
          </button>

          {folders.map(folder => (
            <div key={folder.id} className="favorite-folder-tab-wrap">
              <button
                type="button"
                className={activeFolderId === folder.id ? "favorite-folder-tab favorite-folder-tab--active" : "favorite-folder-tab"}
                onClick={() => setActiveFolderId(folder.id)}
              >
                <Folder size={16} />
                {folder.name}
                <span>{folderCount(folder.id)}</span>
              </button>
              <button type="button" className="text-button" onClick={() => void deleteFolder(folder)}>
                Supprimer
              </button>
            </div>
          ))}
        </div>

        <form className="favorite-folder-create" onSubmit={createFolder}>
          <input
            value={folderName}
            onChange={event => setFolderName(event.target.value)}
            placeholder="Nouveau dossier"
          />
          <button type="submit" className="primary-button inline-button" disabled={creatingFolder}>
            <Plus size={16} />
            {creatingFolder ? "Création..." : "Créer"}
          </button>
        </form>
      </section>

      {favorites.length > 0 && (
        <section className="favorite-compare-bar">
          <div>
            <Scale size={18} />
            <strong>Comparer des annonces</strong>
            <span>{comparisonIds.length}/4 sélectionnée{comparisonIds.length > 1 ? "s" : ""}</span>
          </div>

          <div className="favorite-compare-actions">
            <button
              type="button"
              className="secondary-button inline-button"
              disabled={comparisonIds.length === 0}
              onClick={() => setComparisonIds([])}
            >
              <X size={16} />
              Vider
            </button>

            <a
              className={
                comparisonIds.length >= 2
                  ? "primary-button inline-button"
                  : "primary-button inline-button favorite-compare-disabled"
              }
              href="#favorite-comparison"
              aria-disabled={comparisonIds.length < 2}
            >
              <Scale size={16} />
              Comparer
            </a>
          </div>
        </section>
      )}

      {comparedFavorites.length >= 2 && (
        <section id="favorite-comparison" className="favorite-comparison-panel">
          <div className="favorite-comparison-heading">
            <div>
              <span>Comparaison</span>
              <h2>{comparedFavorites.length} annonces sélectionnées</h2>
            </div>

            <button type="button" className="text-button" onClick={() => setComparisonIds([])}>
              Fermer la comparaison
            </button>
          </div>

          <div className="favorite-comparison-grid">
            {comparedFavorites.map(item => {
              const image = item.listing.images.find(photo => photo.is_primary) ?? item.listing.images[0];

              return (
                <article key={item.listing.id} className="favorite-comparison-card">
                  <button
                    type="button"
                    className="favorite-comparison-remove"
                    onClick={() => toggleComparison(item.listing.id)}
                    aria-label="Retirer de la comparaison"
                  >
                    <X size={15} />
                  </button>

                  {image ? (
                    <img src={image.thumbnail_url ?? image.image_url} alt={item.listing.title} />
                  ) : (
                    <div className="favorite-comparison-placeholder">Photo</div>
                  )}

                  <h3>{item.listing.title}</h3>

                  <dl>
                    <div>
                      <dt>Prix</dt>
                      <dd>{formatPrice(item.listing.price, item.listing.currency)}</dd>
                    </div>
                    <div>
                      <dt>État</dt>
                      <dd>{item.listing.condition ?? "-"}</dd>
                    </div>
                    <div>
                      <dt>Type de prix</dt>
                      <dd>{item.listing.price_type}</dd>
                    </div>
                    <div>
                      <dt>Publié</dt>
                      <dd>{formatDate(item.listing.published_at)}</dd>
                    </div>
                    <div>
                      <dt>Expire</dt>
                      <dd>{formatDate(item.listing.expires_at)}</dd>
                    </div>
                  </dl>

                  <Link className="secondary-button inline-button" to={`/listings/${item.listing.id}`}>
                    Voir l'annonce
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {loading && (
        <p role="status">
          Chargement de vos favoris...
        </p>
      )}

      {error && (
        <div
          className="inline-error"
          role="alert"
        >
          <p>{error}</p>

          <button
            type="button"
            onClick={() =>
              setAttempt(value => value + 1)
            }
          >
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && favorites.length === 0 && (
        <section className="empty-state">
          <Heart size={34} />

          <h2>Aucun favori pour le moment</h2>

          <p>
            Explorez les annonces et touchez le coeur
            pour les retrouver ici.
          </p>

          <Link
            className="text-button"
            to="/search"
          >
            Parcourir les annonces
          </Link>
        </section>
      )}

      {!loading && !error && favorites.length > 0 && filteredFavorites.length === 0 && (
        <section className="empty-state">
          <Folder size={34} />
          <h2>Aucun favori dans ce dossier</h2>
          <p>Déplacez des annonces vers ce dossier avec le menu sous chaque carte.</p>
        </section>
      )}

      {!loading && !error && filteredFavorites.length > 0 && (
        <div className="favorite-grid">
          {filteredFavorites.map(item => (
            <article key={item.listing.id} className="favorite-item-card">
              <label className="favorite-compare-select">
                <input
                  type="checkbox"
                  checked={comparisonIds.includes(item.listing.id)}
                  disabled={!comparisonIds.includes(item.listing.id) && comparisonIds.length >= 4}
                  onChange={() => toggleComparison(item.listing.id)}
                />
                <span>Comparer</span>
              </label>

              <ListingCard listing={item.listing} />
              <label className="favorite-folder-select">
                <span>Dossier</span>
                <select
                  value={item.folder_id ?? ""}
                  onChange={event => void moveFavorite(item.listing.id, event.target.value)}
                >
                  <option value="">Sans dossier</option>
                  {folders.map(folder => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
              </label>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
