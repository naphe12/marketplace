import {
  AlertTriangle,
} from "lucide-react";

import {
  Link,
  isRouteErrorResponse,
  useRouteError,
} from "react-router-dom";


export default function RouteErrorPage() {
  const error =
    useRouteError();

  const title =
    isRouteErrorResponse(error) && error.status === 404
      ? "Page introuvable"
      : "Une erreur est survenue";

  const message =
    isRouteErrorResponse(error)
      ? error.statusText
      : error instanceof Error
        ? error.message
        : "La page n'a pas pu être affichée.";


  return (
    <div className="page empty-state">
      <AlertTriangle size={36} />

      <h1>{title}</h1>

      <p>{message}</p>

      <Link
        className="text-button"
        to="/"
      >
        Revenir à l'accueil
      </Link>
    </div>
  );
}
