import {
  createBrowserRouter,
} from "react-router-dom";

import AppShell from "../components/layout/AppShell";

import FavoritesPage from "../pages/FavoritesPage";
import HomePage from "../pages/HomePage";
import ListingDetailPage from "../pages/ListingDetailPage";
import LoginPage from "../pages/LoginPage";
import MessagesPage from "../pages/MessagesPage";
import ProfilePage from "../pages/ProfilePage";
import PublishPage from "../pages/PublishPage";
import RouteErrorPage from "../pages/RouteErrorPage";
import SearchPage from "../pages/SearchPage";


export const router =
  createBrowserRouter([
    {
      element: <AppShell />,
      errorElement: <RouteErrorPage />,

      children: [
        {
          path: "/",
          element: <HomePage />,
        },
        {
          path: "/search",
          element: <SearchPage />,
        },
        {
          path: "/publish",
          element: <PublishPage />,
        },
        {
          path: "/publish/:listingId",
          element: <PublishPage />,
        },
        {
          path: "/messages",
          element: <MessagesPage />,
        },
        {
          path: "/favorites",
          element: <FavoritesPage />,
        },
        {
          path: "/profile",
          element: <ProfilePage />,
        },
        {
          path: "/listings/:listingId",
          element: (
            <ListingDetailPage />
          ),
        },
        {
          path: "*",
          element: <RouteErrorPage />,
        },
      ],
    },

    {
      path: "/login",
      element: <LoginPage />,
    },
  ]);
