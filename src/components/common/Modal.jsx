import React from "react";
import { Modal as BsModal } from "react-bootstrap";

/**
 * Component Modal sử dụng React-Bootstrap Modal
 */
function Modal({ title, children, isOpen, onClose, size = "lg", centered = true, footer }) {
  return (
    <BsModal show={isOpen} onHide={onClose} size={size} centered={centered} backdrop="static">
      {title && (
        <BsModal.Header closeButton>
          <BsModal.Title as="h5" className="fw-bold">{title}</BsModal.Title>
        </BsModal.Header>
      )}
      <BsModal.Body>{children}</BsModal.Body>
      {footer && <BsModal.Footer>{footer}</BsModal.Footer>}
    </BsModal>
  );
}

export default Modal;
