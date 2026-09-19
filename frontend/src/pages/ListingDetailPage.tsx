import {
  useParams,
} from "react-router-dom";


export default function ListingDetailPage() {
  const { listingId } =
    useParams();

  return (
    <div className="page">
      <h1>Détail annonce</h1>

      <p>{listingId}</p>
    </div>
  );
}