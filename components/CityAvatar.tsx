'use client';

import { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Preload, ContactShadows, Text, Billboard } from '@react-three/drei';
import type { CityPulse } from '@/lib/types';
import * as THREE from 'three';

interface CityAvatarProps {
  pulse: CityPulse;
  theme: 'dark' | 'light';
  onFocusNeighborhoodsChange: (names: string[]) => void;
}


function CityModel({ pulse, theme, onFocusNeighborhoodsChange }: CityAvatarProps) {

  const group = useRef<THREE.Group>(null);
  const [hoveredNeighborhood, setHoveredNeighborhood] = useState<string | null>(null);
  
  const allNeighborhoods = useMemo(
    () => Object.entries(pulse.neighborhoods),
    [pulse],
  );

  // Auto-rotate the city slowly
  useFrame(() => {
    if (group.current) {
      group.current.rotation.y += 0.001;
    }
  });

  // Calculate coords mapping (NYC Center rough approximation)
  const centerLat = 40.74;
  const centerLon = -73.95;
  const scale = 20;

  return (
    <group ref={group}>
      {/* Base Platform */}
      <mesh receiveShadow position={[0, -0.5, 0]}>
        <cylinderGeometry args={[4, 4, 0.2, 64]} />
        <meshPhysicalMaterial 
          color={theme === 'dark' ? '#0a0f18' : '#e0dbcf'} 
          transmission={0.3} 
          roughness={0.6} 
          metalness={0.8}
          thickness={1.5}
        />
        <lineSegments>
          <edgesGeometry args={[new THREE.CylinderGeometry(4, 4, 0.2, 64)]} />
          <lineBasicMaterial color="#ffffff" transparent opacity={0.1} />
        </lineSegments>
      </mesh>
      
      {/* City Buildings mapped to geo layout */}
      {allNeighborhoods.map(([name, neighborhood]) => {
        const x = (neighborhood.lon - centerLon) * scale;
        const z = -(neighborhood.lat - centerLat) * scale; // negative lat -> negative Z -> away from camera
        
        // Height based on stress
        const height = 0.5 + (neighborhood.stress / 40);
        
        // Color mapping synchronized with 2D map
        const s = neighborhood.stress;
        let color = '#00ff9d'; // Calm Green
        if (s >= 80) color = '#ff3b3b';      // Danger Red
        else if (s >= 60) color = '#ff6600'; // Stressed Orange
        else if (s >= 35) color = '#ffcc00'; // Tense Yellow
        
        const isHighStress = s >= 60;
        const isGood = s < 35;

        
        return (
          <group key={name} position={[x, 0, z]}>
            <mesh 
              position={[0, height / 2 - 0.4, 0]} 
              castShadow
              onClick={(e) => {
                e.stopPropagation();
                onFocusNeighborhoodsChange([name]);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
                setHoveredNeighborhood(name);
              }}
              onPointerOut={(e) => {
                document.body.style.cursor = 'auto';
                setHoveredNeighborhood(null);
              }}

            >
              <boxGeometry args={[0.35, height, 0.35]} />
              <meshPhysicalMaterial 
                color={color}
                emissive={color}
                emissiveIntensity={0.2}
                metalness={0.5}
                roughness={0.2}
                clearcoat={1.0}
              />
            </mesh>
            
            {/* Label floating above the building, always facing camera */}
            {(isHighStress || hoveredNeighborhood === name) && (
              <Billboard follow={true} lockX={false} lockY={false} lockZ={false} position={[0, height - 0.1, 0]}>
                <Text
                  position={[0, 0, 0]}
                  fontSize={0.2}
                  color={theme === 'dark' ? "#ffffff" : "#1c1c1c"}
                  anchorX="center"
                  anchorY="bottom"
                  outlineWidth={0.03}
                  outlineColor={theme === 'dark' ? "#000000" : "#ffffff"}

                  letterSpacing={0.06}
                >
                  {name.toUpperCase()}
                </Text>
                <Text
                  position={[0, -0.25, 0]}
                  fontSize={0.14}
                  color={color}

                  anchorX="center"
                  anchorY="bottom"
                  outlineWidth={0.02}
                  outlineColor="#000000"
                  letterSpacing={0.05}
                >
                  {neighborhood.stress}/100
                </Text>
              </Billboard>
            )}

          </group>
        );
      })}
    </group>
  );
}

export function CityAvatar({ pulse, theme, onFocusNeighborhoodsChange }: CityAvatarProps) {
  return (
    <section className="cityAvatarShell" style={{ background: 'var(--panel)', border: '1px solid var(--panel-border)', borderRadius: '10px', overflow: 'hidden' }} aria-label="Interactive city avatar">

      <div className="cityAvatarStage" style={{ height: '300px', width: '100%', position: 'relative' }}>
        <Canvas shadows camera={{ position: [0, 6, 8], fov: 50 }}>
          <ambientLight intensity={theme === 'dark' ? 0.6 : 1.2} />

          <spotLight position={[10, 15, 10]} angle={0.25} penumbra={1} castShadow intensity={theme === 'dark' ? 3 : 1.5} color="#ffffff" shadow-bias={-0.0001} />
          <pointLight position={[-10, 5, -10]} intensity={theme === 'dark' ? 1.5 : 0.8} color={theme === 'dark' ? "#00f0ff" : "#ffccaa"} />
          
          <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.2}>
            <CityModel pulse={pulse} theme={theme} onFocusNeighborhoodsChange={onFocusNeighborhoodsChange} />
          </Float>


          <ContactShadows position={[0, -1.2, 0]} opacity={0.6} scale={12} blur={3} far={4} color="#000000" />
          <Environment preset="night" />
          <OrbitControls 
            enablePan={false} 
            enableZoom={true} 
            minPolarAngle={Math.PI / 6} 
            maxPolarAngle={Math.PI / 2.1} 
            target={[0, 0, 0]}
          />
          <Preload all />
        </Canvas>
        <div className="cityOrbLabel" style={{ position: 'absolute', bottom: 12, width: '100%', textAlign: 'center', pointerEvents: 'none' }}>
           NYC 3D Topology Map · {pulse.mood} right now · click to focus
        </div>
      </div>
    </section>
  );
}
