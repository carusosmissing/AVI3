import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import { BlendFunction, GlitchMode } from 'postprocessing';
import { Box } from '@react-three/drei';
import { VisualDNASystem, ActiveVisualState } from '../ai/visual-dna-system';
import { RealTimeAudioAnalyzer } from '../ai/audio-analyzer';
import { AIEnhancedControllerState, DDJControllerState, VisualParams } from '../types';
import { VisualDNAProfileSelector } from './visual-dna-profile-selector';
import { EnhancedParticleSystem } from './enhanced-particle-system';

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

// Main reactive cube that responds to crossfader, EQ, AND BPM - copied from basic visualizer
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
    
    // Separate volume-based scaling from BPM pulse
    const scaleA = smoothedValuesRef.current.volumeA / 127;
    const scaleB = smoothedValuesRef.current.volumeB / 127;
    const controllerScale = (scaleA + scaleB) / 2;
    
    // Volume-based target scale (smooth scaling based on volume only)
    const targetScale = 0.5 + controllerScale * 1.5;
    
    // Physics-based scale animation with spring-damper system
    const scaleSpring = 8.0; // Slightly slower for smoother volume response
    const scaleDamping = 0.8;  // More damping for smoother feel
    
    const scaleForce = (targetScale - smoothedValuesRef.current.scale) * scaleSpring;
    smoothedValuesRef.current.scaleVelocity += scaleForce * frameTime;
    smoothedValuesRef.current.scaleVelocity *= Math.pow(scaleDamping, frameTime);
    smoothedValuesRef.current.scale += smoothedValuesRef.current.scaleVelocity * frameTime;
    
    // Apply base scale from volume
    meshRef.current.scale.setScalar(smoothedValuesRef.current.scale);
    
    // BPM pulse effect applied as subtle scale modulation
    const beatPulse = 1 + Math.sin(bpmData.beatPhase * Math.PI * 2) * 0.15; // Reduced intensity
    meshRef.current.scale.multiplyScalar(beatPulse);

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

    // Load the logo texture
  const logoTexture = React.useMemo(() => {
    const loader = new THREE.TextureLoader();
    const texture = loader.load('/wicked-craniums-logo-2048.png');
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }, []);

  return (
    <Box
      ref={meshRef}
      args={[2, 2, 2]}
      position={[0, 0, -45]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <meshStandardMaterial 
        map={logoTexture}
        color={hovered ? "#ff6b6b" : "#ffffff"}
        wireframe={false}
        metalness={0.3}
        roughness={0.4}
        transparent={true}
        opacity={0.9}
      />
    </Box>
  );
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
    
    // Apply pulse based on audio - ensure minimum visibility
    const pulseBehavior = profile.visualElements.behaviors.find(b => b.name === 'pulse');
    if (pulseBehavior) {
      // Ensure audioLevel is clamped between 0 and 1
      const clampedAudio = Math.max(0, Math.min(1, audioLevel));
      // Always maintain a minimum scale of 0.5 for visibility
      const minScale = 0.5;
      const maxScale = 1.2;
      const scale = minScale + (clampedAudio * pulseBehavior.intensity * reactivity.bass * (maxScale - minScale));
      meshRef.current.scale.setScalar(scale);
    } else {
      // Default scale if no pulse behavior
      meshRef.current.scale.setScalar(0.8);
    }
    
    // Update color based on palette
    const colors = visualState.currentProfile.colorPalette;
    const colorIndex = index % colors.highlights.length;
    const color = new THREE.Color(colors.highlights[colorIndex]);
    
    if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
      meshRef.current.material.color = color;
      // Ensure some emissive glow even without audio
      meshRef.current.material.emissiveIntensity = 0.2 + (audioLevel * 0.3);
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
  
  // Load logo texture for geometric shapes
  const logoTexture = React.useMemo(() => {
    const loader = new THREE.TextureLoader();
    const texture = loader.load('/wicked-craniums-logo-2048.png');
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }, []);

  return (
    <mesh ref={meshRef} position={[index * 2 - 5, 0, -5]}>
      {getGeometry()}
      <meshStandardMaterial 
        map={logoTexture}
        color={visualState.currentProfile.colorPalette.primary}
        wireframe={visualState.currentProfile.visualElements.type === 'geometric'}
        emissive={visualState.currentProfile.colorPalette.accent}
        emissiveIntensity={0.2 + (audioLevel * 0.3)}
        metalness={0.3}
        roughness={0.4}
        transparent={true}
        opacity={0.9}
      />
    </mesh>
  );
}

// Particle system component
function ParticleSystem({ visualState, audioLevel }: { visualState: ActiveVisualState; audioLevel: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = Math.min(visualState.currentProfile.complexity.particleCount, 5000); // Cap particle count
  
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
  
  // Store initial positions
  const initialPositions = React.useRef<Float32Array | null>(null);
  
  useFrame((state) => {
    if (!particlesRef.current) return;
    
    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    
    // Store initial positions on first frame
    if (!initialPositions.current) {
      initialPositions.current = new Float32Array(positions);
    }
    
    const time = state.clock.getElapsedTime();
    const complexity = visualState.currentProfile.complexity;
    
    // Use a minimum movement factor to keep particles moving even without audio
    const minMovement = 0.3;
    const movementFactor = minMovement + (Math.max(0, audioLevel) * (1 - minMovement));
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Use initial positions as base and add oscillation
      const baseX = initialPositions.current[i3];
      const baseY = initialPositions.current[i3 + 1];
      const baseZ = initialPositions.current[i3 + 2];
      
      // Apply movement as oscillation around initial position
      positions[i3] = baseX + Math.sin(time * complexity.movementSpeed * 0.5 + i) * movementFactor * 2;
      positions[i3 + 1] = baseY + Math.cos(time * complexity.movementSpeed * 0.3 + i) * movementFactor * 2;
      positions[i3 + 2] = baseZ + Math.sin(time * complexity.turbulence * 0.2 + i * 0.5) * movementFactor;
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    particlesRef.current.rotation.y = time * complexity.movementSpeed * 0.1;
  });
  
  return (
    <points ref={particlesRef} geometry={particles}>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.6 + (audioLevel * 0.2)}
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
    // Animation loop with manual controller state processing
    const animate = () => {
      // Process controller state for genre hints (if it's a regular controller state)
      if ('channelA' in controllerState && 'channelB' in controllerState) {
        const avgHigh = (controllerState.channelA.eq.high + controllerState.channelB.eq.high) / 254;
        const avgMid = (controllerState.channelA.eq.mid + controllerState.channelB.eq.mid) / 254;
        const avgLow = (controllerState.channelA.eq.low + controllerState.channelB.eq.low) / 254;
        
        // Simple genre detection based on EQ
        let detectedGenre = 'electronic';
        if (avgLow > 0.7 && avgHigh < 0.5) detectedGenre = 'hip-hop';
        else if (avgHigh > 0.7 && avgLow < 0.5) detectedGenre = 'trance';
        else if (avgMid > 0.7) detectedGenre = 'house';
        else if (avgLow > 0.8) detectedGenre = 'dubstep';
        
        // Manually update the Visual DNA system based on audio features
        const energy = audioLevel || 0.5;
        const features = spectralFeatures || { brightness: 2000, bandwidth: 1000, rolloff: 4000 };
        
        // Try to connect systems if analyzer is available
        if (analyzer) {
          try {
            visualDNA.connectSystems(analyzer, controllerState);
          } catch (e) {
            console.log('Using simplified Visual DNA mode');
          }
        }
      }
      
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
  }, [visualDNA, analyzer, controllerState, audioLevel, spectralFeatures]);
  
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
  
  // Create dynamic BPM data for the MainCube
  const [beatPhase, setBeatPhase] = useState(0);
  
  useEffect(() => {
    const bpm = 120; // Default BPM
    const interval = setInterval(() => {
      setBeatPhase(prev => (prev + 0.05) % 1); // Update beat phase over time
    }, (60000 / bpm) / 20); // 20 updates per beat
    
    return () => clearInterval(interval);
  }, []);
  
  const mockBPMData = React.useMemo(() => ({
    currentBPM: 120, // Default BPM
    isConnected: true,
    beatPhase: beatPhase,
    beatInterval: 60000 / 120 // 120 BPM interval
  }), [beatPhase]);

  const mockVisualParams = React.useMemo(() => ({
    // Add any required visual params here
  }), []);

  return (
    <div className="visual-dna-visualizer" style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
        <DynamicBackground visualState={visualState} />
        
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} color={visualState.currentProfile.colorPalette.primary} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color={visualState.currentProfile.colorPalette.accent} />
        <spotLight 
          position={[0, 10, 0]} 
          angle={0.5} 
          penumbra={0.5} 
          intensity={audioLevel} 
          color={visualState.currentProfile.colorPalette.highlights[0] || '#ffffff'}
        />
        
        {/* Main Cube in the center */}
        {controllerState.channelA && controllerState.channelB && (
          <MainCube 
            controllerState={controllerState as DDJControllerState}
            visualParams={mockVisualParams as VisualParams}
            bpmData={mockBPMData}
          />
        )}
        
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
        
        {/* Enhanced Particle system */}
        <EnhancedParticleSystem 
          audioData={{
            audioLevel: audioLevel,
            spectralFeatures: spectralFeatures ? {
              bass: ((controllerState.channelA?.eq?.low || 0) + (controllerState.channelB?.eq?.low || 0)) / 254,
              mid: ((controllerState.channelA?.eq?.mid || 0) + (controllerState.channelB?.eq?.mid || 0)) / 254,
              high: ((controllerState.channelA?.eq?.high || 0) + (controllerState.channelB?.eq?.high || 0)) / 254,
              brightness: spectralFeatures.brightness,
              bandwidth: spectralFeatures.bandwidth
            } : undefined,
            beatDetection: {
              isBeat: Math.sin(beatPhase * Math.PI * 2) > 0.8,
              beatStrength: audioLevel * 0.8,
              beatPhase: beatPhase
            }
          }}
          visualDNAProfile={{
            id: visualState.currentProfile.id,
            name: visualState.currentProfile.name,
            visualElements: visualState.currentProfile.visualElements,
            complexity: visualState.currentProfile.complexity,
            moodTags: visualState.currentProfile.moodTags,
            genreAffinity: visualState.currentProfile.genreAffinity,
            reactivity: visualState.currentProfile.reactivity
          }}
          maxParticles={Math.min(visualState.currentProfile.complexity.particleCount, 2000)}
          enableLOD={true}
        />
        
        {/* Post-processing effects - temporarily disabled due to compatibility issues */}
        {/* <EffectComposer>
          {getPostProcessingEffects()}
        </EffectComposer> */}
      </Canvas>
      
      {/* Profile Selector UI */}
      <VisualDNAProfileSelector 
        visualDNA={visualDNA}
        currentProfileId={visualState.currentProfile.id}
      />
      
      {/* Visual DNA Profile Info Overlay */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 300, // Moved to avoid overlap with selector
        color: visualState.currentProfile.colorPalette.primary,
        fontFamily: 'monospace',
        fontSize: '14px',
        textShadow: `0 0 10px ${visualState.currentProfile.colorPalette.accent}`,
        pointerEvents: 'none',
        background: 'rgba(0,0,0,0.7)',
        padding: '10px',
        borderRadius: '5px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
          🧬 {visualState.currentProfile.name} 
          {visualDNA.isManualMode() && (
            <span style={{ color: '#ffa502', fontSize: '12px', marginLeft: '10px' }}>[Manual]</span>
          )}
        </div>
        <div>Audio: {audioLevel > 0 ? `${(audioLevel * 100).toFixed(0)}%` : '❌ No Audio'}</div>
        <div>Crossfader: {controllerState.crossfader !== undefined ? controllerState.crossfader : 'N/A'}</div>
        <div>Channel A: Vol {controllerState.channelA?.volume || 0} | EQ {controllerState.channelA?.eq?.low || 0}/{controllerState.channelA?.eq?.mid || 0}/{controllerState.channelA?.eq?.high || 0}</div>
        <div>Channel B: Vol {controllerState.channelB?.volume || 0} | EQ {controllerState.channelB?.eq?.low || 0}/{controllerState.channelB?.eq?.mid || 0}/{controllerState.channelB?.eq?.high || 0}</div>
        <div style={{ fontSize: '10px', marginTop: '5px', color: '#888' }}>
          {audioLevel === 0 && '⚠️ Check audio input panel →'}
        </div>
        {visualState.targetProfile && (
          <div>Transitioning to: {visualState.targetProfile.name} ({(visualState.interpolationProgress * 100).toFixed(0)}%)</div>
        )}
      </div>
    </div>
  );
}; 