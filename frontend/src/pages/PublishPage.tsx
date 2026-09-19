import type { ListingDetail, ListingImage } from "../types/listing";
import type { AdministrativeArea } from "../types/location";
import { useListingAttributeAutosave } from "../hooks/useListingAttributeAutosave";
import {
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

import { useListingAutosave } from "../hooks/useListingAutosave";

import AutosaveStatus from "../components/publish/AutosaveStatus";
import CategoryStep from "../components/publish/CategoryStep";
import DetailsStep from "../components/publish/DetailsStep";
import PhotoUploader from "../components/publish/PhotoUploader";
import PriceLocationStep from "../components/publish/PriceLocationStep";
import PublishStepper from "../components/publish/PublishStepper";

import type {
  Category,
  CategoryAttribute,
} from "../types/category";


export default function PublishPage() {
  const { listingId } = useParams();
  return <PublishEditor key={listingId ?? "new"} resumeId={listingId} />;
}

function PublishEditor({ resumeId }: { resumeId?: string }) {
  const navigate = useNavigate();
  const choosingCategory = useRef(false);
  const [restoring, setRestoring] = useState(Boolean(resumeId));
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [images, setImages] = useState<ListingImage[]>([]);

  const [step, setStep] =
    useState(1);

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [selectedCategory, setSelectedCategory] =
    useState<Category | null>(null);

  const [attributes, setAttributes] =
    useState<CategoryAttribute[]>([]);

  const [attributeValues, setAttributeValues] =
    useState<
      Record<
        string,
        string | number | boolean
      >
    >({});

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [condition, setCondition] =
    useState("USED");

  const [price, setPrice] =
    useState("");

  const [currency, setCurrency] =
    useState("BIF");

  const [priceType, setPriceType] =
    useState("NEGOTIABLE");

  const [allowOffers, setAllowOffers] =
    useState(true);

  const [provinceId, setProvinceId] = useState("");
  const [communeId, setCommuneId] = useState("");

  const [listingId, setListingId] =
    useState<string | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] = useState<string | null>(null);

  const saveState = useListingAutosave(listingId, {
    title,
    description,
    condition,
    price,
    currency,
    price_type: priceType,
    allow_offers: allowOffers,
    administrative_area_id: communeId || null,
  });


  const attributeAutosave = useListingAttributeAutosave(listingId, attributes, attributeValues);
  const combinedSaveState = saveState === "error" || attributeAutosave.state === "error" ? "error"
    : saveState === "saving" || attributeAutosave.state === "saving" ? "saving"
    : saveState === "saved" || attributeAutosave.state === "saved" ? "saved" : "idle";

  useEffect(() => {
    apiRequest<Category[]>(
      "/categories",
    ).then(setCategories).catch(error => {
      setError(error instanceof Error ? error.message : "Impossible de charger les catégories.");
    });
  }, []);


  useEffect(() => {
    if (!resumeId) return;
    const controller = new AbortController();
    async function restore() {
      try {
        const draft = await apiRequest<ListingDetail & { attribute_values: {
          attribute_id: string; value_text: string | null; value_integer: number | null;
          value_decimal: string | null; value_boolean: boolean | null; value_date: string | null;
        }[] }>(`/listings/mine/${resumeId}`, { authenticated: true, signal: controller.signal });
        if (draft.status !== "DRAFT") throw new Error("Cette annonce n’est plus un brouillon.");
        const [allCategories, fields, communes] = await Promise.all([
          apiRequest<Category[]>("/categories", { signal: controller.signal }),
          apiRequest<CategoryAttribute[]>(`/categories/${draft.category_id}/attributes`, { signal: controller.signal }),
          draft.administrative_area_id
            ? apiRequest<AdministrativeArea[]>("/administrative-areas?area_type=COMMUNE", { signal: controller.signal })
            : Promise.resolve([]),
        ]);
        if (controller.signal.aborted) return;
        setCategories(allCategories);
        setSelectedCategory(allCategories.find(category => category.id === draft.category_id) ?? null);
        setAttributes(fields);
        setAttributeValues(Object.fromEntries(draft.attribute_values.map(value => [value.attribute_id,
          value.value_text ?? value.value_integer ?? value.value_decimal ?? value.value_boolean ?? value.value_date ?? "",
        ])));
        setTitle(draft.title); setDescription(draft.description ?? ""); setCondition(draft.condition ?? "USED");
        setPrice(draft.price === null ? "" : String(draft.price)); setCurrency(draft.currency);
        setPriceType(draft.price_type); setAllowOffers(draft.allow_offers); setImages(draft.images);
        setCommuneId(draft.administrative_area_id ?? "");
        setProvinceId(communes.find(area => area.id === draft.administrative_area_id)?.parent_id ?? "");
        let lastStep = 2;
        try { lastStep = Number(localStorage.getItem(`draft-step:${resumeId}`)) || 2; } catch { /* storage unavailable */ }
        setStep(lastStep >= 2 && lastStep <= 5 ? lastStep : 2);
        setListingId(draft.id);
      } catch (error) {
        if (!controller.signal.aborted) setRestoreError(error instanceof Error ? error.message : "Impossible de charger le brouillon.");
      } finally {
        if (!controller.signal.aborted) setRestoring(false);
      }
    }
    void restore();
    return () => controller.abort();
  }, [resumeId]);

  useEffect(() => {
    if (!listingId || restoring) return;
    try { localStorage.setItem(`draft-step:${listingId}`, String(step)); } catch { /* storage unavailable */ }
  }, [listingId, step, restoring]);

  async function chooseCategory(category: Category) {
    if (saving || choosingCategory.current) return;
    choosingCategory.current = true;
    setSaving(true);
    setError(null);
    try {
      let currentListingId = listingId;
      if (!currentListingId) {
        const draft = await apiRequest<{ id: string }>("/listings", {
          method: "POST",
          authenticated: true,
          body: JSON.stringify({
            category_id: category.id,
            title: "", description: "", price: null,
            currency: "BIF", price_type: "NEGOTIABLE", condition: "USED",
            quantity: 1, allow_offers: true,
          }),
        });
        currentListingId = draft.id;
        setListingId(currentListingId);
      } else {
        await apiRequest(`/listings/${currentListingId}`, {
          method: "PATCH", authenticated: true,
          body: JSON.stringify({ category_id: category.id }),
        });
      }
      const result = await apiRequest<CategoryAttribute[]>(`/categories/${category.id}/attributes`);
      setSelectedCategory(category);
      setAttributes(result);
      if (selectedCategory?.id !== category.id) setAttributeValues({});
      setStep(2);
      if (!resumeId) navigate(`/publish/${currentListingId}`, { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Impossible de préparer le brouillon.");
    } finally {
      choosingCategory.current = false;
      setSaving(false);
    }
  }

  async function saveDetails() {
    if (!listingId || saving) return;
    setError(null);
    setSaving(true);
    try {
      await apiRequest(`/listings/${listingId}`, {
        method: "PATCH", authenticated: true,
        body: JSON.stringify({ title: title.trim(), description, condition }),
      });

      await attributeAutosave.flush();

      setStep(3);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Impossible d’enregistrer l’annonce. Réessayez.");
    } finally {
      setSaving(false);
    }
  }


  async function savePrice() {
    if (!listingId) {
      return;
    }

    if (!communeId) {
      return;
    }

    if (saving) return;
    setError(null);
    setSaving(true);

    try {
      await apiRequest(
        `/listings/${listingId}`,
        {
          method: "PATCH",
          authenticated: true,

          body: JSON.stringify({
            administrative_area_id: communeId || null,
            price:
              price
                ? Number(price)
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
      setError(error instanceof Error ? error.message : "Impossible d’enregistrer l’annonce. Réessayez.");
    } finally {
      setSaving(false);
    }
  }


  if (restoring) return <div className="page" role="status">Chargement du brouillon…</div>;
  if (restoreError) return <div className="page"><p role="alert">{restoreError}</p><button type="button" onClick={() => navigate("/profile")}>Mes brouillons</button></div>;

  return (
    <div className="publish-page">
      <div className="publish-wrapper">
        <PublishStepper
          currentStep={step}
        />

        <AutosaveStatus state={combinedSaveState} />


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
            description={description}
            condition={condition}

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
            initialImages={images}
            onChange={setImages}
            listingId={
              listingId
            }
          />
        )}


        {step === 4 && (
          <PriceLocationStep
            provinceId={provinceId}
            communeId={communeId}
            onProvinceChange={setProvinceId}
            onCommuneChange={setCommuneId}
            price={price}
            currency={currency}
            priceType={priceType}
            allowOffers={
              allowOffers
            }

            onPriceChange={
              setPrice
            }

            onCurrencyChange={
              setCurrency
            }

            onPriceTypeChange={
              setPriceType
            }

            onAllowOffersChange={
              setAllowOffers
            }
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
              <span>Titre</span>
              <strong>{title}</strong>
            </div>

            <div className="review-card">
              <span>Prix</span>

              <strong>
                {price || "—"}{" "}
                {currency}
              </strong>
            </div>
          </section>
        )}


        {error && (
          <p className="form-error" role="alert">{error}</p>
        )}

        <div className="publish-actions">
          {step > 1 && (
            <button
              type="button"
              className="secondary-button"
              disabled={saving}
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
                title.trim().length < 3
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
              disabled={saving || !price || !communeId}
              onClick={savePrice}
            >
              Continuer
            </button>
          )}


          {step === 5 &&
            listingId && (
            <button
              type="button"
              className="primary-button"
              onClick={async () => {
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
              }}
            >
              Publier l'annonce
            </button>
          )}
        </div>
      </div>
    </div>
  );
}