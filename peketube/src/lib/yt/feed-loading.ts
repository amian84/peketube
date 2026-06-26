import { LOAD_TIMEOUT_MESSAGE } from "@/lib/loading/timeouts";

export { LOAD_TIMEOUT_MESSAGE as HOME_FEED_TIMEOUT_MESSAGE };

export class FeedLoadTimeoutError extends Error {
  constructor() {
    super("FEED_LOAD_TIMEOUT");
    this.name = "FeedLoadTimeoutError";
  }
}

export function withFeedLoadTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new FeedLoadTimeoutError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
