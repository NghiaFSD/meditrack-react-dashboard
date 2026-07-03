import { Link } from "react-router-dom";

function AccessDenied() {
  return (
    <div className="not-found">
      <h1>403</h1>
      <p>You do not have permission to access this page.</p>
      <Link className="btn btn-primary" to="/dashboard">Back to Dashboard</Link>
    </div>
  );
}

export default AccessDenied;
