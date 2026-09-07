import { FIXED_DT } from '@adventuremnc/shared';

export interface GameLoopCallbacks {
  stepSimulation: (dt: number) => void;
  render: (alpha: number) => void;
}

export class FixedTimestepLoop {
  private accumulator = 0;
  private readonly maxDeltaTime = 0.25;

  constructor(private readonly callbacks: GameLoopCallbacks) {}

  public update(deltaTime: number): void {
    // Clamp to prevent spiral of death during severe frame drop
    this.accumulator += Math.min(deltaTime, this.maxDeltaTime);

    while (this.accumulator >= FIXED_DT) {
      this.callbacks.stepSimulation(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }

    const alpha = this.accumulator / FIXED_DT;
    this.callbacks.render(alpha);
  }

  public getAccumulator(): number {
    return this.accumulator;
  }

  public reset(): void {
    this.accumulator = 0;
  }
}
