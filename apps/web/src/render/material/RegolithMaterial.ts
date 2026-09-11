import * as THREE from 'three';
import { LUNAR_ROAD_SEGMENTS } from '@adventuremnc/engine';
import { LUNAR_ROAD_WIDTH } from '@adventuremnc/shared';
import { createRegolithTextures, RegolithPbrTextures } from './RegolithTextures';

/**
 * Creates high-definition lunar regolith PBR material with:
 * - Micro-detail granular regolith normal map (sub-millimeter grain at close range)
 * - Macro-scale geological tonal variation (breaks repeating tile patterns)
 * - Slope-aware tri-planar texturing on steep crater walls
 * - Dynamic lunar road corridor splatting (compacted dual-rut tracks & pulverized berms)
 * - Retroreflective Opposition surge (Heiligenschein backscatter peak)
 */
export function createRegolithMaterial(sunLight: THREE.DirectionalLight): THREE.MeshStandardMaterial {
  const textures: RegolithPbrTextures = createRegolithTextures();

  const material = new THREE.MeshStandardMaterial({
    map: textures.albedoMap,
    normalMap: textures.normalMap,
    normalScale: new THREE.Vector2(2.5, 2.5),
    roughnessMap: textures.roughnessMap,
    roughness: 0.95,
    metalness: 0.04,
    flatShading: false,
  });

  // Pack road segment endpoints into Vector4 array for GPU shader: (startX, startZ, endX, endZ)
  const maxSegments = 12;
  const roadVectors: THREE.Vector4[] = [];
  for (let i = 0; i < maxSegments; i++) {
    const seg = LUNAR_ROAD_SEGMENTS[i];
    if (seg) {
      roadVectors.push(new THREE.Vector4(seg.startX, seg.startZ, seg.endX, seg.endZ));
    } else {
      roadVectors.push(new THREE.Vector4(0, 0, 0, 0));
    }
  }

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSunDirection = { value: new THREE.Vector3() };
    shader.uniforms.uDetailNormal = { value: textures.detailNormalMap };
    shader.uniforms.uMacroMap = { value: textures.macroNoiseMap };
    shader.uniforms.uRoadAlbedo = { value: textures.road.albedoMap };
    shader.uniforms.uRoadNormal = { value: textures.road.normalMap };
    shader.uniforms.uRoadRoughness = { value: textures.road.roughnessMap };
    shader.uniforms.uRoadSegments = { value: roadVectors };
    shader.uniforms.uNumRoadSegments = { value: LUNAR_ROAD_SEGMENTS.length };
    shader.uniforms.uRoadWidth = { value: LUNAR_ROAD_WIDTH };

    material.userData.uSunDirection = shader.uniforms.uSunDirection;

    // 1. Vertex Shader: Pass world position and object normal
    shader.vertexShader = `
      varying vec3 vWorldPos;
      varying vec3 vObjNormal;
      ${shader.vertexShader}
    `;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `
      #include <worldpos_vertex>
      vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vObjNormal = normal;
      `
    );

    // 2. Fragment Shader: Inject uniforms and road calculation logic
    shader.fragmentShader = `
      uniform vec3 uSunDirection;
      uniform sampler2D uDetailNormal;
      uniform sampler2D uMacroMap;
      uniform sampler2D uRoadAlbedo;
      uniform sampler2D uRoadNormal;
      uniform sampler2D uRoadRoughness;
      uniform vec4 uRoadSegments[12];
      uniform int uNumRoadSegments;
      uniform float uRoadWidth;

      varying vec3 vWorldPos;
      varying vec3 vObjNormal;

      struct RoadSplatInfo {
        float blend;
        vec2 uv;
        vec2 dir;
        vec2 perp;
      };

      RoadSplatInfo calculateRoadSplat(vec2 worldXz) {
        float minD = 9999.0;
        float bestLateral = 0.0;
        float bestT = 0.0;
        vec2 bestDir = vec2(0.0, 1.0);
        vec2 bestPerp = vec2(1.0, 0.0);

        for (int i = 0; i < 12; i++) {
          if (i >= uNumRoadSegments) break;
          vec2 a = uRoadSegments[i].xy;
          vec2 b = uRoadSegments[i].zw;
          vec2 pa = worldXz - a;
          vec2 ba = b - a;
          float lenSq = dot(ba, ba);
          if (lenSq > 0.001) {
            float h = clamp(dot(pa, ba) / lenSq, 0.0, 1.0);
            vec2 closest = a + ba * h;
            float dist = length(worldXz - closest);
            if (dist < minD) {
              minD = dist;
              vec2 dir = normalize(ba);
              vec2 perp = vec2(-dir.y, dir.x);
              bestLateral = dot(pa, perp);
              bestT = h * sqrt(lenSq);
              bestDir = dir;
              bestPerp = perp;
            }
          }
        }

        float halfW = uRoadWidth * 0.5;
        float blend = 1.0 - smoothstep(halfW * 0.8, halfW * 1.15, minD);
        vec2 uv = vec2(clamp(bestLateral / uRoadWidth + 0.5, 0.0, 1.0), bestT * 0.125);
        return RoadSplatInfo(blend, uv, bestDir, bestPerp);
      }

      ${shader.fragmentShader}
    `;

    // 3. Diffuse Color & Albedo Blending
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      #include <map_fragment>

      // Multi-scale macro noise: breaks up tiling repetition across landscape
      float macroNoise = texture2D(uMacroMap, vWorldPos.xz * 0.015).r;
      diffuseColor.rgb *= (0.84 + macroNoise * 0.32);

      // Tri-planar slope blending on steep crater walls
      float slopeFactor = 1.0 - clamp(abs(vObjNormal.y), 0.0, 1.0);
      if (slopeFactor > 0.3) {
        vec3 sideX = texture2D(map, vWorldPos.zy * 0.125).rgb;
        vec3 sideZ = texture2D(map, vWorldPos.xy * 0.125).rgb;
        vec3 cliffCol = mix(sideX, sideZ, 0.5);
        float cliffBlend = smoothstep(0.3, 0.7, slopeFactor) * 0.65;
        diffuseColor.rgb = mix(diffuseColor.rgb, cliffCol * 0.85, cliffBlend);
      }

      // Compacted Lunar Road Splatting
      RoadSplatInfo roadInfo = calculateRoadSplat(vWorldPos.xz);
      if (roadInfo.blend > 0.001) {
        vec4 roadCol = texture2D(uRoadAlbedo, roadInfo.uv);
        diffuseColor.rgb = mix(diffuseColor.rgb, roadCol.rgb, roadInfo.blend);
      }
      `
    );

    // 4. Normal Map: Micro-detail grain + Road rut normals
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `
      #include <normal_fragment_maps>

      // High-frequency regolith micro-grain (sub-millimeter granules at close range)
      vec3 microN = texture2D(uDetailNormal, vWorldPos.xz * 0.65).xyz * 2.0 - 1.0;
      normal = normalize(normal + microN * 0.35);

      // Compacted chevron tire tread rut normals oriented in true road tangent world coordinates
      if (roadInfo.blend > 0.001) {
        vec3 roadN = texture2D(uRoadNormal, roadInfo.uv).xyz * 2.0 - 1.0;
        vec3 worldPerturb = vec3(
          roadInfo.perp.x * roadN.x + roadInfo.dir.x * roadN.y,
          0.0,
          roadInfo.perp.y * roadN.x + roadInfo.dir.y * roadN.y
        );
        vec3 viewPerturb = (viewMatrix * vec4(worldPerturb, 0.0)).xyz;
        normal = normalize(normal + viewPerturb * (0.45 * roadInfo.blend));
      }
      `
    );

    // 5. Roughness Map: Compacted roadbed vs loose porous regolith
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `
      #include <roughnessmap_fragment>

      if (roadInfo.blend > 0.001) {
        float roadRough = texture2D(uRoadRoughness, roadInfo.uv).r;
        roughnessFactor = mix(roughnessFactor, roadRough, roadInfo.blend);
      }
      `
    );

    // 6. Opposition Effect / Heiligenschein at anti-solar point
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      #include <dithering_fragment>

      vec3 vDir = normalize(vViewPosition);
      vec3 lDir = normalize(uSunDirection);
      float phaseCos = dot(-vDir, -lDir);

      if (phaseCos > 0.85) {
        float surge = pow((phaseCos - 0.85) / 0.15, 5.0) * 0.44;
        gl_FragColor.rgb += vec3(surge * 0.28, surge * 0.26, surge * 0.24);
      }
      `
    );
  };

  material.userData.updateSun = () => {
    if (material.userData.uSunDirection) {
      const dir = new THREE.Vector3();
      sunLight.getWorldDirection(dir);
      (material.userData.uSunDirection.value as THREE.Vector3).copy(dir);
    }
  };

  return material;
}
