import {
  ExternalLink,
  Search,
  ShieldCheck,
} from "lucide-react";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { apiRequest } from "../../api/client";
import {
  useAuth,
} from "../../auth/AuthContext";
import type { AdminSearchResult } from "../types";


export default function AdminHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminSearchResult[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    apiRequest<{ items: AdminSearchResult[] }>(
      `/admin/search?q=${encodeURIComponent(query.trim())}`,
      { authenticated: true, signal: controller.signal },
    )
      .then(data => setResults(data.items))
      .catch(() => setResults([]));
    return () => controller.abort();
  }, [query]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (results[0]) {
      navigate(results[0].url);
      setQuery("");
      setResults([]);
    }
  }

  return (
    <header className="admin-header">
      <div className="admin-header__context">
        <strong>Back-office</strong>
        <span>Contrôle opérationnel marketplace</span>
      </div>

      <form className="admin-search admin-search-box" onSubmit={submit}>
        <Search size={18} />

        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Rechercher dans l'administration"
          aria-label="Rechercher dans l'administration"
        />

        {results.length > 0 && (
          <div className="admin-search-results">
            {results.map(result => (
              <button
                key={`${result.type}-${result.id}`}
                type="button"
                onClick={() => {
                  navigate(result.url);
                  setQuery("");
                  setResults([]);
                }}
              >
                <strong>{result.label}</strong>
                <span>{result.type}{result.detail ? ` · ${result.detail}` : ""}</span>
              </button>
            ))}
          </div>
        )}
      </form>

      <div className="admin-header__actions">
        <Link
          to="/"
          className="admin-link"
        >
          <ExternalLink size={16} />
          <span>Voir le site</span>
        </Link>

        <div className="admin-profile">
          <span>
            <ShieldCheck size={18} />
          </span>

          <div>
            <strong>Admin</strong>
            <small>{user?.phone}</small>
          </div>
        </div>
      </div>
    </header>
  );
}
