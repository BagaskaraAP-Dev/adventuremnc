import * as THREE from 'three';
import {
  FixedTimestepLoop,
  sampleLunarElevation,
  EvaCharacterController,
  RoverController,
  ROVER_REST_HEIGHT,
} from '@adventuremnc/engine';
import { WebGLRendererWrapper } from './render/Renderer';
import { createLunarScene } from './render/scene/LunarScene';
import { createRegolithMaterial } from './render/material/RegolithMaterial';
import { TerrainManager } from './render/terrain/TerrainManager';
import { ThirdPersonCamera } from './render/camera/ThirdPersonCamera';
import { FlyCamera } from './render/camera/FlyCamera';
import { createAstronautMesh } from './render/character/AstronautMesh';
import { createRoverMesh } from './render/vehicle/RoverMesh';
import { createHabitatMesh } from './render/scene/HabitatMesh';
import { createRoverBayMesh } from './render/scene/RoverBayMesh';
import { BallisticDustParticles } from './render/particles/BallisticDustParticles';
import { InputManager } from './input/InputManager';
import { HUD } from './ui/HUD';
import { CtfManager } from './ctf/CtfManager';
import { LocalSaveManager } from './save/LocalSaveManager';
import { LunarAudioEngine } from './audio/LunarAudioEngine';
import { createLunarRoadMarkers } from './render/scene/LunarRoadMarkers';

function bootstrap(): void {
  const canvas = document.getElementById('render-canvas') as HTMLCanvasElement;
  if (!canvas) return;

  const rendererWrapper = new WebGLRendererWrapper(canvas);
  const lunarScene = createLunarScene();
  const regolithMat = createRegolithMaterial(lunarScene.sunLight);
  const terrainManager = new TerrainManager(lunarScene.scene, regolithMat);
  const dustParticles = new BallisticDustParticles(lunarScene.scene);
  const audioEngine = new LunarAudioEngine();

  // Habitat Base Module (Airlock at X: -22, Z: -9.8)
  const habitat = createHabitatMesh(-22, -18);
  lunarScene.scene.add(habitat.group);

  // Dedicated Lunar Rover Bay 01 (Docking & Rapid Charging Pad right beside entrance ramp)
  const roverBay = createRoverBayMesh(-15, -4.5);
  lunarScene.scene.add(roverBay.group);

  // High-Definition Lunar Road Navigation System (Solar Beacons & Route Signs)
  const roadMarkers = createLunarRoadMarkers();
  lunarScene.scene.add(roadMarkers.group);

  // Entities: Restore from Local Save if exists, else initial landing point
  const savedState = LocalSaveManager.load();

  const spawnX = savedState ? savedState.character.x : habitat.airlockX;
  const spawnZ = savedState ? savedState.character.z : habitat.airlockZ + 2.5;

  const character = new EvaCharacterController(spawnX, spawnZ);
  if (savedState) {
    character.setState({
      y: savedState.character.y,
      health: savedState.character.health,
      oxygen: savedState.character.oxygen,
      suitTemperature: savedState.character.suitTemperature,
      suitIntegrity: savedState.character.suitIntegrity,
      yaw: savedState.character.yaw,
    });
  }

  const astronautMesh = createAstronautMesh();
  lunarScene.scene.add(astronautMesh.group);

  // Rover starting position: default right on Rover Bay 01 pad in plain view
  const defaultRoverX = -15;
  const defaultRoverZ = -4.5;
  let roverStartX = defaultRoverX;
  let roverStartZ = defaultRoverZ;

  if (savedState && savedState.rover) {
    const distFromBase = Math.hypot(
      savedState.rover.x - habitat.airlockX,
      savedState.rover.z - habitat.airlockZ
    );
    // If rover was parked near base (within 35m), preserve it.
    // If it was lost far away in an old save (> 35m), safely spawn it at Rover Bay 01!
    if (distFromBase <= 35) {
      roverStartX = savedState.rover.x;
      roverStartZ = savedState.rover.z;
    }
  }

  const rover = new RoverController(roverStartX, roverStartZ);
  if (savedState && roverStartX === savedState.rover.x) {
    rover.setState({
      yaw: savedState.rover.yaw,
    });
  } else {
    rover.setState({
      yaw: -Math.PI / 2,
    });
  }

  const roverMesh = createRoverMesh();
  lunarScene.scene.add(roverMesh.group);

  const aspect = window.innerWidth / window.innerHeight;
  const thirdPersonCamera = new ThirdPersonCamera(canvas, aspect);
  const flyCamera = new FlyCamera(canvas, aspect);

  let gameMode: 'EVA_ASTRONAUT' | 'ROVER_DRIVING' | 'FLY_CAMERA' = 'EVA_ASTRONAUT';
  let wheelSpinAngle = 0;
  let prevGrounded = true;

  const inputManager = new InputManager();
  const hud = new HUD();
  const ctfManager = new CtfManager();

  // Wire CTF audio effects
  ctfManager.terminal.onPlaySound = (type) => {
    if (type === 'click') {
      audioEngine.playTerminalClick();
    } else if (type === 'quindar') {
      audioEngine.playQuindarTone();
    }
  };

  hud.onToggleTerminal = () => {
    audioEngine.playTerminalClick();
    ctfManager.toggleTerminal();
  };

  // Wire Audio Mute Toggle
  const toggleAudio = () => {
    const isMuted = audioEngine.toggleMute();
    hud.setAudioMuted(isMuted);
    hud.showToast(
      isMuted
        ? '🔇 AUDIO MUTED'
        : '🔊 LUNAR ACOUSTIC SYSTEM ACTIVE (VACUUM SIMULATION)'
    );
  };
  inputManager.onToggleAudio = toggleAudio;
  hud.onToggleAudio = toggleAudio;

  // Sun vs Shadow analytical horizon raycaster (based on low elevation lunar sun)
  const sunDir = new THREE.Vector3(1, 0.0314, 0.4).normalize();
  function checkIsInSunlight(x: number, y: number, z: number): boolean {
    const steps = [6, 18, 45, 110, 240];
    for (const dist of steps) {
      const rx = x + sunDir.x * dist;
      const rz = z + sunDir.z * dist;
      const ry = y + 1.5 + sunDir.y * dist;
      const groundH = sampleLunarElevation(rx, rz);
      if (groundH > ry) {
        return false; // Terrain occludes sun -> deep shadow
      }
    }
    return true; // Direct sunlight
  }

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

  // Interaction: Habitat Airlock Cycle or Vehicle Enter / Exit
  inputManager.onInteract = () => {
    const charState = character.getState();

    // Priority 1: Habitat Airlock Interaction (Cycle, Refill Life Support & Save)
    if (gameMode === 'EVA_ASTRONAUT' && habitat.canInteractAirlock(charState.x, charState.z)) {
      audioEngine.playAirlockCycle();
      character.setState({
        health: 100,
        oxygen: 100,
        suitTemperature: 21.0,
        suitIntegrity: 100,
        isDead: false,
        deathReason: 'NONE',
      });

      const isInside = habitat.isInside(charState.x, charState.z);
      if (isInside) {
        // Step outside onto the ramp
        const outsideX = habitat.airlockX;
        const outsideZ = habitat.airlockZ + 2.0;
        const outsideY = sampleLunarElevation(outsideX, outsideZ);
        character.setState({
          x: outsideX,
          y: outsideY,
          z: outsideZ,
          vx: 0,
          vy: 0,
          vz: 0,
          isGrounded: true,
        });
        hud.showToast('🚪 AIRLOCK CYCLED // EXITED TO LUNAR SURFACE // O₂ 100% // SAVED');
      } else {
        // Step into habitat airlock vestibule
        const insideX = habitat.airlockX;
        const insideZ = habitat.airlockZ - 1.2;
        character.setState({
          x: insideX,
          y: habitat.floorY,
          z: insideZ,
          vx: 0,
          vy: 0,
          vz: 0,
          isGrounded: true,
        });
        hud.showToast('🚪 AIRLOCK CYCLED // WELCOME TO PRESSURIZED HABITAT BASE // SAVED');
      }

      const rState = rover.getState();
      const updatedCState = character.getState();
      LocalSaveManager.save(
        {
          x: updatedCState.x,
          y: updatedCState.y,
          z: updatedCState.z,
          yaw: updatedCState.yaw,
          health: 100,
          oxygen: 100,
          suitTemperature: 21.0,
          suitIntegrity: 100,
        },
        {
          x: rState.x,
          y: rState.y,
          z: rState.z,
          yaw: rState.yaw,
        }
      );
      return;
    }

    // Priority 2: Rover Mount / Dismount
    if (gameMode === 'EVA_ASTRONAUT') {
      if (rover.canInteract(charState.x, charState.z)) {
        gameMode = 'ROVER_DRIVING';
        const rState = rover.getState();
        thirdPersonCamera.setTargetProfile(6.2, 1.45, rState.yaw);
        astronautMesh.setSeatedPose(true);
        hud.showToast('🚜 PRESSURIZED COCKPIT SEALED // LIFE SUPPORT CHARGING');
      }
    } else if (gameMode === 'ROVER_DRIVING') {
      gameMode = 'EVA_ASTRONAUT';
      astronautMesh.setSeatedPose(false);
      const rState = rover.getState();
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
      thirdPersonCamera.setTargetProfile(3.6, 1.25);
      thirdPersonCamera.reset(exitX, exitGroundY, exitZ);
    }
  };

  // Dedicated Rover Recall / Summon
  const recallRoverToBay = () => {
    if (gameMode === 'ROVER_DRIVING') {
      hud.showToast('⚠️ TIDAK BISA MEMANGGIL SAAT SEDANG MENGEMUDI');
      return;
    }
    const cState = character.getState();
    const distToBase = Math.hypot(cState.x - habitat.airlockX, cState.z - habitat.airlockZ);

    let targetX = -15;
    let targetZ = -4.5;
    let targetYaw = -Math.PI / 2;
    let toastMsg = '🚜 MOBIL BULAN DITEMUKAN & TERPARKIR DI BAY 01!';

    // If player is exploring far from base (> 18m), summon rover right in front of player!
    if (distToBase > 18.0) {
      const fwdX = -Math.sin(cState.yaw);
      const fwdZ = -Math.cos(cState.yaw);
      targetX = cState.x + fwdX * 3.5;
      targetZ = cState.z + fwdZ * 3.5;
      targetYaw = cState.yaw;
      toastMsg = '🚜 MOBIL BULAN DIPANGGIL LANGSUNG KE DEPAN ANDA!';
    }

    const groundY = habitat.getFloorHeight(targetX, targetZ) ?? sampleLunarElevation(targetX, targetZ);
    const targetY = groundY + ROVER_REST_HEIGHT;
    rover.setState({
      x: targetX,
      y: targetY,
      z: targetZ,
      yaw: targetYaw,
      pitch: 0,
      roll: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      speed: 0,
      isGrounded: true,
      isRolledOver: false,
    });
    audioEngine.playQuindarTone();
    hud.showToast(toastMsg);

    LocalSaveManager.save(
      {
        x: cState.x,
        y: cState.y,
        z: cState.z,
        yaw: cState.yaw,
        health: cState.health,
        oxygen: cState.oxygen,
        suitTemperature: cState.suitTemperature,
        suitIntegrity: cState.suitIntegrity,
      },
      {
        x: targetX,
        y: targetY,
        z: targetZ,
        yaw: targetYaw,
      }
    );
  };
  inputManager.onRecallRover = recallRoverToBay;
  hud.onRecallRover = recallRoverToBay;

  const executeRespawn = () => {
    audioEngine.playQuindarTone();
    const respawnX = habitat.airlockX;
    const respawnZ = habitat.airlockZ + 2.2;
    const respawnGroundY = sampleLunarElevation(respawnX, respawnZ);

    character.setState({
      x: respawnX,
      y: respawnGroundY,
      z: respawnZ,
      vx: 0,
      vy: 0,
      vz: 0,
      health: 100,
      oxygen: 100,
      suitTemperature: 21.0,
      suitIntegrity: 100,
      isDead: false,
      deathReason: 'NONE',
      isGrounded: true,
      lastImpactSpeed: 0,
      jumpApex: 0,
    });

    gameMode = 'EVA_ASTRONAUT';
    astronautMesh.setSeatedPose(false);
    thirdPersonCamera.setTargetProfile(3.6, 1.25);
    thirdPersonCamera.reset(respawnX, respawnGroundY, respawnZ);

    hud.showToast('🚀 ASTRONAUT RE-DEPLOYED AT HABITAT AIRLOCK');
  };

  inputManager.onRespawn = executeRespawn;
  hud.onRespawn = executeRespawn;

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
        rover.update(roverInputs, dt, {
          getGroundElevation: (x, z) => habitat.getFloorHeight(x, z) ?? sampleLunarElevation(x, z),
          constrainPosition: (currX, currZ, nextX, nextZ, radius) =>
            habitat.constrainRoverPosition(currX, currZ, nextX, nextZ, radius),
        });
        const rState = rover.getState();

        // Driving inside rover cockpit: Pressurized shelter!
        character.update(
          {
            moveForward: false,
            moveBackward: false,
            moveLeft: false,
            moveRight: false,
            sprint: false,
            jump: false,
            cameraYaw: rState.yaw,
          },
          dt,
          { isInSunlight: true, isInsideShelter: true }
        );

        // Sound: Rover motor humming conducted through driver seat
        audioEngine.updateRoverSound(rState.speed, true);
        audioEngine.updatePhysiology(dt, false, character.getState().oxygen, false);

        wheelSpinAngle -= (rState.speed / 0.35) * dt;
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

        const seatPos = new THREE.Vector3();
        const seatQuat = new THREE.Quaternion();
        roverMesh.getDriverSeatTransform(seatPos, seatQuat);
        astronautMesh.group.position.copy(seatPos);
        astronautMesh.group.quaternion.copy(seatQuat);
        astronautMesh.setSeatedPose(true, rState.steerAngle);

        if (Math.abs(rState.speed) > 0.6) {
          const fwdX = -Math.sin(rState.yaw);
          const fwdZ = -Math.cos(rState.yaw);
          const rl = rState.wheels[2];
          const rr = rState.wheels[3];
          if (rl.isGrounded) {
            dustParticles.emitFromWheel(
              rl.worldX,
              rl.worldY - 0.1,
              rl.worldZ,
              fwdX,
              fwdZ,
              rState.speed,
              currentTimeSec
            );
          }
          if (rr.isGrounded) {
            dustParticles.emitFromWheel(
              rr.worldX,
              rr.worldY - 0.1,
              rr.worldZ,
              fwdX,
              fwdZ,
              rState.speed,
              currentTimeSec
            );
          }
        }

        thirdPersonCamera.updateRover(rState.x, rState.y, rState.z, rState.yaw, dt, rState.speed);
        terrainManager.update(rState.x, rState.z);
      } else if (gameMode === 'EVA_ASTRONAUT') {
        const charInputs = inputManager.getCharacterInputs(thirdPersonCamera.yaw);
        const cPre = character.getState();
        const inSun = checkIsInSunlight(cPre.x, cPre.y, cPre.z);
        const nearAirlock = habitat.canInteractAirlock(cPre.x, cPre.z);
        const isInsideHab = habitat.isInside(cPre.x, cPre.z);
        const isNearShelter = nearAirlock || isInsideHab;

        character.update(charInputs, dt, {
          isInSunlight: inSun && !isInsideHab,
          isInsideShelter: isNearShelter,
          getGroundElevation: (x, z) => habitat.getFloorHeight(x, z) ?? sampleLunarElevation(x, z),
          constrainPosition: (currX, currZ, nextX, nextZ) =>
            habitat.constrainPosition(currX, currZ, nextX, nextZ),
        });

        if (isInsideHab) {
          thirdPersonCamera.setTargetProfile(2.2, 1.45);
        } else {
          thirdPersonCamera.setTargetProfile(3.6, 1.25);
        }

        const cState = character.getState();

        // Sound: Stepping out of rover produces COMPLETE VACUUM SILENCE for the rover
        audioEngine.updateRoverSound(0, false);

        // Sound: Internal helmet breathing & oxygen life support
        const isSprinting =
          inputManager.isKeyDown('ShiftLeft') || inputManager.isKeyDown('ShiftRight');
        audioEngine.updatePhysiology(dt, isSprinting, cState.oxygen, cState.isDead);

        // Sound: Bone-conducted muffled regolith footsteps
        const hSpeed = Math.sqrt(cState.vx * cState.vx + cState.vz * cState.vz);
        if (cState.isGrounded && hSpeed > 0.3) {
          audioEngine.triggerFootstep(cState.lopingCycle, true);
        }

        // Sound: Impact landing shockwave
        if (!prevGrounded && cState.isGrounded && cState.lastImpactSpeed > 2.0) {
          audioEngine.playLandingImpact(cState.lastImpactSpeed);
        }
        prevGrounded = cState.isGrounded;

        // Sound: Alarms for critical life-support conditions
        if (cState.oxygen < 20 && !cState.isDead) {
          audioEngine.playAlarmBeep('O2');
        } else if (
          (cState.suitTemperature < 5 || cState.suitTemperature > 45) &&
          !cState.isDead
        ) {
          audioEngine.playAlarmBeep('THERMAL');
        }

        astronautMesh.group.position.set(cState.x, cState.y, cState.z);
        astronautMesh.group.rotation.set(0, cState.yaw, 0);
        astronautMesh.updateAnimation(cState.lopingCycle, cState.isGrounded, cState.vy, hSpeed);

        thirdPersonCamera.update(cState.x, cState.y, cState.z, dt);
        terrainManager.update(cState.x, cState.z);
      } else {
        // Fly camera: vacuum silence
        audioEngine.updateRoverSound(0, false);
        flyCamera.update(dt);
        const pos = flyCamera.getPosition();
        terrainManager.update(pos.x, pos.z);
      }

      dustParticles.update(currentTimeSec);
      habitat.updateAnimation(currentTimeSec, dt);
      roverBay.updateAnimation(currentTimeSec);
      roadMarkers.updateAnimation(currentTimeSec);
      lunarScene.update(dt);
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
    if (perfTimer >= 0.2) {
      fps = frameCount / perfTimer;
      frameTimeMs = (perfTimer / frameCount) * 1000;
      frameCount = 0;
      perfTimer = 0;

      const charState = character.getState();
      const roverState = rover.getState();
      const currentGroundY = sampleLunarElevation(charState.x, charState.z);
      const canInteractRover = rover.canInteract(charState.x, charState.z);
      const canInteractAirlock = habitat.canInteractAirlock(charState.x, charState.z);
      const distHab = habitat.distanceToAirlock(charState.x, charState.z);
      const distRover = Math.hypot(charState.x - roverState.x, charState.z - roverState.z);

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
        deathReason: charState.deathReason,
        jumpApex: charState.jumpApex,
        lastImpactSpeed: charState.lastImpactSpeed,
        mode: gameMode,
        roverSpeed: roverState.speed,
        canInteractRover,
        canInteractAirlock,
        distanceToHab: distHab,
        distanceToRover: distRover,
        isInsideHabitat: habitat.isInside(charState.x, charState.z) && gameMode === 'EVA_ASTRONAUT',
        oxygen: charState.oxygen,
        suitTemperature: charState.suitTemperature,
        suitIntegrity: charState.suitIntegrity,
        isInSunlight: charState.isInSunlight,
        isInsideShelter: charState.isInsideShelter || gameMode === 'ROVER_DRIVING',
      });
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrap();
});
