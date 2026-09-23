import {
    Circle,
    MapContainer,
    TileLayer,
} from "react-leaflet";

type Props = {
    latitude: number;
    longitude: number;
    locationName: string;
    radiusMeters?: number;
};

export default function ProductLocationMap({
    latitude,
    longitude,
    locationName,
    radiusMeters = 1500,
}: Props) {
    return (
        <section className="product-location">
            <h3>Localisation du produit</h3>
            <p>
                📍 {locationName} — emplacement approximatif
            </p>

            <MapContainer
                center={[latitude, longitude]}
                zoom={13}
                style={{
                    width: "100%",
                    height: "320px",
                    borderRadius: "14px",
                }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Circle
                    center={[latitude, longitude]}
                    radius={radiusMeters}
                    pathOptions={{
                        color: "#0f766e",
                        fillColor: "#14b8a6",
                        fillOpacity: 0.18,
                        weight: 2,
                    }}
                />
            </MapContainer>

            <small>
                La position exacte n'est pas communiquée.
                Contactez le vendeur pour convenir d'un
                lieu de rencontre.
            </small>
        </section>
    );
}