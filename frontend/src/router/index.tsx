import {
  createBrowserRouter,
} from "react-router-dom";

import AppShell from "../components/layout/AppShell";

import HomePage from "../pages/HomePage";
import ListingDetailPage from "../pages/ListingDetailPage";
import LoginPage from "../pages/LoginPage";
import MessagesPage from "../pages/MessagesPage";
import ProfilePage from "../pages/ProfilePage";
import PublishPage from "../pages/PublishPage";
import SearchPage from "../pages/SearchPage";


export const router =
  createBrowserRouter([
    {
      element: <AppShell />,

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
          path: "/profile",
          element: <ProfilePage />,
        },
        {
          path: "/listings/:listingId",
          element: (
            <ListingDetailPage />
          ),
        },
      ],
    },

    {
      path: "/login",
      element: <LoginPage />,
    },
  ]);