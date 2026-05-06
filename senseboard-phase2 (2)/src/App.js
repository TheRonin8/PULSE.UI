import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import KPIManagement from "./pages/KPIManagement";
import Sensor from "./pages/Sensor";
import Dashboard from "./pages/Dashboard";
import  Configuration from "./pages/Configuration";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./App.css";

function App() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Layout theme={theme} onThemeToggle={toggleTheme}>
          <Routes>
            <Route path="/login"         element={<Login />} />
            <Route path="/dashboard"     element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            {/* FIX: route is /sensors (plural) to match Navbar NavLink */}
            <Route path="/sensors"       element={<ProtectedRoute><Sensor /></ProtectedRoute>} />
            <Route path="/KPIManagement" element={<ProtectedRoute><KPIManagement /></ProtectedRoute>} />
           <Route path="/Configuration"    element={<ProtectedRoute><Configuration /></ProtectedRoute>} />

            {/* Default: go to dashboard if logged in, otherwise login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
