import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  apiRequest,
} from "../api/client";

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
  const navigate = useNavigate();

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

  const [listingId, setListingId] =
    useState<string | null>(null);

  const [saving, setSaving] =
    useState(false);


  useEffect(() => {
    apiRequest<Category[]>(
      "/categories",
    ).then(setCategories);
  }, []);


  async function chooseCategory(
    category: Category,
  ) {
    setSelectedCategory(
      category,
    );

    const result =
      await apiRequest<
        CategoryAttribute[]
      >(
        `/categories/${category.id}/attributes`,
      );

    setAttributes(result);

    setAttributeValues({});

    setStep(2);
  }


  async function createDraft() {
    if (!selectedCategory) {
      return;
    }

    setSaving(true);

    try {
      const listing =
        await apiRequest<{
          id: string;
        }>(
          "/listings",
          {
            method: "POST",
            authenticated: true,

            body: JSON.stringify({
              category_id:
                selectedCategory.id,

              title,
              description,

              price: null,

              currency,

              price_type:
                priceType,

              condition,

              quantity: 1,

              allow_offers:
                allowOffers,
            }),
          },
        );

      setListingId(
        listing.id,
      );


      for (
        const attribute
        of attributes
      ) {
        const value =
          attributeValues[
            attribute.id
          ];

        if (
          value === undefined ||
          value === ""
        ) {
          continue;
        }

        const payload:
          Record<string, unknown> = {
            attribute_id:
              attribute.id,
        };

        switch (
          attribute.data_type
        ) {
          case "INTEGER":
            payload.value_integer =
              Number(value);
            break;

          case "DECIMAL":
            payload.value_decimal =
              Number(value);
            break;

          case "BOOLEAN":
            payload.value_boolean =
              Boolean(value);
            break;

          case "DATE":
            payload.value_date =
              String(value);
            break;

          default:
            payload.value_text =
              String(value);
        }

        await apiRequest(
          `/listings/${listing.id}/attributes`,
          {
            method: "POST",
            authenticated: true,

            body:
              JSON.stringify(
                payload,
              ),
          },
        );
      }


      setStep(3);
    } finally {
      setSaving(false);
    }
  }


  async function savePrice() {
    if (!listingId) {
      return;
    }

    setSaving(true);

    try {
      await apiRequest(
        `/listings/${listingId}`,
        {
          method: "PATCH",
          authenticated: true,

          body: JSON.stringify({
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
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="publish-page">
      <div className="publish-wrapper">
        <PublishStepper
          currentStep={step}
        />


        {step === 1 && (
          <CategoryStep
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


        <div className="publish-actions">
          {step > 1 && (
            <button
              type="button"
              className="secondary-button"
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
                createDraft
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
              disabled={saving}
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