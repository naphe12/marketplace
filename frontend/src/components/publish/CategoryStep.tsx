import { useI18n } from "../../i18n/I18nProvider";

import type {
  Category,
} from "../../types/category";


type Props = {
  categories: Category[];

  selectedId: string | null;
  disabled?: boolean;

  onSelect: (
    category: Category,
  ) => void;
};


export default function CategoryStep({
  categories,
  selectedId,
  onSelect,
  disabled = false,
}: Props) {
  const { t } = useI18n();

  return (
    <section className="publish-panel">
      <div className="publish-panel__heading">
        <h1>
          {t("publish.categoryTitle")}
        </h1>

        <p>
          {t("publish.categoryText")}
        </p>
      </div>

      <div className="publish-category-grid">
        {categories.map(category => (
          <button
            key={category.id}
            type="button"
            disabled={disabled}
            className={[
              "publish-category-card",

              selectedId === category.id
                ? "publish-category-card--selected"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() =>
              onSelect(category)
            }
          >
            <strong>
              {category.name}
            </strong>

            {category.description && (
              <span>
                {category.description}
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}