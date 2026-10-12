import { useEffect, useRef } from 'react';
import { Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, WebGLRenderer } from 'three';
import { createFrameRateLimit } from './frame-rate-limit';
import { usePrefersReducedMotion } from './use-prefers-reduced-motion';

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform vec2 uSize;
uniform float uTime;
uniform float uHover;
varying vec2 vUv;

float gaussian(float distance, float width) {
  float x = distance / width;
  return exp(-x * x);
}

void main() {
  float size = min(uSize.x, uSize.y);
  vec2 p = (vUv - 0.5) * uSize / size * 2.0;
  float t = uTime * 0.24;
  p.y -= sin(t * 0.8) * 0.018;

  float angle = atan(p.y, p.x);
  float radius = 0.72 + (0.018 + uHover * 0.008) *
    (sin(angle * 3.0 + t) + 0.45 * sin(angle * 5.0 - t * 0.7));
  float r = length(p);
  float d = r - radius;
  float rimWave = 0.5 + 0.5 * sin(angle * 2.0 + 0.55 * sin(angle * 3.0 + t * 0.3) - t * 0.45);
  float width = 0.022 + 0.042 * pow(rimWave, 1.4);
  float shell = gaussian(d, width);
  float inner = gaussian(d + 0.045, 0.09);
  float outer = gaussian(d - 0.015, 0.075);

  float highlight = pow(0.5 + 0.5 * cos(angle - t * 0.7 - 1.8), 8.0);
  float secondary = pow(0.5 + 0.5 * cos(angle + t * 0.5 + 1.0), 5.0);
  vec3 blue = vec3(0.045, 0.27, 0.78);
  vec3 ice = vec3(0.66, 0.84, 0.96);
  vec3 color = mix(blue, ice, 0.5 + 0.35 * sin(angle + t * 0.4));
  color = mix(color, vec3(0.98, 1.0, 1.0), highlight * 0.7);
  color = mix(color, vec3(0.32, 0.63, 0.9), secondary * 0.6);

  float filigreeRadius = radius - 0.026 + 0.018 * sin(angle * 2.0 + t * 0.9);
  float filigree = gaussian(r - filigreeRadius, 0.008);
  color = mix(color, vec3(0.91, 0.97, 1.0), filigree * (0.2 + highlight * 0.4 + secondary * 0.15));

  float edge = gaussian(d - 0.03, 0.008);
  color = mix(color, blue * 0.65, edge * (1.0 - highlight) * 0.15);
  float interior = 1.0 - smoothstep(radius - 0.1, radius, r);
  float flow = p.x + p.y * 0.35 + 0.16 * sin(p.y * 4.0 - t * 0.75) + 0.18 * sin(t * 0.6);
  float veil = gaussian(flow, 0.36) * interior;
  float surfaceAlpha = shell * (0.5 + rimWave * 0.3) + inner * 0.18 + outer * 0.1;
  float interiorAlpha = interior * 0.02 + veil * 0.09;
  vec3 interiorColor = vec3(0.58, 0.78, 0.96);
  float alpha = clamp(surfaceAlpha + interiorAlpha, 0.0, 1.0);
  color = mix(interiorColor, color, smoothstep(0.0, 0.45, surfaceAlpha));
  gl_FragColor = vec4(color, alpha);
}
`;

export function AiOrbVisual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    let renderer: WebGLRenderer;

    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
    } catch {
      // Keep the static material visible on devices without WebGL.
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'absolute inset-0 block size-full';
    container.appendChild(renderer.domElement);

    const scene = new Scene();
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new PlaneGeometry(2, 2);
    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uSize: { value: new Vector2(1, 1) },
        uTime: { value: 4 },
        uHover: { value: 0 },
      },
    });

    scene.add(new Mesh(geometry, material));

    let frame = 0;
    let previousTime = 0;
    let inView = false;
    let hover = 0;

    const render = () => {
      renderer.render(scene, camera);
      container.dataset.rendered = 'true';
    };

    const shouldRender = createFrameRateLimit();
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (!shouldRender(now)) return;
      const delta = previousTime ? Math.min((now - previousTime) / 1000, 0.05) : 0;
      previousTime = now;
      material.uniforms.uTime.value += delta;
      material.uniforms.uHover.value += (hover - material.uniforms.uHover.value) * (1 - Math.exp(-delta * 3));
      render();
    };

    const syncPlayback = () => {
      cancelAnimationFrame(frame);
      previousTime = 0;

      if (!inView || document.hidden) return;

      if (reduceMotion) render();
      else frame = requestAnimationFrame(tick);
    };

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (!width || !height) return;

      renderer.setSize(width, height, false);
      material.uniforms.uSize.value.set(width, height);
      render();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const viewObserver = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        syncPlayback();
      },
      { threshold: 0.1 },
    );
    viewObserver.observe(container);

    const pointerEnter = () => {
      hover = 1;
    };
    const pointerLeave = () => {
      hover = 0;
    };

    container.addEventListener('pointerenter', pointerEnter);
    container.addEventListener('pointerleave', pointerLeave);
    document.addEventListener('visibilitychange', syncPlayback);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      viewObserver.disconnect();
      document.removeEventListener('visibilitychange', syncPlayback);
      container.removeEventListener('pointerenter', pointerEnter);
      container.removeEventListener('pointerleave', pointerLeave);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      delete container.dataset.rendered;
    };
  }, [reduceMotion]);

  return (
    <div className="relative flex size-full items-center justify-center" aria-hidden="true">
      <div className="ai-orb-shadow pointer-events-none absolute bottom-[5%] left-1/2 h-[5%] w-[44%] -translate-x-1/2 rounded-[50%]" />
      <div ref={containerRef} className="ai-orb-material relative h-full w-full [container-type:size]">
        <div className="ai-orb-poster absolute top-1/2 left-1/2 size-[min(72cqw,72cqh)] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      </div>
    </div>
  );
}
