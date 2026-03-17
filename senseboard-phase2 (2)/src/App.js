import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Connection from "./pages/Connection";

import Sensor from "./pages/Sensor";
import Dashboard from "./pages/Dashboard";
import Setup from "./pages/Setup";
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
      <Router>
        <Layout theme={theme} onThemeToggle={toggleTheme}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/connection" element={<ProtectedRoute><Connection /></ProtectedRoute>} />
            
            <Route path="/sensor" element={<ProtectedRoute><Sensor /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/setup" element={<ProtectedRoute><Setup /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
