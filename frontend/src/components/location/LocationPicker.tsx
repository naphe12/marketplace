import {
  MapContainer,
  Marker,
  TileLayer,
  useMapEvents,
} from "react-leaflet";

import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import "./LocationPicker.css";


delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});


type Props = {
  latitude: number | null;
  longitude: number | null;

  onChange: (
    latitude: number,
    longitude: number,
  ) => void;
};


function LocationMarker({
  latitude,
  longitude,
  onChange,
}: Props) {
  useMapEvents({
    click(event) {
      onChange(
        event.latlng.lat,
        event.latlng.lng,
      );
    },
  });

  if (
    latitude === null ||
    longitude === null
  ) {
    return null;
  }

  return (
    <Marker
      position={[
        latitude,
        longitude,
      ]}
    />
  );
}


export default function LocationPicker({
  latitude,
  longitude,
  onChange,
}: Props) {

  /*
   * Centre par défaut.
   * Bujumbura dans cet exemple.
   * On pourra ensuite le rendre dynamique.
   */
  const center: [number, number] =
    latitude !== null &&
      longitude !== null
      ? [latitude, longitude]
      : [-3.3614, 29.3599];


  function useCurrentLocation() {
    if (!navigator.geolocation) {
      alert(
        "La géolocalisation n'est pas disponible sur cet appareil.",
      );

      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        onChange(
          position.coords.latitude,
          position.coords.longitude,
        );
      },

      () => {
        alert(
          "Impossible d'obtenir votre position.",
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  }


  return (
    <div className="location-picker">

      <div className="location-picker__header">

        <div>
          <h3>
            Localisation du produit
          </h3>

          <p>
            Cliquez sur la carte pour
            indiquer où se trouve le produit.
          </p>
        </div>

        <button
          type="button"
          className="location-picker__gps"
          onClick={useCurrentLocation}
        >
          📍 Ma position
        </button>

      </div>


      <MapContainer
        center={center}
        zoom={
          latitude !== null
            ? 15
            : 12
        }
        className="location-picker__map"
      >

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <LocationMarker
          latitude={latitude}
          longitude={longitude}
          onChange={onChange}
        />

      </MapContainer>


      {latitude !== null &&
        longitude !== null && (

          <div className="location-picker__coordinates">

            <span>
              Latitude :
              {" "}
              {latitude.toFixed(6)}
            </span>

            <span>
              Longitude :
              {" "}
              {longitude.toFixed(6)}
            </span>

          </div>

        )}

    </div>
  );
}