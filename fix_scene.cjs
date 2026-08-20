const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/runtime/rendering/scenes/ProjectCarouselScene.ts');
let content = fs.readFileSync(file, 'utf8');

// Add bgModel definition
content = content.replace(
  "private gridMesh: Mesh<PlaneGeometry, ShaderMaterial> | null = null;",
  "private gridMesh: Mesh<PlaneGeometry, ShaderMaterial> | null = null;\n  private bgModel: Object3D | null = null;"
);

// Fix the onUpdate block where time is used
// Replace the inserted block that causes error with the right one
const badBlock = `this.scrollVelocity *= 0.9;
    if (this.bgModel) {
      this.bgModel.rotation.y = time * 0.1;
      this.bgModel.rotation.x = Math.sin(time * 0.3) * 0.05;
      this.bgModel.rotation.z += this.scrollVelocity * 0.5;
    }`;

content = content.replace(badBlock, "this.scrollVelocity *= 0.9;");

// find where time is defined in onUpdate:
// const time = frame.elapsed;
// insert the bgModel rotation after that
content = content.replace(
  "const time = frame.elapsed;",
  `const time = frame.elapsed;
    if (this.bgModel) {
      this.bgModel.rotation.y = time * 0.1;
      this.bgModel.rotation.x = Math.sin(time * 0.3) * 0.05;
      this.bgModel.rotation.z += this.scrollVelocity * 0.5;
    }`
);

fs.writeFileSync(file, content);
console.log('Fixed ProjectCarouselScene');
