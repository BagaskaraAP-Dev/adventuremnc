import * as THREE from 'three';

export interface RoverMeshInstance {
  group: THREE.Group;
  getDriverSeatPosition: (target: THREE.Vector3) => void;
  updatePose: (
    x: number,
    y: number,
    z: number,
    yaw: number,
    pitch: number,
    roll: number,
    steerAngle: number,
    wheelSpin: number
  ) => void;
}

/**
 * Creates an authentically modeled lunar mining rover using geometric primitives.
 */
export function createRoverMesh(): RoverMeshInstance {
  const group = new THREE.Group();

  // Materials
  const chassisMaterial = new THREE.MeshStandardMaterial({
    color: 0xcca030, // Gold thermal multi-layer insulation (MLI)
    roughness: 0.35,
    metalness: 0.85,
  });

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x2e3338, // Matte dark titanium alloy frame
    roughness: 0.7,
    metalness: 0.6,
  });

  const wheelMeshMaterial = new THREE.MeshStandardMaterial({
    color: 0x858e96, // Zinc-coated wire mesh tire
    roughness: 0.5,
    metalness: 0.7,
  });

  const hubMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1c1e,
    roughness: 0.8,
    metalness: 0.3,
  });

  const lightMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });

  // 1. Chassis Body
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const mainPlatform = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.22, 2.6),
    chassisMaterial
  );
  mainPlatform.castShadow = true;
  mainPlatform.receiveShadow = true;
  bodyGroup.add(mainPlatform);

  // Roll cage tubular frame
  const cageGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8);
  const leftPillar = new THREE.Mesh(cageGeo, frameMaterial);
  leftPillar.position.set(-0.7, 0.65, 0.1);
  leftPillar.castShadow = true;
  bodyGroup.add(leftPillar);

  const rightPillar = new THREE.Mesh(cageGeo, frameMaterial);
  rightPillar.position.set(0.7, 0.65, 0.1);
  rightPillar.castShadow = true;
  bodyGroup.add(rightPillar);

  const topBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.48, 0.08, 0.08),
    frameMaterial
  );
  topBar.position.set(0, 1.25, 0.1);
  bodyGroup.add(topBar);

  // Seats (Driver and Passenger)
  const seatGeo = new THREE.BoxGeometry(0.5, 0.55, 0.45);
  const driverSeat = new THREE.Mesh(seatGeo, frameMaterial);
  driverSeat.position.set(-0.35, 0.35, 0.05);
  driverSeat.castShadow = true;
  bodyGroup.add(driverSeat);

  const passSeat = new THREE.Mesh(seatGeo, frameMaterial);
  passSeat.position.set(0.35, 0.35, 0.05);
  passSeat.castShadow = true;
  bodyGroup.add(passSeat);

  // High gain dish antenna
  const antennaPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 1.1, 8),
    frameMaterial
  );
  antennaPole.position.set(-0.6, 0.75, 1.1);
  bodyGroup.add(antennaPole);

  const dishGeo = new THREE.CylinderGeometry(0.32, 0.05, 0.08, 16);
  const dish = new THREE.Mesh(dishGeo, chassisMaterial);
  dish.position.set(-0.6, 1.35, 1.1);
  dish.rotation.x = 0.5;
  bodyGroup.add(dish);

  // Twin LED headlights
  const headlampGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.12, 12);
  const leftLight = new THREE.Mesh(headlampGeo, lightMaterial);
  leftLight.rotation.x = Math.PI / 2;
  leftLight.position.set(-0.55, 0.22, -1.35);
  bodyGroup.add(leftLight);

  const rightLight = new THREE.Mesh(headlampGeo, lightMaterial);
  rightLight.rotation.x = Math.PI / 2;
  rightLight.position.set(0.55, 0.22, -1.35);
  bodyGroup.add(rightLight);

  // 2. Wheels (4 wire-mesh open lunar wheels with hubs)
  function buildWheelMesh(): { wheelPivot: THREE.Group; wheelSpinGroup: THREE.Group } {
    const pivot = new THREE.Group();
    const spin = new THREE.Group();
    pivot.add(spin);

    // Torus tire
    const tire = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.12, 12, 24),
      wheelMeshMaterial
    );
    tire.castShadow = true;
    spin.add(tire);

    // Center hubcap
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.22, 16),
      hubMaterial
    );
    hub.rotation.x = Math.PI / 2;
    hub.castShadow = true;
    spin.add(hub);

    return { wheelPivot: pivot, wheelSpinGroup: spin };
  }

  const halfTrack = 1.8 * 0.5;
  const halfBase = 2.4 * 0.5;

  const fl = buildWheelMesh();
  fl.wheelPivot.position.set(-halfTrack, -0.15, -halfBase);
  bodyGroup.add(fl.wheelPivot);

  const fr = buildWheelMesh();
  fr.wheelPivot.position.set(halfTrack, -0.15, -halfBase);
  bodyGroup.add(fr.wheelPivot);

  const rl = buildWheelMesh();
  rl.wheelPivot.position.set(-halfTrack, -0.15, halfBase);
  bodyGroup.add(rl.wheelPivot);

  const rr = buildWheelMesh();
  rr.wheelPivot.position.set(halfTrack, -0.15, halfBase);
  bodyGroup.add(rr.wheelPivot);

  const updatePose = (
    x: number,
    y: number,
    z: number,
    yaw: number,
    pitch: number,
    roll: number,
    steerAngle: number,
    wheelSpin: number
  ) => {
    group.position.set(x, y, z);
    group.rotation.set(0, yaw, 0, 'YXZ');

    // Pitch and roll on body group relative to chassis yaw
    bodyGroup.rotation.x = pitch;
    bodyGroup.rotation.z = roll;

    // Steering on front wheels
    fl.wheelPivot.rotation.y = steerAngle;
    fr.wheelPivot.rotation.y = steerAngle;

    // Wheel spin rotation
    fl.wheelSpinGroup.rotation.x = wheelSpin;
    fr.wheelSpinGroup.rotation.x = wheelSpin;
    rl.wheelSpinGroup.rotation.x = wheelSpin;
    rr.wheelSpinGroup.rotation.x = wheelSpin;
  };

  const getDriverSeatPosition = (target: THREE.Vector3) => {
    driverSeat.getWorldPosition(target);
    target.y += 0.2;
  };

  return {
    group,
    getDriverSeatPosition,
    updatePose,
  };
}
