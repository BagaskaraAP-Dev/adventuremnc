import { FixedTimestepLoop, sampleLunarElevation } from '@adventuremnc/engine';
import { WebGLRendererWrapper } from './render/Renderer';
import { createLunarScene } from './render/scene/LunarScene';
import { createRegolithMaterial } from './render/material/RegolithMaterial';
import { TerrainManager } from './render/terrain/TerrainManager';
import { FlyCamera } from './render/camera/FlyCamera';
import { HUD } from './ui/HUD';

function bootstrap(): void {
  const canvas = document.getElementById('render-canvas') as HTMLCanvasElement;
  if (!canvas) return;

  const rendererWrapper = new WebGLRendererWrapper(canvas);
  const lunarScene = createLunarScene();
  const regolithMat = createRegolithMaterial(lunarScene.sunLight);
  const terrainManager = new TerrainManager(lunarScene.scene, regolithMat);
  const flyCamera = new FlyCamera(canvas, window.innerWidth / window.innerHeight);
  const hud = new HUD();

  // Initial spawn at Shackleton Crater rim crest
  const startX = 0;
  const startZ = 0;
  const startGroundY = sampleLunarElevation(startX, startZ);
  flyCamera.camera.position.set(startX, startGroundY + 25, startZ);
  flyCamera.camera.lookAt(0, startGroundY + 20, -500);

  // Initial terrain build around spawn
  terrainManager.update(startX, startZ);

  let lastTime = performance.now();
  let frameCount = 0;
  let fps = 60;
  let frameTimeMs = 16.6;
  let perfTimer = 0;

  const gameLoop = new FixedTimestepLoop({
    stepSimulation: (dt) => {
      flyCamera.update(dt);
      const pos = flyCamera.getPosition();
      terrainManager.update(pos.x, pos.z);
    },
    render: () => {
      if (typeof regolithMat.userData.updateSun === 'function') {
        regolithMat.userData.updateSun();
      }
      rendererWrapper.render(lunarScene.scene, flyCamera.camera);
    },
  });

  function frame(now: number): void {
    const rawDelta = (now - lastTime) / 1000;
    lastTime = now;

    // Fixed timestep update + render
    gameLoop.update(rawDelta);

    // Telemetry & metrics update
    frameCount++;
    perfTimer += rawDelta;
    if (perfTimer >= 0.25) {
      fps = frameCount / perfTimer;
      frameTimeMs = (perfTimer / frameCount) * 1000;
      frameCount = 0;
      perfTimer = 0;

      const pos = flyCamera.getPosition();
      const currentGroundY = sampleLunarElevation(pos.x, pos.z);
      hud.update(
        pos.x,
        pos.y,
        pos.z,
        currentGroundY,
        fps,
        frameTimeMs,
        rendererWrapper.getMetrics()
      );
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrap();
});
