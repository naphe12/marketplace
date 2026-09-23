
import {
    Circle,
    MapContainer,
    TileLayer,
} from "react-leaflet";

import "./ApproximateLocationMap.css";

type Props = {
    latitude: number;
    longitude: number;
    radiusMeters?: number;
};

export default function ApproximateLocationMap({
    latitude,
    longitude,
    radiusMeters = 1500,
}: Props) {
    const center: [number, number] = [
        latitude,
        longitude,
    ];

    return (
        <div className="approximate-location">
            <div className="approximate-location__map">
                <MapContainer
                    key={`${latitude}-${longitude}-${radiusMeters}`}
                    center={center}
                    zoom={
                        radiusMeters >= 5000
                            ? 11
                            : radiusMeters >= 2500
                                ? 12
                                : 14
                    }
                    scrollWheelZoom={false}
                    className="approximate-location__leaflet"
                >
                    <TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <Circle
                        center={center}
                        radius={radiusMeters}
                        pathOptions={{
                            color: "#0f766e",
                            fillColor: "#14b8a6",
                            fillOpacity: 0.16,
                            weight: 2,
                        }}
                    />
                </MapContainer>
            </div>

            <p className="approximate-location__note">
                Zone indicative uniquement. La position
                exacte du produit n'est pas affichée.
            </p>
        </div>
    );
}