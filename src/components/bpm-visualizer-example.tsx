import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import useMIDIBPM from '../hooks/useMIDIBPM';

// BPM-driven pulsing sphere
function BPMSphere() {
  const { currentBPM, beatPhase } = useMIDIBPM();
  const sphereRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!sphereRef.current) return;

    // Pulse with the beat - scale based on beat phase
    const pulseScale = 1 + Math.sin(beatPhase * Math.PI * 2) * 0.5;
    sphereRef.current.scale.setScalar(pulseScale);

    // Change color based on BPM
    const material = sphereRef.current.material as THREE.MeshStandardMaterial;
    const hue = (currentBPM - 60) / 140; // Map 60-200 BPM to 0-1 hue range
    material.color.setHSL(hue, 0.8, 0.6);

    // Rotate faster with higher BPM
    const rotationSpeed = (currentBPM / 120) * 0.02;
    sphereRef.current.rotation.y += rotationSpeed;
  });

  return (
    <Sphere ref={sphereRef} args={[1, 32, 32]} position={[0, 0, 0]}>
      <meshStandardMaterial 
        color="#4ecdc4"
        metalness={0.3}
        roughness={0.4}
      />
    </Sphere>
  );
}

// BPM display text
function BPMDisplay() {
  const { currentBPM, isConnected, beatPhase, clocksReceived, lastBeatTime } = useMIDIBPM();

  return (
    <>
      <Text
        position={[0, 3.5, 0]}
        fontSize={0.8}
        color={isConnected ? "#2ed573" : "#ff4757"}
        anchorX="center"
        anchorY="middle"
      >
        {isConnected ? `BPM: ${currentBPM.toFixed(1)}` : "MIDI Disconnected"}
      </Text>
      
      <Text
        position={[0, 2.5, 0]}
        fontSize={0.4}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        Beat Phase: {(beatPhase * 100).toFixed(0)}%
      </Text>
      
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.3}
        color="#ffa502"
        anchorX="center"
        anchorY="middle"
      >
        Tap 4 times to set new tempo
      </Text>
      
      <Text
        position={[0, 0.5, 0]}
        fontSize={0.25}
        color="#a4b0be"
        anchorX="center"
        anchorY="middle"
      >
        Notes: 150, 99, 127 + Cue Ch1/Ch2 | 3s gap resets sequence
      </Text>
    </>
  );
}

// Beat-synced cubes that flash on the beat
function BeatCubes() {
  const { beatPhase } = useMIDIBPM();
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;

    // Flash intensity based on beat phase
    // const flashIntensity = Math.pow(1 - beatPhase, 3); // Sharp flash at start of beat
    
    groupRef.current.children.forEach((cube, index) => {
      const mesh = cube as THREE.Mesh;
      const material = mesh.material as THREE.MeshStandardMaterial;
      
      // Different cubes flash at different beat subdivisions
      const subdivision = Math.pow(2, index); // 1, 2, 4, 8 beats
      const phaseOffset = (beatPhase * subdivision) % 1;
      const cubeFlash = Math.pow(1 - phaseOffset, 4);
      
      material.emissive.setScalar(cubeFlash);
      mesh.scale.setScalar(1 + cubeFlash * 0.3);
    });
  });

  return (
    <group ref={groupRef}>
      <Box args={[0.5, 0.5, 0.5]} position={[-3, -2, 0]}>
        <meshStandardMaterial color="#ff6b6b" />
      </Box>
      <Box args={[0.5, 0.5, 0.5]} position={[-1, -2, 0]}>
        <meshStandardMaterial color="#4ecdc4" />
      </Box>
      <Box args={[0.5, 0.5, 0.5]} position={[1, -2, 0]}>
        <meshStandardMaterial color="#45b7d1" />
      </Box>
      <Box args={[0.5, 0.5, 0.5]} position={[3, -2, 0]}>
        <meshStandardMaterial color="#f9ca24" />
      </Box>
    </group>
  );
}

// Circular beat indicator
function BeatCircle() {
  const { beatPhase } = useMIDIBPM();
  const circleRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!circleRef.current) return;

    // Rotate to show beat progress
    circleRef.current.rotation.z = -beatPhase * Math.PI * 2;
  });

  return (
    <group position={[5, 2, 0]}>
      {/* Background circle */}
      <mesh>
        <ringGeometry args={[0.7, 0.8, 32]} />
        <meshBasicMaterial color="#333333" transparent opacity={0.3} />
      </mesh>
      
      {/* Progress indicator */}
      <mesh ref={circleRef}>
        <ringGeometry args={[0.7, 0.8, 32, 1, 0, Math.PI * 2 * 0.1]} />
        <meshBasicMaterial color="#2ed573" />
      </mesh>
      
      {/* Center dot */}
      <mesh>
        <circleGeometry args={[0.1, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

// Main BPM visualizer component
export default function BPMVisualizerExample() {
  return (
    <div style={{ width: '100%', height: '100vh', background: '#0a0a0a' }}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 75 }}
        style={{ background: 'linear-gradient(to bottom, #1a1a2e, #16213e)' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -5, -10]} intensity={0.5} color="#ff6b6b" />
        
        {/* BPM-driven components */}
        <BPMSphere />
        <BPMDisplay />
        <BeatCubes />
        <BeatCircle />
        
        {/* Camera controls */}
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={20}
        />
      </Canvas>
      
      {/* Debug info overlay */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '12px',
        background: 'rgba(0,0,0,0.8)',
        padding: '15px',
        borderRadius: '8px',
        maxWidth: '300px',
        lineHeight: '1.4'
      }}>
        <div style={{ color: '#4ecdc4', fontWeight: 'bold', marginBottom: '8px' }}>
          🎵 BPM Detection Help
        </div>
        <div style={{ marginBottom: '6px' }}>
          <strong>If BPM stuck at 120.0:</strong>
        </div>
        <div style={{ fontSize: '11px', marginBottom: '4px' }}>
          • Open F12 → Console to see MIDI messages
        </div>
        <div style={{ fontSize: '11px', marginBottom: '4px' }}>
          • <strong>BPM Tap Notes:</strong> 150, 99, 127 + Cue Ch1/Ch2
        </div>
        <div style={{ fontSize: '11px', marginBottom: '4px' }}>
          • <strong>New Tempo:</strong> Tap 4 times in rhythm
        </div>
        <div style={{ fontSize: '11px', marginBottom: '4px' }}>
          • <strong>Auto-Reset:</strong> 3+ second gap starts fresh
        </div>
        <div style={{ fontSize: '11px', marginBottom: '8px' }}>
          • Won't interfere with track playback controls
        </div>
        <div style={{ color: '#ffa502', fontSize: '11px' }}>
          💡 Wait 3 seconds, then tap 4x for new tempo!
        </div>
      </div>
    </div>
  );
} 