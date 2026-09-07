/**
 * LunarAudioEngine: Physically accurate lunar acoustic simulation via Web Audio API.
 * Follows the 3-bus architecture from MASTER-PROMPT-adventuremnc.md:
 * 1. INTERNAL BUS: Sounds inside the helmet (breathing, life-support airflow, HUD alarms)
 * 2. CONTACT BUS: Sounds conducted through solid physical contact (footsteps on regolith, chassis vibration)
 * 3. RADIO BUS: Electronic comms and telemetry signals (Apollo Quindar tones, terminal clicks)
 *
 * CRITICAL PHYSICS RULE: Zero sound transmission through vacuum.
 * Stepping out of the rover makes its engine sound vanish INSTANTLY into complete silence.
 */

export class LunarAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  // Audio Buses
  private masterGain: GainNode | null = null;
  private internalGain: GainNode | null = null;
  private contactGain: GainNode | null = null;
  private contactFilter: BiquadFilterNode | null = null;
  private radioGain: GainNode | null = null;

  // Reusable Noise Buffer (for life support, breath, footsteps)
  private noiseBuffer: AudioBuffer | null = null;

  // Continuous Sound Generators
  private lifeSupportGain: GainNode | null = null;
  private breathGain: GainNode | null = null;
  private breathFilter: BiquadFilterNode | null = null;
  private breathPhase: number = 0; // 0 to 2PI
  private lastFootstepPhase: number = 0;

  // Rover Motor Generator (Dual Oscillator)
  private roverMotorGain: GainNode | null = null;
  private roverOscSub: OscillatorNode | null = null;
  private roverOscHum: OscillatorNode | null = null;

  // Alarm state
  private lastAlarmTime: number = 0;

  constructor() {
    // Lazy initialize on first user gesture
    const initOnGesture = () => {
      this.init();
      window.removeEventListener('pointerdown', initOnGesture);
      window.removeEventListener('keydown', initOnGesture);
    };
    window.addEventListener('pointerdown', initOnGesture);
    window.addEventListener('keydown', initOnGesture);
  }

  public init(): void {
    if (this.isInitialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      // Master bus
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // 1. Internal Bus (Inside helmet)
      this.internalGain = this.ctx.createGain();
      this.internalGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.internalGain.connect(this.masterGain);

      // 2. Contact Bus (Heavy low-pass filter to simulate acoustic bone/suit conduction)
      this.contactFilter = this.ctx.createBiquadFilter();
      this.contactFilter.type = 'lowpass';
      this.contactFilter.frequency.setValueAtTime(220, this.ctx.currentTime);
      this.contactFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

      this.contactGain = this.ctx.createGain();
      this.contactGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
      this.contactFilter.connect(this.contactGain);
      this.contactGain.connect(this.masterGain);

      // 3. Radio Bus (Clean electronic communication)
      this.radioGain = this.ctx.createGain();
      this.radioGain.gain.setValueAtTime(0.65, this.ctx.currentTime);
      this.radioGain.connect(this.masterGain);

      // Create 2-second white/pink noise buffer
      this.createNoiseBuffer();

      // Start internal life support background airflow
      this.startLifeSupportAirflow();

      // Start continuous breathing generator
      this.startBreathingGenerator();

      // Start continuous rover motor synthesizer
      this.startRoverMotorSynthesizer();

      this.isInitialized = true;
    } catch {
      // AudioContext not supported or blocked
    }
  }

  private createNoiseBuffer(): void {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);

    // Pink noise approximation for soft organic rushing air
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }

  /**
   * Continuous gentle oxygen airflow hum inside the helmet
   */
  private startLifeSupportAirflow(): void {
    if (!this.ctx || !this.noiseBuffer || !this.internalGain) return;

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = this.noiseBuffer;
    noiseNode.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(320, this.ctx.currentTime);
    filter.Q.setValueAtTime(0.8, this.ctx.currentTime);

    this.lifeSupportGain = this.ctx.createGain();
    this.lifeSupportGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    noiseNode.connect(filter);
    filter.connect(this.lifeSupportGain);
    this.lifeSupportGain.connect(this.internalGain);
    noiseNode.start();
  }

  /**
   * Continuous breathing sound modulated by physiological exertion and oxygen levels
   */
  private startBreathingGenerator(): void {
    if (!this.ctx || !this.noiseBuffer || !this.internalGain) return;

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = this.noiseBuffer;
    noiseNode.loop = true;

    this.breathFilter = this.ctx.createBiquadFilter();
    this.breathFilter.type = 'bandpass';
    this.breathFilter.frequency.setValueAtTime(550, this.ctx.currentTime);
    this.breathFilter.Q.setValueAtTime(1.4, this.ctx.currentTime);

    this.breathGain = this.ctx.createGain();
    this.breathGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    noiseNode.connect(this.breathFilter);
    this.breathFilter.connect(this.breathGain);
    this.breathGain.connect(this.internalGain);
    noiseNode.start();
  }

  /**
   * Synthesizes rover electric traction motor: ONLY audible when seated in driver seat
   */
  private startRoverMotorSynthesizer(): void {
    if (!this.ctx || !this.contactFilter) return;

    this.roverMotorGain = this.ctx.createGain();
    this.roverMotorGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    // Sub rumble (chassis vibration)
    this.roverOscSub = this.ctx.createOscillator();
    this.roverOscSub.type = 'triangle';
    this.roverOscSub.frequency.setValueAtTime(45, this.ctx.currentTime);

    // Electric motor whine
    this.roverOscHum = this.ctx.createOscillator();
    this.roverOscHum.type = 'sawtooth';
    this.roverOscHum.frequency.setValueAtTime(110, this.ctx.currentTime);

    const motorFilter = this.ctx.createBiquadFilter();
    motorFilter.type = 'lowpass';
    motorFilter.frequency.setValueAtTime(300, this.ctx.currentTime);

    this.roverOscSub.connect(motorFilter);
    this.roverOscHum.connect(motorFilter);
    motorFilter.connect(this.roverMotorGain);
    this.roverMotorGain.connect(this.contactFilter);

    this.roverOscSub.start();
    this.roverOscHum.start();
  }

  /**
   * Update breathing cycle based on movement, sprint, and oxygen level
   */
  public updatePhysiology(dt: number, isSprinting: boolean, o2Percent: number, isDead: boolean): void {
    if (!this.ctx || !this.breathGain || !this.breathFilter) return;

    if (isDead) {
      this.breathGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.1);
      return;
    }

    // Rate of breathing: normal ~0.3 Hz, sprinting ~0.65 Hz, suffocating ~0.9 Hz
    let breatheFreq = 0.32;
    if (isSprinting) breatheFreq = 0.65;
    if (o2Percent < 25) breatheFreq = 0.95;

    this.breathPhase = (this.breathPhase + breatheFreq * Math.PI * 2 * dt) % (Math.PI * 2);

    // Breath curve: sinusoidal inhalation & exhalation with natural pause
    const rawCycle = Math.sin(this.breathPhase);
    let breathAmp = Math.max(0, rawCycle);
    if (rawCycle < 0) {
      // Exhalation
      breathAmp = Math.abs(rawCycle) * 0.75;
    }

    const maxVolume = isSprinting ? 0.35 : o2Percent < 25 ? 0.45 : 0.18;
    const targetGain = breathAmp * maxVolume;
    this.breathGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);

    // Filter shifts slightly higher during inhalation
    const targetFilterFreq = rawCycle > 0 ? 680 : 420;
    this.breathFilter.frequency.setTargetAtTime(targetFilterFreq, this.ctx.currentTime, 0.08);
  }

  /**
   * Update rover engine sound.
   * STRICT VACUUM RULE: If not driving, rover sound is 100% silent!
   */
  public updateRoverSound(speed: number, isDriving: boolean): void {
    if (!this.ctx || !this.roverMotorGain || !this.roverOscSub || !this.roverOscHum) return;

    if (!isDriving) {
      // Complete vacuum silence: sound cuts out instantly when stepping out of vehicle
      this.roverMotorGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.04);
      return;
    }

    const absSpeed = Math.abs(speed);
    const speedRatio = Math.min(1.0, absSpeed / 8.5);

    // Gain increases with throttle / speed
    const targetGain = 0.08 + speedRatio * 0.28;
    this.roverMotorGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.06);

    // Frequency rises from idle 40Hz to 160Hz for sub, 90Hz to 320Hz for electric motor
    const subFreq = 40 + speedRatio * 85;
    const humFreq = 85 + speedRatio * 220;

    this.roverOscSub.frequency.setTargetAtTime(subFreq, this.ctx.currentTime, 0.08);
    this.roverOscHum.frequency.setTargetAtTime(humFreq, this.ctx.currentTime, 0.08);
  }

  /**
   * Play muffled bone-conducted footstep on regolith
   */
  public triggerFootstep(lopingCycle: number, isGrounded: boolean): void {
    if (!this.ctx || !this.noiseBuffer || !this.contactFilter || !isGrounded) return;

    // Detect foot strike near cycle peaks (0 and PI)
    const phase = lopingCycle % Math.PI;
    if (this.lastFootstepPhase > 2.8 && phase < 0.4) {
      this.playMuffledStep();
    }
    this.lastFootstepPhase = phase;
  }

  private playMuffledStep(): void {
    if (!this.ctx || !this.noiseBuffer || !this.contactFilter) return;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const stepFilter = this.ctx.createBiquadFilter();
    stepFilter.type = 'lowpass';
    stepFilter.frequency.setValueAtTime(140 + Math.random() * 30, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    src.connect(stepFilter);
    stepFilter.connect(gain);
    gain.connect(this.contactFilter);

    src.start(now);
    src.stop(now + 0.18);
  }

  /**
   * Heavy low-frequency landing impact conducted through the astronaut suit joints
   */
  public playLandingImpact(impactSpeed: number): void {
    if (!this.ctx || !this.contactFilter || impactSpeed < 2.0) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.25);

    const gain = this.ctx.createGain();
    const volume = Math.min(0.65, 0.15 + (impactSpeed / 12.0) * 0.45);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.contactFilter);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * NASA Apollo Quindar double-beep for telemetry locking
   */
  public playQuindarTone(): void {
    if (!this.ctx || !this.radioGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2525, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.setValueAtTime(0.12, now + 0.08);
    gain.gain.setValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.radioGain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Life support critical warning advisory beep
   */
  public playAlarmBeep(type: 'O2' | 'THERMAL'): void {
    if (!this.ctx || !this.internalGain) return;
    const now = this.ctx.currentTime;
    if (now - this.lastAlarmTime < 1.4) return; // Prevent spamming
    this.lastAlarmTime = now;

    const freq = type === 'O2' ? 880 : 660;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.setValueAtTime(freq * 1.25, now + 0.12);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(this.internalGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * Airlock cycle pneumatic hissing & latch seal
   */
  public playAirlockCycle(): void {
    if (!this.ctx || !this.noiseBuffer || !this.internalGain) return;

    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(450, now + 1.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.internalGain);

    src.start(now);
    src.stop(now + 1.5);
  }

  /**
   * Mechanical relay click for in-game CRT terminal
   */
  public playTerminalClick(): void {
    if (!this.ctx || !this.radioGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.radioGain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}
