import {
  Circle,
  MapContainer,
  Popup,
  TileLayer,
} from "react-leaflet";

import {
  Link,
} from "react-router-dom";

import type {
  Listing,
} from "../../types/listing";


type Props = {
  listings: Listing[];
};

function parseCoordinate(
  value: number | string | null | undefined,
  limit: number,
) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) && Math.abs(numberValue) <= limit
    ? numberValue
    : null;
}

function formatPrice(
  value: string | null,
  currency: string,
) {
  if (!value) {
    return "Prix sur demande";
  }

  return `${Number(value).toLocaleString("fr-FR")} ${currency}`;
}

export default function SearchResultsMap({
  listings,
}: Props) {
  const points = listings
    .map(listing => ({
      listing,
      latitude: parseCoordinate(listing.latitude, 90),
      longitude: parseCoordinate(listing.longitude, 180),
    }))
    .filter((point): point is {
      listing: Listing;
      latitude: number;
      longitude: number;
    } => point.latitude !== null && point.longitude !== null);

  if (points.length === 0) {
    return (
      <div className="search-map-empty">
        Aucune coordonnée disponible pour les résultats affichés.
      </div>
    );
  }

  const center: [number, number] = [
    points.reduce((sum, point) => sum + point.latitude, 0) / points.length,
    points.reduce((sum, point) => sum + point.longitude, 0) / points.length,
  ];

  return (
    <div className="search-results-map">
      <MapContainer
        key={points.map(point => point.listing.id).join("-")}
        center={center}
        zoom={points.length > 1 ? 10 : 13}
        scrollWheelZoom={false}
        className="search-results-map__leaflet"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {points.map(point => (
          <Circle
            key={point.listing.id}
            center={[point.latitude, point.longitude]}
            radius={1800}
            pathOptions={{
              color: "#0f766e",
              fillColor: "#14b8a6",
              fillOpacity: 0.18,
              weight: 2,
            }}
          >
            <Popup>
              <div className="search-map-popup">
                <strong>{point.listing.title}</strong>
                <span>{formatPrice(point.listing.price, point.listing.currency)}</span>
                <Link to={`/listings/${point.listing.id}`}>Voir l'annonce</Link>
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>
    </div>
  );
}
