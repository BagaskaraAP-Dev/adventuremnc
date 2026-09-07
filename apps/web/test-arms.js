import * as THREE from 'three';
const arm = new THREE.Group();
const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.55));
mesh.position.y = -0.27;
arm.add(mesh);

arm.rotation.x = -1.57; // -90 degrees
arm.updateMatrixWorld(true);

const handPos = new THREE.Vector3(0, -0.55, 0);
handPos.applyMatrix4(arm.matrixWorld);

console.log("Arm rotation -1.57:");
console.log("Hand Z (should be positive for forward):", handPos.z);
console.log("Hand Y (should be near 0 drop):", handPos.y);
