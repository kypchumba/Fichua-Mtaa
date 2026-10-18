import { Link } from "react-router-dom";

const services = [
  {
    title: "Roads and drainage",
    body: "Potholes, damaged roads, blocked drains and flooding concerns.",
    icon: "⌁",
  },
  {
    title: "Water supply",
    body: "Water interruptions, leaks, low pressure and quality concerns.",
    icon: "≈",
  },
  {
    title: "Waste collection",
    body: "Missed collection, illegal dumping and overflowing public bins.",
    icon: "▤",
  },
  {
    title: "Street lighting",
    body: "Streetlights that are damaged, unsafe or not working.",
    icon: "☼",
  },
  {
    title: "Other community services",
    body: "A local public service concern that does not fit another category.",
    icon: "＋",
  },
];
export default function Services() {
  return (
    <section className="page-wrap">
      <span className="eyebrow">PUBLIC SERVICES</span>
      <h1 className="page-title">Services in your community</h1>
      <p className="page-intro">
        Choose a service area to see what you can report. Every request gets a
        reference number you can use to follow up.
      </p>
      <div className="service-grid">
        {services.map((s) => (
          <article className="service-card" key={s.title}>
            <span className="service-icon">{s.icon}</span>
            <h2>{s.title}</h2>
            <p>{s.body}</p>
            <Link to="/requests/new">
              Report an issue <span>→</span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
