import {
  Navigate,
  createBrowserRouter,
} from "react-router-dom";

import type {
  ReactNode,
} from "react";

import AdminLayout from "../admin/components/AdminLayout";
import AdminUsersPage from "../admin/pages/AdminUsersPage";
import AuditLogsPage from "../admin/pages/AuditLogsPage";
import BillingPage from "../admin/pages/BillingPage";
import CategoriesPage from "../admin/pages/CategoriesPage";
import DashboardPage from "../admin/pages/DashboardPage";
import FraudSignalsPage from "../admin/pages/FraudSignalsPage";
import ListingAdminDetailPage from "../admin/pages/ListingAdminDetailPage";
import ListingsPage from "../admin/pages/ListingsPage";
import LocationsPage from "../admin/pages/LocationsPage";
import NotificationsPage from "../admin/pages/NotificationsPage";
import PackagesPage from "../admin/pages/PackagesPage";
import PublicationsPage from "../admin/pages/PublicationsPage";
import ReportsPage from "../admin/pages/ReportsPage";
import ReviewsPage from "../admin/pages/ReviewsPage";
import SettingsPage from "../admin/pages/SettingsPage";
import TransactionsPage from "../admin/pages/TransactionsPage";
import UserDetailPage from "../admin/pages/UserDetailPage";
import UsersPage from "../admin/pages/UsersPage";
import VerificationsPage from "../admin/pages/VerificationsPage";
import { useAuth } from "../auth/AuthContext";
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



function RequireAdmin({
  children,
}: {
  children: ReactNode;
}) {
  const {
    user,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <div className="admin-auth-loading">
        Chargement de l'administration...
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login?returnTo=/admin"
        replace
      />
    );
  }

  if (!user.is_admin) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return children;
}


export const router =
  createBrowserRouter([
    {
      path: "/admin",
      element: (
        <RequireAdmin>
          <AdminLayout />
        </RequireAdmin>
      ),
      errorElement: <RouteErrorPage />,
      children: [
        {
          index: true,
          element: <DashboardPage />,
        },
        {
          path: "users",
          element: <UsersPage />,
        },
        {
          path: "users/:userId",
          element: <UserDetailPage />,
        },
        {
          path: "listings",
          element: <ListingsPage />,
        },
        {
          path: "listings/:listingId",
          element: <ListingAdminDetailPage />,
        },
        {
          path: "categories",
          element: <CategoriesPage />,
        },
        {
          path: "locations",
          element: <LocationsPage />,
        },
        {
          path: "verifications",
          element: <VerificationsPage />,
        },
        {
          path: "reports",
          element: <ReportsPage />,
        },
        {
          path: "fraud",
          element: <FraudSignalsPage />,
        },
        {
          path: "transactions",
          element: <TransactionsPage />,
        },
        {
          path: "reviews",
          element: <ReviewsPage />,
        },
        {
          path: "publications",
          element: <PublicationsPage />,
        },
        {
          path: "packages",
          element: <PackagesPage />,
        },
        {
          path: "billing",
          element: <BillingPage />,
        },
        {
          path: "notifications",
          element: <NotificationsPage />,
        },
        {
          path: "settings",
          element: <SettingsPage />,
        },
        {
          path: "settings/publication",
          element: <SettingsPage />,
        },
        {
          path: "admin-users",
          element: <AdminUsersPage />,
        },
        {
          path: "audit",
          element: <AuditLogsPage />,
        },
      ],
    },
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
