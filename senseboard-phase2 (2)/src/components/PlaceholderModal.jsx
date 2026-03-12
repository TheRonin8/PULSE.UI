import React from "react";

const PlaceholderModal = ({ modalId, protocol }) => {
  return (
    <div className="modal fade" id={modalId} tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content sb-modal-content">
          <div className="modal-header sb-modal-header border-0">
            <h5 className="modal-title sb-modal-title">{protocol} Connection</h5>
            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div className="modal-body sb-modal-body text-center py-5">
            <i className="bi bi-tools sb-coming-soon-icon mb-3"></i>
            <h6 className="text-muted">Coming Soon</h6>
            <p className="text-muted small">{protocol} protocol support is under development.</p>
          </div>
          <div className="modal-footer sb-modal-footer border-0">
            <button className="btn sb-cancel-btn" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderModal;
