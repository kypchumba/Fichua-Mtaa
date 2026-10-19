import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user } = useAuth();

  return (
    <section className="page-wrap profile-page">
      <span className="eyebrow">ACCOUNT</span>
      <h1 className="page-title">Your profile</h1>
      <p className="page-intro">
        Account details associated with your Fichua Mtaa citizen profile.
      </p>

      <dl className="profile-details">
        <div>
          <dt>Full name</dt>
          <dd>{user.fullName}</dd>
        </div>
        <div>
          <dt>Email address</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Account type</dt>
          <dd>Citizen</dd>
        </div>
      </dl>

      <Link className="button button-outline" to="/dashboard">
        Return to dashboard
      </Link>
    </section>
  );
}
