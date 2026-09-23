import { Circle, MapContainer, TileLayer } from "react-leaflet";
import "./ApproximateLocationMap.css";

type Props = {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
};

export default function ApproximateLocationMap({
  latitude,
  longitude,
  radiusMeters = 2500,
}: Props) {
  const center: [number, number] = [latitude, longitude];
  const zoom = radiusMeters >= 10000 ? 10 : radiusMeters >= 5000 ? 11 : radiusMeters >= 2500 ? 12 : 14;

  return (
    <div className="approximate-location">
      <div className="approximate-location__map">
        <MapContainer
          key={`${latitude}-${longitude}-${radiusMeters}`}
          center={center}
          zoom={zoom}
          scrollWheelZoom={false}
          className="approximate-location__leaflet"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
        Zone indicative uniquement ; il ne s'agit pas d'une adresse exacte.
      </p>
    </div>
  );
}
