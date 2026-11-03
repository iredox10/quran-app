import { describe, expect, it, vi } from 'vitest';
import { plannerPrefetchOrder, startPagePrefetch } from './pagePrefetch';

describe('planner page prefetch', () => {
  it('prioritizes neighbors and the assignment, covering every other page exactly once', () => {
    const order = plannerPrefetchOrder(5, 3, 8, 10);
    expect(order).toEqual([6, 4, 7, 8, 3, 1, 2, 9, 10]);
    expect(plannerPrefetchOrder(1, 1, 604)).toHaveLength(603);
    expect(new Set(plannerPrefetchOrder(604, 1, 604)).size).toBe(603);
    expect(plannerPrefetchOrder(0, 1, 604)).toEqual([]);
  });
  it('limits concurrency and starts adjacent pages first', async () => {
    let active = 0, peak = 0;
    const fetchPage = vi.fn(async () => {
      active++; peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 2));
      active--;
    });
    await startPagePrefetch({ pages: [6, 4, 7, 8], fetchPage }).done;
    expect(fetchPage.mock.calls.map(call => call[0])).toEqual([6, 4, 7, 8]);
    expect(peak).toBe(2);
  });
  it('stops starting background requests when the reader closes', async () => {
    let release;
    const fetchPage = vi.fn(() => new Promise(resolve => { release = resolve; }));
    const job = startPagePrefetch({ pages: [2, 3, 4], fetchPage, concurrency: 1 });
    expect(fetchPage).toHaveBeenCalledTimes(1);
    job.stop(); release(); await job.done;
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
  it('does not continue hammering an unavailable backend', async () => {
    const fetchPage = vi.fn(async () => { throw new Error('offline'); });
    await startPagePrefetch({ pages: [1, 2, 3, 4, 5, 6], fetchPage, concurrency: 1 }).done;
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });
});
