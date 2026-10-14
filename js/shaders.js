/* ═══ Shaders ═══════════════════════════════════════════════
 *  · SunMaterial: superficie del Sol con granulación animada
 *    (fbm procedural en GPU) y oscurecimiento al limbo.
 *  · atmosphereMaterial: halo fresnel alrededor de los planetas
 *    con atmósfera.
 */

import {
  AdditiveBlending,
  BackSide,
  FrontSide,
  ShaderMaterial,
  Color
} from 'three';

const NOISE_GLSL = /* glsl */`
float hash13(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash13(i + vec3(0.0,0.0,0.0)), hash13(i + vec3(1.0,0.0,0.0)), f.x),
        mix(hash13(i + vec3(0.0,1.0,0.0)), hash13(i + vec3(1.0,1.0,0.0)), f.x), f.y),
    mix(mix(hash13(i + vec3(0.0,0.0,1.0)), hash13(i + vec3(1.0,0.0,1.0)), f.x),
        mix(hash13(i + vec3(0.0,1.0,1.0)), hash13(i + vec3(1.0,1.0,1.0)), f.x), f.y),
    f.z);
}
float fbm3(vec3 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    s += a * vnoise(p);
    p = p * 2.03 + vec3(11.3, 7.1, 3.7);
    a *= 0.5;
  }
  return s;
}
`;

export function createSunMaterial(intensity = 1.55) {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: intensity }
    },
    vertexShader: /* glsl */`
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      varying vec3 vPos;
      void main() {
        vPos = normalize(position);
        vNormalV = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform float uIntensity;
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      varying vec3 vPos;
      ${NOISE_GLSL}
      void main() {
        vec3 p = vPos * 2.6;
        float n1 = fbm3(p + vec3(0.0, uTime * 0.05, uTime * 0.031));
        float n2 = fbm3(p * 3.4 - vec3(uTime * 0.07, 0.0, uTime * 0.043));
        float gr = fbm3(p * 9.0 + vec3(uTime * 0.13, uTime * 0.05, 0.0));
        float t = clamp(n1 * 0.72 + n2 * 0.5, 0.0, 1.0);

        vec3 deep = vec3(0.75, 0.17, 0.02);
        vec3 mid  = vec3(1.00, 0.46, 0.08);
        vec3 hot  = vec3(1.00, 0.88, 0.58);

        vec3 col = mix(deep, mid, smoothstep(0.22, 0.55, t));
        col = mix(col, hot, smoothstep(0.55, 0.88, t));
        col *= 0.80 + 0.45 * gr;

        // manchas oscuras ocasionales
        float spot = smoothstep(0.60, 0.74, fbm3(p * 1.3 + vec3(41.0, uTime * 0.017, 0.0)));
        col *= 1.0 - 0.38 * spot;

        // oscurecimiento al limbo
        float mu = max(dot(normalize(vNormalV), normalize(vViewDir)), 0.0);
        col *= mix(0.52, 1.18, pow(mu, 0.5));

        gl_FragColor = vec4(col * uIntensity, 1.0);
      }
    `
  });
}

export function createAtmosphereMaterial(hexColor, power = 2.6, intensity = 1.0) {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(hexColor) },
      uPower: { value: power },
      uIntensity: { value: intensity }
    },
    vertexShader: /* glsl */`
      varying vec3 vNormalV;
      void main() {
        vNormalV = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      uniform float uPower;
      uniform float uIntensity;
      varying vec3 vNormalV;
      void main() {
        float f = clamp(0.74 - dot(vNormalV, vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
        float i = pow(f, uPower) * uIntensity;
        gl_FragColor = vec4(uColor * i, i);
      }
    `,
    transparent: true,
    blending: AdditiveBlending,
    side: FrontSide,
    depthWrite: false
  });
}

/** Cáscara interior que envuelve el cuerpo (para el resplandor del Sol) */
export function createCoronaMaterial(hexColor, power = 3.2, intensity = 1.4) {
  const m = createAtmosphereMaterial(hexColor, power, intensity);
  m.side = BackSide;
  return m;
}
