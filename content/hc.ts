import type { HcRef } from "@shared/types";

// Highway Code sections on GOV.UK. Rule anchors use the form #rule126.
// Section paths checked against https://www.gov.uk/guidance/the-highway-code on 2026-10-18
// (last updated there 22 October 2025).
const BASE = "https://www.gov.uk/guidance/the-highway-code";

const SECTIONS: [from: number, to: number, slug: string][] = [
  [1, 35, "rules-for-pedestrians-1-to-35"],
  [36, 46, "rules-for-users-of-powered-wheelchairs-and-mobility-scooters-36-to-46"],
  [47, 58, "rules-about-animals-47-to-58"],
  [59, 82, "rules-for-cyclists-59-to-82"],
  [83, 88, "rules-for-motorcyclists-83-to-88"],
  [89, 102, "rules-for-drivers-and-motorcyclists-89-to-102"],
  [103, 158, "general-rules-techniques-and-advice-for-all-drivers-and-riders-103-to-158"],
  [159, 203, "using-the-road-159-to-203"],
  [204, 225, "road-users-requiring-extra-care-204-to-225"],
  [226, 237, "driving-in-adverse-weather-conditions-226-to-237"],
  [238, 252, "waiting-and-parking-238-to-252"],
  [253, 273, "motorways-253-to-273"],
  [274, 287, "breakdowns-and-incidents-274-to-287"],
  [288, 307, "road-works-level-crossings-and-tramways-288-to-307"],
];

export function rule(n: number): HcRef {
  const section = SECTIONS.find(([from, to]) => n >= from && n <= to);
  if (!section) throw new Error(`No Highway Code section for rule ${n}`);
  return { label: `Highway Code rule ${n}`, url: `${BASE}/${section[2]}#rule${n}` };
}

export function rules(...ns: number[]): HcRef[] {
  return ns.map(rule);
}

const PAGES = {
  hierarchy: ["introduction", "Highway Code: hierarchy of road users (H1 to H3)"],
  lights: ["light-signals-controlling-traffic", "Highway Code: light signals controlling traffic"],
  signals: ["signals-to-other-road-users", "Highway Code: signals to other road users"],
  authorised: ["signals-by-authorised-persons", "Highway Code: signals by authorised persons"],
  signs: ["traffic-signs", "Highway Code: traffic signs"],
  markings: ["road-markings", "Highway Code: road markings"],
  vehicleMarkings: ["vehicle-markings", "Highway Code: vehicle markings"],
  documents: ["annex-3-motor-vehicle-documentation-and-learner-driver-requirements", "Highway Code Annex 3: documents and learner requirements"],
  law: ["annex-4-the-road-user-and-the-law", "Highway Code Annex 4: the road user and the law"],
  penalties: ["annex-5-penalties", "Highway Code Annex 5: penalties"],
  maintenance: ["annex-6-vehicle-maintenance-safety-and-security", "Highway Code Annex 6: vehicle maintenance, safety and security"],
  firstAid: ["annex-7-first-aid-on-the-road", "Highway Code Annex 7: first aid on the road"],
  newDrivers: ["annex-8-safety-code-for-new-drivers", "Highway Code Annex 8: safety code for new drivers"],
} as const;

export function page(key: keyof typeof PAGES): HcRef {
  const [slug, label] = PAGES[key];
  return { label, url: `${BASE}/${slug}` };
}

export const GOV = {
  theoryTest: "https://www.gov.uk/theory-test",
  mcq: "https://www.gov.uk/theory-test/multiple-choice-questions",
  hazardTest: "https://www.gov.uk/theory-test/hazard-perception-test",
  passMark: "https://www.gov.uk/theory-test/pass-mark-and-result",
  highwayCode: BASE,
  kyts: "https://www.gov.uk/government/publications/know-your-traffic-signs",
  signImages: "https://www.gov.uk/guidance/traffic-sign-images",
  revisionProducts: "https://www.gov.uk/guidance/make-and-sell-driving-theory-test-revision-products",
  ogl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
  stoppingDistances: "https://www.gov.uk/guidance/the-highway-code/general-rules-techniques-and-advice-for-all-drivers-and-riders-103-to-158#rule126",
  newDrivers: "https://www.gov.uk/new-driver-penalty-points",
  mot: "https://www.gov.uk/getting-an-mot",
  vehicleTax: "https://www.gov.uk/vehicle-tax",
  sorn: "https://www.gov.uk/make-a-sorn",
  insurance: "https://www.gov.uk/vehicle-insurance",
  towing: "https://www.gov.uk/towing-with-car",
  phones: "https://www.gov.uk/using-mobile-phones-when-driving-the-law",
  drinkDrive: "https://www.gov.uk/drink-drive-limit",
  childSeats: "https://www.gov.uk/child-car-seats-the-rules",
  eyesight: "https://www.gov.uk/driving-eyesight-rules",
  supervising: "https://www.gov.uk/driving-lessons-learning-to-drive/practising-with-family-or-friends",
  learnerMotorways: "https://www.gov.uk/driving-lessons-learning-to-drive/motorway-lessons",
  smartMotorways: "https://nationalhighways.co.uk/road-safety/smart-motorways-stopping-in-an-emergency/",
  wales20: "https://www.gov.wales/introducing-default-20mph-speed-limits",
  changeAddress: "https://www.gov.uk/change-address-driving-licence",
  tyres: "https://www.gov.uk/government/publications/how-to-check-your-tyres",
} as const;
