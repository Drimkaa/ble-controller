"use client";

import { useEffect, useState } from "react";
import { useTranslations } from 'next-intl';
import {
  autoConnectBle,
  setSupportsBle,
} from "../store/bleSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import MainTab from "./components/MainTab";
import ZonesTab from "./components/ZonesTab";
import ModeEditorTab from "./components/ModeEditorTab";
import LibraryTab from "./components/LibraryTab";
import LanguageSwitcher from "./components/LanguageSwitcher";
import Toast from "./components/Toast";

const TABS = [
  {
    id: "main" as const, icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    )
  },
  {
    id: "zones" as const, icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    )
  },
  {
    id: "editor" as const, icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    )
  },
  {
    id: "library" as const, icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    )
  },
];

type TabId = (typeof TABS)[number]["id"];

export default function Home() {
  const t = useTranslations();
  const dispatch = useAppDispatch();
  const { isConnected, selectedZoneKey } = useAppSelector((s) => s.ble);
  const [activeTab, setActiveTab] = useState<TabId>("main");

  useEffect(() => {
    const isSupported =
      typeof navigator !== "undefined" && "bluetooth" in navigator;
    dispatch(setSupportsBle(isSupported));
    if (isSupported) {
      dispatch(autoConnectBle());
    }
  }, [dispatch]);

  return (
    <div className="app">
      <div className="app-bg" aria-hidden="true" />

      {/* Header */}
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-logo">
            <span className="app-logo-icon">◈</span>
            <span className="app-logo-text">{t('app.title')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LanguageSwitcher />
            <div className={`conn-badge ${isConnected ? "on" : ""}`}>
              <span className="conn-dot" />
              <span className="conn-text">
                {isConnected ? t('connection.connected') : t('connection.offline')}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        <div className="app-container">
          {activeTab === "main" && <MainTab />}
          {activeTab === "zones" && <ZonesTab />}
          {activeTab === "editor" && <ModeEditorTab />}
          {activeTab === "library" && <LibraryTab />}
        </div>
      </main>

      {/* Tab Bar */}
      <nav className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{t(`tabs.${tab.id}`)}</span>
            {tab.id === "editor" && selectedZoneKey && (
              <span className="tab-dot" />
            )}
          </button>
        ))}
      </nav>

      {/* Toast Notifications */}
      <Toast />
    </div>
  );
}
