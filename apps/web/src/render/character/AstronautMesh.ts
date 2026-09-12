import * as THREE from 'three';

export interface AstronautMeshInstance {
  group: THREE.Group;
  updateAnimation: (lopingCycle: number, isGrounded: boolean, vy: number, speed: number) => void;
  setSeatedPose: (seated: boolean, steerAngle?: number) => void;
}

/**
 * Creates an authentically proportioned EVA spacesuit using clean geometric primitives.
 * Avoids raw BoxGeometry placeholders per Section 3 Rule 18.
 */
export function createAstronautMesh(): AstronautMeshInstance {
  const group = new THREE.Group();

  // Materials
  const suitMaterial = new THREE.MeshStandardMaterial({
    color: 0xdedede, // Apollo beta-cloth white
    roughness: 0.88,
    metalness: 0.05,
  });

  const jointMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a3d40, // Rubberized pressure seal joints
    roughness: 0.95,
    metalness: 0.0,
  });

  const visorMaterial = new THREE.MeshStandardMaterial({
    color: 0xdca832, // Gold coated anti-radiation thermal visor
    roughness: 0.22,
    metalness: 0.72,
  });

  const plssMaterial = new THREE.MeshStandardMaterial({
    color: 0x909498, // Silver MLI thermal insulation
    roughness: 0.45,
    metalness: 0.65,
  });

  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  // 1. Torso: Bulky pressure suit
  const torsoGeo = new THREE.CylinderGeometry(0.32, 0.28, 0.72, 16);
  const torso = new THREE.Mesh(torsoGeo, suitMaterial);
  torso.position.y = 1.05;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // 2. Helmet: concentric surfaces keep the visor outside the pressure shell.
  // The astronaut faces +Z, matching the boots and seated forward direction.
  const helmetGroup = new THREE.Group();
  helmetGroup.name = 'helmet';
  helmetGroup.position.set(0, 1.55, 0);
  bodyGroup.add(helmetGroup);

  const helmetGeo = new THREE.SphereGeometry(0.24, 48, 32);
  const helmet = new THREE.Mesh(helmetGeo, suitMaterial);
  helmet.name = 'helmet-shell';
  helmet.castShadow = true;
  helmetGroup.add(helmet);

  // A polar cap rotated from +Y to +Z is symmetric around the face.
  // Separate radii prevent the shell from clipping through the gold surface.
  const rimGeo = new THREE.SphereGeometry(0.246, 48, 24, 0, Math.PI * 2, 0, 1.04);
  rimGeo.rotateX(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, jointMaterial);
  rim.name = 'helmet-visor-rim';
  rim.castShadow = true;
  helmetGroup.add(rim);

  const visorGeo = new THREE.SphereGeometry(0.25, 48, 24, 0, Math.PI * 2, 0, 0.95);
  visorGeo.rotateX(Math.PI / 2);
  const visor = new THREE.Mesh(visorGeo, visorMaterial);
  visor.name = 'helmet-visor';
  visor.castShadow = true;
  helmetGroup.add(visor);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.09, 32), jointMaterial);
  collar.name = 'helmet-neck-seal';
  collar.position.y = -0.18;
  collar.castShadow = true;
  helmetGroup.add(collar);

  // 3. PLSS Backpack (Portable Life Support System)
  const plssGeo = new THREE.BoxGeometry(0.44, 0.68, 0.26);
  const plss = new THREE.Mesh(plssGeo, plssMaterial);
  plss.position.set(0, 1.18, -0.28);
  plss.castShadow = true;
  bodyGroup.add(plss);

  // 4. Limbs (Articulated hips and knees for natural gait and seated buggy posture)
  const thighGeo = new THREE.CylinderGeometry(0.125, 0.11, 0.35, 12);
  const shinGeo = new THREE.CylinderGeometry(0.11, 0.09, 0.34, 12);
  const bootGeo = new THREE.BoxGeometry(0.20, 0.14, 0.30);

  // Left Leg (Hip -> Thigh -> Knee -> Shin -> Boot)
  const leftHip = new THREE.Group();
  leftHip.position.set(-0.18, 0.70, 0);
  const leftThigh = new THREE.Mesh(thighGeo, suitMaterial);
  leftThigh.position.y = -0.175;
  leftThigh.castShadow = true;
  leftHip.add(leftThigh);

  const leftKnee = new THREE.Group();
  leftKnee.position.set(0, -0.35, 0);
  const leftShin = new THREE.Mesh(shinGeo, suitMaterial);
  leftShin.position.y = -0.17;
  leftShin.castShadow = true;
  leftKnee.add(leftShin);

  const leftBoot = new THREE.Mesh(bootGeo, jointMaterial);
  leftBoot.position.set(0, -0.34, 0.05);
  leftBoot.castShadow = true;
  leftKnee.add(leftBoot);

  leftHip.add(leftKnee);
  bodyGroup.add(leftHip);

  // Right Leg (Hip -> Thigh -> Knee -> Shin -> Boot)
  const rightHip = new THREE.Group();
  rightHip.position.set(0.18, 0.70, 0);
  const rightThigh = new THREE.Mesh(thighGeo, suitMaterial);
  rightThigh.position.y = -0.175;
  rightThigh.castShadow = true;
  rightHip.add(rightThigh);

  const rightKnee = new THREE.Group();
  rightKnee.position.set(0, -0.35, 0);
  const rightShin = new THREE.Mesh(shinGeo, suitMaterial);
  rightShin.position.y = -0.17;
  rightShin.castShadow = true;
  rightKnee.add(rightShin);

  const rightBoot = new THREE.Mesh(bootGeo, jointMaterial);
  rightBoot.position.set(0, -0.34, 0.05);
  rightBoot.castShadow = true;
  rightKnee.add(rightBoot);

  rightHip.add(rightKnee);
  bodyGroup.add(rightHip);

  // 5. Articulated Arms (Shoulder -> Upper Arm -> Elbow -> Forearm -> Glove)
  const upperArmGeo = new THREE.CylinderGeometry(0.10, 0.09, 0.28, 12);
  const forearmGeo = new THREE.CylinderGeometry(0.088, 0.078, 0.26, 12);
  const gloveGeo = new THREE.BoxGeometry(0.11, 0.10, 0.14);

  // Left Arm
  const leftShoulder = new THREE.Group();
  leftShoulder.position.set(-0.36, 1.30, 0);
  const leftUpperArmMesh = new THREE.Mesh(upperArmGeo, suitMaterial);
  leftUpperArmMesh.position.y = -0.14;
  leftUpperArmMesh.castShadow = true;
  leftShoulder.add(leftUpperArmMesh);

  const leftElbow = new THREE.Group();
  leftElbow.position.set(0, -0.28, 0);
  const leftForearmMesh = new THREE.Mesh(forearmGeo, suitMaterial);
  leftForearmMesh.position.y = -0.13;
  leftForearmMesh.castShadow = true;
  leftElbow.add(leftForearmMesh);

  const leftGlove = new THREE.Mesh(gloveGeo, jointMaterial);
  leftGlove.position.set(0, -0.27, 0.02);
  leftGlove.castShadow = true;
  leftElbow.add(leftGlove);

  leftShoulder.add(leftElbow);
  bodyGroup.add(leftShoulder);

  // Right Arm
  const rightShoulder = new THREE.Group();
  rightShoulder.position.set(0.36, 1.30, 0);
  const rightUpperArmMesh = new THREE.Mesh(upperArmGeo, suitMaterial);
  rightUpperArmMesh.position.y = -0.14;
  rightUpperArmMesh.castShadow = true;
  rightShoulder.add(rightUpperArmMesh);

  const rightElbow = new THREE.Group();
  rightElbow.position.set(0, -0.28, 0);
  const rightForearmMesh = new THREE.Mesh(forearmGeo, suitMaterial);
  rightForearmMesh.position.y = -0.13;
  rightForearmMesh.castShadow = true;
  rightElbow.add(rightForearmMesh);

  const rightGlove = new THREE.Mesh(gloveGeo, jointMaterial);
  rightGlove.position.set(0, -0.27, 0.02);
  rightGlove.castShadow = true;
  rightElbow.add(rightGlove);

  rightShoulder.add(rightElbow);
  bodyGroup.add(rightShoulder);

  let isSeated = false;
  const setSeatedPose = (seated: boolean, steerAngle: number = 0) => {
    isSeated = seated;
    if (seated) {
      // Lower body group so pelvis/butt sits directly on the bucket cushion
      bodyGroup.position.set(0, -0.68, 0.06);
      bodyGroup.rotation.set(-0.08, 0, 0); // Comfortable recline against seat backrest

      // Thighs extend forward horizontally over cushion
      leftHip.rotation.set(-1.57, 0, 0);
      rightHip.rotation.set(-1.57, 0, 0);

      // Knees bend exactly 90 degrees straight down for classic seated posture
      leftKnee.rotation.set(1.57, 0, 0);
      rightKnee.rotation.set(1.57, 0, 0);

      // Articulated arms reach forward and inward, gripping the steering wheel naturally
      const turn = steerAngle * 0.18;
      leftShoulder.rotation.set(-0.50 + turn, 1.00, turn * 0.3);
      leftElbow.rotation.set(-1.30 - turn * 0.2, 0, 0);
      rightShoulder.rotation.set(-0.50 - turn, -1.00, turn * 0.3);
      rightElbow.rotation.set(-1.30 + turn * 0.2, 0, 0);
    } else {
      bodyGroup.position.set(0, 0, 0);
      bodyGroup.rotation.set(0, 0, 0);
      leftHip.rotation.set(0, 0, 0);
      rightHip.rotation.set(0, 0, 0);
      leftKnee.rotation.set(0, 0, 0);
      rightKnee.rotation.set(0, 0, 0);
      leftShoulder.rotation.set(0, 0, 0);
      leftElbow.rotation.set(0, 0, 0);
      rightShoulder.rotation.set(0, 0, 0);
      rightElbow.rotation.set(0, 0, 0);
    }
  };

  const updateAnimation = (lopingCycle: number, isGrounded: boolean, _vy: number, speed: number) => {
    if (isSeated) return;

    if (isGrounded) {
      if (speed > 0.1) {
        // Cool dynamic swagger run / low-gravity loping
        const runCycle = lopingCycle * 1.5;
        const bob = Math.abs(Math.sin(runCycle)) * 0.08;
        bodyGroup.position.y = bob;

        const legAngle = Math.sin(runCycle) * 0.60;
        
        // Legs swinging
        leftHip.rotation.set(-legAngle, 0, 0);
        rightHip.rotation.set(legAngle, 0, 0);

        // Bending knee naturally when swinging forward
        leftKnee.rotation.x = leftHip.rotation.x < 0 ? -leftHip.rotation.x * 1.3 : 0.05;
        rightKnee.rotation.x = rightHip.rotation.x < 0 ? -rightHip.rotation.x * 1.3 : 0.05;

        // Natural arm swing with articulated elbows
        leftShoulder.rotation.set(legAngle * 0.8, 0, 0.12);
        rightShoulder.rotation.set(-legAngle * 0.8, 0, -0.12);
        leftElbow.rotation.set(-0.45 - Math.max(0, legAngle * 0.3), 0, 0);
        rightElbow.rotation.set(-0.45 - Math.max(0, -legAngle * 0.3), 0, 0);

        // Athletic forward lean for momentum
        bodyGroup.rotation.x = 0.10;
        
        // Reset hip spread from idle
        leftHip.rotation.z = 0;
        rightHip.rotation.z = 0;
      } else {
        // Upright, heroic relaxed stance
        const breath = Math.sin(performance.now() * 0.002) * 0.012;
        bodyGroup.position.y = breath;
        bodyGroup.rotation.x = 0; // Perfectly upright
        
        // Relaxed leg stance
        leftHip.rotation.set(0, 0, -0.08);
        rightHip.rotation.set(0, 0, 0.08);
        leftKnee.rotation.set(0.04, 0, 0);
        rightKnee.rotation.set(0.04, 0, 0);
        
        // Relaxed arms with natural elbow bend
        leftShoulder.rotation.set(0.02, 0, 0.12);
        rightShoulder.rotation.set(0.02, 0, -0.12);
        leftElbow.rotation.set(-0.22, 0, 0);
        rightElbow.rotation.set(-0.22, 0, 0);
      }
    } else {
      // Airborne (jumping/falling in 1/6g) - Action pose
      bodyGroup.rotation.x = 0.08;
      leftHip.rotation.set(-0.35, 0, -0.05);
      rightHip.rotation.set(0.15, 0, 0.05);
      leftKnee.rotation.set(0.45, 0, 0);
      rightKnee.rotation.set(0.20, 0, 0);
      leftShoulder.rotation.set(-0.40, 0, 0.22);
      rightShoulder.rotation.set(0.30, 0, -0.22);
      leftElbow.rotation.set(-0.50, 0, 0);
      rightElbow.rotation.set(-0.35, 0, 0);
    }
  };

  return {
    group,
    updateAnimation,
    setSeatedPose,
  };
}
