import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box } from '@react-three/drei';
import * as THREE from 'three';
import { DDJControllerState, VisualParams } from '../types';
import { VisualDNAOverlay } from './visual-dna-overlay';

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
  
  // Enhanced smoothed values with momentum and physics
  const smoothedValuesRef = useRef({
    volumeA: 127, // Start at max
    volumeB: 127, // Start at max
    scale: 1,
    scaleVelocity: 0,
    rotation: { x: 0, y: 0 },
    rotationVelocity: { x: 0, y: 0 },
    color: { h: 0, s: 0.8, l: 0.5 },
    colorVelocity: { h: 0, s: 0, l: 0 },
    emissive: 0,
    emissiveVelocity: 0,
    lastUpdateTime: 0
  });

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const currentTime = performance.now();
    const frameTime = Math.min(delta, 1/30); // Cap to 30fps equivalent for stability
    
    // Enhanced volume smoothing with different rates for rise/fall
    const volumeRiseRate = 0.15;  // Faster response to increases
    const volumeFallRate = 0.08;  // Slower decay for smoother feel
    
    const volumeADiff = controllerState.channelA.volume - smoothedValuesRef.current.volumeA;
    const volumeBDiff = controllerState.channelB.volume - smoothedValuesRef.current.volumeB;
    
    const volumeARate = volumeADiff > 0 ? volumeRiseRate : volumeFallRate;
    const volumeBRate = volumeBDiff > 0 ? volumeRiseRate : volumeFallRate;
    
    smoothedValuesRef.current.volumeA += volumeADiff * volumeARate;
    smoothedValuesRef.current.volumeB += volumeBDiff * volumeBRate;
    
    // Smooth BPM pulse with momentum
    const rawBeatPulse = 1 + Math.sin(bpmData.beatPhase * Math.PI * 2) * 0.3;
    const scaleA = smoothedValuesRef.current.volumeA / 127;
    const scaleB = smoothedValuesRef.current.volumeB / 127;
    const controllerScale = (scaleA + scaleB) / 2;
    
    // Target scale with dynamic response
    const targetScale = (0.5 + controllerScale * 1.5) * rawBeatPulse;
    
    // Physics-based scale animation with spring-damper system
    const scaleSpring = 12.0; // Spring strength
    const scaleDamping = 0.7;  // Damping factor
    
    const scaleForce = (targetScale - smoothedValuesRef.current.scale) * scaleSpring;
    smoothedValuesRef.current.scaleVelocity += scaleForce * frameTime;
    smoothedValuesRef.current.scaleVelocity *= Math.pow(scaleDamping, frameTime);
    smoothedValuesRef.current.scale += smoothedValuesRef.current.scaleVelocity * frameTime;
    
    meshRef.current.scale.setScalar(smoothedValuesRef.current.scale);

    // Smooth rotation with momentum
    const crossfaderNorm = controllerState.crossfader / 127;
    const targetRotationX = crossfaderNorm * frameTime * 2;
    const targetRotationY = (1 - crossfaderNorm) * frameTime * 2;
    
    // Add rotation with inertia
    smoothedValuesRef.current.rotationVelocity.x += (targetRotationX - smoothedValuesRef.current.rotationVelocity.x) * 0.1;
    smoothedValuesRef.current.rotationVelocity.y += (targetRotationY - smoothedValuesRef.current.rotationVelocity.y) * 0.1;
    
    meshRef.current.rotation.x += smoothedValuesRef.current.rotationVelocity.x;
    meshRef.current.rotation.y += smoothedValuesRef.current.rotationVelocity.y;

    // Smooth color transitions
    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    
    // Target color values
    const targetHue = ((controllerState.channelA.eq.high / 127) * 0.3 + (controllerState.channelB.eq.high / 127) * 0.7 + (bpmData.currentBPM - 60) / 140 * 0.2) % 1;
    const targetSaturation = Math.min(1, (controllerState.channelA.eq.mid + controllerState.channelB.eq.mid) / 254);
    const targetLightness = Math.min(1, 0.3 + (controllerState.channelA.eq.low + controllerState.channelB.eq.low) / 508);
    
    // Smooth color changes with momentum
    const colorSmoothing = 0.08;
    smoothedValuesRef.current.color.h += (targetHue - smoothedValuesRef.current.color.h) * colorSmoothing;
    smoothedValuesRef.current.color.s += (targetSaturation - smoothedValuesRef.current.color.s) * colorSmoothing;
    smoothedValuesRef.current.color.l += (targetLightness - smoothedValuesRef.current.color.l) * colorSmoothing;
    
    material.color.setHSL(
      smoothedValuesRef.current.color.h, 
      smoothedValuesRef.current.color.s, 
      smoothedValuesRef.current.color.l
    );

    // Smooth emissive glow with anticipation
    const rawBeatGlow = Math.pow(1 - bpmData.beatPhase, 3) * 0.3;
    const targetEmissive = rawBeatGlow;
    
    // Physics-based emissive with quick attack, slow decay
    const emissiveAttack = 0.25;
    const emissiveDecay = 0.15;
    const emissiveRate = targetEmissive > smoothedValuesRef.current.emissive ? emissiveAttack : emissiveDecay;
    
    smoothedValuesRef.current.emissive += (targetEmissive - smoothedValuesRef.current.emissive) * emissiveRate;
    material.emissive.setScalar(smoothedValuesRef.current.emissive);
    
    smoothedValuesRef.current.lastUpdateTime = currentTime;
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
  
  // Enhanced particle state with velocity and smoothing
  const particleStateRef = useRef({
    velocities: new Float32Array(particleCount * 3),
    lastPositions: new Float32Array(particleCount * 3),
    smoothedBeatPhase: 0,
    smoothedEnergy: 0,
    lastUpdateTime: 0
  });

  // Create particle positions
  const positions = React.useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      
      // Initialize velocities
      particleStateRef.current.velocities[i * 3] = 0;
      particleStateRef.current.velocities[i * 3 + 1] = 0;
      particleStateRef.current.velocities[i * 3 + 2] = 0;
      
      // Initialize last positions
      particleStateRef.current.lastPositions[i * 3] = positions[i * 3];
      particleStateRef.current.lastPositions[i * 3 + 1] = positions[i * 3 + 1];
      particleStateRef.current.lastPositions[i * 3 + 2] = positions[i * 3 + 2];
    }
    return positions;
  }, []);

  useFrame((state, delta) => {
    if (!particlesRef.current) return;

    const frameTime = Math.min(delta, 1/30); // Cap frame time for stability
    const currentTime = performance.now();
    
    // Get active pads
    const activePads = controllerState.performancePads.pads.filter(pad => pad.isPressed);
    
    // Smooth beat phase and energy for fluid motion
    const targetBeatPhase = bpmData.beatPhase;
    const channelEnergy = (controllerState.channelA.volume + controllerState.channelB.volume) / 254;
    
    particleStateRef.current.smoothedBeatPhase += (targetBeatPhase - particleStateRef.current.smoothedBeatPhase) * 0.15;
    particleStateRef.current.smoothedEnergy += (channelEnergy - particleStateRef.current.smoothedEnergy) * 0.1;
    
    // Enhanced movement calculations
    const bpmSpeed = (bpmData.currentBPM / 120) * 0.008; // Slightly reduced for smoothness
    const beatPulse = Math.sin(particleStateRef.current.smoothedBeatPhase * Math.PI * 2) * 0.015;
    const energyMultiplier = 0.5 + particleStateRef.current.smoothedEnergy * 1.5;
    
    // Animate particles with physics-based movement
    const geometry = particlesRef.current.geometry;
    const positions = geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Calculate forces
      const baseForceX = Math.sin(state.clock.elapsedTime * 0.5 + i * 0.01) * bpmSpeed * energyMultiplier;
      const baseForceY = Math.cos(state.clock.elapsedTime * 0.5 + i * 0.01) * bpmSpeed * energyMultiplier;
      const baseForceZ = Math.sin(state.clock.elapsedTime * 0.3 + i * 0.005) * bpmSpeed * energyMultiplier;
      
      // Beat-synchronized pulsing forces
      const beatForceX = beatPulse * Math.sin(i * 0.1) * energyMultiplier;
      const beatForceY = beatPulse * Math.cos(i * 0.1) * energyMultiplier;
      const beatForceZ = beatPulse * Math.sin(i * 0.05) * energyMultiplier;
      
      // Controller pad forces
      let padForceX = 0, padForceY = 0, padForceZ = 0;
      activePads.forEach((pad) => {
        const intensity = (pad.velocity / 127) * 0.03;
        const padPhase = state.clock.elapsedTime * 2 + pad.id * 0.1;
        padForceX += Math.sin(padPhase + i * 0.01) * intensity;
        padForceY += Math.cos(padPhase + i * 0.01) * intensity;
        padForceZ += Math.sin(padPhase * 1.5 + i * 0.005) * intensity;
      });
      
      // Apply forces to velocities with damping
      const damping = 0.95;
      particleStateRef.current.velocities[i3] = (particleStateRef.current.velocities[i3] + baseForceX + beatForceX + padForceX) * damping;
      particleStateRef.current.velocities[i3 + 1] = (particleStateRef.current.velocities[i3 + 1] + baseForceY + beatForceY + padForceY) * damping;
      particleStateRef.current.velocities[i3 + 2] = (particleStateRef.current.velocities[i3 + 2] + baseForceZ + beatForceZ + padForceZ) * damping;
      
      // Update positions with velocity
      positions[i3] += particleStateRef.current.velocities[i3];
      positions[i3 + 1] += particleStateRef.current.velocities[i3 + 1];
      positions[i3 + 2] += particleStateRef.current.velocities[i3 + 2];
      
      // Boundary wrapping with smooth transition
      const boundarySize = 10;
      for (let j = 0; j < 3; j++) {
        const pos = positions[i3 + j];
        if (pos > boundarySize) {
          positions[i3 + j] = -boundarySize + (pos - boundarySize) * 0.1;
          particleStateRef.current.velocities[i3 + j] *= 0.5; // Reduce velocity on wrap
        } else if (pos < -boundarySize) {
          positions[i3 + j] = boundarySize + (pos + boundarySize) * 0.1;
          particleStateRef.current.velocities[i3 + j] *= 0.5;
        }
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
    particleStateRef.current.lastUpdateTime = currentTime;
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
  
  // Enhanced smoothing state for EQ bars
  const eqStateRef = useRef({
    channelA: { low: 64, mid: 64, high: 64 },
    channelB: { low: 64, mid: 64, high: 64 },
    scales: [1, 1, 1, 1, 1, 1], // 6 bars total
    scaleVelocities: [0, 0, 0, 0, 0, 0],
    colors: [
      { h: 0, s: 0.8, l: 0.5 },
      { h: 0.1, s: 0.8, l: 0.5 },
      { h: 0.2, s: 0.8, l: 0.5 },
      { h: 0.6, s: 0.8, l: 0.5 },
      { h: 0.7, s: 0.8, l: 0.5 },
      { h: 0.8, s: 0.8, l: 0.5 }
    ],
    emissiveValues: [0, 0, 0, 0, 0, 0],
    smoothedBeatPhase: 0
  });

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const frameTime = Math.min(delta, 1/30);
    
    // Smooth beat phase for consistent timing
    eqStateRef.current.smoothedBeatPhase += (bpmData.beatPhase - eqStateRef.current.smoothedBeatPhase) * 0.2;
    
    // Enhanced smoothing for EQ values
    const smoothingRate = 0.12; // Balanced responsiveness
    
    // Update smoothed EQ values
    eqStateRef.current.channelA.low += (controllerState.channelA.eq.low - eqStateRef.current.channelA.low) * smoothingRate;
    eqStateRef.current.channelA.mid += (controllerState.channelA.eq.mid - eqStateRef.current.channelA.mid) * smoothingRate;
    eqStateRef.current.channelA.high += (controllerState.channelA.eq.high - eqStateRef.current.channelA.high) * smoothingRate;
    
    eqStateRef.current.channelB.low += (controllerState.channelB.eq.low - eqStateRef.current.channelB.low) * smoothingRate;
    eqStateRef.current.channelB.mid += (controllerState.channelB.eq.mid - eqStateRef.current.channelB.mid) * smoothingRate;
    eqStateRef.current.channelB.high += (controllerState.channelB.eq.high - eqStateRef.current.channelB.high) * smoothingRate;

    // Smooth beat pulse and flash
    const beatPulse = 1 + Math.sin(eqStateRef.current.smoothedBeatPhase * Math.PI * 2) * 0.15;
    const beatFlash = Math.pow(1 - eqStateRef.current.smoothedBeatPhase, 4) * 0.4;

    // Process all bars with physics-based scaling
    const eqValues = [
      eqStateRef.current.channelA.low / 127,
      eqStateRef.current.channelA.mid / 127, 
      eqStateRef.current.channelA.high / 127,
      eqStateRef.current.channelB.low / 127,
      eqStateRef.current.channelB.mid / 127,
      eqStateRef.current.channelB.high / 127
    ];

    groupRef.current.children.forEach((bar, index) => {
      if (index >= 6) return; // Only process first 6 bars
      
      const mesh = bar as THREE.Mesh;
      const material = mesh.material as THREE.MeshStandardMaterial;
      
      // Target scale with beat pulse
      const baseHeight = 0.15 + eqValues[index] * 2.2;
      const targetScale = baseHeight * beatPulse;
      
      // Physics-based scaling with spring system
      const scaleSpring = 15.0;
      const scaleDamping = 0.8;
      
      const scaleForce = (targetScale - eqStateRef.current.scales[index]) * scaleSpring;
      eqStateRef.current.scaleVelocities[index] += scaleForce * frameTime;
      eqStateRef.current.scaleVelocities[index] *= Math.pow(scaleDamping, frameTime);
      eqStateRef.current.scales[index] += eqStateRef.current.scaleVelocities[index] * frameTime;
      
      // Apply scale
      mesh.scale.y = Math.max(0.1, eqStateRef.current.scales[index]);
      
      // Smooth color transitions
      const isChannelA = index < 3;
      const barIndex = index % 3;
      const targetHue = isChannelA ? barIndex * 0.25 : 0.6 + barIndex * 0.08;
      
      eqStateRef.current.colors[index].h += (targetHue - eqStateRef.current.colors[index].h) * 0.05;
      
      material.color.setHSL(
        eqStateRef.current.colors[index].h,
        eqStateRef.current.colors[index].s,
        eqStateRef.current.colors[index].l
      );
      
      // Smooth emissive glow
      const targetEmissive = beatFlash * eqValues[index] * 0.8;
      eqStateRef.current.emissiveValues[index] += (targetEmissive - eqStateRef.current.emissiveValues[index]) * 0.2;
      material.emissive.setScalar(eqStateRef.current.emissiveValues[index]);
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
  visualDNAEnabled?: boolean;
}

export default function VisualizerScene({ controllerState, visualParams, bpmData, visualDNAEnabled = false }: VisualizerSceneProps) {
  const [audioLevel, setAudioLevel] = useState(0);

  // Simulate audio level from MIDI controls for Visual DNA
  React.useEffect(() => {
    if (!visualDNAEnabled) return;
    
    const interval = setInterval(() => {
      // Calculate audio level from controller state
      const channelAVolume = controllerState.channelA.volume / 127;
      const channelBVolume = controllerState.channelB.volume / 127;
      const crossfaderPos = controllerState.crossfader / 127;
      
      // Mix channels based on crossfader
      const mixedVolume = (channelAVolume * (1 - crossfaderPos)) + (channelBVolume * crossfaderPos);
      
      setAudioLevel(mixedVolume * 0.8 + Math.random() * 0.2); // Add some variation
    }, 50);

    return () => clearInterval(interval);
  }, [controllerState, visualDNAEnabled]);

  return (
    <div style={{ width: '100%', height: '100vh', background: '#0a0a0a', position: 'relative' }}>
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
      
      {/* Visual DNA Overlay */}
      {visualDNAEnabled && (
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          pointerEvents: 'none',
          mixBlendMode: 'screen' 
        }}>
          <VisualDNAOverlay
            controllerState={controllerState}
            audioLevel={audioLevel}
            spectralFeatures={null} // No spectral features in basic mode
            isAIMode={false}
          />
        </div>
      )}
    </div>
  );
} 