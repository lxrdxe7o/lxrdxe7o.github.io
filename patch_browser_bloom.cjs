const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/runtime/rendering/browser.ts');
let content = fs.readFileSync(file, 'utf8');

const imports = `import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Vector2 } from 'three';
`;

content = content.replace("import {", imports + "import {");

const renderClass = `class ThreeRendererBackend implements RendererBackend {
  readonly renderer: WebGLRenderer;
  private composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private bloomPass: UnrealBloomPass | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      depth: true,
      stencil: false,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setClearColor(0x050306, 1);
  }

  setPixelRatio(value: number): void {
    this.renderer.setPixelRatio(value);
    if (this.composer) this.composer.setPixelRatio(value);
  }

  setSize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    if (this.composer) this.composer.setSize(width, height);
  }

  render(scene: unknown, camera: unknown): void {
    if (!this.composer) {
      this.composer = new EffectComposer(this.renderer);
      this.renderPass = new RenderPass(scene as Scene, camera as Camera);
      this.renderPass.clearColor = new Color(0x050306);
      this.renderPass.clearAlpha = 1.0;
      this.composer.addPass(this.renderPass);
      this.bloomPass = new UnrealBloomPass(new Vector2(window.innerWidth, window.innerHeight), 1.2, 0.4, 0.6);
      this.composer.addPass(this.bloomPass);
    } else {
      if (this.renderPass) {
        this.renderPass.scene = scene as Scene;
        this.renderPass.camera = camera as Camera;
      }
    }
    this.composer.render();
  }

  forceContextLoss(): void {
    this.renderer.forceContextLoss();
  }

  dispose(): void {
    if (this.composer) this.composer.dispose();
    this.renderer.dispose();
  }
}`;

content = content.replace(/class ThreeRendererBackend implements RendererBackend \{[\s\S]*?dispose\(\): void \{\s*this\.renderer\.dispose\(\);\s*\}\s*\}/, renderClass);

// Color isn't imported from three! I need to ensure Color is in the import list from 'three'
if (!content.includes(' Color,')) {
    content = content.replace('type Camera,', 'Color, type Camera,');
}

fs.writeFileSync(file, content);
console.log("Patched browser.ts with Bloom");
