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
  uniform float uCurvature;
  uniform float uHover;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec3 pos = position;
    
    // Cylindrical curvature along X axis
    float bend = pos.x * 0.45;
    pos.z -= bend * bend * uCurvature;
    
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
  uniform float uChromatic;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec2 uv = vUv;
    
    // Chromatic aberration on motion / hover
    float shift = 0.0025 * (1.0 + uHover * 2.0 + uChromatic * 3.0);
    float r = texture2D(uTexture, uv + vec2(shift, 0.0)).r;
    float g = texture2D(uTexture, uv).g;
    float b = texture2D(uTexture, uv - vec2(shift, 0.0)).b;
    vec4 tex = vec4(r, g, b, 1.0);

    // Subtle edge fade & border
    vec2 edge = smoothstep(0.0, 0.04, uv) * smoothstep(1.0, 0.96, uv);
    float border = edge.x * edge.y;

    vec3 finalColor = tex.rgb;
    // Ambient hover tint
    finalColor = mix(finalColor, uColor, 0.06 + uHover * 0.15);
    finalColor *= (0.75 + border * 0.25);
    
    // Light depth shading
    float light = dot(vNormal, normalize(vec3(0.3, 0.6, 1.0))) * 0.2 + 0.85;
    finalColor *= light;

    gl_FragColor = vec4(finalColor, uAlpha);
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
    uScroll: { value: 0 }
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
      new PlaneGeometry(4.4, 2.75, 32, 16),
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
            uCurvature: { value: 0.4 },
            uChromatic: { value: 0.0 },
          },
          side: DoubleSide,
          transparent: true,
          depthWrite: true,
        }),
        'material'
      );

      const cardMesh = new Mesh(cardGeometry, material);
      this.carouselGroup.add(cardMesh);

      const angle = idx * this.cardAngleSpan;
      this.cards.push({
        mesh: cardMesh,
        data: project,
        targetAngle: angle,
        currentAngle: angle,
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
          varying vec2 vUv;
          
          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
          }

          void main() {
            vec2 uv = vUv * 2.0 - 1.0;
            float dist = length(uv);
            
            // Vignette
            float vignette = 1.0 - smoothstep(0.3, 1.5, dist);
            
            // Very subtle noise (Grain)
            float noise = hash(vUv * 200.0 + uTime) * 0.015;
            
            // Barely visible Scanlines
            float scanline = sin(vUv.y * 1000.0 - uTime * 5.0) * 0.005;
            
            // Abstract slow-moving gradient light
            float glow = sin(vUv.x * 2.0 + uTime * 0.2) * cos(vUv.y * 1.5 - uTime * 0.15) * 0.05;
            
            vec3 color = vec3(0.01, 0.02, 0.04);
            color += vec3(0.1, 0.3, 0.5) * glow;
            color *= vignette;
            color += noise;
            color += scanline;
            
            gl_FragColor = vec4(color, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
        uniforms: { uTime: { value: 0 } },
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
            // Cyan/Blue tech colors
            vec3 color = mix(vec3(0.2, 0.8, 1.0), vec3(0.5, 0.2, 1.0), vRandom);
            gl_FragColor = vec4(color, alpha);
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
    // this.scene.add(this.particles);

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

    // Wheel listener for carousel rotation
    const onWheel = (e: WheelEvent) => {
      // Rotate carousel based on vertical delta
      const delta = e.deltaY * 0.0015;
      this.targetProgress += delta;
      this.scrollVelocity = delta;
    };

    // Pointer drag listeners
    const onPointerDown = (e: PointerEvent) => {
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartProgress = this.targetProgress;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.isDragging) return;
      const deltaX = (e.clientX - this.dragStartX) / window.innerWidth;
      this.targetProgress = this.dragStartProgress - deltaX * 3.5;
    };

    const onPointerUp = () => {
      this.isDragging = false;
    };

    // External focus event from list hover
    const onFocusProject = (e: Event) => {
      const customEvent = e as CustomEvent<{ index: number; slug: string }>;
      if (customEvent.detail && typeof customEvent.detail.index === 'number') {
        this.scrollToIndex(customEvent.detail.index);
      }
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('carousel:focus', onFocusProject);

    this.unbindEvents.push(() => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('carousel:focus', onFocusProject);
    });
  }

  public scrollToIndex(index: number): void {
    const total = PROJECT_CARDS.length;
    const targetTheta = (index % total) * this.cardAngleSpan;
    
    // Find closest angular distance
    const currentAngle = this.targetProgress * this.cardAngleSpan;
    const diff = targetTheta - (currentAngle % (Math.PI * 2));
    let shortest = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.targetProgress += shortest / this.cardAngleSpan;
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
    if (this.bgModel) {
      this.bgModel.rotation.y = time * 0.05;
      this.bgModel.rotation.x = Math.sin(time * 0.2) * 0.1;
      this.bgModel.rotation.z += this.scrollVelocity * 0.3;
      
      this.bgUniforms.uTime.value = time;
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

    this.cards.forEach((card, idx) => {
      // Calculate angle on the circle
      const baseAngle = idx * this.cardAngleSpan;
      const angle = baseAngle - this.currentProgress * this.cardAngleSpan;
      card.currentAngle = angle;

      // Position along cylinder arc in 3D
      const x = Math.sin(angle) * this.radius;
      const z = Math.cos(angle) * this.radius - this.radius;
      const y = Math.sin(angle * 2.0 + time * 0.5) * 0.15;

      card.mesh.position.set(x, y, z);
      card.mesh.rotation.y = angle;

      // Calculate distance to front view (angle close to 0)
      const normAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
      const distToFront = Math.abs(normAngle);

      if (distToFront < closestDist) {
        closestDist = distToFront;
        closestIdx = idx;
      }

      // Proximity scaling & focus
      const focusFactor = Math.max(0, 1 - distToFront / 1.5);
      const isCenter = distToFront < 0.35;
      
      const targetHover = isCenter ? 0.85 : 0.0;
      const curHover = card.mesh.material.uniforms.uHover.value;
      card.mesh.material.uniforms.uHover.value += (targetHover - curHover) * 0.1;
      card.mesh.material.uniforms.uTime.value = time;
      card.mesh.material.uniforms.uChromatic.value = Math.abs(this.scrollVelocity);
      
      // Card opacity fades when behind or far away
      const targetAlpha = Math.cos(normAngle) > -0.2 ? Math.max(0.2, Math.cos(normAngle)) : 0.0;
      card.mesh.material.uniforms.uAlpha.value = targetAlpha;
      card.mesh.visible = targetAlpha > 0.01;
    });

    if (closestIdx !== this.activeIndex) {
      this.activeIndex = closestIdx;
      const activeProject = PROJECT_CARDS[closestIdx];
      this.updateAccentColor(activeProject.color);

      // Dispatch event to sync list in HTML
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('carousel:activeChange', {
            detail: { index: closestIdx, slug: activeProject.slug },
          })
        );
      }
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
      this.carouselGroup.position.set(-2.4, 0, 0);
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
