import type {
  ListingDetail,
  ListingImage,
} from "../types/listing";

import type {
  AdministrativeArea,
} from "../types/location";

import {
  useListingAttributeAutosave,
} from "../hooks/useListingAttributeAutosave";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  apiRequest,
} from "../api/client";

import {
  useListingAutosave,
} from "../hooks/useListingAutosave";

import AutosaveStatus
  from "../components/publish/AutosaveStatus";

import CategoryStep
  from "../components/publish/CategoryStep";

import DetailsStep
  from "../components/publish/DetailsStep";

import PhotoUploader
  from "../components/publish/PhotoUploader";

import PriceLocationStep
  from "../components/publish/PriceLocationStep";

import PublishStepper
  from "../components/publish/PublishStepper";

import type {
  Category,
  CategoryAttribute,
} from "../types/category";


type DraftAttributeValue = {
  attribute_id: string;

  value_text: string | null;
  value_integer: number | null;
  value_decimal: string | null;
  value_boolean: boolean | null;
  value_date: string | null;
};


type DraftListingDetail =
  ListingDetail & {
    latitude?: number | string | null;
    longitude?: number | string | null;

    attribute_values:
      DraftAttributeValue[];
  };


type ResolvedLocation = {
  administrativeAreaId:
    string | null;

  latitude:
    number | null;

  longitude:
    number | null;
};


function toNumberOrNull(
  value:
    | number
    | string
    | null
    | undefined,
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue,
  )
    ? numberValue
    : null;
}


function resolveAdministrativeHierarchy(
  areas: AdministrativeArea[],
  selectedAreaId: string | null,
) {
  let provinceId = "";
  let communeId = "";
  let zoneId = "";
  let localityId = "";

  if (!selectedAreaId) {
    return {
      provinceId,
      communeId,
      zoneId,
      localityId,
    };
  }

  const areasById = new Map(
    areas.map(area => [
      area.id,
      area,
    ]),
  );

  let current =
    areasById.get(
      selectedAreaId,
    );

  while (current) {
    const type =
      current.area_type.toUpperCase();

    if (type === "PROVINCE") {
      provinceId =
        current.id;
    }

    if (type === "COMMUNE") {
      communeId =
        current.id;
    }

    if (type === "ZONE") {
      zoneId =
        current.id;
    }

    if (
      type === "COLLINE" ||
      type === "QUARTIER"
    ) {
      localityId =
        current.id;
    }

    current =
      current.parent_id
        ? areasById.get(
            current.parent_id,
          )
        : undefined;
  }

  return {
    provinceId,
    communeId,
    zoneId,
    localityId,
  };
}


export default function PublishPage() {
  const { listingId } =
    useParams();

  return (
    <PublishEditor
      key={
        listingId ?? "new"
      }
      resumeId={listingId}
    />
  );
}


function PublishEditor({
  resumeId,
}: {
  resumeId?: string;
}) {
  const navigate =
    useNavigate();

  const choosingCategory =
    useRef(false);

  const [
    restoring,
    setRestoring,
  ] = useState(
    Boolean(resumeId),
  );

  const [
    restoreError,
    setRestoreError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    images,
    setImages,
  ] =
    useState<ListingImage[]>(
      [],
    );

  const [step, setStep] =
    useState(1);

  const [
    categories,
    setCategories,
  ] =
    useState<Category[]>([]);

  const [
    selectedCategory,
    setSelectedCategory,
  ] =
    useState<Category | null>(
      null,
    );

  const [
    attributes,
    setAttributes,
  ] =
    useState<
      CategoryAttribute[]
    >([]);

  const [
    attributeValues,
    setAttributeValues,
  ] =
    useState<
      Record<
        string,
        string |
        number |
        boolean
      >
    >({});


  // -----------------------------
  // Informations annonce
  // -----------------------------

  const [title, setTitle] =
    useState("");

  const [
    description,
    setDescription,
  ] =
    useState("");

  const [
    condition,
    setCondition,
  ] =
    useState("USED");

  const [price, setPrice] =
    useState("");

  const [
    currency,
    setCurrency,
  ] =
    useState("BIF");

  const [
    priceType,
    setPriceType,
  ] =
    useState(
      "NEGOTIABLE",
    );

  const [
    allowOffers,
    setAllowOffers,
  ] =
    useState(true);


  // -----------------------------
  // Localisation
  // -----------------------------

  const [
    provinceId,
    setProvinceId,
  ] =
    useState("");

  const [
    communeId,
    setCommuneId,
  ] =
    useState("");

  const [
    zoneId,
    setZoneId,
  ] =
    useState("");

  const [
    localityId,
    setLocalityId,
  ] =
    useState("");

  const [
    administrativeAreaId,
    setAdministrativeAreaId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    approximateLatitude,
    setApproximateLatitude,
  ] =
    useState<number | null>(
      null,
    );

  const [
    approximateLongitude,
    setApproximateLongitude,
  ] =
    useState<number | null>(
      null,
    );


  // -----------------------------
  // Draft
  // -----------------------------

  const [
    listingId,
    setListingId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );


  // -----------------------------
  // Résolution localisation
  // -----------------------------

  const handleLocationResolved =
    useCallback(
      (
        location:
          ResolvedLocation,
      ) => {
        setAdministrativeAreaId(
          location.administrativeAreaId,
        );

        setApproximateLatitude(
          location.latitude,
        );

        setApproximateLongitude(
          location.longitude,
        );
      },
      [],
    );


  // -----------------------------
  // Autosave annonce
  // -----------------------------

  const saveState =
    useListingAutosave(
      listingId,
      {
        title,
        description,
        condition,

        price,
        currency,

        price_type:
          priceType,

        allow_offers:
          allowOffers,

        administrative_area_id:
          administrativeAreaId,

        latitude:
          approximateLatitude,

        longitude:
          approximateLongitude,
      },
    );


  const attributeAutosave =
    useListingAttributeAutosave(
      listingId,
      attributes,
      attributeValues,
    );


  const combinedSaveState =
    saveState === "error" ||
    attributeAutosave.state ===
      "error"
      ? "error"
      : saveState === "saving" ||
          attributeAutosave.state ===
            "saving"
        ? "saving"
        : saveState === "saved" ||
            attributeAutosave.state ===
              "saved"
          ? "saved"
          : "idle";


  // -----------------------------
  // Charger catégories
  // -----------------------------

  useEffect(() => {
    apiRequest<Category[]>(
      "/categories",
    )
      .then(
        setCategories,
      )
      .catch(error => {
        setError(
          error instanceof Error
            ? error.message
            : "Impossible de charger les catégories.",
        );
      });
  }, []);


  // -----------------------------
  // Restaurer brouillon
  // -----------------------------

  useEffect(() => {
    if (!resumeId) {
      return;
    }

    const controller =
      new AbortController();


    async function restore() {
      try {
        const draft =
          await apiRequest<
            DraftListingDetail
          >(
            `/listings/mine/${resumeId}`,
            {
              authenticated:
                true,

              signal:
                controller.signal,
            },
          );


        if (
          draft.status !==
          "DRAFT"
        ) {
          throw new Error(
            "Cette annonce n’est plus un brouillon.",
          );
        }


        /*
         * Pour restaurer correctement
         * Province -> Commune -> Zone
         * -> Quartier/Colline,
         * on récupère la hiérarchie.
         *
         * Pour le moment on utilise
         * l'endpoint existant.
         */
        const [
          allCategories,
          fields,
          administrativeAreas,
        ] =
          await Promise.all([
            apiRequest<
              Category[]
            >(
              "/categories",
              {
                signal:
                  controller.signal,
              },
            ),

            apiRequest<
              CategoryAttribute[]
            >(
              `/categories/${draft.category_id}/attributes`,
              {
                signal:
                  controller.signal,
              },
            ),

            draft.administrative_area_id
              ? apiRequest<
                  AdministrativeArea[]
                >(
                  "/administrative-areas",
                  {
                    signal:
                      controller.signal,
                  },
                )
              : Promise.resolve(
                  [],
                ),
          ]);


        if (
          controller.signal.aborted
        ) {
          return;
        }


        setCategories(
          allCategories,
        );


        setSelectedCategory(
          allCategories.find(
            category =>
              category.id ===
              draft.category_id,
          ) ?? null,
        );


        setAttributes(
          fields,
        );


        setAttributeValues(
          Object.fromEntries(
            draft.attribute_values.map(
              value => [
                value.attribute_id,

                value.value_text ??
                value.value_integer ??
                value.value_decimal ??
                value.value_boolean ??
                value.value_date ??
                "",
              ],
            ),
          ),
        );


        setTitle(
          draft.title,
        );

        setDescription(
          draft.description ??
            "",
        );

        setCondition(
          draft.condition ??
            "USED",
        );

        setPrice(
          draft.price === null
            ? ""
            : String(
                draft.price,
              ),
        );

        setCurrency(
          draft.currency,
        );

        setPriceType(
          draft.price_type,
        );

        setAllowOffers(
          draft.allow_offers,
        );

        setImages(
          draft.images,
        );


        // -------------------------
        // Restaurer localisation
        // -------------------------

        const hierarchy =
          resolveAdministrativeHierarchy(
            administrativeAreas,
            draft.administrative_area_id,
          );


        setProvinceId(
          hierarchy.provinceId,
        );

        setCommuneId(
          hierarchy.communeId,
        );

        setZoneId(
          hierarchy.zoneId,
        );

        setLocalityId(
          hierarchy.localityId,
        );


        setAdministrativeAreaId(
          draft.administrative_area_id ??
            null,
        );


        const selectedArea =
          administrativeAreas.find(
            area =>
              area.id ===
              draft.administrative_area_id,
          );


        setApproximateLatitude(
          toNumberOrNull(
            draft.latitude ??
              selectedArea
                ?.latitude,
          ),
        );


        setApproximateLongitude(
          toNumberOrNull(
            draft.longitude ??
              selectedArea
                ?.longitude,
          ),
        );


        let lastStep = 2;

        try {
          lastStep =
            Number(
              localStorage.getItem(
                `draft-step:${resumeId}`,
              ),
            ) || 2;
        } catch {
          // Storage indisponible
        }


        setStep(
          lastStep >= 2 &&
          lastStep <= 5
            ? lastStep
            : 2,
        );


        setListingId(
          draft.id,
        );
      } catch (error) {
        if (
          !controller.signal.aborted
        ) {
          setRestoreError(
            error instanceof Error
              ? error.message
              : "Impossible de charger le brouillon.",
          );
        }
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setRestoring(
            false,
          );
        }
      }
    }


    void restore();


    return () =>
      controller.abort();
  }, [resumeId]);


  // -----------------------------
  // Sauvegarder étape courante
  // -----------------------------

  useEffect(() => {
    if (
      !listingId ||
      restoring
    ) {
      return;
    }

    try {
      localStorage.setItem(
        `draft-step:${listingId}`,
        String(step),
      );
    } catch {
      // Storage indisponible
    }
  }, [
    listingId,
    step,
    restoring,
  ]);


  // -----------------------------
  // Choisir catégorie
  // -----------------------------

  async function chooseCategory(
    category: Category,
  ) {
    if (
      saving ||
      choosingCategory.current
    ) {
      return;
    }

    choosingCategory.current =
      true;

    setSaving(true);
    setError(null);

    try {
      let currentListingId =
        listingId;


      if (
        !currentListingId
      ) {
        const draft =
          await apiRequest<{
            id: string;
          }>(
            "/listings",
            {
              method:
                "POST",

              authenticated:
                true,

              body:
                JSON.stringify(
                  {
                    category_id:
                      category.id,

                    title: "",
                    description:
                      "",

                    price:
                      null,

                    currency:
                      "BIF",

                    price_type:
                      "NEGOTIABLE",

                    condition:
                      "USED",

                    quantity:
                      1,

                    allow_offers:
                      true,
                  },
                ),
            },
          );


        currentListingId =
          draft.id;

        setListingId(
          currentListingId,
        );
      } else {
        await apiRequest(
          `/listings/${currentListingId}`,
          {
            method:
              "PATCH",

            authenticated:
              true,

            body:
              JSON.stringify({
                category_id:
                  category.id,
              }),
          },
        );
      }


      const result =
        await apiRequest<
          CategoryAttribute[]
        >(
          `/categories/${category.id}/attributes`,
        );


      setSelectedCategory(
        category,
      );

      setAttributes(
        result,
      );


      if (
        selectedCategory?.id !==
        category.id
      ) {
        setAttributeValues(
          {},
        );
      }


      setStep(2);


      if (!resumeId) {
        navigate(
          `/publish/${currentListingId}`,
          {
            replace:
              true,
          },
        );
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible de préparer le brouillon.",
      );
    } finally {
      choosingCategory.current =
        false;

      setSaving(false);
    }
  }


  // -----------------------------
  // Étape détails
  // -----------------------------

  async function saveDetails() {
    if (
      !listingId ||
      saving
    ) {
      return;
    }

    setError(null);
    setSaving(true);

    try {
      await apiRequest(
        `/listings/${listingId}`,
        {
          method:
            "PATCH",

          authenticated:
            true,

          body:
            JSON.stringify({
              title:
                title.trim(),

              description,

              condition,
            }),
        },
      );


      await attributeAutosave.flush();


      setStep(3);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer l’annonce. Réessayez.",
      );
    } finally {
      setSaving(false);
    }
  }


  // -----------------------------
  // Étape prix + localisation
  // -----------------------------

  async function savePrice() {
    if (!listingId) {
      return;
    }


    /*
     * On exige au minimum
     * une commune.
     *
     * Zone et quartier/colline
     * restent facultatifs.
     */
    if (!communeId) {
      setError(
        "Veuillez choisir au moins une commune.",
      );

      return;
    }


    if (saving) {
      return;
    }


    setError(null);
    setSaving(true);


    /*
     * Sécurité supplémentaire :
     * normalement ceci vient déjà
     * de onLocationResolved().
     */
    const finalAreaId =
      administrativeAreaId ??
      localityId ??
      zoneId ??
      communeId ??
      provinceId ??
      null;


    try {
      await apiRequest(
        `/listings/${listingId}`,
        {
          method:
            "PATCH",

          authenticated:
            true,

          body:
            JSON.stringify({
              administrative_area_id:
                finalAreaId,

              latitude:
                approximateLatitude,

              longitude:
                approximateLongitude,

              price:
                price
                  ? Number(
                      price,
                    )
                  : null,

              currency,

              price_type:
                priceType,

              allow_offers:
                allowOffers,
            }),
        },
      );


      setStep(5);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Impossible d’enregistrer l’annonce. Réessayez.",
      );
    } finally {
      setSaving(false);
    }
  }


  if (restoring) {
    return (
      <div
        className="page"
        role="status"
      >
        Chargement du brouillon…
      </div>
    );
  }


  if (restoreError) {
    return (
      <div className="page">
        <p role="alert">
          {restoreError}
        </p>

        <button
          type="button"
          onClick={() =>
            navigate(
              "/profile",
            )
          }
        >
          Mes brouillons
        </button>
      </div>
    );
  }


  return (
    <div className="publish-page">
      <div className="publish-wrapper">

        <PublishStepper
          currentStep={step}
        />


        <AutosaveStatus
          state={
            combinedSaveState
          }
        />


        {step === 1 && (
          <CategoryStep
            disabled={saving}

            categories={
              categories.filter(
                category =>
                  !category.parent_id,
              )
            }

            selectedId={
              selectedCategory?.id ??
              null
            }

            onSelect={
              chooseCategory
            }
          />
        )}


        {step === 2 && (
          <DetailsStep
            title={title}

            description={
              description
            }

            condition={
              condition
            }

            attributes={
              attributes
            }

            attributeValues={
              attributeValues
            }

            onTitleChange={
              setTitle
            }

            onDescriptionChange={
              setDescription
            }

            onConditionChange={
              setCondition
            }

            onAttributeChange={(
              attributeId,
              value,
            ) =>
              setAttributeValues(
                current => ({
                  ...current,

                  [attributeId]:
                    value,
                }),
              )
            }
          />
        )}


        {step === 3 &&
          listingId && (
            <PhotoUploader
              initialImages={
                images
              }

              onChange={
                setImages
              }

              listingId={
                listingId
              }
            />
          )}


        {step === 4 && (
          <PriceLocationStep
            price={price}
            currency={currency}
            priceType={priceType}
            allowOffers={allowOffers}

            provinceId={provinceId}
            communeId={communeId}
            zoneId={zoneId}
            localityId={localityId}

            latitude={approximateLatitude}
            longitude={approximateLongitude}

            // Conservez toutes les propriétés on... existantes
            onPriceChange={setPrice}
            onCurrencyChange={setCurrency}
            onPriceTypeChange={setPriceType}
            onAllowOffersChange={setAllowOffers}
            onProvinceChange={setProvinceId}
            onCommuneChange={setCommuneId}
            onZoneChange={setZoneId}
            onLocalityChange={setLocalityId}
            onLocationResolved={handleLocationResolved}
          />
        )}


        {step === 5 && (
          <section className="publish-panel">

            <div className="publish-panel__heading">
              <h1>
                Vérifiez votre annonce
              </h1>

              <p>
                Relisez les informations
                avant de publier.
              </p>
            </div>


            <div className="review-card">
              <span>
                Catégorie
              </span>

              <strong>
                {
                  selectedCategory
                    ?.name
                }
              </strong>
            </div>


            <div className="review-card">
              <span>
                Titre
              </span>

              <strong>
                {title}
              </strong>
            </div>


            <div className="review-card">
              <span>
                Prix
              </span>

              <strong>
                {price || "—"}{" "}
                {currency}
              </strong>
            </div>


            <div className="review-card">
              <span>
                Localisation
              </span>

              <strong>
                {localityId
                  ? "Quartier / Colline sélectionné"
                  : zoneId
                    ? "Zone sélectionnée"
                    : communeId
                      ? "Commune sélectionnée"
                      : "—"}
              </strong>
            </div>

          </section>
        )}


        {error && (
          <p
            className="form-error"
            role="alert"
          >
            {error}
          </p>
        )}


        <div className="publish-actions">

          {step > 1 && (
            <button
              type="button"

              className="secondary-button"

              disabled={
                saving
              }

              onClick={() =>
                setStep(
                  current =>
                    current - 1,
                )
              }
            >
              Retour
            </button>
          )}


          {step === 2 && (
            <button
              type="button"

              className="primary-button"

              disabled={
                saving ||
                title
                  .trim()
                  .length < 3
              }

              onClick={
                saveDetails
              }
            >
              {saving
                ? "Enregistrement..."
                : "Continuer"}
            </button>
          )}


          {step === 3 && (
            <button
              type="button"

              className="primary-button"

              onClick={() =>
                setStep(4)
              }
            >
              Continuer
            </button>
          )}


          {step === 4 && (
            <button
              type="button"

              className="primary-button"

              disabled={
                saving ||
                !price ||
                !communeId
              }

              onClick={
                savePrice
              }
            >
              Continuer
            </button>
          )}


          {step === 5 &&
            listingId && (
              <button
                type="button"

                className="primary-button"

                onClick={
                  async () => {
                    const result =
                      await apiRequest<{
                        payment_required:
                          boolean;

                        status:
                          string;
                      }>(
                        `/listings/${listingId}/publish`,
                        {
                          method:
                            "POST",

                          authenticated:
                            true,
                        },
                      );


                    if (
                      result.payment_required
                    ) {
                      navigate(
                        `/listings/${listingId}/packages`,
                      );
                    } else {
                      navigate(
                        `/listings/${listingId}`,
                      );
                    }
                  }
                }
              >
                Publier l'annonce
              </button>
            )}

        </div>
      </div>
    </div>
  );
}