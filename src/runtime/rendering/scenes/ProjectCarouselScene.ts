import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  FogExp2,
  Group,
  Mesh,
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

  // Dark gradient background
  const grad = ctx.createLinearGradient(0, 0, 1280, 800);
  grad.addColorStop(0, '#0c0d12');
  grad.addColorStop(1, '#050508');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1280, 800);

  // Subtle grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 1280; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 800);
    ctx.stroke();
  }
  for (let y = 0; y < 800; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1280, y);
    ctx.stroke();
  }

  // Accent glow
  const rad = ctx.createRadialGradient(640, 400, 50, 640, 400, 500);
  rad.addColorStop(0, project.color + '22');
  rad.addColorStop(1, 'transparent');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, 1280, 800);

  // Card text
  ctx.fillStyle = project.color;
  ctx.font = '500 24px "JetBrains Mono", monospace';
  ctx.fillText('LXRDXE7O // ARCHIVE', 80, 120);

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 64px "Geist", sans-serif';
  ctx.fillText(project.title, 80, 420);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '400 28px "Geist", sans-serif';
  ctx.fillText(project.category, 80, 480);

  // Bottom code accent
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.font = '400 20px "JetBrains Mono", monospace';
  ctx.fillText(`STATUS: PUBLIC // TARGET: ${project.slug}`, 80, 720);

  const texture = new CanvasTexture(canvas);
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

  protected onPrepare(manifest: ScenePreparationManifest): void {
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
          () => {},
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

    // Background floating particle cloud
    const particleCount = manifest.reducedMotion ? 200 : 600;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 30;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 15 - 5;
    }
    const particleGeo = this.scope.track(new BufferGeometry(), 'geometry');
    particleGeo.setAttribute('position', new BufferAttribute(particlePositions, 3));
    const particleMat = this.scope.track(
      new ShaderMaterial({
        vertexShader: `
          uniform float uTime;
          void main() {
            vec3 pos = position;
            pos.y += sin(uTime * 0.2 + position.x) * 0.3;
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = (14.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;
            float alpha = smoothstep(0.5, 0.0, dist) * 0.35;
            gl_FragColor = vec4(0.8, 0.85, 0.95, alpha);
          }
        `,
        uniforms: {
          uTime: { value: 0.0 },
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
    if (this.particles) {
      (this.particles.material as ShaderMaterial).uniforms.uTime.value = time;
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
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles = null;
    }
    this.scene.clear();
  }
}
