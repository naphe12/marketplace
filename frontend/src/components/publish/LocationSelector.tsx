import {
  MapPin,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  apiRequest,
} from "../../api/client";

import type {
  AdministrativeArea,
} from "../../types/location";

import ApproximateLocationMap
  from "../location/ApproximateLocationMap";


type Props = {
  provinceId: string;
  communeId: string;
  zoneId: string;
  localityId: string;

  onProvinceChange: (
    value: string,
  ) => void;

  onCommuneChange: (
    value: string,
  ) => void;

  onZoneChange: (
    value: string,
  ) => void;

  onLocalityChange: (
    value: string,
  ) => void;

  onLocationResolved: (
    location: {
      administrativeAreaId: string | null;
      latitude: number | null;
      longitude: number | null;
    },
  ) => void;
};


export default function LocationSelector({
  provinceId,
  communeId,
  zoneId,
  localityId,

  onProvinceChange,
  onCommuneChange,
  onZoneChange,
  onLocalityChange,

  onLocationResolved,
}: Props) {
  const [provinces, setProvinces] =
    useState<AdministrativeArea[]>([]);

  const [communes, setCommunes] =
    useState<AdministrativeArea[]>([]);

  const [zones, setZones] =
    useState<AdministrativeArea[]>([]);

  const [localities, setLocalities] =
    useState<AdministrativeArea[]>([]);


  const [loadingProvinces, setLoadingProvinces] =
    useState(false);

  const [loadingCommunes, setLoadingCommunes] =
    useState(false);

  const [loadingZones, setLoadingZones] =
    useState(false);

  const [loadingLocalities, setLoadingLocalities] =
    useState(false);


  useEffect(() => {
    async function load() {
      setLoadingProvinces(true);

      try {
        const result =
          await apiRequest<
            AdministrativeArea[]
          >(
            "/administrative-areas?area_type=PROVINCE",
          );

        setProvinces(result);
      } finally {
        setLoadingProvinces(false);
      }
    }

    load();
  }, []);


  useEffect(() => {
    if (!provinceId) {
      setCommunes([]);
      return;
    }

    async function load() {
      setLoadingCommunes(true);

      try {
        const result =
          await apiRequest<
            AdministrativeArea[]
          >(
            `/administrative-areas?parent_id=${provinceId}&area_type=COMMUNE`,
          );

        setCommunes(result);
      } finally {
        setLoadingCommunes(false);
      }
    }

    load();
  }, [provinceId]);


  useEffect(() => {
    if (!communeId) {
      setZones([]);
      return;
    }

    async function load() {
      setLoadingZones(true);

      try {
        const result =
          await apiRequest<
            AdministrativeArea[]
          >(
            `/administrative-areas?parent_id=${communeId}&area_type=ZONE`,
          );

        setZones(result);
      } finally {
        setLoadingZones(false);
      }
    }

    load();
  }, [communeId]);


  useEffect(() => {
    if (!zoneId) {
      setLocalities([]);
      return;
    }

    async function load() {
      setLoadingLocalities(true);

      try {
        const result =
          await apiRequest<
            AdministrativeArea[]
          >(
            `/administrative-areas?parent_id=${zoneId}`,
          );

        setLocalities(
          result.filter(area =>
            ["COLLINE", "QUARTIER"].includes(
              area.area_type.toUpperCase(),
            ),
          ),
        );
      } finally {
        setLoadingLocalities(false);
      }
    }

    load();
  }, [zoneId]);


  const selectedProvince =
    useMemo(
      () =>
        provinces.find(
          item => item.id === provinceId,
        ),
      [provinces, provinceId],
    );

  const selectedCommune =
    useMemo(
      () =>
        communes.find(
          item => item.id === communeId,
        ),
      [communes, communeId],
    );

  const selectedZone =
    useMemo(
      () =>
        zones.find(
          item => item.id === zoneId,
        ),
      [zones, zoneId],
    );

  const selectedLocality =
    useMemo(
      () =>
        localities.find(
          item => item.id === localityId,
        ),
      [localities, localityId],
    );


  const selectedArea =
    selectedLocality ??
    selectedZone ??
    selectedCommune ??
    selectedProvince ??
    null;


  /*
   * Pour la carte :
   * on cherche les coordonnées du niveau
   * le plus précis disponible.
   */
  const coordinates =
    [
      selectedLocality,
      selectedZone,
      selectedCommune,
      selectedProvince,
    ].find(
      area =>
        area?.latitude != null &&
        area?.longitude != null,
    ) ?? null;


  useEffect(() => {
    onLocationResolved({
      administrativeAreaId:
        selectedArea?.id ?? null,

      latitude:
        coordinates?.latitude ?? null,

      longitude:
        coordinates?.longitude ?? null,
    });
  }, [
    selectedArea?.id,
    coordinates?.latitude,
    coordinates?.longitude,
  ]);


  function changeProvince(
    value: string,
  ) {
    onProvinceChange(value);

    onCommuneChange("");
    onZoneChange("");
    onLocalityChange("");
  }


  function changeCommune(
    value: string,
  ) {
    onCommuneChange(value);

    onZoneChange("");
    onLocalityChange("");
  }


  function changeZone(
    value: string,
  ) {
    onZoneChange(value);

    onLocalityChange("");
  }


  return (
    <div className="location-selector">

      <div className="location-selector__intro">
        <div className="location-selector__icon">
          <MapPin size={21} />
        </div>

        <div>
          <strong>
            Où se trouve l'article ?
          </strong>

          <span>
            Choisissez la localisation la plus
            précise possible. L'adresse exacte
            n'est pas affichée aux acheteurs.
          </span>
        </div>
      </div>


      <div className="location-fields">

        <label className="form-field">
          <span>Province *</span>

          <select
            value={provinceId}
            disabled={loadingProvinces}
            onChange={event =>
              changeProvince(
                event.target.value,
              )
            }
          >
            <option value="">
              {loadingProvinces
                ? "Chargement..."
                : "Choisir une province"}
            </option>

            {provinces.map(
              province => (
                <option
                  key={province.id}
                  value={province.id}
                >
                  {province.name}
                </option>
              ),
            )}
          </select>
        </label>


        <label className="form-field">
          <span>Commune *</span>

          <select
            value={communeId}
            disabled={
              !provinceId ||
              loadingCommunes
            }
            onChange={event =>
              changeCommune(
                event.target.value,
              )
            }
          >
            <option value="">
              {!provinceId
                ? "Choisir d'abord une province"
                : loadingCommunes
                  ? "Chargement..."
                  : "Choisir une commune"}
            </option>

            {communes.map(
              commune => (
                <option
                  key={commune.id}
                  value={commune.id}
                >
                  {commune.name}
                </option>
              ),
            )}
          </select>
        </label>


        <label className="form-field">
          <span>Zone</span>

          <select
            value={zoneId}
            disabled={
              !communeId ||
              loadingZones
            }
            onChange={event =>
              changeZone(
                event.target.value,
              )
            }
          >
            <option value="">
              {!communeId
                ? "Choisir d'abord une commune"
                : loadingZones
                  ? "Chargement..."
                  : "Choisir une zone"}
            </option>

            {zones.map(
              zone => (
                <option
                  key={zone.id}
                  value={zone.id}
                >
                  {zone.name}
                </option>
              ),
            )}
          </select>
        </label>


        <label className="form-field">
          <span>
            Quartier / Colline
          </span>

          <select
            value={localityId}
            disabled={
              !zoneId ||
              loadingLocalities
            }
            onChange={event =>
              onLocalityChange(
                event.target.value,
              )
            }
          >
            <option value="">
              {!zoneId
                ? "Choisir d'abord une zone"
                : loadingLocalities
                  ? "Chargement..."
                  : "Choisir un quartier ou une colline"}
            </option>

            {localities.map(
              locality => (
                <option
                  key={locality.id}
                  value={locality.id}
                >
                  {locality.name}
                  {" · "}
                  {locality.area_type ===
                  "QUARTIER"
                    ? "Quartier"
                    : "Colline"}
                </option>
              ),
            )}
          </select>
        </label>

      </div>


      {selectedArea && (
        <div className="selected-location">
          <MapPin size={16} />

          <div>
            <strong>
              {selectedLocality?.name ??
                selectedZone?.name ??
                selectedCommune?.name ??
                selectedProvince?.name}
            </strong>

            <span>
              {[
                selectedZone?.name,
                selectedCommune?.name,
                selectedProvince?.name,
              ]
                .filter(Boolean)
                .filter(
                  (
                    item,
                    index,
                    values,
                  ) =>
                    values.indexOf(item) ===
                    index,
                )
                .join(", ")}
            </span>
          </div>
        </div>
      )}


      {coordinates && (
        <div className="location-map-wrapper">
          <ApproximateLocationMap
            latitude={
              coordinates.latitude!
            }
            longitude={
              coordinates.longitude!
            }
            radius={2500}
          />

          <p className="location-privacy">
            La carte indique une zone
            approximative et non l'adresse
            exacte du vendeur.
          </p>
        </div>
      )}

    </div>
  );
}