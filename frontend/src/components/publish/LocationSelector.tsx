import {
  useEffect,
  useState,
} from "react";

import {
  MapPin,
} from "lucide-react";

import {
  apiRequest,
} from "../../api/client";

import type {
  AdministrativeArea,
} from "../../types/location";


type Props = {
  provinceId: string;
  communeId: string;

  onProvinceChange: (
    value: string,
  ) => void;

  onCommuneChange: (
    value: string,
  ) => void;
};


export default function LocationSelector({
  provinceId,
  communeId,

  onProvinceChange,
  onCommuneChange,
}: Props) {
  const [provinces, setProvinces] =
    useState<AdministrativeArea[]>([]);

  const [communes, setCommunes] =
    useState<AdministrativeArea[]>([]);

  const [loadingProvinces, setLoadingProvinces] =
    useState(true);

  const [loadingCommunes, setLoadingCommunes] =
    useState(false);


  useEffect(() => {
    async function loadProvinces() {
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

    loadProvinces();
  }, []);


  useEffect(() => {
    if (!provinceId) {
      setCommunes([]);
      return;
    }


    async function loadCommunes() {
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

    loadCommunes();
  }, [provinceId]);


  function changeProvince(
    value: string,
  ) {
    onProvinceChange(value);

    onCommuneChange("");
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
            Une localisation précise aide
            les acheteurs à trouver les
            annonces proches d'eux.
          </span>
        </div>
      </div>


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
            onCommuneChange(
              event.target.value,
            )
          }
        >
          <option value="">
            {!provinceId
              ? "Choisissez d'abord une province"
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
    </div>
  );
}