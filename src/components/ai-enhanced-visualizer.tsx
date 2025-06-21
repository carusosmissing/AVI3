import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import { BlendFunction, GlitchMode } from 'postprocessing';
import { VisualDNASystem, ActiveVisualState } from '../ai/visual-dna-system';
import { DDJControllerState, VisualParams, Track } from '../types';
import { VisualDNAProfileSelector } from './visual-dna-profile-selector';
import useAIAudioAnalyzer from '../hooks/useAIAudioAnalyzer';
import { EnhancedParticleSystem } from './enhanced-particle-system';
import ReactiveGeometry, { ReactiveCrystal } from './reactive-geometry';




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
  
  // Select geometry based on profile - ENORMOUS WIREFRAME SHAPES (200% BIGGER!)
  const getGeometry = () => {
    const shapes = visualState.currentProfile.visualElements.shapes;
    const shapeName = shapes[index % shapes.length];
    
    switch (shapeName) {
      case 'cube':
        return <boxGeometry args={[9, 9, 9]} />;
      case 'pyramid':
        return <coneGeometry args={[8.1, 11.25, 4]} />;
      case 'tetrahedron':
        return <tetrahedronGeometry args={[6.75]} />;
      case 'octahedron':
        return <octahedronGeometry args={[6.75]} />;
      case 'icosahedron':
        return <icosahedronGeometry args={[6.75]} />;
      case 'sphere':
        return <sphereGeometry args={[6.75, 32, 32]} />;
      default:
        return <boxGeometry args={[9, 9, 9]} />;
    }
  };

      return (
    <mesh ref={meshRef} position={[index * 12 - 12, 0, -5]}>
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



// Main visualizer component
interface AIEnhancedVisualizerProps {
  controller: any; // Base DDJFlx4Controller
  controllerState: any;
  visualParams: any;
  identificationTracks?: any[];
  onTrackIdentification?: (result: any) => void;
  visualDNAEnabled?: boolean;
  bpmData?: {
    currentBPM: number;
    isConnected: boolean;
    beatPhase: number;
    beatInterval: number;
  };
  aiAnalysis: any; // Shared AI analysis from App level
}

export default function AIEnhancedVisualizer({
  controller,
  controllerState,
  visualParams,
  identificationTracks,
  onTrackIdentification,
  visualDNAEnabled = false,
  bpmData,
  aiAnalysis
}: AIEnhancedVisualizerProps) {
  const [visualDNA] = useState(() => new VisualDNASystem());
  const [visualState, setVisualState] = useState<ActiveVisualState>(visualDNA.getActiveState());
  const animationFrameRef = useRef<number | undefined>(undefined);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // AI Audio Analysis is now passed as prop from App level
  console.log('🎵 Visualizer: Audio input state:', {
    isListening: aiAnalysis.audioInput.isListening,
    audioLevel: aiAnalysis.audioInput.audioLevel,
    selectedDevice: aiAnalysis.audioInput.selectedDeviceId,
    availableDevices: aiAnalysis.audioInput.availableDevices.length
  });
  
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
  
  // Get post-processing effects based on profile - ENHANCED WITH PROFESSIONAL EFFECTS
  const getPostProcessingEffects = () => {
    const profile = visualState.currentProfile;
    const effects = [];
    
    // Calculate dynamic intensities based on audio and profile
    const audioIntensity = Math.max(0.1, audioLevel);
    const energyBoost = audioIntensity * 0.5;
    
    // PROFESSIONAL EFFECT 1: Enhanced Bloom with audio reactivity
    if (profile.moodTags.includes('energetic') || profile.moodTags.includes('vibrant') || profile.moodTags.includes('euphoric')) {
      effects.push(
        <Bloom
          key="bloom"
          intensity={profile.complexity.effectIntensity + energyBoost}
          luminanceThreshold={0.2 - (audioIntensity * 0.1)} // Lower threshold for more glow when audio is intense
          luminanceSmoothing={0.9}
          width={1024} // Higher resolution for better quality
          height={1024}
        />
      );
    }
    
    // PROFESSIONAL EFFECT 2: Film Grain & Vignette using enhanced Noise
    // All profiles get some film grain for that professional cinema look
    const grainIntensity = profile.moodTags.includes('raw') || profile.moodTags.includes('dark') ? 
      profile.complexity.effectIntensity * 0.15 + (energyBoost * 0.1) : 
      0.08 + (energyBoost * 0.05); // Subtle grain for all profiles
      
    effects.push(
      <Noise
        key="film-grain"
        opacity={grainIntensity}
        premultiply={false} // Better blending
      />
    );
    
    // PROFESSIONAL EFFECT 3: Audio-reactive Chromatic Aberration for specific profiles
    if (profile.moodTags.includes('psychedelic') || profile.moodTags.includes('trippy') || 
        profile.moodTags.includes('cosmic') || audioIntensity > 0.7) {
      // Using enhanced bloom with color shift to simulate chromatic aberration
      effects.push(
        <Bloom
          key="chromatic-bloom"
          intensity={0.3 + (audioIntensity * 0.4)}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.7}
          width={1024}
          height={1024}
          kernelSize={3} // Smaller kernel for tighter effect
        />
      );
    }
    
    // PROFESSIONAL EFFECT 4: Glitch effects for aggressive/chaotic profiles
    if (profile.transitionStyle.type === 'glitch' || profile.moodTags.includes('aggressive') || 
        profile.moodTags.includes('chaotic')) {
      // Enhanced noise with different blending for glitch effect
      effects.push(
        <Noise
          key="glitch-noise"
          opacity={0.15 + (energyBoost * 0.2)}
          premultiply={true} // Different blending mode for harsh effect
        />
      );
    }
    
    return effects;
  };
  
  // Use real BPM data or fallback to mock data
  const [fallbackBeatPhase, setFallbackBeatPhase] = useState(0);
  
  useEffect(() => {
    // Only create fallback BPM if real BPM data isn't available
    if (!bpmData || !bpmData.isConnected) {
      const bpm = 120; // Default BPM
      const interval = setInterval(() => {
        setFallbackBeatPhase(prev => (prev + 0.05) % 1); // Update beat phase over time
      }, (60000 / bpm) / 20); // 20 updates per beat
      
      return () => clearInterval(interval);
    }
  }, [bpmData]);
  
  const activeBPMData = React.useMemo(() => {
    if (bpmData && bpmData.isConnected) {
      console.log('🎵 Using real MIDI BPM data:', bpmData.currentBPM, 'BPM');
      return bpmData;
    } else {
      console.log('🎵 Using fallback BPM data: 120 BPM');
      return {
        currentBPM: 120,
        isConnected: false,
        beatPhase: fallbackBeatPhase,
        beatInterval: 60000 / 120
      };
    }
  }, [bpmData, fallbackBeatPhase]);

  const mockVisualParams = React.useMemo(() => ({
    intensity: 0.7,
    color: { hue: 180, saturation: 0.8, lightness: 0.6 },
    speed: 1.2,
    scale: 1.0,
    effects: []
  }), []);

  return (
    <div className="ai-enhanced-visualizer" style={{ 
      width: '100%', 
      height: '100%',
      // PROFESSIONAL VIGNETTE EFFECT using CSS
      background: `radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.8) 100%)`,
      position: 'relative'
    }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
        <DynamicBackground 
          key={`${visualState.currentProfile.id}-background`}
          visualState={visualState} 
        />
        
        <ambientLight intensity={0.4} />
        {/* PROFESSIONAL COLOR GRADING: Dynamic lighting that shifts with musical energy */}
        <pointLight 
          position={[10, 10, 10]} 
          intensity={1 + (audioLevel * 0.5)} 
          color={visualState.currentProfile.colorPalette.primary} 
        />
        <pointLight 
          position={[-10, -10, -10]} 
          intensity={0.5 + (audioLevel * 0.3)} 
          color={visualState.currentProfile.colorPalette.accent} 
        />
        <spotLight 
          position={[0, 10, 0]} 
          angle={0.5} 
          penumbra={0.5} 
          intensity={audioLevel * 1.5} 
          color={visualState.currentProfile.colorPalette.highlights[0] || '#ffffff'}
        />
        
        {/* Additional color grading lights based on profile mood */}
        {visualState.currentProfile.moodTags.includes('warm') || visualState.currentProfile.moodTags.includes('dreamy') ? (
          <pointLight 
            position={[0, -5, 5]} 
            intensity={0.3 + (audioLevel * 0.2)} 
            color="#ffaa44" // Warm orange fill light
          />
        ) : visualState.currentProfile.moodTags.includes('dark') || visualState.currentProfile.moodTags.includes('aggressive') ? (
          <pointLight 
            position={[0, -5, 5]} 
            intensity={0.2 + (audioLevel * 0.3)} 
            color="#4444ff" // Cool blue fill light
          />
        ) : (
          <pointLight 
            position={[0, -5, 5]} 
            intensity={0.25 + (audioLevel * 0.25)} 
            color="#ffffff" // Neutral fill light
          />
        )}
        
        {/* Reactive Geometry with Wicked Craniums logo texture */}
        <ReactiveGeometry
          audioData={{
            audioLevel: audioLevel,
            spectralFeatures: controllerState.channelA && controllerState.channelB ? {
              bass: ((controllerState.channelA.eq?.low || 0) + (controllerState.channelB.eq?.low || 0)) / 254,
              mid: ((controllerState.channelA.eq?.mid || 0) + (controllerState.channelB.eq?.mid || 0)) / 254,
              high: ((controllerState.channelA.eq?.high || 0) + (controllerState.channelB.eq?.high || 0)) / 254,
              brightness: 2000 + ((controllerState.channelA.eq?.high || 0) + (controllerState.channelB.eq?.high || 0)) * 10,
              bandwidth: 1000 + ((controllerState.channelA.eq?.mid || 0) + (controllerState.channelB.eq?.mid || 0)) * 5
            } : undefined,
            beatDetection: {
              isBeat: aiAnalysis.predictiveBeats?.confidence > 0.8 || Math.sin(activeBPMData.beatPhase * Math.PI * 2) > 0.8,
              beatStrength: Math.max(aiAnalysis.predictiveBeats?.confidence || 0, Math.abs(Math.sin(activeBPMData.beatPhase * Math.PI * 2))),
              beatPhase: activeBPMData.beatPhase
            },
             
          }}
          visualDNAProfile={visualState.currentProfile}
          logoTexture="/wicked-craniums-logo-2048.png"
          position={[0, 0, 0]}
          scale={2}
        />
        
        {/* Additional reactive geometry based on profile */}
        {visualState.currentProfile.id === 'crystal-matrix' && (
          <ReactiveCrystal
            audioData={{
              audioLevel: audioLevel,
              spectralFeatures: controllerState.channelA && controllerState.channelB ? {
                bass: ((controllerState.channelA.eq?.low || 0) + (controllerState.channelB.eq?.low || 0)) / 254,
                mid: ((controllerState.channelA.eq?.mid || 0) + (controllerState.channelB.eq?.mid || 0)) / 254,
                high: ((controllerState.channelA.eq?.high || 0) + (controllerState.channelB.eq?.high || 0)) / 254,
                brightness: 2000,
                bandwidth: 1000
              } : undefined,
              beatDetection: {
                isBeat: aiAnalysis.predictiveBeats?.confidence > 0.8 || Math.sin(activeBPMData.beatPhase * Math.PI * 2) > 0.8,
                beatStrength: Math.max(aiAnalysis.predictiveBeats?.confidence || 0, Math.abs(Math.sin(activeBPMData.beatPhase * Math.PI * 2))),
                beatPhase: activeBPMData.beatPhase
              }
            }}
            visualDNAProfile={visualState.currentProfile}
            position={[0, 0, -8]}
            scale={1}
          />
        )}
        

        
        {/* Render shapes based on profile - FIRST AND THIRD SHAPES ONLY */}
        {visualState.currentProfile.visualElements.dimension !== '2D' && 
          [0, 2].map((i) => (
            <GeometricShape 
              key={`${visualState.currentProfile.id}-shape-${i}`} 
              visualState={visualState} 
              audioLevel={audioLevel} 
              index={i}
            />
          ))
        }
        
        {/* Enhanced Particle system */}
        <EnhancedParticleSystem 
          key={`${visualState.currentProfile.id}-enhanced-particles`}
          audioData={{
            audioLevel: audioLevel,
            spectralFeatures: controllerState.channelA && controllerState.channelB ? {
              bass: ((controllerState.channelA.eq?.low || 0) + (controllerState.channelB.eq?.low || 0)) / 254,
              mid: ((controllerState.channelA.eq?.mid || 0) + (controllerState.channelB.eq?.mid || 0)) / 254,
              high: ((controllerState.channelA.eq?.high || 0) + (controllerState.channelB.eq?.high || 0)) / 254,
              brightness: 2000 + ((controllerState.channelA.eq?.high || 0) + (controllerState.channelB.eq?.high || 0)) * 10,
              bandwidth: 1000 + ((controllerState.channelA.eq?.mid || 0) + (controllerState.channelB.eq?.mid || 0)) * 5
            } : undefined,
            beatDetection: {
              isBeat: aiAnalysis.predictiveBeats?.confidence > 0.8 || Math.sin(activeBPMData.beatPhase * Math.PI * 2) > 0.8,
              beatStrength: Math.max(aiAnalysis.predictiveBeats?.confidence || 0, Math.abs(Math.sin(activeBPMData.beatPhase * Math.PI * 2))),
              beatPhase: activeBPMData.beatPhase
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
          maxParticles={Math.min(visualState.currentProfile.complexity.particleCount, 2500)}
          enableLOD={true}
        />
        
        {/* PROFESSIONAL POST-PROCESSING EFFECTS */}
        <EffectComposer>
          {getPostProcessingEffects()}
        </EffectComposer>
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
        color: '#00ff41',
        fontFamily: 'monospace',
            fontSize: '14px',
        textShadow: '0 0 10px #00ff41',
        pointerEvents: 'none',
        background: 'rgba(0,0,0,0.7)',
        padding: '10px',
        borderRadius: '5px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
          🧬 {visualState.currentProfile.name} 
          {visualDNA.isManualMode() && (
            <span style={{ color: '#00ff41', fontSize: '12px', marginLeft: '10px' }}>[Manual]</span>
          )}
          </div>
        <div>Audio: {audioLevel > 0 ? `${(audioLevel * 100).toFixed(0)}%` : '❌ No Audio'}</div>
        <div>BPM: {activeBPMData.isConnected ? `🎵 ${activeBPMData.currentBPM} BPM` : '🔄 120 BPM (Fallback)'} | Phase: {(activeBPMData.beatPhase * 100).toFixed(0)}%</div>
        <div>Crossfader: {controllerState.crossfader !== undefined ? controllerState.crossfader : 'N/A'}</div>
        <div>Channel A: Vol {controllerState.channelA?.volume || 0} | EQ {controllerState.channelA?.eq?.low || 0}/{controllerState.channelA?.eq?.mid || 0}/{controllerState.channelA?.eq?.high || 0}</div>
        <div>Channel B: Vol {controllerState.channelB?.volume || 0} | EQ {controllerState.channelB?.eq?.low || 0}/{controllerState.channelB?.eq?.mid || 0}/{controllerState.channelB?.eq?.high || 0}</div>
        <div style={{ fontSize: '10px', marginTop: '5px', color: '#00ff41' }}>
          {audioLevel === 0 && '⚠️ Use control panel for audio settings →'}
            </div>
        {visualState.targetProfile && (
          <div>Transitioning to: {visualState.targetProfile.name} ({(visualState.interpolationProgress * 100).toFixed(0)}%)</div>
            )}
                </div>
      
      {/* Clean visualizer - all controls are on the dedicated control panel screen */}
       

    </div>
  );
}; 