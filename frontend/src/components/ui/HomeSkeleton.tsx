import ListingSkeleton from "./ListingSkeleton";


export default function HomeSkeleton() {
  return (
    <>
      <div className="category-skeleton-row">
        {Array.from({ length: 6 }).map(
          (_, index) => (
            <div
              key={index}
              className="category-skeleton"
            >
              <div className="skeleton skeleton-category-icon" />
              <div className="skeleton skeleton-category-text" />
            </div>
          ),
        )}
      </div>

      <div className="listing-grid">
        {Array.from({ length: 8 }).map(
          (_, index) => (
            <ListingSkeleton
              key={index}
            />
          ),
        )}
      </div>
    </>
  );
}