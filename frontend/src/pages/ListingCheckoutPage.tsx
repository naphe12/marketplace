import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  Smartphone,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
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

type SellerListing = {
  id: string;
  status: string;
  title: string;
};

type BillingPayment = {
  id: string;
  billing_order_id: string;
  amount: string;
  currency: string;
  payment_method: string;
  provider: string | null;
  status: string;
  external_reference: string | null;
  provider_transaction_id: string | null;
  paid_at: string | null;
  failed_at: string | null;
};

type PaymentReceipt = {
  order_number: string;
  order_status: string;
  subtotal: string;
  discount_amount: string;
  total_amount: string;
  currency: string;
  paid_at: string | null;
};

type SimulatedPaymentResult = {
  status?: string;
  payment_status?: string;
  order_status?: string;
  listing_status: string;
  expires_at: string | null;
};

const paymentProviders = [
  {
    method: "MOBILE_MONEY",
    provider: "LUMICASH",
    label: "Lumicash",
  },
  {
    method: "MOBILE_MONEY",
    provider: "ECOCASH",
    label: "EcoCash",
  },
  {
    method: "CARD",
    provider: "CARD",
    label: "Carte bancaire",
  },
];


export default function ListingCheckoutPage() {
  const {
    listingId,
    packageId,
  } = useParams();

  const [packages, setPackages] = useState<ListingPackage[]>([]);
  const [listing, setListing] = useState<SellerListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<PublicationOrder | null>(null);
  const [payment, setPayment] = useState<BillingPayment | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [selectedProvider, setSelectedProvider] = useState(paymentProviders[0]);


  useEffect(() => {
    let mounted = true;

    Promise.all([
      apiRequest<ListingPackage[]>("/listing-packages"),
      listingId
        ? apiRequest<SellerListing>(
            `/listings/mine/${listingId}`,
            { authenticated: true },
          )
        : Promise.resolve(null),
    ])
      .then(([items, loadedListing]) => {
        if (mounted) {
          setPackages(items);
          setListing(loadedListing);
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
  }, [listingId]);


  const selectedPackage = useMemo(
    () => packages.find(item => item.id === packageId),
    [packageId, packages],
  );


  const actionLabel =
    listing?.status === "ACTIVE"
      ? "Boost"
      : listing?.status === "EXPIRED"
        ? "Renouvellement"
        : "Publication";


  async function createOrder() {
    if (!listingId || !packageId) {
      return;
    }

    setSubmitting(true);
    setError("");
    setPayment(null);

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
      setReceipt(null);
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


  async function createPayment() {
    if (!order) {
      return;
    }

    setCreatingPayment(true);
    setError("");

    try {
      const result = await apiRequest<BillingPayment>(
        `/billing/orders/${order.id}/payments`,
        {
          method: "POST",
          authenticated: true,
          body: JSON.stringify({
            payment_method: selectedProvider.method,
            provider: selectedProvider.provider,
          }),
        },
      );

      setPayment(result);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible d'initialiser le paiement.",
      );
    } finally {
      setCreatingPayment(false);
    }
  }


  async function confirmTestPayment() {
    if (!listingId || !payment) {
      return;
    }

    setPaying(true);
    setError("");

    try {
      const result = await apiRequest<SimulatedPaymentResult>(
        `/billing/payments/${payment.id}/simulate-success`,
        {
          method: "POST",
          authenticated: true,
        },
      );

      if (
        result.payment_status === "SUCCESS" ||
        result.order_status === "PAID" ||
        result.status === "PAID"
      ) {
        setPayment(current => current ? { ...current, status: "SUCCESS" } : current);

        if (order) {
          const loadedReceipt = await apiRequest<PaymentReceipt>(
            `/billing/orders/${order.id}/receipt`,
            { authenticated: true },
          );
          setReceipt(loadedReceipt);
        }
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

  async function cancelOrder() {
    if (!order) {
      return;
    }

    setPaying(true);
    setError("");

    try {
      const cancelled = await apiRequest<PublicationOrder>(
        `/billing/orders/${order.id}/cancel`,
        {
          method: "POST",
          authenticated: true,
        },
      );
      setOrder(current => current ? { ...current, status: cancelled.status } : current);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible d'annuler la commande.",
      );
    } finally {
      setPaying(false);
    }
  }


  async function markPaymentFailed() {
    if (!payment) {
      return;
    }

    setPaying(true);
    setError("");

    try {
      const failed = await apiRequest<BillingPayment>(
        `/billing/payments/${payment.id}/fail`,
        {
          method: "POST",
          authenticated: true,
          body: JSON.stringify({
            reason: "Echec signalé depuis le checkout.",
          }),
        },
      );
      setPayment(failed);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de marquer le paiement en échec.",
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

      <div className="checkout-panel checkout-flow-panel">
        <div>
          <span className="checkout-icon">
            <CreditCard size={22} />
          </span>

          <h1>Paiement {actionLabel.toLowerCase()}</h1>

          <p>
            Créez la commande, choisissez le moyen de paiement,
            puis confirmez le paiement. La confirmation reste en mode test
            tant qu'aucun provider externe n'est branché côté backend.
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
              {Number(selectedPackage.price).toLocaleString("fr-FR")} {" "}
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

        <div className="checkout-steps">
          <section className="checkout-step">
            <span className="checkout-step__number">1</span>
            <div>
              <strong>Commande</strong>
              <p>Réservez le package choisi pour {listing?.title ? `« ${listing.title} »` : "cette annonce"}.</p>
            </div>

            {order ? (
              <div className="checkout-success">
                <CheckCircle2 size={22} />
                <div>
                  <strong>Commande créée</strong>
                  <span>
                    {Number(order.amount).toLocaleString("fr-FR")} {" "}
                    {order.currency} - {order.status}
                  </span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="primary-button inline-button"
                disabled={submitting || loading || !selectedPackage}
                onClick={() => void createOrder()}
              >
                {submitting && <Loader2 size={16} />}
                {submitting
                  ? "Création..."
                  : "Créer la commande"}
              </button>
            )}
          </section>

          <section className="checkout-step">
            <span className="checkout-step__number">2</span>
            <div>
              <strong>Moyen de paiement</strong>
              <p>Sélectionnez le canal à enregistrer pour la commande.</p>
            </div>

            <div className="payment-method-grid">
              {paymentProviders.map(provider => (
                <button
                  key={`${provider.method}-${provider.provider}`}
                  type="button"
                  className={
                    selectedProvider.provider === provider.provider
                      ? "payment-method-card payment-method-card--active"
                      : "payment-method-card"
                  }
                  disabled={Boolean(payment)}
                  onClick={() => setSelectedProvider(provider)}
                >
                  {provider.method === "CARD" ? (
                    <CreditCard size={18} />
                  ) : (
                    <Smartphone size={18} />
                  )}
                  <span>{provider.label}</span>
                </button>
              ))}
            </div>

            {payment ? (
              <div className="checkout-success">
                <CheckCircle2 size={22} />
                <div>
                  <strong>Paiement initialisé</strong>
                  <span>
                    {payment.provider ?? payment.payment_method} - {payment.status}
                    {payment.external_reference ? ` - ${payment.external_reference}` : ""}
                  </span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="primary-button inline-button"
                disabled={!order || creatingPayment}
                onClick={() => void createPayment()}
              >
                {creatingPayment && <Loader2 size={16} />}
                {creatingPayment
                  ? "Initialisation..."
                  : "Initialiser le paiement"}
              </button>
            )}
          </section>

          <section className="checkout-step">
            <span className="checkout-step__number">3</span>
            <div>
              <strong>Confirmation</strong>
              <p>
                En production, cette étape sera déclenchée par le callback
                du provider. Pour l'instant, elle valide le paiement test.
              </p>
            </div>

            <div className="checkout-action-row">
              <button
                type="button"
                className="primary-button inline-button"
                disabled={!payment || paying || payment.status === "FAILED"}
                onClick={() => void confirmTestPayment()}
              >
                {paying && <Loader2 size={16} />}
                {paying
                  ? "Confirmation..."
                  : "Confirmer le paiement test"}
              </button>

              <button
                type="button"
                className="secondary-button inline-button"
                disabled={!payment || paying || payment.status === "SUCCESS"}
                onClick={() => void markPaymentFailed()}
              >
                Marquer échoué
              </button>

              <button
                type="button"
                className="secondary-button inline-button"
                disabled={!order || paying || order.status === "PAID"}
                onClick={() => void cancelOrder()}
              >
                Annuler
              </button>
            </div>

            {receipt && (
              <div className="checkout-success">
                <CheckCircle2 size={22} />
                <div>
                  <strong>Reçu {receipt.order_number}</strong>
                  <span>
                    {Number(receipt.total_amount).toLocaleString("fr-FR")} {receipt.currency} - {receipt.order_status}
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
