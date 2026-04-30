import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { prefersReducedMotion } from "@/shared/animations/gsapAnimations";

type FitnessHeroSceneProps = {
  className?: string;
};

const green = "#22C55E";
const greenSoft = "#86EFAC";
const greenDeep = "#064E3B";
const graphite = "#11161A";
const graphiteRaised = "#1A2227";
const white = "#F8FAFC";

function DataField() {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(120 * 3);

    for (let index = 0; index < values.length; index += 3) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.25 + Math.random() * 2.4;
      values[index] = Math.cos(angle) * radius;
      values[index + 1] = Math.random() * 3.7 - 1.65;
      values[index + 2] = Math.sin(angle) * radius * 0.22 - 0.45;
    }

    return values;
  }, []);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.028;
      pointsRef.current.rotation.z += delta * 0.006;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          args={[positions, 3]}
          attach="attributes-position"
          count={positions.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={greenSoft}
        depthWrite={false}
        opacity={0.3}
        size={0.03}
        transparent
      />
    </points>
  );
}

function EnergyRing({
  opacity,
  radius,
  rotation,
  speed,
}: {
  opacity: number;
  radius: number;
  rotation: [number, number, number];
  speed: number;
}) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * speed;
      ringRef.current.rotation.x += delta * speed * 0.18;
    }
  });

  return (
    <mesh ref={ringRef} rotation={rotation}>
      <torusGeometry args={[radius, 0.018, 18, 180]} />
      <meshStandardMaterial
        color={green}
        emissive={green}
        emissiveIntensity={0.5}
        opacity={opacity}
        transparent
      />
    </mesh>
  );
}

function PulseRibbon() {
  const ribbonRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const points = [
      new THREE.Vector3(-1.55, -0.04, 0.24),
      new THREE.Vector3(-1.08, -0.04, 0.24),
      new THREE.Vector3(-0.86, 0.23, 0.24),
      new THREE.Vector3(-0.58, -0.4, 0.24),
      new THREE.Vector3(-0.21, 0.45, 0.24),
      new THREE.Vector3(0.16, -0.16, 0.24),
      new THREE.Vector3(0.46, -0.16, 0.24),
      new THREE.Vector3(0.72, 0.12, 0.24),
      new THREE.Vector3(1.1, -0.04, 0.24),
      new THREE.Vector3(1.55, -0.04, 0.24),
    ];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 80, 0.014, 10, false);
  }, []);

  useFrame((state) => {
    if (ribbonRef.current) {
      ribbonRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.4) * 0.03;
    }
  });

  return (
    <mesh ref={ribbonRef} geometry={geometry}>
      <meshStandardMaterial color={greenSoft} emissive={greenSoft} emissiveIntensity={0.45} transparent opacity={0.86} />
    </mesh>
  );
}

function MetricChip({
  active = false,
  position,
  rotation = [0, 0, 0],
  width = 0.82,
}: {
  active?: boolean;
  position: [number, number, number];
  rotation?: [number, number, number];
  width?: number;
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[width, 0.42, 0.04]} />
        <meshStandardMaterial
          color={active ? "#13261C" : "#10161A"}
          emissive={active ? green : greenDeep}
          emissiveIntensity={active ? 0.08 : 0.035}
          metalness={0.22}
          roughness={0.42}
          transparent
          opacity={0.94}
        />
      </mesh>
      <mesh position={[-width * 0.28, 0.07, 0.028]}>
        <boxGeometry args={[width * 0.34, 0.035, 0.018]} />
        <meshBasicMaterial color={active ? greenSoft : "#94A3B8"} />
      </mesh>
      <mesh position={[width * 0.06, -0.08, 0.028]}>
        <boxGeometry args={[width * 0.56, 0.035, 0.018]} />
        <meshBasicMaterial color={active ? green : "#475569"} />
      </mesh>
      <mesh position={[-width * 0.42, -0.08, 0.034]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshBasicMaterial color={active ? green : "#64748B"} />
      </mesh>
    </group>
  );
}

function CoreNode({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const nodeRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (nodeRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2.2 + position[0]) * 0.06;
      nodeRef.current.scale.setScalar(scale * pulse);
    }
  });

  return (
    <group ref={nodeRef} position={position}>
      <mesh>
        <sphereGeometry args={[0.075, 24, 24]} />
        <meshStandardMaterial color={white} emissive={green} emissiveIntensity={0.72} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshBasicMaterial color={green} opacity={0.12} transparent />
      </mesh>
    </group>
  );
}

function FitnessCore() {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.34) * 0.14;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.82) * 0.045;
    }

    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.22;
      coreRef.current.rotation.x += delta * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.04, 0]} scale={1.06}>
      <mesh position={[0, -1.48, -0.16]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.62, 1.86, 0.075, 110]} />
        <meshStandardMaterial
          color="#0E1316"
          emissive={green}
          emissiveIntensity={0.045}
          metalness={0.42}
          roughness={0.45}
        />
      </mesh>
      <mesh position={[0, -1.42, -0.16]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.62, 0.014, 16, 160]} />
        <meshStandardMaterial color={green} emissive={green} emissiveIntensity={0.46} />
      </mesh>

      <mesh ref={coreRef} position={[0, 0.16, 0]}>
        <icosahedronGeometry args={[0.58, 3]} />
        <meshStandardMaterial
          color={graphiteRaised}
          emissive={green}
          emissiveIntensity={0.22}
          metalness={0.54}
          roughness={0.18}
          wireframe={false}
        />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <sphereGeometry args={[0.92, 40, 40]} />
        <meshBasicMaterial color={green} opacity={0.075} transparent />
      </mesh>

      <EnergyRing opacity={0.58} radius={1.05} rotation={[1.22, 0.22, -0.18]} speed={0.42} />
      <EnergyRing opacity={0.34} radius={1.48} rotation={[0.92, -0.58, 0.38]} speed={-0.24} />
      <EnergyRing opacity={0.24} radius={1.88} rotation={[1.38, 0.08, 0.86]} speed={0.18} />

      <PulseRibbon />

      <CoreNode position={[-0.9, 0.72, 0.22]} />
      <CoreNode position={[0.92, 0.68, 0.14]} scale={0.92} />
      <CoreNode position={[-1.06, -0.58, 0.12]} scale={0.82} />
      <CoreNode position={[1.12, -0.46, 0.18]} scale={0.82} />
      <CoreNode position={[0, 1.18, 0.08]} scale={0.86} />

      <MetricChip active position={[-1.74, 0.68, -0.24]} rotation={[0, 0.22, 0.04]} width={0.9} />
      <MetricChip position={[1.78, 0.1, -0.28]} rotation={[0, -0.24, -0.03]} width={0.82} />
      <MetricChip active position={[-1.35, -0.98, -0.18]} rotation={[0, 0.18, -0.04]} width={0.74} />
      <MetricChip position={[1.28, -0.92, -0.2]} rotation={[0, -0.18, 0.05]} width={0.72} />
    </group>
  );
}

function FallbackVisual({ className = "" }: FitnessHeroSceneProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[2rem] border border-primary/18 bg-[radial-gradient(circle_at_50%_42%,hsl(var(--primary)/0.08),transparent_32%),linear-gradient(145deg,rgba(255,255,255,0.045),rgba(255,255,255,0.016))] ${className}`}
    >
      <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/25 bg-primary/[0.055]" />
      <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/15" />
      <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-3xl bg-gradient-to-br from-white/80 to-primary/80 shadow-soft-panel" />
    </div>
  );
}

export function FitnessHeroScene({ className = "" }: FitnessHeroSceneProps) {
  if (prefersReducedMotion()) {
    return <FallbackVisual className={className} />;
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Canvas
        camera={{ fov: 36, position: [0, 0.08, 6.55] }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      >
        <ambientLight intensity={0.72} />
        <directionalLight color="#ffffff" intensity={1.35} position={[3.2, 4, 4.8]} />
        <pointLight color={green} intensity={5.8} position={[2.3, 1.7, 2.6]} />
        <pointLight color={greenSoft} intensity={2.1} position={[-2.6, -1.2, 2]} />
        <DataField />
        <FitnessCore />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,transparent,rgba(7,8,8,0.04)_68%,rgba(7,8,8,0.12)_100%)]" />
    </div>
  );
}
