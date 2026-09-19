import { FileCheck } from "lucide-react";
import AdminSectionPage from "./AdminSectionPage";

export default function PublicationsPage() {
  return <AdminSectionPage title="Publications" description="Contrôler les cycles de publication et d'expiration." icon={FileCheck} sees={["Durées", "Expirations", "Annonce liée", "Package utilisé"]} actions={["Consulter", "Prolonger exceptionnellement"]} />;
}
