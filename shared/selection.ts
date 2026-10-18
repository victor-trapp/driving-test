import { shuffle, type Rng } from "./random";

export interface PoolQuestion {
  id: string;
  topicId: string;
  scenarioId?: string | null;
}

/**
 * Picks questions for a mock test.
 *
 * - Standard questions are spread across topics in proportion to how many
 *   questions each topic has, with at least one from every topic that has any.
 * - If a scenario (video-style) group of exactly `scenarioSize` questions is
 *   available it is placed as one contiguous block, like the real test.
 */
export function selectMockQuestions(
  pool: readonly PoolQuestion[],
  opts: { count: number; rng: Rng; includeScenario?: boolean; scenarioSize?: number },
): string[] {
  const { count, rng } = opts;
  const scenarioSize = opts.scenarioSize ?? 3;

  const groups = new Map<string, PoolQuestion[]>();
  const standard: PoolQuestion[] = [];
  for (const q of pool) {
    if (q.scenarioId) {
      const g = groups.get(q.scenarioId) ?? [];
      g.push(q);
      groups.set(q.scenarioId, g);
    } else {
      standard.push(q);
    }
  }

  let block: string[] = [];
  if (opts.includeScenario !== false) {
    const complete = [...groups.values()].filter((g) => g.length === scenarioSize);
    if (complete.length > 0 && count > scenarioSize) {
      const pick = complete[Math.floor(rng() * complete.length)];
      block = pick.map((q) => q.id).sort();
    }
  }

  const picked = spreadAcrossTopics(standard, count - block.length, rng);
  const ordered = shuffle(picked, rng);
  if (block.length > 0) {
    const at = Math.floor(rng() * (ordered.length + 1));
    ordered.splice(at, 0, ...block);
  }
  return ordered;
}

function spreadAcrossTopics(pool: readonly PoolQuestion[], count: number, rng: Rng): string[] {
  if (count <= 0) return [];
  if (pool.length <= count) return pool.map((q) => q.id);

  const byTopic = new Map<string, PoolQuestion[]>();
  for (const q of pool) {
    const list = byTopic.get(q.topicId) ?? [];
    list.push(q);
    byTopic.set(q.topicId, list);
  }
  const topics = [...byTopic.keys()].sort();

  // Largest-remainder allocation, with a floor of one per topic when there's room.
  const quota = new Map<string, number>();
  const minEach = topics.length <= count ? 1 : 0;
  let allocated = 0;
  const remainders: { topic: string; rem: number }[] = [];
  const spare = count - minEach * topics.length;
  for (const t of topics) {
    const size = byTopic.get(t)!.length;
    const exact = (size / pool.length) * spare;
    const base = Math.min(size, minEach + Math.floor(exact));
    quota.set(t, base);
    allocated += base;
    remainders.push({ topic: t, rem: exact - Math.floor(exact) });
  }
  remainders.sort((a, b) => b.rem - a.rem || (rng() < 0.5 ? -1 : 1));
  // Hand out the rest one at a time, largest remainder first, skipping topics that have run
  // out. Keep going until the count is met: with lopsided topic sizes that can take more than
  // a few passes. The pool is bigger than the count, so some topic always has room.
  let progressed = true;
  while (allocated < count && progressed) {
    progressed = false;
    for (const { topic: t } of remainders) {
      if (allocated >= count) break;
      if (quota.get(t)! < byTopic.get(t)!.length) {
        quota.set(t, quota.get(t)! + 1);
        allocated++;
        progressed = true;
      }
    }
  }

  const out: string[] = [];
  for (const t of topics) {
    out.push(...shuffle(byTopic.get(t)!, rng).slice(0, quota.get(t)).map((q) => q.id));
  }
  return out;
}

/**
 * Picks practice questions, favouring ones the learner has seen the least.
 * Within each "times seen" bucket the order is random.
 */
export function selectPracticeQuestions(
  pool: readonly PoolQuestion[],
  size: number,
  rng: Rng,
  seenCounts: ReadonlyMap<string, number> = new Map(),
): string[] {
  const buckets = new Map<number, PoolQuestion[]>();
  for (const q of pool) {
    const seen = seenCounts.get(q.id) ?? 0;
    const b = buckets.get(seen) ?? [];
    b.push(q);
    buckets.set(seen, b);
  }
  const ordered: string[] = [];
  for (const seen of [...buckets.keys()].sort((a, b) => a - b)) {
    ordered.push(...shuffle(buckets.get(seen)!, rng).map((q) => q.id));
    if (ordered.length >= size) break;
  }
  return shuffle(ordered.slice(0, size), rng);
}
