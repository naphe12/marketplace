import {
  Activity,
  Bell,
  CreditCard,
  FileCheck,
  Flag,
  Gauge,
  Layers,
  ListChecks,
  MapPinned,
  Package,
  Receipt,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Star,
  Tags,
  Users,
} from "lucide-react";


export const adminNavigationItems = [
  {
    to: "/admin",
    label: "Dashboard",
    icon: Gauge,
    end: true,
  },
  {
    to: "/admin/users",
    label: "Utilisateurs",
    icon: Users,
  },
  {
    to: "/admin/listings",
    label: "Annonces",
    icon: ListChecks,
  },
  {
    to: "/admin/categories",
    label: "Catégories",
    icon: Tags,
  },
  {
    to: "/admin/locations",
    label: "Localisation",
    icon: MapPinned,
  },
  {
    to: "/admin/verifications",
    label: "Vérifications",
    icon: ShieldCheck,
  },
  {
    to: "/admin/reports",
    label: "Signalements",
    icon: Flag,
  },
  {
    to: "/admin/fraud",
    label: "Anti-fraude",
    icon: ShieldAlert,
  },
  {
    to: "/admin/transactions",
    label: "Transactions",
    icon: Receipt,
  },
  {
    to: "/admin/reviews",
    label: "Avis",
    icon: Star,
  },
  {
    to: "/admin/publications",
    label: "Publications",
    icon: FileCheck,
  },
  {
    to: "/admin/packages",
    label: "Packages & tarifs",
    icon: Package,
  },
  {
    to: "/admin/billing",
    label: "Paiements",
    icon: CreditCard,
  },
  {
    to: "/admin/notifications",
    label: "Notifications",
    icon: Bell,
  },
  {
    to: "/admin/settings",
    label: "Paramètres",
    icon: Settings,
  },
  {
    to: "/admin/admin-users",
    label: "Administrateurs",
    icon: Layers,
  },
  {
    to: "/admin/audit",
    label: "Audit",
    icon: Activity,
  },
];
