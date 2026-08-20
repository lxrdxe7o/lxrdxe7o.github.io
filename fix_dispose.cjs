const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/runtime/rendering/scenes/ProjectCarouselScene.ts');
let content = fs.readFileSync(file, 'utf8');

// Remove from onUpdate
const badBlock = `if (this.bgModel) {
      this.scene.remove(this.bgModel);
      this.bgModel = null;
    }
    if (this.particles) {
      (this.particles.material`;

content = content.replace(badBlock, `if (this.particles) {
      (this.particles.material`);

// Add to onDispose
content = content.replace(
  "if (this.gridMesh) {",
  `if (this.bgModel) {
      this.scene.remove(this.bgModel);
      this.bgModel = null;
    }
    if (this.gridMesh) {`
);

fs.writeFileSync(file, content);
console.log('Fixed onDispose');
