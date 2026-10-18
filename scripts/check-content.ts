// Sanity checks for the bundled content. Run with `npm run content:check`.
// Pass --links to also check that every external URL responds (needs network).
import { HAZARD_CLIPS, SEED_QUESTIONS, SIGNS, TOPICS } from "../content/index";
import { TOPIC_IDS } from "../shared/types";
import { existsSync } from "node:fs";

const ILLUSTRATIONS = new Set([
  "roundabout-lanes", "junction-priority", "stopping-distances", "following-distance", "pedestrian-crossings",
  "overtaking", "motorway-lanes", "blind-spots", "motorway-studs", "box-junction", "parking-hill", "hazard-types",
]);

const errors: string[] = [];
const err = (m: string) => errors.push(m);

// Topics
if (TOPICS.length !== TOPIC_IDS.length) err(`expected ${TOPIC_IDS.length} topics, got ${TOPICS.length}`);
const lessonIds = new Set<string>();
for (const t of TOPICS) {
  if (!TOPIC_IDS.includes(t.id)) err(`unknown topic id ${t.id}`);
  for (const l of t.lessons) {
    if (lessonIds.has(l.id)) err(`duplicate lesson id ${l.id}`);
    lessonIds.add(l.id);
    for (const b of l.blocks) {
      if (b.t === "figure" && !ILLUSTRATIONS.has(b.id)) err(`${l.id}: unknown illustration ${b.id}`);
      if (b.t === "signs") for (const s of b.ids) if (!SIGNS.some((x) => x.id === s)) err(`${l.id}: unknown sign ${s}`);
      if (b.t === "check" && (b.answer < 0 || b.answer >= b.options.length)) err(`${l.id}: bad check answer`);
    }
  }
}

// Signs
const signIds = new Set<string>();
for (const s of SIGNS) {
  if (signIds.has(s.id)) err(`duplicate sign id ${s.id}`);
  signIds.add(s.id);
  if (s.image.kind === "dft" && !existsSync(`client/public/signs/${s.image.file}.webp`)) err(`missing sign image ${s.image.file}.webp`);
}

// Questions
const qIds = new Set<string>();
const scenarioGroups = new Map<string, number>();
for (const q of SEED_QUESTIONS) {
  if (qIds.has(q.id)) err(`duplicate question id ${q.id}`);
  qIds.add(q.id);
  if (q.options.length < 2) err(`${q.id}: fewer than 2 options`);
  if (new Set(q.options).size !== q.options.length) err(`${q.id}: duplicate options`);
  if (q.correct.some((c) => c < 0 || c >= q.options.length)) err(`${q.id}: correct index out of range`);
  if (q.image?.kind === "sign" && !signIds.has(q.image.ref)) err(`${q.id}: unknown sign ${q.image.ref}`);
  if (q.image?.kind === "illustration" && !ILLUSTRATIONS.has(q.image.ref)) err(`${q.id}: unknown illustration ${q.image.ref}`);
  for (const h of q.hc) if (!h.url.startsWith("https://")) err(`${q.id}: bad reference url ${h.url}`);
  if (q.scenarioId) {
    if (!HAZARD_CLIPS.some((c) => c.id === q.scenarioId)) err(`${q.id}: unknown scenario ${q.scenarioId}`);
    scenarioGroups.set(q.scenarioId, (scenarioGroups.get(q.scenarioId) ?? 0) + 1);
  }
}
for (const [id, n] of scenarioGroups) if (n !== 3) err(`scenario ${id} has ${n} questions, expected 3`);

// Hazard clips
for (const c of HAZARD_CLIPS) {
  for (const h of c.hazards) {
    if (h.startMs >= h.endMs) err(`${c.id}/${h.id}: empty window`);
    if (h.endMs > c.durationMs) err(`${c.id}/${h.id}: window beyond clip end`);
  }
}

const byTopic = new Map<string, number>();
for (const q of SEED_QUESTIONS) byTopic.set(q.topic, (byTopic.get(q.topic) ?? 0) + 1);
console.log(`topics: ${TOPICS.length}, lessons: ${lessonIds.size}, questions: ${SEED_QUESTIONS.length}, signs: ${SIGNS.length}, clips: ${HAZARD_CLIPS.length}`);
for (const t of TOPICS) console.log(`  ${String(byTopic.get(t.id) ?? 0).padStart(3)}  ${t.title}`);

if (process.argv.includes("--links")) {
  const urls = new Set<string>();
  for (const q of SEED_QUESTIONS) {
    urls.add(q.sourceUrl.split("#")[0]);
    q.hc.forEach((h) => urls.add(h.url.split("#")[0]));
  }
  for (const t of TOPICS) for (const l of t.lessons) {
    l.refs.forEach((r) => urls.add(r.url.split("#")[0]));
    for (const b of l.blocks) if (b.t === "rule" && b.ref) urls.add(b.ref.url.split("#")[0]);
  }
  for (const s of SIGNS) if (s.hc) urls.add(s.hc.url.split("#")[0]);
  console.log(`checking ${urls.size} links...`);
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: "GET", redirect: "follow" });
      if (!res.ok) err(`link ${res.status}: ${url}`);
    } catch (e) {
      err(`link failed: ${url} (${(e as Error).message})`);
    }
  }
}

if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("content ok");
