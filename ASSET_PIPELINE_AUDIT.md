# Asset Pipeline Audit

Date: 2026-05-18

## Current Repository State

Existing before this pass:
- Procedural voxel runtime in `src/render/VoxelRenderer.ts`.
- Flat SVG-style icon descriptors in `src/render/IconRenderer.ts` and `src/data/items.ts`.
- No committed `assets/source/blockbench`, `assets/source/magicavoxel`, `assets/exported/models`, `assets/exported/static`, or `assets/generated/icons` directories.
- No `.bbmodel`, `.vox`, `.glb`, `.gltf`, or `.obj` runtime asset inventory.
- No conversion, thumbnail, or icon-generation scripts in `package.json`.

Added in this pass:
- Source/runtime folder structure under `assets/`.
- Five minimal Blockbench source samples:
  - `assets/source/blockbench/iron_sword.bbmodel`
  - `assets/source/blockbench/simple_bow.bbmodel`
  - `assets/source/blockbench/cracked_shield.bbmodel`
  - `assets/source/blockbench/leather_armor.bbmodel`
  - `assets/source/blockbench/backpack.bbmodel`
- Visual prefab registry in `src/data/visualPrefabs.ts`.
- Runtime model loader/cache in `src/render/AssetManager.ts`.
- Icon render request contract in `src/render/IconPipeline.ts`.
- Content validation for visual prefab metadata and item prefab references.

## Missing Pieces

- Real exported `.glb/.gltf` models in `assets/exported/models`.
- `.vox` source files for MagicaVoxel props.
- Automated Blockbench/MagicaVoxel export commands.
- Committed icon atlas or generated transparent PNG icons.
- Attach calibration UI scene with live offset editing.

## Source vs Runtime Assets

Source assets are editable art files and must not be required at browser runtime:
- `assets/source/blockbench/*.bbmodel`
- `assets/source/magicavoxel/*.vox`

Runtime assets are optimized exports:
- `assets/exported/models/*.glb`
- `assets/exported/static/*.obj` or `.glb`
- `assets/generated/icons/*.png` or a generated atlas

The browser runtime should load exported assets through `AssetManager`. If a runtime path is absent or fails to load, gameplay falls back to the procedural factories declared in `visualPrefabs`.

## Format Strategy

Blockbench:
- Use for attachable equipment and any future animated low-poly gear.
- Export to `.glb` when the model is worth loading over the procedural fallback.
- Preserve pivot at the attach origin, +Y up, and -Z forward.

MagicaVoxel:
- Use for static voxel props, small decorative gear, and icon source renders.
- Keep `.vox` as source only unless a runtime loader/converter is explicitly added.

Three.js:
- Prefer `.glb/.gltf` via `GLTFLoader`.
- Cache loaded models in `AssetManager`.
- Dispose geometries/materials through `AssetManager.dispose()`.

## Visual Prefab Registry

`src/data/visualPrefabs.ts` defines:
- `id`
- `sourceTool`
- `sourcePath`
- `runtimePath`
- `fallbackProceduralFactory`
- `attachPointDefaults`
- `scale`
- `rotationOffset`
- `iconCameraPreset`
- `materialOverrides`
- `lodPolicy`
- `maxRuntimeBytes`

High-value starter visuals currently covered by source samples and/or procedural fallbacks:
- `weapon:sword`
- `weapon:bow`
- `shield:round`
- `armor:leather`
- `pack:backpack`
- `tool:axe`
- `tool:pickaxe`

## Icon Pipeline

`src/render/IconPipeline.ts` creates icon render requests from item prefab metadata:
- fixed orthographic camera preset;
- transparent background;
- material overlays from the prefab;
- rarity overlay as a separate layer;
- fallback to existing vector icon shape if no generated icon exists.

Actual PNG/atlas generation is intentionally not added until a committed render script and asset budget exist.

## Attach Calibration Scene

Needed next:
- Dev-only scene showing Valen, all attach points, and one selected `visualPrefab`.
- Controls for position/rotation/scale offset.
- Export of calibrated values back into `src/data/visualPrefabs.ts`.

## Validation

`validateContent()` now checks:
- duplicate visual prefab ids;
- missing fallback factory;
- missing icon camera preset;
- invalid attach point;
- unsupported source/runtime extensions;
- runtime path outside `assets/exported`;
- source path outside `assets/source`;
- runtime byte budget over 250 KB;
- item `visualPrefabId` pointing at a missing prefab.

Warnings, not errors, are emitted for visual-capable items that still rely on generic procedural mapping.
