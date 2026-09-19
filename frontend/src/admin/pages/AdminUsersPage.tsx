import { Layers } from "lucide-react";
import AdminSectionPage from "./AdminSectionPage";

export default function AdminUsersPage() {
  return <AdminSectionPage title="Admins" description="Gérer les comptes ayant accès à l'administration." icon={Layers} sees={["Comptes administrateurs", "Rôles", "Dernière activité"]} actions={["Gérer droits"]} />;
}
