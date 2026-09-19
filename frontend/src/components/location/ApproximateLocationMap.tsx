import {
  Circle,
  MapContainer,
  TileLayer,
} from "react-leaflet";


type Props = {
  latitude: number;
  longitude: number;
  radius?: number;
};


export default function ApproximateLocationMap({
  latitude,
  longitude,
  radius = 2500,
}: Props) {
  return (
    <div className="approximate-map">
      <MapContainer
        center={[
          latitude,
          longitude,
        ]}
        zoom={13}
        scrollWheelZoom={false}
        className="approximate-map__map"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Circle
          center={[
            latitude,
            longitude,
          ]}
          radius={radius}
          pathOptions={{
            fillOpacity: 0.18,
            weight: 2,
          }}
        />
      </MapContainer>

      <div className="approximate-map__notice">
        Localisation approximative
      </div>
    </div>
  );
}