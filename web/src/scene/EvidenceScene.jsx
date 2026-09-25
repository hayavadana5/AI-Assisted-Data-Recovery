import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

function CoreSphere() {
  const meshRef = useRef();
  const wireRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.15;
      meshRef.current.rotation.x = Math.sin(t * 0.1) * 0.1;
    }
    if (wireRef.current) {
      wireRef.current.rotation.y = -t * 0.1;
      wireRef.current.rotation.z = t * 0.05;
    }
  });

  return (
    <group>
      {/* Inner glowing core */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.2, 3]} />
        <MeshDistortMaterial
          color="#00e5ff"
          emissive="#00e5ff"
          emissiveIntensity={0.15}
          transparent
          opacity={0.25}
          distort={0.2}
          speed={1.5}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Wireframe outer shell */}
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[1.8, 1]} />
        <meshBasicMaterial
          color="#00e5ff"
          wireframe
          transparent
          opacity={0.08}
        />
      </mesh>

      {/* Second wireframe ring */}
      <mesh rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[2.2, 0.008, 16, 64]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.2} />
      </mesh>

      {/* Third ring */}
      <mesh rotation={[0, Math.PI / 4, Math.PI / 6]}>
        <torusGeometry args={[2.5, 0.005, 16, 64]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

function OrbitingNodes({ count = 5 }) {
  const groupRef = useRef();
  const nodeData = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * Math.PI * 2,
      radius: 2.8 + Math.random() * 0.4,
      speed: 0.15 + Math.random() * 0.1,
      y: (Math.random() - 0.5) * 0.8,
      size: 0.04 + Math.random() * 0.03,
      color: ['#00e5ff', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e'][i % 5],
    })),
    [count]
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const d = nodeData[i];
        child.position.x = Math.cos(d.angle + t * d.speed) * d.radius;
        child.position.z = Math.sin(d.angle + t * d.speed) * d.radius;
        child.position.y = d.y + Math.sin(t * 0.5 + i) * 0.15;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {nodeData.map((d, i) => (
        <mesh key={i}>
          <sphereGeometry args={[d.size, 8, 8]} />
          <meshBasicMaterial color={d.color} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function AmbientParticles() {
  return (
    <Sparkles
      count={40}
      scale={8}
      size={1.2}
      speed={0.3}
      opacity={0.3}
      color="#00e5ff"
    />
  );
}

export default function EvidenceScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 50 }}
      dpr={[1, 1.5]}
      style={{ background: 'transparent' }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={0.5} color="#00e5ff" />
      <pointLight position={[-5, -3, 3]} intensity={0.3} color="#8b5cf6" />

      <Float speed={1} rotationIntensity={0.1} floatIntensity={0.3}>
        <CoreSphere />
      </Float>

      <OrbitingNodes count={6} />
      <AmbientParticles />
    </Canvas>
  );
}
