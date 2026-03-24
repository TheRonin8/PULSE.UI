import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useMqtt } from "./hooks/useMQTT";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Connection from "./pages/Connection";
import Setup from "./pages/setup";

import Sensor from "./pages/Sensor";
import Dashboard from "./pages/Dashboard";

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
            <Route path="/login" element={<Login />} />
            <Route path="/connection" element={<Connection />} />
            
            <Route path="/sensor" element={<ProtectedRoute><Sensor /></ProtectedRoute>} />
            <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/setup" element={<ProtectedRoute><Setup /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Layout>
      </Router>
    
</AuthProvider>
  );
}

export default App;
