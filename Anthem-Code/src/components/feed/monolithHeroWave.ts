/** Port of Monolith-Site/wave.js — the hero still, with a ripple only while the pointer is over it. */

type Stop = () => void;

export function startMonolithHeroWave(
  hero: HTMLElement,
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  frame: HTMLElement,
): Stop {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
  if (!gl) return () => {};

  const vert = `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main() {
      vUv = aPos * 0.5 + 0.5;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }`;
  const frag = `
    precision mediump float;
    uniform sampler2D uTex;
    uniform vec2 uMouse;
    uniform vec2 uCover;
    uniform float uTime;
    uniform float uHover;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      vec2 to = uv - uMouse;
      float d = length(to);
      vec2 dir = d > 0.0001 ? to / d : vec2(0.0);
      float ripple = sin(d * 36.0 - uTime * 3.6) * exp(-d * 2.6);
      float w1 = sin(uv.x * 5.2 + uv.y * 1.6 + uTime * 1.15);
      float w2 = sin(uv.y * 6.4 - uTime * 0.95);
      float w3 = sin((uv.x + uv.y) * 8.0 + uTime * 1.45);
      vec2 offset = vec2(w1 * 0.55 + w3 * 0.35, w2 * 0.55 + ripple) * 0.032 * uHover;
      offset += dir * ripple * 0.05 * uHover;
      vec2 tex = (uv + offset - 0.5) * uCover + 0.5;
      tex = clamp(tex, 0.001, 0.999);
      vec3 color = texture2D(uTex, tex).rgb;
      float grain = fract(sin(dot(floor(gl_FragCoord.xy) + floor(uTime * 10.0), vec2(12.9898, 78.233))) * 43758.5453);
      color += (grain - 0.5) * 0.045 * uHover;
      gl_FragColor = vec4(color, 1.0);
    }`;

  const shader = (type: number, source: string) => {
    const item = gl.createShader(type);
    if (!item) return null;
    gl.shaderSource(item, source);
    gl.compileShader(item);
    return item;
  };
  const program = gl.createProgram();
  if (!program) return () => {};
  const vs = shader(gl.VERTEX_SHADER, vert);
  const fs = shader(gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return () => {};
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return () => {};
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const uMouse = gl.getUniformLocation(program, "uMouse");
  const uCover = gl.getUniformLocation(program, "uCover");
  const uTime = gl.getUniformLocation(program, "uTime");
  const uHover = gl.getUniformLocation(program, "uHover");

  let hover = 0;
  let targetHover = 0;
  const mouse = [0.5, 0.55];
  const target = [0.5, 0.55];
  let time = 0;
  let last = 0;
  let raf = 0;
  let running = false;
  let alive = true;

  const cover = () => {
    const iw = image.naturalWidth || 1;
    const ih = image.naturalHeight || 1;
    const cr = canvas.width / Math.max(1, canvas.height);
    const ir = iw / ih;
    if (cr > ir) return [1, ir / cr];
    return [cr / ir, 1];
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const draw = () => {
    if (!alive) return;
    resize();
    gl.uniform2f(uMouse, mouse[0], mouse[1]);
    const fit = cover();
    gl.uniform2f(uCover, fit[0], fit[1]);
    gl.uniform1f(uTime, time);
    gl.uniform1f(uHover, hover);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  const loop = (now: number) => {
    if (!alive) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    hover += (targetHover - hover) * 0.08;
    mouse[0] += (target[0] - mouse[0]) * 0.14;
    mouse[1] += (target[1] - mouse[1]) * 0.14;
    if (hover > 0.004) time += dt;
    draw();
    if (targetHover > 0 || hover > 0.004) raf = requestAnimationFrame(loop);
    else running = false;
  };

  const play = () => {
    if (running || !alive) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(loop);
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    target[0] = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    target[1] = Math.min(1, Math.max(0, 1 - (event.clientY - rect.top) / rect.height));
    targetHover = 1;
    play();
  };
  const onLeave = () => {
    targetHover = 0;
    play();
  };
  const onResize = () => {
    if (!running) draw();
  };

  const boot = () => {
    if (!alive) return;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    draw();
    frame.classList.add("is-wave");
  };

  hero.addEventListener("pointermove", onMove);
  hero.addEventListener("pointerleave", onLeave);
  window.addEventListener("resize", onResize);
  if (image.complete && image.naturalWidth) boot();
  else image.addEventListener("load", boot, { once: true });

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    hero.removeEventListener("pointermove", onMove);
    hero.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("resize", onResize);
    image.removeEventListener("load", boot);
    frame.classList.remove("is-wave");
  };
}
