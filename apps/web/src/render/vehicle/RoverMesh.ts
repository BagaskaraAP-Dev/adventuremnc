import * as THREE from 'three';

export interface RoverMeshInstance {
  group: THREE.Group;
  getDriverSeatTransform: (targetPos: THREE.Vector3, targetQuat: THREE.Quaternion) => void;
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

  // Roll cage tubular frame with ample helmet clearance
  const cageGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.45, 8);
  const leftPillar = new THREE.Mesh(cageGeo, frameMaterial);
  leftPillar.position.set(-0.7, 0.8, 0.1);
  leftPillar.castShadow = true;
  bodyGroup.add(leftPillar);

  const rightPillar = new THREE.Mesh(cageGeo, frameMaterial);
  rightPillar.position.set(0.7, 0.8, 0.1);
  rightPillar.castShadow = true;
  bodyGroup.add(rightPillar);

  const topBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.48, 0.08, 0.08),
    frameMaterial
  );
  topBar.position.set(0, 1.5, 0.1);
  bodyGroup.add(topBar);

  // Ergonomic Apollo LRV Bucket Seats (cushion + backrest)
  const seatBaseGeo = new THREE.BoxGeometry(0.48, 0.08, 0.44);
  const seatBackGeo = new THREE.BoxGeometry(0.48, 0.52, 0.08);

  // Driver Seat
  const driverBase = new THREE.Mesh(seatBaseGeo, frameMaterial);
  driverBase.position.set(-0.35, 0.38, 0.02);
  driverBase.castShadow = true;
  bodyGroup.add(driverBase);

  const driverBack = new THREE.Mesh(seatBackGeo, frameMaterial);
  driverBack.position.set(-0.35, 0.64, 0.22);
  driverBack.castShadow = true;
  bodyGroup.add(driverBack);

  // Passenger Seat
  const passBase = new THREE.Mesh(seatBaseGeo, frameMaterial);
  passBase.position.set(0.35, 0.38, 0.02);
  passBase.castShadow = true;
  bodyGroup.add(passBase);

  const passBack = new THREE.Mesh(seatBackGeo, frameMaterial);
  passBack.position.set(0.35, 0.64, 0.22);
  passBack.castShadow = true;
  bodyGroup.add(passBack);

  // Dashboard Console (Center)
  const consoleGeo = new THREE.BoxGeometry(0.14, 0.62, 0.22);
  const consoleMesh = new THREE.Mesh(consoleGeo, frameMaterial);
  consoleMesh.position.set(0, 0.35, -0.32);
  bodyGroup.add(consoleMesh);

  // Steering Column and Wheel (In front of Driver)
  const columnGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8);
  const columnMesh = new THREE.Mesh(columnGeo, chassisMaterial);
  columnMesh.position.set(-0.35, 0.7, -0.35); // Angled down towards dashboard
  columnMesh.rotation.x = -0.6;
  bodyGroup.add(columnMesh);

  // Steering Wheel Assembly (In front of Driver, rotates with steering input)
  const steeringWheelGroup = new THREE.Group();
  steeringWheelGroup.position.set(-0.35, 0.82, -0.25);
  steeringWheelGroup.rotation.x = -0.6; // Tilted towards driver
  bodyGroup.add(steeringWheelGroup);

  const wheelGeo = new THREE.TorusGeometry(0.16, 0.025, 12, 24);
  const wheelMesh = new THREE.Mesh(wheelGeo, frameMaterial);
  wheelMesh.castShadow = true;
  steeringWheelGroup.add(wheelMesh);

  // Center hub & spokes for realistic steering wheel look
  const hubGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12);
  const hubMesh = new THREE.Mesh(hubGeo, chassisMaterial);
  hubMesh.rotation.x = Math.PI / 2;
  steeringWheelGroup.add(hubMesh);

  const spokeH = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.025, 0.015),
    frameMaterial
  );
  steeringWheelGroup.add(spokeH);

  const spokeV = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.14, 0.015),
    frameMaterial
  );
  spokeV.position.y = -0.06;
  steeringWheelGroup.add(spokeV);

  // Driver seat mount anchor: local point where the astronaut's butt sits
  const driverSeatMount = new THREE.Group();
  driverSeatMount.position.set(-0.35, 0.42, 0.02);
  driverSeatMount.rotation.set(0, Math.PI, 0); // Face forward towards -Z!
  bodyGroup.add(driverSeatMount);

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

  // Twin LED headlights + dynamic spotlights
  const headlampGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.12, 12);
  const leftLight = new THREE.Mesh(headlampGeo, lightMaterial);
  leftLight.rotation.x = Math.PI / 2;
  leftLight.position.set(-0.55, 0.22, -1.35);
  bodyGroup.add(leftLight);

  const rightLight = new THREE.Mesh(headlampGeo, lightMaterial);
  rightLight.rotation.x = Math.PI / 2;
  rightLight.position.set(0.55, 0.22, -1.35);
  bodyGroup.add(rightLight);

  const spotLeft = new THREE.SpotLight(0xffffff, 4.0, 50, Math.PI / 5, 0.35, 1.2);
  spotLeft.position.set(-0.55, 0.22, -1.35);
  spotLeft.target.position.set(-0.55, -0.5, -25);
  bodyGroup.add(spotLeft);
  bodyGroup.add(spotLeft.target);

  const spotRight = new THREE.SpotLight(0xffffff, 4.0, 50, Math.PI / 5, 0.35, 1.2);
  spotRight.position.set(0.55, 0.22, -1.35);
  spotRight.target.position.set(0.55, -0.5, -25);
  bodyGroup.add(spotRight);
  bodyGroup.add(spotRight.target);

  // Wheel sub-materials
  const spokeMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a6068,
    roughness: 0.4,
    metalness: 0.8,
  });

  const cleatMaterial = new THREE.MeshStandardMaterial({
    color: 0xe0e0e0,
    roughness: 0.3,
    metalness: 0.9,
  });

  // 2. Wheels (4 wire-mesh open lunar wheels with hubs, spokes, and titanium chevrons)
  function buildWheelMesh(): { wheelPivot: THREE.Group; wheelSpinGroup: THREE.Group } {
    const pivot = new THREE.Group();
    const spin = new THREE.Group();
    pivot.add(spin);

    // Torus tire: rotated into YZ plane so rolling axis is along X
    const tire = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.11, 14, 28),
      wheelMeshMaterial
    );
    tire.rotation.y = Math.PI / 2;
    tire.castShadow = true;
    spin.add(tire);

    // Center hubcap cylinder: axis aligned along X
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.24, 16),
      hubMaterial
    );
    hub.rotation.z = Math.PI / 2;
    hub.castShadow = true;
    spin.add(hub);

    // 6 Interior radial spokes so wheel rotation is unmistakably visible
    const spokeGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 6);
    for (let s = 0; s < 6; s++) {
      const spoke = new THREE.Mesh(spokeGeo, spokeMaterial);
      const angle = (s * Math.PI) / 3;
      spoke.position.set(0, Math.sin(angle) * 0.17, Math.cos(angle) * 0.17);
      spoke.rotation.x = angle;
      spin.add(spoke);
    }

    // 12 Outer titanium chevron cleats around rim
    const cleatGeo = new THREE.BoxGeometry(0.22, 0.025, 0.05);
    for (let c = 0; c < 12; c++) {
      const cleat = new THREE.Mesh(cleatGeo, cleatMaterial);
      const theta = (c * Math.PI * 2) / 12;
      cleat.position.set(0, Math.sin(theta) * 0.35, Math.cos(theta) * 0.35);
      cleat.rotation.x = -theta;
      spin.add(cleat);
    }

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

    // Steering on front wheels & cockpit steering wheel
    fl.wheelPivot.rotation.y = steerAngle;
    fr.wheelPivot.rotation.y = steerAngle;
    steeringWheelGroup.rotation.z = -steerAngle * 2.0;

    // Wheel spin rotation
    fl.wheelSpinGroup.rotation.x = wheelSpin;
    fr.wheelSpinGroup.rotation.x = wheelSpin;
    rl.wheelSpinGroup.rotation.x = wheelSpin;
    rr.wheelSpinGroup.rotation.x = wheelSpin;
  };

  const getDriverSeatTransform = (targetPos: THREE.Vector3, targetQuat: THREE.Quaternion) => {
    driverSeatMount.getWorldPosition(targetPos);
    driverSeatMount.getWorldQuaternion(targetQuat);
  };

  const getDriverSeatPosition = (target: THREE.Vector3) => {
    driverSeatMount.getWorldPosition(target);
  };

  return {
    group,
    getDriverSeatTransform,
    getDriverSeatPosition,
    updatePose,
  };
}
