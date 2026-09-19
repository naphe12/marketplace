import {
  Heart,
  MapPin,
} from "lucide-react";

import {
  useState,
  type MouseEvent,
} from "react";

import { Link } from "react-router-dom";

import { apiRequest } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";

import type {
  Listing,
} from "../../types/listing";


function formatPrice(
  value: string | null,
  currency: string,
) {
  if (!value) {
    return "Prix sur demande";
  }

  return (
    new Intl.NumberFormat(
      "fr-BI",
      {
        maximumFractionDigits: 0,
      },
    ).format(Number(value))
    + ` ${currency}`
  );
}


function formatCondition(
  condition: string | null,
) {
  switch (condition) {
    case "NEW":
      return "Neuf";

    case "USED":
      return "Occasion";

    case "REFURBISHED":
      return "Reconditionné";

    default:
      return null;
  }
}


export default function ListingCard({
  listing,
}: {
  listing: Listing;
}) {
  const { user } = useAuth();

  const [favorite, setFavorite] =
    useState(
      listing.is_favorite ?? false,
    );

  const [changingFavorite, setChangingFavorite] =
    useState(false);


  const primaryImage =
    listing.images?.find(
      image => image.is_primary,
    ) ??
    listing.images?.[0];


  async function toggleFavorite(
    event: MouseEvent,
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (!user || changingFavorite) {
      return;
    }

    setChangingFavorite(true);

    try {
      if (favorite) {
        await apiRequest(
          `/favorites/${listing.id}`,
          {
            method: "DELETE",
            authenticated: true,
          },
        );

        setFavorite(false);
      } else {
        await apiRequest(
          `/favorites/${listing.id}`,
          {
            method: "POST",
            authenticated: true,
          },
        );

        setFavorite(true);
      }
    } finally {
      setChangingFavorite(false);
    }
  }


  const condition =
    formatCondition(listing.condition);


  return (
    <Link
      to={`/listings/${listing.id}`}
      className="listing-card"
    >
      <div className="listing-card__image">
        {primaryImage ? (
          <img
            src={
              primaryImage.thumbnail_url ??
              primaryImage.image_url
            }
            alt={listing.title}
            loading="lazy"
          />
        ) : (
          <div className="image-placeholder">
            <span>Pas de photo</span>
          </div>
        )}

        {condition && (
          <span className="listing-badge">
            {condition}
          </span>
        )}

        <button
          type="button"
          className={[
            "favorite-button",
            favorite
              ? "favorite-button--active"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={toggleFavorite}
          disabled={changingFavorite}
          aria-label="Ajouter aux favoris"
        >
          <Heart
            size={19}
            fill={
              favorite
                ? "currentColor"
                : "none"
            }
          />
        </button>
      </div>

      <div className="listing-card__body">
        <h3>
          {listing.title}
        </h3>

        <strong className="listing-price">
          {formatPrice(
            listing.price,
            listing.currency,
          )}
        </strong>

        {listing.price_type ===
          "NEGOTIABLE" && (
          <span className="negotiable">
            Prix négociable
          </span>
        )}

        {listing.administrative_area_id && (
          <div className="listing-location">
            <MapPin size={13} />

            <span>
              Localisation disponible
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}