export class CarouselController {
  private activeIndex: number = 0;
  private totalItems: number;

  constructor(total: number) {
    this.totalItems = total;
  }

  public handleScrollProgress(delta: number): void {
    // Arbitrary threshold for slide change
    if (delta > 5) {
      this.activeIndex = Math.min(this.activeIndex + 1, this.totalItems - 1);
    } else if (delta < -5) {
      this.activeIndex = Math.max(this.activeIndex - 1, 0);
    }
  }

  public getActiveIndex(): number {
    return this.activeIndex;
  }
}
