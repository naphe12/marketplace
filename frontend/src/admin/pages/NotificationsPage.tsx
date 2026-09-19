import { useState, type FormEvent } from "react";

import { apiRequest } from "../../api/client";

export default function NotificationsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [recipient, setRecipient] = useState("ALL");
  const [userId, setUserId] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setResult("");
    try {
      const response = await apiRequest<{ sent: number }>("/admin/notifications", {
        method: "POST",
        authenticated: true,
        body: JSON.stringify({ title, message, recipient, user_id: recipient === "USER" ? userId : null }),
      });
      setResult(`${response.sent} notification(s) envoyée(s).`);
      setTitle("");
      setMessage("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Envoi impossible.");
    }
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading"><div><span>IN_APP</span><h1>Notifications Admin</h1><p>Envoyez une notification à un utilisateur, un groupe ou toute la plateforme.</p></div></div>
      <form className="admin-panel admin-stack" onSubmit={submit}>
        <label className="form-field"><span>Titre</span><input value={title} onChange={event => setTitle(event.target.value)} placeholder="Maintenance prévue" /></label>
        <label className="form-field"><span>Message</span><textarea value={message} onChange={event => setMessage(event.target.value)} placeholder="La plateforme sera indisponible..." /></label>
        <label className="form-field"><span>Destinataires</span><select value={recipient} onChange={event => setRecipient(event.target.value)}><option value="ALL">Tous</option><option value="GROUP">Groupe</option><option value="USER">Utilisateur</option></select></label>
        {recipient === "USER" && <label className="form-field"><span>User ID</span><input value={userId} onChange={event => setUserId(event.target.value)} /></label>}
        {error && <p className="form-error">{error}</p>}
        {result && <p>{result}</p>}
        <button className="primary-button inline-button" type="submit">Envoyer</button>
      </form>
    </section>
  );
}
