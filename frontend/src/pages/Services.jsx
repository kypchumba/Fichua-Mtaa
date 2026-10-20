import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SERVICE_CATEGORIES } from "../data/services";

export default function Services() {
  const { user } = useAuth();

  return (
    <section className="page-wrap">
      <span className="eyebrow">PUBLIC SERVICES</span>
      <h1 className="page-title">Services in your community</h1>
      <p className="page-intro">
        Choose a service area to see what you can report. Every request gets a
        reference number you can use to follow up.
      </p>
      <div className="service-grid">
        {SERVICE_CATEGORIES.map((service, index) => {
          const requestPath = `/requests/new?category=${encodeURIComponent(service.category)}`;
          const isAdmin = user?.role === "ADMIN";

          return (
            <Link
              className="service-card-link"
              key={service.category}
              to={isAdmin ? "/admin" : user ? requestPath : "/login"}
              state={{
                ...(!isAdmin && { from: "/services" }),
                ...(!user && { returnTo: requestPath }),
              }}
              aria-label={
                isAdmin
                  ? `Review ${service.category} requests`
                  : `Report ${service.category}`
              }
            >
              <article className="service-card">
                <span className={`service-icon symbol-${index % 4}`} aria-hidden="true">
                  {service.icon}
                </span>
                <h2>{service.category}</h2>
                <ul className="service-examples">
                  {service.examples.map((example) => (
                    <li key={example}>{example}</li>
                  ))}
                </ul>
                <span className="service-card-action">
                  {isAdmin ? "Review service requests" : "Report this service"}{" "}
                  <span aria-hidden="true">→</span>
                </span>
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
