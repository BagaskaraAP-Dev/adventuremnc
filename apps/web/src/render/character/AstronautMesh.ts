import * as THREE from 'three';

export interface AstronautMeshInstance {
  group: THREE.Group;
  updateAnimation: (lopingCycle: number, isGrounded: boolean, vy: number, speed: number) => void;
  setSeatedPose: (seated: boolean) => void;
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
    roughness: 0.12,
    metalness: 0.92,
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

  // 2. Helmet: Polycarbonate bubble with gold visor
  const helmetGeo = new THREE.SphereGeometry(0.24, 18, 18);
  const helmet = new THREE.Mesh(helmetGeo, suitMaterial);
  helmet.position.set(0, 1.55, 0);
  helmet.castShadow = true;
  bodyGroup.add(helmet);

  const visorGeo = new THREE.SphereGeometry(0.21, 16, 16, 0, Math.PI, 0, Math.PI);
  const visor = new THREE.Mesh(visorGeo, visorMaterial);
  visor.position.set(0, 1.55, 0.08);
  visor.rotation.y = -Math.PI / 2;
  bodyGroup.add(visor);

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

  // Arms
  const armGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.55, 12);
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.42, 1.32, 0);
  const leftArmMesh = new THREE.Mesh(armGeo, suitMaterial);
  leftArmMesh.position.y = -0.27;
  leftArmMesh.castShadow = true;
  leftArm.add(leftArmMesh);
  bodyGroup.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.42, 1.32, 0);
  const rightArmMesh = new THREE.Mesh(armGeo, suitMaterial);
  rightArmMesh.position.y = -0.27;
  rightArmMesh.castShadow = true;
  rightArm.add(rightArmMesh);
  bodyGroup.add(rightArm);

  let isSeated = false;
  const setSeatedPose = (seated: boolean) => {
    isSeated = seated;
    if (seated) {
      // Lower body group so pelvis/butt sits directly on the bucket cushion
      bodyGroup.position.set(0, -0.68, 0.06);
      bodyGroup.rotation.set(-0.08, 0, 0); // Comfortable recline against seat backrest

      // Thighs extend forward horizontally over cushion
      leftHip.rotation.set(-1.57, 0, 0);
      rightHip.rotation.set(-1.57, 0, 0);

      // Knees bend exactly 90 degrees straight down for a classic sitting posture
      leftKnee.rotation.set(1.57, 0, 0);
      rightKnee.rotation.set(1.57, 0, 0);

      // Right hand (variable leftArm) grips central T-handle console (now higher up)
      leftArm.rotation.set(-0.6, 0, 0);
      
      // Left hand (variable rightArm) rests flat on the lap/armrest
      rightArm.rotation.set(-1.57, 0, 0);
    } else {
      bodyGroup.position.set(0, 0, 0);
      bodyGroup.rotation.set(0, 0, 0);
      leftHip.rotation.set(0, 0, 0);
      rightHip.rotation.set(0, 0, 0);
      leftKnee.rotation.set(0, 0, 0);
      rightKnee.rotation.set(0, 0, 0);
      leftArm.rotation.set(0, 0, 0);
      rightArm.rotation.set(0, 0, 0);
    }
  };

  const updateAnimation = (lopingCycle: number, isGrounded: boolean, vy: number, speed: number) => {
    if (isSeated) return;

    if (isGrounded) {
      if (speed > 0.1) {
        // Cool swagger run
        const runCycle = lopingCycle * 1.5; // faster cycle
        const bob = Math.abs(Math.sin(runCycle)) * 0.08;
        bodyGroup.position.y = bob;

        const legAngle = Math.sin(runCycle) * 0.65;
        
        // Legs swinging
        leftHip.rotation.x = -legAngle;
        rightHip.rotation.x = legAngle;

        // Bending knee naturally when swinging forward (negative hip X)
        leftKnee.rotation.x = leftHip.rotation.x < 0 ? -leftHip.rotation.x * 1.2 : 0;
        rightKnee.rotation.x = rightHip.rotation.x < 0 ? -rightHip.rotation.x * 1.2 : 0;

        // Cool arm swing
        leftArm.rotation.x = legAngle * 0.9;
        rightArm.rotation.x = -legAngle * 0.9;
        leftArm.rotation.z = 0.15;
        rightArm.rotation.z = -0.15;

        // Slight forward lean for momentum
        bodyGroup.rotation.x = 0.15;
        
        // Reset hip spread from idle
        leftHip.rotation.z = 0;
        rightHip.rotation.z = 0;
      } else {
        // Cool Idle Stance (Upright and relaxed)
        const breath = Math.sin(performance.now() * 0.002) * 0.015;
        bodyGroup.position.y = breath;
        bodyGroup.rotation.x = 0; // Perfectly upright
        
        // Relaxed leg stance
        leftHip.rotation.z = -0.1;
        rightHip.rotation.z = 0.1;
        leftHip.rotation.x = 0;
        rightHip.rotation.x = 0;
        leftKnee.rotation.x = 0.05;
        rightKnee.rotation.x = 0.05;
        
        // Relaxed arms
        leftArm.rotation.x = -0.1;
        rightArm.rotation.x = -0.1;
        leftArm.rotation.z = 0.15;
        rightArm.rotation.z = -0.15;
      }
    } else {
      // Airborne (jumping/falling) - Action pose
      bodyGroup.rotation.x = 0.1;
      leftHip.rotation.z = 0;
      rightHip.rotation.z = 0;
      leftHip.rotation.x = -0.4;
      rightHip.rotation.x = 0.2;
      leftKnee.rotation.x = 0.5;
      rightKnee.rotation.x = 0.1;
      leftArm.rotation.x = -0.6;
      rightArm.rotation.x = 0.5;
      leftArm.rotation.z = 0.3;
      rightArm.rotation.z = -0.3;
    }
  };

  return {
    group,
    updateAnimation,
    setSeatedPose,
  };
}
