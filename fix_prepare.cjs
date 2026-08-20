const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/runtime/rendering/scenes/ProjectCarouselScene.ts');
let content = fs.readFileSync(file, 'utf8');

// The original signature is: protected onPrepare(manifest: ScenePreparationManifest): void {
const search = "protected onPrepare(manifest: ScenePreparationManifest): void {";
const replace = `protected async onPrepare(manifest: ScenePreparationManifest): Promise<void> {
    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync('/models/canvas_bg.glb');
      this.bgModel = gltf.scene;
      this.bgModel.scale.set(0.6, 0.6, 0.6);
      this.bgModel.position.set(0, -1, -5);
      
      const ambient = new AmbientLight(0xffffff, 1.2);
      this.scene.add(ambient);
      const dirLight = new DirectionalLight(0xaaccff, 2.5);
      dirLight.position.set(5, 5, 5);
      this.scene.add(dirLight);

      this.scene.add(this.bgModel);
    } catch (e) {
      console.error(e);
    }`;

content = content.replace(search, replace);

// Also need to add AmbientLight and DirectionalLight to imports
content = content.replace("Object3D,", "Object3D,\n  AmbientLight,\n  DirectionalLight,");

fs.writeFileSync(file, content);
console.log('Fixed onPrepare');
