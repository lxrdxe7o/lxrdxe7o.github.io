export interface ViewportSignalState {
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
  readonly orientation: 'portrait' | 'landscape';
}

export const DEFAULT_VIEWPORT: ViewportSignalState = Object.freeze({
  width: 1,
  height: 1,
  dpr: 1,
  orientation: 'landscape',
});

export class ViewportSignal {
  private state: ViewportSignalState = DEFAULT_VIEWPORT;

  set(width: number, height: number, dpr: number): boolean {
    const nextWidth = Math.max(1, Math.round(width));
    const nextHeight = Math.max(1, Math.round(height));
    const nextDpr = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;

    if (
      nextWidth === this.state.width &&
      nextHeight === this.state.height &&
      nextDpr === this.state.dpr
    ) {
      return false;
    }

    this.state = Object.freeze({
      width: nextWidth,
      height: nextHeight,
      dpr: nextDpr,
      orientation: nextHeight > nextWidth ? 'portrait' : 'landscape',
    });
    return true;
  }

  read(): ViewportSignalState {
    return this.state;
  }

  reset(): void {
    this.state = DEFAULT_VIEWPORT;
  }
}
