"use client";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { MobileDrawer } from "./MobileDrawer";
import { ChatPanel } from "../chat/ChatPanel";
import { PlacesPanel } from "../places/PlacesPanel";
import { MapContainer } from "../map/MapContainer";
import { SettingsModal } from "../settings/SettingsModal";
import { FaUtensils, FaMapMarkedAlt, FaComments, FaColumns } from "react-icons/fa";

export const AppLayout: React.FC = () => {
  const { showMap, places, mobileTab, selectedDistrict } = useSelector(
    (state: RootState) => state.chat
  );

  // Desktop right panel mode: "split" (지도+AI컨시어지), "map" (지도 전체), "chat" (AI 미식 컨시어지 집중)
  const [rightMode, setRightMode] = useState<"split" | "map" | "chat">("split");

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B1120] text-slate-100 font-sans">
      {/* 1. Desktop & Tablet Gourmet Guide Sidebar */}
      <Sidebar />

      {/* 2. Main Gourmet Platform Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Gourmet Header */}
        <Header />

        {/* Dynamic Body: Left = Restaurant Curation Showcase, Right = Interactive Map & AI Gourmet Concierge */}
        <main className="flex-1 flex overflow-hidden relative pb-14 sm:pb-0">
          {/* A. Primary Restaurant Showcase Panel (Desktop always visible on left, Mobile visible on 'places' tab) */}
          <div
            className={`flex-col h-full overflow-hidden transition-all duration-300 ${
              mobileTab === "places" ? "flex w-full" : "hidden sm:flex"
            } ${
              showMap
                ? "sm:w-[52%] lg:w-[50%] xl:w-[48%] border-r border-white/10"
                : "w-full"
            }`}
          >
            <PlacesPanel />
          </div>

          {/* B. Desktop Right Interactive Workspace (Map & AI Gourmet Concierge) */}
          {showMap && (
            <div className="hidden sm:flex flex-1 flex-col h-full overflow-hidden bg-[#111827]/90">
              {/* Right Workspace Mode Switcher */}
              <div className="px-4 py-2 bg-[#17233A]/95 border-b border-white/10 flex items-center justify-between shrink-0 gap-2">
                <div className="flex items-center gap-1 bg-[#0B1120]/90 p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setRightMode("split")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      rightMode === "split"
                        ? "bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 shadow-sm"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <FaColumns size={11} />
                    <span>맛집 지도 + AI 미식가이드</span>
                  </button>

                  <button
                    onClick={() => setRightMode("map")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      rightMode === "map"
                        ? "bg-[#1E293B] text-amber-300 border border-amber-400/30 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <FaMapMarkedAlt size={11} />
                    <span>실시간 맛집 지도 ({places.length})</span>
                  </button>

                  <button
                    onClick={() => setRightMode("chat")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      rightMode === "chat"
                        ? "bg-[#1E293B] text-amber-300 border border-amber-400/30 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <FaComments size={11} />
                    <span>AI 미식 컨시어지</span>
                  </button>
                </div>

                <span className="text-[11px] text-slate-400 hidden xl:inline">
                  {selectedDistrict} 맛집 카드 클릭 시 지도 위치 즉시 연동
                </span>
              </div>

              {/* Right Workspace Content */}
              <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                {rightMode === "split" && (
                  <>
                    {/* Top Half: Interactive Restaurant Map */}
                    <div className="h-[46%] min-h-[220px] border-b border-white/10 overflow-hidden">
                      <MapContainer />
                    </div>
                    {/* Bottom Half: AI Gourmet Sommelier Concierge */}
                    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                      <ChatPanel />
                    </div>
                  </>
                )}

                {rightMode === "map" && (
                  <div className="flex-1 overflow-hidden">
                    <MapContainer />
                  </div>
                )}

                {rightMode === "chat" && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <ChatPanel />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* C. Mobile Tab: Map View */}
          <div
            className={`sm:hidden w-full h-full overflow-hidden ${
              mobileTab === "map" ? "flex flex-col" : "hidden"
            }`}
          >
            <MapContainer />
          </div>

          {/* D. Mobile Tab: AI Gourmet Chat View */}
          <div
            className={`sm:hidden w-full h-full overflow-hidden ${
              mobileTab === "chat" ? "flex flex-col" : "hidden"
            }`}
          >
            <ChatPanel />
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
