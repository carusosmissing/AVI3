import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box, Sphere, Torus } from '@react-three/drei';
import * as THREE from 'three';
import { DDJControllerState, VisualParams } from '../types';
import { useAIAudioAnalyzer } from '../hooks/useAIAudioAnalyzer';
import { DDJFlx4Controller } from '../controllers/ddj-flx4-controller';
import useMIDIBPM from '../hooks/useMIDIBPM';
import AudioInputPanel from './audio-input-panel';
import { Track } from '../types';

interface AIEnhancedVisualizerProps {
  controller: DDJFlx4Controller | null;
  controllerState: DDJControllerState;
  visualParams: VisualParams;
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
function MemoryLearningParticles({ aiData, controllerState, bpmData }: { aiData: any, controllerState: DDJControllerState, bpmData: any }) {
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
function SmartSmoothingEQBars({ aiData, controllerState, bpmData }: { aiData: any, controllerState: DDJControllerState, bpmData: any }) {
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
  visualParams 
}: AIEnhancedVisualizerProps) {
  // Get traditional BPM data
  const bpmData = useMIDIBPM();
  
  // Get AI analysis
  const aiData = useAIAudioAnalyzer(controller);

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
      
      {/* AI Debug Panel with Audio Controls */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '11px',
        background: 'rgba(0,0,0,0.8)',
        padding: '15px',
        borderRadius: '8px',
        maxWidth: '350px',
        lineHeight: '1.4',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div style={{ color: '#00ffff', fontWeight: 'bold', marginBottom: '8px' }}>
          🧠 AI Audio Analysis & Controls
        </div>
        
        {/* Audio Input Controls Section */}
        <div style={{ 
          marginBottom: '15px', 
          padding: '10px', 
          background: 'rgba(255,255,255,0.05)', 
          borderRadius: '6px',
          border: '1px solid #333'
        }}>
          <div style={{ color: '#ffa502', fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}>
            🎤 Audio Input Control
          </div>
          
          <div style={{ marginBottom: '8px', fontSize: '10px' }}>
            <span style={{ color: '#ccc' }}>Status: </span>
            <span style={{ color: aiData.audioInput.isListening ? '#2ed573' : '#ff4757' }}>
              {aiData.audioInput.isListening ? '🔴 LISTENING' : '⚫ STOPPED'}
            </span>
          </div>
          
          <div style={{ marginBottom: '8px', fontSize: '10px' }}>
            <span style={{ color: '#ccc' }}>Audio Level: </span>
            <span style={{ 
              color: aiData.audioInput.audioLevel > 0.4 ? '#2ed573' : 
                    aiData.audioInput.audioLevel > 0.2 ? '#ffa502' : '#ff6b6b' 
            }}>
              {Math.round(aiData.audioInput.audioLevel * 100)}%
            </span>
            {aiData.audioInput.isListening && aiData.audioInput.audioLevel === 0 && (
              <span style={{ color: '#ffa502', marginLeft: '8px', fontSize: '9px' }}>
                (No signal detected)
              </span>
            )}
          </div>
          
          <div style={{ marginBottom: '8px', fontSize: '10px' }}>
            <span style={{ color: '#ccc' }}>Input Gain: </span>
            <span style={{ color: '#00d2d3' }}>{aiData.audioInput.inputGain.toFixed(1)}x</span>
            <span style={{ color: '#ccc', marginLeft: '10px' }}>Sensitivity: </span>
            <span style={{ color: '#00d2d3' }}>{aiData.audioInput.sensitivity.toFixed(1)}x</span>
          </div>
          
          <div style={{ marginBottom: '8px', fontSize: '9px', color: '#888' }}>
            Device: {aiData.audioInput.selectedDeviceId ? 
              (aiData.audioInput.availableDevices.find(d => d.deviceId === aiData.audioInput.selectedDeviceId)?.label || 'Selected') : 
              'Default'} ({aiData.audioInput.availableDevices.length} available)
          </div>
          
          <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
            <button
              onClick={aiData.audioInput.isListening ? aiData.audioInput.stopListening : aiData.audioInput.startListening}
              style={{
                flex: 1,
                padding: '4px 8px',
                backgroundColor: aiData.audioInput.isListening ? '#ff4757' : '#2ed573',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '9px',
                cursor: 'pointer'
              }}
            >
              {aiData.audioInput.isListening ? 'Stop' : 'Start'}
            </button>
            <button
              onClick={() => aiData.audioInput.setInputGain(3.0)}
              style={{
                padding: '4px 8px',
                backgroundColor: '#555',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '9px',
                cursor: 'pointer'
              }}
            >
              Boost
            </button>
            <button
              onClick={aiData.audioInput.refreshDevices}
              style={{
                padding: '4px 8px',
                backgroundColor: '#4ecdc4',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '9px',
                cursor: 'pointer'
              }}
            >
              🔄
            </button>
          </div>
          
          {aiData.audioInput.availableDevices.length > 0 && (
            <select
              value={aiData.audioInput.selectedDeviceId || ''}
              onChange={(e) => aiData.audioInput.selectDevice(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '4px',
                padding: '4px',
                fontSize: '9px',
                fontFamily: 'monospace',
                marginBottom: '6px'
              }}
            >
              <option value="" style={{ background: '#000' }}>Default Device</option>
              {aiData.audioInput.availableDevices.map((device, index) => {
                const deviceName = device.label || `Device ${index + 1}`;
                return (
                  <option key={device.deviceId} value={device.deviceId} style={{ background: '#000' }}>
                    {deviceName}
                  </option>
                );
              })}
            </select>
          )}
          
          {aiData.audioInput.error && (
            <div style={{ 
              fontSize: '9px', 
              color: '#ff4757', 
              fontStyle: 'italic'
            }}>
              ⚠️ {aiData.audioInput.error}
            </div>
          )}
        </div>
        
        <div style={{ marginBottom: '4px' }}>
          <strong>AI Ready:</strong> {aiData.isAIReady ? '✅' : '❌'}
        </div>
        
        <div style={{ marginBottom: '4px' }}>
          <strong>Genre Detection:</strong> {aiData.aiInsights.detectedGenre} ({(aiData.aiConfidence * 100).toFixed(1)}%)
        </div>
        
        <div style={{ marginBottom: '4px' }}>
          <strong>Energy Trend:</strong> {aiData.aiInsights.energyTrend}
        </div>
        
        <div style={{ marginBottom: '4px' }}>
          <strong>Patterns Detected:</strong> {aiData.patternRecognition.detectedPatterns.length}
        </div>
        
        <div style={{ marginBottom: '4px' }}>
          <strong>Memory (S/L):</strong> {aiData.memorySystem.shortTermMemory.size || 0}/{aiData.memorySystem.longTermMemory.size || 0}
        </div>
        
        <div style={{ marginBottom: '4px' }}>
          <strong>Tempo Stability:</strong> {(aiData.aiInsights.tempoStability * 100).toFixed(1)}%
        </div>
        
        <div style={{ marginBottom: '4px' }}>
          <strong>MIDI BPM:</strong> {bpmData.isConnected ? '✅' : '❌'} {bpmData.currentBPM.toFixed(1)} BPM
        </div>
        
        <div style={{ marginBottom: '4px' }}>
          <strong>Audio Input:</strong> {aiData.audioInput.isListening ? '✅' : '❌'} {aiData.audioInput.isConnected ? 'Connected' : 'Disconnected'}
        </div>
        
        <div style={{ marginBottom: '4px', color: (aiData.audioInput.isListening && bpmData.isConnected) ? '#00ff00' : '#ffaa00' }}>
          <strong>Dual Source AI:</strong> {(aiData.audioInput.isListening && bpmData.isConnected) ? '✅ Enhanced Analysis' : '❌ Single Source'}
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          <strong>Beat Phase:</strong> {(bpmData.beatPhase * 100).toFixed(0)}%
        </div>
        
        {aiData.trackIdentification?.currentTrack && (
          <>
            <div style={{ marginBottom: '4px', color: '#00ffff' }}>
              <strong>🎵 Identified Track:</strong> {aiData.trackIdentification.currentTrack.track.name}
            </div>
            <div style={{ marginBottom: '4px' }}>
              <strong>Track Confidence:</strong> {(aiData.trackIdentification.confidenceScore * 100).toFixed(0)}%
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Song Section:</strong> {aiData.trackIdentification.analysisEnhancement?.songSection || 'unknown'}
            </div>
          </>
        )}
        
        <div style={{ color: '#ffaa00', fontSize: '10px' }}>
          💡 {aiData.trackIdentification?.currentTrack ? 
            'AI is using track database for enhanced analysis!' :
            (aiData.audioInput.isListening && bpmData.isConnected) ? 
            'Load tracks for even smarter AI analysis!' : 
            'Connect MIDI + audio + load tracks for maximum AI power!'}
        </div>
              </div>

    </div>
  );
} 