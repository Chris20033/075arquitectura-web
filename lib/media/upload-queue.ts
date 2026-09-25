export async function runWithConcurrency<T>(
  values: T[],
  concurrency: number,
  operation: (value: T, index: number) => Promise<void>,
) {
  let next = 0;
  async function worker() {
    while (next < values.length) {
      const index = next;
      next += 1;
      await operation(values[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, worker),
  );
}
