import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import SmartbinDemo from "./pages/SmartbinDemo.jsx";
import SmartbinDemoTest from "./pages/SmartbinDemoTest.jsx";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/demo-smartbin" replace />} />
        <Route path="/demo-smartbin" element={<SmartbinDemoTest />} />
        <Route path="/demo-smartbin/live" element={<SmartbinDemo />} />
        <Route path="*" element={<Navigate to="/demo-smartbin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
