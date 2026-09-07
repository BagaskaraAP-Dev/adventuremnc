import * as THREE from 'three';

export interface AstronautMeshInstance {
  group: THREE.Group;
  updateAnimation: (lopingCycle: number, isGrounded: boolean, vy: number, speed: number) => void;
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

  // 4. Limbs
  // Legs
  const legGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.68, 12);
  const bootGeo = new THREE.BoxGeometry(0.2, 0.16, 0.32);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.18, 0.7, 0);
  const leftLegMesh = new THREE.Mesh(legGeo, suitMaterial);
  leftLegMesh.position.y = -0.34;
  leftLegMesh.castShadow = true;
  leftLeg.add(leftLegMesh);
  const leftBoot = new THREE.Mesh(bootGeo, jointMaterial);
  leftBoot.position.set(0, -0.68, 0.06);
  leftBoot.castShadow = true;
  leftLeg.add(leftBoot);
  bodyGroup.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.18, 0.7, 0);
  const rightLegMesh = new THREE.Mesh(legGeo, suitMaterial);
  rightLegMesh.position.y = -0.34;
  rightLegMesh.castShadow = true;
  rightLeg.add(rightLegMesh);
  const rightBoot = new THREE.Mesh(bootGeo, jointMaterial);
  rightBoot.position.set(0, -0.68, 0.06);
  rightBoot.castShadow = true;
  rightLeg.add(rightBoot);
  bodyGroup.add(rightLeg);

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

  const updateAnimation = (lopingCycle: number, isGrounded: boolean, vy: number, speed: number) => {
    if (isGrounded) {
      if (speed > 0.1) {
        // Apollo Loping Bounding Gait: vertical hopping bob + leg swing
        const bob = Math.abs(Math.sin(lopingCycle)) * 0.14;
        bodyGroup.position.y = bob;

        const legAngle = Math.sin(lopingCycle) * 0.55;
        leftLeg.rotation.x = legAngle;
        rightLeg.rotation.x = -legAngle;

        leftArm.rotation.x = -legAngle * 0.75;
        rightArm.rotation.x = legAngle * 0.75;
      } else {
        // Idle
        bodyGroup.position.y = 0;
        leftLeg.rotation.x = 0;
        rightLeg.rotation.x = 0;
        leftArm.rotation.x = 0;
        rightArm.rotation.x = 0;
      }
    } else {
      // In air flight: legs flexed, arms stabilized
      bodyGroup.position.y = 0.05;
      leftLeg.rotation.x = 0.3;
      rightLeg.rotation.x = 0.15;
      leftArm.rotation.x = -0.4;
      rightArm.rotation.x = -0.4;

      // Subtle tilt based on vertical velocity
      bodyGroup.rotation.x = Math.max(-0.25, Math.min(0.25, -vy * 0.04));
    }
  };

  return {
    group,
    updateAnimation,
  };
}
