import type { AssetLoadContext, AssetLoader, AssetLoaderRegistry } from './types';

export interface RetryOptions {
  readonly timeoutMs?: number;
  readonly retries?: number;
  readonly retryDelayMs?: number;
  readonly signal: AbortSignal;
  readonly wait?: (ms: number, signal: AbortSignal) => Promise<void>;
}

export class AssetTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Asset request for ${url} exceeded ${timeoutMs}ms`);
    this.name = 'AssetTimeoutError';
  }
}

export class AssetAbortError extends Error {
  constructor() {
    super('Asset request was cancelled');
    this.name = 'AssetAbortError';
  }
}

function defaultWait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new AssetAbortError());
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new AssetAbortError());
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Wraps one attempt with a timeout so a stalled connection cannot hold the
 * loader at 99% forever, and retries transient failures a bounded number of
 * times. Aborts are never retried.
 */
export async function withTimeoutAndRetry<T>(
  attempt: (signal: AbortSignal) => Promise<T>,
  url: string,
  options: RetryOptions,
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 12_000;
  const retries = Math.max(0, options.retries ?? 1);
  const retryDelayMs = options.retryDelayMs ?? 250;
  const wait = options.wait ?? defaultWait;

  let lastError: unknown = new AssetAbortError();

  for (let index = 0; index <= retries; index += 1) {
    if (options.signal.aborted) throw new AssetAbortError();

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await new Promise<T>((resolve, reject) => {
        timer = setTimeout(() => reject(new AssetTimeoutError(url, timeoutMs)), timeoutMs);
        attempt(options.signal).then(resolve, reject);
      });
    } catch (error) {
      lastError = error;
      if (options.signal.aborted || error instanceof AssetAbortError) {
        throw new AssetAbortError();
      }
      if (index === retries) break;
      await wait(retryDelayMs * (index + 1), options.signal);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export interface LoaderEnvironment {
  readonly fetch: typeof fetch;
  /** Supplied in the browser; omitted in Node so image loading stays testable. */
  readonly loadImage?: (url: string, signal: AbortSignal) => Promise<unknown>;
  readonly retry?: Omit<RetryOptions, 'signal'>;
}

function fetchLoader(
  environment: LoaderEnvironment,
  read: (response: Response) => Promise<unknown>,
): AssetLoader {
  return async ({ descriptor, signal }: AssetLoadContext) =>
    withTimeoutAndRetry(
      async (attemptSignal) => {
        const response = await environment.fetch(descriptor.url, { signal: attemptSignal });
        if (!response.ok) {
          throw new Error(`Asset ${descriptor.url} responded ${response.status}`);
        }
        return read(response);
      },
      descriptor.url,
      { ...environment.retry, signal },
    );
}

/**
 * One loader per asset type. Every loader honours the abort signal and returns
 * a value the runtime can hand to the owning scope.
 */
export function createLoaders(environment: LoaderEnvironment): AssetLoaderRegistry {
  const asText = fetchLoader(environment, (response) => response.text());
  const asJson = fetchLoader(environment, (response) => response.json());
  const asBlob = fetchLoader(environment, (response) => response.blob());

  const imageLoader: AssetLoader = async (context) => {
    if (environment.loadImage) {
      return withTimeoutAndRetry(
        (attemptSignal) => environment.loadImage!(context.descriptor.url, attemptSignal),
        context.descriptor.url,
        { ...environment.retry, signal: context.signal },
      );
    }
    return asBlob(context);
  };

  return {
    font: asBlob,
    image: imageLoader,
    'video-poster': imageLoader,
    texture: imageLoader,
    shader: asText,
    data: asJson,
    // Audio bytes are fetched here but never decoded or played without consent.
    audio: asBlob,
  };
}

/** Browser image decode that respects cancellation. */
export function createBrowserImageLoader() {
  return (url: string, signal: AbortSignal): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      const cleanup = () => {
        image.onload = null;
        image.onerror = null;
        signal.removeEventListener('abort', onAbort);
      };
      const onAbort = () => {
        cleanup();
        image.src = '';
        reject(new AssetAbortError());
      };

      image.onload = () => {
        cleanup();
        resolve(image);
      };
      image.onerror = () => {
        cleanup();
        reject(new Error(`Image ${url} failed to decode`));
      };
      signal.addEventListener('abort', onAbort, { once: true });
      image.decoding = 'async';
      image.src = url;
    });
}
