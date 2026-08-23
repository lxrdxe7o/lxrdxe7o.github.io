import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  FogExp2,
  Group,
  Mesh, MeshPhysicalMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
  Object3D,
  AmbientLight,
  DirectionalLight,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

import type { ResourceScope } from '../ResourceTracker';
import type {
  Frame,
  PointerPosition,
  ScenePreparationManifest,
  SceneRenderState,
  SceneState,
  Viewport,
} from '../types';
import { BaseScene } from './BaseScene';

export interface ProjectCardData {
  slug: string;
  title: string;
  category: string;
  color: string;
  textureUrl?: string;
}

export const PROJECT_CARDS: readonly ProjectCardData[] = [
  {
    slug: 'xero-dev',
    title: 'Xero Dev',
    category: 'Publication & Framework',
    color: '#7cdafc',
    textureUrl: '/media/projects/xero-dev/xero-dev-desktop-hero-1280.webp',
  },
  {
    slug: 'krakenvim',
    title: 'Krakenvim',
    category: 'Developer Tooling / Lua',
    color: '#f87171',
  },
  {
    slug: 'hachi',
    title: 'Hachi',
    category: 'Terminal Tooling / Rust',
    color: '#34d399',
  },
  {
    slug: 'mikeneko',
    title: 'Mikeneko',
    category: 'Autonomous Bot Architecture',
    color: '#a78bfa',
  },
  {
    slug: 'shiro-nekoo-115',
    title: 'Shiro Neko',
    category: 'Full-Stack Application',
    color: '#fbbf24',
  },
  {
    slug: 'deaddrop',
    title: 'Deaddrop',
    category: 'Encrypted File Utility',
    color: '#38bdf8',
  },
  {
    slug: 'dotfiles',
    title: 'Dotfiles',
    category: 'UNIX System Architecture',
    color: '#94a3b8',
  },
  {
    slug: 'tora-neko-311',
    title: 'Tora Neko',
    category: 'Media Engine Application',
    color: '#f472b6',
  },
  {
    slug: 'kuro-nekoo-215',
    title: 'Kuro Neko',
    category: 'High-Performance Application',
    color: '#4ade80',
  },
];

const VolumetricFogShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uScroll: { value: 0 },
    uColor: { value: new Color() },
    uResolution: { value: new Vector2() },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uScroll;
    uniform vec3 uColor;
    uniform vec2 uResolution;
    varying vec2 vUv;

    // FBM Noise
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float noise(vec2 st) {
        vec2 i = floor(st); vec2 f = fract(st);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 st) {
        float v = 0.0, a = 0.5;
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
        for (int i = 0; i < 5; ++i) {
            v += a * noise(st);
            st = rot * st * 2.0 + vec2(100.0);
            a *= 0.5;
        }
        return v;
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      
      // Screen coordinates
      vec2 st = vUv;
      st.x *= uResolution.x / uResolution.y;

      // Distance from center (project card area)
      vec2 center = vec2(0.5 * (uResolution.x / uResolution.y), 0.5);
      float dist = distance(st, center);

      // Scroll reactivity
      vec2 scrollOffset = vec2(0.0, uScroll * 2.0);
      
      // Heavy borders, clear center
      float fogMask = smoothstep(0.15, 0.7, dist);
      
      // FBM Wisps
      vec2 fogUv = st * 3.0 + vec2(uTime * 0.2) + scrollOffset;
      float wisp = fbm(fogUv);
      float wisp2 = fbm(fogUv * 0.5 - vec2(uTime * 0.1));
      float fogDensity = mix(wisp, wisp2, 0.5) * fogMask;
      
      // Boost density at edges heavily
      fogDensity = pow(fogDensity, 0.8) * 1.5;
      fogDensity = clamp(fogDensity, 0.0, 1.0);

      // Color tinting
      vec3 lightBase = mix(vec3(0.35, 0.42, 0.55), uColor * 0.65, 0.5);
      vec3 highlight = mix(vec3(0.65, 0.72, 0.82), uColor * 1.4, 0.45);
      vec3 fogColor = mix(lightBase, highlight, wisp);

      gl_FragColor = vec4(mix(texel.rgb, fogColor, fogDensity * 0.95), texel.a);
    }
  `
};

function createFallbackTexture(project: ProjectCardData): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 800;
  const ctx = canvas.getContext('2d')!;

  // Deep premium background
  ctx.fillStyle = '#060608';
  ctx.fillRect(0, 0, 1280, 800);

  // Subtle ambient glow from the project's color
  const rad = ctx.createRadialGradient(640, 800, 100, 640, 800, 800);
  rad.addColorStop(0, project.color + '1a'); // 10% opacity
  rad.addColorStop(1, 'transparent');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, 1280, 800);

  // Fine noise texture overlay for physical feel
  ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
  for (let i = 0; i < 1280; i += 4) {
    for (let j = 0; j < 800; j += 4) {
      if (Math.random() > 0.5) ctx.fillRect(i, j, 2, 2);
    }
  }

  // Draw an elegant frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.strokeRect(40, 40, 1200, 720);

  // Main Typography - High contrast, confident, no generic eyebrows
  ctx.fillStyle = '#ffffff';
  ctx.font = '500 84px "Geist", sans-serif';
  ctx.fillText(project.title, 80, 620);

  // Category in subtle muted text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '400 28px "Geist", sans-serif';
  ctx.fillText(project.category, 80, 680);

  // Small brand color accent block instead of text eyebrow
  ctx.fillStyle = project.color;
  ctx.fillRect(80, 500, 48, 4);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

const vertexShader = `
  uniform float uHover;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec3 pos = position;
    
    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const fragmentShader = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform vec3 uColor;
  uniform float uHover;
  uniform float uTime;
  uniform float uAlpha;
  uniform vec2 uPointer;
  uniform float uScroll;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = vUv;
    
    // Add scroll distortion
    float scrollDistort = uScroll * 1.5;
    uv.y += sin(uv.x * 10.0 + uTime) * scrollDistort * 0.05;
    uv.x += cos(uv.y * 10.0 + uTime) * scrollDistort * 0.05;
    
    // Matrix cubes effect
    vec2 gridCount = vec2(64.0, 36.0); // 16:9 ratio grid
    
    // Only apply grid logic if hover is active to save performance and keep image perfectly intact
    if (uHover > 0.001) {
      vec2 gridUv = floor(uv * gridCount) / gridCount;
      vec2 cellUv = fract(uv * gridCount);
      
      // Use distance from the center of the card for the hover effect
      // since the pointer is in screen space and the card is projected.
      float dist = distance(gridUv, vec2(0.5));
      
      // Scatter radius based on hover intensity and distance from center
      float scatter = smoothstep(0.7, 0.0, dist) * uHover;
      
      if (scatter > 0.01) {
        float n = hash(gridUv);
        
        // Offset the fetch UV based on noise and scatter (Z-depth pushing)
        float zPush = (n - 0.5) * scatter * 0.15;
        vec2 fetchUv = gridUv + vec2(zPush);
        
        vec4 tex = texture2D(uTexture, fetchUv);
        
        // 3D Bevel/Extrusion shading
        float border = 0.02 + scatter * 0.15;
        float left = smoothstep(0.0, border, cellUv.x);
        float bottom = smoothstep(0.0, border, cellUv.y);
        float right = smoothstep(1.0, 1.0 - border, cellUv.x);
        float top = smoothstep(1.0, 1.0 - border, cellUv.y);
        
        float shadow = left * bottom * right * top;
        
        vec3 finalColor = tex.rgb * (0.8 + shadow * 0.2);
        
        // Fake lighting on edges
        if (cellUv.y > 1.0 - border) finalColor += vec3(0.15 * scatter);
        if (cellUv.x < border) finalColor -= vec3(0.1 * scatter);
        if (cellUv.x > 1.0 - border) finalColor -= vec3(0.2 * scatter);
        
        // Mix in brand color slightly
        finalColor = mix(finalColor, uColor, scatter * 0.2);
        
        gl_FragColor = vec4(finalColor, uAlpha);
      } else {
        vec4 tex = texture2D(uTexture, uv);
        gl_FragColor = vec4(tex.rgb, uAlpha);
      }
    } else {
      vec4 tex = texture2D(uTexture, uv);
      gl_FragColor = vec4(tex.rgb, uAlpha);
    }
    
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class ProjectCarouselScene extends BaseScene {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(45, 1, 0.1, 100);
  private readonly carouselGroup = new Group();
  private readonly cards: Array<{
    mesh: Mesh<PlaneGeometry, ShaderMaterial>;
    data: ProjectCardData;
    targetAngle: number;
    currentAngle: number;
  }> = [];

  private particles: Points | null = null;
  private bgMesh: Mesh<PlaneGeometry, ShaderMaterial> | null = null;
  private gridMesh: Mesh<PlaneGeometry, ShaderMaterial> | null = null;
  private bgModel: Object3D | null = null;
  private targetColor = new Color(PROJECT_CARDS[0].color);
  private bgUniforms = {
    uTime: { value: 0 },
    uPointer: { value: new Vector2() },
    uScroll: { value: 0 },
    uResolution: { value: new Vector2(1, 1) },
    uColor: { value: new Color(PROJECT_CARDS[0].color) }
  };
  private currentProgress = 0;
  private targetProgress = 0;
  private scrollVelocity = 0;
  private activeIndex = 0;
  private pointerPos = new Vector2(0, 0);

  private composer: EffectComposer | null = null;
  private fogPass: ShaderPass | null = null;

  private unbindEvents: Array<() => void> = [];

  constructor(scope: ResourceScope, route: string) {
    super(`carousel:${route}`, scope);
    this.scene.background = new Color(0x060608);
    this.scene.fog = new FogExp2(0x060608, 0.045);
    this.camera.position.set(0, 0, 11);
  }

  getRenderState(): SceneRenderState {
    return { scene: this.scene, camera: this.camera };
  }

  protected async onPrepare(manifest: ScenePreparationManifest): Promise<void> {
    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync('/models/canvas_bg.glb');
      this.bgModel = gltf.scene;
      
      // Create a premium material
      const premiumMat = new MeshPhysicalMaterial({
        color: 0x050a10,
        emissive: 0x0a1525,
        metalness: 0.9,
        roughness: 0.2,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        wireframe: false,
        side: DoubleSide
      });

      premiumMat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = this.bgUniforms.uTime;
        shader.uniforms.uPointer = this.bgUniforms.uPointer;
        shader.uniforms.uScroll = this.bgUniforms.uScroll;
        
        shader.vertexShader = `
          uniform float uTime;
          uniform vec2 uPointer;
          uniform float uScroll;
          
          // Simplex 3D Noise
          vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
          vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
          float snoise(vec3 v){ 
            const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
            const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i  = floor(v + dot(v, C.yyy) );
            vec3 x0 = v - i + dot(i, C.xxx) ;
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min( g.xyz, l.zxy );
            vec3 i2 = max( g.xyz, l.zxy );
            vec3 x1 = x0 - i1 + 1.0 * C.xxx;
            vec3 x2 = x0 - i2 + 2.0 * C.xxx;
            vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
            i = mod(i, 289.0 ); 
            vec4 p = permute( permute( permute( 
                      i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                    + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
            float n_ = 0.142857142857;
            vec3  ns = n_ * D.wyz - D.xzx;
            vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_ );
            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            vec4 b0 = vec4( x.xy, y.xy );
            vec4 b1 = vec4( x.zw, y.zw );
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
            vec3 p0 = vec3(a0.xy,h.x);
            vec3 p1 = vec3(a0.zw,h.y);
            vec3 p2 = vec3(a1.xy,h.z);
            vec3 p3 = vec3(a1.zw,h.w);
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
          }
        ` + shader.vertexShader;
        
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          vec3 transformed = vec3( position );
          // Add flowing liquid noise displacement
          float noise = snoise(vec3(position.x * 0.5 + uTime * 0.2, position.y * 0.5 + uTime * 0.3, position.z * 0.5 - uTime * 0.1));
          
          // Make it react to scroll velocity and pointer
          float pointerDist = distance(uv, uPointer * 0.5 + 0.5);
          float pointerEffect = smoothstep(0.5, 0.0, pointerDist) * 2.0;
          
          float displacement = noise * (0.2 + abs(uScroll) * 1.5 + pointerEffect * 0.5);
          transformed += normal * displacement * 0.4;
          `
        );
        
        // Let's add a bit of iridescence color shift based on the noise in fragment
        shader.fragmentShader = `
          uniform float uTime;
          uniform vec2 uPointer;
        ` + shader.fragmentShader;
        
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>
          // Mix a glowing cyan/purple based on time and position
          vec3 glowColor = mix(vec3(0.1, 0.8, 1.0), vec3(0.6, 0.1, 0.9), sin(uTime * 0.5) * 0.5 + 0.5);
          diffuseColor.rgb += glowColor * 0.5;
          `
        );
      };

      this.bgModel.traverse((child) => {
        if ((child as Mesh).isMesh) {
          (child as Mesh).material = premiumMat;
        }
      });
      
      this.bgModel.scale.set(0.8, 0.8, 0.8);
      this.bgModel.position.set(0, 0, -6);
      
      const ambient = new AmbientLight(0xffffff, 0.4);
      this.scene.add(ambient);
      const dirLight = new DirectionalLight(0xaaccff, 1.2);
      dirLight.position.set(5, 5, 5);
      this.scene.add(dirLight);

      this.scene.add(this.bgModel);
    } catch (e) {
      console.error(e);
    }
    const textureLoader = new TextureLoader();

    this.scene.add(this.carouselGroup);
    // Position carousel to center on both desktop and mobile
    this.carouselGroup.position.set(0, 0, 0);

    const cardGeometry = this.scope.track(
      new PlaneGeometry(8.8, 4.95, 64, 36),
      'geometry'
    );

    PROJECT_CARDS.forEach((project, idx) => {
      let texture: Texture;
      if (project.textureUrl) {
        texture = textureLoader.load(
          project.textureUrl,
          (t) => { t.colorSpace = SRGBColorSpace; },
          undefined,
          () => {
            // Fallback on load error
            cardMesh.material.uniforms.uTexture.value = createFallbackTexture(project);
          }
        );
      } else {
        texture = createFallbackTexture(project);
      }
      this.scope.track(texture, 'texture');

      const material = this.scope.track(
        new ShaderMaterial({
          vertexShader,
          fragmentShader,
          uniforms: {
            uTexture: { value: texture },
            uColor: { value: new Color(project.color) },
            uHover: { value: 0.0 },
            uTime: { value: 0.0 },
            uAlpha: { value: 1.0 },
            uPointer: { value: new Vector2() },
            uScroll: { value: 0.0 },
          },
          side: DoubleSide,
          transparent: true,
          depthWrite: true,
        }),
        'material'
      );

      const cardMesh = new Mesh(cardGeometry, material);
      this.carouselGroup.add(cardMesh);

      this.cards.push({
        mesh: cardMesh,
        data: project,
        targetAngle: idx, // Reuse this field to store index
        currentAngle: idx,
      });
    });

    // 1. Immersive Deep Background (Camera attached)
    const bgGeo = this.scope.track(new PlaneGeometry(100, 100), 'geometry');
    const bgMat = this.scope.track(
      new ShaderMaterial({
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          precision highp float;
          uniform float uTime;
          uniform vec2 uResolution;
          uniform vec2 uPointer;
          uniform vec3 uColor;
          uniform float uScroll;
          varying vec2 vUv;

          /* ── Utility ────────────────────────────────────────── */
          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
          }
          float hash21(vec2 p) {
            vec3 p3 = fract(vec3(p.xyx) * 0.1031);
            p3 += dot(p3, p3.yzx + 33.33);
            return fract((p3.x + p3.y) * p3.z);
          }

          float noise(vec2 st) {
              vec2 i = floor(st);
              vec2 f = fract(st);
              vec2 u = f * f * (3.0 - 2.0 * f);
              return mix(
                mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
                u.y
              );
          }

          /* ── FBM variants ──────────────────────────────────── */
          float fbm(vec2 st, int octaves) {
              float v = 0.0, a = 0.5;
              vec2 shift = vec2(100.0);
              mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
              for (int i = 0; i < 8; ++i) {
                  if (i >= octaves) break;
                  v += a * noise(st);
                  st = rot * st * 2.0 + shift;
                  a *= 0.5;
              }
              return v;
          }

          float ridgedFbm(vec2 p, int octaves) {
              float v = 0.0, a = 0.5, w = 1.0;
              mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
              for (int i = 0; i < 7; i++) {
                  if (i >= octaves) break;
                  float n = noise(p);
                  n = 1.0 - abs(n * 2.0 - 1.0);
                  n *= n;
                  v += a * n * w;
                  w = clamp(n * 2.0, 0.0, 1.0);
                  p = rot * p * 2.0;
                  a *= 0.5;
              }
              return v;
          }

          /* ── Ocean ─────────────────────────────────────────── */
          float getWaves(vec2 uv, float t) {
              float w1 = ridgedFbm(uv * vec2(1.5, 0.5) + t * 0.3, 6);
              float w2 = ridgedFbm(uv * vec2(3.0, 1.5) - t * 0.5, 5);
              float w3 = ridgedFbm(uv * vec2(0.8, 2.0) + t * vec2(0.1, -0.2), 4);
              return mix(mix(w1, w2, 0.45), w3, 0.25);
          }

          /* ── God Rays ──────────────────────────────────────── */
          float godRays(vec2 uv, float t) {
              float rays = 0.0;
              vec2 center = vec2(0.5, 0.45);
              float angle = atan(uv.y - center.y, uv.x - center.x);
              float dist = length(uv - center);
              // Radial noise bands
              rays += smoothstep(0.5, 0.0, abs(sin(angle * 3.0 + t * 0.2) * 0.5 + fbm(vec2(angle * 2.0 + t * 0.1, dist * 3.0), 4) * 0.5));
              rays *= smoothstep(1.2, 0.0, dist); // Fade with distance from center
              rays *= smoothstep(0.0, 0.15, uv.y - 0.3); // Only above lower ocean
              return rays * 0.35;
          }

          void main() {
            vec2 uv = vUv;
            vec2 parallax = uPointer * 0.005;
            vec2 st = uv + parallax;

            float aspect = uResolution.x / uResolution.y;
            st.x *= aspect;

            float time = uTime * 0.04;
            float horizon = 0.42 - parallax.y * 0.08;

            /* ── Color Palette (bright, luminous, airy) ─────── */
            vec3 accentNorm = normalize(uColor + 0.001);
            float accentLum = dot(uColor, vec3(0.299, 0.587, 0.114));
            // Bright, soft palette to match the reference's luminous blue atmosphere
            vec3 darkBase   = mix(vec3(0.06, 0.08, 0.14), uColor * 0.12, 0.6);
            vec3 midBase    = mix(vec3(0.18, 0.22, 0.35),  uColor * 0.35, 0.55);
            vec3 lightBase  = mix(vec3(0.35, 0.42, 0.55),  uColor * 0.65, 0.5);
            vec3 highlight  = mix(vec3(0.65, 0.72, 0.82),  uColor * 1.4,  0.45);
            vec3 fogColor   = mix(vec3(0.22, 0.28, 0.38),  uColor * 0.45, 0.5);

            vec3 finalColor = vec3(0.0);

            if (uv.y > horizon) {
                /* ════════ SKY: Volumetric layered clouds ════════ */
                float depth = uv.y - horizon;
                float normalizedDepth = smoothstep(0.0, 0.55, depth);

                vec2 skyUv = st;
                skyUv.y /= (depth + 0.08);
                skyUv.x += time * 0.25 + parallax.x * 0.5;

                // Layer 1: Large-scale domain-warped cloud formations
                vec2 q = vec2(
                    fbm(skyUv * 0.8 + vec2(0.0, time * 0.08), 6),
                    fbm(skyUv * 0.8 + vec2(5.2, 1.3), 6)
                );
                vec2 r = vec2(
                    fbm(skyUv + 4.0 * q + vec2(1.7, 9.2) + time * 0.12, 7),
                    fbm(skyUv + 4.0 * q + vec2(8.3, 2.8) - time * 0.05, 7)
                );
                float cloudMain = fbm(skyUv + 4.0 * r, 7);

                // Layer 2: High-altitude wispy cirrus
                vec2 cirrusUv = skyUv * 0.4 + time * vec2(0.15, 0.02);
                float cirrus = fbm(cirrusUv + fbm(cirrusUv * 2.0, 4) * 0.5, 6);
                cirrus = smoothstep(0.35, 0.75, cirrus) * 0.6;

                // Layer 3: Low, thick cumulus near horizon
                vec2 lowUv = skyUv * 1.5;
                lowUv.x += time * 0.35;
                float lowClouds = fbm(lowUv + 2.0 * vec2(fbm(lowUv + time * 0.1, 5), fbm(lowUv + vec2(3.1, 7.2), 5)), 6);
                lowClouds = smoothstep(0.25, 0.65, lowClouds);
                float lowMask = (1.0 - smoothstep(0.0, 0.25, depth)); // Only near horizon

                // Composite cloud density — softer thresholds for diffuse, wispy look
                float cloudDensity = smoothstep(0.2, 0.8, cloudMain);
                cloudDensity = max(cloudDensity, cirrus * normalizedDepth);
                cloudDensity = max(cloudDensity, lowClouds * lowMask * 0.8);
                cloudDensity = clamp(cloudDensity, 0.0, 1.0);

                // Cloud edge for rim lighting / subsurface scatter
                float cloudEdge = smoothstep(0.2, 0.45, cloudMain) - smoothstep(0.55, 0.85, cloudMain);
                float cloudEdge2 = smoothstep(0.15, 0.4, lowClouds) - smoothstep(0.5, 0.75, lowClouds);
                cloudEdge = max(cloudEdge, cloudEdge2 * lowMask);

                // Sky gradient — brighter, more luminous
                vec3 skyDeep = mix(darkBase, midBase, 0.3);
                vec3 skyMid  = mix(midBase, lightBase, 0.3);
                vec3 skyColor = mix(skyMid, skyDeep, smoothstep(0.0, 0.55, depth));

                // Cloud shading — softer, brighter clouds
                vec3 cloudShadow = mix(darkBase, midBase, 0.4);
                vec3 cloudLit    = mix(lightBase, highlight, 0.3);
                float cloudLight = smoothstep(0.25, 0.75, cloudMain * 0.5 + 0.5);
                vec3 cloudCore   = mix(cloudShadow, cloudLit, cloudLight);

                // Soft subsurface scattering on cloud edges
                vec3 cloudScatter = highlight * cloudEdge * 1.2;
                vec3 cloudFinal   = cloudCore + cloudScatter;

                // Cirrus is brighter, thinner
                vec3 cirrusColor = lightBase * 0.8 + highlight * 0.2;
                cloudFinal = mix(cloudFinal, cirrusColor, cirrus * normalizedDepth * 0.5);

                // Atmospheric perspective
                float horizonFade = smoothstep(0.0, 0.35, depth);
                finalColor = mix(skyColor, cloudFinal, cloudDensity * horizonFade);

                // Horizon haze band — soft, luminous
                vec3 hazeColor = mix(fogColor, lightBase * 0.8, 0.55);
                float hazeDensity = 1.0 - smoothstep(0.0, 0.35, depth);
                hazeDensity = hazeDensity * hazeDensity;
                finalColor = mix(finalColor, hazeColor, hazeDensity);

                // Very subtle upper sky darkening (keep it bright)
                float upperDark = smoothstep(0.55, 0.0, depth);
                finalColor *= (0.82 + upperDark * 0.18);

            } else {
                /* ════════ OCEAN: Reflective, calm water ════════ */
                float depth = horizon - uv.y;
                float normalizedDepth = smoothstep(0.0, 0.45, depth);
                vec2 floorUv = st;

                floorUv.x = (st.x - aspect * 0.5 + parallax.x * 0.3) / (depth + 0.015);
                floorUv.y = 1.0 / (depth + 0.015);

                vec2 waterUv = floorUv;
                waterUv.x += time * 0.4;
                waterUv.y -= time * 1.5;

                // Multi-layered wave heights
                float waves = getWaves(waterUv, time);

                // Second distortion layer for realism
                vec2 waterUv2 = floorUv * 0.7;
                waterUv2.x -= time * 0.2;
                waterUv2.y += time * 0.8;
                float waves2 = getWaves(waterUv2, time * 0.7);
                float totalWaves = mix(waves, waves2, 0.35);

                // Normal map via central differencing
                float eps = 0.04;
                float h0 = totalWaves;
                float hX = mix(getWaves(waterUv + vec2(eps, 0.0), time),
                               getWaves(waterUv2 + vec2(eps, 0.0), time * 0.7), 0.35);
                float hY = mix(getWaves(waterUv + vec2(0.0, eps), time),
                               getWaves(waterUv2 + vec2(0.0, eps), time * 0.7), 0.35);
                vec3 normal = normalize(vec3(h0 - hX, eps * 1.2, h0 - hY));

                // Specular from horizon light
                vec3 lightDir = normalize(vec3(0.2, 0.8, 1.0));
                vec3 viewDir  = vec3(0.0, 1.0, 0.0);
                float spec = pow(max(dot(reflect(-lightDir, normal), viewDir), 0.0), 48.0);
                float spec2 = pow(max(dot(reflect(-lightDir, normal), viewDir), 0.0), 8.0);

                // Water color gradient by depth — softer, brighter
                vec3 waterDeep    = mix(darkBase, midBase, 0.35);
                vec3 waterShallow = mix(midBase, lightBase, 0.4);
                vec3 waterColor   = mix(waterDeep, waterShallow, smoothstep(0.0, 0.8, totalWaves));

                // Broad specular shimmer (softer)
                waterColor += highlight * spec2 * 0.25 * smoothstep(0.0, 0.3, depth);
                // Specular glints (gentler)
                waterColor += highlight * spec * 1.2 * smoothstep(0.0, 0.4, depth);

                // Subsurface scattering on wave crests
                float sss = smoothstep(0.55, 0.95, totalWaves);
                waterColor += lightBase * sss * 0.6;

                // Foam on very top of waves (subtle white)
                float foam = smoothstep(0.8, 0.95, totalWaves) * smoothstep(0.05, 0.2, depth);
                waterColor += vec3(0.3, 0.32, 0.35) * foam * 0.5;

                // Sky reflection on calm areas
                float calmness = 1.0 - smoothstep(0.2, 0.7, totalWaves);
                vec3 reflectedSky = mix(fogColor, lightBase * 0.5, 0.3);
                waterColor = mix(waterColor, reflectedSky, calmness * 0.25 * (1.0 - normalizedDepth));

                // Caustic shimmer near horizon
                float caustic = noise(waterUv * 8.0 + time * 2.0) * noise(waterUv * 12.0 - time * 1.5);
                caustic = smoothstep(0.3, 0.6, caustic);
                waterColor += highlight * caustic * 0.15 * (1.0 - normalizedDepth);

                finalColor = waterColor;

                // Horizon fog — bright, luminous mist
                float horizonFade = smoothstep(0.0, 0.35, depth);
                vec3 horizonMist = mix(fogColor, lightBase * 0.8, 0.55);
                float mistDensity = 1.0 - horizonFade;
                mistDensity = mistDensity * mistDensity;
                finalColor = mix(finalColor, horizonMist, mistDensity);

                // Distance fade
                finalColor *= smoothstep(0.0, 0.03, depth);
            }

            /* ════════ GLOBAL VOLUMETRIC FOG BAND ════════ */
            // Thick animated fog centered on the horizon that completely obscures it
            float fogDist = abs(uv.y - horizon);
            float fogBand = 1.0 - smoothstep(0.0, 0.22, fogDist);
            fogBand = fogBand * fogBand * fogBand; // Cubic falloff — very thick in center

            // Animated fog wisps using FBM
            vec2 fogUv = vec2(st.x * 2.0 + time * 0.3, (uv.y - horizon) * 8.0);
            float fogWisps = fbm(fogUv, 5) * 0.5 + 0.5;
            float fogWisps2 = fbm(fogUv * 0.6 + vec2(time * 0.15, 3.7), 4) * 0.5 + 0.5;
            float fogShape = mix(fogWisps, fogWisps2, 0.4);

            // Fog color: bright luminous mist
            vec3 denseFogColor = mix(fogColor, lightBase * 0.85, 0.6);
            denseFogColor += highlight * 0.1;

            // Apply shaped fog — thickest at horizon, wisps at edges
            float finalFog = fogBand * (0.65 + fogShape * 0.35);
            finalFog = clamp(finalFog, 0.0, 1.0);
            finalColor = mix(finalColor, denseFogColor, finalFog * 0.88);

            /* ════════ GOD RAYS ════════ */
            float rays = godRays(uv, time);
            finalColor += highlight * rays * 0.5;

            /* ════════ POST-PROCESSING ════════ */
            vec2 center = vec2(0.5);
            float dist = length(uv - center);

            // Soft cinematic vignette (keep it bright like the reference)
            float vignette = 1.0 - smoothstep(0.3, 1.3, dist);
            finalColor *= (0.45 + vignette * 0.55);

            // Center luminous glow
            float centerGlow = 1.0 - smoothstep(0.0, 0.7, dist);
            finalColor += highlight * centerGlow * 0.1;

            // Chromatic Aberration
            vec2 caDir = normalize(uv - center) * dist * dist;
            float caStrength = 0.008 + abs(uScroll) * 0.02;
            // We fake CA by shifting the color channels
            vec3 caColor = finalColor;
            // Red channel: sample offset outward
            vec2 uvR = uv + caDir * caStrength;
            vec2 uvB = uv - caDir * caStrength;
            // Recompute brightness at offset UVs (approximate)
            float lumR = dot(finalColor, vec3(1.0, 0.0, 0.0));
            float lumB = dot(finalColor, vec3(0.0, 0.0, 1.0));
            float offsetR = smoothstep(0.3, 0.0, length(uvR - center)) * 0.5 + 0.5;
            float offsetB = smoothstep(0.3, 0.0, length(uvB - center)) * 0.5 + 0.5;
            caColor.r = finalColor.r * (1.0 + (offsetR - 0.7) * caStrength * 30.0);
            caColor.b = finalColor.b * (1.0 + (offsetB - 0.7) * caStrength * 30.0);
            finalColor = mix(finalColor, caColor, smoothstep(0.2, 0.7, dist));

            // Film grain (temporal)
            float grain = hash(uv * vec2(uResolution.x, uResolution.y) * 0.5 + fract(uTime * 7.0)) * 0.04;
            finalColor += vec3(grain) - 0.02;

            // Subtle color grade: lift shadows slightly blue
            finalColor.b += 0.008;
            finalColor = max(finalColor, 0.0);

            gl_FragColor = vec4(finalColor, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
        uniforms: this.bgUniforms,
        depthWrite: false,
        depthTest: false,
      }),
      'material'
    );
    this.bgMesh = new Mesh(bgGeo, bgMat);
    this.bgMesh.position.set(0, 0, -40); // Push far back
    this.camera.add(this.bgMesh);
    this.scene.add(this.camera); // Ensure camera is in scene to render its children

    // 2. Data Floor Grid
    const gridGeo = this.scope.track(new PlaneGeometry(80, 80, 1, 1), 'geometry');
    const gridMat = this.scope.track(
      new ShaderMaterial({
        vertexShader: `
          varying vec3 vWorldPosition;
          void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying vec3 vWorldPosition;
          
          void main() {
            vec2 coord = vWorldPosition.xz * 0.4;
            coord.y -= uTime * 0.2; // Move grid forward
            
            vec2 grid = fract(coord);
            float line = step(0.96, grid.x) + step(0.96, grid.y);
            line = clamp(line, 0.0, 1.0);
            
            // Distance fade
            float dist = length(vWorldPosition.xz);
            float fade = 1.0 - smoothstep(5.0, 35.0, dist);
            
            // Glowing cyan/blue grid
            vec3 color = vec3(0.2, 0.6, 1.0) * line * fade * 0.4;
            
            gl_FragColor = vec4(color, color.r); // Alpha tied to color intensity
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
        uniforms: { uTime: { value: 0 } },
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
      'material'
    );
    this.gridMesh = new Mesh(gridGeo, gridMat);
    this.gridMesh.rotation.x = -Math.PI / 2;
    this.gridMesh.position.y = -3.5;
    // this.scene.add(this.gridMesh);

    // 3. Volumetric atmospheric particle cloud
    const particleCount = manifest.reducedMotion ? 600 : 2400;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleRandoms = new Float32Array(particleCount);
    const particleSizes = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      // Wider distribution with depth layers
      particlePositions[i * 3] = (Math.random() - 0.5) * 60;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 35 - 5;
      particleRandoms[i] = Math.random();
      // Varied sizes: mostly small dust, some large motes
      particleSizes[i] = 0.3 + Math.pow(Math.random(), 3) * 2.5;
    }
    const particleGeo = this.scope.track(new BufferGeometry(), 'geometry');
    particleGeo.setAttribute('position', new BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('aRandom', new BufferAttribute(particleRandoms, 1));
    particleGeo.setAttribute('aSize', new BufferAttribute(particleSizes, 1));
    
    const particleMat = this.scope.track(
      new ShaderMaterial({
        vertexShader: `
          uniform float uTime;
          uniform float uVelocity;
          uniform vec3 uAccentColor;
          attribute float aRandom;
          attribute float aSize;
          varying float vRandom;
          varying float vDepthFade;
          
          void main() {
            vRandom = aRandom;
            vec3 pos = position;
            
            // Multi-layered organic drift
            float phase = aRandom * 6.283;
            pos.y += sin(uTime * 0.12 + phase) * 0.8
                   + sin(uTime * 0.07 + phase * 2.3) * 0.4;
            pos.x += cos(uTime * 0.08 + phase * 1.7) * 0.3;
            pos.z += sin(uTime * 0.05 + phase * 0.9) * 0.2;
            
            // Slow upward drift with wrap
            pos.y += uTime * 0.15 * (aRandom * 0.5 + 0.25);
            pos.y = mod(pos.y + 15.0, 30.0) - 15.0;
            
            // React to scroll velocity (lateral push)
            pos.x += uVelocity * aRandom * 15.0;
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            
            // Depth-based fade for atmosphere
            float depth = -mvPosition.z;
            vDepthFade = smoothstep(30.0, 5.0, depth);
            
            gl_PointSize = (aSize * 14.0 / depth) * (aRandom * 0.5 + 0.75);
            gl_PointSize = min(gl_PointSize, 8.0); // Cap size
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 uAccentColor;
          varying float vRandom;
          varying float vDepthFade;
          
          void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            
            // Gaussian-like soft glow (more volumetric than hard circle)
            float glow = exp(-dist * dist * 8.0);
            float alpha = glow * (0.15 + vRandom * 0.35) * vDepthFade;
            
            // Color: mostly cool grey mist, with subtle accent tinting
            vec3 baseColor = mix(vec3(0.45, 0.5, 0.55), vec3(0.65, 0.7, 0.75), vRandom);
            vec3 accentTint = mix(baseColor, uAccentColor * 0.6 + 0.4, vRandom * 0.25);
            vec3 color = mix(baseColor, accentTint, 0.3);
            
            gl_FragColor = vec4(color, alpha * 0.35);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
        uniforms: {
          uTime: { value: 0.0 },
          uVelocity: { value: 0.0 },
          uAccentColor: { value: new Color(PROJECT_CARDS[0].color) },
        },
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
      'material'
    );
    this.particles = new Points(particleGeo, particleMat);
    this.scene.add(this.particles);

    this.bindWindowEvents();
    this.updateAccentColor(PROJECT_CARDS[0].color);
  }

  protected onEnter(_previous: SceneState | null): void {
    // Fade in carousel cards on enter
    this.cards.forEach((card) => {
      card.mesh.material.uniforms.uAlpha.value = 1.0;
    });
  }

  protected onExit(_next: SceneState | null): void {
    // Fade out or transition cards on exit
    this.cards.forEach((card) => {
      card.mesh.material.uniforms.uAlpha.value = 0.0;
    });
  }


  private bindWindowEvents(): void {
    if (typeof window === 'undefined') return;

    // Track scroll velocity for chromatic aberration
    let lastScrollY = window.scrollY;
    const onScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;
      this.scrollVelocity = delta * 0.05; // Scale it appropriately
      lastScrollY = currentScrollY;
    };

    // External scroll event from DOM for 1:1 native scroll lock
    const onCarouselScroll = (e: Event) => {
      const customEvent = e as CustomEvent<{ progress: number }>;
      if (customEvent.detail && typeof customEvent.detail.progress === 'number') {
        this.targetProgress = customEvent.detail.progress;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('carousel:scroll', onCarouselScroll);

    this.unbindEvents.push(() => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('carousel:scroll', onCarouselScroll);
    });
  }

  private updateAccentColor(hex: string): void {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--accent-current', hex);
    }
  }

  protected onUpdate(frame: Frame): void {
    // Smooth lerp progress
    this.currentProgress += (this.targetProgress - this.currentProgress) * 0.08;
    this.scrollVelocity *= 0.9;

    const time = frame.elapsed;
    if (this.bgMesh) {
      // Scale bgMesh to exactly fit the camera frustum at z=-40
      const aspect = window.innerWidth / window.innerHeight;
      const fov = 45;
      const distance = 40;
      const frustumHeight = 2 * distance * Math.tan((fov / 2) * (Math.PI / 180));
      const frustumWidth = frustumHeight * aspect;
      this.bgMesh.scale.set(frustumWidth / 100, frustumHeight / 100, 1);
    }

    if (this.bgModel) {
      this.bgModel.rotation.y = time * 0.05;
      this.bgModel.rotation.x = Math.sin(time * 0.2) * 0.1;
      this.bgModel.rotation.z += this.scrollVelocity * 0.3;
      
      this.bgUniforms.uTime.value = time;
      this.bgUniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
      this.bgUniforms.uPointer.value.copy(this.pointerPos);
      this.bgUniforms.uScroll.value = this.scrollVelocity;
    }
    if (this.bgMesh) {
      this.bgMesh.material.uniforms.uTime.value = time;
      this.bgUniforms.uColor.value.lerp(this.targetColor, 0.05);
    }
    if (this.gridMesh) {
      this.gridMesh.material.uniforms.uTime.value = time;
    }
    if (this.particles) {
      const pMat = this.particles.material as ShaderMaterial;
      pMat.uniforms.uTime.value = time;
      pMat.uniforms.uVelocity.value = this.scrollVelocity;
      pMat.uniforms.uAccentColor.value.lerp(this.targetColor, 0.05);
    }
    
    if (this.fogPass) {
      this.fogPass.uniforms.uTime.value = time;
      this.fogPass.uniforms.uScroll.value = this.scrollVelocity;
      this.fogPass.uniforms.uColor.value.copy(this.targetColor);
    }

    let closestIdx = 0;
    let closestDist = Infinity;
    const total = PROJECT_CARDS.length;

    this.cards.forEach((card, idx) => {
      // Calculate relative position with wrapping
      let relativeDiff = (idx - this.currentProgress) % total;
      if (relativeDiff > total / 2) relativeDiff -= total;
      if (relativeDiff < -total / 2) relativeDiff += total;

      // Position horizontally
      const x = relativeDiff * 25.0; // 25 units apart so they slide in completely from off-screen
      const z = -Math.abs(relativeDiff) * 3.0; // Push inactive ones back
      const y = 0; // Lock vertically, no floating animation

      card.mesh.position.set(x, y, z);
      card.mesh.rotation.set(0, 0, 0); // Flat facing camera

      const distToFront = Math.abs(relativeDiff);
      if (distToFront < closestDist) {
        closestDist = distToFront;
        closestIdx = idx;
      }

      // Proximity scaling & focus
      const isCenter = distToFront < 0.35;
      
      // We pass hover based on whether it's center and actively hovered by pointer
      // We'll just set uHover to 1.0 if it's the center card, and the shader uses distance to uPointer
      const targetHover = isCenter ? 1.0 : 0.0;
      const curHover = card.mesh.material.uniforms.uHover.value;
      card.mesh.material.uniforms.uHover.value += (targetHover - curHover) * 0.1;
      card.mesh.material.uniforms.uTime.value = time;
      card.mesh.material.uniforms.uPointer.value.copy(this.pointerPos);
      card.mesh.material.uniforms.uScroll.value = this.scrollVelocity;
      
      // Card opacity fades when moving away
      const targetAlpha = Math.max(0.0, 1.0 - Math.abs(relativeDiff) * 1.2);
      card.mesh.material.uniforms.uAlpha.value = targetAlpha;
      card.mesh.visible = targetAlpha > 0.01;
    });

    if (closestIdx !== this.activeIndex) {
      const direction = this.targetProgress > this.currentProgress ? 1 : -1;
      this.activeIndex = closestIdx;
      const activeProject = PROJECT_CARDS[closestIdx];
      this.updateAccentColor(activeProject.color);
      this.targetColor.set(activeProject.color);
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('carousel:active_change', {
          detail: { index: closestIdx, direction }
        }));
      }
    }

    // Lock camera perfectly in the center
    this.camera.position.x = 0;
    this.camera.position.y = 0;
    this.camera.lookAt(new Vector3(0, 0, 0));
  }

  protected onResize(viewport: Viewport): void {
    this.camera.aspect = viewport.width / viewport.height;
    this.camera.updateProjectionMatrix();

    // Adjust carousel group position for mobile vs desktop
    if (viewport.width < 1024) {
      this.carouselGroup.position.set(0, 0.8, -2);
      this.camera.position.z = 13;
    } else {
      this.carouselGroup.position.set(0, 0, 0);
      this.camera.position.z = 11;
    }

    if (this.composer) {
      this.composer.setSize(viewport.width, viewport.height);
    }
    if (this.fogPass) {
      this.fogPass.uniforms.uResolution.value.set(viewport.width, viewport.height);
    }
  }

  protected onPointer(position: PointerPosition): void {
    this.pointerPos.set(position.x, position.y);
  }

  protected onDispose(): void {
    this.unbindEvents.forEach((unbind) => unbind());
    this.unbindEvents = [];
    
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }
    if (this.fogPass) {
      this.fogPass.dispose();
      this.fogPass = null;
    }

    this.cards.forEach((card) => {
      this.carouselGroup.remove(card.mesh);
    });
    this.cards.length = 0;
    
    if (this.bgMesh) {
      this.camera.remove(this.bgMesh);
      this.bgMesh = null;
    }
    if (this.gridMesh) {
      this.scene.remove(this.gridMesh);
      this.gridMesh = null;
    }
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles = null;
    }
    
    this.scene.clear();
  }

  customRender(renderer: WebGLRenderer): void {
    if (!this.composer) {
      this.composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);
      
      this.fogPass = new ShaderPass(VolumetricFogShader);
      this.composer.addPass(this.fogPass);
      
      const size = renderer.getSize(new Vector2());
      this.fogPass.uniforms.uResolution.value.set(size.x, size.y);
    }
    
    this.composer.render();
  }
}
