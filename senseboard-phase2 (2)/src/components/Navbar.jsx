import React, { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "./assets/logo.png";
import { logoutUser } from "../api/authapi";

const Navbar = ({ theme, onThemeToggle }) => {
  const { isLoggedIn, logout, username } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfile, setShowProfile] = useState(false);

  const isLoginPage = location.pathname === "/login";

 const handleLogout = async () => {
  try { await logoutUser(); } catch {}
  localStorage.removeItem("sb_access_token");
  localStorage.removeItem("sb_refresh_token");
  localStorage.removeItem("sb_connectionId");
  logout();
  // ✅ Toast before navigate
  const toast = document.createElement("div");
  toast.innerText = "✅ Logged out successfully!";
  toast.style.cssText = `
    position:fixed; top:20px; right:20px; z-index:99999;
    background:#00c6ae; color:#fff; padding:12px 24px;
    border-radius:10px; font-weight:600; box-shadow:0 4px 12px rgba(0,0,0,0.15);
  `;
  document.body.appendChild(toast);
  setTimeout(() => { document.body.removeChild(toast); navigate("/login"); }, 1500);
};

  return (
    <nav className="navbar navbar-expand-lg sb-navbar shadow-sm px-4">
      <NavLink className="navbar-brand d-flex align-items-center gap-2" to={isLoggedIn ? "/connection" : "/login"}>
        <img src={logo} alt="Pulse Logo" height="45" />
        <span className="sb-brand-text">P.U.L.S.E</span>
      </NavLink>

      <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span className="navbar-toggler-icon"></span>
      </button>

      <div className="collapse navbar-collapse" id="navbarNav">
        <ul className="navbar-nav ms-auto align-items-center gap-2">

          {isLoggedIn && !isLoginPage && (
            <>
              <li className="nav-item">
                <NavLink className="nav-link sb-nav-link" to="/setup">
                  <i className="bi bi-gear me-1"></i>Setup
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link sb-nav-link" to="/connection">
                  <i className="bi bi-plug me-1"></i>Connection
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link sb-nav-link" to="/dashboard">
                  <i className="bi bi-speedometer2 me-1"></i>Dashboard
                </NavLink>
              </li>

              <li className="nav-item">
                <button className="btn sb-theme-btn" onClick={onThemeToggle} title="Toggle theme">
                  <i className={`bi ${theme === "dark" ? "bi-sun-fill" : "bi-moon-fill"}`}></i>
                </button>
              </li>

              {/* Profile hover dropdown */}
              <li className="nav-item position-relative"
                onMouseEnter={() => setShowProfile(true)}
                onMouseLeave={() => setShowProfile(false)}>

                <div className="d-flex align-items-center gap-2" style={{
                  cursor: "pointer", padding: "6px 12px", borderRadius: "50px",
                  backgroundColor: "var(--sb-light-bg)", border: "1px solid var(--sb-border)"
                }}>
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "50%",
                    backgroundColor: "var(--sb-accent)", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    color: "#fff", fontWeight: 700, fontSize: "0.9rem"
                  }}>
                    {username?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--sb-text)" }}>
                    {username || "User"}
                  </span>
                  <i className="bi bi-chevron-down" style={{ fontSize: "0.75rem", color: "var(--sb-muted)" }}></i>
                </div>

                {showProfile && (
                  <div style={{
                    position: "absolute", top: "100%", right: 0, minWidth: "200px",
                    backgroundColor: "var(--sb-white)", border: "1px solid var(--sb-border)",
                    borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    zIndex: 9999, padding: "8px", marginTop: "4px"
                  }}>
                    <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--sb-border)", marginBottom: "6px" }}>
                      <div style={{ fontWeight: 700, color: "var(--sb-text)", fontSize: "0.9rem" }}>
                        {username || "User"}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--sb-muted)" }}>Logged in</div>
                    </div>

                    <button onClick={handleLogout}
                      className="btn w-100 d-flex align-items-center gap-2"
                      style={{ color: "#e74c3c", fontWeight: 600, fontSize: "0.88rem", padding: "8px 12px", borderRadius: "8px", border: "none", backgroundColor: "transparent" }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "#fef2f2"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                      <i className="bi bi-box-arrow-right"></i> Logout
                    </button>
                  </div>
                )}
              </li>
            </>
          )}

        </ul>
      </div>
    </nav>
  );
};

export default Navbar;