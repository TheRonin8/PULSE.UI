import React, { createContext, useState, useContext } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("sb_access_token"));
const [username, setUsername] = useState(localStorage.getItem("sb_username") || "");
const [refreshToken] = useState(localStorage.getItem("sb_refreshToken"));
const [userId] = useState(localStorage.getItem("sb_userId"));

  const login = (t, user) => {
    localStorage.setItem("sb_access_token", t);
    localStorage.setItem("sb_username", user);
    setToken(t);
    setUsername(user);
  };

 const logout = () => {
    localStorage.removeItem("sb_acccess_token");
    localStorage.removeItem("sb_username");
    localStorage.removeItem("sb_refreshToken");
    localStorage.removeItem("sb_userId");
    localStorage.removeItem("sb_connectionId");
    localStorage.removeItem("sensorId");
    setToken(null);
    setUsername("");
  };

 return (
    <AuthContext.Provider value={{ token, username, refreshToken, userId, login, logout, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
