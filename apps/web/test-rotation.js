import * as THREE from 'three';

const mount = new THREE.Group();
mount.rotation.set(0, Math.PI, 0);
mount.updateMatrixWorld(true);

const astronaut = new THREE.Group();
const quat = new THREE.Quaternion();
mount.getWorldQuaternion(quat);
astronaut.quaternion.copy(quat);

const faceDir = new THREE.Vector3(0, 0, 1); // Astronaut's local +Z (face)
faceDir.applyQuaternion(astronaut.quaternion);

console.log("Astronaut face points to global Z:", faceDir.z);
