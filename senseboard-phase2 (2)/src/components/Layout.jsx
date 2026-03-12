import React from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";

const Layout = ({ children, theme, onThemeToggle }) => {
  return (
    <div className="sb-layout">
      <Navbar theme={theme} onThemeToggle={onThemeToggle} />
      <main className="sb-main">{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
