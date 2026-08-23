import React from "react";
import { Dropdown } from "react-bootstrap";

// Custom Toggle cho Dropdown dạng 3 chấm
const CustomToggle = React.forwardRef(({ onClick }, ref) => (
  <button
    ref={ref}
    type="button"
    className="btn btn-sm btn-light border-0 text-muted px-2 py-1"
    onClick={(e) => {
      e.preventDefault();
      onClick(e);
    }}
    style={{ borderRadius: "6px" }}
    title="Thao tác"
  >
    <i className="bi bi-three-dots-vertical fs-6"></i>
  </button>
));

/**
 * ActionMenu - Menu thao tác dạng 3 chấm sử dụng React-Bootstrap Dropdown
 */
function ActionMenu({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <Dropdown align="end" className="d-inline-block">
      <Dropdown.Toggle as={CustomToggle} id="action-dropdown-toggle" />
      <Dropdown.Menu className="shadow-sm border-0 py-1" style={{ minWidth: "150px" }}>
        {items.map((item, index) => {
          const isDanger = item.tone === "danger";
          return (
            <Dropdown.Item
              key={index}
              disabled={item.disabled}
              onClick={item.onClick}
              className={`d-flex align-items-center gap-2 py-2 px-3 small ${
                isDanger ? "text-danger" : "text-dark"
              }`}
            >
              {item.icon && <span>{item.icon}</span>}
              <span>{item.label}</span>
            </Dropdown.Item>
          );
        })}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default ActionMenu;
