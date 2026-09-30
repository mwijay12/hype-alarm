import { HashRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Alarms } from "./pages/Alarms";
import { SoundLibrary } from "./pages/SoundLibrary";
import { Productivity } from "./pages/Productivity";
import { History } from "./pages/History";
import { Settings } from "./pages/Settings";
import { DesktopWidget } from "./components/ui/DesktopWidget";

/**
 * Kwa nini tunatumia HashRouter:
 * Katika programu za asili za Desktop (Tauri na WebView2), faili za HTML/JS
 * zinatumikiwa moja kwa moja kutoka kwenye diski au anwani ya ndani (k.m. tauri://localhost).
 * HashRouter (`/#/alarms`, `/#/sounds`, `/#/widget`) inahakikisha kuwa mtumiaji akibonyeza reload
 * au dirisha likifunguliwa upya, mfumo haujaribu kutafuta faili lisilokuwepo kwenye diski
 * (kuepuka makosa ya 404), na urambazaji (navigation) unafanya kazi 100% bila hitilafu.
 */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="alarms" element={<Alarms />} />
          <Route path="sounds" element={<SoundLibrary />} />
          <Route path="progress" element={<Productivity />} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        {/* Windhawk-Style Transparent Desktop Widget */}
        <Route path="widget" element={<DesktopWidget />} />
      </Routes>
    </HashRouter>
  );
}
