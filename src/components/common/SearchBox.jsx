// Component ô tìm kiếm dùng ở nhiều trang.
function SearchBox({ value, onChange, placeholder = "Search..." }) {
  return (
    <div className="search-box">
      <span>🔎</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export default SearchBox;
