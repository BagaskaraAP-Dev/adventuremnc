import * as THREE from 'three';
import {
  getActiveChunkDescriptors,
  TerrainChunkDescriptor,
} from '@adventuremnc/engine';
import { ChunkBuildRequest, ChunkBuildResponse } from './terrain.worker';

export class TerrainManager {
  private activeChunks = new Map<string, THREE.Mesh>();
  private pendingRequests = new Set<string>();
  private worker: Worker;
  private readonly scene: THREE.Scene;
  private readonly material: THREE.Material;

  constructor(scene: THREE.Scene, material: THREE.Material) {
    this.scene = scene;
    this.material = material;

    this.worker = new Worker(
      new URL('./terrain.worker.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.onmessage = (e: MessageEvent<ChunkBuildResponse>) => {
      this.handleChunkBuilt(e.data);
    };
  }

  public update(camX: number, camZ: number): void {
    const descriptors = getActiveChunkDescriptors(camX, camZ, 3200);
    const activeKeys = new Set<string>();

    for (const desc of descriptors) {
      const descriptorKeyWithLod = `${desc.key}_lod${desc.lod}`;
      activeKeys.add(descriptorKeyWithLod);

      if (!this.activeChunks.has(descriptorKeyWithLod) && !this.pendingRequests.has(descriptorKeyWithLod)) {
        this.requestChunk(desc);
      }
    }

    // Cull chunks no longer in range or obsolete LOD
    for (const [key, mesh] of this.activeChunks.entries()) {
      if (!activeKeys.has(key)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        this.activeChunks.delete(key);
      }
    }
  }

  private requestChunk(desc: TerrainChunkDescriptor): void {
    const keyWithLod = `${desc.key}_lod${desc.lod}`;
    this.pendingRequests.add(keyWithLod);

    const request: ChunkBuildRequest = {
      key: keyWithLod,
      cx: desc.cx,
      cz: desc.cz,
      worldX: desc.worldX,
      worldZ: desc.worldZ,
      size: desc.size,
      resolution: desc.resolution,
    };

    this.worker.postMessage(request);
  }

  private handleChunkBuilt(res: ChunkBuildResponse): void {
    this.pendingRequests.delete(res.key);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(res.positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(res.normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(res.uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(res.indices, 1));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    // If an older LOD mesh exists for this (cx, cz), remove it before adding new one
    const baseKeyPrefix = `${res.cx}_${res.cz}_lod`;
    for (const [existingKey, mesh] of this.activeChunks.entries()) {
      if (existingKey.startsWith(baseKeyPrefix)) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        this.activeChunks.delete(existingKey);
      }
    }

    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.scene.add(mesh);
    this.activeChunks.set(res.key, mesh);
  }

  public getChunkCount(): number {
    return this.activeChunks.size;
  }

  public dispose(): void {
    this.worker.terminate();
    for (const [, mesh] of this.activeChunks.entries()) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    this.activeChunks.clear();
    this.pendingRequests.clear();
  }
}
