import * as THREE from 'three';

const scene = new THREE.Scene();
const roverGroup = new THREE.Group();
scene.add(roverGroup);

const roverBody = new THREE.Group();
roverBody.rotation.order = 'YXZ';
roverBody.rotation.set(0.1, 0.2, 0.3); // Fake rover rotation
roverBody.position.set(10, 5, 20);     // Fake rover position
roverGroup.add(roverBody);

const driverSeatMount = new THREE.Group();
driverSeatMount.position.set(-0.35, 0.22, 0.02);
driverSeatMount.rotation.set(0, Math.PI, 0); 
roverBody.add(driverSeatMount);

scene.updateMatrixWorld(true);

const seatPos = new THREE.Vector3();
const seatQuat = new THREE.Quaternion();
driverSeatMount.getWorldPosition(seatPos);
driverSeatMount.getWorldQuaternion(seatQuat);

const astronautGroup = new THREE.Group();
scene.add(astronautGroup);
astronautGroup.position.copy(seatPos);
astronautGroup.quaternion.copy(seatQuat);

const bodyGroup = new THREE.Group();
bodyGroup.position.set(0, -0.68, 0.06);
bodyGroup.rotation.set(-0.08, 0, 0);
astronautGroup.add(bodyGroup);

const leftHip = new THREE.Group();
leftHip.position.set(-0.18, 0.70, 0);
leftHip.rotation.set(-1.57, 0, 0);
bodyGroup.add(leftHip);

const leftKnee = new THREE.Group();
leftKnee.position.set(0, -0.35, 0);
leftKnee.rotation.set(0.63, 0, 0);
leftHip.add(leftKnee);

const boot = new THREE.Group();
boot.position.set(0, -0.34, 0.05);
leftKnee.add(boot);

scene.updateMatrixWorld(true);

const bootPos = new THREE.Vector3();
boot.getWorldPosition(bootPos);

console.log("Rover Body Pos:", roverBody.position);
console.log("Boot World Pos:", bootPos);
console.log("Diff Y:", bootPos.y - roverBody.position.y);
