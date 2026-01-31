import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import AnalyticsReports from "./pages/AnalyticsReports.jsx";
import SmartbinDemo from "./pages/SmartbinDemo.jsx";
import SmartbinDemoTest from "./pages/SmartbinDemoTest.jsx";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analytics-reports" element={<AnalyticsReports />} />
        <Route path="/demo-smartbin" element={<SmartbinDemoTest />} />
        <Route path="/demo-smartbin/live" element={<SmartbinDemo />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
