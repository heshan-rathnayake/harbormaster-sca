export function withTimeout<T>(
  work: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
    timer.unref();
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}
