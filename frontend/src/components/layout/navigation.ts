import {
  Heart,
  Home,
  MessageCircle,
  PlusCircle,
  Search,
  User,
} from "lucide-react";


export const navigationItems = [
  {
    to: "/",
    label: "Accueil",
    icon: Home,
  },
  {
    to: "/search",
    label: "Rechercher",
    icon: Search,
  },
  {
    to: "/publish",
    label: "Publier",
    icon: PlusCircle,
    primary: true,
  },
  {
    to: "/messages",
    label: "Messages",
    icon: MessageCircle,
  },
  {
    to: "/favorites",
    label: "Favoris",
    icon: Heart,
  },
  {
    to: "/profile",
    label: "Profil",
    icon: User,
  },
];