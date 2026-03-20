import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "./assets/logo.png";
 
 
const Navbar = ({ theme, onThemeToggle }) => {
  const { isLoggedIn, logout, username } = useAuth();
  const navigate = useNavigate();
 
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
 
  return (
    <nav className="navbar navbar-expand-lg sb-navbar shadow-sm px-4">
      <NavLink className="navbar-brand d-flex align-items-center gap-2" to={isLoggedIn ? "/connection" : "/login"}>
        <div >
          <img src={logo} alt="Pulse Logo" height="45" />
 
        </div>
        <span className="sb-brand-text">P.U.L.S.E</span>
      </NavLink>
 
      <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span className="navbar-toggler-icon"></span>
      </button>
 
      <div className="collapse navbar-collapse" id="navbarNav">
        <ul className="navbar-nav ms-auto align-items-center gap-2">
          {isLoggedIn && (
            <>
             
              <li className="nav-item">
  <NavLink className="nav-link sb-nav-link" to="/setup">
    <i className="bi bi-gear me-1"></i> Setup
  </NavLink>
</li>
<li className="nav-item">
  <NavLink className="nav-link sb-nav-link" to="/connection">
    <i className="bi bi-plug me-1"></i> Connection
  </NavLink>
</li>
              <li className="nav-item">
                <NavLink className="nav-link sb-nav-link" to="/dashboard">
                  <i className="bi bi-speedometer2 me-1"></i> Dashboard
                </NavLink>
              </li>
            </>
          )}
         
          {isLoggedIn && (
            <>
              {/* <li className="nav-item">
                <span className="sb-username">
                  <i className="bi bi-person-circle me-1"></i>{username}
                </span>
              </li>
              <li className="nav-item">
                <button className="btn sb-logout-btn" onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right me-1"></i> Logout
                </button>
              </li> */}
              <li className="nav-item">
            <button className="btn sb-theme-btn" onClick={onThemeToggle} title="Toggle theme">
              <i className={`bi ${theme === "dark" ? "bi-sun-fill" : "bi-moon-fill"}`}></i>
            </button>
          </li>
            </>
           
          )}
        </ul>
      </div>
    </nav>
  );
};
 
export default Navbar;
 
 