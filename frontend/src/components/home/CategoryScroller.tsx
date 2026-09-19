import {
  Building2,
  Car,
  Grid3X3,
  Home,
  Laptop,
  Package,
  Shirt,
  Smartphone,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import type { Category } from "../../types/category";


const iconMap = {
  smartphone: Smartphone,
  phone: Smartphone,

  car: Car,
  vehicle: Car,

  house: Home,
  building: Building2,

  laptop: Laptop,
  computer: Laptop,

  fashion: Shirt,
  package: Package,
};


function getIcon(icon: string | null) {
  if (!icon) {
    return Grid3X3;
  }

  return (
    iconMap[
      icon.toLowerCase() as keyof typeof iconMap
    ] ?? Grid3X3
  );
}


export default function CategoryScroller({
  categories,
}: {
  categories: Category[];
}) {
  const navigate = useNavigate();

  const rootCategories =
    categories.filter(
      category => !category.parent_id,
    );

  return (
    <div className="category-scroller">
      {rootCategories.map(category => {
        const Icon = getIcon(category.icon);

        return (
          <button
            key={category.id}
            type="button"
            className="home-category"
            onClick={() =>
              navigate(
                `/search?category_id=${category.id}`,
              )
            }
          >
            <div className="home-category__icon">
              <Icon size={24} />
            </div>

            <span>
              {category.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}