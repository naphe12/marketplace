import {
  Folder,
  Heart,
  Plus,
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


  function folderCount(folderId: string | null) {
    return favorites.filter(item => item.folder_id === folderId).length;
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
