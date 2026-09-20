import {
  Clock,
  CreditCard,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  apiRequest,
} from "../api/client";


type ListingPackage = {
  id: string;
  name: string;
  duration_days: number;
  price: string;
  currency: string;
};


export default function ListingPackagesPage() {
  const {
    listingId,
  } = useParams();

  const navigate = useNavigate();
  const [packages, setPackages] = useState<ListingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    apiRequest<ListingPackage[]>("/listing-packages")
      .then(items => {
        if (mounted) {
          setPackages(items);
        }
      })
      .catch(cause => {
        if (mounted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Impossible de charger les packages.",
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>Choisissez la durée</h1>
          <p>
            Sélectionnez le package de publication pour activer votre
            annonce.
          </p>
        </div>
      </div>

      {loading && (
        <p role="status">
          Chargement...
        </p>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && packages.length === 0 && (
        <div className="empty-state">
          Aucun package actif pour le moment.
        </div>
      )}

      <div className="package-grid">
        {packages.map(item => (
          <button
            key={item.id}
            type="button"
            className="package-card"
            onClick={() =>
              navigate(
                `/listings/${listingId}/checkout/${item.id}`,
              )
            }
          >
            <span className="package-card__icon">
              <Clock size={20} />
            </span>

            <strong>
              {item.duration_days} jours
            </strong>

            <span>
              {Number(item.price).toLocaleString("fr-FR")}{" "}
              {item.currency}
            </span>

            <small>
              <CreditCard size={14} />
              Continuer vers le paiement
            </small>
          </button>
        ))}
      </div>
    </div>
  );
}
