import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
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

type PublicationOrder = {
  id: string;
  amount: string;
  currency: string;
  duration_days: number;
  status: string;
};

type SimulatedPaymentResult = {
  status: string;
  listing_status: string;
  expires_at: string | null;
};


export default function ListingCheckoutPage() {
  const {
    listingId,
    packageId,
  } = useParams();

  const navigate = useNavigate();
  const [packages, setPackages] = useState<ListingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<PublicationOrder | null>(null);

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
              : "Impossible de charger le package.",
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

  const selectedPackage = useMemo(
    () => packages.find(item => item.id === packageId),
    [packageId, packages],
  );

  async function createOrder() {
    if (!listingId || !packageId) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const result = await apiRequest<PublicationOrder>(
        `/listings/${listingId}/publication-orders`,
        {
          method: "POST",
          authenticated: true,
          body: JSON.stringify({
            package_id: packageId,
          }),
        },
      );

      setOrder(result);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de créer la commande.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function payOrder() {
    if (!listingId || !order) {
      return;
    }

    setPaying(true);
    setError("");

    try {
      const result = await apiRequest<SimulatedPaymentResult>(
        `/billing/orders/${order.id}/simulate-payment`,
        {
          method: "POST",
          authenticated: true,
        },
      );

      if (result.status === "PAID") {
        navigate(`/listings/${listingId}`);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de confirmer le paiement.",
      );
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="page">
      <Link
        to={`/listings/${listingId}/packages`}
        className="back-link"
      >
        <ArrowLeft size={16} />
        Changer de package
      </Link>

      <div className="checkout-panel">
        <div>
          <span className="checkout-icon">
            <CreditCard size={22} />
          </span>

          <h1>Paiement publication</h1>

          <p>
            Confirmez votre package puis simulez le paiement pour
            publier votre annonce.
          </p>
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

        {!loading && selectedPackage && (
          <div className="checkout-summary">
            <span>{selectedPackage.name}</span>
            <strong>
              {Number(selectedPackage.price).toLocaleString("fr-FR")}{" "}
              {selectedPackage.currency}
            </strong>
            <small>
              Durée : {selectedPackage.duration_days} jours
            </small>
          </div>
        )}

        {!loading && !selectedPackage && !error && (
          <p className="form-error">
            Package introuvable.
          </p>
        )}

        {order ? (
          <div className="checkout-success">
            <CheckCircle2 size={22} />
            <div>
              <strong>Commande créée</strong>
              <span>
                {Number(order.amount).toLocaleString("fr-FR")}{" "}
                {order.currency} - {order.status}
              </span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="primary-button"
            disabled={submitting || loading || !selectedPackage}
            onClick={() => void createOrder()}
          >
            {submitting
              ? "Création..."
              : "Créer la commande"}
          </button>
        )}

        {order && (
          <button
            type="button"
            className="primary-button"
            disabled={paying}
            onClick={() => void payOrder()}
          >
            {paying
              ? "Paiement..."
              : "Payer"}
          </button>
        )}
      </div>
    </div>
  );
}
