import {
  AdditiveBlending,
  Color,
  ShaderMaterial,
  type IUniform,
} from 'three';

import {
  spatialFieldFragmentShader,
  spatialFieldVertexShader,
} from '../shaders/spatialField';

export interface SpatialFieldUniforms {
  readonly [name: string]: IUniform;
  readonly uTime: IUniform<number>;
  readonly uPointer: IUniform<{ x: number; y: number }>;
  readonly uCrimson: IUniform<Color>;
  readonly uIntensity: IUniform<number>;
}

export type SpatialFieldMaterial = ShaderMaterial & {
  uniforms: SpatialFieldUniforms;
};

export function createSpatialFieldMaterial(): SpatialFieldMaterial {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPointer: { value: { x: 0, y: 0 } },
      uCrimson: { value: new Color(0xb10f35) },
      uIntensity: { value: 0.85 },
    },
    vertexShader: spatialFieldVertexShader,
    fragmentShader: spatialFieldFragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    toneMapped: true,
  }) as SpatialFieldMaterial;
}
