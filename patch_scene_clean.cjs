const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/runtime/rendering/scenes/ProjectCarouselScene.ts');
let content = fs.readFileSync(file, 'utf8');

// Optionally, remove the background stuff that is no longer needed.
// This is a bit tricky with simple string replace, so I'll just change the visibility of them.
content = content.replace("this.scene.add(this.bgMesh);", "// this.scene.add(this.bgMesh);");
content = content.replace("this.scene.add(this.gridMesh);", "// this.scene.add(this.gridMesh);");
content = content.replace("this.scene.add(this.particles);", "// this.scene.add(this.particles);");

fs.writeFileSync(file, content);
console.log('Cleaned background successfully');
