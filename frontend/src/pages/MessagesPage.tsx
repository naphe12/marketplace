import { Link } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export default function MessagesPage() {
  const { user, loading } = useAuth();

  return (
    <div className="page">
      <h1>Messages</h1>

      {loading ? (
        <p role="status">Chargement…</p>
      ) : user ? (
        <p>La messagerie sera bientôt disponible ici.</p>
      ) : (
        <p>
          <Link to="/login">Connectez-vous</Link> pour accéder à vos messages.
        </p>
      )}
    </div>
  );
}
