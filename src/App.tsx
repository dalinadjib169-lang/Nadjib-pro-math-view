import React, { useState } from "react";
import ChatLayout from "./components/ChatLayout";
import AdminDashboard from "./components/AdminDashboard";
import PWAInstallBanner from "./components/PWAInstallBanner";

export default function App() {
  const [currentView, setCurrentView] = useState<"app" | "admin">("app");

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col overflow-hidden select-none">
      {/* PWA App Install Notification Banner */}
      <PWAInstallBanner />

      {/* Main core Router container */}
      <main className="flex-1 w-full bg-slate-950 relative">
        {currentView === "app" ? (
          <ChatLayout onOpenAdmin={() => setCurrentView("admin")} />
        ) : (
          <AdminDashboard onBackToApp={() => setCurrentView("app")} />
        )}
      </main>
    </div>
  );
}
