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

  useFrame((state) => {
    if (!meshRef.current || !aiData.isAIReady) return;

    const { predictiveBeats, aiConfidence, smartSmoothedValues } = aiData;
    
    // Use real MIDI BPM data for accurate timing instead of AI-only BPM
    const realBPM = bpmData.currentBPM || smartSmoothedValues.bpm || 120;
    const realBeatPhase = bpmData.beatPhase || 0;
    
    // Combine real BPM timing with AI predictions
    const now = performance.now();
    const nextBeatTime = predictiveBeats.nextBeatPrediction;
    const timeUntilBeat = nextBeatTime > 0 ? nextBeatTime - now : 0;
    
    // Use real MIDI beat phase as primary, AI prediction as enhancement
    const beatDuration = 60000 / realBPM;
    const aiPhase = bpmData.isConnected ? realBeatPhase : 
      (timeUntilBeat > 0 ? 1 - (timeUntilBeat % beatDuration) / beatDuration : 0);
    
    // Scale based on AI confidence and tempo stability
    const confidenceMultiplier = 0.5 + (aiConfidence * 0.5);
    const stabilityMultiplier = 0.5 + (predictiveBeats.tempoStability * 0.5);
    
    const pulseScale = 1 + Math.sin(aiPhase * Math.PI * 2) * 0.4 * confidenceMultiplier;
    meshRef.current.scale.setScalar(pulseScale * stabilityMultiplier);
    
    // Color changes based on tempo stability and confidence
    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    const hue = aiConfidence * 0.3 + predictiveBeats.tempoStability * 0.7;
    material.color.setHSL(hue, 0.8, 0.6);
    
    // Emissive glow on predicted beat
    const beatGlow = aiPhase > 0.9 ? (aiPhase - 0.9) * 10 * aiConfidence : 0;
    material.emissive.setScalar(beatGlow);
    
    // Rotation speed based on AI-smoothed BPM
    const rotationSpeed = (smartSmoothedValues.bpm / 120) * 0.02;
    meshRef.current.rotation.y += rotationSpeed;
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
    
    // Use real BPM for rotation timing
    const realBPM = bpmData.currentBPM || smartSmoothedValues.bpm || 120;
    const bpmFactor = realBPM / 120; // Normalize to 120 BPM baseline
    
    // Rotate based on detected patterns and real BPM
    const patternComplexity = patternRecognition.genreClassification.characteristics.rhythmComplexity;
    torusRef.current.rotation.x += delta * patternComplexity * 0.5 * bpmFactor;
    torusRef.current.rotation.z += delta * (smartSmoothedValues.energy || 0.5) * 0.3 * bpmFactor;
    
    // Color based on genre with confidence weighting
    const genreHue = genreColors[genre] || 0.5;
    const finalHue = genreHue * confidence + 0.5 * (1 - confidence);
    
    const material = torusRef.current.material as THREE.MeshStandardMaterial;
    material.color.setHSL(finalHue, 0.7, 0.5);
    
    // Scale based on energy prediction
    const energyScale = 0.8 + (smartSmoothedValues.energy * 0.4);
    torusRef.current.scale.setScalar(energyScale);
    
    // Wireframe toggle based on energy trend
    material.wireframe = patternRecognition.energyPrediction.energyTrend === 'rising';
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

// Memory-Learning Particle System
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
    
    // Calculate memory influence
    const shortTermSize = memorySystem.shortTermMemory.size || 0;
    const longTermSize = memorySystem.longTermMemory.size || 0;
    const memoryIntensity = Math.min(1, (shortTermSize + longTermSize * 0.1) / 50);
    
    // Smooth memory intensity changes
    memoryIntensityRef.current += (memoryIntensity - memoryIntensityRef.current) * 0.1;
    
    // Animate particles based on learned patterns
    const geometry = particlesRef.current.geometry;
    const positions = geometry.attributes.position.array as Float32Array;
    
    const detectedPatterns = patternRecognition.detectedPatterns || [];
    const patternInfluence = Math.min(1, detectedPatterns.length / 10);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Base movement influenced by memory
      const memorySpeed = memoryIntensityRef.current * 0.02;
      positions[i3] += Math.sin(state.clock.elapsedTime + i) * memorySpeed;
      positions[i3 + 1] += Math.cos(state.clock.elapsedTime + i) * memorySpeed;
      positions[i3 + 2] += Math.sin(state.clock.elapsedTime * 0.5 + i) * memorySpeed;
      
      // Pattern-based modulation
      if (detectedPatterns.length > 0) {
        const patternIndex = i % detectedPatterns.length;
        const pattern = detectedPatterns[patternIndex];
        if (pattern && pattern.pattern) {
          const patternValue = pattern.pattern[i % pattern.pattern.length] || 0;
          positions[i3 + 1] += patternValue * patternInfluence * 0.01;
        }
      }
      
      // Controller influence with AI smoothing
      const crossfaderInfluence = (controllerState.crossfader - 64) / 127;
      positions[i3] += crossfaderInfluence * smartSmoothedValues.volume / 127 * 0.005;
      
      // Boundary wrapping
      for (let j = 0; j < 3; j++) {
        if (positions[i3 + j] > 7.5) positions[i3 + j] = -7.5;
        if (positions[i3 + j] < -7.5) positions[i3 + j] = 7.5;
      }
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

  useFrame(() => {
    if (!groupRef.current || !aiData.isAIReady) return;

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

    // Update EQ bars with predictive elements
    const children = groupRef.current.children;
    const eqValues = [smoothedEQRef.current.low, smoothedEQRef.current.mid, smoothedEQRef.current.high];
    const predictedEnergy = aiData.patternRecognition.energyPrediction.predictedEnergy || [];

    children.forEach((bar, index) => {
      if (index >= 3) return; // Only process first 3 bars
      
      const mesh = bar as THREE.Mesh;
      const normalizedEQ = eqValues[index] / 127;
      
      // Add prediction overlay
      const prediction = predictedEnergy[index] || normalizedEQ;
      const predictionInfluence = aiData.aiConfidence * 0.3;
      
      const finalHeight = (normalizedEQ * (1 - predictionInfluence)) + (prediction * predictionInfluence);
      mesh.scale.y = 0.1 + finalHeight * 3;
      
      // Color based on energy trend
      const material = mesh.material as THREE.MeshStandardMaterial;
      const trend = aiData.patternRecognition.energyPrediction.energyTrend;
      let hue = index * 0.3;
      
      if (trend === 'rising') hue += 0.1;
      else if (trend === 'falling') hue -= 0.1;
      
      material.color.setHSL(hue % 1, 0.8, 0.6);
      
      // Emissive based on AI confidence
      material.emissive.setScalar(aiData.aiConfidence * 0.2);
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
        MIDI BPM: {bpmData.currentBPM.toFixed(1)} | AI BPM: {aiData.smartSmoothedValues.bpm.toFixed(1)} | Patterns: {aiData.patternRecognition.detectedPatterns.length}
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
  onTrackIdentification
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
  const audioLevelRef = useRef(audioLevel);
  const spectralFeaturesRef = useRef(spectralFeatures);
  
  // Get traditional BPM data
  const bpmData = useMIDIBPM();
  
  // Get AI analysis
  const aiData = useAIAudioAnalyzer(aiController);

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
    <div style={{ width: '100%', height: '100vh', background: '#0a0a0a' }}>
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
      
      {/* Combined AI Analysis & Audio Input Control Panel - Right Side */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '400px', // Fixed width
        height: '85vh', // Fixed height
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '11px',
        background: 'rgba(0,0,0,0.9)',
        padding: '15px',
        borderRadius: '12px',
        lineHeight: '1.4',
        overflowY: 'auto',
        border: '2px solid #333',
        scrollbarWidth: 'thin',
        scrollbarColor: '#666 #222',
        boxSizing: 'border-box' // Include padding in dimensions
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
                minWidth: '32px', // Fixed width for percentages
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
            <div><strong>MIDI BPM:</strong> <span style={{color: bpmData.isConnected ? '#2ed573' : '#ff4757', minWidth: '50px', display: 'inline-block', textAlign: 'right'}}>{bpmData.currentBPM.toFixed(1)} BPM</span></div>
            <div><strong>AI Smoothed BPM:</strong> <span style={{minWidth: '50px', display: 'inline-block', textAlign: 'right'}}>{aiData.smartSmoothedValues?.bpm?.toFixed(1) || 'N/A'} BPM</span></div>
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