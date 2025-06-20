import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box } from '@react-three/drei';
import * as THREE from 'three';
import { DDJControllerState, VisualParams } from '../types';

interface MainCubeProps {
  controllerState: DDJControllerState;
  visualParams: VisualParams;
  bpmData: {
    currentBPM: number;
    isConnected: boolean;
    beatPhase: number;
    beatInterval: number;
  };
}

// Main reactive cube that responds to crossfader, EQ, AND BPM
function MainCube({ controllerState, visualParams, bpmData }: MainCubeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Add smoothed values for volume to prevent glitching
  const smoothedValuesRef = useRef({
    volumeA: 127, // Start at max
    volumeB: 127, // Start at max
  });

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Rotation based on crossfader position (controller input)
    const crossfaderNorm = controllerState.crossfader / 127;
    meshRef.current.rotation.x += delta * crossfaderNorm;
    meshRef.current.rotation.y += delta * (1 - crossfaderNorm);

    // BPM-based pulsing scale
    const beatPulse = 1 + Math.sin(bpmData.beatPhase * Math.PI * 2) * 0.3;
    
    // Smooth the volume values to prevent glitching
    // This preserves the full 0-127 range but dampens rapid changes
    const smoothingFactor = 0.1; // Adjust this value to control smoothing (0.1 = very smooth, 0.5 = more responsive)
    
    smoothedValuesRef.current.volumeA += (controllerState.channelA.volume - smoothedValuesRef.current.volumeA) * smoothingFactor;
    smoothedValuesRef.current.volumeB += (controllerState.channelB.volume - smoothedValuesRef.current.volumeB) * smoothingFactor;
    
    // Use smoothed values for visual calculations
    const scaleA = smoothedValuesRef.current.volumeA / 127;
    const scaleB = smoothedValuesRef.current.volumeB / 127;
    const controllerScale = (scaleA + scaleB) / 2;
    
    // Combine BPM pulse with controller volume
    const finalScale = (0.5 + controllerScale * 1.5) * beatPulse;
    meshRef.current.scale.setScalar(finalScale);

    // Color based on EQ settings + BPM
    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    const baseHue = (controllerState.channelA.eq.high / 127) * 0.3 + (controllerState.channelB.eq.high / 127) * 0.7;
    const bpmHueShift = (bpmData.currentBPM - 60) / 140 * 0.2; // Slight BPM-based hue shift
    const hue = (baseHue + bpmHueShift) % 1;
    
    const saturation = (controllerState.channelA.eq.mid + controllerState.channelB.eq.mid) / 254;
    const lightness = 0.3 + (controllerState.channelA.eq.low + controllerState.channelB.eq.low) / 508;
    
    material.color.setHSL(hue, saturation, lightness);

    // BPM-based emissive glow on beat
    const beatGlow = Math.pow(1 - bpmData.beatPhase, 3) * 0.3; // Flash at beat start
    material.emissive.setScalar(beatGlow);
  });

  return (
    <Box
      ref={meshRef}
      args={[2, 2, 2]}
      position={[0, 0, 0]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <meshStandardMaterial 
        color={hovered ? "#ff6b6b" : "#4ecdc4"}
        wireframe={false}
        metalness={0.6}
        roughness={0.2}
      />
    </Box>
  );
}

// Particles system that responds to performance pads AND BPM
interface ParticleSystemProps {
  controllerState: DDJControllerState;
  bpmData: {
    currentBPM: number;
    isConnected: boolean;
    beatPhase: number;
    beatInterval: number;
  };
}

function ParticleSystem({ controllerState, bpmData }: ParticleSystemProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 1000;

  // Create particle positions
  const positions = React.useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return positions;
  }, []);

  useFrame((state, delta) => {
    if (!particlesRef.current) return;

    // Get active pads
    const activePads = controllerState.performancePads.pads.filter(pad => pad.isPressed);
    
    // BPM-based movement speed and intensity
    const bpmSpeed = (bpmData.currentBPM / 120) * 0.01; // Faster movement with higher BPM
    const beatPulse = Math.sin(bpmData.beatPhase * Math.PI * 2) * 0.02; // Pulse with beat
    
    // Animate particles based on active pads AND BPM
    const geometry = particlesRef.current.geometry;
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Base rotation synced to BPM
      positions[i3] += Math.sin(state.clock.elapsedTime + i) * bpmSpeed;
      positions[i3 + 1] += Math.cos(state.clock.elapsedTime + i) * bpmSpeed;
      
      // Beat-synchronized pulsing movement
      positions[i3] += beatPulse * Math.sin(i * 0.1);
      positions[i3 + 1] += beatPulse * Math.cos(i * 0.1);
      positions[i3 + 2] += beatPulse * Math.sin(i * 0.05);
      
      // Additional movement based on active pads
      activePads.forEach((pad) => {
        const intensity = pad.velocity / 127;
        positions[i3] += Math.sin(state.clock.elapsedTime * 2 + pad.id) * intensity * 0.05;
        positions[i3 + 1] += Math.cos(state.clock.elapsedTime * 2 + pad.id) * intensity * 0.05;
        positions[i3 + 2] += Math.sin(state.clock.elapsedTime * 3 + pad.id) * intensity * 0.05;
      });
    }
    
    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={particleCount}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#ffffff"
        transparent={true}
        opacity={0.6}
        sizeAttenuation={true}
      />
    </points>
  );
}

// EQ Visualization bars with BPM sync
interface EQVisualizerProps {
  controllerState: DDJControllerState;
  bpmData: {
    currentBPM: number;
    isConnected: boolean;
    beatPhase: number;
    beatInterval: number;
  };
}

function EQVisualizer({ controllerState, bpmData }: EQVisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;

    // BPM-based effects
    const beatPulse = 1 + Math.sin(bpmData.beatPhase * Math.PI * 2) * 0.2; // Pulse with beat
    const beatFlash = Math.pow(1 - bpmData.beatPhase, 4) * 0.5; // Flash at beat start

    // Channel A EQ bars with BPM sync
    const childrenA = groupRef.current.children.slice(0, 3);
    const eqValuesA = [
      controllerState.channelA.eq.low / 127,
      controllerState.channelA.eq.mid / 127,
      controllerState.channelA.eq.high / 127
    ];

    childrenA.forEach((bar, index) => {
      const mesh = bar as THREE.Mesh;
      // Combine EQ value with beat pulse
      const baseHeight = 0.1 + eqValuesA[index] * 2;
      mesh.scale.y = baseHeight * beatPulse;
      
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.color.setHSL(index * 0.3, 0.8, 0.5);
      
      // Add beat flash emissive glow
      material.emissive.setScalar(beatFlash * eqValuesA[index]);
    });

    // Channel B EQ bars with BPM sync
    const childrenB = groupRef.current.children.slice(3, 6);
    const eqValuesB = [
      controllerState.channelB.eq.low / 127,
      controllerState.channelB.eq.mid / 127,
      controllerState.channelB.eq.high / 127
    ];

    childrenB.forEach((bar, index) => {
      const mesh = bar as THREE.Mesh;
      // Combine EQ value with beat pulse
      const baseHeight = 0.1 + eqValuesB[index] * 2;
      mesh.scale.y = baseHeight * beatPulse;
      
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.color.setHSL(0.6 + index * 0.1, 0.8, 0.5);
      
      // Add beat flash emissive glow
      material.emissive.setScalar(beatFlash * eqValuesB[index]);
    });
  });

  return (
    <group ref={groupRef}>
      {/* Channel A EQ bars */}
      <Box args={[0.3, 1, 0.3]} position={[-4, 0, 0]}>
        <meshStandardMaterial color="#ff4757" />
      </Box>
      <Box args={[0.3, 1, 0.3]} position={[-3, 0, 0]}>
        <meshStandardMaterial color="#ffa502" />
      </Box>
      <Box args={[0.3, 1, 0.3]} position={[-2, 0, 0]}>
        <meshStandardMaterial color="#fffa65" />
      </Box>
      
      {/* Channel B EQ bars */}
      <Box args={[0.3, 1, 0.3]} position={[2, 0, 0]}>
        <meshStandardMaterial color="#3742fa" />
      </Box>
      <Box args={[0.3, 1, 0.3]} position={[3, 0, 0]}>
        <meshStandardMaterial color="#5352ed" />
      </Box>
      <Box args={[0.3, 1, 0.3]} position={[4, 0, 0]}>
        <meshStandardMaterial color="#a4b0be" />
      </Box>
    </group>
  );
}



// Combined BPM + Controller status indicator
interface CombinedStatusIndicatorProps {
  controllerConnected: boolean;
  bpmData: {
    currentBPM: number;
    isConnected: boolean;
    beatPhase: number;
  };
}

function CombinedStatusIndicator({ controllerConnected, bpmData }: CombinedStatusIndicatorProps) {
  return (
    <>
      <Text
        position={[0, 4, 0]}
        fontSize={0.5}
        color={controllerConnected ? "#2ed573" : "#ff4757"}
        anchorX="center"
        anchorY="middle"
      >
        {controllerConnected ? "🎛️ DDJ-FLX4 Connected" : "🔌 DDJ-FLX4 Disconnected"}
      </Text>
      
      <Text
        position={[0, 3.3, 0]}
        fontSize={0.4}
        color={bpmData.isConnected ? "#2ed573" : "#ffa502"}
        anchorX="center"
        anchorY="middle"
      >
        BPM: {bpmData.currentBPM.toFixed(1)} | Phase: {(bpmData.beatPhase * 100).toFixed(0)}%
      </Text>
    </>
  );
}

// Main scene component - now with combined BPM + Controller functionality
interface VisualizerSceneProps {
  controllerState: DDJControllerState;
  visualParams: VisualParams;
  bpmData: {
    currentBPM: number;
    isConnected: boolean;
    beatPhase: number;
    beatInterval: number;
  };
}

export default function VisualizerScene({ controllerState, visualParams, bpmData }: VisualizerSceneProps) {
  // BPM data is now passed as a prop to avoid multiple hook instances

  return (
    <div style={{ width: '100%', height: '100vh', background: '#0a0a0a' }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 75 }}
        style={{ background: 'linear-gradient(to bottom, #1e3c72, #2a5298)' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.4} color="#ff6b6b" />
        
        {/* Main visualizer components - now with BPM + Controller data */}
        <MainCube controllerState={controllerState} visualParams={visualParams} bpmData={bpmData} />
        <ParticleSystem controllerState={controllerState} bpmData={bpmData} />
        <EQVisualizer controllerState={controllerState} bpmData={bpmData} />
        <CombinedStatusIndicator 
          controllerConnected={controllerState.isConnected} 
          bpmData={bpmData} 
        />
        
        {/* Camera controls */}
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={3}
          maxDistance={20}
        />
      </Canvas>
    </div>
  );
} 