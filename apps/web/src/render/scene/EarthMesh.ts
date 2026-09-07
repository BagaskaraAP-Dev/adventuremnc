import * as THREE from 'three';

export interface EarthSystem {
  group: THREE.Group;
  update: (dt: number) => void;
}

/**
 * Creates a photorealistic, authentic Earth system visible in the lunar sky.
 * Includes:
 * 1. Detailed procedural geographic continents (Africa, Europe, Americas, Asia, Australia, Antarctica)
 * 2. Vibrant oceans with continental shelf depths and specular gloss
 * 3. Night lights (golden city clusters illuminated only on the dark hemisphere)
 * 4. Concentric 3D swirling cloud layer with cyclones and tropical convergence bands
 * 5. Rayleigh scattering atmospheric limb glow (electric blue Fresnel halo)
 * 6. Authentic 23.4° axial tilt and smooth celestial rotation
 */
export function createRealisticEarth(
  sunLight: THREE.DirectionalLight,
  earthRadius: number
): EarthSystem {
  const rootGroup = new THREE.Group();

  // 23.44° axial tilt relative to lunar orbital plane
  const tiltGroup = new THREE.Group();
  tiltGroup.rotation.z = (23.44 * Math.PI) / 180;
  tiltGroup.rotation.x = (5.14 * Math.PI) / 180;
  rootGroup.add(tiltGroup);

  // 1. Generate High-Res Procedural Earth Textures
  const dayTexture = createDayTexture();
  const nightTexture = createNightTexture();
  const cloudTexture = createCloudTexture();

  // 2. Earth Surface Mesh
  const surfaceGeo = new THREE.SphereGeometry(earthRadius, 64, 64);
  const sunDirUniform = { value: new THREE.Vector3() };

  const surfaceMat = new THREE.MeshStandardMaterial({
    map: dayTexture,
    roughness: 0.85,
    metalness: 0.1,
  });

  // Custom shader hook: render city night lights on the dark hemisphere
  surfaceMat.onBeforeCompile = (shader) => {
    shader.uniforms.uSunDirection = sunDirUniform;
    shader.uniforms.uNightTexture = { value: nightTexture };

    shader.fragmentShader = `
      uniform vec3 uSunDirection;
      uniform sampler2D uNightTexture;
      ${shader.fragmentShader}
    `;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      #include <dithering_fragment>

      // Calculate light incidence for day/night terminator
      vec3 worldNormalVec = normalize(vNormal);
      vec3 lightDirVec = normalize(uSunDirection);
      float sunDot = dot(worldNormalVec, lightDirVec);

      // Night light threshold: active on the unlit side of Earth
      if (sunDot < 0.15) {
        float nightStrength = smoothstep(0.15, -0.25, sunDot);
        vec3 nightLights = texture2D(uNightTexture, vUv).rgb;
        gl_FragColor.rgb += nightLights * nightStrength * 1.8;
      }

      // Subtle atmospheric ocean specular reflection
      if (sunDot > 0.0) {
        vec3 viewDirVec = normalize(vViewPosition);
        vec3 halfVec = normalize(lightDirVec - viewDirVec);
        float spec = pow(max(dot(worldNormalVec, halfVec), 0.0), 32.0);
        // Ocean mask: regions with low red channel are water
        vec3 surfCol = texture2D(map, vUv).rgb;
        if (surfCol.b > surfCol.r * 1.3) {
          gl_FragColor.rgb += vec3(0.6, 0.8, 1.0) * spec * sunDot * 0.7;
        }
      }
      `
    );
  };

  const surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
  tiltGroup.add(surfaceMesh);

  // 3. Realistic 3D Cloud Layer (Concentric sphere slightly above surface)
  const cloudRadius = earthRadius * 1.012;
  const cloudGeo = new THREE.SphereGeometry(cloudRadius, 64, 64);
  const cloudMat = new THREE.MeshStandardMaterial({
    map: cloudTexture,
    transparent: true,
    opacity: 0.92,
    roughness: 0.95,
    metalness: 0.0,
    blending: THREE.NormalBlending,
    depthWrite: false,
  });

  const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
  tiltGroup.add(cloudMesh);

  // 4. Atmospheric Rayleigh Scattering Halo (Electric blue limb glow)
  const atmoRadius = earthRadius * 1.045;
  const atmoGeo = new THREE.SphereGeometry(atmoRadius, 48, 48);

  const atmoMat = new THREE.ShaderMaterial({
    uniforms: {
      uSunDirection: sunDirUniform,
      uAtmoColor: { value: new THREE.Color(0x4ca8ff) },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDirection;
      uniform vec3 uAtmoColor;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vec3 viewDir = normalize(vViewPosition);
        vec3 norm = normalize(vNormal);

        // Fresnel limb falloff: glow increases near silhouette edges
        float rim = 1.0 - max(dot(viewDir, norm), 0.0);
        float glow = pow(rim, 3.2) * 1.4;

        // Enhance brightness towards sunlit side
        vec3 lightDir = normalize(uSunDirection);
        float sunFacing = dot(norm, lightDir) * 0.5 + 0.5;

        vec3 col = uAtmoColor * glow * (0.6 + sunFacing * 0.8);
        float alpha = clamp(glow * (0.4 + sunFacing * 0.6), 0.0, 0.95);

        gl_FragColor = vec4(col, alpha);
      }
    `,
    blending: THREE.AdditiveBlending,
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
  });

  const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
  tiltGroup.add(atmoMesh);

  // Animation Update
  const update = (dt: number) => {
    // Slow authentic Earth axial rotation (west to east)
    surfaceMesh.rotation.y += dt * 0.008;
    // Cloud systems drift slightly faster for atmospheric parallax
    cloudMesh.rotation.y += dt * 0.0095;

    // Sync light direction
    sunLight.getWorldDirection(sunDirUniform.value);
    sunDirUniform.value.negate(); // Direction towards sun
  };

  return {
    group: rootGroup,
    update,
  };
}

/**
 * Generates an authentic equirectangular 2048x1024 diffuse map of Earth.
 */
function createDayTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 1. Deep Ocean Base with Depth Gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0.0, '#0a2142'); // Polar cold ocean
  oceanGrad.addColorStop(0.2, '#0c2e5e'); // Subpolar
  oceanGrad.addColorStop(0.5, '#0e3870'); // Tropical deep blue
  oceanGrad.addColorStop(0.8, '#0c2e5e');
  oceanGrad.addColorStop(1.0, '#0a2142');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // Helper to convert Lat/Lon to Canvas X/Y
  const toX = (lonDeg: number) => ((lonDeg + 180) / 360) * width;
  const toY = (latDeg: number) => ((90 - latDeg) / 180) * height;

  // Helper for continental shelf shallow turquoise reefs
  function drawShelf(coords: [number, number][], blur = 18) {
    if (coords.length === 0) return;
    const first = coords[0]!;
    ctx.save();
    ctx.filter = `blur(${blur}px)`;
    ctx.fillStyle = 'rgba(25, 105, 175, 0.65)';
    ctx.beginPath();
    ctx.moveTo(toX(first[0]), toY(first[1]));
    for (let i = 1; i < coords.length; i++) {
      const pt = coords[i]!;
      ctx.lineTo(toX(pt[0]), toY(pt[1]));
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Helper to draw filled continent polygon
  function drawLandmass(
    coords: [number, number][],
    baseColor: string,
    desertGradient?: { x: number; y: number; r: number; color: string }[]
  ) {
    if (coords.length === 0) return;
    const first = coords[0]!;
    ctx.beginPath();
    ctx.moveTo(toX(first[0]), toY(first[1]));
    for (let i = 1; i < coords.length; i++) {
      const pt = coords[i]!;
      ctx.lineTo(toX(pt[0]), toY(pt[1]));
    }
    ctx.closePath();
    ctx.fillStyle = baseColor;
    ctx.fill();

    if (desertGradient) {
      for (const d of desertGradient) {
        const rad = ctx.createRadialGradient(toX(d.x), toY(d.y), 5, toX(d.x), toY(d.y), d.r);
        rad.addColorStop(0, d.color);
        rad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rad;
        ctx.fill();
      }
    }
  }

  // --- CONTINENT COORDINATES (Longitude, Latitude) ---

  // Africa
  const africaCoords: [number, number][] = [
    [-17, 15], [-17, 21], [-13, 28], [-6, 36], [10, 37], [25, 32],
    [32, 31], [35, 27], [43, 13], [51, 11], [46, 5], [41, -4],
    [36, -11], [33, -27], [26, -34], [18, -34], [12, -20], [9, -4],
    [4, 5], [-5, 5], [-12, 8], [-17, 15]
  ];
  drawShelf(africaCoords, 24);
  drawLandmass(africaCoords, '#2e5a27', [
    // Sahara Desert
    { x: 18, y: 24, r: 160, color: '#cda25b' },
    { x: 2, y: 22, r: 120, color: '#d8b068' },
    // Kalahari Desert
    { x: 22, y: -24, r: 60, color: '#b58c4c' },
  ]);

  // Eurasia (Europe + Asia)
  const eurasiaCoords: [number, number][] = [
    [-9, 36], [-9, 43], [-1, 46], [-5, 48], [2, 51], [8, 54],
    [5, 62], [15, 68], [28, 71], [45, 68], [70, 73], [100, 77],
    [130, 72], [170, 66], [178, 65], [162, 54], [140, 48], [130, 38],
    [122, 30], [108, 22], [105, 10], [98, 4], [92, 16], [80, 13],
    [72, 21], [68, 25], [60, 25], [52, 27], [44, 13], [44, 28],
    [35, 32], [28, 41], [14, 40], [2, 36], [-5, 36], [-9, 36]
  ];
  drawShelf(eurasiaCoords, 26);
  drawLandmass(eurasiaCoords, '#32632a', [
    // Arabian Desert
    { x: 45, y: 22, r: 90, color: '#cfa55e' },
    // Gobi Desert / Central Asia
    { x: 95, y: 42, r: 130, color: '#a89462' },
    // Tibetan Plateau / Himalayas
    { x: 86, y: 32, r: 70, color: '#e8edf2' },
  ]);

  // Scandinavia & UK
  const scandiCoords: [number, number][] = [
    [5, 58], [10, 56], [18, 56], [22, 65], [28, 70], [18, 68], [6, 62]
  ];
  drawLandmass(scandiCoords, '#254e20');

  const ukCoords: [number, number][] = [
    [-5, 50], [-2, 51], [1, 53], [-2, 58], [-6, 56], [-5, 50]
  ];
  drawLandmass(ukCoords, '#2d5e23');

  // North America
  const northAmericaCoords: [number, number][] = [
    [-168, 66], [-150, 71], [-130, 70], [-95, 73], [-80, 62],
    [-65, 45], [-70, 42], [-76, 35], [-81, 25], [-87, 21],
    [-97, 26], [-105, 20], [-104, 28], [-117, 32], [-124, 40],
    [-125, 50], [-135, 57], [-160, 56], [-168, 66]
  ];
  drawShelf(northAmericaCoords, 26);
  drawLandmass(northAmericaCoords, '#336128', [
    // American Southwest / Great Basin Desert
    { x: -112, y: 35, r: 90, color: '#b9975b' },
    // Rocky Mountain Snow peaks
    { x: -115, y: 45, r: 60, color: '#dee4eb' },
  ]);

  // South America
  const southAmericaCoords: [number, number][] = [
    [-77, 8], [-62, 10], [-50, -1], [-35, -5], [-37, -12],
    [-42, -23], [-53, -34], [-65, -45], [-68, -55], [-74, -50],
    [-72, -38], [-71, -30], [-76, -15], [-81, -5], [-77, 8]
  ];
  drawShelf(southAmericaCoords, 24);
  drawLandmass(southAmericaCoords, '#1b5420', [
    // Amazon Basin rich dark rainforest
    { x: -60, y: -4, r: 130, color: '#144619' },
    // Andes Mountain spine
    { x: -72, y: -25, r: 45, color: '#91826b' },
  ]);

  // Australia
  const australiaCoords: [number, number][] = [
    [114, -22], [122, -16], [136, -12], [142, -11], [146, -20],
    [153, -28], [150, -37], [138, -35], [130, -32], [116, -34],
    [113, -26], [114, -22]
  ];
  drawShelf(australiaCoords, 22);
  drawLandmass(australiaCoords, '#43612a', [
    // Iconic Red Outback Center
    { x: 132, y: -25, r: 85, color: '#b85429' },
  ]);

  // Antarctica (Solid white glacial ice sheet)
  const antarcticaCoords: [number, number][] = [
    [-180, -65], [-120, -70], [-60, -64], [0, -68],
    [60, -66], [120, -65], [180, -65], [180, -90], [-180, -90]
  ];
  drawLandmass(antarcticaCoords, '#eaf1f8');

  // Greenland (Glacial Ice)
  const greenlandCoords: [number, number][] = [
    [-52, 60], [-42, 60], [-25, 70], [-20, 80], [-40, 83], [-58, 77], [-52, 60]
  ];
  drawLandmass(greenlandCoords, '#edf3f9');

  // Indonesia & Maritime Continent Islands
  const islands: [number, number, number][] = [
    [98, 2, 14],   // Sumatra
    [110, -7, 13], // Java
    [114, 0, 18],  // Borneo
    [120, -2, 12], // Sulawesi
    [136, -4, 22], // New Guinea
    [142, -42, 7], // Tasmania
    [174, -41, 10],// New Zealand South
    [176, -38, 9], // New Zealand North
    [138, 36, 16], // Japan Honshu
    [142, 43, 10], // Japan Hokkaido
    [-76, 22, 14], // Cuba
    [47, -19, 15], // Madagascar
  ];

  ctx.fillStyle = '#2b5c25';
  for (const island of islands) {
    const lon = island[0];
    const lat = island[1];
    const r = island[2];
    ctx.beginPath();
    ctx.arc(toX(lon), toY(lat), r * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Generates an authentic equirectangular city lights map (glowing amber civilization night dots).
 */
function createNightTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Pure dark space black
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const toX = (lonDeg: number) => ((lonDeg + 180) / 360) * width;
  const toY = (latDeg: number) => ((90 - latDeg) / 180) * height;

  // Helper to draw realistic radiant city cluster
  function drawCity(lon: number, lat: number, intensity: number, radius: number) {
    const cx = toX(lon);
    const cy = toY(lat);

    const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, radius);
    grad.addColorStop(0.0, `rgba(255, 235, 170, ${intensity})`);
    grad.addColorStop(0.3, `rgba(255, 185, 70, ${intensity * 0.7})`);
    grad.addColorStop(0.7, `rgba(220, 130, 30, ${intensity * 0.25})`);
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Major Global Urban Clusters
  const cityClusters: [number, number, number, number][] = [
    // Europe
    [0.1, 51.5, 1.0, 16],    // London
    [2.3, 48.8, 1.0, 15],    // Paris
    [6.8, 51.2, 1.0, 22],    // Rhine-Ruhr
    [13.4, 52.5, 0.9, 13],   // Berlin
    [-3.7, 40.4, 0.9, 12],   // Madrid
    [9.2, 45.5, 0.9, 14],    // Milan / Po Valley
    [37.6, 55.7, 1.0, 18],   // Moscow
    // North America
    [-74.0, 40.7, 1.0, 25],  // New York / BosWash
    [-87.6, 41.8, 0.95, 18], // Chicago
    [-118.2, 34.0, 1.0, 22], // Los Angeles
    [-122.4, 37.7, 0.9, 14], // San Francisco
    [-95.3, 29.7, 0.9, 15],  // Houston
    [-80.2, 25.8, 0.85, 12], // Miami
    [-123.1, 49.2, 0.8, 11], // Vancouver
    // East Asia
    [139.7, 35.6, 1.0, 28],  // Tokyo Mega-cluster
    [126.9, 37.5, 1.0, 20],  // Seoul
    [121.4, 31.2, 1.0, 26],  // Shanghai / Yangtze Delta
    [116.4, 39.9, 1.0, 22],  // Beijing
    [113.2, 23.1, 1.0, 26],  // Pearl River / Guangzhou / Hong Kong
    [121.5, 25.0, 0.9, 12],  // Taipei
    // South Asia
    [72.8, 19.0, 1.0, 22],   // Mumbai
    [77.2, 28.6, 1.0, 24],   // Delhi
    [88.3, 22.5, 0.9, 16],   // Kolkata
    [77.5, 12.9, 0.95, 16],  // Bengaluru
    // Middle East & Africa
    [31.2, 30.0, 1.0, 18],   // Cairo / Nile
    [55.3, 25.2, 1.0, 16],   // Dubai
    [28.0, -26.2, 0.85, 14], // Johannesburg
    // South America & Oceania
    [-46.6, -23.5, 0.95, 22],// São Paulo
    [-43.1, -22.9, 0.9, 16], // Rio de Janeiro
    [-58.3, -34.6, 0.9, 16], // Buenos Aires
    [151.2, -33.8, 0.9, 16], // Sydney
    [144.9, -37.8, 0.85, 14],// Melbourne
    [106.8, -6.2, 0.95, 18], // Jakarta
    [100.5, 13.7, 0.9, 15],  // Bangkok
    [103.8, 1.3, 1.0, 12],   // Singapore
  ];

  for (const cluster of cityClusters) {
    const lon = cluster[0];
    const lat = cluster[1];
    const intens = cluster[2];
    const r = cluster[3];
    drawCity(lon, lat, intens, r);
  }

  // Add random highway arteries & smaller towns across populated continents
  ctx.fillStyle = 'rgba(255, 200, 90, 0.55)';
  for (let i = 0; i < 450; i++) {
    let lon = (Math.random() - 0.5) * 360;
    let lat = (Math.random() - 0.5) * 120;
    if (Math.random() < 0.4) {
      lon = Math.random() * 50 - 10;
      lat = Math.random() * 25 + 35; // Europe
    } else if (Math.random() < 0.7) {
      lon = Math.random() * 40 - 100;
      lat = Math.random() * 20 + 28; // US East
    }
    ctx.fillRect(toX(lon), toY(lat), 1.5, 1.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Generates an authentic atmospheric cloud deck with cyclonic spirals and ITCZ bands.
 */
function createCloudTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, width, height);

  const toX = (lonDeg: number) => ((lonDeg + 180) / 360) * width;
  const toY = (latDeg: number) => ((90 - latDeg) / 180) * height;

  // 1. Equatorial ITCZ Cloud Clusters (Linear wavy band around equator)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  for (let lon = -180; lon <= 180; lon += 6) {
    const lat = Math.sin((lon / 180) * Math.PI * 4) * 4 + 2;
    const r = 25 + Math.random() * 35;
    ctx.beginPath();
    ctx.arc(toX(lon), toY(lat), r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Swirling Cyclones / Hurricanes with spiral arms
  function drawCyclone(centerLon: number, centerLat: number, radius: number, isNorthern: boolean) {
    const cx = toX(centerLon);
    const cy = toY(centerLat);
    const arms = 3;
    const dir = isNorthern ? 1 : -1;

    for (let a = 0; a < arms; a++) {
      const baseAngle = (a * 2 * Math.PI) / arms;
      ctx.beginPath();
      for (let step = 0; step < 40; step++) {
        const progress = step / 40;
        const angle = baseAngle + progress * Math.PI * 2.2 * dir;
        const dist = progress * radius;
        const px = cx + Math.cos(angle) * dist;
        const py = cy + Math.sin(angle) * dist * 0.7;

        const puffRadius = 12 + progress * 24;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.85 - progress * 0.4})`;
        ctx.beginPath();
        ctx.arc(px, py, puffRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Cyclone eye (clear center)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Draw ocean cyclones
  drawCyclone(-45, 28, 140, true);   // Atlantic Hurricane
  drawCyclone(140, 22, 160, true);   // Pacific Typhoon
  drawCyclone(75, -18, 130, false);  // Indian Ocean Cyclone
  drawCyclone(-135, 45, 120, true);  // Gulf of Alaska Front

  // 3. Mid-Latitude Weather Fronts (Sweeping diagonal bands)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 32;
  ctx.lineCap = 'round';

  const frontalCurves: [number, number][][] = [
    [[-80, 30], [-55, 45], [-25, 55], [10, 60]],
    [[120, 25], [145, 40], [175, 52]],
    [[-140, -35], [-100, -45], [-60, -52], [-20, -48]],
    [[30, -40], [70, -50], [110, -48], [150, -52]],
  ];

  for (const curve of frontalCurves) {
    if (curve.length === 0) continue;
    const first = curve[0]!;
    ctx.beginPath();
    ctx.moveTo(toX(first[0]), toY(first[1]));
    for (let i = 1; i < curve.length; i++) {
      const pt = curve[i]!;
      ctx.lineTo(toX(pt[0]), toY(pt[1]));
    }
    ctx.stroke();
  }

  // Soften clouds
  ctx.filter = 'blur(6px)';
  ctx.drawImage(canvas, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
