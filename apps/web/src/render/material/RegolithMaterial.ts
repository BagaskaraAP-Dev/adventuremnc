import * as THREE from 'three';
import { REGOLITH_ALBEDO } from '@adventuremnc/shared';

/**
 * Creates lunar regolith PBR material with custom opposition effect (Heiligenschein).
 * Regolith albedo is low (~0.12), roughness high (~0.94).
 */
export function createRegolithMaterial(sunLight: THREE.DirectionalLight): THREE.MeshStandardMaterial {
  // Linear RGB albedo corresponding to 0.12 bond albedo
  const baseColor = new THREE.Color(REGOLITH_ALBEDO * 0.95, REGOLITH_ALBEDO * 0.92, REGOLITH_ALBEDO * 0.88);

  const material = new THREE.MeshStandardMaterial({
    color: baseColor,
    roughness: 0.94,
    metalness: 0.02,
    flatShading: false,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSunDirection = { value: new THREE.Vector3() };

    // Update sun direction in render loop or uniform hook
    material.userData.uSunDirection = shader.uniforms.uSunDirection;

    shader.fragmentShader = `
      uniform vec3 uSunDirection;
      ${shader.fragmentShader}
    `;

    // Inject opposition surge (Heiligenschein) at anti-solar point
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      #include <dithering_fragment>

      // Calculate phase angle: viewDir vs anti-sun dir
      vec3 vDir = normalize(vViewPosition);
      vec3 lDir = normalize(uSunDirection);
      float phaseCos = dot(-vDir, -lDir);

      if (phaseCos > 0.85) {
        // Sharp retroreflective backscatter peak
        float surge = pow((phaseCos - 0.85) / 0.15, 6.0) * 0.42;
        gl_FragColor.rgb += vec3(surge * 0.28, surge * 0.26, surge * 0.24);
      }
      `
    );
  };

  // Helper to sync sun direction
  material.userData.updateSun = () => {
    if (material.userData.uSunDirection) {
      const dir = new THREE.Vector3();
      sunLight.getWorldDirection(dir);
      (material.userData.uSunDirection.value as THREE.Vector3).copy(dir);
    }
  };

  return material;
}
