import React, { useEffect, useRef } from 'react';

const VERT_SHADER = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG_SHADER = `
precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform float uScroll;
uniform vec2 uMouse;
uniform float uSeed;

// Hash functions
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// 5-octave domain-warped fBm
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  vec2 shift = vec2(100.0);
  // Rotate to wind direction ~265 deg (approx 4.62 rad)
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < 5; ++i) {
    v += a * noise(p);
    p = rot * p * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 st = gl_FragCoord.xy / uRes.xy;
  st.y = 1.0 - st.y; // Standard top-to-bottom coordinate

  // Parallax and scroll zoom (1.0 -> 1.15)
  float zoom = mix(1.0, 1.15, clamp(uScroll, 0.0, 1.0));
  vec2 uv = (st - 0.5) * zoom + 0.5;
  uv += (uMouse / uRes) * 0.02; // tiny parallax <= 12px

  // Wind direction stretch (~265 degrees, stretched aspect)
  vec2 windDir = vec2(-0.99, -0.14);
  vec2 seaCoord = vec2(
    dot(uv, vec2(windDir.y, -windDir.x)) * 3.8,
    dot(uv, windDir) * 1.2
  );

  float slowTime = uTime * 0.02;

  // Domain warping
  vec2 q = vec2(
    fbm(seaCoord + slowTime * 0.4),
    fbm(seaCoord + vec2(5.2, 1.3) + slowTime * 0.3)
  );

  vec2 r = vec2(
    fbm(seaCoord + 4.0 * q + vec2(1.7, 9.2) + slowTime * 0.15),
    fbm(seaCoord + 4.0 * q + vec2(8.3, 2.8) + slowTime * 0.12)
  );

  float sea = fbm(seaCoord + 4.0 * r);

  // Gamma curve: dark sea with sparse brighter ridges
  sea = pow(sea, 2.2) * 1.5;

  // Oil Slick Mask: centered around 68% x / 55% y, elongated at 100 deg
  vec2 slickCenter = vec2(0.68, 0.55);
  // Drift slightly east
  slickCenter.x += sin(slowTime * 0.5) * 0.02;
  vec2 delta = uv - slickCenter;

  // Rotate 100 deg
  float rad = 1.745; // 100 deg
  vec2 rotDelta = vec2(
    delta.x * cos(rad) + delta.y * sin(rad),
    -delta.x * sin(rad) + delta.y * cos(rad)
  );

  // Elongated ellipse
  float slickDist = length(vec2(rotDelta.x / 0.28, rotDelta.y / 0.09));
  // Organic boundary warp
  float slickWarp = fbm(uv * 6.0 + slowTime * 0.2) * 0.35;
  float slickMask = smoothstep(1.1 + slickWarp, 0.7 + slickWarp, slickDist);

  // In oil slick: capillary waves are damped -> brightness * ~0.25
  float dampening = mix(1.0, 0.25, slickMask);
  sea *= dampening;

  // Multiplicative speckle re-seeded ~4Hz
  float spNoise = hash(floor(gl_FragCoord.xy * 0.8) + vec2(uSeed * 37.1, uSeed * 91.7));
  float speckle = mix(0.85, 1.25, spNoise);
  sea *= speckle;

  // Clamp maximum luminance to ~40% so text stays readable
  sea = clamp(sea, 0.0, 0.40);

  // LUT Color Grade: #05040A -> #0E0B1F -> #2A2542 -> #5B4B8A -> #A78BFA
  vec3 c0 = vec3(0.0196, 0.0157, 0.0392); // #05040A
  vec3 c1 = vec3(0.0549, 0.0431, 0.1215); // #0E0B1F
  vec3 c2 = vec3(0.1647, 0.1451, 0.2588); // #2A2542
  vec3 c3 = vec3(0.3568, 0.2941, 0.5411); // #5B4B8A
  vec3 c4 = vec3(0.6549, 0.5451, 0.9803); // #A78BFA

  vec3 col = c0;
  if (sea < 0.1) {
    col = mix(c0, c1, sea / 0.1);
  } else if (sea < 0.2) {
    col = mix(c1, c2, (sea - 0.1) / 0.1);
  } else if (sea < 0.3) {
    col = mix(c2, c3, (sea - 0.2) / 0.1);
  } else {
    col = mix(c3, c4, (sea - 0.3) / 0.1);
  }

  // Soft top violet glow
  float topGlow = (1.0 - st.y) * 0.08;
  col += vec3(0.48, 0.36, 0.92) * topGlow;

  // Vignette
  float vig = st.x * st.y * (1.0 - st.x) * (1.0 - st.y);
  vig = clamp(pow(16.0 * vig, 0.25), 0.0, 1.0);
  col *= (0.7 + 0.3 * vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const HeroOcean: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Check WebGL availability
    const gl = canvas.getContext('webgl', { alpha: false, depth: false, antialias: false });

    // Fallback if no WebGL
    if (!gl) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#070512';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const glCtx = gl;

    // Compile Shader helper
    const compileShader = (src: string, type: number) => {
      const s = glCtx.createShader(type);
      if (!s) return null;
      glCtx.shaderSource(s, src);
      glCtx.compileShader(s);
      return s;
    };

    const vs = compileShader(VERT_SHADER, gl.VERTEX_SHADER);
    const fs = compileShader(FRAG_SHADER, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    // Full screen triangle
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );

    const posAttr = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    const uResLoc = gl.getUniformLocation(prog, 'uRes');
    const uTimeLoc = gl.getUniformLocation(prog, 'uTime');
    const uScrollLoc = gl.getUniformLocation(prog, 'uScroll');
    const uMouseLoc = gl.getUniformLocation(prog, 'uMouse');
    const uSeedLoc = gl.getUniformLocation(prog, 'uSeed');

    let animId: number;
    let isVisible = true;
    let mouse = { x: 0, y: 0 };
    let scrollY = 0;
    let startTime = performance.now();
    let lastSeedTime = 0;
    let currentSeed = 1;
    let lastRenderTime = 0;
    const targetFps = 30;
    const frameInterval = 1000 / targetFps;

    // Resize handler (render at 0.6x resolution for high efficiency)
    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.floor(rect.width * 0.6 * dpr);
      const h = Math.floor(rect.height * 0.6 * dpr);
      canvas.width = Math.max(300, w);
      canvas.height = Math.max(200, h);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uResLoc, canvas.width, canvas.height);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 24;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 24;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    const handleScroll = () => {
      scrollY = window.scrollY / Math.max(window.innerHeight, 1);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // IntersectionObserver to pause off-screen
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    // Page visibility to pause when tab is hidden
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const render = (now: number) => {
      if (!isVisible) {
        animId = requestAnimationFrame(render);
        return;
      }

      // Cap at ~30 FPS
      const elapsed = now - lastRenderTime;
      if (elapsed > frameInterval) {
        lastRenderTime = now - (elapsed % frameInterval);

        // Re-seed speckle ~4 times per second
        if (now - lastSeedTime > 250) {
          currentSeed = (currentSeed + 1) % 100;
          lastSeedTime = now;
        }

        const t = (now - startTime) * 0.001;
        gl.uniform1f(uTimeLoc, prefersReducedMotion ? 1.0 : t);
        gl.uniform1f(uScrollLoc, scrollY);
        gl.uniform2f(uMouseLoc, mouse.x, mouse.y);
        gl.uniform1f(uSeedLoc, prefersReducedMotion ? 1.0 : currentSeed);

        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    if (prefersReducedMotion) {
      render(startTime);
    } else {
      animId = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      observer.disconnect();

      // Dispose WebGL
      gl.deleteBuffer(posBuffer);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full object-cover block" />
    </div>
  );
};
