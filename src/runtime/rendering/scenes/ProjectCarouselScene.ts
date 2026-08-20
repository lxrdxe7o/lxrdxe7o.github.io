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
  RawShaderMaterial,
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
} from 'three';

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
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = vUv;
    
    // Matrix cubes effect
    vec2 gridCount = vec2(64.0, 36.0); // 16:9 ratio grid
    
    // Only apply grid logic if hover is active to save performance and keep image perfectly intact
    if (uHover > 0.001) {
      vec2 gridUv = floor(uv * gridCount) / gridCount;
      vec2 cellUv = fract(uv * gridCount);
      
      // Distance to pointer for local hover effect
      // Normalize pointer from screen space (-1 to 1) to UV space (0 to 1)
      vec2 pointerUv = uPointer * 0.5 + 0.5;
      
      float dist = distance(gridUv, pointerUv);
      
      // Scatter radius
      float scatter = smoothstep(0.3, 0.0, dist) * uHover;
      
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
  private bgUniforms = {
    uTime: { value: 0 },
    uPointer: { value: new Vector2() },
    uScroll: { value: 0 },
    uResolution: { value: new Vector2(1, 1) }
  };
  private currentProgress = 0;
  private targetProgress = 0;
  private scrollVelocity = 0;
  private activeIndex = 0;
  private pointerPos = new Vector2(0, 0);
  private isDragging = false;
  private dragStartX = 0;
  private dragStartProgress = 0;
  private readonly radius = 9.5;
  private readonly cardAngleSpan = (Math.PI * 2) / PROJECT_CARDS.length;

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
    // Position carousel to left side on desktop, center on mobile
    this.carouselGroup.position.set(-2.2, 0, 0);

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
          uniform float uTime;
          uniform vec2 uResolution;
          varying vec2 vUv;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
          }

          float noise(in vec2 st) {
              vec2 i = floor(st);
              vec2 f = fract(st);

              float a = hash(i);
              float b = hash(i + vec2(1.0, 0.0));
              float c = hash(i + vec2(0.0, 1.0));
              float d = hash(i + vec2(1.0, 1.0));

              vec2 u = f*f*(3.0-2.0*f);

              return mix(a, b, u.x) +
                      (c - a)* u.y * (1.0 - u.x) +
                      (d - b) * u.x * u.y;
          }

          float fbm(in vec2 st) {
              float v = 0.0;
              float a = 0.5;
              vec2 shift = vec2(100.0);
              mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
              for (int i = 0; i < 5; ++i) {
                  v += a * noise(st);
                  st = rot * st * 2.0 + shift;
                  a *= 0.5;
              }
              return v;
          }

          void main() {
            vec2 uv = vUv;
            vec2 st = uv;
            float aspect = uResolution.x / uResolution.y;
            st.x *= aspect;
            
            float time = uTime * 0.05;
            
            float horizon = 0.45; // Move horizon up to show more ocean
            
            // Deep cinematic dark palette
            vec3 darkBlue = vec3(0.005, 0.015, 0.03);
            vec3 midBlue = vec3(0.02, 0.05, 0.1);
            vec3 lightBlue = vec3(0.08, 0.15, 0.25);
            vec3 highlight = vec3(0.2, 0.35, 0.5);
            
            vec3 finalColor = vec3(0.0);
            
            if (uv.y > horizon) {
                // SKY
                float depth = (uv.y - horizon);
                vec2 skyUv = st;
                
                // Parallax/Perspective for sky
                skyUv.y /= (depth + 0.05); 
                skyUv.x += time * 0.3;
                
                // Massive clouds
                float n = fbm(skyUv * 1.5 - time * 0.1);
                float n2 = fbm(skyUv * 3.0 + time * 0.2);
                
                float cloudMask = smoothstep(0.2, 0.8, n * 0.7 + n2 * 0.3);
                
                vec3 skyBase = mix(darkBlue, midBlue, uv.y);
                
                // Cloud volume
                vec3 cloudVol = mix(midBlue, lightBlue, cloudMask);
                finalColor = mix(skyBase, cloudVol, cloudMask * min(1.0, depth * 5.0));
                
                // Haze at the horizon
                float haze = 1.0 - smoothstep(0.0, 0.2, depth);
                finalColor = mix(finalColor, midBlue, haze);
                
            } else {
                // OCEAN
                float depth = (horizon - uv.y);
                vec2 oceanUv = st;
                
                // Perspective for ocean floor
                oceanUv.x = (st.x - aspect * 0.5) / (depth + 0.02);
                oceanUv.y = 1.0 / (depth + 0.02);
                
                oceanUv.x += time * 0.2;
                oceanUv.y -= time * 1.5; 
                
                // Water ripples
                float n = fbm(oceanUv * vec2(2.0, 0.5));
                float n2 = fbm(oceanUv * vec2(5.0, 1.0) - time * 2.0);
                
                float waves = smoothstep(0.3, 0.7, n * 0.6 + n2 * 0.4);
                
                vec3 waterBase = darkBlue;
                vec3 waterColor = mix(waterBase, midBlue, waves * 0.5);
                
                // Reflections
                float reflection = smoothstep(0.6, 0.9, waves);
                waterColor = mix(waterColor, lightBlue, reflection * 0.6);
                
                finalColor = waterColor;
                
                // Horizon haze reflecting the sky
                float haze = 1.0 - smoothstep(0.0, 0.15, depth);
                finalColor = mix(finalColor, midBlue, haze);
                
                // Distance fade out to dark at the extreme bottom
                float distFade = smoothstep(0.0, 0.1, depth);
                finalColor *= distFade;
            }
            
            // Dramatic lighting / Vignette
            float dist = length(uv - vec2(0.5, 0.5));
            float vignette = 1.0 - smoothstep(0.2, 1.0, dist);
            finalColor *= (0.5 + vignette * 0.5);
            
            // Ambient glow in center
            float centerGlow = 1.0 - smoothstep(0.0, 0.4, dist);
            finalColor += highlight * centerGlow * 0.3;
            
            float nGrain = hash(uv * 300.0 + uTime) * 0.025;
            finalColor += vec3(nGrain);

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

    // 3. Background floating particle cloud (Enhanced)
    const particleCount = manifest.reducedMotion ? 400 : 1200;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleRandoms = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 40;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;
      particleRandoms[i] = Math.random();
    }
    const particleGeo = this.scope.track(new BufferGeometry(), 'geometry');
    particleGeo.setAttribute('position', new BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('aRandom', new BufferAttribute(particleRandoms, 1));
    
    const particleMat = this.scope.track(
      new ShaderMaterial({
        vertexShader: `
          uniform float uTime;
          uniform float uVelocity;
          attribute float aRandom;
          varying float vRandom;
          
          void main() {
            vRandom = aRandom;
            vec3 pos = position;
            // Float upwards and drift
            pos.y += sin(uTime * 0.15 + aRandom * 10.0) * 0.5 + uTime * 0.2 * (aRandom + 0.5);
            // Wrap around Y axis
            pos.y = mod(pos.y + 10.0, 20.0) - 10.0;
            
            // React to scroll velocity
            pos.x += uVelocity * aRandom * 10.0;
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = (12.0 / -mvPosition.z) * (aRandom + 0.5);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          varying float vRandom;
          void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            // Soft glowing dot
            float alpha = smoothstep(0.5, 0.0, dist) * (0.2 + vRandom * 0.4);
            // Muted slate/white particles for atmospheric mist/spray
            vec3 color = mix(vec3(0.4, 0.45, 0.5), vec3(0.6, 0.65, 0.7), vRandom);
            gl_FragColor = vec4(color, alpha * 0.4);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
        uniforms: {
          uTime: { value: 0.0 },
          uVelocity: { value: 0.0 },
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
    }
    if (this.gridMesh) {
      this.gridMesh.material.uniforms.uTime.value = time;
    }
    if (this.particles) {
      (this.particles.material as ShaderMaterial).uniforms.uTime.value = time;
      (this.particles.material as ShaderMaterial).uniforms.uVelocity.value = this.scrollVelocity;
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
      const x = relativeDiff * 14.0; // 14 units apart so they slide in completely from off-screen
      const z = -Math.abs(relativeDiff) * 3.0; // Push inactive ones back
      const y = Math.sin(time * 0.5 + idx) * 0.1;

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
      
      // Card opacity fades when moving away
      const targetAlpha = Math.max(0.0, 1.0 - Math.abs(relativeDiff) * 0.5);
      card.mesh.material.uniforms.uAlpha.value = targetAlpha;
      card.mesh.visible = targetAlpha > 0.01;
    });

    if (closestIdx !== this.activeIndex) {
      this.activeIndex = closestIdx;
      const activeProject = PROJECT_CARDS[closestIdx];
      this.updateAccentColor(activeProject.color);
    }

    // Gentle camera parallax
    this.camera.position.x = this.pointerPos.x * 0.4;
    this.camera.position.y = this.pointerPos.y * 0.3;
    this.camera.lookAt(new Vector3(-0.5, 0, 0));
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
  }

  protected onPointer(position: PointerPosition): void {
    this.pointerPos.set(position.x, position.y);
  }

  protected onDispose(): void {
    this.unbindEvents.forEach((unbind) => unbind());
    this.unbindEvents = [];
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
}
