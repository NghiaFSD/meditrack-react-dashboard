import React from "react";
import { Button as BsButton } from "react-bootstrap";

/**
 * Component Button sử dụng React-Bootstrap để giao diện đồng nhất
 */
function Button({
  children,
  type = "button",
  variant = "primary",
  size,
  onClick,
  disabled = false,
  className = "",
  style,
  ...rest
}) {
  return (
    <BsButton
      type={type}
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={style}
      {...rest}
    >
      {children}
    </BsButton>
  );
}

export default Button;
