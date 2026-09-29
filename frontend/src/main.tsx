import {
  StrictMode,
} from "react";

import {
  createRoot,
} from "react-dom/client";

import {
  RouterProvider,
} from "react-router-dom";

import {
  AuthProvider,
} from "./auth/AuthContext";

import {
  I18nProvider,
} from "./i18n/I18nProvider";

import {
  CountryProvider,
} from "./market/CountryContext";

import {
  router,
} from "./router";

import "./styles/global.css";

import "leaflet/dist/leaflet.css";

import {
  startOfflineSync,
} from "./offline/sync";


if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}

startOfflineSync();


createRoot(
  document.getElementById("root")!,
).render(
  <StrictMode>
    <I18nProvider>
      <AuthProvider>
        <CountryProvider>
          <RouterProvider
            router={router}
          />
        </CountryProvider>
      </AuthProvider>
    </I18nProvider>
  </StrictMode>,
);