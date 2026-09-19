export default function ListingSkeleton() {
  return (
    <div className="listing-skeleton">
      <div className="skeleton skeleton-image" />

      <div className="listing-skeleton__body">
        <div className="skeleton skeleton-line" />

        <div className="skeleton skeleton-line-short" />

        <div className="skeleton skeleton-price" />
      </div>
    </div>
  );
}