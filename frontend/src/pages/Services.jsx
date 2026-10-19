import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const services = [
  {
    title: "Roads and drainage",
    category: "Roads and Drainage",
    body: "Potholes, damaged roads, blocked drains and flooding concerns.",
    icon: "⌁",
  },
  {
    title: "Water supply",
    category: "Water Supply",
    body: "Water interruptions, leaks, low pressure and quality concerns.",
    icon: "≈",
  },
  {
    title: "Waste collection",
    category: "Waste Collection",
    body: "Missed collection, illegal dumping and overflowing public bins.",
    icon: "▤",
  },
  {
    title: "Street lighting",
    category: "Street Lighting",
    body: "Streetlights that are damaged, unsafe or not working.",
    icon: "☼",
  },
  {
    title: "Other community services",
    category: "Other",
    body: "A local public service concern that does not fit another category.",
    icon: "＋",
  },
];
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
        {services.map((service) => {
          const requestPath = `/requests/new?category=${encodeURIComponent(service.category)}`;
          const isAdmin = user?.role === "ADMIN";

          return (
            <Link
              className="service-card-link"
              key={service.title}
              to={isAdmin ? "/admin" : user ? requestPath : "/login"}
              state={{
                ...(!isAdmin && { from: "/services" }),
                ...(!user && { returnTo: requestPath }),
              }}
              aria-label={
                isAdmin
                  ? `Review ${service.title} requests`
                  : `Report ${service.title}`
              }
            >
              <article className="service-card">
                <span className="service-icon">{service.icon}</span>
                <h2>{service.title}</h2>
                <p>{service.body}</p>
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
