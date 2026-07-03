// Component loading dùng khi đang gọi API.
function Loading({ text = "Loading data..." }) {
  return <div className="loading-box">⏳ {text}</div>;
}

export default Loading;
