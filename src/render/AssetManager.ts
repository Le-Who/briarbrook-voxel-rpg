import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { visualPrefabById, type VisualPrefabDefinition } from '../data/visualPrefabs';

export class AssetManager {
  private loader = new GLTFLoader();
  private modelCache = new Map<string, Promise<THREE.Object3D | null>>();
  private resolvedModels = new Set<THREE.Object3D>();

  constructor(private prefabs: Record<string, VisualPrefabDefinition> = visualPrefabById) {}

  getPrefab(id: string): VisualPrefabDefinition | null {
    return this.prefabs[id] ?? null;
  }

  getProceduralFallbackId(id: string): string | null {
    return this.prefabs[id]?.fallbackProceduralFactory ?? null;
  }

  loadRuntimeModel(id: string): Promise<THREE.Object3D | null> {
    const prefab = this.prefabs[id];
    if (!prefab?.runtimePath) return Promise.resolve(null);
    const cached = this.modelCache.get(id);
    if (cached) return cached;

    const load = this.loadModelPath(prefab.runtimePath)
      .then((model) => {
        if (model) this.resolvedModels.add(model);
        return model;
      })
      .catch(() => null);
    this.modelCache.set(id, load);
    return load;
  }

  stats(): { cachedModelCount: number; resolvedModelCount: number } {
    return {
      cachedModelCount: this.modelCache.size,
      resolvedModelCount: this.resolvedModels.size
    };
  }

  dispose(): void {
    this.resolvedModels.forEach((model) => {
      model.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry?.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => material.dispose());
      });
    });
    this.resolvedModels.clear();
    this.modelCache.clear();
  }

  private async loadModelPath(runtimePath: string): Promise<THREE.Object3D | null> {
    if (!runtimePath.endsWith('.glb') && !runtimePath.endsWith('.gltf')) return null;
    const gltf = await this.loader.loadAsync(runtimePath);
    return gltf.scene;
  }
}
