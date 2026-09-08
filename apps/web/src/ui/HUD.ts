import { horizonDistance } from '@adventuremnc/shared';
import { DeathReason } from '@adventuremnc/engine';
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
  deathReason: DeathReason;
  jumpApex: number;
  lastImpactSpeed: number;
  mode: 'EVA_ASTRONAUT' | 'ROVER_DRIVING' | 'FLY_CAMERA';
  roverSpeed?: number;
  canInteractRover?: boolean;
  canInteractAirlock?: boolean;
  distanceToHab?: number;
  distanceToRover?: number;
  isInsideHabitat?: boolean;
  // M4 Survival Data
  oxygen: number;
  suitTemperature: number;
  suitIntegrity: number;
  isInSunlight: boolean;
  isInsideShelter: boolean;
}

export class HUD {
  public onRecallRover?: () => void;
  private container: HTMLElement;
  private posElement: HTMLElement;
  private altElement: HTMLElement;
  private horizonElement: HTMLElement;
  private perfElement: HTMLElement;

  // Survival Elements
  private o2TextElement: HTMLElement;
  private o2BarElement: HTMLElement;
  private tempTextElement: HTMLElement;
  private tempPointerElement: HTMLElement;
  private suitTextElement: HTMLElement;
  private suitBarElement: HTMLElement;
  private rangefinderElement: HTMLElement;

  // Visor FX Elements
  private frostOverlay: HTMLElement;
  private heatOverlay: HTMLElement;
  private suffocationOverlay: HTMLElement;
  private crackOverlay: HTMLElement;

  // Modals & Prompts
  private deathModal: HTMLElement;
  private deathBadgeElement: HTMLElement;
  private deathTitleElement: HTMLElement;
  private deathDescElement: HTMLElement;
  private promptElement: HTMLElement;
  private footerElement: HTMLElement;
  private toastElement: HTMLElement;

  private lastRenderedMode: string = '';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  public onToggleTerminal?: () => void;
  public onRespawn?: () => void;
  public onToggleAudio?: () => void;
  private isAudioMuted: boolean = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'lunar-hud';
    this.container.innerHTML = `
      <!-- Fullscreen Atmospheric Visor Overlays -->
      <div id="hud-visor-frost" class="hud-visor-layer hud-visor-frost"></div>
      <div id="hud-visor-heat" class="hud-visor-layer hud-visor-heat"></div>
      <div id="hud-visor-suffocation" class="hud-visor-layer hud-visor-suffocation"></div>
      <div id="hud-visor-crack" class="hud-visor-layer hud-visor-crack"></div>

      <!-- Top Left: Navigation & Tactical Survival Gauges (1080p high contrast) -->
      <div class="hud-panel hud-top-left hud-survival-panel">
        <div class="hud-header">MNC LUNAR BASE • SECTOR 04 (89.9°S)</div>
        <div class="hud-row" id="hud-pos">POS: 0m, 0m, 0m</div>
        <div class="hud-row" id="hud-alt">ALT: 0.0m AGL</div>
        <div class="hud-row hud-dim" id="hud-horizon">HORIZON: 2.43 km</div>

        <div class="hud-divider"></div>

        <!-- Oxygen Gauge -->
        <div class="hud-gauge-group">
          <div class="hud-gauge-header">
            <span id="hud-o2-text">O₂ RESERVES: 100%</span>
            <span id="hud-o2-rate" class="hud-gauge-sub">NOMINAL</span>
          </div>
          <div class="hud-bar-track">
            <div id="hud-o2-bar" class="hud-bar-fill hud-bar-o2" style="width: 100%;"></div>
          </div>
        </div>

        <!-- Thermal Core Gauge -->
        <div class="hud-gauge-group">
          <div class="hud-gauge-header">
            <span id="hud-temp-text">SUIT TEMP: 21.0°C</span>
            <span id="hud-temp-env" class="hud-gauge-sub">SUN (+120°C)</span>
          </div>
          <div class="hud-temp-spectrum-track">
            <div id="hud-temp-pointer" class="hud-temp-indicator" style="left: 50%;"></div>
          </div>
        </div>

        <!-- Suit Integrity & Armor Gauge -->
        <div class="hud-gauge-group">
          <div class="hud-gauge-header">
            <span id="hud-suit-text">SUIT INTEGRITY: 100%</span>
            <span id="hud-suit-status" class="hud-gauge-sub">SEALED</span>
          </div>
          <div class="hud-bar-track">
            <div id="hud-suit-bar" class="hud-bar-fill hud-bar-suit" style="width: 100%;"></div>
          </div>
        </div>

        <!-- Rangefinder -->
        <div class="hud-row hud-rangefinder" id="hud-rangefinder">
          HAB: --m | ROVER: --m
        </div>
      </div>

      <!-- Center Reticle & Context Action Prompts -->
      <div class="hud-crosshair">+</div>
      <div id="hud-prompt" class="hud-action-prompt" style="display: none;">[E] INTERACT</div>

      <!-- Toast Notification Banner -->
      <div id="hud-toast" class="hud-toast-banner" style="display: none;"></div>

      <!-- Distinct Death Screen Modal -->
      <div id="hud-death-modal" class="hud-death-overlay" style="display: none;">
        <div class="hud-death-card">
          <div id="hud-death-badge" class="hud-death-badge">FATAL LIFE SUPPORT EVENT</div>
          <h1 id="hud-death-title" class="hud-death-title">ASTRONAUT DECEASED</h1>
          <p id="hud-death-desc" class="hud-death-desc">Penyebab kematian sedang didiagnosa...</p>
          <div class="hud-death-action">
            <button id="hud-respawn-btn" class="hud-btn-respawn">RESPAWN AT HABITAT AIRLOCK [R]</button>
          </div>
        </div>
      </div>

      <!-- Top Right: Telemetry & Metrics -->
      <div class="hud-panel hud-top-right">
        <div class="hud-header">SYSTEM TELEMETRY</div>
        <div class="hud-row" id="hud-perf">FPS: -- | FT: -- ms</div>
        <div class="hud-row hud-dim" id="hud-mesh">DRAWS: -- | TRIS: --</div>
      </div>

      <!-- Footer Command Bar -->
      <div class="hud-footer" id="hud-footer"></div>
    `;

    document.body.appendChild(this.container);

    this.posElement = document.getElementById('hud-pos')!;
    this.altElement = document.getElementById('hud-alt')!;
    this.horizonElement = document.getElementById('hud-horizon')!;
    this.perfElement = document.getElementById('hud-perf')!;

    this.o2TextElement = document.getElementById('hud-o2-text')!;
    this.o2BarElement = document.getElementById('hud-o2-bar')!;
    this.tempTextElement = document.getElementById('hud-temp-text')!;
    this.tempPointerElement = document.getElementById('hud-temp-pointer')!;
    this.suitTextElement = document.getElementById('hud-suit-text')!;
    this.suitBarElement = document.getElementById('hud-suit-bar')!;
    this.rangefinderElement = document.getElementById('hud-rangefinder')!;

    this.frostOverlay = document.getElementById('hud-visor-frost')!;
    this.heatOverlay = document.getElementById('hud-visor-heat')!;
    this.suffocationOverlay = document.getElementById('hud-visor-suffocation')!;
    this.crackOverlay = document.getElementById('hud-visor-crack')!;

    this.deathModal = document.getElementById('hud-death-modal')!;
    this.deathBadgeElement = document.getElementById('hud-death-badge')!;
    this.deathTitleElement = document.getElementById('hud-death-title')!;
    this.deathDescElement = document.getElementById('hud-death-desc')!;
    this.promptElement = document.getElementById('hud-prompt')!;
    this.footerElement = document.getElementById('hud-footer')!;
    this.toastElement = document.getElementById('hud-toast')!;

    const respawnBtn = document.getElementById('hud-respawn-btn');
    if (respawnBtn) {
      respawnBtn.addEventListener('click', () => {
        if (this.onRespawn) {
          this.onRespawn();
        }
      });
    }

    this.footerElement.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target && target.closest('.hud-btn-terminal')) {
        e.stopPropagation();
        if (this.onToggleTerminal) {
          this.onToggleTerminal();
        }
      }
      if (target && target.closest('.hud-btn-audio')) {
        e.stopPropagation();
        if (this.onToggleAudio) {
          this.onToggleAudio();
        }
      }
      if (target && target.closest('.hud-btn-rover')) {
        e.stopPropagation();
        if (this.onRecallRover) {
          this.onRecallRover();
        }
      }
    });

    this.renderFooter('EVA_ASTRONAUT');
  }

  public setAudioMuted(muted: boolean): void {
    this.isAudioMuted = muted;
    const prevMode = this.lastRenderedMode as 'EVA_ASTRONAUT' | 'ROVER_DRIVING' | 'FLY_CAMERA';
    this.lastRenderedMode = '';
    this.renderFooter(prevMode || 'EVA_ASTRONAUT');
  }

  public showToast(message: string, durationMs = 3500): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastElement.textContent = message;
    this.toastElement.style.display = 'block';
    this.toastTimer = setTimeout(() => {
      this.toastElement.style.display = 'none';
      this.toastTimer = null;
    }, durationMs);
  }

  private renderFooter(mode: 'EVA_ASTRONAUT' | 'ROVER_DRIVING' | 'FLY_CAMERA'): void {
    if (this.lastRenderedMode === mode) return;
    this.lastRenderedMode = mode;

    const termBtn = `<span class="hud-key hud-btn-terminal" style="cursor: pointer; color: #00f0ff; background: rgba(0,240,255,0.15); border: 1px solid rgba(0,240,255,0.4); padding: 1px 6px; border-radius: 3px;">[T] SAT-COM TERMINAL</span>`;
    const audioBtn = `<span class="hud-key hud-btn-audio" style="cursor: pointer; color: ${this.isAudioMuted ? '#ff5252' : '#00ff88'}; background: ${this.isAudioMuted ? 'rgba(255,82,82,0.15)' : 'rgba(0,255,136,0.12)'}; border: 1px solid ${this.isAudioMuted ? 'rgba(255,82,82,0.4)' : 'rgba(0,255,136,0.35)'}; padding: 1px 6px; border-radius: 3px;">[M] SOUND: ${this.isAudioMuted ? 'OFF 🔇' : 'ON 🔊'}</span>`;
    const roverBtn = `<span class="hud-key hud-btn-rover" style="cursor: pointer; color: #ffd700; background: rgba(255,215,0,0.15); border: 1px solid rgba(255,215,0,0.4); padding: 1px 6px; border-radius: 3px;">[B] RECALL ROVER 🚜</span>`;

    if (mode === 'ROVER_DRIVING') {
      this.footerElement.innerHTML = `
        <span class="hud-key">W / S</span> ACCEL / BRAKE • 
        <span class="hud-key">A / D</span> STEER • 
        <span class="hud-key">SPACE</span> HANDBRAKE • 
        <span class="hud-key">E</span> EXIT ROVER • 
        ${termBtn} • 
        ${audioBtn}
      `;
    } else if (mode === 'EVA_ASTRONAUT') {
      this.footerElement.innerHTML = `
        <span class="hud-key">CLICK TO LOOK</span> • 
        <span class="hud-key">W A S D</span> LOPING MOVE • 
        <span class="hud-key">SPACE</span> 1/6G HOP • 
        <span class="hud-key">SHIFT</span> SPRINT • 
        <span class="hud-key">V</span> FLY CAM • 
        ${roverBtn} • 
        ${termBtn} • 
        ${audioBtn}
      `;
    } else {
      this.footerElement.innerHTML = `
        <span class="hud-key">W A S D</span> FLY • 
        <span class="hud-key">SPACE / C</span> ASCEND / DESCEND • 
        <span class="hud-key">SHIFT</span> TURBO • 
        <span class="hud-key">V</span> EXIT FLY • 
        ${termBtn} • 
        ${audioBtn}
      `;
    }
  }

  public update(data: HudTelemetryData): void {
    const eyeHeight = Math.max(0.0, data.y - data.groundY);
    const horizon = horizonDistance(eyeHeight);

    this.posElement.textContent = `POS: X: ${data.x.toFixed(0)}m | Y: ${data.y.toFixed(0)}m | Z: ${data.z.toFixed(0)}m`;
    this.altElement.textContent = `ALT: ${eyeHeight.toFixed(1)}m AGL (Ground: ${data.groundY.toFixed(1)}m)`;
    this.horizonElement.textContent = `HORIZON: ${(horizon / 1000).toFixed(2)} km`;
    this.perfElement.textContent = `FPS: ${data.fps.toFixed(0)} | FT: ${data.frameTimeMs.toFixed(1)} ms`;

    // ------------------------------------------------------------------
    // 1. Survival Gauges (Oxygen, Thermal, Suit Integrity)
    // ------------------------------------------------------------------
    const o2Clamped = Math.max(0, Math.min(100, Math.round(data.oxygen)));
    this.o2BarElement.style.width = `${o2Clamped}%`;
    const o2RateElement = document.getElementById('hud-o2-rate');

    if (data.isInsideShelter) {
      this.o2TextElement.textContent = `O₂ RESERVES: ${o2Clamped}%`;
      if (o2RateElement) {
        o2RateElement.textContent = 'CHARGING ⚡';
        o2RateElement.style.color = '#00ff88';
      }
      this.o2BarElement.style.backgroundColor = '#00ff88';
    } else if (o2Clamped <= 20) {
      this.o2TextElement.textContent = `O₂ CRITICAL: ${o2Clamped}%`;
      if (o2RateElement) {
        o2RateElement.textContent = 'SUFFOCATION IMMINENT!';
        o2RateElement.style.color = '#ff3333';
      }
      this.o2BarElement.style.backgroundColor = '#ff3333';
    } else {
      this.o2TextElement.textContent = `O₂ RESERVES: ${o2Clamped}%`;
      if (o2RateElement) {
        o2RateElement.textContent = data.suitIntegrity < 50 ? 'LEAKING ⚠️' : 'NOMINAL';
        o2RateElement.style.color = data.suitIntegrity < 50 ? '#ffb703' : '#a0aec0';
      }
      this.o2BarElement.style.backgroundColor = '#00f0ff';
    }

    // Thermal Bar
    const temp = data.suitTemperature;
    const envElem = document.getElementById('hud-temp-env');
    if (envElem) {
      if (data.isInsideHabitat) {
        envElem.textContent = 'HABITAT (+21.5°C 1.0 ATM)';
        envElem.style.color = '#00ff88';
      } else if (data.isInsideShelter) {
        envElem.textContent = 'SHELTER (+21°C)';
        envElem.style.color = '#00ff88';
      } else if (data.isInSunlight) {
        envElem.textContent = 'SUNLIGHT (+120°C)';
        envElem.style.color = '#ffb703';
      } else {
        envElem.textContent = 'SHADOW (-170°C)';
        envElem.style.color = '#80d8ff';
      }
    }
    this.tempTextElement.textContent = `SUIT TEMP: ${temp.toFixed(1)}°C`;
    // Map -40°C to +60°C onto 0% to 100% position
    const tempPercent = Math.max(0, Math.min(100, ((temp + 40) / 100) * 100));
    this.tempPointerElement.style.left = `${tempPercent}%`;

    // Suit Integrity
    const integrityClamped = Math.max(0, Math.min(100, Math.round(data.suitIntegrity)));
    this.suitBarElement.style.width = `${integrityClamped}%`;
    const suitStatusElem = document.getElementById('hud-suit-status');
    if (suitStatusElem) {
      if (data.isInsideShelter) {
        suitStatusElem.textContent = 'REPAIRING';
        suitStatusElem.style.color = '#00ff88';
      } else if (integrityClamped < 50) {
        suitStatusElem.textContent = 'PUNCTURED ⚠️';
        suitStatusElem.style.color = '#ff3333';
      } else {
        suitStatusElem.textContent = 'SEALED ✓';
        suitStatusElem.style.color = '#a0aec0';
      }
    }
    this.suitTextElement.textContent = `SUIT INTEGRITY: ${integrityClamped}%`;

    // Rangefinder
    const habDist = data.distanceToHab !== undefined ? `${data.distanceToHab.toFixed(0)}m` : '--';
    const roverDist =
      data.distanceToRover !== undefined ? `${data.distanceToRover.toFixed(0)}m` : '--';
    const habStatus = data.isInsideHabitat ? ' [INSIDE ROOM]' : '';
    this.rangefinderElement.textContent = `HABITAT: ${habDist}${habStatus} | ROVER: ${roverDist}`;

    // ------------------------------------------------------------------
    // 2. Visor Atmospheric Effects
    // ------------------------------------------------------------------
    // A. Frost in deep cold (< 18°C starts fading in, < 5°C intense)
    if (temp < 18.0) {
      const frostIntensity = Math.min(1.0, Math.max(0, (18.0 - temp) / 16.0));
      this.frostOverlay.style.opacity = frostIntensity.toFixed(2);
    } else {
      this.frostOverlay.style.opacity = '0';
    }

    // B. Heat distortion in extreme heat (> 38°C)
    if (temp > 38.0) {
      const heatIntensity = Math.min(1.0, Math.max(0, (temp - 38.0) / 12.0));
      this.heatOverlay.style.opacity = heatIntensity.toFixed(2);
    } else {
      this.heatOverlay.style.opacity = '0';
    }

    // C. Suffocation tunnel vision (starts at O2 < 25%)
    if (o2Clamped < 25) {
      const suffocationIntensity = Math.min(1.0, (25 - o2Clamped) / 25);
      this.suffocationOverlay.style.opacity = suffocationIntensity.toFixed(2);
    } else {
      this.suffocationOverlay.style.opacity = '0';
    }

    // D. Cracked Visor upon suit damage (< 70%)
    if (integrityClamped < 70) {
      const crackIntensity = Math.min(1.0, (70 - integrityClamped) / 60);
      this.crackOverlay.style.opacity = crackIntensity.toFixed(2);
    } else {
      this.crackOverlay.style.opacity = '0';
    }

    // ------------------------------------------------------------------
    // 3. Action Prompts (Airlock vs Rover)
    // ------------------------------------------------------------------
    if (data.canInteractAirlock) {
      this.promptElement.style.display = 'block';
      this.promptElement.textContent = data.isInsideHabitat
        ? '[E] EXIT HABITAT TO SURFACE (SAVE & REFILL)'
        : '[E] ENTER HABITAT AIRLOCK (SAVE & REFILL)';
    } else if (data.canInteractRover && data.mode === 'EVA_ASTRONAUT') {
      this.promptElement.style.display = 'block';
      this.promptElement.textContent = '[E] ENTER MINING ROVER COCKPIT';
    } else {
      this.promptElement.style.display = 'none';
    }

    // ------------------------------------------------------------------
    // 4. Distinct Death Modal Diagnosis
    // ------------------------------------------------------------------
    if (data.isDead) {
      this.deathModal.style.display = 'flex';
      switch (data.deathReason) {
        case 'ASPHYXIATION':
          this.deathBadgeElement.textContent = '💀 LIFE SUPPORT FAILURE // HYPOXIA';
          this.deathTitleElement.textContent = 'FATAL ASPHYXIATION';
          this.deathDescElement.textContent =
            'Cadangan Oksigen suit habis total di ruang hampa Bulan. Hipoksia jaringan otak fatal terjadi karena gagal mengisi ulang O₂ di Habitat Airlock atau Mining Rover.';
          break;

        case 'HYPOTHERMIA':
          this.deathBadgeElement.textContent = '❄️ CRYO-THERMAL SYSTEM FAILURE';
          this.deathTitleElement.textContent = 'FATAL HYPOTHERMIA';
          this.deathDescElement.textContent = `Suhu inti suit anjlok hingga ${temp.toFixed(1)}°C di dalam bayangan dingin kawah Bulan (−170°C). Sistem pemanas suit kehabisan daya dan sirkulasi tubuh membeku.`;
          break;

        case 'HYPERTHERMIA':
          this.deathBadgeElement.textContent = '🔥 HEAT EXCHANGER OVERHEAT';
          this.deathTitleElement.textContent = 'FATAL HYPERTHERMIA';
          this.deathDescElement.textContent = `Radiator pendingin suit gagal membuang panas di bawah radiasi matahari langsung (+120°C). Suhu inti mencapai ${temp.toFixed(1)}°C menyebabkan kegagalan organ fatal.`;
          break;

        case 'FALL_IMPACT':
          this.deathBadgeElement.textContent = '💥 IMPACT COMPRESSION TRAUMA';
          this.deathTitleElement.textContent = 'FATAL IMPACT COLLISION';
          this.deathDescElement.textContent = `Kecepatan benturan jatuh (${data.lastImpactSpeed.toFixed(1)} m/s) melampaui batas toleransi 8.5 m/s. Kerusakan struktur rangka suit dan trauma tumpul fatal terjadi.`;
          break;

        case 'SUIT_DECOMPRESSION':
          this.deathBadgeElement.textContent = '⚠️ CATASTROPHIC DECOMPRESSION';
          this.deathTitleElement.textContent = 'SUIT HULL BREACH';
          this.deathDescElement.textContent =
            'Integritas pelindung suit mencapai 0%. Kebocoran dekompresi eksplosif seketika merusak seluruh sistem penunjang kehidupan di ruang hampa.';
          break;

        default:
          this.deathBadgeElement.textContent = '⚠️ MISSION TERMINATED';
          this.deathTitleElement.textContent = 'ASTRONAUT DECEASED';
          this.deathDescElement.textContent =
            'Kondisi vital astronot tidak dapat dipertahankan di lingkungan ekstrem Bulan.';
          break;
      }
    } else {
      this.deathModal.style.display = 'none';
    }

    this.renderFooter(data.mode);

    const meshElem = document.getElementById('hud-mesh');
    if (meshElem) {
      meshElem.textContent = `DRAWS: ${data.metrics.drawCalls} | TRIS: ${(data.metrics.triangles / 1000).toFixed(1)}k`;
    }
  }
}
