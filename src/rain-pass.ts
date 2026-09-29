import * as THREE from "three";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./config";

const STREAK_COUNT = 240;
const SPLASH_COUNT = 80;

// Slightly slanted rain vector (~14 degrees to the left)
const RAIN_ANGLE = -0.24;
const RAIN_DIR_Y = Math.cos(RAIN_ANGLE); // ~0.97
const RAIN_DIR_X = Math.sin(RAIN_ANGLE); // ~-0.24

const streakVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec2 uResolution;
  uniform vec2 uDirection;

  attribute vec2 aOrigin;
  attribute float aSpeed;
  attribute float aLength;
  attribute float aWidth;
  attribute float aOpacity;
  attribute float aPhase;

  varying vec2 vUv;
  varying float vAlpha;

  void main() {
    vUv = uv;
    vAlpha = aOpacity * uIntensity;

    vec2 dir = normalize(uDirection);
    vec2 norm = vec2(-dir.y, dir.x);

    // Total distance rain traverses across viewport plus margins
    float marginY = 80.0;
    float marginX = 90.0;
    float totalH = uResolution.y + marginY * 2.0;
    float travelDist = totalH / dir.y;

    // Continuous progress (0.0 to 1.0)
    float progress = fract(uTime * (aSpeed / totalH) + aPhase);

    // Current leading head position
    vec2 headPos = aOrigin + dir * (progress * travelDist);

    // Wrap smoothly within bounded margin box
    headPos.y = mod(headPos.y + marginY, totalH) - marginY;
    headPos.x = mod(headPos.x + marginX, uResolution.x + marginX * 2.0) - marginX;

    // Displace vertices: position.x is [-0.5, 0.5] along width, position.y is [0.0, 1.0] along length
    vec2 vertexPos = headPos
      + norm * (position.x * aWidth)
      - dir * (position.y * aLength);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(vertexPos, 0.0, 1.0);
  }
`;

const streakFragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3 uColor;

  varying vec2 vUv;
  varying float vAlpha;

  void main() {
    // Tapering along streak: bright at leading head (vUv.y = 0), fading out to tail (vUv.y = 1)
    float headGlow = 1.0 - vUv.y;
    float tailFade = pow(headGlow, 1.7);

    // Soft horizontal antialiasing from streak center
    float edgeDist = abs(vUv.x - 0.5) * 2.0;
    float edgeFade = 1.0 - smoothstep(0.2, 1.0, edgeDist);

    float alpha = vAlpha * tailFade * edgeFade;
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(uColor, alpha);
  }
`;

const splashVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec2 uResolution;

  attribute vec2 aOrigin;
  attribute float aDuration;
  attribute float aRadius;
  attribute float aPhase;
  attribute float aOpacity;

  varying vec2 vUv;
  varying float vProgress;
  varying float vAlpha;

  void main() {
    vUv = uv;
    float cycle = fract(uTime / aDuration + aPhase);
    vProgress = cycle;
    vAlpha = aOpacity * uIntensity * (1.0 - cycle);

    // Expand splash ring over its lifetime
    float currentRadius = aRadius * (0.3 + 0.9 * cycle);
    vec2 vertexPos = aOrigin + position.xy * currentRadius;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(vertexPos, 0.0, 1.0);
  }
`;

const splashFragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3 uColor;

  varying vec2 vUv;
  varying float vProgress;
  varying float vAlpha;

  void main() {
    float dist = length(vUv - 0.5) * 2.0; // 0 at center, 1 at edge
    if (dist > 1.0) discard;

    // Thin expanding ring crown
    float ring = smoothstep(0.5, 0.85, dist) * (1.0 - smoothstep(0.85, 1.0, dist));
    float alpha = vAlpha * ring;
    if (alpha < 0.005) discard;

    gl_FragColor = vec4(uColor, alpha);
  }
`;

export class RainPass {
  public readonly group = new THREE.Group();

  private readonly streakMaterial: THREE.ShaderMaterial;
  private readonly splashMaterial: THREE.ShaderMaterial;
  private readonly streakMesh: THREE.Mesh;
  private readonly splashMesh: THREE.Mesh;

  private currentIntensity = 0;
  private targetIntensity = 0;
  private previousTime = -1;

  public constructor() {
    this.group.name = "rain pass";
    this.group.visible = false;

    const rainColor = new THREE.Color(0.86, 0.92, 0.98);

    // 1. Instanced falling rain streaks
    const basePlane = new THREE.PlaneGeometry(1, 1);
    // Align base plane so y = 0 is leading bottom head and y = 1 is trailing top tail
    basePlane.translate(0, 0.5, 0);

    const streakGeometry = new THREE.InstancedBufferGeometry();
    const planeIndex = basePlane.getIndex();
    if (planeIndex) streakGeometry.setIndex(planeIndex.clone());
    streakGeometry.setAttribute("position", basePlane.getAttribute("position").clone());
    streakGeometry.setAttribute("uv", basePlane.getAttribute("uv").clone());
    basePlane.dispose();
    streakGeometry.instanceCount = STREAK_COUNT;

    const aOrigin = new Float32Array(STREAK_COUNT * 2);
    const aSpeed = new Float32Array(STREAK_COUNT);
    const aLength = new Float32Array(STREAK_COUNT);
    const aWidth = new Float32Array(STREAK_COUNT);
    const aOpacity = new Float32Array(STREAK_COUNT);
    const aPhase = new Float32Array(STREAK_COUNT);

    for (let i = 0; i < STREAK_COUNT; i++) {
      // 3 depth layers: 15% foreground, 55% midground, 30% background
      const depthRoll = Math.random();
      const isForeground = depthRoll < 0.15;
      const isBackground = depthRoll > 0.70;

      aOrigin[i * 2] = Math.random() * (CANVAS_WIDTH + 140) - 70;
      aOrigin[i * 2 + 1] = Math.random() * (CANVAS_HEIGHT + 140) - 70;

      if (isForeground) {
        aSpeed[i] = 760 + Math.random() * 160;
        aLength[i] = 22 + Math.random() * 8;
        aWidth[i] = 1.4 + Math.random() * 0.4;
        aOpacity[i] = 0.60 + Math.random() * 0.15;
      } else if (isBackground) {
        aSpeed[i] = 480 + Math.random() * 100;
        aLength[i] = 11 + Math.random() * 4;
        aWidth[i] = 0.8 + Math.random() * 0.2;
        aOpacity[i] = 0.22 + Math.random() * 0.12;
      } else {
        aSpeed[i] = 600 + Math.random() * 140;
        aLength[i] = 15 + Math.random() * 6;
        aWidth[i] = 1.0 + Math.random() * 0.3;
        aOpacity[i] = 0.38 + Math.random() * 0.16;
      }

      aPhase[i] = Math.random();
    }

    streakGeometry.setAttribute("aOrigin", new THREE.InstancedBufferAttribute(aOrigin, 2));
    streakGeometry.setAttribute("aSpeed", new THREE.InstancedBufferAttribute(aSpeed, 1));
    streakGeometry.setAttribute("aLength", new THREE.InstancedBufferAttribute(aLength, 1));
    streakGeometry.setAttribute("aWidth", new THREE.InstancedBufferAttribute(aWidth, 1));
    streakGeometry.setAttribute("aOpacity", new THREE.InstancedBufferAttribute(aOpacity, 1));
    streakGeometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(aPhase, 1));

    this.streakMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0 },
        uResolution: { value: new THREE.Vector2(CANVAS_WIDTH, CANVAS_HEIGHT) },
        uDirection: { value: new THREE.Vector2(RAIN_DIR_X, RAIN_DIR_Y) },
        uColor: { value: rainColor },
      },
      vertexShader: streakVertexShader,
      fragmentShader: streakFragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });

    this.streakMesh = new THREE.Mesh(streakGeometry, this.streakMaterial);
    this.streakMesh.frustumCulled = false;

    // 2. Instanced surface splash rings
    const splashGeometry = new THREE.InstancedBufferGeometry();
    const splashQuad = new THREE.PlaneGeometry(1, 1);
    const quadIndex = splashQuad.getIndex();
    if (quadIndex) splashGeometry.setIndex(quadIndex.clone());
    splashGeometry.setAttribute("position", splashQuad.getAttribute("position").clone());
    splashGeometry.setAttribute("uv", splashQuad.getAttribute("uv").clone());
    splashQuad.dispose();
    splashGeometry.instanceCount = SPLASH_COUNT;

    const sOrigin = new Float32Array(SPLASH_COUNT * 2);
    const sDuration = new Float32Array(SPLASH_COUNT);
    const sRadius = new Float32Array(SPLASH_COUNT);
    const sPhase = new Float32Array(SPLASH_COUNT);
    const sOpacity = new Float32Array(SPLASH_COUNT);

    for (let i = 0; i < SPLASH_COUNT; i++) {
      sOrigin[i * 2] = 10 + Math.random() * (CANVAS_WIDTH - 20);
      sOrigin[i * 2 + 1] = 10 + Math.random() * (CANVAS_HEIGHT - 20);
      sDuration[i] = 0.28 + Math.random() * 0.25;
      sRadius[i] = 4.5 + Math.random() * 4.0;
      sPhase[i] = Math.random();
      sOpacity[i] = 0.35 + Math.random() * 0.25;
    }

    splashGeometry.setAttribute("aOrigin", new THREE.InstancedBufferAttribute(sOrigin, 2));
    splashGeometry.setAttribute("aDuration", new THREE.InstancedBufferAttribute(sDuration, 1));
    splashGeometry.setAttribute("aRadius", new THREE.InstancedBufferAttribute(sRadius, 1));
    splashGeometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(sPhase, 1));
    splashGeometry.setAttribute("aOpacity", new THREE.InstancedBufferAttribute(sOpacity, 1));

    this.splashMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0 },
        uResolution: { value: new THREE.Vector2(CANVAS_WIDTH, CANVAS_HEIGHT) },
        uColor: { value: rainColor },
      },
      vertexShader: splashVertexShader,
      fragmentShader: splashFragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });

    this.splashMesh = new THREE.Mesh(splashGeometry, this.splashMaterial);
    this.splashMesh.frustumCulled = false;

    this.group.add(this.streakMesh);
    this.group.add(this.splashMesh);
  }

  public setIntensity(intensity: number): void {
    this.targetIntensity = Math.max(0, Math.min(1, intensity));
    if (this.targetIntensity > 0) {
      this.group.visible = true;
    }
  }

  public resize(width: number, height: number): void {
    this.streakMaterial.uniforms.uResolution.value.set(width, height);
    this.splashMaterial.uniforms.uResolution.value.set(width, height);
  }

  public update(time: number): void {
    const deltaTime = this.previousTime >= 0
      ? Math.min(0.1, Math.max(0, time - this.previousTime))
      : 0.016;
    this.previousTime = time;

    // Smooth intensity transition (ramps up in ~0.35s, fades out in ~0.5s)
    const blendRate = this.targetIntensity > this.currentIntensity ? 4.8 : 3.2;
    this.currentIntensity += (this.targetIntensity - this.currentIntensity) * (1 - Math.exp(-deltaTime * blendRate));

    if (this.currentIntensity <= 0.001 && this.targetIntensity === 0) {
      this.currentIntensity = 0;
      this.group.visible = false;
      return;
    }

    this.group.visible = true;
    this.streakMaterial.uniforms.uTime.value = time;
    this.streakMaterial.uniforms.uIntensity.value = this.currentIntensity;
    this.splashMaterial.uniforms.uTime.value = time;
    this.splashMaterial.uniforms.uIntensity.value = this.currentIntensity;
  }
}
