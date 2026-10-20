// Keep citizen-facing categories and examples in one source of truth.
export const SERVICE_CATEGORIES = [
  {
    category: "Waste Management",
    icon: "▤",
    examples: [
      "Uncollected garbage and overflowing bins",
      "Illegal dumping of waste",
      "Litter accumulating in public spaces",
    ],
  },
  {
    category: "Roads and Transport",
    icon: "⌁",
    examples: [
      "Potholes and damaged roads",
      "Damaged footpaths and unsafe crossings",
      "Faded road markings or damaged traffic signs",
    ],
  },
  {
    category: "Drainage and Flooding",
    icon: "≈",
    examples: [
      "Blocked drainage channels",
      "Flooding after rainfall",
      "Damaged drains and exposed manholes",
    ],
  },
  {
    category: "Street Lighting",
    icon: "☼",
    examples: [
      "Broken or non-functional streetlights",
      "Dark streets and public walkways",
      "Damaged lighting infrastructure",
    ],
  },
  {
    category: "Water and Sanitation",
    icon: "≈",
    examples: [
      "Leaking water pipes and broken public taps",
      "Sewage leaks and overflowing sewer lines",
      "Water pooling around damaged infrastructure",
    ],
  },
  {
    category: "Public Facilities",
    icon: "▦",
    examples: [
      "Damaged playgrounds, park benches and public toilets",
      "Neglected parks and public spaces",
      "Broken public amenities",
    ],
  },
  {
    category: "Public Safety Hazards",
    icon: "!",
    examples: [
      "Exposed electrical cables",
      "Dangerous open pits or uncovered manholes",
      "Unsafe public spaces and hazardous infrastructure",
    ],
  },
  {
    category: "Community Development",
    icon: "＋",
    examples: [
      "Abandoned or stalled public projects",
      "Overgrown vegetation obstructing public paths",
      "Damaged public signs and neglected infrastructure",
    ],
  },
];

// Historical values stay available for filtering old requests without rewriting them.
export const LEGACY_SERVICE_CATEGORIES = [
  "Roads and Drainage",
  "Water Supply",
  "Waste Collection",
  "Other",
];

export const HOME_SERVICE_PREVIEW = SERVICE_CATEGORIES.slice(0, 4);
