import {
  Outlet,
} from "react-router-dom";

import BottomNav from "./BottomNav";
import Header from "./Header";
import OfflineStatus from "../../offline/OfflineStatus";
import Sidebar from "./Sidebar";


export default function AppShell() {
  return (
    <div className="app-layout">
      <Sidebar />

      <div className="app-main">
        <Header />
        <OfflineStatus />

        <main className="page-container">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  );
}