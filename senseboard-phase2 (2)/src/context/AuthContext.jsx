import React, { createContext, useState, useContext } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("sb_token"));
  const [username, setUsername] = useState(localStorage.getItem("sb_username") || "");

  const login = (t, user) => {
    localStorage.setItem("sb_token", t);
    localStorage.setItem("sb_username", user);
    setToken(t);
    setUsername(user);
  };

  const logout = () => {
    localStorage.removeItem("sb_token");
    localStorage.removeItem("sb_username");
    setToken(null);
    setUsername("");
  };

  return (
    <AuthContext.Provider value={{ token, username, login, logout, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
