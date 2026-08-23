import React from "react";
import { Form, InputGroup } from "react-bootstrap";

/**
 * Component ô tìm kiếm sử dụng InputGroup của React-Bootstrap
 */
function SearchBox({ value, onChange, placeholder = "Search...", className = "" }) {
  return (
    <InputGroup className={className}>
      <InputGroup.Text className="bg-white border-end-0 text-muted">
        <i className="bi bi-search"></i>
      </InputGroup.Text>
      <Form.Control
        className="border-start-0 ps-0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </InputGroup>
  );
}

export default SearchBox;
