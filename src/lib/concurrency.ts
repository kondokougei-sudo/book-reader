/** Runs `worker` over `items` with at most `limit` in flight at once. */
export async function mapWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let index = 0
  async function runNext(): Promise<void> {
    const i = index++
    if (i >= items.length) return
    await worker(items[i])
    await runNext()
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runNext))
}
