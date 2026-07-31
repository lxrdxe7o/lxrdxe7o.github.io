export const spatialFieldVertexShader = /* glsl */ `
  attribute float aPhase;
  attribute float aScale;

  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uIntensity;

  varying float vEnergy;

  void main() {
    vec3 displaced = position;
    float wave = sin(uTime * 0.34 + aPhase + position.z * 0.28);
    float pointerWeight = 1.0 / (1.0 + abs(position.z) * 0.22);
    displaced.xy += uPointer * pointerWeight * (0.08 + aScale * 0.05);
    displaced.x += wave * 0.035 * aScale;
    displaced.y += cos(uTime * 0.27 + aPhase) * 0.025 * aScale;

    vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = max(1.0, aScale * uIntensity * (150.0 / max(1.0, -viewPosition.z)));
    vEnergy = clamp(0.42 + wave * 0.2 + aScale * 0.08, 0.15, 1.0);
  }
`;

export const spatialFieldFragmentShader = /* glsl */ `
  uniform vec3 uCrimson;
  uniform float uIntensity;

  varying float vEnergy;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float radius = length(centered);
    float core = 1.0 - smoothstep(0.0, 0.18, radius);
    float halo = 1.0 - smoothstep(0.08, 0.5, radius);
    float alpha = (core * 0.72 + halo * 0.22) * vEnergy * uIntensity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(uCrimson * (0.72 + core * 0.35), alpha);
  }
`;
