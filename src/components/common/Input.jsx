import React from "react";
import { Form } from "react-bootstrap";

/**
 * Component Input sử dụng Form.Group và Form.Control của React-Bootstrap
 */
function Input({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  as,
  rows,
  children,
  disabled = false,
  className = "",
  error,
}) {
  return (
    <Form.Group className={`mb-3 ${className}`} controlId={name}>
      {label && <Form.Label className="fw-semibold">{label}</Form.Label>}
      <Form.Control
        as={as}
        rows={rows}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        isInvalid={!!error}
      >
        {children}
      </Form.Control>
      {error && <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>}
    </Form.Group>
  );
}

export default Input;
