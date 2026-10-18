import type { HcRef } from "@shared/types";
import type { Crossing } from "./types";
import { page, rule, rules } from "./hc";

// Pedestrian crossings in Great Britain, from the driver's side. Checked against the
// Highway Code on GOV.UK on 2026-10-18: rules 18 to 29 (pedestrians), 191 to 199
// (drivers at crossings), H2, 105, 210 and 215. Wording is our own; anything marked
// **must** is a legal requirement in the Highway Code.

export const CROSSINGS: Crossing[] = [
  {
    id: "zebra",
    name: "Zebra crossing",
    control: "Give way",
    users: "Pedestrians",
    spot: [
      "Black and white stripes across the road.",
      "Flashing yellow globes, called **Belisha beacons**, on black and white poles at each end.",
      "White zig-zag lines on the approaches and a broken give way line just before the stripes.",
      "No traffic lights for anyone.",
    ],
    driver: [
      "Look out for people waiting to cross and be ready to slow down or stop. You should give way to anyone waiting.",
      "You **must** give way once someone has stepped onto the crossing.",
      "Don't wave, flash your lights or use your horn to invite people across. Another vehicle might not stop for them.",
      "Be patient. Don't rev your engine or sound your horn, and allow more stopping distance on wet or icy roads.",
      "A zebra with an island in the middle is **two separate crossings**.",
    ],
    remember: "Nothing tells you to stop. It's up to you to spot people waiting and give way.",
    signs: ["w-zebra", "rm-zigzag"],
    refs: [rule(195), page("hierarchy"), rule(19), rule(20)],
  },
  {
    id: "parallel",
    name: "Parallel crossing",
    control: "Give way",
    users: "Pedestrians and cyclists",
    spot: [
      "Zebra stripes with a **cycle crossing right alongside**.",
      "The cycle side is edged with large white squares.",
      "Belisha beacons and zig-zag lines, the same as a zebra.",
    ],
    driver: [
      "You should give way to pedestrians **and cyclists** waiting to cross.",
      "You **must** give way once a pedestrian or cyclist has moved onto the crossing.",
      "Cyclists ride across and arrive faster than people on foot, often off a cycle track, so look further back along the pavement.",
      "Don't wave, flash or hoot anyone across, and be patient while they cross.",
      "One with an island in the middle is **two separate crossings**.",
    ],
    remember: "A zebra for cyclists too. They ride across, so expect them to arrive quickly.",
    signs: ["rm-zigzag"],
    refs: [rule(195), page("hierarchy")],
  },
  {
    id: "pelican",
    name: "Pelican crossing",
    aka: "PEdestrian LIght CONtrolled",
    control: "Traffic lights",
    users: "Pedestrians",
    spot: [
      "Traffic lights for drivers, and a push button for pedestrians.",
      "The red and green figures are on the **far side of the road**, facing the person waiting.",
      "Studs mark the edges of the crossing, with a stop line and zig-zags on each approach.",
    ],
    driver: [
      "You **must** stop when the red light shows.",
      "After red comes a **flashing amber**. You **must** give way to anyone still on the crossing, and you can go on with care once it's clear.",
      "If it goes straight across, it's **one crossing** even with an island in the middle, so wait for people coming from the far side too.",
      "If the two halves are staggered, they're separate crossings.",
    ],
    lights: "pelican",
    remember: "The only crossing with a flashing amber. Pedestrians see a flashing green figure at the same time.",
    signs: ["w-signals", "rm-zigzag"],
    refs: [...rules(196, 197), rule(22), rule(28)],
  },
  {
    id: "puffin",
    name: "Puffin crossing",
    aka: "Pedestrian User-Friendly INtelligent",
    control: "Traffic lights",
    users: "Pedestrians",
    spot: [
      "Traffic lights, but the red and green figures sit **above the push button**, on the same side as the person waiting.",
      "Sensors watch the kerb and the crossing itself.",
      "No flashing amber for drivers, and no flashing green figure.",
    ],
    driver: [
      "The lights work like ordinary traffic lights: red, red and amber, green, amber.",
      "The sensors keep your light on red until people have finished crossing, so someone slow holds the traffic for longer.",
      "Give way to anyone still crossing when your light turns green.",
    ],
    lights: "standard",
    remember: "No flashing amber. Red changes to red and amber, like any traffic lights.",
    signs: ["w-signals", "rm-zigzag"],
    refs: [...rules(199, 198), rule(23)],
  },
  {
    id: "toucan",
    name: "Toucan crossing",
    aka: "\"Two can\" cross",
    control: "Traffic lights",
    users: "Pedestrians and cyclists",
    spot: [
      "Traffic lights, with a **green cycle** next to the green figure.",
      "Wider than other crossings, and often joins up cycle tracks on each side.",
      "No flashing amber.",
    ],
    driver: [
      "Same light sequence as ordinary traffic lights.",
      "Cyclists are allowed to ride across, so they can arrive at speed and clear it quickly.",
      "Give way to anyone still crossing when your light turns green.",
    ],
    lights: "standard",
    remember: "Two can cross: pedestrians and cyclists share it, and cyclists can ride.",
    signs: ["w-signals", "rm-zigzag"],
    refs: [...rules(199, 198), rule(25)],
  },
  {
    id: "equestrian",
    name: "Equestrian crossing",
    aka: "Also called a Pegasus crossing",
    control: "Traffic lights",
    users: "Horse riders, often with a separate crossing alongside for pedestrians and cyclists",
    spot: [
      "Traffic lights, with a **horse and rider** figure in the signals.",
      "A push button mounted **high up**, so riders can press it from the saddle.",
      "Pavement barriers and a wider crossing space.",
    ],
    driver: [
      "Same light sequence as ordinary traffic lights.",
      "Horses can be startled. Don't rev your engine, sound your horn or pull away quickly.",
      "When you pass a horse afterwards, slow to 10 mph or less and leave at least 2 metres.",
    ],
    lights: "standard",
    remember: "Look for the high button and the horse and rider figure.",
    signs: ["w-horses", "w-signals"],
    refs: [rule(199), rule(27), rule(215)],
  },
  {
    id: "school-patrol",
    name: "School crossing patrol",
    aka: "Often called a lollipop person",
    control: "School patrol",
    users: "Children and other pedestrians, usually near schools",
    spot: [
      "A patrol in a high-visibility coat holding a **'Stop for children'** sign on a pole.",
      "A warning sign for children ahead, sometimes with two flashing amber lights when a patrol is working.",
      "Often yellow 'School keep clear' zig-zags outside the school gates.",
    ],
    driver: [
      "You **must** stop when the patrol shows the 'Stop for children' sign.",
      "Stay stopped until the children and the patrol are back off the road.",
      "Near schools, drive slowly and watch for children stepping out between parked cars.",
    ],
    remember: "The sign is an instruction, not a request. It's as binding as a police officer's signal.",
    signs: ["w-children", "rm-school-keep-clear"],
    refs: [rule(210), rule(105), rule(29)],
  },
];

/** Rules that apply at every kind of crossing. */
export const CROSSING_RULES: { text: string; ref: HcRef }[] = [
  { text: "You **must not** park on a crossing or on the zig-zag lines either side of it.", ref: rule(191) },
  { text: "You **must not** overtake the moving vehicle nearest the crossing, or the vehicle nearest it that has stopped to let people cross.", ref: rule(191) },
  { text: "In slow or queuing traffic, keep the crossing clear. Don't go onto it unless you can get all the way across.", ref: rule(192) },
  { text: "Take extra care when queuing traffic or parked vehicles block your view. People may be crossing between them.", ref: rule(193) },
  { text: "Give people plenty of time to cross. Don't rev your engine or edge forward.", ref: rule(194) },
  { text: "Give way to anyone still crossing after your light has turned green.", ref: rule(198) },
  { text: "If a signal-controlled crossing isn't working, go on with extreme caution.", ref: rule(199) },
];

/** What each light means to a driver, in the order they come. */
export const LIGHT_SEQUENCES = {
  pelican: [
    { lamps: ["red"], meaning: "Stop." },
    { lamps: ["amber-flashing"], meaning: "Give way to anyone on the crossing. Go on with care once it's clear." },
    { lamps: ["green"], meaning: "Go, if the crossing is clear." },
    { lamps: ["amber"], meaning: "Stop, unless you're too close to stop safely." },
  ],
  standard: [
    { lamps: ["red"], meaning: "Stop." },
    { lamps: ["red", "amber"], meaning: "Still stop. Don't go until green." },
    { lamps: ["green"], meaning: "Go, if the crossing is clear." },
    { lamps: ["amber"], meaning: "Stop, unless you're too close to stop safely." },
  ],
} as const;
