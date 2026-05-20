import * as THREE from 'three';

export interface VoxelBuilderOptions {
  seed?: number;
  variation?: number | string;
  size?: number;
  theme?: string;
  wear?: number;
  damage?: number;
  color?: string;
  colorVariation?: number;
  props?: boolean;
  metadata?: Record<string, unknown>;
}

interface VoxelKitContext {
  box(parent: THREE.Group, x: number, y: number, z: number, sx: number, sy: number, sz: number, material: THREE.Material, rotation?: { rx?: number; ry?: number; rz?: number }): THREE.Mesh;
  material(name: string, color: string, options?: Partial<THREE.MeshStandardMaterialParameters>): THREE.Material;
}

export class VoxelKit {
  constructor(private context: VoxelKitContext) {}

  cobblestonePathBuilder(options: VoxelBuilderOptions & { width?: number; depth?: number } = {}): THREE.Group {
    const g = new THREE.Group();
    const width = Math.max(1, Math.round(options.width ?? 3));
    const depth = Math.max(1, Math.round(options.depth ?? 3));
    const palette = options.theme === 'crypt' ? ['#343331', '#42403c', '#2b2b29'] : ['#716d64', '#827c70', '#5f5b53', '#908878'];
    for (let x = 0; x < width; x += 1) {
      for (let z = 0; z < depth; z += 1) {
        const hash = this.hash(x, z, options.seed);
        this.context.box(
          g,
          x - (width - 1) / 2,
          0.045 + (hash % 3) * 0.004,
          z - (depth - 1) / 2,
          0.92,
          0.09,
          0.92,
          this.mat(`kit-cobble-${hash % palette.length}`, palette[hash % palette.length], options),
          { ry: (hash % 4) * 0.05 }
        );
      }
    }
    return this.scaled(g, options);
  }

  timberWallBuilder(options: VoxelBuilderOptions & { length?: number } = {}): THREE.Group {
    const g = new THREE.Group();
    const length = Math.max(1, Math.round(options.length ?? 3));
    const plaster = this.mat('kit-wall-plaster', options.theme === 'bank' ? '#a58f71' : '#b8a88c', options);
    const timber = this.mat('kit-wall-timber', '#5b331b', options);
    for (let i = 0; i < length; i += 1) {
      const x = i - (length - 1) / 2;
      this.context.box(g, x, 0.92, 0, 0.88, 1.45, 0.26, i % 2 ? plaster : timber);
      this.context.box(g, x, 1.68, -0.02, 0.92, 0.14, 0.32, timber);
    }
    return this.scaled(g, options);
  }

  roofOverhangBuilder(options: VoxelBuilderOptions & { width?: number; depth?: number } = {}): THREE.Group {
    const g = new THREE.Group();
    const width = Math.max(2, Math.round(options.width ?? 4));
    const depth = Math.max(2, Math.round(options.depth ?? 3));
    const roofColors = ['#7a3c19', '#85451f', '#6e3518'];
    for (let x = 0; x < width; x += 1) {
      for (let z = 0; z < depth; z += 1) {
        const hash = this.hash(x, z, options.seed);
        const y = 0.18 + Math.max(0, 0.16 - Math.abs(z - (depth - 1) / 2) * 0.05);
        const tile = this.context.box(g, x - (width - 1) / 2, y, z - (depth - 1) / 2, 0.96, 0.22, 0.96, this.context.material(`kit-roof-overhang-${hash % 3}`, roofColors[hash % 3]));
        tile.userData.roof = true;
      }
    }
    this.context.box(g, 0, 0.43, 0, width + 0.6, 0.14, 0.16, this.context.material('kit-roof-overhang-ridge', '#4a2514')).userData.roof = true;
    return this.scaled(g, options);
  }

  timberHouseBuilder(options: VoxelBuilderOptions & { width?: number; depth?: number; banner?: boolean } = {}): THREE.Group {
    const g = new THREE.Group();
    const width = Math.max(3, Math.round(options.width ?? 4));
    const depth = Math.max(3, Math.round(options.depth ?? 3));
    const stone = this.mat('kit-house-stone', '#797061', options);
    const plaster = this.mat('kit-plaster', options.theme === 'workshop' ? '#a89476' : '#b8a88c', options);
    const wood = this.mat('kit-house-wood', '#5b331b', options);
    const roofColors = ['#7a3c19', '#85451f', '#6e3518', '#8d4b22'];
    for (let ix = 0; ix < width; ix += 1) {
      for (let iz = 0; iz < depth; iz += 1) this.context.box(g, ix, 0.2, iz, 1, 0.4, 1, stone);
    }
    for (let ix = -1; ix <= width; ix += 1) {
      this.context.box(g, ix, 1, -1, 1, 1.3, 0.28, ix % 2 ? plaster : wood);
      this.context.box(g, ix, 1, depth, 1, 1.3, 0.28, ix % 2 ? plaster : wood);
    }
    for (let iz = 0; iz < depth; iz += 1) {
      this.context.box(g, -1, 1, iz, 0.28, 1.3, 1, iz % 2 ? plaster : wood);
      this.context.box(g, width, 1, iz, 0.28, 1.3, 1, iz % 2 ? plaster : wood);
    }
    const doorX = Math.floor(width / 2);
    this.context.box(g, doorX, 0.7, -1.16, 0.52, 1.0, 0.12, this.context.material('kit-house-door', '#5d351d'));
    this.context.box(g, doorX + 0.17, 0.78, -1.24, 0.07, 0.07, 0.06, this.context.material('kit-door-brass', '#cda34a', { metalness: 0.3 }));
    this.context.box(g, -1.16, 1.08, Math.max(1, Math.floor(depth / 2)), 0.1, 0.42, 0.42, this.context.material('kit-window-warm', '#e9b66f', { emissive: '#d78535', emissiveIntensity: 0.28 }));
    this.context.box(g, width + 0.16, 1.08, Math.max(1, Math.floor(depth / 2)), 0.1, 0.42, 0.42, this.context.material('kit-window-warm2', '#e9b66f', { emissive: '#d78535', emissiveIntensity: 0.28 }));
    for (let ix = -1; ix <= width; ix += 1) {
      for (let iz = -1; iz <= depth; iz += 1) {
        const hash = this.hash(ix, iz, options.seed);
        const zCenter = (depth - 1) / 2;
        const rise = Math.max(0, 0.16 - Math.abs(iz - zCenter) * 0.035);
        const roof = this.context.material(`kit-roof-${hash % roofColors.length}`, roofColors[hash % roofColors.length]);
        const tile = this.context.box(g, ix, 1.96 + rise + (hash % 3) * 0.012, iz, 0.96, 0.22, 0.96, roof);
        tile.userData.roof = true;
        if (hash % 2 === 0) this.context.box(g, ix, 2.09 + rise, iz + 0.38, 0.88, 0.035, 0.08, this.context.material('kit-roof-seam', '#4a2514')).userData.roof = true;
      }
    }
    this.context.box(g, (width - 1) / 2, 2.24, (depth - 1) / 2, width + 2.2, 0.18, 0.18, this.context.material('kit-roof-ridge', '#4a2514')).userData.roof = true;
    this.context.box(g, (width - 1) / 2, 1.88, -1.28, width + 2.4, 0.18, 0.18, wood);
    this.context.box(g, (width - 1) / 2, 1.88, depth + 0.28, width + 2.4, 0.18, 0.18, wood);
    if (options.banner) {
      const banner = this.bannerBuilder({ seed: options.seed });
      banner.position.set(width * 0.5, 0, -1.25);
      g.add(banner);
    }
    if ((options.wear ?? 0) > 0.2) {
      this.context.box(g, -1.2, 0.42, depth - 0.4, 0.18, 0.58, 0.42, this.context.material('kit-weathered-brace', '#3f2818'));
      this.context.box(g, width - 0.5, 0.48, depth + 0.18, 0.64, 0.08, 0.16, this.context.material('kit-moss-trim', '#415c34'));
    }
    const lamp = this.lampPostBuilder({ seed: options.seed, color: '#ffbd55' });
    lamp.position.set(-1.2, 0, -1.2);
    g.add(lamp);
    return this.scaled(g, options);
  }

  stoneWallBuilder(options: VoxelBuilderOptions & { length?: number; orientation?: 'x' | 'z' } = {}): THREE.Group {
    const g = new THREE.Group();
    const length = Math.max(1, Math.round(options.length ?? 1));
    const mat = this.mat('kit-low-wall', options.theme === 'crypt' ? '#44413d' : '#63635d', options);
    for (let i = 0; i < length; i += 1) {
      const offset = i - (length - 1) / 2;
      const x = options.orientation === 'z' ? 0 : offset;
      const z = options.orientation === 'z' ? offset : 0;
      this.context.box(g, x, 0.4, z, options.orientation === 'z' ? 0.5 : 1, 0.8, options.orientation === 'z' ? 1 : 0.5, mat);
      if (i % 3 === 0) this.context.box(g, x, 0.86, z, 0.42, 0.08, 0.42, this.mat('kit-wall-cap', '#74726b', options));
      if ((options.damage ?? 0) > 0.35 && i % 5 === 2) this.context.box(g, x, 0.82, z, 0.28, 0.12, 0.22, this.context.material('kit-wall-chip-dark', '#35332f'));
    }
    return this.scaled(g, options);
  }

  marketStallBuilder(options: VoxelBuilderOptions = {}): THREE.Group {
    const g = new THREE.Group();
    const clothColor = options.color ?? '#2c6bb8';
    const wood = this.mat('kit-stall-wood', '#6a421f', options);
    const cloth = this.mat(`kit-stall-cloth-${clothColor}`, clothColor, options);
    for (let ix = 0; ix < 3; ix += 1) this.context.box(g, ix, 0.55, 0, 0.8, 0.25, 1.5, wood);
    for (let ix = 0; ix < 3; ix += 1) this.context.box(g, ix, 1.55, 0, 0.9, 0.18, 1.8, ix % 2 ? this.context.material('kit-cloth-white', '#e3ddcc') : cloth);
    this.context.box(g, -0.4, 0.85, -0.7, 0.14, 1.4, 0.14, wood);
    this.context.box(g, 2.4, 0.85, -0.7, 0.14, 1.4, 0.14, wood);
    if (options.props !== false) {
      this.context.box(g, 0.2, 0.78, -0.25, 0.28, 0.16, 0.28, this.context.material('kit-market-crate', '#8b5729'));
      this.context.box(g, 1.5, 0.78, 0.2, 0.2, 0.2, 0.2, this.context.material('kit-market-apple', '#b74432'));
    }
    if ((options.wear ?? 0) > 0.2) this.context.box(g, 2.15, 1.42, -0.82, 0.5, 0.06, 0.16, this.context.material('kit-frayed-cloth', '#c7bd9f'));
    return this.scaled(g, options);
  }

  fountainBuilder(options: VoxelBuilderOptions = {}): THREE.Group {
    const g = new THREE.Group();
    const stone = this.mat('kit-fountain-stone', '#8c8a82', options);
    const darkStone = this.mat('kit-fountain-shadow', '#5f5e58', options);
    const water = this.context.material('kit-fountain-water', '#3b8fb6', { transparent: true, opacity: 0.78 });
    this.context.box(g, 0, 0.18, 0, 2.2, 0.36, 2.2, stone);
    this.context.box(g, 0, 0.42, 0, 1.55, 0.2, 1.55, water);
    this.context.box(g, 0, 0.86, 0, 0.42, 0.9, 0.42, darkStone);
    this.context.box(g, 0, 1.38, 0, 0.7, 0.18, 0.7, stone);
    return this.scaled(g, options);
  }

  crateBarrelStackBuilder(options: VoxelBuilderOptions = {}): THREE.Group {
    const g = new THREE.Group();
    const wood = this.mat('kit-crate-wood', '#6a421f', options);
    const dark = this.mat('kit-crate-dark', '#4f321d', options);
    const band = this.context.material('kit-barrel-band', '#8d8a80', { metalness: 0.2 });
    this.context.box(g, -0.32, 0.24, 0, 0.56, 0.48, 0.56, wood);
    this.context.box(g, 0.32, 0.2, -0.12, 0.45, 0.4, 0.45, dark, { ry: 0.2 });
    this.context.box(g, 0.34, 0.48, -0.12, 0.5, 0.08, 0.5, band);
    if (options.props !== false) this.context.box(g, -0.34, 0.52, 0.02, 0.42, 0.06, 0.08, this.context.material('kit-crate-lash', '#2f2117'), { ry: 0.4 });
    return this.scaled(g, options);
  }

  flowerBushBuilder(options: VoxelBuilderOptions = {}): THREE.Group {
    const g = new THREE.Group();
    const seed = options.seed ?? 0;
    const leaf = this.mat('kit-bush-leaf', seed % 2 ? '#456d32' : '#577d38', options);
    const flowerA = this.context.material('kit-flower-light', '#f0ead4');
    const flowerB = this.context.material('kit-flower-accent', options.color ?? '#d9544f');
    for (let i = 0; i < 5; i += 1) {
      const hash = this.hash(i, seed, seed + 3);
      const x = ((hash % 7) - 3) * 0.09;
      const z = (((hash / 7) % 7) - 3) * 0.09;
      this.context.box(g, x, 0.12 + i * 0.01, z, 0.22, 0.2, 0.22, leaf);
      if (i % 2 === 0) this.context.box(g, x, 0.28, z, 0.08, 0.08, 0.08, i % 4 === 0 ? flowerB : flowerA);
    }
    return this.scaled(g, options);
  }

  stumpBuilder(options: VoxelBuilderOptions = {}): THREE.Group {
    const g = new THREE.Group();
    const bark = this.mat('kit-stump-bark', '#6c4323', options);
    const cut = this.context.material('kit-stump-cut', '#b88a52');
    this.context.box(g, 0, 0.22, 0, 0.54, 0.44, 0.54, bark, { ry: (options.seed ?? 0) * 0.08 });
    this.context.box(g, 0, 0.47, 0, 0.5, 0.08, 0.5, cut);
    return this.scaled(g, options);
  }

  treeBuilder(options: VoxelBuilderOptions = {}): THREE.Group {
    const g = new THREE.Group();
    const seed = options.seed ?? 0;
    const trunk = this.mat('kit-trunk', '#6c4323', options);
    const leafA = this.mat('kit-leaf', seed % 2 ? '#446c2f' : '#3f6b31', options);
    const leafB = this.mat('kit-leaf2', seed % 3 ? '#537f35' : '#5c843a', options);
    this.context.box(g, 0, 0.55, 0, 0.42 + (seed % 3) * 0.025, 1.1, 0.42, trunk);
    this.context.box(g, 0, 1.25, 0, 1.18, 0.68, 1.18, leafA);
    this.context.box(g, 0.18, 1.73, -0.16, 0.95, 0.52, 0.95, leafB);
    if ((options.damage ?? 0) > 0.35) this.context.box(g, -0.28, 1.15, 0.32, 0.36, 0.18, 0.34, this.context.material('kit-dead-leaf-gap', '#2d3d25'));
    if (options.props) this.context.box(g, -0.42, 0.08, 0.35, 0.38, 0.16, 0.32, this.context.material('kit-root-moss', '#36552d'));
    return this.scaled(g, options);
  }

  rockBuilder(options: VoxelBuilderOptions & { count?: number } = {}): THREE.Group {
    const g = new THREE.Group();
    const seed = options.seed ?? 0;
    const palette =
      options.theme === 'crypt'
        ? ['#4b4946', '#57534e', '#343231']
        : options.theme === 'road'
          ? ['#777368', '#5c574f', '#868073']
          : ['#6b6963', '#575650', '#77746d'];
    const count = Math.max(2, Math.min(5, Math.round(options.count ?? 3)));
    for (let i = 0; i < count; i += 1) {
      const hash = this.hash(i, seed, typeof options.variation === 'number' ? options.variation : seed);
      const x = ((hash % 7) - 3) * 0.16;
      const z = (((hash / 7) % 7) - 3) * 0.12;
      const scale = 0.82 + (hash % 4) * 0.08;
      this.context.box(
        g,
        x,
        0.09 + i * 0.026,
        z,
        (0.28 + (hash % 3) * 0.08) * scale,
        (0.16 + (hash % 2) * 0.08) * scale,
        (0.24 + (hash % 4) * 0.05) * scale,
        this.mat(`kit-rock-${i}`, palette[i % palette.length], options),
        { ry: hash * 0.03 }
      );
    }
    if ((options.wear ?? 0) > 0.2) this.context.box(g, -0.22, 0.2, 0.24, 0.18, 0.05, 0.12, this.context.material('kit-rock-moss', '#415c34'));
    return this.scaled(g, options);
  }

  oreVeinBuilder(options: VoxelBuilderOptions = {}): THREE.Group {
    const g = new THREE.Group();
    const color = options.color ?? '#9ba5a3';
    const rock = this.mat('kit-ore-rock', options.theme === 'crypt' ? '#4b4946' : '#54504a', options);
    this.context.box(g, 0, 0.22, 0, 0.9, 0.44, 0.72, rock, { ry: (options.seed ?? 0) * 0.04 });
    this.context.box(g, -0.22, 0.47, 0.18, 0.26, 0.18, 0.22, this.context.material(`kit-ore-${color}`, color, { emissive: color, emissiveIntensity: 0.15 }));
    this.context.box(g, 0.28, 0.38, -0.16, 0.22, 0.16, 0.22, this.context.material(`kit-ore2-${color}`, color, { emissive: color, emissiveIntensity: 0.12 }));
    return this.scaled(g, options);
  }

  mineEntranceBuilder(options: VoxelBuilderOptions = {}): THREE.Group {
    const g = new THREE.Group();
    const rock = this.mat('kit-mine-rock', '#5a5853', options);
    const dark = this.context.material('kit-mine-dark', '#11100f');
    const wood = this.mat('kit-mine-wood', '#6a421f', options);
    this.context.box(g, 0, 0.6, 0, 3, 1.2, 1, rock);
    this.context.box(g, 0, 0.55, -0.15, 1.4, 1.1, 0.5, dark);
    this.context.box(g, 0, 1.25, -0.55, 2.5, 0.22, 0.22, wood);
    this.context.box(g, -1.05, 0.65, -0.46, 0.22, 1.1, 0.22, wood);
    this.context.box(g, 1.05, 0.65, -0.46, 0.22, 1.1, 0.22, wood);
    return this.scaled(g, options);
  }

  cryptWallBuilder(options: VoxelBuilderOptions & { length?: number; orientation?: 'x' | 'z' } = {}): THREE.Group {
    return this.stoneWallBuilder({ ...options, theme: 'crypt', damage: Math.max(options.damage ?? 0, 0.32) });
  }

  cryptFloorBuilder(options: VoxelBuilderOptions & { width?: number; depth?: number } = {}): THREE.Group {
    return this.cobblestonePathBuilder({ ...options, theme: 'crypt', width: options.width ?? 3, depth: options.depth ?? 3 });
  }

  dungeonColumnBuilder(options: VoxelBuilderOptions = {}): THREE.Group {
    const g = new THREE.Group();
    const stone = this.mat('kit-column', '#55524d', options);
    this.context.box(g, 0, 0.2, 0, 0.9, 0.35, 0.9, stone);
    this.context.box(g, 0, 1.05, 0, 0.62, 1.7, 0.62, stone);
    this.context.box(g, 0, 1.95, 0, 0.9, 0.35, 0.9, stone);
    if ((options.damage ?? 0) > 0.3) this.context.box(g, 0.28, 1.8, 0.28, 0.2, 0.16, 0.22, this.context.material('kit-column-chip', '#343231'));
    return this.scaled(g, options);
  }

  rubbleBuilder(options: VoxelBuilderOptions & { count?: number } = {}): THREE.Group {
    const g = new THREE.Group();
    const seed = options.seed ?? 0;
    const palette = options.theme === 'crypt' ? ['#4b4946', '#64615b', '#373532'] : ['#69655d', '#56524c', '#7a756a'];
    const count = Math.max(3, Math.min(8, Math.round(options.count ?? 5)));
    for (let i = 0; i < count; i += 1) {
      const hash = this.hash(i + 3, seed + 5, typeof options.variation === 'number' ? options.variation : seed);
      const ox = ((hash % 9) - 4) * 0.1;
      const oz = (((hash / 9) % 9) - 4) * 0.09;
      const damageScale = 1 + (options.damage ?? 0) * 0.22;
      this.context.box(
        g,
        ox,
        0.06 + i * 0.014,
        oz,
        (0.2 + (hash % 3) * 0.04) * damageScale,
        0.12 + (hash % 2) * 0.04,
        0.18 + (hash % 4) * 0.035,
        this.mat(`kit-rubble-${i}`, palette[i % palette.length], options),
        { ry: hash * 0.04 }
      );
    }
    if ((options.damage ?? 0) > 0.35) this.context.box(g, 0.18, 0.16, -0.18, 0.36, 0.035, 0.05, this.context.material('kit-rubble-crack-shadow', '#151515'), { ry: 0.5 });
    return this.scaled(g, options);
  }

  chestBuilder(options: VoxelBuilderOptions & { locked?: boolean; trapped?: boolean } = {}): THREE.Group {
    const g = new THREE.Group();
    this.context.box(g, 0, 0.25, 0, 0.9, 0.5, 0.58, this.mat('kit-chest-wood', '#5a341b', options));
    this.context.box(g, 0, 0.55, 0, 0.96, 0.16, 0.64, this.mat('kit-chest-lid', '#744521', options));
    this.context.box(
      g,
      0,
      0.42,
      -0.32,
      0.18,
      0.2,
      0.08,
      this.context.material('kit-chest-lock', options.locked ? '#79d7ff' : '#d0a449', { metalness: 0.35, emissive: options.trapped ? '#3b98ff' : '#000000', emissiveIntensity: options.trapped ? 0.45 : 0 })
    );
    return this.scaled(g, options);
  }

  forgeBuilder(options: VoxelBuilderOptions = {}): THREE.Group {
    const g = new THREE.Group();
    this.context.box(g, 0, 0.45, 0, 1.8, 0.9, 1.2, this.mat('kit-forge-stone', '#4c4842', options));
    this.context.box(g, 0, 0.75, -0.35, 1.2, 0.35, 0.45, this.context.material('kit-forge-fire', '#ff5c1f', { emissive: '#ff3c10', emissiveIntensity: 1.8 }));
    this.context.box(g, 0, 1.65, 0, 0.65, 1.8, 0.65, this.context.material('kit-chimney', '#393634'));
    if (options.props !== false) this.context.box(g, -0.7, 0.8, 0.35, 0.24, 0.12, 0.24, this.context.material('kit-hot-ingot', '#ff8a2e', { emissive: '#ff5c1f', emissiveIntensity: 0.8 }));
    return this.scaled(g, options);
  }

  anvilBuilder(options: VoxelBuilderOptions = {}): THREE.Group {
    const g = new THREE.Group();
    const metal = this.context.material('kit-anvil-metal', '#777c80', { metalness: 0.25 });
    this.context.box(g, 0, 0.2, 0, 0.9, 0.24, 0.46, metal);
    this.context.box(g, -0.28, 0.44, 0, 0.38, 0.24, 0.34, metal);
    this.context.box(g, 0.26, 0.48, 0, 0.62, 0.16, 0.28, metal);
    this.context.box(g, 0.64, 0.48, 0, 0.22, 0.1, 0.2, metal);
    return this.scaled(g, options);
  }

  toolRackBuilder(options: VoxelBuilderOptions = {}): THREE.Group {
    const g = new THREE.Group();
    const wood = this.mat('kit-tool-rack-wood', '#5b331b', options);
    const metal = this.context.material('kit-tool-rack-metal', '#a7aaa7', { metalness: 0.22 });
    this.context.box(g, 0, 0.85, 0, 1.45, 0.14, 0.12, wood);
    this.context.box(g, -0.55, 0.48, 0, 0.1, 0.88, 0.08, metal, { rz: 0.25 });
    this.context.box(g, 0, 0.52, 0, 0.1, 0.8, 0.08, metal);
    this.context.box(g, 0.55, 0.48, 0, 0.1, 0.88, 0.08, metal, { rz: -0.25 });
    return this.scaled(g, options);
  }

  bankShelfBuilder(options: VoxelBuilderOptions = {}): THREE.Group {
    const g = new THREE.Group();
    const wood = this.mat('kit-bank-shelf-wood', '#5a351d', options);
    const paper = this.context.material('kit-bank-paper', '#d7bf8d');
    this.context.box(g, 0, 0.7, 0, 1.5, 1.4, 0.28, wood);
    for (let i = 0; i < 3; i += 1) this.context.box(g, 0, 0.3 + i * 0.38, -0.18, 1.36, 0.08, 0.2, wood);
    this.context.box(g, -0.35, 0.54, -0.34, 0.32, 0.18, 0.12, paper, { rz: 0.1 });
    this.context.box(g, 0.34, 0.95, -0.34, 0.28, 0.2, 0.12, this.context.material('kit-bank-book-red', '#8a2b31'));
    return this.scaled(g, options);
  }

  bankCounterBuilder(options: VoxelBuilderOptions & { width?: number } = {}): THREE.Group {
    const g = new THREE.Group();
    const width = Math.max(2, Math.round(options.width ?? 4));
    const wood = this.mat('kit-bank-counter', '#5a351d', options);
    const top = this.context.material('kit-bank-counter-top', '#7b4b29');
    this.context.box(g, 0, 0.45, 0, width, 0.9, 0.72, wood);
    this.context.box(g, 0, 0.94, -0.04, width + 0.2, 0.12, 0.88, top);
    this.context.box(g, -width * 0.25, 1.04, -0.12, 0.5, 0.04, 0.28, this.context.material('kit-counter-ledger', '#d7bf8d'), { ry: -0.2 });
    return this.scaled(g, options);
  }

  buildModeGhostBuilder(options: VoxelBuilderOptions & { valid?: boolean } = {}): THREE.Group {
    const g = new THREE.Group();
    const color = options.color ?? (options.valid === false ? '#e84a4a' : '#60d871');
    const ghost = this.context.material(`kit-build-ghost-${color}`, color, { transparent: true, opacity: 0.42, emissive: color, emissiveIntensity: 0.12 });
    this.context.box(g, 0, 0.1, 0, 2.2, 0.04, 2.2, ghost);
    this.context.box(g, -0.85, 0.7, -0.85, 0.22, 1.2, 0.22, ghost);
    this.context.box(g, 0.85, 0.7, -0.85, 0.22, 1.2, 0.22, ghost);
    this.context.box(g, 0, 1.34, -0.85, 2.1, 0.18, 0.22, ghost);
    return this.scaled(g, options);
  }


  fenceBuilder(options: VoxelBuilderOptions = {}): THREE.Group {
    const g = new THREE.Group();
    const wood = this.mat('kit-fence', '#87552c', options);
    this.context.box(g, -0.45, 0.38, 0, 0.16, 0.76, 0.16, wood);
    this.context.box(g, 0.45, 0.38, 0, 0.16, 0.76, 0.16, wood);
    this.context.box(g, 0, 0.58, 0, 1.15, 0.16, 0.14, wood);
    this.context.box(g, 0, 0.28, 0, 1.05, 0.12, 0.12, wood);
    if ((options.damage ?? 0) > 0.3) this.context.box(g, 0.28, 0.5, 0.03, 0.5, 0.1, 0.1, this.context.material('kit-fence-splinter', '#5b351f'), { rz: -0.35 });
    return this.scaled(g, options);
  }

  bridgeBuilder(options: VoxelBuilderOptions & { length?: number } = {}): THREE.Group {
    const g = new THREE.Group();
    const wood = this.mat('kit-bridge', '#6e4524', options);
    const length = Math.max(3, Math.round(options.length ?? 5));
    for (let i = 0; i < length; i += 1) this.context.box(g, i - (length - 1) / 2, 0.2, 0, 0.9, 0.18, 2.2, wood);
    this.context.box(g, 0, 0.65, -1.1, length, 0.14, 0.14, wood);
    this.context.box(g, 0, 0.65, 1.1, length, 0.14, 0.14, wood);
    if ((options.wear ?? 0) > 0.25) this.context.box(g, 1.2, 0.34, 0.48, 0.55, 0.08, 0.34, this.context.material('kit-bridge-patch', '#4f321d'));
    return this.scaled(g, options);
  }

  dockBuilder(options: VoxelBuilderOptions & { length?: number } = {}): THREE.Group {
    const g = new THREE.Group();
    const wood = this.mat('kit-dock-wood', '#6a421f', options);
    const length = Math.max(3, Math.round(options.length ?? 5));
    for (let ix = 0; ix < length; ix += 1) this.context.box(g, ix, 0.15, 0, 0.85, 0.18, 1.4, wood);
    this.context.box(g, (length - 1) / 2, 0.45, -0.8, length - 0.5, 0.14, 0.14, wood);
    if ((options.wear ?? 0) > 0.25) this.context.box(g, length - 1.1, 0.28, 0.42, 0.5, 0.08, 0.32, this.context.material('kit-dock-dark-plank', '#47301d'));
    return this.scaled(g, options);
  }

  lampPostBuilder(options: VoxelBuilderOptions = {}): THREE.Group {
    const g = new THREE.Group();
    this.context.box(g, 0, 0.55, 0, 0.14, 1.1, 0.14, this.mat('kit-lamp-post', '#4a2d17', options));
    this.context.box(g, 0, 1.16, 0, 0.28, 0.28, 0.28, this.context.material('kit-lamp-fire', options.color ?? '#ff9b2f', { emissive: '#ff5c1f', emissiveIntensity: 1.4 }));
    return this.scaled(g, options);
  }

  bannerBuilder(options: VoxelBuilderOptions = {}): THREE.Group {
    const g = new THREE.Group();
    this.context.box(g, 0, 1.2, 0, 0.08, 1.1, 0.65, this.mat('kit-banner', options.color ?? '#1f5a95', options));
    this.context.box(g, 0, 1.2, 0, 0.1, 0.14, 0.14, this.context.material('kit-banner-mark', '#d0a449'));
    return this.scaled(g, options);
  }

  private mat(name: string, color: string, options: VoxelBuilderOptions): THREE.Material {
    const variation = options.colorVariation ?? 0;
    if (!variation) return this.context.material(name, color);
    const c = new THREE.Color(color);
    const n = ((this.hash(variation * 10, variation * 20, options.seed) % 100) / 100 - 0.5) * variation;
    c.offsetHSL(0, 0, n);
    return this.context.material(`${name}-${n.toFixed(2)}`, `#${c.getHexString()}`);
  }

  private scaled(group: THREE.Group, options: VoxelBuilderOptions): THREE.Group {
    if (options.seed != null) group.userData.seed = options.seed;
    if (options.variation != null) group.userData.variation = options.variation;
    if (options.theme) group.userData.theme = options.theme;
    if (options.metadata) group.userData.metadata = options.metadata;
    if (options.size && options.size !== 1) group.scale.setScalar(options.size);
    return group;
  }

  private hash(x: number, z: number, seed = 0): number {
    return Math.abs(Math.floor(Math.sin(x * 127.1 + z * 311.7 + seed * 17.3) * 10000));
  }
}
