import { FixedTimestepLoop, sampleLunarElevation, EvaCharacterController } from '@adventuremnc/engine';
import { WebGLRendererWrapper } from './render/Renderer';
import { createLunarScene } from './render/scene/LunarScene';
import { createRegolithMaterial } from './render/material/RegolithMaterial';
import { TerrainManager } from './render/terrain/TerrainManager';
import { ThirdPersonCamera } from './render/camera/ThirdPersonCamera';
import { FlyCamera } from './render/camera/FlyCamera';
import { createAstronautMesh } from './render/character/AstronautMesh';
import { InputManager } from './input/InputManager';
import { HUD } from './ui/HUD';

function bootstrap(): void {
  const canvas = document.getElementById('render-canvas') as HTMLCanvasElement;
  if (!canvas) return;

  const rendererWrapper = new WebGLRendererWrapper(canvas);
  const lunarScene = createLunarScene();
  const regolithMat = createRegolithMaterial(lunarScene.sunLight);
  const terrainManager = new TerrainManager(lunarScene.scene, regolithMat);

  // Character & Cameras
  const startX = 0;
  const startZ = 0;
  const character = new EvaCharacterController(startX, startZ);
  const astronautMesh = createAstronautMesh();
  lunarScene.scene.add(astronautMesh.group);

  const aspect = window.innerWidth / window.innerHeight;
  const thirdPersonCamera = new ThirdPersonCamera(canvas, aspect);
  const flyCamera = new FlyCamera(canvas, aspect);

  let cameraMode: 'EVA_ASTRONAUT' | 'FLY_CAMERA' = 'EVA_ASTRONAUT';

  // Input & HUD
  const inputManager = new InputManager();
  const hud = new HUD();

  inputManager.onToggleCameraMode = () => {
    cameraMode = cameraMode === 'EVA_ASTRONAUT' ? 'FLY_CAMERA' : 'EVA_ASTRONAUT';
    if (cameraMode === 'FLY_CAMERA') {
      const state = character.getState();
      flyCamera.camera.position.set(state.x, state.y + 15, state.z + 20);
      flyCamera.camera.lookAt(state.x, state.y, state.z);
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
    thirdPersonCamera.reset(0, groundY, 0);
  };

  // Initial sync
  const initState = character.getState();
  astronautMesh.group.position.set(initState.x, initState.y, initState.z);
  thirdPersonCamera.reset(initState.x, initState.y, initState.z);
  terrainManager.update(initState.x, initState.z);

  let lastTime = performance.now();
  let frameCount = 0;
  let fps = 60;
  let frameTimeMs = 16.6;
  let perfTimer = 0;

  const gameLoop = new FixedTimestepLoop({
    stepSimulation: (dt) => {
      if (cameraMode === 'EVA_ASTRONAUT') {
        const inputs = inputManager.getCharacterInputs(thirdPersonCamera.yaw);
        character.update(inputs, dt);
        const state = character.getState();

        // Sync astronaut mesh
        astronautMesh.group.position.set(state.x, state.y, state.z);
        astronautMesh.group.rotation.y = state.yaw;
        const hSpeed = Math.sqrt(state.vx * state.vx + state.vz * state.vz);
        astronautMesh.updateAnimation(state.lopingCycle, state.isGrounded, state.vy, hSpeed);

        thirdPersonCamera.update(state.x, state.y, state.z, dt);
        terrainManager.update(state.x, state.z);
      } else {
        flyCamera.update(dt);
        const pos = flyCamera.getPosition();
        terrainManager.update(pos.x, pos.z);
      }
    },
    render: () => {
      if (typeof regolithMat.userData.updateSun === 'function') {
        regolithMat.userData.updateSun();
      }
      const activeCamera = cameraMode === 'EVA_ASTRONAUT' ? thirdPersonCamera.camera : flyCamera.camera;
      rendererWrapper.render(lunarScene.scene, activeCamera);
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

      const state = character.getState();
      const currentGroundY = sampleLunarElevation(state.x, state.z);
      hud.update({
        x: state.x,
        y: state.y,
        z: state.z,
        groundY: currentGroundY,
        fps,
        frameTimeMs,
        metrics: rendererWrapper.getMetrics(),
        health: state.health,
        isDead: state.isDead,
        jumpApex: state.jumpApex,
        lastImpactSpeed: state.lastImpactSpeed,
        mode: cameraMode,
      });
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrap();
});
