import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import { BlendFunction, GlitchMode } from 'postprocessing';
import { VisualDNASystem, ActiveVisualState } from '../ai/visual-dna-system';
import { RealTimeAudioAnalyzer } from '../ai/audio-analyzer';
import { AIEnhancedControllerState } from '../types';

interface VisualDNAVisualizerProps {
  analyzer: RealTimeAudioAnalyzer;
  controllerState: AIEnhancedControllerState;
  audioLevel: number;
  spectralFeatures?: {
    brightness: number;
    bandwidth: number;
    rolloff: number;
  };
}

// Geometric shape component that responds to Visual DNA
function GeometricShape({ 
  visualState, 
  audioLevel, 
  index 
}: { 
  visualState: ActiveVisualState; 
  audioLevel: number; 
  index: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hue, setHue] = useState(0);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const profile = visualState.currentProfile;
    const complexity = profile.complexity;
    const reactivity = profile.reactivity;
    
    // Apply rotation based on profile behaviors
    const rotateBehavior = profile.visualElements.behaviors.find(b => b.name === 'rotate');
    if (rotateBehavior) {
      meshRef.current.rotation.x += rotateBehavior.intensity * 0.01 * complexity.movementSpeed;
      meshRef.current.rotation.y += rotateBehavior.intensity * 0.01 * complexity.movementSpeed;
    }
    
    // Apply pulse based on audio
    const pulseBehavior = profile.visualElements.behaviors.find(b => b.name === 'pulse');
    if (pulseBehavior) {
      const scale = 1 + (audioLevel * pulseBehavior.intensity * reactivity.bass);
      meshRef.current.scale.setScalar(scale);
    }
    
    // Update color based on palette
    const colors = visualState.currentProfile.colorPalette;
    const colorIndex = index % colors.highlights.length;
    const color = new THREE.Color(colors.highlights[colorIndex]);
    
    if (meshRef.current.material instanceof THREE.MeshBasicMaterial) {
      meshRef.current.material.color = color;
    }
    
    // Apply position oscillation
    const time = state.clock.getElapsedTime();
    meshRef.current.position.y = Math.sin(time * complexity.movementSpeed + index) * 2;
    
    setHue((hue + complexity.turbulence) % 360);
  });
  
  // Select geometry based on profile
  const getGeometry = () => {
    const shapes = visualState.currentProfile.visualElements.shapes;
    const shapeName = shapes[index % shapes.length];
    
    switch (shapeName) {
      case 'cube':
        return <boxGeometry args={[1, 1, 1]} />;
      case 'pyramid':
        return <coneGeometry args={[1, 1.5, 4]} />;
      case 'octahedron':
        return <octahedronGeometry args={[1]} />;
      case 'icosahedron':
        return <icosahedronGeometry args={[1]} />;
      case 'sphere':
        return <sphereGeometry args={[1, 32, 32]} />;
      default:
        return <boxGeometry args={[1, 1, 1]} />;
    }
  };
  
  return (
    <mesh ref={meshRef} position={[index * 2 - 5, 0, -5]}>
      {getGeometry()}
      <meshBasicMaterial 
        color={visualState.currentProfile.colorPalette.primary}
        wireframe={visualState.currentProfile.visualElements.type === 'geometric'}
      />
    </mesh>
  );
}

// Particle system component
function ParticleSystem({ visualState, audioLevel }: { visualState: ActiveVisualState; audioLevel: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = visualState.currentProfile.complexity.particleCount;
  
  // Create particle geometry
  const particles = React.useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      
      const color = new THREE.Color(
        visualState.currentProfile.colorPalette.highlights[
          Math.floor(Math.random() * visualState.currentProfile.colorPalette.highlights.length)
        ]
      );
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    return geometry;
  }, [particleCount, visualState.currentProfile.colorPalette]);
  
  useFrame((state) => {
    if (!particlesRef.current) return;
    
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.getElapsedTime();
    const complexity = visualState.currentProfile.complexity;
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Apply movement based on profile
      positions[i3] += Math.sin(time + i) * complexity.movementSpeed * 0.01;
      positions[i3 + 1] += Math.cos(time + i) * complexity.movementSpeed * 0.01 * audioLevel;
      positions[i3 + 2] += Math.sin(time + i * 0.5) * complexity.turbulence * 0.01;
      
      // Wrap around
      if (Math.abs(positions[i3]) > 10) positions[i3] *= -0.9;
      if (Math.abs(positions[i3 + 1]) > 10) positions[i3 + 1] *= -0.9;
      if (Math.abs(positions[i3 + 2]) > 10) positions[i3 + 2] *= -0.9;
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    particlesRef.current.rotation.y += complexity.movementSpeed * 0.001;
  });
  
  return (
    <points ref={particlesRef} geometry={particles}>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Background component that responds to Visual DNA
function DynamicBackground({ visualState }: { visualState: ActiveVisualState }) {
  const { scene } = useThree();
  
  useEffect(() => {
    const backgroundColor = new THREE.Color(visualState.currentProfile.colorPalette.background);
    scene.background = backgroundColor;
    
    // Apply fog based on profile
    if (visualState.currentProfile.moodTags.includes('dreamy') || 
        visualState.currentProfile.moodTags.includes('ethereal')) {
      scene.fog = new THREE.Fog(backgroundColor, 5, 20);
    } else {
      scene.fog = null;
    }
  }, [visualState.currentProfile, scene]);
  
  return null;
}

// Main visualizer component
export const VisualDNAVisualizer: React.FC<VisualDNAVisualizerProps> = ({
  analyzer,
  controllerState,
  audioLevel,
  spectralFeatures
}) => {
  const [visualDNA] = useState(() => new VisualDNASystem());
  const [visualState, setVisualState] = useState<ActiveVisualState>(visualDNA.getActiveState());
  const animationFrameRef = useRef<number | undefined>(undefined);
  
  useEffect(() => {
    // Connect systems
    visualDNA.connectSystems(analyzer, controllerState);
    
    // Animation loop
    const animate = () => {
      const newState = visualDNA.update(performance.now());
      setVisualState(newState);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [visualDNA, analyzer, controllerState]);
  
  // Get post-processing effects based on profile
  const getPostProcessingEffects = () => {
    const profile = visualState.currentProfile;
    const effects = [];
    
    // Bloom for energetic profiles
    if (profile.moodTags.includes('energetic') || profile.moodTags.includes('vibrant')) {
      effects.push(
        <Bloom
          key="bloom"
          intensity={profile.complexity.effectIntensity}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.9}
        />
      );
    }
    
    // Chromatic aberration for psychedelic profiles
    if (profile.moodTags.includes('trippy') || profile.moodTags.includes('psychedelic')) {
      // Chromatic aberration removed temporarily due to compatibility issues
      // Will add custom shader effect later
    }
    
    // Glitch for aggressive profiles
    if (profile.transitionStyle.type === 'glitch' || profile.moodTags.includes('chaotic')) {
      // Remove glitch for now as it has complex parameters
      // We'll add it back later with proper configuration
    }
    
    // Noise for gritty profiles
    if (profile.moodTags.includes('raw') || profile.moodTags.includes('dark')) {
      effects.push(
        <Noise
          key="noise"
          opacity={profile.complexity.effectIntensity * 0.1}
        />
      );
    }
    
    return effects;
  };
  
  return (
    <div className="visual-dna-visualizer" style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
        <DynamicBackground visualState={visualState} />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        {/* Render shapes based on profile */}
        {visualState.currentProfile.visualElements.dimension !== '2D' && 
          Array.from({ length: 5 }, (_, i) => (
            <GeometricShape 
              key={i} 
              visualState={visualState} 
              audioLevel={audioLevel} 
              index={i}
            />
          ))
        }
        
        {/* Particle system */}
        <ParticleSystem visualState={visualState} audioLevel={audioLevel} />
        
        {/* Post-processing effects */}
        <EffectComposer>
          {getPostProcessingEffects()}
        </EffectComposer>
      </Canvas>
      
      {/* Visual DNA Profile Info Overlay */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        color: visualState.currentProfile.colorPalette.primary,
        fontFamily: 'monospace',
        fontSize: '14px',
        textShadow: `0 0 10px ${visualState.currentProfile.colorPalette.accent}`,
        pointerEvents: 'none'
      }}>
        <div>Profile: {visualState.currentProfile.name}</div>
        <div>Energy: {(audioLevel * 100).toFixed(0)}%</div>
        {visualState.targetProfile && (
          <div>Transitioning to: {visualState.targetProfile.name} ({(visualState.interpolationProgress * 100).toFixed(0)}%)</div>
        )}
      </div>
    </div>
  );
}; 