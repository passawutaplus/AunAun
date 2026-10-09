/** Ripple the giant status code while the pointer is over the page. Paper and copy stay still. */

type Stop = () => void;

export function startStatusCodeWave(
  root: HTMLElement,
  label: HTMLElement,
  canvas: HTMLCanvasElement,
): Stop {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
  });
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
    uniform float uTime;
    uniform float uHover;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      vec2 to = uv - uMouse;
      float d = length(to);
      vec2 dir = d > 0.0001 ? to / d : vec2(0.0);
      float ripple = sin(d * 32.0 - uTime * 3.4) * exp(-d * 3.4);
      float w1 = sin(uv.x * 7.0 + uTime * 1.15);
      float w2 = sin(uv.y * 5.4 - uTime * 0.9);
      vec2 offset = vec2(w1 * 0.45, w2 * 0.7 + ripple) * 0.0075 * uHover;
      offset += dir * ripple * 0.014 * uHover;
      vec2 tex = clamp(uv + offset, 0.001, 0.999);
      gl_FragColor = texture2D(uTex, tex);
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
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const uMouse = gl.getUniformLocation(program, "uMouse");
  const uTime = gl.getUniformLocation(program, "uTime");
  const uHover = gl.getUniformLocation(program, "uHover");

  const source = document.createElement("canvas");
  const paint = source.getContext("2d");
  if (!paint) return () => {};

  let hover = 0;
  let targetHover = 0;
  const mouse = [0.5, 0.2];
  const target = [0.5, 0.2];
  let time = 0;
  let last = 0;
  let raf = 0;
  let running = false;
  let alive = true;
  let texW = 0;
  let texH = 0;

  const paintCode = () => {
    const rootRect = root.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rootRect.width * dpr));
    const h = Math.max(1, Math.round(rootRect.height * dpr));
    if (source.width !== w || source.height !== h) {
      source.width = w;
      source.height = h;
    } else {
      paint.clearRect(0, 0, w, h);
    }
    const style = getComputedStyle(label);
    const fontSize = parseFloat(style.fontSize) || 160;
    const lineHeight = Number.parseFloat(style.lineHeight) || fontSize * 0.8;
    const tracking = style.letterSpacing === "normal" ? 0 : parseFloat(style.letterSpacing) || 0;
    const text = (label.textContent || "").trim();
    paint.font = `${style.fontWeight} ${fontSize * dpr}px ${style.fontFamily}`;
    paint.fillStyle = style.color;
    paint.textBaseline = "top";
    const box = label.getBoundingClientRect();
    const y = (box.top - rootRect.top + (lineHeight - fontSize) / 2) * dpr;
    let x = (box.left - rootRect.left) * dpr;
    const step = tracking * dpr;
    for (const ch of text) {
      paint.fillText(ch, x, y);
      x += paint.measureText(ch).width + step;
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    texW = w;
    texH = h;
    root.classList.add("is-code-wave");
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
    if (w !== texW || h !== texH) paintCode();
  };

  const draw = () => {
    if (!alive) return;
    resize();
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uMouse, mouse[0], mouse[1]);
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
    const rect = root.getBoundingClientRect();
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

  const boot = () => {
    if (!alive) return;
    paintCode();
    draw();
  };

  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerleave", onLeave);
  const observer = new ResizeObserver(() => {
    paintCode();
    if (!running) draw();
  });
  observer.observe(root);
  if (document.fonts?.ready) void document.fonts.ready.then(boot);
  boot();

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    root.removeEventListener("pointermove", onMove);
    root.removeEventListener("pointerleave", onLeave);
    observer.disconnect();
    root.classList.remove("is-code-wave");
  };
}
