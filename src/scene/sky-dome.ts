import type { Scene } from 'three';
import {
  BackSide,
  Color,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import type { Celestial, SkyColors } from '../core/sky-palette';

/** Dome radius — inside the camera far plane (200) from any used viewpoint. */
const DOME_RADIUS = 130;
/** Discs ride a closer arc so they read as toys-in-the-sky, not planets. */
const ARC_RADIUS = 105;
/** The arc plane sits behind the meadow, opposite the overview camera. */
const ARC_Z = -80;

/** The sun/moon progress (0 = rise, 1 = set) is derived from the fraction. */
const SUNRISE = 0;
const SUNSET = 0.72;

const VERT = /* glsl */ `
  varying float vHeight;
  void main() {
    vHeight = position.y / ${DOME_RADIUS.toFixed(1)};
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  varying float vHeight;
  void main() {
    float h = clamp(vHeight, 0.0, 1.0);
    vec3 color = mix(horizonColor, topColor, pow(h, 0.55));
    gl_FragColor = vec4(color, 1.0);
  }
`;

export interface SkyDome {
  /** Recolor the gradient and place the sun/moon for this day fraction. */
  update(fraction: number, colors: SkyColors, celestial: Celestial): void;
  dispose(): void;
}

/**
 * Gradient sky dome with an arcing sun and moon. Purely visual: colors and
 * elevations come from the pure `sky-palette` math, so this module only
 * positions meshes and writes shader uniforms — no logic of its own.
 */
export function createSkyDome(scene: Scene): SkyDome {
  const geometry = new SphereGeometry(DOME_RADIUS, 32, 16);
  const topColorUniform = { value: new Color(0x87c5fb) };
  const horizonColorUniform = { value: new Color(0xe8f6ff) };
  const material = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { topColor: topColorUniform, horizonColor: horizonColorUniform },
    side: BackSide,
    depthWrite: false,
    fog: false,
  });
  const dome = new Mesh(geometry, material);
  // The dome's radius dwarfs the meadow and every camera lives inside it, but
  // an all-inside sphere can trip the frustum check on edge cameras — skip it.
  dome.frustumCulled = false;
  scene.add(dome);

  const sunGeometry = new SphereGeometry(4.5, 16, 12);
  const sunMaterial = new MeshBasicMaterial({
    color: 0xfff3c4,
    transparent: true,
    fog: false,
    depthWrite: false,
  });
  const sun = new Mesh(sunGeometry, sunMaterial);
  scene.add(sun);

  const moonGeometry = new SphereGeometry(2.8, 16, 12);
  const moonMaterial = new MeshBasicMaterial({
    color: 0xdfe6f5,
    transparent: true,
    fog: false,
    depthWrite: false,
  });
  const moon = new Mesh(moonGeometry, moonMaterial);
  scene.add(moon);

  const position = new Vector3();

  /** Place a body on the arc: progress 0..1 sweeps rise→set. */
  const placeOnArc = (
    mesh: Mesh,
    progress: number,
    elevation: number,
    material: MeshBasicMaterial,
  ): void => {
    const angle = Math.PI * (1 - progress);
    position.set(Math.cos(angle) * ARC_RADIUS, Math.sin(angle) * ARC_RADIUS * 0.75 + 4, ARC_Z);
    mesh.position.copy(position);
    // Fade out near the horizon instead of popping off the dome.
    material.opacity = Math.min(1, elevation * 4);
    mesh.visible = elevation > 0.01;
  };

  return {
    update(fraction, colors, celestial) {
      topColorUniform.value.setHex(colors.top);
      horizonColorUniform.value.setHex(colors.horizon);

      if (celestial.sun > 0) {
        placeOnArc(sun, (fraction - SUNRISE) / (SUNSET - SUNRISE), celestial.sun, sunMaterial);
      } else {
        sun.visible = false;
      }
      if (celestial.moon > 0) {
        placeOnArc(moon, (fraction - SUNSET) / (1 - SUNSET), celestial.moon, moonMaterial);
      } else {
        moon.visible = false;
      }
    },
    dispose() {
      scene.remove(dome, sun, moon);
      geometry.dispose();
      material.dispose();
      sunGeometry.dispose();
      sunMaterial.dispose();
      moonGeometry.dispose();
      moonMaterial.dispose();
    },
  };
}
