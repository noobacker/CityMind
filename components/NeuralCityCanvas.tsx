"use client";

import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { Line, OrbitControls, PerspectiveCamera, PointMaterial, Points } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type CitySignal = {
  id: string;
  label: string;
  detail: string;
  severity: "stable" | "alert" | "critical";
  x?: number;
  y?: number;
};

type NodeData = CitySignal & {
  position: [number, number, number];
  height: number;
  width: number;
  depth: number;
  pulseSpeed: number;
  pulseOffset: number;
  connectionIds: string[];
};

type CanvasProps = {
  onSignalHover?: (signal: CitySignal | null) => void;
  onSignalSelect?: (signal: CitySignal) => void;
  selectedSignalId?: string | null;
};

const palette = {
  background: "#0A0F1C",
  primary: "#00D1FF",
  secondary: "#7B61FF",
  signal: "#FF4FD8",
  accent: "#00FFA3",
  text: "#E6F1FF",
};

const signalCatalog = [
  { label: "Traffic spike +42%", detail: "Construction merge + event release + stalled bus lane detected.", severity: "critical" as const },
  { label: "Pollution alert", detail: "PM2.5 plume rising near industrial corridor with low wind dispersion.", severity: "alert" as const },
  { label: "Grid instability", detail: "Localized outage probability increased after feeder load imbalance.", severity: "alert" as const },
  { label: "Transit overload", detail: "Platform density is exceeding safe dwell thresholds.", severity: "critical" as const },
  { label: "Water pressure drop", detail: "Maintenance diversion created a downstream service lag.", severity: "stable" as const },
  { label: "Emergency reroute", detail: "Adaptive routing is clearing a vehicle priority corridor.", severity: "stable" as const },
];

function buildCity() {
  const nodes: NodeData[] = [];
  const connections: Array<{ from: NodeData; to: NodeData; strength: number }> = [];
  const connectionKeys = new Set<string>();
  const rows = 8;
  const cols = 10;
  const spacingX = 0.92;
  const spacingZ = 0.84;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const seed = row * cols + col + 1;
      const wave = Math.sin(seed * 1.73) * 0.5 + 0.5;
      const ridge = Math.cos((row + 1) * 0.8) * 0.5 + 0.5;
      const hotspot = col >= 3 && col <= 6 && row >= 2 && row <= 5;
      const height = 0.45 + wave * 1.3 + (hotspot ? 1.3 : 0);
      const signal = signalCatalog[seed % signalCatalog.length];
      const id = `node-${row}-${col}`;

      nodes.push({
        id,
        label: signal.label,
        detail: signal.detail,
        severity: hotspot || seed % 11 === 0 ? "critical" : seed % 4 === 0 ? "alert" : signal.severity,
        position: [
          (col - (cols - 1) / 2) * spacingX + Math.sin(seed * 0.34) * 0.08,
          0,
          (row - (rows - 1) / 2) * spacingZ + Math.cos(seed * 0.22) * 0.08,
        ],
        height,
        width: hotspot ? 0.16 : 0.11,
        depth: hotspot ? 0.16 : 0.11,
        pulseSpeed: 0.9 + (seed % 5) * 0.22,
        pulseOffset: seed * 0.55,
        connectionIds: [],
      });
    }
  }

  for (const node of nodes) {
    const neighbors = nodes
      .filter((candidate) => candidate.id !== node.id)
      .map((candidate) => ({
        node: candidate,
        distance: Math.hypot(candidate.position[0] - node.position[0], candidate.position[2] - node.position[2]),
      }))
      .filter(({ distance }) => distance < 1.45)
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 4);

    for (const neighbor of neighbors) {
      const key = [node.id, neighbor.node.id].sort().join("-");
      if (connectionKeys.has(key)) continue;
      connectionKeys.add(key);
      connections.push({ from: node, to: neighbor.node, strength: 1 - neighbor.distance / 1.45 });
      node.connectionIds.push(neighbor.node.id);
    }
  }

  return { nodes, connections };
}

function severityColor(severity: CitySignal["severity"]) {
  if (severity === "critical") return palette.signal;
  if (severity === "alert") return palette.primary;
  return palette.accent;
}

function Building({
  node,
  selected,
  onHover,
  onLeave,
  onSelect,
}: {
  node: NodeData;
  selected: boolean;
  onHover: (event: ThreeEvent<PointerEvent>, node: NodeData) => void;
  onLeave: () => void;
  onSelect: (node: NodeData) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const color = severityColor(node.severity);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    const pulse = 1 + Math.sin(elapsed * node.pulseSpeed + node.pulseOffset) * 0.07;

    if (meshRef.current) {
      meshRef.current.scale.y = pulse;
      meshRef.current.position.y = (node.height * pulse) / 2;
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = selected ? 2.2 : node.severity === "critical" ? 1.35 : 0.9;
    }

    if (haloRef.current) {
      haloRef.current.scale.setScalar(selected ? 1.52 + Math.sin(elapsed * 2.1) * 0.08 : 1.1 + Math.sin(elapsed * 1.3) * 0.03);
      const haloMaterial = haloRef.current.material as THREE.MeshBasicMaterial;
      haloMaterial.opacity = selected ? 0.42 : node.severity === "critical" ? 0.16 : 0.08;
    }
  });

  return (
    <group position={node.position}>
      <mesh
        ref={meshRef}
        onPointerOver={(event) => onHover(event, node)}
        onPointerOut={onLeave}
        onClick={() => onSelect(node)}
      >
        <boxGeometry args={[node.width, node.height, node.depth]} />
        <meshStandardMaterial
          color={palette.text}
          emissive={new THREE.Color(color)}
          emissiveIntensity={1}
          roughness={0.15}
          metalness={0.92}
          transparent
          opacity={0.92}
        />
      </mesh>

      <mesh ref={haloRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.16, selected ? 0.36 : 0.26, 48]} />
        <meshBasicMaterial color={new THREE.Color(color)} transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function CityConnections({
  connections,
  selectedSignalId,
}: {
  connections: Array<{ from: NodeData; to: NodeData; strength: number }>;
  selectedSignalId?: string | null;
}) {
  return (
    <>
      {connections.map((connection) => {
        const emphasized = selectedSignalId && (connection.from.id === selectedSignalId || connection.to.id === selectedSignalId);
        const points: [number, number, number][] = [
          [connection.from.position[0], connection.from.height * 0.72, connection.from.position[2]],
          [connection.to.position[0], connection.to.height * 0.72, connection.to.position[2]],
        ];

        return (
          <Line
            key={`${connection.from.id}-${connection.to.id}`}
            points={points}
            color={emphasized ? palette.signal : palette.primary}
            transparent
            opacity={emphasized ? 0.7 : 0.16 + connection.strength * 0.08}
            lineWidth={emphasized ? 1.8 : 0.8}
          />
        );
      })}
    </>
  );
}

function FlowParticles({
  connections,
  selectedSignalId,
}: {
  connections: Array<{ from: NodeData; to: NodeData; strength: number }>;
  selectedSignalId?: string | null;
}) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleMap = useMemo(
    () =>
      connections.slice(0, 48).map((connection, index) => ({
        connection,
        offset: (index % 7) / 7,
        speed: 0.14 + (index % 5) * 0.03,
      })),
    [connections]
  );

  const positions = useMemo(() => new Float32Array(particleMap.length * 3), [particleMap.length]);
  const colors = useMemo(() => new Float32Array(particleMap.length * 3), [particleMap.length]);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();

    particleMap.forEach((particle, index) => {
      const progress = (elapsed * particle.speed + particle.offset) % 1;
      const from = particle.connection.from;
      const to = particle.connection.to;
      const heightA = from.height * 0.72;
      const heightB = to.height * 0.72;
      positions[index * 3] = from.position[0] + (to.position[0] - from.position[0]) * progress;
      positions[index * 3 + 1] = heightA + (heightB - heightA) * progress + Math.sin(progress * Math.PI) * 0.05;
      positions[index * 3 + 2] = from.position[2] + (to.position[2] - from.position[2]) * progress;

      const emphasized =
        selectedSignalId && (from.id === selectedSignalId || to.id === selectedSignalId);
      const color = new THREE.Color(emphasized ? palette.signal : index % 3 === 0 ? palette.secondary : palette.primary);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    });

    if (particlesRef.current) {
      const geometry = particlesRef.current.geometry;
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    }
  });

  return (
    <Points ref={particlesRef} positions={positions} stride={3}>
      <PointMaterial transparent vertexColors size={0.07} sizeAttenuation depthWrite={false} />
    </Points>
  );
}

function GroundGrid() {
  const horizontalLines = useMemo(() => {
    const lines: [number, number, number][][] = [];
    for (let index = -10; index <= 10; index += 1) {
      lines.push([
        [-6, 0, index * 0.56],
        [6, 0, index * 0.56],
      ]);
      lines.push([
        [index * 0.56, 0, -5],
        [index * 0.56, 0, 5],
      ]);
    }
    return lines;
  }, []);

  return (
    <group rotation={[-0.42, 0, 0]} position={[0, -0.12, 1.3]}>
      {horizontalLines.map((points, index) => (
        <Line
          key={index}
          points={points as [number, number, number][]}
          color={index % 3 === 0 ? palette.primary : palette.secondary}
          transparent
          opacity={index % 3 === 0 ? 0.18 : 0.07}
          lineWidth={0.65}
        />
      ))}
    </group>
  );
}

function AtmosphericPoints() {
  const positions = useMemo(() => {
    const points = new Float32Array(220 * 3);
    for (let index = 0; index < 220; index += 1) {
      points[index * 3] = (Math.random() - 0.5) * 16;
      points[index * 3 + 1] = Math.random() * 3.5 + 0.2;
      points[index * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    return points;
  }, []);

  return (
    <Points positions={positions} stride={3}>
      <PointMaterial color={palette.primary} transparent opacity={0.22} size={0.03} sizeAttenuation depthWrite={false} />
    </Points>
  );
}

function CityScene({ onSignalHover, onSignalSelect, selectedSignalId }: CanvasProps) {
  const sceneRef = useRef<THREE.Group>(null);
  const { nodes, connections } = useMemo(() => buildCity(), []);

  useFrame(({ clock }) => {
    if (!sceneRef.current) return;
    sceneRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.12) * 0.08 - 0.25;
  });

  function handleHover(event: ThreeEvent<PointerEvent>, node: NodeData) {
    event.stopPropagation();
    onSignalHover?.({
      id: node.id,
      label: node.label,
      detail: node.detail,
      severity: node.severity,
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY,
    });
  }

  function handleLeave() {
    onSignalHover?.(null);
  }

  return (
    <group ref={sceneRef} position={[0, -1.35, 0]}>
      <GroundGrid />
      <CityConnections connections={connections} selectedSignalId={selectedSignalId} />
      <FlowParticles connections={connections} selectedSignalId={selectedSignalId} />
      <AtmosphericPoints />

      {nodes.map((node) => (
        <Building
          key={node.id}
          node={node}
          selected={selectedSignalId === node.id}
          onHover={handleHover}
          onLeave={handleLeave}
          onSelect={onSignalSelect ?? (() => undefined)}
        />
      ))}
    </group>
  );
}

export function NeuralCityCanvas({ onSignalHover, onSignalSelect, selectedSignalId }: CanvasProps) {
  return (
    <Canvas dpr={[1, 1.25]} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} className="absolute inset-0">
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.background, 6, 17]} />
      <PerspectiveCamera makeDefault position={[0, 3.4, 8.8]} fov={34} />
      <ambientLight intensity={0.5} color={palette.text} />
      <pointLight position={[0, 6, 0]} intensity={18} color={palette.primary} distance={18} decay={2} />
      <pointLight position={[3, 3, 2]} intensity={12} color={palette.signal} distance={10} decay={2} />
      <pointLight position={[-4, 2, 3]} intensity={9} color={palette.secondary} distance={9} decay={2} />
      <CityScene onSignalHover={onSignalHover} onSignalSelect={onSignalSelect} selectedSignalId={selectedSignalId} />
      <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={1.28} minPolarAngle={0.82} autoRotate autoRotateSpeed={0.16} />
    </Canvas>
  );
}
