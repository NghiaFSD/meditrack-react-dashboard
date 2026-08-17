import React, { useState, useRef, useEffect } from "react";

/**
 * ActionMenu - Menu thao tác dạng 3 chấm dọc (⋮) với dropdown popup
 * Tự động đóng khi click ra ngoài (Click Outside)
 */
function ActionMenu({ items = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Lắng nghe sự kiện click ngoài menu để tự động đóng dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!items || items.length === 0) return null;

  return (
    <div className="action-menu-container" ref={menuRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        className="action-dots-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Thao tác"
        aria-label="Thao tác"
      >
        &#8942;
      </button>

      {isOpen && (
        <div className="action-dropdown-menu">
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              className={`action-dropdown-item ${item.tone || ""}`}
              disabled={item.disabled}
              onClick={() => {
                setIsOpen(false);
                if (item.onClick) item.onClick();
              }}
            >
              {item.icon && <span className="action-item-icon">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ActionMenu;
