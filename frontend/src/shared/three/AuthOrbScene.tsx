import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { prefersReducedMotion } from "@/shared/animations/gsapAnimations";

type AuthOrbSceneProps = {
  className?: string;
  colors?: AuthOrbColors;
};

export type AuthOrbColors = {
  glow: string;
  particle: string;
  primary: string;
  secondary: string;
  sphere: string;
  sphereEmissive: string;
};

const defaultColors: AuthOrbColors = {
  glow: "rgba(154, 244, 61, 0.22)",
  particle: "#B7FF3C",
  primary: "#9AF43D",
  secondary: "#22C55E",
  sphere: "#071006",
  sphereEmissive: "#9AF43D",
};

function AuthParticles({ color }: { color: string }) {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(54 * 3);

    for (let index = 0; index < values.length; index += 3) {
      const radius = 1.2 + Math.random() * 1.55;
      const angle = Math.random() * Math.PI * 2;
      values[index] = Math.cos(angle) * radius;
      values[index + 1] = (Math.random() - 0.5) * 2.2;
      values[index + 2] = Math.sin(angle) * radius;
    }

    return values;
  }, []);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y -= delta * 0.05;
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
        color={color}
        depthWrite={false}
        opacity={0.46}
        size={0.04}
        transparent
      />
    </points>
  );
}

function AuthOrb({ colors }: { colors: AuthOrbColors }) {
  const orbRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (orbRef.current) {
      orbRef.current.rotation.y += delta * 0.28;
      orbRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.16;
      ringRef.current.rotation.x =
        0.72 + Math.sin(state.clock.elapsedTime * 0.45) * 0.04;
    }
  });

  return (
    <group>
      <mesh ref={orbRef}>
        <sphereGeometry args={[0.88, 48, 48]} />
        <meshStandardMaterial
          color={colors.sphere}
          emissive={colors.sphereEmissive}
          emissiveIntensity={0.18}
          metalness={0.38}
          roughness={0.26}
        />
      </mesh>
      <group ref={ringRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.35, 0.018, 16, 96]} />
          <meshStandardMaterial
            color={colors.primary}
            emissive={colors.primary}
            emissiveIntensity={0.72}
          />
        </mesh>
        <mesh rotation={[1.15, 0.35, 0.5]}>
          <torusGeometry args={[1.68, 0.012, 16, 96]} />
          <meshStandardMaterial
            color={colors.secondary}
            emissive={colors.secondary}
            emissiveIntensity={0.42}
          />
        </mesh>
      </group>
    </group>
  );
}

export function AuthOrbScene({
  className = "",
  colors = defaultColors,
}: AuthOrbSceneProps) {
  if (prefersReducedMotion()) {
    return (
      <div
        className={`rounded-2xl ${className}`}
        style={{
          background: `radial-gradient(circle at 50% 45%, ${colors.glow}, transparent 42%), radial-gradient(circle at 50% 50%, ${colors.primary}33, ${colors.secondary}14 44%, rgba(255,255,255,0.035) 68%)`,
        }}
      />
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Canvas
        camera={{ fov: 44, position: [0, 0, 4.8] }}
        dpr={[1, 1.4]}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      >
        <ambientLight intensity={1.35} />
        <directionalLight intensity={2.15} position={[1.8, 3.6, 4.6]} />
        <pointLight color={colors.primary} intensity={4.8} position={[2, 1.6, 2.4]} />
        <pointLight color={colors.secondary} intensity={2.7} position={[-2.2, -1.5, 2]} />
        <AuthParticles color={colors.particle} />
        <AuthOrb colors={colors} />
      </Canvas>
    </div>
  );
}
