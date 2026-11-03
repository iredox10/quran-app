/** Order the planner's nearby pages first, then its assignment, then the rest of the mushaf. */
export function plannerPrefetchOrder(current, start, end, total = 604) {
  if (!Number.isInteger(current) || current < 1 || current > total) return [];
  const seen = new Set([current]);
  const ordered = [];
  const add = page => {
    if (page >= 1 && page <= total && !seen.has(page)) { seen.add(page); ordered.push(page); }
  };
  add(current + 1);
  add(current - 1);
  const first = Math.max(1, Number.isFinite(start) ? start : 1);
  const last = Math.min(total, Number.isFinite(end) ? end : total);
  for (let page = Math.max(current + 2, first); page <= last; page++) add(page);
  for (let page = Math.min(current - 2, last); page >= first; page--) add(page);
  for (let page = 1; page <= total; page++) add(page);
  return ordered;
}

/** Bounded worker pool. Stopping it never cancels an active reader request. */
export function startPagePrefetch({ pages, fetchPage, concurrency = 2, canContinue = () => true }) {
  let stopped = false, index = 0, consecutiveFailures = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(2, concurrency)) }, async () => {
    while (!stopped && index < pages.length && canContinue()) {
      const page = pages[index++];
      try {
        await fetchPage(page);
        consecutiveFailures = 0;
      } catch {
        // Stop repeated failing requests; a new reader visit or online event retries.
        if (++consecutiveFailures >= 3) stopped = true;
      }
    }
  });
  return { stop: () => { stopped = true; }, done: Promise.all(workers) };
}
