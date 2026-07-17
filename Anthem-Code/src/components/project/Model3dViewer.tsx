import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { LoadPercentBar } from "@/components/project/LoadPercentBar";
import type { Model3dFormat, Model3dOrbit } from "@/lib/flexGridLayout";
import { cn } from "@/lib/utils";

type Props = {
  url: string;
  format: Model3dFormat;
  /** Initial camera orbit (applied once after the model is framed). */
  orbit?: Model3dOrbit;
  /**
   * Editor mode: orbit only when the pointer hits the mesh.
   * Empty space inside the frame lets pointer events pass through (module drag).
   */
  meshOnlyOrbit?: boolean;
  /** Spin the model slowly when the view is not locked. Default true. */
  autoRotate?: boolean;
  /** Freeze camera: no drag-orbit / zoom / auto-rotate. */
  viewLocked?: boolean;
  /** Fired when the user finishes an orbit gesture, or when the view is locked. */
  onOrbitChange?: (orbit: Model3dOrbit) => void;
  className?: string;
};

function readOrbit(camera: THREE.PerspectiveCamera, controls: OrbitControls): Model3dOrbit {
  const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
  const spherical = new THREE.Spherical().setFromVector3(offset);
  return {
    theta: spherical.theta,
    phi: spherical.phi,
    radius: Math.max(0.01, spherical.radius),
  };
}

function applyOrbit(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  orbit: Model3dOrbit,
) {
  const spherical = new THREE.Spherical(
    Math.max(0.01, orbit.radius),
    Math.max(0.01, Math.min(Math.PI - 0.01, orbit.phi)),
    orbit.theta,
  );
  const offset = new THREE.Vector3().setFromSpherical(spherical);
  camera.position.copy(controls.target).add(offset);
  camera.lookAt(controls.target);
  controls.update();
}

type ControlsApi = {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  applyInteractionState: () => void;
};

/**
 * Interactive STL/OBJ viewer with 360° orbit controls.
 * Lazily instantiates Three.js and disposes all GPU resources on unmount.
 */
export default function Model3dViewer({
  url,
  format,
  orbit,
  meshOnlyOrbit = false,
  autoRotate = true,
  viewLocked = false,
  onOrbitChange,
  className,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef(orbit);
  const onOrbitChangeRef = useRef(onOrbitChange);
  const meshOnlyOrbitRef = useRef(meshOnlyOrbit);
  const autoRotateRef = useRef(autoRotate);
  const viewLockedRef = useRef(viewLocked);
  const apiRef = useRef<ControlsApi | null>(null);
  const prevViewLockedRef = useRef(viewLocked);

  orbitRef.current = orbit;
  onOrbitChangeRef.current = onOrbitChange;
  meshOnlyOrbitRef.current = meshOnlyOrbit;
  autoRotateRef.current = autoRotate;
  viewLockedRef.current = viewLocked;

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let frameId = 0;
    let orbiting = false;
    setLoading(true);
    setProgress(0);
    setError(null);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth || 300, mount.clientHeight || 300);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    if (meshOnlyOrbitRef.current) {
      renderer.domElement.style.pointerEvents = "none";
    }

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(1, 1.5, 1);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-1, -0.5, -1);
    scene.add(fill);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.autoRotateSpeed = 1.6;

    const applyInteractionState = () => {
      const locked = viewLockedRef.current;
      const spin = autoRotateRef.current && !locked && !orbiting;
      controls.enableRotate = !locked;
      controls.enableZoom = !locked;
      controls.autoRotate = spin;
      if (locked) {
        renderer.domElement.style.pointerEvents = "none";
        renderer.domElement.style.cursor = "";
      } else if (!meshOnlyOrbitRef.current) {
        renderer.domElement.style.pointerEvents = "auto";
        renderer.domElement.style.cursor = orbiting ? "grabbing" : "grab";
      }
    };

    apiRef.current = { camera, controls, applyInteractionState };
    applyInteractionState();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let object: THREE.Object3D | null = null;

    const hitTest = (clientX: number, clientY: number): boolean => {
      if (!object || viewLockedRef.current) return false;
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObject(object, true).length > 0;
    };

    const setPointerThrough = (through: boolean) => {
      if (viewLockedRef.current) {
        renderer.domElement.style.pointerEvents = "none";
        renderer.domElement.style.cursor = "";
        return;
      }
      if (!meshOnlyOrbitRef.current) {
        renderer.domElement.style.pointerEvents = "auto";
        renderer.domElement.style.cursor = orbiting ? "grabbing" : "grab";
        return;
      }
      renderer.domElement.style.pointerEvents = through ? "none" : "auto";
      renderer.domElement.style.cursor = through ? "" : orbiting ? "grabbing" : "grab";
    };

    const onPointerMoveHover = (e: PointerEvent) => {
      if (!meshOnlyOrbitRef.current || orbiting || disposed || viewLockedRef.current) return;
      setPointerThrough(!hitTest(e.clientX, e.clientY));
    };

    const onControlsStart = () => {
      if (viewLockedRef.current) return;
      orbiting = true;
      controls.autoRotate = false;
      if (meshOnlyOrbitRef.current) {
        renderer.domElement.style.pointerEvents = "auto";
        renderer.domElement.style.cursor = "grabbing";
      } else {
        renderer.domElement.style.cursor = "grabbing";
      }
    };

    const onControlsEnd = () => {
      orbiting = false;
      const next = readOrbit(camera, controls);
      onOrbitChangeRef.current?.(next);
      applyInteractionState();
      if (meshOnlyOrbitRef.current && !viewLockedRef.current) {
        setPointerThrough(true);
      }
    };

    const onPointerDownCapture = (e: PointerEvent) => {
      if (viewLockedRef.current) {
        setPointerThrough(true);
        return;
      }
      if (!meshOnlyOrbitRef.current) return;
      if (hitTest(e.clientX, e.clientY)) {
        e.stopPropagation();
        setPointerThrough(false);
      } else {
        setPointerThrough(true);
      }
    };

    controls.addEventListener("start", onControlsStart);
    controls.addEventListener("end", onControlsEnd);
    mount.addEventListener("pointermove", onPointerMoveHover);
    renderer.domElement.addEventListener("pointermove", onPointerMoveHover);
    renderer.domElement.addEventListener("pointerdown", onPointerDownCapture, true);

    const frameObject = (obj: THREE.Object3D) => {
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      obj.position.sub(center);

      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const fov = (camera.fov * Math.PI) / 180;
      const dist = (maxDim / 2 / Math.tan(fov / 2)) * 1.6;
      camera.position.set(dist * 0.6, dist * 0.4, dist);
      camera.near = dist / 100;
      camera.far = dist * 100;
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.update();

      const saved = orbitRef.current;
      if (saved) {
        applyOrbit(camera, controls, saved);
        camera.near = saved.radius / 100;
        camera.far = saved.radius * 100;
        camera.updateProjectionMatrix();
      }
    };

    const material = new THREE.MeshStandardMaterial({
      color: 0x9aa3af,
      metalness: 0.1,
      roughness: 0.7,
    });

    const onProgress = (event: ProgressEvent) => {
      if (disposed) return;
      if (event.lengthComputable && event.total > 0) {
        setProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      } else if (event.loaded > 0) {
        setProgress((p) => Math.min(90, Math.max(p, 12) + 4));
      }
    };

    const onLoaded = (obj: THREE.Object3D) => {
      if (disposed) return;
      object = obj;
      scene.add(obj);
      frameObject(obj);
      applyInteractionState();
      setProgress(100);
      setLoading(false);
    };

    const onError = () => {
      if (disposed) return;
      setError("โหลดโมเดล 3D ไม่สำเร็จ");
      setLoading(false);
    };

    if (format === "stl") {
      new STLLoader().load(
        url,
        (geometry) => {
          geometry.computeVertexNormals();
          onLoaded(new THREE.Mesh(geometry, material));
        },
        onProgress,
        onError,
      );
    } else {
      new OBJLoader().load(
        url,
        (obj) => {
          obj.traverse((child) => {
            if (child instanceof THREE.Mesh) child.material = material;
          });
          onLoaded(obj);
        },
        onProgress,
        onError,
      );
    }

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      ro.disconnect();
      apiRef.current = null;
      controls.removeEventListener("start", onControlsStart);
      controls.removeEventListener("end", onControlsEnd);
      mount.removeEventListener("pointermove", onPointerMoveHover);
      renderer.domElement.removeEventListener("pointermove", onPointerMoveHover);
      renderer.domElement.removeEventListener("pointerdown", onPointerDownCapture, true);
      controls.dispose();
      material.dispose();
      if (object) {
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            const m = child.material;
            if (Array.isArray(m)) m.forEach((x) => x?.dispose());
            else m?.dispose();
          }
        });
        scene.remove(object);
      }
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [url, format]);

  // Sync lock / auto-rotate without remounting the WebGL scene.
  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;

    const wasLocked = prevViewLockedRef.current;
    prevViewLockedRef.current = viewLocked;

    if (viewLocked && !wasLocked) {
      onOrbitChangeRef.current?.(readOrbit(api.camera, api.controls));
    }

    api.applyInteractionState();
  }, [viewLocked, autoRotate]);

  return (
    <div className={cn("relative h-full w-full bg-transparent", className)}>
      <div ref={mountRef} className="h-full w-full" />
      {loading && !error ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-muted/20 px-4">
          <LoadPercentBar percent={progress} label="กำลังโหลดโมเดล 3D" />
        </div>
      ) : null}
      {error ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-muted-foreground">
          {error}
        </div>
      ) : null}
    </div>
  );
}
