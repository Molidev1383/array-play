import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ArrayConfig } from '../types';
import { evaluateArrayFactor, evaluateElementPattern, getArrayWeightsAndPhases } from '../utils/antennaMath';
import { Box, Compass } from 'lucide-react';

interface ThreeDPatternViewerProps {
  config: ArrayConfig;
}

export const ThreeDPatternViewer: React.FC<ThreeDPatternViewerProps> = ({ config }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [showElements, setShowElements] = useState<boolean>(true);
  const sceneRef = useRef<THREE.Scene | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = 380;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x080d1a);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(4.5, 3.5, 4.8);
    camera.lookAt(0, 0, 0);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(6, 12, 8);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.6);
    dirLight2.position.set(-6, -6, -6);
    scene.add(dirLight2);

    // 4. Grid & 3D RGB Coordinate Axes with X, Y, Z Arrow Markers
    const gridHelper = new THREE.GridHelper(6, 12, 0x334155, 0x1e293b);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // Custom RGB Coordinate Axis Group
    const axisGroup = new THREE.Group();
    const axisLength = 2.2;
    const headLen = 0.3;
    const headWidth = 0.12;

    // X Axis - Red
    const xAxis = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      axisLength,
      0xef4444, // Red
      headLen,
      headWidth
    );
    axisGroup.add(xAxis);

    // Y Axis - Green
    const yAxis = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      axisLength,
      0x22c55e, // Green
      headLen,
      headWidth
    );
    axisGroup.add(yAxis);

    // Z Axis - Blue
    const zAxis = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0),
      axisLength,
      0x3b82f6, // Blue
      headLen,
      headWidth
    );
    axisGroup.add(zAxis);

    scene.add(axisGroup);

    // 5. Generate 3D Radiation Pattern Surface
    const numTheta = 60;
    const numPhi = 90;
    const geometry = new THREE.BufferGeometry();

    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const { weights, phases } = getArrayWeightsAndPhases(config);

    // Color ramp (Blue -> Cyan -> Green -> Yellow -> Red)
    const getColor = (v: number) => {
      const val = Math.max(0, Math.min(1, v));
      const color = new THREE.Color();
      color.setHSL((1 - val) * 0.68, 1.0, 0.5);
      return color;
    };

    // Spherical grid calculations
    for (let i = 0; i <= numTheta; i++) {
      const theta = (i * Math.PI) / numTheta;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let j = 0; j <= numPhi; j++) {
        const phi = (j * 2 * Math.PI) / numPhi;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const { afVal } = evaluateArrayFactor(config, theta, phi, weights, phases);
        const efVal = evaluateElementPattern(config.elementPattern, theta, phi, config.patchExponent || 1);

        // Pattern Radius
        const r = Math.max(0.01, afVal * efVal * 2.2);

        // Coordinates: X = r sinθ cosφ, Y = r sinθ sinφ, Z = r cosθ
        const x = r * sinTheta * cosPhi;
        const y = r * sinTheta * sinPhi;
        const z = r * cosTheta;

        positions.push(x, y, z);

        const col = getColor(r / 2.2);
        colors.push(col.r, col.g, col.b);
      }
    }

    // Build mesh faces
    for (let i = 0; i < numTheta; i++) {
      for (let j = 0; j < numPhi; j++) {
        const first = i * (numPhi + 1) + j;
        const second = first + numPhi + 1;

        indices.push(first, second, first + 1);
        indices.push(second, second + 1, first + 1);
      }
    }

    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      wireframe,
      roughness: 0.35,
      metalness: 0.1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88,
    });

    const lobeMesh = new THREE.Mesh(geometry, material);
    scene.add(lobeMesh);

    // 6. Draw Antenna Elements Spatial Geometry (Microstrip Patch, Dipole, or Isotropic)
    if (showElements) {
      const elementsGroup = new THREE.Group();

      // Create geometry based on element pattern type
      const createSingleElementMesh = () => {
        const elGroup = new THREE.Group();

        if (config.elementPattern === 'patch_cosine') {
          // REAL MICROSTRIP PATCH ANTENNA MESH: Ground plane + Substrate + Copper Patch
          // Substrate (green dielectric PCB material)
          const subGeo = new THREE.BoxGeometry(0.55, 0.55, 0.05);
          const subMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
          const subMesh = new THREE.Mesh(subGeo, subMat);

          // Ground plane (Silver plate underneath)
          const gndGeo = new THREE.BoxGeometry(0.57, 0.57, 0.01);
          const gndMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
          const gndMesh = new THREE.Mesh(gndGeo, gndMat);
          gndMesh.position.z = -0.03;

          // Rectangular Copper Patch (Gold metallic rectangular slab on top)
          const patchGeo = new THREE.BoxGeometry(0.38, 0.32, 0.015);
          const patchMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95, roughness: 0.15 });
          const patchMesh = new THREE.Mesh(patchGeo, patchMat);
          patchMesh.position.z = 0.032;

          // Microstrip Feed Line (Thin copper trace)
          const feedGeo = new THREE.BoxGeometry(0.06, 0.18, 0.014);
          const feedMesh = new THREE.Mesh(feedGeo, patchMat);
          feedMesh.position.set(0, -0.21, 0.032);

          elGroup.add(gndMesh);
          elGroup.add(subMesh);
          elGroup.add(patchMesh);
          elGroup.add(feedMesh);
        } else if (config.elementPattern === 'short_dipole_x') {
          // Horizontal Dipole along X-axis
          const dipGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.4, 12);
          const dipMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8, roughness: 0.2 });
          const dipMesh = new THREE.Mesh(dipGeo, dipMat);
          dipMesh.rotation.z = Math.PI / 2;
          elGroup.add(dipMesh);
        } else if (config.elementPattern === 'isotropic') {
          // Isotropic Sphere
          const sphGeo = new THREE.SphereGeometry(0.1, 16, 16);
          const sphMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, metalness: 0.5, roughness: 0.3 });
          const sphMesh = new THREE.Mesh(sphGeo, sphMat);
          elGroup.add(sphMesh);
        } else {
          // Standard Dipole cylinder along Z-axis
          const dipGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.4, 12);
          const dipMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
          const dipMesh = new THREE.Mesh(dipGeo, dipMat);
          dipMesh.rotation.x = Math.PI / 2;
          elGroup.add(dipMesh);
        }

        return elGroup;
      };

      if (config.arrayType === 'planar') {
        const Nx = config.numElements;
        const Ny = config.numElementsY || 4;
        const dx = config.spacing * 0.9;
        const dy = (config.spacingY || 0.5) * 0.9;

        for (let m = 0; m < Nx; m++) {
          for (let n = 0; n < Ny; n++) {
            const el = createSingleElementMesh();
            const xPos = (m - (Nx - 1) / 2) * dx;
            const yPos = (n - (Ny - 1) / 2) * dy;
            el.position.set(xPos, yPos, 0);
            elementsGroup.add(el);
          }
        }
      } else if (config.arrayType === 'circular') {
        const N = config.numElements;
        const radius = (config.radius || 0.5) * 1.5;
        for (let n = 0; n < N; n++) {
          const phiN = (2 * Math.PI * n) / N;
          const el = createSingleElementMesh();
          el.position.set(radius * Math.cos(phiN), radius * Math.sin(phiN), 0);
          elementsGroup.add(el);
        }
      } else {
        // 1D Linear ULA along Z-axis (or X-axis if planar)
        const N = config.numElements;
        const d = config.spacing * 0.9;
        for (let n = 0; n < N; n++) {
          const el = createSingleElementMesh();
          const zPos = (n - (N - 1) / 2) * d;
          el.position.set(0, 0, zPos);
          elementsGroup.add(el);
        }
      }

      scene.add(elementsGroup);
    }

    // 7. Mouse Drag Rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      lobeMesh.rotation.y += deltaX * 0.01;
      lobeMesh.rotation.x += deltaY * 0.01;
      axisGroup.rotation.y = lobeMesh.rotation.y;
      axisGroup.rotation.x = lobeMesh.rotation.x;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isDragging) {
        lobeMesh.rotation.y += 0.002;
        axisGroup.rotation.y = lobeMesh.rotation.y;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.dispose();
    };
  }, [config, wireframe, showElements]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-3 relative">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5 text-amber-400" />
          <h3 className="text-slate-100 font-bold text-sm sm:text-base">3D Radiation Pattern</h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setWireframe(!wireframe)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition ${
              wireframe ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            {wireframe ? 'View: Wireframe' : 'View: Solid'}
          </button>

          <button
            onClick={() => setShowElements(!showElements)}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition ${
              showElements ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            Antenna Elements
          </button>
        </div>
      </div>

      {/* Axis Indicator Legend */}
      <div className="bg-slate-950/90 border border-slate-800 p-2 rounded-lg flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-400 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-slate-400" />
            Axes:
          </span>
          <span className="text-red-400 font-bold font-mono bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
            🟥 X Axis
          </span>
          <span className="text-emerald-400 font-bold font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            🟩 Y Axis
          </span>
          <span className="text-blue-400 font-bold font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
            🟦 Z Axis
          </span>
        </div>
        <span className="text-[10px] text-slate-400 hidden sm:inline">
          {config.elementPattern === 'patch_cosine' ? 'Element: Microstrip Patch' : 'Element: Dipole / Monopole'}
        </span>
      </div>

      <div ref={mountRef} className="w-full h-[380px] rounded-lg overflow-hidden cursor-grab active:cursor-grabbing border border-slate-800 bg-slate-950 relative" />

      <div className="flex justify-between items-center text-xs text-slate-400">
        <span>Click and drag mouse to rotate the 3D pattern and axes in space.</span>
        <span className="text-amber-400 font-semibold">Red/Yellow = Peak Radiation</span>
      </div>
    </div>
  );
};

