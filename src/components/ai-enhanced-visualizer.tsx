import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import { BlendFunction, GlitchMode } from 'postprocessing';
import { Box } from '@react-three/drei';
import { VisualDNASystem, ActiveVisualState } from '../ai/visual-dna-system';
import { DDJControllerState, VisualParams, Track } from '../types';
import { VisualDNAProfileSelector } from './visual-dna-profile-selector';
import TrackIdentificationPanel from './track-identification-panel';
import useAIAudioAnalyzer from '../hooks/useAIAudioAnalyzer';



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
    
    // Removed excessive debug logging
    
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

  return (
    <mesh ref={meshRef} position={[index * 2 - 5, 0, -5]}>
      {getGeometry()}
      <meshStandardMaterial 
        color={visualState.currentProfile.colorPalette.primary}
        wireframe={visualState.currentProfile.visualElements.type === 'geometric'}
        emissive={visualState.currentProfile.colorPalette.accent}
        emissiveIntensity={0.2 + (audioLevel * 0.3)}
        metalness={0.3}
        roughness={0.4}
      />
    </mesh>
  );
}

// Particle system component
function ParticleSystem({ visualState, audioLevel }: { visualState: ActiveVisualState; audioLevel: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = Math.min(visualState.currentProfile.complexity.particleCount, 5000); // Cap particle count
  const [currentProfileId, setCurrentProfileId] = useState(visualState.currentProfile.id);

  // Create particle geometry
  const particles = React.useMemo(() => {
    // Creating particles for profile: ${visualState.currentProfile.id}
    
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    // Generate particle positions based on profile type
    const profileType = visualState.currentProfile.visualElements.type;
    const profileDimension = visualState.currentProfile.visualElements.dimension;
    
    for (let i = 0; i < particleCount; i++) {
      // Position particles differently based on profile
      if (profileType === 'geometric') {
        // More structured positioning for geometric profiles
        positions[i * 3] = (Math.random() - 0.5) * 15;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
      } else if (profileType === 'organic') {
        // More organic, flowing positioning
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 10;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 2] = Math.sin(angle) * radius;
      } else {
        // Hybrid - mix of both
        positions[i * 3] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      }
      
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
    
    setCurrentProfileId(visualState.currentProfile.id);
    return geometry;
  }, [particleCount, visualState.currentProfile.id, visualState.currentProfile.colorPalette, visualState.currentProfile.visualElements]);
  
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

  // Calculate material properties based on profile
  const profile = visualState.currentProfile;
  const materialSize = profile.complexity.geometryDetail * 0.15; // Size based on detail level
  const materialOpacity = 0.4 + (audioLevel * 0.4) + (profile.complexity.effectIntensity * 0.2);
  
  // Use additive blending for all profiles for now (to avoid type issues)
  const blendingMode = THREE.AdditiveBlending;

  return (
    <points ref={particlesRef} geometry={particles}>
      <pointsMaterial
        key={`${profile.id}-material`} // Force material recreation on profile change
        size={materialSize}
        vertexColors
        transparent
        opacity={Math.min(1, materialOpacity)}
        blending={blendingMode}
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

// Collapsible Section Component
function CollapsibleSection({ title, children, defaultOpen = false }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: '15px' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '6px',
          border: '1px solid #444',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#00ffff',
          marginBottom: '8px',
          userSelect: 'none'
        }}
      >
        <span>{title}</span>
        <span style={{ 
          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }}>
          ▶
        </span>
      </div>
      {isOpen && (
        <div style={{
          padding: '12px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '6px',
          border: '1px solid #333'
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

// Main visualizer component
interface AIEnhancedVisualizerProps {
  controller: any; // Base DDJFlx4Controller
  controllerState: any;
  visualParams: any;
  identificationTracks?: any[];
  onTrackIdentification?: (result: any) => void;
  visualDNAEnabled?: boolean;
}

export default function AIEnhancedVisualizer({
  controller,
  controllerState,
  visualParams,
  identificationTracks,
  onTrackIdentification,
  visualDNAEnabled = false
}: AIEnhancedVisualizerProps) {
  const [visualDNA] = useState(() => new VisualDNASystem());
  const [visualState, setVisualState] = useState<ActiveVisualState>(visualDNA.getActiveState());
  const animationFrameRef = useRef<number | undefined>(undefined);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // AI Audio Analysis Hook
  const aiAnalysis = useAIAudioAnalyzer(controller, undefined);
  
  // Use real audio level from AI analysis or simulate from MIDI
  React.useEffect(() => {
    if (aiAnalysis.audioInput.isListening && aiAnalysis.audioInput.audioLevel > 0) {
      // Use real audio level
      setAudioLevel(aiAnalysis.audioInput.audioLevel);
    } else {
      // Simulate from MIDI controls
      if (controllerState?.channelA && controllerState?.channelB) {
        const channelAVolume = controllerState.channelA.volume / 127;
        const channelBVolume = controllerState.channelB.volume / 127;
        const crossfaderPos = controllerState.crossfader / 127;
        
        // Mix channels based on crossfader
        const mixedVolume = (channelAVolume * (1 - crossfaderPos)) + (channelBVolume * crossfaderPos);
        
        setAudioLevel(mixedVolume * 0.8 + Math.random() * 0.2); // Add some variation
      }
    }
  }, [aiAnalysis.audioInput.audioLevel, aiAnalysis.audioInput.isListening, controllerState]);

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
      }
      
      const newState = visualDNA.update(performance.now());
      
      // Check if profile has changed
      if (newState.currentProfile.id !== visualState.currentProfile.id) {
        console.log('🧬 Profile changed from', visualState.currentProfile.id, 'to', newState.currentProfile.id);
      }
      
      // Force state update by creating a new object reference
      // This ensures React properly detects the change and re-renders components
      setVisualState({
        ...newState,
        currentProfile: { ...newState.currentProfile },
        targetProfile: newState.targetProfile ? { ...newState.targetProfile } : null
      });
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [visualDNA, controllerState, audioLevel]);
  
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
    <div className="ai-enhanced-visualizer" style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
        <DynamicBackground 
          key={`${visualState.currentProfile.id}-background`}
          visualState={visualState} 
        />
        
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
              key={`${visualState.currentProfile.id}-shape-${i}`} 
              visualState={visualState} 
              audioLevel={audioLevel} 
              index={i}
            />
          ))
        }
        
        {/* Particle system */}
        <ParticleSystem 
          key={`${visualState.currentProfile.id}-particles`}
          visualState={visualState} 
          audioLevel={audioLevel} 
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
      
      {/* Combined Audio Input & AI Analysis Panel */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '420px',
        maxHeight: '85vh',
        overflowY: 'auto',
        background: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '15px',
        borderRadius: '12px',
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        border: '2px solid #333',
        zIndex: 1000
      }}>
        {/* Audio Input Controls at the top */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '15px',
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            🎤 Audio Input Control
            <div style={{
              marginLeft: 'auto',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: aiAnalysis.audioInput.isConnected ? '#2ed573' : '#ff4757'
            }} />
          </div>

          {/* Audio Level Display */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span>Audio Level:</span>
              <span style={{ 
                color: Math.round(aiAnalysis.audioInput.audioLevel * 100) >= 70 ? '#ff4757' : 
                      Math.round(aiAnalysis.audioInput.audioLevel * 100) >= 40 ? '#2ed573' : 
                      Math.round(aiAnalysis.audioInput.audioLevel * 100) >= 20 ? '#ffa502' : '#ff6b6b',
                fontWeight: 'bold',
                fontSize: '16px'
              }}>
                {Math.round(aiAnalysis.audioInput.audioLevel * 100)}%
              </span>
            </div>
            
            {/* Audio Level Bar */}
            <div style={{
              width: '100%',
              height: '20px',
              backgroundColor: '#2c2c2c',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '1px solid #444'
            }}>
              <div style={{
                width: `${Math.min(100, Math.round(aiAnalysis.audioInput.audioLevel * 100))}%`,
                height: '100%',
                backgroundColor: Math.round(aiAnalysis.audioInput.audioLevel * 100) >= 70 ? '#ff4757' : 
                                Math.round(aiAnalysis.audioInput.audioLevel * 100) >= 40 ? '#2ed573' : 
                                Math.round(aiAnalysis.audioInput.audioLevel * 100) >= 20 ? '#ffa502' : '#ff6b6b',
                transition: 'all 0.1s ease',
                borderRadius: '10px'
              }} />
            </div>
            
            {Math.round(aiAnalysis.audioInput.audioLevel * 100) < 20 && (
              <div style={{ 
                color: '#ffa502', 
                fontSize: '12px', 
                marginTop: '5px',
                fontStyle: 'italic'
              }}>
                ⚠️ Audio level too low - try adjusting gain settings below
              </div>
            )}
          </div>

          {/* Input Gain Control */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: '8px'
            }}>
              <span>Input Gain:</span>
              <span style={{ color: '#00d2d3', fontWeight: 'bold' }}>{aiAnalysis.audioInput.inputGain.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="20"
              step="0.1"
              value={aiAnalysis.audioInput.inputGain}
              onChange={(e) => aiAnalysis.audioInput.setInputGain(parseFloat(e.target.value))}
              style={{
                width: '100%',
                height: '12px',
                borderRadius: '6px',
                background: `linear-gradient(to right, #00d2d3 0%, #00d2d3 ${(aiAnalysis.audioInput.inputGain / 20) * 100}%, #2c2c2c ${(aiAnalysis.audioInput.inputGain / 20) * 100}%, #2c2c2c 100%)`,
                outline: 'none',
                cursor: 'pointer',
                WebkitAppearance: 'none',
                appearance: 'none',
                border: '2px solid #444'
              }}
            />
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '11px', 
              color: '#999',
              marginTop: '2px'
            }}>
              <span>0.1x</span>
              <span>20x</span>
            </div>
            <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '11px', color: '#999' }}>Manual:</span>
              <input
                type="number"
                min="0.1"
                max="20"
                step="0.1"
                value={aiAnalysis.audioInput.inputGain}
                onChange={(e) => aiAnalysis.audioInput.setInputGain(Math.max(0.1, Math.min(20, parseFloat(e.target.value) || 0.1)))}
                style={{
                  width: '60px',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  border: '1px solid #444',
                  backgroundColor: '#333',
                  color: 'white',
                  fontSize: '11px'
                }}
              />
              <span style={{ fontSize: '11px', color: '#999' }}>x</span>
            </div>
          </div>

          {/* Sensitivity Control */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: '8px'
            }}>
              <span>Sensitivity:</span>
              <span style={{ color: '#00d2d3', fontWeight: 'bold' }}>{aiAnalysis.audioInput.sensitivity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="10"
              step="0.1"
              value={aiAnalysis.audioInput.sensitivity}
              onChange={(e) => aiAnalysis.audioInput.setSensitivity(parseFloat(e.target.value))}
              style={{
                width: '100%',
                height: '12px',
                borderRadius: '6px',
                background: `linear-gradient(to right, #ffa502 0%, #ffa502 ${(aiAnalysis.audioInput.sensitivity / 10) * 100}%, #2c2c2c ${(aiAnalysis.audioInput.sensitivity / 10) * 100}%, #2c2c2c 100%)`,
                outline: 'none',
                cursor: 'pointer',
                WebkitAppearance: 'none',
                appearance: 'none',
                border: '2px solid #444'
              }}
            />
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '11px', 
              color: '#999',
              marginTop: '2px'
            }}>
              <span>0.1x</span>
              <span>10x</span>
            </div>
            <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '11px', color: '#999' }}>Manual:</span>
              <input
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={aiAnalysis.audioInput.sensitivity}
                onChange={(e) => aiAnalysis.audioInput.setSensitivity(Math.max(0.1, Math.min(10, parseFloat(e.target.value) || 0.1)))}
                style={{
                  width: '60px',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  border: '1px solid #444',
                  backgroundColor: '#333',
                  color: 'white',
                  fontSize: '11px'
                }}
              />
              <span style={{ fontSize: '11px', color: '#999' }}>x</span>
            </div>
          </div>

          {/* Device Selection */}
          <div style={{ marginBottom: '15px' }}>
            <div style={{ marginBottom: '8px' }}>Input Device:</div>
            <select
              value={aiAnalysis.audioInput.selectedDeviceId || ''}
              onChange={(e) => aiAnalysis.audioInput.selectDevice(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #444',
                backgroundColor: '#2c2c2c',
                color: 'white',
                fontSize: '13px',
                outline: 'none'
              }}
            >
              <option value="">Default Device</option>
              {aiAnalysis.audioInput.availableDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Device ${device.deviceId.substring(0, 8)}...`}
                </option>
              ))}
            </select>
            <button
              onClick={aiAnalysis.audioInput.refreshDevices}
              style={{
                marginTop: '5px',
                padding: '4px 8px',
                backgroundColor: '#444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              🔄 Refresh Devices
            </button>
          </div>

          {/* Control Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button
              onClick={aiAnalysis.audioInput.isListening ? aiAnalysis.audioInput.stopListening : aiAnalysis.audioInput.startListening}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: aiAnalysis.audioInput.isListening ? '#ff4757' : '#2ed573',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {aiAnalysis.audioInput.isListening ? '🔇 Stop' : '🎤 Start'} Audio Input
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', marginBottom: '5px', color: '#999' }}>
              Quick Presets:
            </div>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              <button
                onClick={() => { aiAnalysis.audioInput.setInputGain(1.0); aiAnalysis.audioInput.setSensitivity(1.0); }}
                style={{ padding: '4px 8px', backgroundColor: '#555', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
              >
                Default
              </button>
              <button
                onClick={() => { aiAnalysis.audioInput.setInputGain(3.0); aiAnalysis.audioInput.setSensitivity(2.0); }}
                style={{ padding: '4px 8px', backgroundColor: '#555', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
              >
                Boosted
              </button>
              <button
                onClick={() => { aiAnalysis.audioInput.setInputGain(5.0); aiAnalysis.audioInput.setSensitivity(3.0); }}
                style={{ padding: '4px 8px', backgroundColor: '#555', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
              >
                Max Gain
              </button>
            </div>
          </div>

          {/* Error Display */}
          {aiAnalysis.audioInput.error && (
            <div style={{
              backgroundColor: '#ff4757',
              color: 'white',
              padding: '8px',
              borderRadius: '6px',
              fontSize: '12px',
              marginTop: '10px'
            }}>
              ❌ {aiAnalysis.audioInput.error}
            </div>
          )}

          {/* Tips */}
          <div style={{ 
            fontSize: '11px', 
            color: '#888', 
            marginTop: '10px',
            lineHeight: '1.4'
          }}>
            💡 <strong>Tips:</strong><br/>
            • Try "Boosted" preset for low audio levels<br/>
            • Input Gain affects hardware amplification<br/>
            • Sensitivity affects software detection<br/>
            • Aim for 40-70% audio level for best results
          </div>
        </div>
        
        <div style={{
          fontSize: '16px',
          fontWeight: 'bold',
          marginBottom: '15px',
          textAlign: 'center',
          color: '#00ffff'
        }}>
          🤖 AI Enhanced Audio Analysis
        </div>

        {/* Beat Detection & Rhythm Analysis */}
        <CollapsibleSection title="🥁 Beat Detection & Rhythm" defaultOpen={true}>
          <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '8px', padding: '6px', background: 'rgba(0,255,255,0.1)', borderRadius: '4px' }}>
              <div><strong>Next Beat Prediction:</strong> {aiAnalysis.predictiveBeats?.nextBeatPrediction ? `${Math.max(0, aiAnalysis.predictiveBeats.nextBeatPrediction - performance.now()).toFixed(0)}ms` : 'N/A'}</div>
              <div><strong>Beat Confidence:</strong> <span style={{color: aiAnalysis.predictiveBeats?.confidence > 0.8 ? '#2ed573' : aiAnalysis.predictiveBeats?.confidence > 0.5 ? '#ffa502' : '#ff4757', minWidth: '40px', display: 'inline-block', textAlign: 'right'}}>{((aiAnalysis.predictiveBeats?.confidence || 0) * 100).toFixed(1)}%</span></div>
              <div><strong>Tempo Stability:</strong> <span style={{color: (aiAnalysis.predictiveBeats?.tempoStability || 0) > 0.8 ? '#2ed573' : '#ffa502', minWidth: '40px', display: 'inline-block', textAlign: 'right'}}>{((aiAnalysis.predictiveBeats?.tempoStability || 0) * 100).toFixed(1)}%</span></div>
            </div>
            <div><strong>Beat Pattern:</strong> {aiAnalysis.predictiveBeats?.beatPattern?.map(interval => `${interval.toFixed(0)}ms`).join(', ') || 'Learning...'}</div>
            <div><strong>Phase Correction:</strong> {(aiAnalysis.predictiveBeats?.phaseCorrection || 0).toFixed(2)}ms</div>
            <div><strong>AI Smoothed BPM:</strong> <span style={{minWidth: '50px', display: 'inline-block', textAlign: 'right'}}>{aiAnalysis.smartSmoothedValues?.bpm?.toFixed(1) || 'N/A'} BPM</span></div>
          </div>
        </CollapsibleSection>

        {/* Energy & Dynamics Analysis */}
        <CollapsibleSection title="⚡ Energy & Dynamics Analysis">
          <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '8px', padding: '6px', background: 'rgba(46,213,115,0.1)', borderRadius: '4px' }}>
              <div><strong>Current Energy:</strong> <span style={{color: '#2ed573', minWidth: '40px', display: 'inline-block', textAlign: 'right'}}>{((aiAnalysis.patternRecognition?.energyPrediction?.currentEnergy || 0) * 100).toFixed(1)}%</span></div>
              <div><strong>Energy Trend:</strong> 
                <span style={{
                  color: aiAnalysis.patternRecognition?.energyPrediction?.energyTrend === 'rising' ? '#2ed573' :
                        aiAnalysis.patternRecognition?.energyPrediction?.energyTrend === 'falling' ? '#ff4757' : '#ffa502',
                  marginLeft: '4px'
                }}>
                  {aiAnalysis.patternRecognition?.energyPrediction?.energyTrend || 'stable'} 
                  {aiAnalysis.patternRecognition?.energyPrediction?.energyTrend === 'rising' ? ' ↗️' : 
                   aiAnalysis.patternRecognition?.energyPrediction?.energyTrend === 'falling' ? ' ↘️' : ' ➡️'}
                </span>
              </div>
              <div><strong>Peak Prediction:</strong> <span style={{minWidth: '40px', display: 'inline-block', textAlign: 'right'}}>{((aiAnalysis.patternRecognition?.energyPrediction?.peakPrediction || 0) * 100).toFixed(1)}%</span></div>
            </div>
            <div><strong>Predicted Energy:</strong> {aiAnalysis.patternRecognition?.energyPrediction?.predictedEnergy?.map(e => `${(e * 100).toFixed(0)}%`).join(', ') || 'Learning...'}</div>
            <div><strong>Raw Audio Level:</strong> {(aiAnalysis.audioInput.audioLevel * 100).toFixed(1)}%</div>
            <div><strong>Dynamic Range:</strong> {aiAnalysis.audioInput.isListening ? ((aiAnalysis.audioInput.audioLevel * 100)).toFixed(1) : 0}%</div>
          </div>
        </CollapsibleSection>

        {/* Genre & Musical Classification */}
        <CollapsibleSection title="🎼 Genre & Musical Classification">
          <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '8px', padding: '6px', background: 'rgba(255,0,255,0.1)', borderRadius: '4px' }}>
              <div><strong>Detected Genre:</strong> 
                <span style={{
                  color: '#ff00ff',
                  marginLeft: '4px',
                  textTransform: 'capitalize',
                  fontWeight: 'bold'
                }}>
                  {aiAnalysis.patternRecognition?.genreClassification?.detectedGenre || 'unknown'}
                </span>
              </div>
              <div><strong>Genre Confidence:</strong> 
                <span style={{
                  color: (aiAnalysis.patternRecognition?.genreClassification?.confidence || 0) > 0.7 ? '#2ed573' :
                        (aiAnalysis.patternRecognition?.genreClassification?.confidence || 0) > 0.4 ? '#ffa502' : '#ff4757',
                  marginLeft: '4px',
                  fontWeight: 'bold'
                }}>
                  {((aiAnalysis.patternRecognition?.genreClassification?.confidence || 0) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <div><strong>Avg BPM:</strong> {aiAnalysis.patternRecognition?.genreClassification?.characteristics?.avgBPM || 120}</div>
            <div><strong>Rhythm Complexity:</strong> {((aiAnalysis.patternRecognition?.genreClassification?.characteristics?.rhythmComplexity || 0.5) * 100).toFixed(0)}%</div>
            <div><strong>EQ Profile:</strong></div>
            <div style={{ marginLeft: '10px', fontSize: '9px' }}>
              <div>Low: {((aiAnalysis.patternRecognition?.genreClassification?.characteristics?.eqProfile?.low || 0.5) * 100).toFixed(0)}%</div>
              <div>Mid: {((aiAnalysis.patternRecognition?.genreClassification?.characteristics?.eqProfile?.mid || 0.5) * 100).toFixed(0)}%</div>
              <div>High: {((aiAnalysis.patternRecognition?.genreClassification?.characteristics?.eqProfile?.high || 0.5) * 100).toFixed(0)}%</div>
              <div>Balance: {((aiAnalysis.patternRecognition?.genreClassification?.characteristics?.eqProfile?.balance || 0.5) * 100).toFixed(0)}%</div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Track Identification & Structure */}
        {aiAnalysis.trackIdentification?.currentTrack && (
          <CollapsibleSection title="🎯 Track Identification & Structure">
            <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
              <div style={{ marginBottom: '8px', padding: '6px', background: 'rgba(0,255,255,0.1)', borderRadius: '4px' }}>
                <div><strong>Track:</strong> <span style={{color: '#00ffff'}}>{aiAnalysis.trackIdentification.currentTrack.track.name}</span></div>
                <div><strong>Artist:</strong> {aiAnalysis.trackIdentification.currentTrack.track.artist}</div>
                <div><strong>ID Confidence:</strong> <span style={{color: aiAnalysis.trackIdentification.confidenceScore > 0.8 ? '#2ed573' : '#ffa502'}}>{(aiAnalysis.trackIdentification.confidenceScore * 100).toFixed(0)}%</span></div>
              </div>
              <div><strong>Song Section:</strong> <span style={{color: '#ffa502', textTransform: 'capitalize'}}>{aiAnalysis.trackIdentification.analysisEnhancement?.songSection || 'unknown'}</span></div>
              <div><strong>Time in Track:</strong> {aiAnalysis.trackIdentification.analysisEnhancement?.timeInTrack?.toFixed(0) || 0}s</div>
              <div><strong>Time Remaining:</strong> {aiAnalysis.trackIdentification.analysisEnhancement?.timeRemaining?.toFixed(0) || 0}s</div>
              <div><strong>Track BPM:</strong> {aiAnalysis.trackIdentification.currentTrack.track.bpm}</div>
              <div><strong>Track Genre:</strong> {aiAnalysis.trackIdentification.currentTrack.track.genre}</div>
            </div>
          </CollapsibleSection>
        )}

        {/* Pattern Recognition & Learning */}
        <CollapsibleSection title="🎭 Pattern Recognition & Learning">
          <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '8px', padding: '6px', background: 'rgba(255,165,0,0.1)', borderRadius: '4px' }}>
              <div><strong>Detected Patterns:</strong> <span style={{color: '#ffa502', fontWeight: 'bold'}}>{aiAnalysis.patternRecognition?.detectedPatterns?.length || 0}</span></div>
              <div><strong>Pattern Types:</strong> {aiAnalysis.patternRecognition?.detectedPatterns?.map(p => p.type).join(', ') || 'None'}</div>
            </div>
            {aiAnalysis.patternRecognition?.detectedPatterns?.slice(0, 3).map((pattern, index) => (
              <div key={pattern.id} style={{ marginBottom: '4px', padding: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                <div><strong>Pattern {index + 1}:</strong> {pattern.type} ({(pattern.confidence * 100).toFixed(0)}%)</div>
                <div style={{ fontSize: '8px', color: '#999' }}>Frequency: {pattern.frequency}Hz | Length: {pattern.pattern.length}</div>
              </div>
            ))}
            <div><strong>Transition Detection:</strong></div>
            <div style={{ marginLeft: '10px', fontSize: '9px' }}>
              <div>Is Transitioning: {aiAnalysis.patternRecognition?.transitionDetection?.isTransitioning ? '✅' : '❌'}</div>
              <div>Transition Type: {aiAnalysis.patternRecognition?.transitionDetection?.transitionType || 'none'}</div>
              <div>Confidence: {((aiAnalysis.patternRecognition?.transitionDetection?.confidence || 0) * 100).toFixed(0)}%</div>
              <div>Time Remaining: {aiAnalysis.patternRecognition?.transitionDetection?.timeRemaining?.toFixed(0) || 0}s</div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Machine Learning Models Status */}
        <CollapsibleSection title="🧠 ML Models & Neural Networks">
          <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
            {aiAnalysis.isAIReady ? (
              <>
                <div style={{ marginBottom: '6px', padding: '6px', background: 'rgba(0,255,0,0.1)', borderRadius: '4px' }}>
                  <div><strong>Beat Predictor:</strong> <span style={{color: aiAnalysis.isAIReady ? '#2ed573' : '#ff4757'}}>{aiAnalysis.isAIReady ? '✅ Active' : '❌ Offline'}</span></div>
                  <div style={{fontSize: '8px', color: '#999'}}>Neural Network: TensorFlow.js | Input: 32 beats → Output: 4 predictions</div>
                </div>
                <div style={{ marginBottom: '6px', padding: '6px', background: 'rgba(255,0,255,0.1)', borderRadius: '4px' }}>
                  <div><strong>Genre Classifier:</strong> <span style={{color: aiAnalysis.isAIReady ? '#2ed573' : '#ff4757'}}>{aiAnalysis.isAIReady ? '✅ Active' : '❌ Offline'}</span></div>
                  <div style={{fontSize: '8px', color: '#999'}}>Neural Network: TensorFlow.js | MFCC features → 10 genres</div>
                </div>
                <div style={{ marginBottom: '6px', padding: '6px', background: 'rgba(255,165,0,0.1)', borderRadius: '4px' }}>
                  <div><strong>Energy Predictor:</strong> <span style={{color: aiAnalysis.isAIReady ? '#2ed573' : '#ff4757'}}>{aiAnalysis.isAIReady ? '✅ Active' : '❌ Offline'}</span></div>
                  <div style={{fontSize: '8px', color: '#999'}}>Neural Network: TensorFlow.js | 16 features → 8 energy levels</div>
                </div>
                <div style={{ marginBottom: '6px', padding: '6px', background: 'rgba(0,255,255,0.1)', borderRadius: '4px' }}>
                  <div><strong>Pattern Recognizer:</strong> <span style={{color: aiAnalysis.isAIReady ? '#2ed573' : '#ff4757'}}>{aiAnalysis.isAIReady ? '✅ Active' : '❌ Offline'}</span></div>
                  <div style={{fontSize: '8px', color: '#999'}}>Neural Network: TensorFlow.js | 64 features → 32 embeddings</div>
                </div>
              </>
            ) : (
              <div style={{ color: '#999', fontStyle: 'italic' }}>Neural networks initializing...</div>
            )}
          </div>
        </CollapsibleSection>

        {/* Memory System & Learning */}
        <CollapsibleSection title="🧠 Memory System & Learning">
          <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '8px', padding: '6px', background: 'rgba(116,185,255,0.1)', borderRadius: '4px' }}>
              <div><strong>Short-term Memory:</strong> <span style={{color: '#74b9ff'}}>{aiAnalysis.memorySystem?.shortTermMemory?.size || 0} patterns</span></div>
              <div><strong>Long-term Memory:</strong> <span style={{color: '#74b9ff'}}>{aiAnalysis.memorySystem?.longTermMemory?.size || 0} memories</span></div>
              <div><strong>Session Memory:</strong> <span style={{color: '#74b9ff'}}>{aiAnalysis.memorySystem?.sessionMemory?.size || 0} entries</span></div>
            </div>
            <div><strong>Adaptation Rate:</strong> {((aiAnalysis.memorySystem?.adaptationRate || 0.1) * 100).toFixed(1)}%</div>
            <div><strong>Data Quality:</strong> {aiAnalysis.audioInput.isListening ? 'High (Audio + MIDI)' : 'Medium (MIDI Only)'}</div>
            <div><strong>Learning Status:</strong> {(aiAnalysis.memorySystem?.shortTermMemory?.size || 0) > 10 ? '🧠 Actively Learning' : '📚 Collecting Data'}</div>
            <div><strong>Memory Persistence:</strong> {typeof(Storage) !== "undefined" ? '✅ Local Storage' : '❌ Session Only'}</div>
          </div>
        </CollapsibleSection>

        {/* Smart Smoothing & Filtering */}
        <CollapsibleSection title="🎛️ Smart Smoothing & Filtering">
          <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>BPM Filter:</strong></span>
                <span style={{color: '#00d2d3'}}>Active</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>Volume Filter:</strong></span>
                <span style={{color: '#00d2d3'}}>Active</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span><strong>Energy Filter:</strong></span>
                <span style={{color: '#00d2d3'}}>Active</span>
              </div>
            </div>
            <div><strong>Noise Threshold:</strong> 5.0%</div>
            <div><strong>Responsiveness:</strong> 70%</div>
            <div><strong>Smoothed Values:</strong></div>
            <div style={{ marginLeft: '10px', fontSize: '9px' }}>
              <div>BPM: {aiAnalysis.smartSmoothedValues?.bpm?.toFixed(1) || 120} BPM</div>
              <div>Volume: {aiAnalysis.smartSmoothedValues?.volume?.toFixed(0) || 127}</div>
              <div>Energy: {((aiAnalysis.smartSmoothedValues?.energy || 0.5) * 100).toFixed(1)}%</div>
            </div>
            <div><strong>Filter Status:</strong> {aiAnalysis.isAIReady ? '✅ Active' : '❌ Initializing'}</div>
          </div>
        </CollapsibleSection>

        {/* Performance Metrics */}
        <CollapsibleSection title="⚡ Performance & System Status">
          <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '8px', padding: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
              <div><strong>AI Status:</strong> <span style={{color: aiAnalysis.isAIReady ? '#2ed573' : '#ff4757'}}>{aiAnalysis.isAIReady ? '✅ Ready' : '❌ Initializing'}</span></div>
              <div><strong>Analysis Rate:</strong> ~40 Hz (25ms intervals)</div>
              <div><strong>Buffer Size:</strong> 2048 samples</div>
            </div>
            <div><strong>Data Sources:</strong></div>
            <div style={{ marginLeft: '10px', fontSize: '9px' }}>
              <div>MIDI: <span style={{color: controller ? '#2ed573' : '#ff4757'}}>{controller ? '✅ Connected' : '❌ Disconnected'}</span></div>
              <div>Audio Input: <span style={{color: aiAnalysis.audioInput.isListening ? '#2ed573' : '#ff4757'}}>{aiAnalysis.audioInput.isListening ? '✅ Active' : '❌ Inactive'}</span></div>
              <div>Track Database: <span style={{color: aiAnalysis.trackIdentification?.currentTrack ? '#2ed573' : '#ffa502'}}>{aiAnalysis.trackIdentification?.currentTrack ? '✅ Identified' : '⚠️ Unknown Track'}</span></div>
            </div>
            <div><strong>Neural Network Backend:</strong> TensorFlow.js</div>
            <div><strong>Audio Processing:</strong> Web Audio API</div>
            <div><strong>Total AI Confidence:</strong> 
              <span style={{
                color: aiAnalysis.aiConfidence > 0.8 ? '#2ed573' : aiAnalysis.aiConfidence > 0.5 ? '#ffa502' : '#ff4757',
                marginLeft: '4px',
                fontWeight: 'bold',
                minWidth: '40px',
                display: 'inline-block',
                textAlign: 'right'
              }}>
                {(aiAnalysis.aiConfidence * 100).toFixed(1)}%
              </span>
            </div>
          </div>
                 </CollapsibleSection>
       </div>
       
       {/* Track Identification Panel */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        width: '350px',
        zIndex: 999
      }}>
          <TrackIdentificationPanel 
          onTracksLoaded={aiAnalysis.loadTrackDatabase}
          identificationResult={aiAnalysis.trackIdentification}
          isAIReady={aiAnalysis.isAIReady}
        />
      </div>
    </div>
  );
}; 