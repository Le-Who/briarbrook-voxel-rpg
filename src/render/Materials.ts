import * as THREE from 'three';
import type { AreaId } from '../game/types';

export class MaterialLibrary {
  private materials = new Map<string, THREE.MeshStandardMaterial>();

  get(name: string, color: string, options: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
    const key = `${name}:${color}:${JSON.stringify(options)}`;
    const existing = this.materials.get(key);
    if (existing) return existing;
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.82,
      metalness: 0.02,
      ...options
    });
    material.name = name;
    material.userData.baseColor = color;
    this.materials.set(key, material);
    return material;
  }

  animate(clock: number): void {
    this.materials.forEach((material) => {
      const name = material.name.toLowerCase();
      if (!name.includes('water') && !name.includes('river') && !name.includes('stream')) return;
      const base = new THREE.Color(material.userData.baseColor ?? '#2c6f8d');
      const pulse = Math.sin(clock * 1.8 + name.length) * 0.035;
      base.offsetHSL(0.01, 0.08, pulse);
      material.color.copy(base);
      material.opacity = Math.max(0.68, Math.min(0.88, (material.opacity || 0.78) + Math.sin(clock * 2.4) * 0.004));
    });
  }

  dispose(): void {
    this.materials.forEach((material) => material.dispose());
    this.materials.clear();
  }
}

export const areaAmbient: Record<AreaId, { bg: string; fog: string; hemi: string; sun: string; intensity: number }> = {
  town: { bg: '#20271d', fog: '#293020', hemi: '#e7d29b', sun: '#fff1c0', intensity: 1.92 },
  bank: { bg: '#120f0a', fog: '#16120d', hemi: '#c69b66', sun: '#ffd38a', intensity: 1.35 },
  blacksmith: { bg: '#17100c', fog: '#20130d', hemi: '#c8874f', sun: '#ff9f4a', intensity: 1.55 },
  forest: { bg: '#162413', fog: '#24411f', hemi: '#cce6a3', sun: '#edf2b4', intensity: 1.66 },
  crypt: { bg: '#050505', fog: '#0b0b0d', hemi: '#514a43', sun: '#d37a43', intensity: 0.62 },
  road: { bg: '#171a16', fog: '#28271f', hemi: '#d4b27f', sun: '#f3a964', intensity: 1.24 },
  housing: { bg: '#17251e', fog: '#263b30', hemi: '#e1d5a3', sun: '#ffde9b', intensity: 1.7 }
};
