import {
  Goal,
  Heart,
  Home,
  MessageCircle,
  PlusCircle,
  Search,
  User,
} from "lucide-react";

import type {
  TranslationKey,
} from "../../i18n/translations";

type NavigationItem = {
  to: string;
  labelKey: TranslationKey;
  icon: typeof Home;
  primary?: boolean;
};

export const navigationItems: NavigationItem[] = [
  {
    to: "/",
    labelKey: "nav.home",
    icon: Home,
  },
  {
    to: "/search",
    labelKey: "nav.search",
    icon: Search,
  },
  {
    to: "/wanted",
    labelKey: "nav.wanted",
    icon: Goal,
  },
  {
    to: "/publish",
    labelKey: "nav.publish",
    icon: PlusCircle,
    primary: true,
  },
  {
    to: "/messages",
    labelKey: "nav.messages",
    icon: MessageCircle,
  },
  {
    to: "/favorites",
    labelKey: "nav.favorites",
    icon: Heart,
  },
  {
    to: "/profile",
    labelKey: "nav.profile",
    icon: User,
  },
];