"use client";
import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { MobileDrawer } from "./MobileDrawer";
import { ChatPanel } from "../chat/ChatPanel";
import { PlacesPanel } from "../places/PlacesPanel";
import { MapContainer } from "../map/MapContainer";
import { SettingsModal } from "../settings/SettingsModal";
import { FaListUl, FaMap } from "react-icons/fa";

export const AppLayout: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { showMap, places, mobileTab } = useSelector(
    (state: RootState) => state.chat
  );

  // Desktop right panel tab mode: "places" or "map"
  const [rightPanelTab, setRightPanelTab] = useState<"places" | "map">("places");

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B1120] text-slate-100 font-sans">
      {/* 1. Desktop & Tablet Navigation Sidebar */}
      <Sidebar />

      {/* 2. Main Work Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Header */}
        <Header />

        {/* Dynamic Body: Desktop (2 or 3 Columns) / Mobile (Tabbed Views) */}
        <main className="flex-1 flex overflow-hidden relative pb-14 sm:pb-0">
          {/* A. Chat Panel */}
          <div
            className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ${
              mobileTab !== "chat" ? "hidden sm:flex" : "flex"
            } ${showMap ? "sm:max-w-[50%] lg:max-w-[55%]" : "w-full"}`}
          >
            <ChatPanel />
          </div>

          {/* B. Desktop Right Panel (Places List & Map) */}
          {showMap && (
            <div className="hidden sm:flex flex-1 flex-col h-full overflow-hidden border-l border-white/10 bg-[#131B2E]/80">
              {/* Right Panel Sub-tab Toggle (장소 목록 / 지도) */}
              <div className="px-4 py-2 bg-[#17233A]/90 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1 bg-[#0D111A]/80 p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setRightPanelTab("places")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      rightPanelTab === "places"
                        ? "bg-[#1E293B] text-[#FDE047] shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <FaListUl size={11} />
                    <span>추천 장소 ({places.length})</span>
                  </button>

                  <button
                    onClick={() => setRightPanelTab("map")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      rightPanelTab === "map"
                        ? "bg-[#1E293B] text-blue-400 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <FaMap size={11} />
                    <span>실시간 지도</span>
                  </button>
                </div>

                <span className="text-xs text-slate-400">
                  {rightPanelTab === "places" ? "카드 선택 시 지도 연동" : "마커 클릭 시 카드 동기화"}
                </span>
              </div>

              {/* Sub-panel content */}
              <div className="flex-1 overflow-hidden">
                {rightPanelTab === "places" ? <PlacesPanel /> : <MapContainer />}
              </div>
            </div>
          )}

          {/* C. Mobile Tab: Places List */}
          <div
            className={`sm:hidden w-full h-full overflow-hidden ${
              mobileTab === "places" ? "flex flex-col" : "hidden"
            }`}
          >
            <PlacesPanel />
          </div>

          {/* D. Mobile Tab: Map View */}
          <div
            className={`sm:hidden w-full h-full overflow-hidden ${
              mobileTab === "map" ? "flex flex-col" : "hidden"
            }`}
          >
            <MapContainer />
          </div>
        </main>

        {/* 3. Mobile Bottom Navigation */}
        <MobileNav />
      </div>

      {/* 4. Global Modals and Drawers */}
      <MobileDrawer />
      <SettingsModal />
    </div>
  );
};
