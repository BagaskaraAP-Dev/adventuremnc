import { horizonDistance } from '@adventuremnc/shared';
import { RenderMetrics } from '../render/Renderer';

export interface HudTelemetryData {
  x: number;
  y: number;
  z: number;
  groundY: number;
  fps: number;
  frameTimeMs: number;
  metrics: RenderMetrics;
  health: number;
  isDead: boolean;
  jumpApex: number;
  lastImpactSpeed: number;
  mode: 'EVA_ASTRONAUT' | 'ROVER_DRIVING' | 'FLY_CAMERA';
  roverSpeed?: number;
  canInteractRover?: boolean;
}

export class HUD {
  private container: HTMLElement;
  private posElement: HTMLElement;
  private altElement: HTMLElement;
  private horizonElement: HTMLElement;
  private perfElement: HTMLElement;
  private suitElement: HTMLElement;
  private dynamicsElement: HTMLElement;
  private breachElement: HTMLElement;
  private promptElement: HTMLElement;
  private footerElement: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'lunar-hud';
    this.container.innerHTML = `
      <div class="hud-panel hud-top-left">
        <div class="hud-header">MNC LUNAR RECON • SECTOR 04 (89.9°S)</div>
        <div class="hud-row" id="hud-pos">POS: 0m, 0m, 0m</div>
        <div class="hud-row" id="hud-alt">ALT: 0m AGL</div>
        <div class="hud-row" id="hud-horizon">HORIZON: 2.43 km</div>
        <div class="hud-row" id="hud-suit">SUIT: 100% | MODE: EVA BOUNDING</div>
        <div class="hud-row hud-dim" id="hud-dynamics">APEX: 0.00m | IMPACT: 0.0 m/s</div>
      </div>
      <div class="hud-crosshair">+</div>
      <div id="hud-prompt" class="hud-action-prompt" style="display: none;">[E] ENTER ROVER</div>
      <div id="hud-breach" class="hud-breach-alert" style="display: none;">
        <div class="breach-title">CRITICAL IMPACT — SUIT BREACH DETECTED</div>
        <div class="breach-sub">PRESS [R] TO DEPLOY BACKUP CONTRACTOR</div>
      </div>
      <div class="hud-panel hud-top-right">
        <div class="hud-header">SYSTEM PERFORMANCE</div>
        <div class="hud-row" id="hud-perf">FPS: -- | FT: -- ms</div>
        <div class="hud-row hud-dim" id="hud-mesh">DRAWS: -- | TRIS: --</div>
      </div>
      <div class="hud-footer" id="hud-footer">
        <span class="hud-key">CLICK TO LOOK</span> • 
        <span class="hud-key">W A S D</span> LOPING MOVE • 
        <span class="hud-key">SPACE</span> 1/6G HOP • 
        <span class="hud-key">SHIFT</span> SPRINT • 
        <span class="hud-key">V</span> TOGGLE CAM
      </div>
    `;

    document.body.appendChild(this.container);

    this.posElement = document.getElementById('hud-pos')!;
    this.altElement = document.getElementById('hud-alt')!;
    this.horizonElement = document.getElementById('hud-horizon')!;
    this.perfElement = document.getElementById('hud-perf')!;
    this.suitElement = document.getElementById('hud-suit')!;
    this.dynamicsElement = document.getElementById('hud-dynamics')!;
    this.breachElement = document.getElementById('hud-breach')!;
    this.promptElement = document.getElementById('hud-prompt')!;
    this.footerElement = document.getElementById('hud-footer')!;
  }

  public update(data: HudTelemetryData): void {
    const eyeHeight = Math.max(0.0, data.y - data.groundY);
    const horizon = horizonDistance(eyeHeight);

    this.posElement.textContent = `POS: X: ${data.x.toFixed(0)}m | Y: ${data.y.toFixed(0)}m | Z: ${data.z.toFixed(0)}m`;
    this.altElement.textContent = `ALT: ${eyeHeight.toFixed(1)}m AGL (Ground: ${data.groundY.toFixed(1)}m)`;
    this.horizonElement.textContent = `HORIZON: ${(horizon / 1000).toFixed(2)} km`;
    this.perfElement.textContent = `FPS: ${data.fps.toFixed(0)} | FT: ${data.frameTimeMs.toFixed(1)} ms`;

    const healthClamped = Math.max(0, Math.round(data.health));
    if (data.mode === 'ROVER_DRIVING') {
      const speedKmH = ((data.roverSpeed || 0) * 3.6).toFixed(1);
      this.suitElement.textContent = `SUIT: ${healthClamped}% | ROVER SPEED: ${speedKmH} km/h`;
      this.dynamicsElement.textContent = `TRACTION: LOW REGOLITH | BRAKE: EXTENDED`;
      this.promptElement.style.display = 'block';
      this.promptElement.textContent = '[E] EXIT ROVER';
      this.footerElement.innerHTML = `
        <span class="hud-key">W / S</span> ACCEL / BRAKE • 
        <span class="hud-key">A / D</span> STEER • 
        <span class="hud-key">SPACE</span> HANDBRAKE • 
        <span class="hud-key">E</span> EXIT ROVER
      `;
    } else if (data.mode === 'EVA_ASTRONAUT') {
      this.suitElement.textContent = `SUIT: ${healthClamped}% | MODE: EVA BOUNDING`;
      this.dynamicsElement.textContent = `APEX: ${data.jumpApex.toFixed(2)}m | LAST IMPACT: ${data.lastImpactSpeed.toFixed(1)} m/s`;
      if (data.canInteractRover) {
        this.promptElement.style.display = 'block';
        this.promptElement.textContent = '[E] ENTER MINING ROVER';
      } else {
        this.promptElement.style.display = 'none';
      }
      this.footerElement.innerHTML = `
        <span class="hud-key">CLICK TO LOOK</span> • 
        <span class="hud-key">W A S D</span> LOPING MOVE • 
        <span class="hud-key">SPACE</span> 1/6G HOP • 
        <span class="hud-key">SHIFT</span> SPRINT • 
        <span class="hud-key">V</span> FLY CAM
      `;
    } else {
      this.suitElement.textContent = `SUIT: ${healthClamped}% | MODE: FREE FLY CAMERA`;
      this.promptElement.style.display = 'none';
      this.footerElement.innerHTML = `
        <span class="hud-key">W A S D</span> FLY • 
        <span class="hud-key">SPACE / C</span> ASCEND / DESCEND • 
        <span class="hud-key">SHIFT</span> TURBO • 
        <span class="hud-key">V</span> EXIT FLY
      `;
    }

    if (data.isDead) {
      this.breachElement.style.display = 'block';
    } else {
      this.breachElement.style.display = 'none';
    }

    const meshElem = document.getElementById('hud-mesh');
    if (meshElem) {
      meshElem.textContent = `DRAWS: ${data.metrics.drawCalls} | TRIS: ${(data.metrics.triangles / 1000).toFixed(1)}k`;
    }
  }
}
