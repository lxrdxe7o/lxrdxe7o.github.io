/**
 * Runtime error boundary: classifies thrown errors into recoverable static,
 * retryable asset, unsupported-capability, or terminal states, then hands the
 * visitor a concise, non-technical recovery message.
 */

import type { RecoverableRuntimeError } from './types';

export type RuntimeErrorClass =
  | 'asset'
  | 'capability'
  | 'navigation'
  | 'unknown';

export interface ClassifiedError {
  readonly class: RuntimeErrorClass;
  readonly recoverable: boolean;
  readonly notice: string;
  readonly code: string;
}

const NOTICE_BY_CLASS: Readonly<Record<RuntimeErrorClass, string>> = {
  asset: 'Some content could not load. The rest of this page still works.',
  capability: 'This device is showing the simplified version of the page.',
  navigation: 'The page could not change right now. You can still use the links above.',
  unknown: 'Something went wrong. A simplified version of this page is available.',
};

const CODE_PATTERNS: ReadonlyArray<{ pattern: RegExp; class: RuntimeErrorClass }> = [
  { pattern: /asset|texture|shader|audio|font|fetch|network/i, class: 'asset' },
  { pattern: /webgl|context|gpu|unsupported/i, class: 'capability' },
  { pattern: /navigation|transition|route|history/i, class: 'navigation' },
];

export function classifyRuntimeError(error: unknown): ClassifiedError {
  const message = error instanceof Error ? error.message : String(error);
  for (const { pattern, class: errorClass } of CODE_PATTERNS) {
    if (pattern.test(message)) {
      return {
        class: errorClass,
        recoverable: errorClass !== 'unknown',
        notice: NOTICE_BY_CLASS[errorClass],
        code: `runtime-${errorClass}`,
      };
    }
  }
  return {
    class: 'unknown',
    recoverable: false,
    notice: NOTICE_BY_CLASS.unknown,
    code: 'runtime-unknown',
  };
}

export function toRecoverableError(error: unknown): RecoverableRuntimeError {
  const classified = classifyRuntimeError(error);
  return {
    code: classified.code,
    message: classified.notice,
  };
}

export class ErrorBoundary {
  private readonly errors: unknown[] = [];

  catch(error: unknown): ClassifiedError {
    this.errors.push(error);
    return classifyRuntimeError(error);
  }

  /** Local development detail; never rendered into the public page. */
  describe(): string[] {
    return this.errors.map((error) =>
      error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    );
  }

  clear(): void {
    this.errors.length = 0;
  }
}
