import * as THREE from 'three';
import { LUNAR_GRAVITY } from '@adventuremnc/shared';

export class BallisticDustParticles {
  public mesh: THREE.Points;
  private particleCount = 2000;
  private nextIndex = 0;

  private birthTimes: Float32Array;
  private lifeTimes: Float32Array;
  private origins: Float32Array;
  private velocities: Float32Array;

  private material: THREE.ShaderMaterial;

  constructor(scene: THREE.Scene) {
    this.birthTimes = new Float32Array(this.particleCount);
    this.lifeTimes = new Float32Array(this.particleCount);
    this.origins = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('aBirthTime', new THREE.BufferAttribute(this.birthTimes, 1));
    geometry.setAttribute('aLifeTime', new THREE.BufferAttribute(this.lifeTimes, 1));
    geometry.setAttribute('aOrigin', new THREE.BufferAttribute(this.origins, 3));
    geometry.setAttribute('aVelocity', new THREE.BufferAttribute(this.velocities, 3));

    // Dummy positions for Three.js bounding box
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.particleCount * 3), 3));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uGravity: { value: LUNAR_GRAVITY },
        uColor: { value: new THREE.Color(0x2a2826) }, // 0.12 albedo regolith dust
      },
      vertexShader: `
        uniform float uTime;
        uniform float uGravity;
        attribute float aBirthTime;
        attribute float aLifeTime;
        attribute vec3 aOrigin;
        attribute vec3 aVelocity;

        void main() {
          float age = uTime - aBirthTime;

          // If dead or future, project behind camera
          if (age < 0.0 || age > aLifeTime) {
            gl_Position = vec4(2.0, 2.0, 2.0, 0.0);
            gl_PointSize = 0.0;
            return;
          }

          // Pure ballistic integration in vacuum (zero air drag, zero turbulence)
          // p(t) = p0 + v0 * t + 0.5 * g * t^2
          vec3 pos = aOrigin + aVelocity * age + vec3(0.0, -0.5 * uGravity * age * age, 0.0);

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          // Attenuate point size by distance
          gl_PointSize = clamp(120.0 / -mvPosition.z, 2.0, 6.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;

        void main() {
          // Sharp circular grains, no blurry smoke haze
          vec2 coord = gl_PointCoord - vec2(0.5);
          if (length(coord) > 0.48) discard;
          gl_FragColor = vec4(uColor, 1.0);
        }
      `,
      transparent: false,
      depthWrite: true,
    });

    this.mesh = new THREE.Points(geometry, this.material);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  /**
   * Emits a sharp fan of ballistic particles from a wheel contact point.
   */
  public emitFromWheel(
    wheelX: number,
    wheelY: number,
    wheelZ: number,
    forwardX: number,
    forwardZ: number,
    speed: number,
    currentTime: number,
    count = 4
  ): void {
    if (Math.abs(speed) < 0.5) return;

    for (let c = 0; c < count; c++) {
      const idx = this.nextIndex;
      this.nextIndex = (this.nextIndex + 1) % this.particleCount;

      // Rooster tail: thrown backwards and upward
      const throwSpeed = Math.abs(speed) * (0.8 + Math.random() * 0.6);
      const spreadX = (Math.random() - 0.5) * 0.35;
      const spreadZ = (Math.random() - 0.5) * 0.35;

      const vy = 1.4 + Math.random() * 2.2; // vertical kick (m/s)
      const vx = -forwardX * throwSpeed + spreadX;
      const vz = -forwardZ * throwSpeed + spreadZ;

      // Ballistic flight time until landing back at ground: t = 2 * vy / g
      const flightDuration = (2.0 * vy) / LUNAR_GRAVITY;

      this.birthTimes[idx] = currentTime;
      this.lifeTimes[idx] = flightDuration;

      const i3 = idx * 3;
      this.origins[i3] = wheelX;
      this.origins[i3 + 1] = wheelY;
      this.origins[i3 + 2] = wheelZ;

      this.velocities[i3] = vx;
      this.velocities[i3 + 1] = vy;
      this.velocities[i3 + 2] = vz;
    }

    const geo = this.mesh.geometry;
    (geo.attributes.aBirthTime as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.aLifeTime as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.aOrigin as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.aVelocity as THREE.BufferAttribute).needsUpdate = true;
  }

  public update(timeSeconds: number): void {
    const uTime = this.material.uniforms['uTime'] as THREE.IUniform<number> | undefined;
    if (uTime) {
      uTime.value = timeSeconds;
    }
  }
}
