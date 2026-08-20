const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/runtime/rendering/scenes/ProjectCarouselScene.ts');
let content = fs.readFileSync(file, 'utf8');

// 1. Add imports
content = content.replace(
  "import {",
  "import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';\nimport {"
);
content = content.replace(
  "Vector3,",
  "Vector3,\n  Object3D,"
);

// 2. Add property to the class
content = content.replace(
  "private gridMesh: Mesh | null = null;",
  "private gridMesh: Mesh | null = null;\n  private bgModel: Object3D | null = null;"
);

// 3. Load the model in onPrepare
content = content.replace(
  "protected async onPrepare(_manifest: ScenePreparationManifest): Promise<void> {",
  `protected async onPrepare(_manifest: ScenePreparationManifest): Promise<void> {
    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync('/models/canvas_bg.glb');
      this.bgModel = gltf.scene;
      this.bgModel.scale.set(0.6, 0.6, 0.6);
      this.bgModel.position.set(0, -1, -5);
      this.scene.add(this.bgModel);
    } catch (e) {
      console.error(e);
    }`
);

// 4. Update the rotation in onUpdate
content = content.replace(
  "this.scrollVelocity *= 0.9;",
  `this.scrollVelocity *= 0.9;
    if (this.bgModel) {
      this.bgModel.rotation.y = time * 0.1;
      this.bgModel.rotation.x = Math.sin(time * 0.3) * 0.05;
      this.bgModel.rotation.z += this.scrollVelocity * 0.5;
    }`
);

// 5. Clean up in onDispose
content = content.replace(
  "if (this.particles) {",
  `if (this.bgModel) {
      this.scene.remove(this.bgModel);
      this.bgModel = null;
    }
    if (this.particles) {`
);

fs.writeFileSync(file, content);
console.log('Patched successfully');
