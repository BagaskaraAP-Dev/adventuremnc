import * as THREE from 'three';
import {
  FixedTimestepLoop,
  sampleLunarElevation,
  EvaCharacterController,
  RoverController,
} from '@adventuremnc/engine';
import { WebGLRendererWrapper } from './render/Renderer';
import { createLunarScene } from './render/scene/LunarScene';
import { createRegolithMaterial } from './render/material/RegolithMaterial';
import { TerrainManager } from './render/terrain/TerrainManager';
import { ThirdPersonCamera } from './render/camera/ThirdPersonCamera';
import { FlyCamera } from './render/camera/FlyCamera';
import { createAstronautMesh } from './render/character/AstronautMesh';
import { createRoverMesh } from './render/vehicle/RoverMesh';
import { BallisticDustParticles } from './render/particles/BallisticDustParticles';
import { InputManager } from './input/InputManager';
import { HUD } from './ui/HUD';

function bootstrap(): void {
  const canvas = document.getElementById('render-canvas') as HTMLCanvasElement;
  if (!canvas) return;

  const rendererWrapper = new WebGLRendererWrapper(canvas);
  const lunarScene = createLunarScene();
  const regolithMat = createRegolithMaterial(lunarScene.sunLight);
  const terrainManager = new TerrainManager(lunarScene.scene, regolithMat);
  const dustParticles = new BallisticDustParticles(lunarScene.scene);

  // Entities
  const character = new EvaCharacterController(0, 0);
  const astronautMesh = createAstronautMesh();
  lunarScene.scene.add(astronautMesh.group);

  const rover = new RoverController(12, 12);
  const roverMesh = createRoverMesh();
  lunarScene.scene.add(roverMesh.group);

  const aspect = window.innerWidth / window.innerHeight;
  const thirdPersonCamera = new ThirdPersonCamera(canvas, aspect);
  const flyCamera = new FlyCamera(canvas, aspect);

  let gameMode: 'EVA_ASTRONAUT' | 'ROVER_DRIVING' | 'FLY_CAMERA' = 'EVA_ASTRONAUT';
  let wheelSpinAngle = 0;

  const inputManager = new InputManager();
  const hud = new HUD();

  // Camera Mode Toggle
  inputManager.onToggleCameraMode = () => {
    if (gameMode === 'FLY_CAMERA') {
      gameMode = 'EVA_ASTRONAUT';
      const state = character.getState();
      thirdPersonCamera.reset(state.x, state.y, state.z);
    } else {
      gameMode = 'FLY_CAMERA';
      const state = character.getState();
      flyCamera.camera.position.set(state.x, state.y + 15, state.z + 20);
      flyCamera.camera.lookAt(state.x, state.y, state.z);
    }
  };

  // Vehicle Enter / Exit Interaction
  inputManager.onInteract = () => {
    if (gameMode === 'EVA_ASTRONAUT') {
      const charState = character.getState();
      if (rover.canInteract(charState.x, charState.z)) {
        gameMode = 'ROVER_DRIVING';
        // Seat character in vehicle
        astronautMesh.group.rotation.set(0, 0, 0);
        astronautMesh.updateAnimation(0, false, 0, 0);
      }
    } else if (gameMode === 'ROVER_DRIVING') {
      gameMode = 'EVA_ASTRONAUT';
      const rState = rover.getState();
      // Dismount beside rover
      const exitX = rState.x - Math.cos(rState.yaw) * 2.2;
      const exitZ = rState.z + Math.sin(rState.yaw) * 2.2;
      const exitGroundY = sampleLunarElevation(exitX, exitZ);
      character.setState({
        x: exitX,
        y: exitGroundY,
        z: exitZ,
        vx: 0,
        vy: 0,
        vz: 0,
        isGrounded: true,
      });
      thirdPersonCamera.reset(exitX, exitGroundY, exitZ);
    }
  };

  inputManager.onRespawn = () => {
    const groundY = sampleLunarElevation(0, 0);
    character.setState({
      x: 0,
      y: groundY,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      health: 100,
      isDead: false,
      isGrounded: true,
      lastImpactSpeed: 0,
      jumpApex: 0,
    });
    gameMode = 'EVA_ASTRONAUT';
    thirdPersonCamera.reset(0, groundY, 0);
  };

  // Initial Sync
  const initCharState = character.getState();
  astronautMesh.group.position.set(initCharState.x, initCharState.y, initCharState.z);
  thirdPersonCamera.reset(initCharState.x, initCharState.y, initCharState.z);

  const initRoverState = rover.getState();
  roverMesh.updatePose(
    initRoverState.x,
    initRoverState.y,
    initRoverState.z,
    initRoverState.yaw,
    initRoverState.pitch,
    initRoverState.roll,
    0,
    0
  );
  terrainManager.update(initCharState.x, initCharState.z);

  let lastTime = performance.now();
  let frameCount = 0;
  let fps = 60;
  let frameTimeMs = 16.6;
  let perfTimer = 0;

  const gameLoop = new FixedTimestepLoop({
    stepSimulation: (dt) => {
      const currentTimeSec = performance.now() / 1000;

      if (gameMode === 'ROVER_DRIVING') {
        const roverInputs = inputManager.getRoverInputs();
        rover.update(roverInputs, dt);
        const rState = rover.getState();

        // Update wheel spin
        wheelSpinAngle += (rState.speed / 0.35) * dt;
        roverMesh.updatePose(
          rState.x,
          rState.y,
          rState.z,
          rState.yaw,
          rState.pitch,
          rState.roll,
          rState.steerAngle,
          wheelSpinAngle
        );

        // Mount astronaut on driver seat
        const seatPos = new THREE.Vector3();
        roverMesh.getDriverSeatPosition(seatPos);
        astronautMesh.group.position.copy(seatPos);
        astronautMesh.group.rotation.set(0, rState.yaw, 0, 'YXZ');

        // Emit ballistic dust particles from rear wheels
        if (Math.abs(rState.speed) > 0.6) {
          const fwdX = -Math.sin(rState.yaw);
          const fwdZ = -Math.cos(rState.yaw);
          const rl = rState.wheels[2];
          const rr = rState.wheels[3];
          if (rl.isGrounded) {
            dustParticles.emitFromWheel(rl.worldX, rl.worldY - 0.1, rl.worldZ, fwdX, fwdZ, rState.speed, currentTimeSec);
          }
          if (rr.isGrounded) {
            dustParticles.emitFromWheel(rr.worldX, rr.worldY - 0.1, rr.worldZ, fwdX, fwdZ, rState.speed, currentTimeSec);
          }
        }

        thirdPersonCamera.update(rState.x, rState.y, rState.z, dt);
        terrainManager.update(rState.x, rState.z);
      } else if (gameMode === 'EVA_ASTRONAUT') {
        const charInputs = inputManager.getCharacterInputs(thirdPersonCamera.yaw);
        character.update(charInputs, dt);
        const cState = character.getState();

        astronautMesh.group.position.set(cState.x, cState.y, cState.z);
        astronautMesh.group.rotation.set(0, cState.yaw, 0);
        const hSpeed = Math.sqrt(cState.vx * cState.vx + cState.vz * cState.vz);
        astronautMesh.updateAnimation(cState.lopingCycle, cState.isGrounded, cState.vy, hSpeed);

        thirdPersonCamera.update(cState.x, cState.y, cState.z, dt);
        terrainManager.update(cState.x, cState.z);
      } else {
        flyCamera.update(dt);
        const pos = flyCamera.getPosition();
        terrainManager.update(pos.x, pos.z);
      }

      dustParticles.update(currentTimeSec);
    },
    render: () => {
      if (typeof regolithMat.userData.updateSun === 'function') {
        regolithMat.userData.updateSun();
      }
      const activeCam = gameMode === 'FLY_CAMERA' ? flyCamera.camera : thirdPersonCamera.camera;
      rendererWrapper.render(lunarScene.scene, activeCam);
    },
  });

  function frame(now: number): void {
    const rawDelta = (now - lastTime) / 1000;
    lastTime = now;

    gameLoop.update(rawDelta);

    frameCount++;
    perfTimer += rawDelta;
    if (perfTimer >= 0.25) {
      fps = frameCount / perfTimer;
      frameTimeMs = (perfTimer / frameCount) * 1000;
      frameCount = 0;
      perfTimer = 0;

      const charState = character.getState();
      const roverState = rover.getState();
      const currentGroundY = sampleLunarElevation(charState.x, charState.z);
      const canInteract = rover.canInteract(charState.x, charState.z);

      hud.update({
        x: gameMode === 'ROVER_DRIVING' ? roverState.x : charState.x,
        y: gameMode === 'ROVER_DRIVING' ? roverState.y : charState.y,
        z: gameMode === 'ROVER_DRIVING' ? roverState.z : charState.z,
        groundY: currentGroundY,
        fps,
        frameTimeMs,
        metrics: rendererWrapper.getMetrics(),
        health: charState.health,
        isDead: charState.isDead,
        jumpApex: charState.jumpApex,
        lastImpactSpeed: charState.lastImpactSpeed,
        mode: gameMode,
        roverSpeed: roverState.speed,
        canInteractRover: canInteract,
      });
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrap();
});
