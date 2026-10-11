import { useEffect, useRef } from 'react';
import {
  AmbientLight,
  CubicBezierCurve3,
  DirectionalLight,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Mesh,
  MeshPhysicalMaterial,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  Shape,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { createFrameRateLimit } from './frame-rate-limit';

const vertexShader = `
attribute float aCurveT;
uniform vec2 uSway;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec3 livePosition = position;
  livePosition.xy += uSway * (3.0 * aCurveT * (1.0 - aCurveT));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(livePosition, 1.0);
}
`;

const fragmentShader = `
uniform float uHead;
uniform float uLength;
uniform float uOpacity;
uniform float uGlow;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  float tail = uHead - uLength;
  float envelope = smoothstep(tail, tail + 0.045, vUv.x) *
    (1.0 - smoothstep(uHead - 0.015, uHead, vUv.x));
  float taper = clamp((vUv.x - tail) / uLength, 0.0, 1.0);
  float reflection = pow(max(vNormal.z, 0.0), 6.0);
  vec3 color = mix(vec3(0.025, 0.34, 0.86), vec3(0.70, 0.91, 1.0), reflection * 0.85);
  float alpha = envelope * pow(taper, 0.7) * uOpacity;
  alpha *= mix(0.92, 0.11, uGlow);
  gl_FragColor = vec4(color, alpha);
}
`;

function phoneShape(width: number, height: number) {
  const radius = 24;
  const shape = new Shape();
  shape.moveTo(radius, 0);
  shape.lineTo(width - radius, 0);
  shape.quadraticCurveTo(width, 0, width, radius);
  shape.lineTo(width, height - radius);
  shape.quadraticCurveTo(width, height, width - radius, height);
  shape.lineTo(radius, height);
  shape.quadraticCurveTo(0, height, 0, height - radius);
  shape.lineTo(0, radius);
  shape.quadraticCurveTo(0, 0, radius, 0);
  return shape;
}

// The DOM timeline owns every state and the delivery time. This layer reads its
// existing SVG signal, so the WebGL trail and the fallback cannot drift apart.
export function IdentityProofScene({ active, reduceMotion }: { active: boolean; reduceMotion: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  const syncPlaybackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const composition = container?.parentElement;
    const phone = composition?.querySelector<HTMLElement>('.identity-demo-phone');
    const profile = composition?.querySelector<HTMLElement>('.identity-demo-profile');
    const signal = composition?.querySelector<SVGPathElement>('.identity-demo-connection-signal');

    if (reduceMotion || !container || !composition || !phone || !profile || !signal) return;

    const paths = Array.from(composition.querySelectorAll<SVGPathElement>('.identity-demo-connection path'));
    const originalPaths = paths.map((path) => path.getAttribute('d'));
    let renderer: WebGLRenderer;

    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      // The existing CSS phone and SVG transfer remain the complete illustration.
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'absolute inset-0 block size-full';
    container.appendChild(renderer.domElement);

    const scene = new Scene();
    const camera = new OrthographicCamera(0, 1, 1, 0, 0.1, 200);
    camera.position.z = 100;

    scene.add(new AmbientLight(0xffffff, 4));
    const keyLight = new DirectionalLight(0xffffff, 3);
    keyLight.position.set(-100, 250, 100);
    scene.add(keyLight);
    const rimLight = new DirectionalLight(0x9cbfe9, 1.4);
    rimLight.position.set(200, -100, 60);
    scene.add(rimLight);

    const bodyMaterial = new MeshPhysicalMaterial({
      color: 0xedf1f7,
      metalness: 0.12,
      roughness: 0.38,
      clearcoat: 0.8,
    });
    const coreMaterial = new MeshPhysicalMaterial({
      color: 0x1675e8,
      metalness: 0.18,
      roughness: 0.18,
      clearcoat: 1,
      transparent: true,
      depthTest: false,
    });
    const coreGeometry = new SphereGeometry(3, 16, 12);
    const core = new Mesh(coreGeometry, coreMaterial);
    core.scale.set(1.5, 0.8, 0.8);
    core.renderOrder = 3;
    scene.add(core);

    const length = Number.parseFloat(signal.getAttribute('stroke-dasharray') ?? '0.36');
    const uniforms = {
      uHead: { value: 0 },
      uLength: { value: length },
      uOpacity: { value: 0 },
      uSway: { value: new Vector2() },
    };
    const trailMaterial = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { ...uniforms, uGlow: { value: 0 } },
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    const glowMaterial = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { ...uniforms, uGlow: { value: 1 } },
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    let body: Mesh<ExtrudeGeometry, MeshPhysicalMaterial> | undefined;
    let trail: Mesh<TubeGeometry, ShaderMaterial> | undefined;
    let glow: Mesh<TubeGeometry, ShaderMaterial> | undefined;
    let curve: CubicBezierCurve3 | undefined;
    let liveCurve: CubicBezierCurve3 | undefined;
    let gap = 0;
    let elapsed = 0;
    let previousTime: number | undefined;
    let lastSignal = '';
    const displacement = new Vector3();
    const tangent = new Vector3();
    const forward = new Vector3(1, 0, 0);

    const shouldRender = createFrameRateLimit();
    const render = (time?: number) => {
      if (time !== undefined && !shouldRender(time)) return;
      if (!curve || !liveCurve) return;

      if (time !== undefined) {
        if (previousTime !== undefined) elapsed += Math.min((time - previousTime) / 1000, 0.05);
        previousTime = time;
      }
      const sway = uniforms.uSway.value;
      sway.set(Math.sin(elapsed * 0.85) * Math.min(gap * 0.08, 8), Math.sin(elapsed * 0.6) * 3);
      displacement.set(sway.x, sway.y, 0);
      liveCurve.v1.copy(curve.v1).add(displacement);
      liveCurve.v2.copy(curve.v2).add(displacement);
      const dx = (sway.x / gap) * 100;
      const dy = (-sway.y / 95) * 100;
      const pathData = `M0 100C${48 + dx} ${100 + dy} ${52 + dx} ${dy} 100 0`;
      for (const path of paths) path.setAttribute('d', pathData);

      // Opacity can run on the compositor; its inline style stays at the initial
      // value while the Web Animation is playing.
      const presentation = getComputedStyle(signal);
      const opacity = Number.parseFloat(presentation.opacity);
      const offset = Number.parseFloat(presentation.strokeDashoffset);
      const state = `${opacity}:${offset}`;

      if (state === lastSignal && opacity === 0) return;

      lastSignal = state;
      const head = length - offset;
      uniforms.uHead.value = head;
      uniforms.uOpacity.value = opacity;
      core.visible = opacity > 0 && head > 0 && head < 1;

      if (core.visible) {
        const t = curve.getUtoTmapping(head, 0);
        liveCurve.getPoint(t, core.position);
        liveCurve.getTangent(t, tangent);
        core.quaternion.setFromUnitVectors(forward, tangent);
        coreMaterial.opacity = opacity;
      }

      renderer.render(scene, camera);
      composition.dataset.proofRendered = 'true';
    };

    const resize = () => {
      const width = composition.clientWidth;
      const height = composition.clientHeight;
      if (!width || !height) return;

      const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
      renderer.setDrawingBufferSize(width, height, pixelRatio);
      camera.right = width;
      camera.top = height;
      camera.updateProjectionMatrix();

      if (body) {
        scene.remove(body);
        body.geometry.dispose();
      }
      const phoneWidth = phone.offsetWidth;
      body = new Mesh(
        new ExtrudeGeometry(phoneShape(phoneWidth - 1.5, phone.offsetHeight - 1.5), {
          depth: 3,
          bevelEnabled: true,
          bevelSize: 0.75,
          bevelThickness: 1,
          bevelSegments: 3,
          curveSegments: 12,
        }),
        bodyMaterial,
      );
      body.position.set(0.75, height - phone.offsetHeight + 0.75, -4);
      scene.add(body);

      const startX = phoneWidth - 1;
      const endX = width - profile.offsetWidth + 1;
      gap = endX - startX;
      const resizedCurve = new CubicBezierCurve3(
        new Vector3(startX, height / 2 - 95, 1),
        new Vector3(startX + gap * 0.48, height / 2 - 95, 1),
        new Vector3(startX + gap * 0.52, height / 2, 1),
        new Vector3(endX, height / 2, 1),
      );
      curve = resizedCurve;
      liveCurve = resizedCurve.clone();

      for (const mesh of [trail, glow]) {
        if (!mesh) continue;
        scene.remove(mesh);
        mesh.geometry.dispose();
      }
      const createTube = (radius: number) => {
        const geometry = new TubeGeometry(resizedCurve, 48, radius, 8, false);
        const uv = geometry.getAttribute('uv');
        const parameters = new Float32Array(uv.count);
        for (let i = 0; i < uv.count; i++) parameters[i] = resizedCurve.getUtoTmapping(uv.getX(i), 0);
        // Moving both Bézier controls by the same vector gives the shader's
        // exact 3t(1-t) displacement, with both endpoints fixed.
        geometry.setAttribute('aCurveT', new Float32BufferAttribute(parameters, 1));
        return geometry;
      };
      glow = new Mesh(createTube(4), glowMaterial);
      trail = new Mesh(createTube(1.6), trailMaterial);
      glow.renderOrder = 1;
      trail.renderOrder = 2;
      scene.add(glow, trail);
      lastSignal = '';
      render();
    };

    const syncPlayback = () => {
      previousTime = undefined;
      renderer.setAnimationLoop(activeRef.current && !document.hidden ? render : null);
    };
    syncPlaybackRef.current = syncPlayback;
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(composition);
    resize();
    syncPlayback();
    document.addEventListener('visibilitychange', syncPlayback);

    return () => {
      syncPlaybackRef.current = null;
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', syncPlayback);
      body?.geometry.dispose();
      trail?.geometry.dispose();
      glow?.geometry.dispose();
      coreGeometry.dispose();
      bodyMaterial.dispose();
      coreMaterial.dispose();
      trailMaterial.dispose();
      glowMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      delete composition.dataset.proofRendered;
      paths.forEach((path, index) => {
        const original = originalPaths[index];
        if (original !== null) path.setAttribute('d', original);
      });
    };
  }, [reduceMotion]);

  useEffect(() => {
    activeRef.current = active;
    syncPlaybackRef.current?.();
  }, [active]);

  return <div ref={containerRef} className="pointer-events-none absolute inset-0" aria-hidden="true" />;
}
