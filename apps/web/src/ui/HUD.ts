import { horizonDistance } from '@adventuremnc/shared';
import { RenderMetrics } from '../render/Renderer';

export class HUD {
  private container: HTMLElement;
  private posElement: HTMLElement;
  private altElement: HTMLElement;
  private horizonElement: HTMLElement;
  private perfElement: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'lunar-hud';
    this.container.innerHTML = `
      <div class="hud-panel hud-top-left">
        <div class="hud-header">MNC LUNAR RECON • SECTOR 04 (89.9°S)</div>
        <div class="hud-row" id="hud-pos">POS: 0m, 0m, 0m</div>
        <div class="hud-row" id="hud-alt">ALT: 0m AGL</div>
        <div class="hud-row" id="hud-horizon">HORIZON: 2.43 km</div>
        <div class="hud-row hud-dim">SUN ELEVATION: 1.8° | LUNAR ALBEDO: 0.12</div>
      </div>
      <div class="hud-crosshair">+</div>
      <div class="hud-panel hud-top-right">
        <div class="hud-header">SYSTEM PERFORMANCE</div>
        <div class="hud-row" id="hud-perf">FPS: -- | FT: -- ms</div>
        <div class="hud-row hud-dim" id="hud-mesh">DRAWS: -- | TRIS: --</div>
      </div>
      <div class="hud-footer">
        <span class="hud-key">CLICK TO LOOK</span> • 
        <span class="hud-key">W A S D</span> FLY • 
        <span class="hud-key">SPACE / C</span> ASCEND / DESCEND • 
        <span class="hud-key">SHIFT</span> TURBO
      </div>
    `;

    document.body.appendChild(this.container);

    this.posElement = document.getElementById('hud-pos')!;
    this.altElement = document.getElementById('hud-alt')!;
    this.horizonElement = document.getElementById('hud-horizon')!;
    this.perfElement = document.getElementById('hud-perf')!;
  }

  public update(
    x: number,
    y: number,
    z: number,
    groundY: number,
    fps: number,
    frameTimeMs: number,
    metrics: RenderMetrics
  ): void {
    const eyeHeight = Math.max(0.1, y - groundY);
    const horizon = horizonDistance(eyeHeight);

    this.posElement.textContent = `POS: X: ${x.toFixed(0)}m | Y: ${y.toFixed(0)}m | Z: ${z.toFixed(0)}m`;
    this.altElement.textContent = `ALT: ${eyeHeight.toFixed(1)}m AGL (Ground: ${groundY.toFixed(1)}m)`;
    this.horizonElement.textContent = `HORIZON: ${(horizon / 1000).toFixed(2)} km`;
    this.perfElement.textContent = `FPS: ${fps.toFixed(0)} | FT: ${frameTimeMs.toFixed(1)} ms`;

    const meshElem = document.getElementById('hud-mesh');
    if (meshElem) {
      meshElem.textContent = `DRAWS: ${metrics.drawCalls} | TRIS: ${(metrics.triangles / 1000).toFixed(1)}k`;
    }
  }
}
