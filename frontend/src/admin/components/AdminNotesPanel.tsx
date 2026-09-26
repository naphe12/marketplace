import {
  MessageSquarePlus,
} from "lucide-react";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  apiRequest,
} from "../../api/client";


type AdminNote = {
  id: string;
  author_user_id: string;
  target_type: string;
  target_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

type Props = {
  targetType: "USER" | "LISTING";
  targetId: string;
};


export default function AdminNotesPanel({
  targetType,
  targetId,
}: Props) {
  const [notes, setNotes] =
    useState<AdminNote[]>([]);

  const [body, setBody] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");


  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError("");

    const params = new URLSearchParams({
      target_type: targetType,
      target_id: targetId,
    });

    apiRequest<AdminNote[]>(
      `/admin/notes?${params}`,
      {
        authenticated: true,
        signal: controller.signal,
      },
    )
      .then(items => {
        if (!controller.signal.aborted) {
          setNotes(items);
        }
      })
      .catch(cause => {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Impossible de charger les notes.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [targetType, targetId]);


  async function submit(event: FormEvent) {
    event.preventDefault();

    const trimmed = body.trim();

    if (!trimmed) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const created = await apiRequest<AdminNote>(
        "/admin/notes",
        {
          method: "POST",
          authenticated: true,
          body: JSON.stringify({
            target_type: targetType,
            target_id: targetId,
            body: trimmed,
          }),
        },
      );

      setNotes(current => [created, ...current]);
      setBody("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible d'enregistrer la note.",
      );
    } finally {
      setSaving(false);
    }
  }


  return (
    <section className="admin-panel admin-notes-panel">
      <div className="admin-notes-heading">
        <div>
          <h2>Notes internes</h2>
          <p>Commentaires visibles uniquement par l'administration.</p>
        </div>
        <MessageSquarePlus size={20} />
      </div>

      <form className="admin-notes-form" onSubmit={submit}>
        <textarea
          value={body}
          onChange={event => setBody(event.target.value)}
          placeholder="Ajouter une note interne"
          maxLength={3000}
        />
        <button type="submit" className="primary-button" disabled={saving || !body.trim()}>
          {saving ? "Enregistrement..." : "Ajouter la note"}
        </button>
      </form>

      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && <p role="status">Chargement des notes...</p>}

      {!loading && notes.length === 0 && (
        <p className="admin-notes-empty">Aucune note interne.</p>
      )}

      <div className="admin-notes-list">
        {notes.map(note => (
          <article key={note.id} className="admin-note-card">
            <p>{note.body}</p>
            <small>
              {new Date(note.created_at).toLocaleString("fr-FR")} · {note.author_user_id}
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}
