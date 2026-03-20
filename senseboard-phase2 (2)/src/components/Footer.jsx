import React from "react";

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="sb-footer mt-auto py-3 px-4">
      <div className="container-fluid d-flex align-items-center justify-content-between flex-wrap gap-2">
        <span className="sb-footer-text">
          <i className="bi bi-cpu me-1"></i>P.U.L.S.E &copy; {year}
        </span>
        <span className="sb-footer-status">
          <i className="bi bi-circle-fill sb-status-dot me-1"></i>
          All systems operational
        </span>
      </div>
    </footer>
  );
};

export default Footer;
