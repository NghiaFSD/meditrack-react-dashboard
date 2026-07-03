// Component Input dùng chung cho các form.
function Input({ label, name, value, onChange, type = "text", placeholder = "", required = false }) {
  return (
    <div className="form-group">
      {label && <label htmlFor={name}>{label}</label>}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

export default Input;
