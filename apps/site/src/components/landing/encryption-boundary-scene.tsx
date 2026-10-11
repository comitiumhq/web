import { useEffect, useRef } from 'react';
import { Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, WebGLRenderer } from 'three';
import { createFrameRateLimit } from './frame-rate-limit';

// Typography stays in the DOM. Three only adds the lit edge at the exact same
// midpoint used by both clipping masks, with Motion owning the packet position.
export function EncryptionBoundaryScene({ active, reduceMotion }: { active: boolean; reduceMotion: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  const syncPlaybackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const composition = container?.parentElement;
    if (!container || !composition) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'absolute inset-0 block size-full';
    container.appendChild(renderer.domElement);

    const scene = new Scene();
    const camera = new OrthographicCamera(-215, 215, 155, -155, 0.1, 100);
    camera.position.z = 50;
    const geometry = new PlaneGeometry(1, 1);
    const material = new ShaderMaterial({
      uniforms: { uStrength: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uStrength;
        varying vec2 vUv;
        void main() {
          float distance = vUv.x - 0.5;
          float glow = exp(-pow(distance * 6.0, 2.0));
          float rim = exp(-pow(distance * 40.0, 2.0));
          float core = exp(-pow(distance * 120.0, 2.0));
          float taper = smoothstep(0.0, 0.12, vUv.y) * (1.0 - smoothstep(0.88, 1.0, vUv.y));
          vec3 blue = mix(vec3(0.12, 0.44, 0.82), vec3(0.83, 0.94, 1.0), core);
          float alpha = taper * (glow * (0.12 + uStrength * 0.12) + rim * 0.55 + core * 0.3);
          gl_FragColor = vec4(blue, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    const boundary = new Mesh(geometry, material);
    scene.add(boundary);
    let lastPosition = Number.NaN;

    const shouldRender = createFrameRateLimit();
    const render = (time?: number) => {
      if (time !== undefined && !shouldRender(time)) return;
      const position = Number.parseFloat(getComputedStyle(composition).getPropertyValue('--packet-x'));
      if (position === lastPosition) return;
      lastPosition = position;
      const crossing = Math.max(0, 1 - Math.abs(position - 30) / 25);
      material.uniforms.uStrength.value = crossing;
      renderer.render(scene, camera);
      composition.dataset.encryptionRendered = 'true';
    };
    const resize = () => {
      const width = composition.clientWidth;
      const height = composition.clientHeight;
      if (!width || !height) return;
      renderer.setDrawingBufferSize(width, height, Math.min(window.devicePixelRatio, 1.5));
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
      boundary.scale.set(width * 0.1, height * 0.9, 1);
      lastPosition = Number.NaN;
      render();
    };
    const syncPlayback = () => {
      renderer.setAnimationLoop(activeRef.current && !document.hidden && !reduceMotion ? render : null);
    };
    syncPlaybackRef.current = syncPlayback;
    const observer = new ResizeObserver(resize);
    observer.observe(composition);
    resize();
    syncPlayback();
    document.addEventListener('visibilitychange', syncPlayback);

    return () => {
      syncPlaybackRef.current = null;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      document.removeEventListener('visibilitychange', syncPlayback);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      delete composition.dataset.encryptionRendered;
    };
  }, [reduceMotion]);

  useEffect(() => {
    activeRef.current = active;
    syncPlaybackRef.current?.();
  }, [active]);

  return <div ref={containerRef} className="pointer-events-none absolute inset-0" aria-hidden="true" />;
}
