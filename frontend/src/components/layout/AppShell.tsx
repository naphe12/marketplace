import {
  Outlet,
} from "react-router-dom";

import BottomNav from "./BottomNav";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { CountryProvider } from "../../market/CountryContext";


export default function AppShell() {
  return (
    <CountryProvider>
      <div className="app-layout">
        <Sidebar />

        <div className="app-main">
          <Header />

          <main className="page-container">
            <Outlet />
          </main>
        </div>

        <BottomNav />
      </div>
    </CountryProvider>
  );
}