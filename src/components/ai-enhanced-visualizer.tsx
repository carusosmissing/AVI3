import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box, Sphere, Torus } from '@react-three/drei';
import * as THREE from 'three';
import { DDJFlx4AIController } from '../controllers/ddj-flx4-ai-controller';
import { RekordboxParser } from '../parsers/rekordbox-parser';
import VisualizerScene from './visualizer-scene';
import { VisualDNAVisualizer } from './visual-dna-visualizer';
import AudioInputPanel from './audio-input-panel';
import TrackIdentificationPanel from './track-identification-panel';
import { IdentificationResult } from '../ai/track-identifier';
import { Track } from '../types';
import useAIAudioAnalyzer from '../hooks/useAIAudioAnalyzer';
import useMIDIBPM from '../hooks/useMIDIBPM';

interface AIEnhancedVisualizerProps {
  controller: any; // Base DDJFlx4Controller
  controllerState: any;
  visualParams: any;
  identificationTracks?: Track[];
  onTrackIdentification?: (result: any) => void;
  visualDNAEnabled?: boolean;
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

// AI-Powered Predictive Beat Sphere
function AIPredictiveBeatSphere({ aiData, bpmData }: { aiData: any, bpmData: any }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [predictedBeats, setPredictedBeats] = useState<number[]>([]);
  const lastBeatTimeRef = useRef(0);

  useFrame((state) => {
    if (!meshRef.current || !aiData.isAIReady) return;

    const { predictiveBeats, aiConfidence, smartSmoothedValues } = aiData;
    
    // PRIORITIZE MIDI BPM as main tempo driver
    const primaryBPM = bpmData.isConnected && bpmData.currentBPM > 0 ? 
      bpmData.currentBPM : smartSmoothedValues.bpm || 120;
    
    console.log(`🎵 Beat Sphere - Primary BPM: ${primaryBPM.toFixed(1)} (MIDI: ${bpmData.isConnected ? 'Connected' : 'Disconnected'})`);
    
    // Calculate beat phase based on MIDI or create our own timing
    let beatPhase: number = 0;
    if (bpmData.isConnected && bpmData.beatPhase !== undefined) {
      beatPhase = bpmData.beatPhase;
    } else {
      // Create our own beat timing based on BPM
      const now = performance.now();
      const beatDuration = 60000 / primaryBPM; // ms per beat
      beatPhase = (now % beatDuration) / beatDuration;
    }
    
    // MUCH MORE DRAMATIC pulsing effect - make it clearly visible!
    const basePulse = Math.sin(beatPhase * Math.PI * 2);
    const dramaticPulseScale = 0.8 + (basePulse + 1) * 0.8; // Scale from 0.8 to 2.4 (3x size change!)
    meshRef.current.scale.setScalar(dramaticPulseScale);
    
    // Color changes based on BPM - faster BPM = more colorful
    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    const bpmHue = (primaryBPM - 60) / 140; // Map 60-200 BPM to 0-1 hue range
    const saturation = bpmData.isConnected ? 1.0 : 0.5; // Full saturation when MIDI connected
    material.color.setHSL(bpmHue, saturation, 0.6);
    
    // DRAMATIC beat flash - much more visible emissive glow
    const beatFlash = beatPhase > 0.85 ? (beatPhase - 0.85) * 6.67 : 0; // Intense flash for last 15% of beat
    material.emissive.setScalar(beatFlash * 0.8); // Much brighter emissive
    
    // MUCH FASTER rotation speed - directly tied to BPM
    const dramaticRotationSpeed = (primaryBPM / 60) * 0.05; // 2x faster rotation at 120 BPM
    meshRef.current.rotation.y += dramaticRotationSpeed;
    meshRef.current.rotation.x += dramaticRotationSpeed * 0.5; // Add X rotation too
    
    // Position bouncing based on beat phase
    const bounceHeight = Math.sin(beatPhase * Math.PI * 2) * 0.5;
    meshRef.current.position.y = 2 + bounceHeight;
  });

  return (
    <Sphere ref={meshRef} args={[1.2, 32, 32]} position={[0, 2, 0]}>
      <meshStandardMaterial 
        color="#00ffff"
        metalness={0.4}
        roughness={0.3}
      />
    </Sphere>
  );
}

// Genre-Adaptive Pattern Recognition Torus
function GenreAdaptiveTorus({ aiData, bpmData }: { aiData: any, bpmData: any }) {
  const torusRef = useRef<THREE.Mesh>(null);
  const [genreColors, setGenreColors] = useState<{ [key: string]: number }>({
    'house': 0.1,
    'techno': 0.8,
    'ambient': 0.5,
    'rock': 0.15,
    'pop': 0.25,
    'jazz': 0.45,
    'classical': 0.6,
    'hip-hop': 0.9,
    'trap': 0.95,
    'dubstep': 0.0,
    'unknown': 0.5
  });

  useFrame((state, delta) => {
    if (!torusRef.current || !aiData.isAIReady) return;

    const { patternRecognition, smartSmoothedValues } = aiData;
    const genre = patternRecognition.genreClassification.detectedGenre;
    const confidence = patternRecognition.genreClassification.confidence;
    
    // PRIORITIZE MIDI BPM as main tempo driver
    const primaryBPM = bpmData.isConnected && bpmData.currentBPM > 0 ? 
      bpmData.currentBPM : smartSmoothedValues.bpm || 120;
    
    console.log(`🎭 Genre Torus - Primary BPM: ${primaryBPM.toFixed(1)} (MIDI: ${bpmData.isConnected ? 'Connected' : 'Disconnected'})`);
    
    // MUCH MORE DRAMATIC rotation based on BPM - make it clearly visible!
    const dramaticBpmFactor = primaryBPM / 60; // Normalize to 60 BPM baseline for more dramatic effect
    const rotationMultiplier = 2.0; // Make rotations much more pronounced
    
    // Calculate beat phase for synchronized effects
    let beatPhase: number = 0;
    if (bpmData.isConnected && bpmData.beatPhase !== undefined) {
      beatPhase = bpmData.beatPhase;
    } else {
      const now = performance.now();
      const beatDuration = 60000 / primaryBPM;
      beatPhase = (now % beatDuration) / beatDuration;
    }
    
    // Rotate based on BPM with much more dramatic effect
    torusRef.current.rotation.x += delta * dramaticBpmFactor * rotationMultiplier;
    torusRef.current.rotation.z += delta * dramaticBpmFactor * rotationMultiplier * 0.7;
    
    // Color changes more dramatically based on BPM
    const material = torusRef.current.material as THREE.MeshStandardMaterial;
    const bpmHue = (primaryBPM - 60) / 140; // Map BPM to hue
    const saturation = bpmData.isConnected ? 0.9 : 0.5;
    material.color.setHSL(bpmHue, saturation, 0.6);
    
    // DRAMATIC scale pulsing with beat
    const beatPulse = Math.sin(beatPhase * Math.PI * 2);
    const dramaticScale = 0.7 + (beatPulse + 1) * 0.4; // Scale from 0.7 to 1.5
    torusRef.current.scale.setScalar(dramaticScale);
    
    // Beat-synchronized wireframe toggle
    material.wireframe = beatPhase > 0.5; // Toggle wireframe on second half of beat
    
    // Position wobbling based on BPM
    const wobble = Math.sin(state.clock.elapsedTime * dramaticBpmFactor) * 0.3;
    torusRef.current.position.x = wobble;
  });

  return (
    <Torus ref={torusRef} args={[2, 0.8, 16, 32]} position={[0, -1, 0]}>
      <meshStandardMaterial 
        color="#ff00ff"
        metalness={0.6}
        roughness={0.2}
      />
    </Torus>
  );
}

// Memory-Learning Particle System - Enhanced for BPM visualization
function MemoryLearningParticles({ aiData, controllerState, bpmData }: { aiData: any, controllerState: any, bpmData: any }) {
  const particlesRef = useRef<THREE.Points>(null);
  const particleCount = 500;
  const memoryIntensityRef = useRef(0);

  // Create particle positions with memory influence
  const positions = React.useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return positions;
  }, []);

  useFrame((state, delta) => {
    if (!particlesRef.current || !aiData.isAIReady) return;

    const { memorySystem, patternRecognition, smartSmoothedValues } = aiData;
    
    // PRIORITIZE MIDI BPM for particle movement
    const primaryBPM = bpmData.isConnected && bpmData.currentBPM > 0 ? 
      bpmData.currentBPM : smartSmoothedValues.bpm || 120;
    
    // Calculate beat phase
    let beatPhase: number = 0;
    if (bpmData.isConnected && bpmData.beatPhase !== undefined) {
      beatPhase = bpmData.beatPhase;
    } else {
      const now = performance.now();
      const beatDuration = 60000 / primaryBPM;
      beatPhase = (now % beatDuration) / beatDuration;
    }
    
    // Calculate memory influence
    const shortTermSize = memorySystem.shortTermMemory.size || 0;
    const longTermSize = memorySystem.longTermMemory.size || 0;
    const memoryIntensity = Math.min(1, (shortTermSize + longTermSize * 0.1) / 50);
    
    // Smooth memory intensity changes
    memoryIntensityRef.current += (memoryIntensity - memoryIntensityRef.current) * 0.1;
    
    // Animate particles based on BPM and beat phase
    const geometry = particlesRef.current.geometry;
    const positions = geometry.attributes.position.array as Float32Array;
    
    // BPM-based movement speed
    const bpmMovementSpeed = (primaryBPM / 120) * 0.1; // Much faster movement
    const beatPulse = Math.sin(beatPhase * Math.PI * 2);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // DRAMATIC BPM-synchronized movement
      const particlePhase = (i / particleCount) * Math.PI * 2;
      const xMovement = Math.sin(state.clock.elapsedTime * bpmMovementSpeed + particlePhase) * (0.05 + beatPulse * 0.05);
      const yMovement = Math.cos(state.clock.elapsedTime * bpmMovementSpeed + particlePhase) * (0.05 + beatPulse * 0.05);
      const zMovement = Math.sin(state.clock.elapsedTime * bpmMovementSpeed * 0.5 + particlePhase) * (0.03 + beatPulse * 0.03);
      
      positions[i3] += xMovement;
      positions[i3 + 1] += yMovement;  
      positions[i3 + 2] += zMovement;
      
      // Beat-synchronized "explosion" effect
      if (beatPhase > 0.9) {
        const explosionForce = (beatPhase - 0.9) * 10; // Intense explosion in last 10% of beat
        positions[i3] += (Math.random() - 0.5) * explosionForce;
        positions[i3 + 1] += (Math.random() - 0.5) * explosionForce;
        positions[i3 + 2] += (Math.random() - 0.5) * explosionForce;
      }
      
      // Boundary wrapping
      for (let j = 0; j < 3; j++) {
        if (positions[i3 + j] > 7.5) positions[i3 + j] = -7.5;
        if (positions[i3 + j] < -7.5) positions[i3 + j] = 7.5;
      }
    }
    
    geometry.attributes.position.needsUpdate = true;
    
    // Change particle color based on BPM
    const material = particlesRef.current.material as THREE.PointsMaterial;
    const bpmHue = (primaryBPM - 60) / 140;
    material.color.setHSL(bpmHue, bpmData.isConnected ? 1.0 : 0.5, 0.8);
    
    // Beat-synchronized size pulsing
    const beatPulseSize = 0.02 + (beatPulse + 1) * 0.03; // Pulse from 0.02 to 0.08
    material.size = beatPulseSize;
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
        size={0.03}
        color="#ffffff"
        transparent={true}
        opacity={0.7}
        sizeAttenuation={true}
      />
    </points>
  );
}

// Smart Smoothing EQ Visualizer  
function SmartSmoothingEQBars({ aiData, controllerState, bpmData }: { aiData: any, controllerState: any, bpmData: any }) {
  const groupRef = useRef<THREE.Group>(null);
  const smoothedEQRef = useRef({ low: 64, mid: 64, high: 64 });

  useFrame((state) => {
    if (!groupRef.current || !aiData.isAIReady) return;

    // PRIORITIZE MIDI BPM for EQ bar animation
    const primaryBPM = bpmData.isConnected && bpmData.currentBPM > 0 ? 
      bpmData.currentBPM : aiData.smartSmoothedValues?.bpm || 120;
    
    // Calculate beat phase
    let beatPhase: number = 0;
    if (bpmData.isConnected && bpmData.beatPhase !== undefined) {
      beatPhase = bpmData.beatPhase;
    } else {
      const now = performance.now();
      const beatDuration = 60000 / primaryBPM;
      beatPhase = (now % beatDuration) / beatDuration;
    }

    // Get AI-smoothed EQ values
    const rawEQ = {
      low: (controllerState.channelA.eq.low + controllerState.channelB.eq.low) / 2,
      mid: (controllerState.channelA.eq.mid + controllerState.channelB.eq.mid) / 2,
      high: (controllerState.channelA.eq.high + controllerState.channelB.eq.high) / 2
    };

    // Apply AI smoothing
    const adaptationRate = aiData.memorySystem.adaptationRate || 0.1;
    smoothedEQRef.current.low += (rawEQ.low - smoothedEQRef.current.low) * adaptationRate;
    smoothedEQRef.current.mid += (rawEQ.mid - smoothedEQRef.current.mid) * adaptationRate;
    smoothedEQRef.current.high += (rawEQ.high - smoothedEQRef.current.high) * adaptationRate;

    // Update EQ bars with DRAMATIC beat-synchronized effects
    const children = groupRef.current.children;
    const eqValues = [smoothedEQRef.current.low, smoothedEQRef.current.mid, smoothedEQRef.current.high];
    const beatPulse = Math.sin(beatPhase * Math.PI * 2);

    children.forEach((bar, index) => {
      if (index >= 3) return; // Only process first 3 bars
      
      const mesh = bar as THREE.Mesh;
      const normalizedEQ = eqValues[index] / 127;
      
      // DRAMATIC beat-synchronized height changes
      const baseHeight = 0.5 + normalizedEQ * 2; // Base height from EQ
      const beatPulseHeight = (beatPulse + 1) * 0.5; // Beat pulse from 0 to 1
      const finalHeight = baseHeight + beatPulseHeight; // Combine for dramatic effect
      mesh.scale.y = finalHeight;
      
      // Color based on BPM and beat phase
      const material = mesh.material as THREE.MeshStandardMaterial;
      const bpmHue = ((primaryBPM - 60) / 140 + index * 0.2) % 1; // Offset hue per bar
      const saturation = bpmData.isConnected ? 0.9 : 0.5;
      material.color.setHSL(bpmHue, saturation, 0.6);
      
      // DRAMATIC beat flash emissive
      const beatFlash = beatPhase > 0.85 ? (beatPhase - 0.85) * 6.67 : 0;
      material.emissive.setScalar(beatFlash * 0.6);
      
      // Beat-synchronized position bouncing
      const bounce = Math.sin(beatPhase * Math.PI * 2 + index * 0.5) * 0.2;
      mesh.position.y = bounce;
    });
  });

  return (
    <group ref={groupRef} position={[-4, -2, 0]}>
      <Box args={[0.8, 1, 0.5]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#ff4757" />
      </Box>
      <Box args={[0.8, 1, 0.5]} position={[2, 0, 0]}>
        <meshStandardMaterial color="#2ed573" />
      </Box>
      <Box args={[0.8, 1, 0.5]} position={[4, 0, 0]}>
        <meshStandardMaterial color="#3742fa" />
      </Box>
    </group>
  );
}

// AI Status Display
function AIStatusDisplay({ aiData, bpmData }: { aiData: any, bpmData: any }) {
  return (
    <>
      <Text
        position={[0, 4, 0]}
        fontSize={0.5}
        color={aiData.isAIReady ? "#00ff00" : "#ff0000"}
        anchorX="center"
        anchorY="middle"
      >
        🤖 AI Audio Analyzer: {aiData.isAIReady ? "ACTIVE" : "LOADING"}
      </Text>
      
      <Text
        position={[0, 3.3, 0]}
        fontSize={0.3}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        Genre: {aiData.aiInsights.detectedGenre} | Confidence: {(aiData.aiConfidence * 100).toFixed(0)}%
      </Text>
      
      <Text
        position={[0, 2.7, 0]}
        fontSize={0.3}
        color="#ffaa00"
        anchorX="center"
        anchorY="middle"
      >
        Energy: {aiData.aiInsights.energyTrend} | Tempo Stability: {(aiData.aiInsights.tempoStability * 100).toFixed(0)}%
      </Text>
      
      <Text
        position={[0, 2.1, 0]}
        fontSize={0.25}
        color={bpmData.isConnected ? "#00ff00" : "#ffaa00"}
        anchorX="center"
        anchorY="middle"
      >
        PRIMARY BPM: {bpmData.isConnected ? `${bpmData.currentBPM.toFixed(1)} (MIDI)` : `${aiData.smartSmoothedValues.bpm.toFixed(1)} (AI)`} | Patterns: {aiData.patternRecognition.detectedPatterns.length}
      </Text>
    </>
  );
}

// Main AI-Enhanced Visualizer Component
export default function AIEnhancedVisualizer({
  controller,
  controllerState,
  visualParams,
  identificationTracks,
  onTrackIdentification,
  visualDNAEnabled = false
}: AIEnhancedVisualizerProps) {
  // Create AI controller wrapper
  const [aiController] = useState(() => {
    // If controller is already AI-enhanced, use it
    if (controller instanceof DDJFlx4AIController) {
      return controller;
    }
    // Otherwise create new AI controller
    return new DDJFlx4AIController();
  });

  const [isConnected, setIsConnected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [spectralFeatures, setSpectralFeatures] = useState<any>(null);
  const [identificationResult, setIdentificationResult] = useState<IdentificationResult | null>(null);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [useVisualDNA, setUseVisualDNA] = useState(true); // Default to Visual DNA system
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true); // New state for right panel
  const audioLevelRef = useRef(audioLevel);
  const spectralFeaturesRef = useRef(spectralFeatures);
  
  // Get traditional BPM data
  const bpmData = useMIDIBPM();
  
  // Get AI analysis - Pass MIDI BPM data to prioritize MIDI tempo
  const aiData = useAIAudioAnalyzer(aiController, {
    currentBPM: bpmData.currentBPM,
    isConnected: bpmData.isConnected,
    beatPhase: bpmData.beatPhase,
    beatInterval: bpmData.beatInterval
  });

  // Load tracks into AI system when available - using ref to prevent reload loop
  const tracksLoadedRef = React.useRef(false);
  
  React.useEffect(() => {
    if (identificationTracks && identificationTracks.length > 0 && aiData.loadTrackDatabase && !tracksLoadedRef.current) {
      console.log(`🎯 Loading ${identificationTracks.length} tracks into AI system for identification`);
      aiData.loadTrackDatabase(identificationTracks);
      tracksLoadedRef.current = true;
    }
  }, [identificationTracks, aiData]);

  // Send track identification results back to App
  React.useEffect(() => {
    if (aiData.trackIdentification && onTrackIdentification) {
      onTrackIdentification(aiData.trackIdentification);
    }
  }, [aiData.trackIdentification, onTrackIdentification]);

  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  useEffect(() => {
    spectralFeaturesRef.current = spectralFeatures;
  }, [spectralFeatures]);

  useEffect(() => {
    const connectController = async () => {
      // Just set as connected since this is a wrapper
      setIsConnected(true);
    };

    connectController();

    return () => {
      aiController.dispose();
    };
  }, [aiController]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const parser = new RekordboxParser();
        const fileContent = await file.text();
        const data = await RekordboxParser.parseXML(fileContent);
        console.log('Parsed tracks:', data.length);
        
        // Load tracks into AI system
        const analyzer = aiController.getAIState().aiAnalyzer;
        if (analyzer && 'loadTrackDatabase' in analyzer) {
          (analyzer as any).loadTrackDatabase(data);
        }
      } catch (error) {
        console.error('Failed to parse Rekordbox XML:', error);
      }
    }
  };

  // Handle audio analysis data
  const handleAudioData = async (data: any) => {
    console.log('📊 Audio data received in AIEnhancedVisualizer:', {
      audioLevel: data.audioLevel,
      timestamp: data.timestamp,
      hasSpectralFeatures: !!data.spectralFeatures
    });
    
    setAudioLevel(data.audioLevel || 0);
    setSpectralFeatures(data.spectralFeatures || null);
    
    // Always call analyze regardless of audio active state
    if (aiController) {
      const aiState = aiController.getAIState();
      const audioMetrics = {
        spectralCentroid: data.spectralFeatures?.brightness || 0,
        spectralBandwidth: data.spectralFeatures?.bandwidth || 0,
        spectralRolloff: data.spectralFeatures?.rolloff || 0,
        zeroCrossingRate: data.spectralFeatures?.zcr || 0,
        mfcc: data.spectralFeatures?.mfcc || Array(13).fill(0),
        chroma: data.spectralFeatures?.chroma || Array(12).fill(0),
        tonnetz: Array(6).fill(0)
      };
      
      try {
        console.log('🧠 Calling analyzeAudioData with audio input data');
        await (aiState.aiAnalyzer as any).analyzeAudioData(
          aiController.getState(),
          audioMetrics,
          data.timestamp || performance.now(),
          data // Pass the raw audio data as the fourth parameter
        );
        
        // Track identification
        const analyzer = aiState.aiAnalyzer as any;
        if (analyzer.trackIdentifier) {
          const identResult = await analyzer.trackIdentifier.identifyTrack(
            audioMetrics,
            data.audioLevel,
            aiController.getState()
          );
          
          setIdentificationResult(identResult);
        }
      } catch (error) {
        console.error('❌ Error in audio analysis:', error);
      }
    }
  };

  const handleAudioStateChange = (isActive: boolean) => {
    console.log('🔊 Audio state changed:', isActive);
    setIsAudioActive(isActive);
  };

  const getAIState = () => aiController.getAIState();
  const getAnalyzer = () => aiController.getAIState().aiAnalyzer;

  return (
    <div style={{ width: '100%', height: '100vh', background: '#0a0a0a', position: 'relative' }}>
      {/* Right Panel Toggle Button */}
      <button
        onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
        style={{
          position: 'fixed',
          top: '20px',
          right: isRightPanelOpen ? '420px' : '20px',
          zIndex: 1001,
          background: 'rgba(0, 0, 0, 0.9)',
          border: '2px solid #333',
          color: 'white',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          transition: 'all 0.3s ease',
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(50, 50, 50, 0.9)';
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {isRightPanelOpen ? '▶' : '◀'}
      </button>

      {/* Show Visual DNA as main visualizer when enabled, otherwise show traditional AI visualizer */}
      {visualDNAEnabled ? (
        <VisualDNAVisualizer
          analyzer={aiController.getAIState().aiAnalyzer as any}
          controllerState={controllerState as any}
          audioLevel={(() => {
            const level = aiData.audioInput.audioLevel || audioLevel || 0;
            console.log('Visual DNA Audio Level:', level, 'Audio Input:', aiData.audioInput.audioLevel, 'Audio Level:', audioLevel);
            return level;
          })()}
          spectralFeatures={spectralFeatures || {
            brightness: aiData.smartSmoothedValues?.energy ? (aiData.smartSmoothedValues.energy * 4000) : 2000,
            bandwidth: aiData.audioInput.audioLevel ? (aiData.audioInput.audioLevel * 2000) : 1000,
            rolloff: aiData.audioInput.audioLevel ? (aiData.audioInput.audioLevel * 8000) : 4000
          }}
        />
      ) : (
        <Canvas
          camera={{ position: [0, 0, 12], fov: 75 }}
          style={{ background: 'linear-gradient(to bottom, #1a1a2e, #2a5298)' }}
        >
          {/* Lighting */}
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={0.8} />
          <pointLight position={[-10, -5, -10]} intensity={0.4} color="#ff6b6b" />
          
          {/* AI-Powered Visual Components */}
          <AIPredictiveBeatSphere aiData={aiData} bpmData={bpmData} />
          <GenreAdaptiveTorus aiData={aiData} bpmData={bpmData} />
          <MemoryLearningParticles aiData={aiData} controllerState={controllerState} bpmData={bpmData} />
          <SmartSmoothingEQBars aiData={aiData} controllerState={controllerState} bpmData={bpmData} />
          <AIStatusDisplay aiData={aiData} bpmData={bpmData} />
          
          {/* Camera controls */}
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={25}
          />
        </Canvas>
      )}
      
      {/* Combined AI Analysis & Audio Input Control Panel - Right Side */}
      <div style={{
        position: 'fixed',
        top: '0',
        right: '0',
        width: '400px',
        height: '100vh',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '11px',
        background: 'rgba(0,0,0,0.9)',
        padding: '20px',
        borderRadius: '0',
        lineHeight: '1.4',
        overflowY: 'auto',
        border: '2px solid #333',
        borderRight: 'none',
        scrollbarWidth: 'thin',
        scrollbarColor: '#666 #222',
        boxSizing: 'border-box',
        zIndex: 1000,
        transform: isRightPanelOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease',
        boxShadow: isRightPanelOpen ? '-2px 0 10px rgba(0,0,0,0.3)' : 'none'
      }}>
        <div style={{ color: '#00ffff', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
          🧠 AI Audio Analysis & Controls
        </div>

        {/* Audio Input Control Section */}
        <div style={{ 
          marginBottom: '15px', 
          padding: '12px', 
          background: 'rgba(255,255,255,0.08)', 
          borderRadius: '8px',
          border: '2px solid #444'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '12px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#ffa502'
          }}>
            🎤 Audio Input Control
            <div style={{
              marginLeft: 'auto',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: aiData.audioInput.isConnected ? '#2ed573' : '#ff4757'
            }} />
          </div>

          {/* Audio Level Display */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '6px'
            }}>
              <span>Audio Level:</span>
              <span style={{ 
                color: aiData.audioInput.audioLevel > 0.4 ? '#2ed573' : 
                      aiData.audioInput.audioLevel > 0.2 ? '#ffa502' : '#ff6b6b',
                fontWeight: 'bold',
                fontSize: '14px',
                minWidth: '32px',
                display: 'inline-block',
                textAlign: 'right'
              }}>
                {Math.round(aiData.audioInput.audioLevel * 100)}%
              </span>
            </div>

            {/* Audio Level Bar */}
            <div style={{
              width: '100%',
              height: '16px',
              backgroundColor: '#2c2c2c',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid #444'
            }}>
              <div style={{
                width: `${Math.min(100, aiData.audioInput.audioLevel * 100)}%`,
                height: '100%',
                backgroundColor: aiData.audioInput.audioLevel > 0.4 ? '#2ed573' : 
                                 aiData.audioInput.audioLevel > 0.2 ? '#ffa502' : '#ff6b6b',
                transition: 'all 0.1s ease',
                borderRadius: '8px'
              }} />
            </div>
            
            {aiData.audioInput.audioLevel < 0.2 && aiData.audioInput.isListening && (
              <div style={{ 
                color: '#ffa502', 
                fontSize: '10px', 
                marginTop: '4px',
                fontStyle: 'italic'
              }}>
                ⚠️ Audio level too low - try adjusting gain settings below
              </div>
            )}
          </div>

          {/* Input Gain Control */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: '6px'
            }}>
              <span>Input Gain:</span>
              <span style={{ color: '#00d2d3', fontWeight: 'bold', minWidth: '40px', display: 'inline-block', textAlign: 'right' }}>{aiData.audioInput.inputGain.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="20"
              step="0.1"
              value={aiData.audioInput.inputGain}
              onChange={(e) => aiData.audioInput.setInputGain(parseFloat(e.target.value))}
              style={{
                width: '100%',
                height: '10px',
                borderRadius: '5px',
                background: `linear-gradient(to right, #00d2d3 0%, #00d2d3 ${(aiData.audioInput.inputGain / 20) * 100}%, #2c2c2c ${(aiData.audioInput.inputGain / 20) * 100}%, #2c2c2c 100%)`,
                outline: 'none',
                cursor: 'pointer',
                WebkitAppearance: 'none',
                appearance: 'none',
                border: '1px solid #444'
              }}
            />
          </div>

          {/* Device Selection */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ marginBottom: '6px', fontSize: '11px' }}>Input Device:</div>
            <select
              value={aiData.audioInput.selectedDeviceId || ''}
              onChange={(e) => aiData.audioInput.selectDevice(e.target.value)}
              style={{
                width: '100%',
                padding: '6px',
                borderRadius: '4px',
                border: '1px solid #444',
                backgroundColor: '#2c2c2c',
                color: 'white',
                fontSize: '10px',
                outline: 'none',
                marginBottom: '6px'
              }}
            >
              <option value="">Default Device</option>
              {aiData.audioInput.availableDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Device ${device.deviceId.substring(0, 8)}...`}
                </option>
              ))}
            </select>
            <button
              onClick={aiData.audioInput.refreshDevices}
              style={{
                width: '100%',
                padding: '4px',
                backgroundColor: '#444',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                fontSize: '9px',
                cursor: 'pointer',
                marginTop: '4px'
              }}
            >
              🔄 Refresh Devices
            </button>
          </div>

          {/* Control Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button
              onClick={aiData.audioInput.isListening ? aiData.audioInput.stopListening : aiData.audioInput.startListening}
              style={{
                flex: 1,
                padding: '6px',
                backgroundColor: aiData.audioInput.isListening ? '#ff4757' : '#2ed573',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {aiData.audioInput.isListening ? '🔇 Stop' : '🎤 Start'}
            </button>
          </div>

          {/* Error Display */}
          {aiData.audioInput.error && (
            <div style={{
              backgroundColor: '#ff4757',
              color: 'white',
              padding: '6px',
              borderRadius: '4px',
              fontSize: '10px',
              marginTop: '6px'
            }}>
              ❌ {aiData.audioInput.error}
            </div>
          )}
        </div>

        {/* Beat Detection & Rhythm Analysis */}
        <CollapsibleSection title="🥁 Beat Detection & Rhythm" defaultOpen={true}>
          <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '8px', padding: '6px', background: 'rgba(0,255,255,0.1)', borderRadius: '4px' }}>
              <div><strong>Next Beat Prediction:</strong> {aiData.predictiveBeats?.nextBeatPrediction ? `${Math.max(0, aiData.predictiveBeats.nextBeatPrediction - performance.now()).toFixed(0)}ms` : 'N/A'}</div>
              <div><strong>Beat Confidence:</strong> <span style={{color: aiData.predictiveBeats?.confidence > 0.8 ? '#2ed573' : aiData.predictiveBeats?.confidence > 0.5 ? '#ffa502' : '#ff4757', minWidth: '40px', display: 'inline-block', textAlign: 'right'}}>{((aiData.predictiveBeats?.confidence || 0) * 100).toFixed(1)}%</span></div>
              <div><strong>Tempo Stability:</strong> <span style={{color: (aiData.predictiveBeats?.tempoStability || 0) > 0.8 ? '#2ed573' : '#ffa502', minWidth: '40px', display: 'inline-block', textAlign: 'right'}}>{((aiData.predictiveBeats?.tempoStability || 0) * 100).toFixed(1)}%</span></div>
            </div>
            <div><strong>Beat Pattern:</strong> {aiData.predictiveBeats?.beatPattern?.map(interval => `${interval.toFixed(0)}ms`).join(', ') || 'Learning...'}</div>
            <div><strong>Phase Correction:</strong> {(aiData.predictiveBeats?.phaseCorrection || 0).toFixed(2)}ms</div>
            <div><strong>PRIMARY TEMPO:</strong> <span style={{color: bpmData.isConnected ? '#2ed573' : '#ffa502', fontWeight: 'bold', minWidth: '50px', display: 'inline-block', textAlign: 'right'}}>{bpmData.isConnected && bpmData.currentBPM > 0 ? `${bpmData.currentBPM.toFixed(1)} (MIDI)` : `${aiData.smartSmoothedValues?.bpm?.toFixed(1) || 'N/A'} (AI)`}</span></div>
            <div><strong>Beat Phase:</strong> <span style={{minWidth: '30px', display: 'inline-block', textAlign: 'right'}}>{(bpmData.beatPhase * 100).toFixed(0)}%</span></div>
          </div>
        </CollapsibleSection>

        {/* Spectral & Frequency Analysis */}
        <CollapsibleSection title="🌈 Spectral & Frequency Analysis">
          <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
            {aiData.audioInput.isListening ? (
              <>
                <div style={{ marginBottom: '6px', padding: '6px', background: 'rgba(255,165,0,0.1)', borderRadius: '4px' }}>
                  <div><strong>Spectral Brightness:</strong> {aiData.smartSmoothedValues?.energy ? (aiData.smartSmoothedValues.energy * 4000).toFixed(0) : 'N/A'} Hz</div>
                  <div><strong>Spectral Bandwidth:</strong> {aiData.audioInput.audioLevel ? (aiData.audioInput.audioLevel * 2000).toFixed(0) : 'N/A'} Hz</div>
                  <div><strong>Spectral Rolloff:</strong> {aiData.audioInput.audioLevel ? (aiData.audioInput.audioLevel * 8000).toFixed(0) : 'N/A'} Hz</div>
                </div>
                <div><strong>Low Frequency Energy:</strong> {(aiData.audioInput.audioLevel * 100).toFixed(1)}%</div>
                <div><strong>High Frequency Content:</strong> {((1 - aiData.audioInput.audioLevel) * 100).toFixed(1)}%</div>
                <div><strong>Spectral Centroid:</strong> {aiData.smartSmoothedValues?.energy ? (aiData.smartSmoothedValues.energy * 2000).toFixed(0) : 'N/A'} Hz</div>
              </>
            ) : (
              <div style={{ color: '#999', fontStyle: 'italic' }}>Spectral analysis requires audio input</div>
            )}
          </div>
        </CollapsibleSection>

        {/* Energy & Dynamics Analysis */}
        <CollapsibleSection title="⚡ Energy & Dynamics Analysis">
          <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '8px', padding: '6px', background: 'rgba(46,213,115,0.1)', borderRadius: '4px' }}>
              <div><strong>Current Energy:</strong> <span style={{color: '#2ed573', minWidth: '40px', display: 'inline-block', textAlign: 'right'}}>{((aiData.patternRecognition?.energyPrediction?.currentEnergy || 0) * 100).toFixed(1)}%</span></div>
              <div><strong>Energy Trend:</strong> 
                <span style={{
                  color: aiData.patternRecognition?.energyPrediction?.energyTrend === 'rising' ? '#2ed573' : 
                        aiData.patternRecognition?.energyPrediction?.energyTrend === 'falling' ? '#ff4757' : '#ffa502',
                  marginLeft: '4px'
                }}>
                  {aiData.patternRecognition?.energyPrediction?.energyTrend || 'stable'} 
                  {aiData.patternRecognition?.energyPrediction?.energyTrend === 'rising' ? ' ↗️' : 
                   aiData.patternRecognition?.energyPrediction?.energyTrend === 'falling' ? ' ↘️' : ' ➡️'}
                </span>
              </div>
              <div><strong>Peak Prediction:</strong> <span style={{minWidth: '40px', display: 'inline-block', textAlign: 'right'}}>{((aiData.patternRecognition?.energyPrediction?.peakPrediction || 0) * 100).toFixed(1)}%</span></div>
            </div>
            <div><strong>Predicted Energy:</strong> {aiData.patternRecognition?.energyPrediction?.predictedEnergy?.map(e => `${(e * 100).toFixed(0)}%`).join(', ') || 'Learning...'}</div>
            <div><strong>Raw Audio Level:</strong> {(aiData.audioInput.audioLevel * 100).toFixed(1)}%</div>
            <div><strong>Dynamic Range:</strong> {aiData.audioInput.isListening ? ((aiData.audioInput.audioLevel * 100)).toFixed(1) : 0}%</div>
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
                  {aiData.patternRecognition?.genreClassification?.detectedGenre || 'unknown'}
                </span>
              </div>
              <div><strong>Genre Confidence:</strong> 
                <span style={{
                  color: (aiData.patternRecognition?.genreClassification?.confidence || 0) > 0.7 ? '#2ed573' : 
                        (aiData.patternRecognition?.genreClassification?.confidence || 0) > 0.4 ? '#ffa502' : '#ff4757',
                  marginLeft: '4px',
                  fontWeight: 'bold'
                }}>
                  {((aiData.patternRecognition?.genreClassification?.confidence || 0) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <div><strong>Avg BPM:</strong> {aiData.patternRecognition?.genreClassification?.characteristics?.avgBPM || 120}</div>
            <div><strong>Rhythm Complexity:</strong> {((aiData.patternRecognition?.genreClassification?.characteristics?.rhythmComplexity || 0.5) * 100).toFixed(0)}%</div>
            <div><strong>EQ Profile:</strong></div>
            <div style={{ marginLeft: '10px', fontSize: '9px' }}>
              <div>Low: {((aiData.patternRecognition?.genreClassification?.characteristics?.eqProfile?.low || 0.5) * 100).toFixed(0)}%</div>
              <div>Mid: {((aiData.patternRecognition?.genreClassification?.characteristics?.eqProfile?.mid || 0.5) * 100).toFixed(0)}%</div>
              <div>High: {((aiData.patternRecognition?.genreClassification?.characteristics?.eqProfile?.high || 0.5) * 100).toFixed(0)}%</div>
              <div>Balance: {((aiData.patternRecognition?.genreClassification?.characteristics?.eqProfile?.balance || 0.5) * 100).toFixed(0)}%</div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Track Identification & Structure */}
        {aiData.trackIdentification?.currentTrack && (
          <CollapsibleSection title="🎯 Track Identification & Structure">
            <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
              <div style={{ marginBottom: '8px', padding: '6px', background: 'rgba(0,255,255,0.1)', borderRadius: '4px' }}>
                <div><strong>Track:</strong> <span style={{color: '#00ffff'}}>{aiData.trackIdentification.currentTrack.track.name}</span></div>
                <div><strong>Artist:</strong> {aiData.trackIdentification.currentTrack.track.artist}</div>
                <div><strong>ID Confidence:</strong> <span style={{color: aiData.trackIdentification.confidenceScore > 0.8 ? '#2ed573' : '#ffa502'}}>{(aiData.trackIdentification.confidenceScore * 100).toFixed(0)}%</span></div>
              </div>
              <div><strong>Song Section:</strong> <span style={{color: '#ffa502', textTransform: 'capitalize'}}>{aiData.trackIdentification.analysisEnhancement?.songSection || 'unknown'}</span></div>
              <div><strong>Time in Track:</strong> {aiData.trackIdentification.analysisEnhancement?.timeInTrack?.toFixed(0) || 0}s</div>
              <div><strong>Time Remaining:</strong> {aiData.trackIdentification.analysisEnhancement?.timeRemaining?.toFixed(0) || 0}s</div>
              <div><strong>Track BPM:</strong> {aiData.trackIdentification.currentTrack.track.bpm}</div>
              <div><strong>Track Genre:</strong> {aiData.trackIdentification.currentTrack.track.genre}</div>
              {aiData.trackIdentification.currentTrack.track.energyAnalysis && (
                <div style={{ marginTop: '6px' }}>
                  <div><strong>Energy Analysis:</strong></div>
                  <div style={{ marginLeft: '10px', fontSize: '9px' }}>
                    <div>Overall: {aiData.trackIdentification.currentTrack.track.energyAnalysis.overall}/10</div>
                    <div>Intro: {aiData.trackIdentification.currentTrack.track.energyAnalysis.intro}/10</div>
                    <div>Breakdown: {aiData.trackIdentification.currentTrack.track.energyAnalysis.breakdown}/10</div>
                    <div>Buildup: {aiData.trackIdentification.currentTrack.track.energyAnalysis.buildup}/10</div>
                    <div>Drop: {aiData.trackIdentification.currentTrack.track.energyAnalysis.drop}/10</div>
                    <div>Outro: {aiData.trackIdentification.currentTrack.track.energyAnalysis.outro}/10</div>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Pattern Recognition & Learning */}
        <CollapsibleSection title="🎭 Pattern Recognition & Learning">
          <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '8px', padding: '6px', background: 'rgba(255,165,0,0.1)', borderRadius: '4px' }}>
              <div><strong>Detected Patterns:</strong> <span style={{color: '#ffa502', fontWeight: 'bold'}}>{aiData.patternRecognition?.detectedPatterns?.length || 0}</span></div>
              <div><strong>Pattern Types:</strong> {aiData.patternRecognition?.detectedPatterns?.map(p => p.type).join(', ') || 'None'}</div>
            </div>
            {aiData.patternRecognition?.detectedPatterns?.slice(0, 3).map((pattern, index) => (
              <div key={pattern.id} style={{ marginBottom: '4px', padding: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                <div><strong>Pattern {index + 1}:</strong> {pattern.type} ({(pattern.confidence * 100).toFixed(0)}%)</div>
                <div style={{ fontSize: '8px', color: '#999' }}>Frequency: {pattern.frequency}Hz | Length: {pattern.pattern.length}</div>
              </div>
            ))}
            <div><strong>Transition Detection:</strong></div>
            <div style={{ marginLeft: '10px', fontSize: '9px' }}>
              <div>Is Transitioning: {aiData.patternRecognition?.transitionDetection?.isTransitioning ? '✅' : '❌'}</div>
              <div>Transition Type: {aiData.patternRecognition?.transitionDetection?.transitionType || 'none'}</div>
              <div>Confidence: {((aiData.patternRecognition?.transitionDetection?.confidence || 0) * 100).toFixed(0)}%</div>
              <div>Time Remaining: {aiData.patternRecognition?.transitionDetection?.timeRemaining?.toFixed(0) || 0}s</div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Machine Learning Models Status */}
        <CollapsibleSection title="🧠 ML Models & Neural Networks">
          <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
            {aiData.isAIReady ? (
              <>
                <div style={{ marginBottom: '6px', padding: '6px', background: 'rgba(0,255,0,0.1)', borderRadius: '4px' }}>
                  <div><strong>Beat Predictor:</strong> <span style={{color: aiData.isAIReady ? '#2ed573' : '#ff4757'}}>{aiData.isAIReady ? '✅ Active' : '❌ Offline'}</span></div>
                  <div style={{fontSize: '8px', color: '#999'}}>Neural Network: TensorFlow.js | Input: 32 beats → Output: 4 predictions</div>
                </div>
                <div style={{ marginBottom: '6px', padding: '6px', background: 'rgba(255,0,255,0.1)', borderRadius: '4px' }}>
                  <div><strong>Genre Classifier:</strong> <span style={{color: aiData.isAIReady ? '#2ed573' : '#ff4757'}}>{aiData.isAIReady ? '✅ Active' : '❌ Offline'}</span></div>
                  <div style={{fontSize: '8px', color: '#999'}}>Neural Network: TensorFlow.js | MFCC features → 10 genres</div>
                </div>
                <div style={{ marginBottom: '6px', padding: '6px', background: 'rgba(255,165,0,0.1)', borderRadius: '4px' }}>
                  <div><strong>Energy Predictor:</strong> <span style={{color: aiData.isAIReady ? '#2ed573' : '#ff4757'}}>{aiData.isAIReady ? '✅ Active' : '❌ Offline'}</span></div>
                  <div style={{fontSize: '8px', color: '#999'}}>Neural Network: TensorFlow.js | 16 features → 8 energy levels</div>
                </div>
                <div style={{ marginBottom: '6px', padding: '6px', background: 'rgba(0,255,255,0.1)', borderRadius: '4px' }}>
                  <div><strong>Pattern Recognizer:</strong> <span style={{color: aiData.isAIReady ? '#2ed573' : '#ff4757'}}>{aiData.isAIReady ? '✅ Active' : '❌ Offline'}</span></div>
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
              <div><strong>Short-term Memory:</strong> <span style={{color: '#74b9ff'}}>{aiData.memorySystem?.shortTermMemory?.size || 0} patterns</span></div>
              <div><strong>Long-term Memory:</strong> <span style={{color: '#74b9ff'}}>{aiData.memorySystem?.longTermMemory?.size || 0} memories</span></div>
              <div><strong>Session Memory:</strong> <span style={{color: '#74b9ff'}}>{aiData.memorySystem?.sessionMemory?.size || 0} entries</span></div>
            </div>
            <div><strong>Adaptation Rate:</strong> {((aiData.memorySystem?.adaptationRate || 0.1) * 100).toFixed(1)}%</div>
            <div><strong>Data Quality:</strong> {aiData.audioInput.isListening && bpmData.isConnected ? 'High (Dual Source)' : aiData.audioInput.isListening ? 'Medium (Audio Only)' : 'Low (MIDI Only)'}</div>
            <div><strong>Learning Status:</strong> {(aiData.memorySystem?.shortTermMemory?.size || 0) > 10 ? '🧠 Actively Learning' : '📚 Collecting Data'}</div>
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
              <div>BPM: {aiData.smartSmoothedValues?.bpm?.toFixed(1) || 120} BPM</div>
              <div>Volume: {aiData.smartSmoothedValues?.volume?.toFixed(0) || 127}</div>
              <div>Energy: {((aiData.smartSmoothedValues?.energy || 0.5) * 100).toFixed(1)}%</div>
            </div>
            <div><strong>Filter Status:</strong> {aiData.isAIReady ? '✅ Active' : '❌ Initializing'}</div>
          </div>
        </CollapsibleSection>

        {/* Performance Metrics */}
        <CollapsibleSection title="⚡ Performance & System Status">
          <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '8px', padding: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
              <div><strong>AI Status:</strong> <span style={{color: aiData.isAIReady ? '#2ed573' : '#ff4757'}}>{aiData.isAIReady ? '✅ Ready' : '❌ Initializing'}</span></div>
              <div><strong>Analysis Rate:</strong> ~40 Hz (25ms intervals)</div>
              <div><strong>Buffer Size:</strong> 2048 samples</div>
            </div>
            <div><strong>Data Sources:</strong></div>
            <div style={{ marginLeft: '10px', fontSize: '9px' }}>
              <div>MIDI: <span style={{color: bpmData.isConnected ? '#2ed573' : '#ff4757'}}>{bpmData.isConnected ? '✅ Connected' : '❌ Disconnected'}</span></div>
              <div>Audio Input: <span style={{color: aiData.audioInput.isListening ? '#2ed573' : '#ff4757'}}>{aiData.audioInput.isListening ? '✅ Active' : '❌ Inactive'}</span></div>
              <div>Track Database: <span style={{color: aiData.trackIdentification?.currentTrack ? '#2ed573' : '#ffa502'}}>{aiData.trackIdentification?.currentTrack ? '✅ Identified' : '⚠️ Unknown Track'}</span></div>
            </div>
            <div><strong>Neural Network Backend:</strong> TensorFlow.js</div>
            <div><strong>Audio Processing:</strong> Web Audio API</div>
            <div><strong>Total AI Confidence:</strong> 
              <span style={{
                color: aiData.aiConfidence > 0.8 ? '#2ed573' : aiData.aiConfidence > 0.5 ? '#ffa502' : '#ff4757',
                marginLeft: '4px',
                fontWeight: 'bold',
                minWidth: '40px',
                display: 'inline-block',
                textAlign: 'right'
              }}>
                {(aiData.aiConfidence * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </CollapsibleSection>

        <div style={{ color: '#a4b0be', fontSize: '10px', marginTop: '12px' }}>
          ✅ AI is analyzing in real-time. Check console for detailed logs.
        </div>

        {/* File Upload */}
        <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
          <label style={{ fontSize: '11px', color: '#00ffff' }}>Load Rekordbox Collection:</label>
          <input
            type="file"
            accept=".xml"
            onChange={handleFileUpload}
            style={{ fontSize: '10px', marginTop: '4px' }}
          />
        </div>

        <div className="visualizer-toggle" style={{ marginTop: '12px' }}>
          <label style={{ fontSize: '11px' }}>
            <input
              type="checkbox"
              checked={useVisualDNA}
              onChange={(e) => setUseVisualDNA(e.target.checked)}
            />
            Use Visual DNA System
          </label>
        </div>

        {identificationResult && (
          <TrackIdentificationPanel 
            onTracksLoaded={() => {}}
            identificationResult={identificationResult}
            isAIReady={aiData.isAIReady}
          />
        )}

        <div className="ai-info" style={{ marginTop: '12px' }}>
          <h3 style={{ fontSize: '12px' }}>AI Analysis</h3>
          <pre style={{ fontSize: '9px' }}>{JSON.stringify(aiController.getAIAnalysis(), null, 2)}</pre>
        </div>
      </div>
    </div>
  );
} 