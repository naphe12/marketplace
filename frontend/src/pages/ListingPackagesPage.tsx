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
  country_code: string;
  duration_days: number;
  price: string;
  currency: string;
};

type SellerListing = {
  id: string;
  status: string;
  title: string;
  country_code: string;
};


export default function ListingPackagesPage() {
  const {
    listingId,
  } = useParams();

  const navigate = useNavigate();
  const [packages, setPackages] = useState<ListingPackage[]>([]);
  const [listing, setListing] = useState<SellerListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      const loadedListing = listingId
        ? await apiRequest<SellerListing>(
            `/listings/mine/${listingId}`,
            { authenticated: true },
          )
        : null;
      const items = await apiRequest<ListingPackage[]>(
        loadedListing?.country_code
          ? `/listing-packages?country_code=${loadedListing.country_code}`
          : "/listing-packages",
      );

      if (mounted) {
        setPackages(items);
        setListing(loadedListing);
      }
    }

    load()
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
  }, [listingId]);

  const actionLabel =
    listing?.status === "ACTIVE"
      ? "Booster"
      : listing?.status === "EXPIRED"
        ? "Renouveler"
        : "Publier";

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <h1>{actionLabel} l'annonce</h1>
          <p>
            Sélectionnez une durée pour {actionLabel.toLowerCase()}
            {listing?.title ? ` « ${listing.title} »` : " cette annonce"}.
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
              {actionLabel} avec ce package
            </small>
          </button>
        ))}
      </div>
    </div>
  );
}
