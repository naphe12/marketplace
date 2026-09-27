import { useI18n } from "../../i18n/I18nProvider";

import type {
  CategoryAttribute,
} from "../../types/category";


type Props = {
  title: string;
  description: string;
  condition: string;

  attributes: CategoryAttribute[];

  attributeValues: Record<
    string,
    string | number | boolean
  >;

  onTitleChange: (
    value: string,
  ) => void;

  onDescriptionChange: (
    value: string,
  ) => void;

  onConditionChange: (
    value: string,
  ) => void;

  onAttributeChange: (
    attributeId: string,
    value: string | number | boolean,
  ) => void;
};


export default function DetailsStep({
  title,
  description,
  condition,

  attributes,
  attributeValues,

  onTitleChange,
  onDescriptionChange,
  onConditionChange,
  onAttributeChange,
}: Props) {
  const { t } = useI18n();

  return (
    <section className="publish-panel">
      <div className="publish-panel__heading">
        <h1>
          {t("publish.detailsTitle")}
        </h1>

        <p>
          {t("publish.detailsText")}
        </p>
      </div>


      <label className="form-field">
        <span>{t("publish.title")}</span>

        <input
          value={title}
          maxLength={200}
          placeholder={t("publish.titlePlaceholder")}
          onChange={event =>
            onTitleChange(
              event.target.value,
            )
          }
        />

        <small>
          {title.length}/200 — {t("publish.titleMin")}
        </small>
      </label>


      <div className="form-field">
        <span>{t("publish.condition")}</span>

        <div className="choice-row">
          {[
            ["NEW", t("publish.conditionNew")],
            ["USED", t("publish.conditionUsed")],
            [
              "REFURBISHED",
              t("publish.conditionRefurbished"),
            ],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={
                condition === value
                  ? "choice-chip choice-chip--selected"
                  : "choice-chip"
              }
              onClick={() =>
                onConditionChange(value)
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>


      <label className="form-field">
        <span>{t("publish.description")}</span>

        <textarea
          value={description}
          rows={7}
          maxLength={3000}
          placeholder={t("publish.descriptionPlaceholder")}
          onChange={event =>
            onDescriptionChange(
              event.target.value,
            )
          }
        />

        <small>
          {description.length}/3000
        </small>
      </label>


      {attributes.length > 0 && (
        <>
          <div className="form-section-title">
            {t("publish.attributes")}
          </div>

          <div className="dynamic-fields">
            {attributes.map(attribute => (
              <DynamicAttributeField
                key={attribute.id}
                attribute={attribute}
                value={
                  attributeValues[
                    attribute.id
                  ]
                }
                onChange={value =>
                  onAttributeChange(
                    attribute.id,
                    value,
                  )
                }
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}


function DynamicAttributeField({
  attribute,
  value,
  onChange,
}: {
  attribute: CategoryAttribute;

  value:
    | string
    | number
    | boolean
    | undefined;

  onChange: (
    value: string | number | boolean,
  ) => void;
}) {
  const { t } = useI18n();

  if (
    attribute.data_type === "SELECT"
  ) {
    return (
      <label className="form-field">
        <span>
          {attribute.name}
          {attribute.required && " *"}
        </span>

        <select
          value={
            typeof value === "string"
              ? value
              : ""
          }
          onChange={event =>
            onChange(
              event.target.value,
            )
          }
        >
          <option value="">
            {t("publish.select")}
          </option>

          {attribute.options?.values?.map(
            option => (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            ),
          )}
        </select>
      </label>
    );
  }


  if (
    attribute.data_type === "BOOLEAN"
  ) {
    return (
      <label className="form-checkbox">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={event =>
            onChange(
              event.target.checked,
            )
          }
        />

        <span>
          {attribute.name}
        </span>
      </label>
    );
  }


  return (
    <label className="form-field">
      <span>
        {attribute.name}
        {attribute.required && " *"}
      </span>

      <input
        type={
          attribute.data_type ===
            "INTEGER" ||
          attribute.data_type ===
            "DECIMAL"
            ? "number"
            : attribute.data_type === "DATE"
              ? "date"
              : "text"
        }
        value={
          value === undefined
            ? ""
            : String(value)
        }
        onChange={event =>
          onChange(
            attribute.data_type ===
              "INTEGER" ||
            attribute.data_type ===
              "DECIMAL"
              ? (event.target.value === "" ? "" : Number(event.target.value))
              : event.target.value,
          )
        }
      />
    </label>
  );
}