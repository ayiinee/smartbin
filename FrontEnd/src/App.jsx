import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import AIValidation from "./pages/AIValidation.jsx";
import SmartbinDetails from "./pages/SmartbinDetails.jsx";
import SmartbinDemo from "./pages/SmartbinDemo.jsx";
import SmartbinDemoTest from "./pages/SmartbinDemoTest.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import Login from "./auth/Login.jsx";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/ai-validation" element={<AIValidation />} />
        <Route path="/smartbin/:id" element={<SmartbinDetails />} />
        <Route path="/demo-smartbin" element={<SmartbinDemoTest />} />
        <Route path="/demo-smartbin/live" element={<SmartbinDemo />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
