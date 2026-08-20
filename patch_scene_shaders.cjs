const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/runtime/rendering/scenes/ProjectCarouselScene.ts');
let content = fs.readFileSync(file, 'utf8');

// We need to import MeshPhysicalMaterial, Color, DoubleSide if not imported
if (!content.includes('MeshPhysicalMaterial')) {
    content = content.replace("Mesh,", "Mesh, MeshPhysicalMaterial,");
}

// In the class, let's add a uniform object to update
content = content.replace(
  "private bgModel: Object3D | null = null;",
  "private bgModel: Object3D | null = null;\n  private bgUniforms = {\n    uTime: { value: 0 },\n    uPointer: { value: new Vector2() },\n    uScroll: { value: 0 }\n  };"
);

// We need to update onPrepare
const searchPrepare = /protected async onPrepare\(manifest: ScenePreparationManifest\): Promise<void> \{[\s\S]*?this\.scene\.add\(this\.bgModel\);\s*\} catch \(e\) \{\s*console\.error\(e\);\s*\}/;

const replacePrepare = `protected async onPrepare(manifest: ScenePreparationManifest): Promise<void> {
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
        
        shader.vertexShader = \`
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
        \` + shader.vertexShader;
        
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          \`
          vec3 transformed = vec3( position );
          // Add flowing liquid noise displacement
          float noise = snoise(vec3(position.x * 0.5 + uTime * 0.2, position.y * 0.5 + uTime * 0.3, position.z * 0.5 - uTime * 0.1));
          
          // Make it react to scroll velocity and pointer
          float pointerDist = distance(uv, uPointer * 0.5 + 0.5);
          float pointerEffect = smoothstep(0.5, 0.0, pointerDist) * 2.0;
          
          float displacement = noise * (1.0 + abs(uScroll) * 5.0 + pointerEffect);
          transformed += normal * displacement * 0.8;
          \`
        );
        
        // Let's add a bit of iridescence color shift based on the noise in fragment
        shader.fragmentShader = \`
          uniform float uTime;
          uniform vec2 uPointer;
        \` + shader.fragmentShader;
        
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          \`
          #include <color_fragment>
          // Mix a glowing cyan/purple based on time and position
          vec3 glowColor = mix(vec3(0.1, 0.8, 1.0), vec3(0.6, 0.1, 0.9), sin(uTime * 0.5) * 0.5 + 0.5);
          diffuseColor.rgb += glowColor * 0.5;
          \`
        );
      };

      this.bgModel.traverse((child) => {
        if ((child as Mesh).isMesh) {
          (child as Mesh).material = premiumMat;
        }
      });
      
      this.bgModel.scale.set(0.8, 0.8, 0.8);
      this.bgModel.position.set(0, 0, -6);
      
      const ambient = new AmbientLight(0xffffff, 1.5);
      this.scene.add(ambient);
      const dirLight = new DirectionalLight(0xaaccff, 3.5);
      dirLight.position.set(5, 5, 5);
      this.scene.add(dirLight);

      this.scene.add(this.bgModel);
    } catch (e) {
      console.error(e);
    }`;

content = content.replace(searchPrepare, replacePrepare);

// Now update the uniforms in onUpdate
const searchUpdate = /if \(this\.bgModel\) \{[\s\S]*?this\.bgModel\.rotation\.z \+= this\.scrollVelocity \* 0\.5;\s*\}/;
const replaceUpdate = `if (this.bgModel) {
      this.bgModel.rotation.y = time * 0.05;
      this.bgModel.rotation.x = Math.sin(time * 0.2) * 0.1;
      this.bgModel.rotation.z += this.scrollVelocity * 0.3;
      
      this.bgUniforms.uTime.value = time;
      this.bgUniforms.uPointer.value.copy(this.pointerPos);
      this.bgUniforms.uScroll.value = this.scrollVelocity;
    }`;

content = content.replace(searchUpdate, replaceUpdate);

fs.writeFileSync(file, content);
console.log('Patched shaders');
