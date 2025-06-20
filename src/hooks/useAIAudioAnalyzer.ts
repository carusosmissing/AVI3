import { useState, useEffect, useRef } from 'react';
import { RealTimeAudioAnalyzer } from '../ai/audio-analyzer';
import { DDJFlx4Controller } from '../controllers/ddj-flx4-controller';
import { useAudioInput } from './useAudioInput';
import { 
  AIAudioAnalyzer, 
  AdvancedMetrics, 
  PredictiveBeatDetection,
  PatternRecognition,
  MemorySystem,
  Track
} from '../types';

interface AIAudioAnalyzerHook {
  aiAnalyzer: AIAudioAnalyzer | null;
  isAIReady: boolean;
  predictiveBeats: PredictiveBeatDetection;
  patternRecognition: PatternRecognition;
  memorySystem: MemorySystem;
  aiConfidence: number;
  smartSmoothedValues: {
    bpm: number;
    volume: number;
    energy: number;
  };
  aiInsights: {
    detectedGenre: string;
    energyTrend: 'rising' | 'falling' | 'stable';
    nextBeatPrediction: number;
    tempoStability: number;
  };
  // Audio input integration
  audioInput: {
    isListening: boolean;
    isConnected: boolean;
    audioLevel: number;
    availableDevices: MediaDeviceInfo[];
    selectedDeviceId: string | null;
    startListening: () => Promise<void>;
    stopListening: () => void;
    selectDevice: (deviceId: string) => Promise<void>;
    refreshDevices: () => Promise<void>;
    error: string | null;
    inputGain: number;
    setInputGain: (gain: number) => void;
    sensitivity: number;
    setSensitivity: (sensitivity: number) => void;
  };
  // Track identification
  trackIdentification: any | null;
  loadTrackDatabase: (tracks: Track[]) => void;
}

export const useAIAudioAnalyzer = (controller: DDJFlx4Controller | null): AIAudioAnalyzerHook => {
  const [aiAnalyzer, setAIAnalyzer] = useState<RealTimeAudioAnalyzer | null>(null);
  const [isAIReady, setIsAIReady] = useState(false);
  const [aiState, setAIState] = useState<any>(null);
  const [smartSmoothedValues, setSmartSmoothedValues] = useState({
    bpm: 120,
    volume: 127,
    energy: 0.5
  });
  const [trackIdentification, setTrackIdentification] = useState<any>(null);

  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastAnalysisTime = useRef(0);
  
  // Initialize audio input
  const audioInput = useAudioInput();

  // Initialize AI analyzer
  useEffect(() => {
    const initializeAI = async () => {
      console.log('🤖 Initializing AI Audio Analyzer Hook...');
      
      try {
        const analyzer = new RealTimeAudioAnalyzer();
        setAIAnalyzer(analyzer);
        setIsAIReady(true);
        console.log('✅ AI Audio Analyzer Hook ready');
      } catch (error) {
        console.error('❌ Failed to initialize AI analyzer:', error);
        setIsAIReady(false);
      }
    };

    initializeAI();

    return () => {
      if (aiAnalyzer) {
        aiAnalyzer.dispose();
      }
    };
  }, []);

  // Connect to controller events
  useEffect(() => {
    if (!controller || !aiAnalyzer || !isAIReady) return;

    console.log('🔗 Connecting AI to DDJ-FLX4 controller...');

    // Listen to all MIDI events for AI analysis
    const handleMIDIEvent = async (event: any) => {
      const now = performance.now();
      
      // Throttle AI analysis to prevent overwhelming
      if (now - lastAnalysisTime.current < 100) return; // 100ms throttle
      lastAnalysisTime.current = now;

      try {
        // Use real audio metrics if available, otherwise fall back to controller simulation
        const controllerState = controller.getState();
        const audioMetrics = audioInput.audioMetrics 
          ? audioInput.audioMetrics  // Use real audio analysis
          : createAudioMetricsFromController(controllerState); // Fall back to simulation
        
        // Extract MIDI data for AI
        const midiData = {
          bpm: 120, // Will be enhanced with BPM detection
          volume: (controllerState.channelA.volume + controllerState.channelB.volume) / 2,
          eq: {
            low: (controllerState.channelA.eq.low + controllerState.channelB.eq.low) / 2,
            mid: (controllerState.channelA.eq.mid + controllerState.channelB.eq.mid) / 2,
            high: (controllerState.channelA.eq.high + controllerState.channelB.eq.high) / 2
          },
          crossfader: controllerState.crossfader,
          timestamp: now,
          // Include real audio level if available
          audioLevel: audioInput.audioLevel || 0
        };

        // Run AI analysis with real or simulated audio data plus MIDI
        const audioInputData = audioInput.isListening && audioInput.audioMetrics ? {
          audioLevel: audioInput.audioLevel,
          spectralFeatures: {
            brightness: audioInput.audioMetrics.spectralCentroid,
            bandwidth: audioInput.audioMetrics.spectralBandwidth,
            rolloff: audioInput.audioMetrics.spectralRolloff
          }
        } : undefined;
        
        await aiAnalyzer.analyzeAudioData(midiData, audioMetrics, now, audioInputData);
        
        // Update AI state including track identification
        const newAIState = (aiAnalyzer as any).getEnhancedAIState();
        setAIState(newAIState);
        
        // Update track identification separately for reactive updates
        const identification = (aiAnalyzer as any).getTrackIdentification();
        setTrackIdentification(identification);
        
        // Update smoothed values
        updateSmoothedValues(aiAnalyzer, midiData);
        
      } catch (error) {
        console.warn('⚠️ AI analysis error:', error);
      }
    };

    // Listen to various controller events
    controller.on('midi', handleMIDIEvent);
    controller.on('channelA:volume', handleMIDIEvent);
    controller.on('channelB:volume', handleMIDIEvent);
    controller.on('channelA:eq:low', handleMIDIEvent);
    controller.on('channelA:eq:mid', handleMIDIEvent);
    controller.on('channelA:eq:high', handleMIDIEvent);
    controller.on('channelB:eq:low', handleMIDIEvent);
    controller.on('channelB:eq:mid', handleMIDIEvent);
    controller.on('channelB:eq:high', handleMIDIEvent);
    controller.on('crossfader', handleMIDIEvent);

    // Set up periodic AI state updates
    analysisIntervalRef.current = setInterval(() => {
      if (aiAnalyzer) {
        const currentState = (aiAnalyzer as any).getEnhancedAIState();
        setAIState(currentState);
        
        // Update track identification
        const identification = (aiAnalyzer as any).getTrackIdentification();
        setTrackIdentification(identification);
      }
    }, 500); // Update every 500ms

    return () => {
      // Cleanup periodic updates
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
    };
  }, [controller, aiAnalyzer, isAIReady]);

  // Simultaneous MIDI + Audio analysis loop for richer AI processing 
  useEffect(() => {
    if (!aiAnalyzer || !isAIReady || !audioInput.isListening || !audioInput.audioMetrics) return;

    console.log('🎵 Starting simultaneous MIDI + Audio AI analysis for enhanced accuracy');
    
    const audioAnalysisInterval = setInterval(async () => {
      try {
        const now = performance.now();
        
        // Create enhanced MIDI data enriched with real audio analysis
        const midiData = {
          bpm: 120, // Will be enhanced with real-time beat detection from audio
          volume: audioInput.audioLevel * 127, // Convert audio level to MIDI range
          eq: {
            // Extract frequency band information from spectral data for MIDI simulation
            low: Math.min(127, audioInput.audioMetrics!.spectralCentroid < 200 ? 100 : 50),
            mid: Math.min(127, (audioInput.audioMetrics!.spectralCentroid / 4000) * 127),
            high: Math.min(127, audioInput.audioMetrics!.spectralRolloff > 4000 ? 100 : 30)
          },
          crossfader: 64, // Neutral when using audio input
          timestamp: now,
          audioLevel: audioInput.audioLevel,
          // Indicate this is dual-source analysis
          isDualSource: true,
          spectralFeatures: {
            brightness: audioInput.audioMetrics!.spectralCentroid,
            bandwidth: audioInput.audioMetrics!.spectralBandwidth,
            rolloff: audioInput.audioMetrics!.spectralRolloff
          }
        };

        // Run AI analysis with real audio data combined with MIDI-derived data
        const audioInputData = {
          audioLevel: audioInput.audioLevel,
          spectralFeatures: {
            brightness: audioInput.audioMetrics!.spectralCentroid,
            bandwidth: audioInput.audioMetrics!.spectralBandwidth,
            rolloff: audioInput.audioMetrics!.spectralRolloff
          }
        };
        
        await aiAnalyzer.analyzeAudioData(midiData, audioInput.audioMetrics!, now, audioInputData);
        
        // Update AI state including track identification  
        const newAIState = (aiAnalyzer as any).getEnhancedAIState();
        setAIState(newAIState);
        
        // Update track identification separately for reactive updates
        const identification = (aiAnalyzer as any).getTrackIdentification();
        setTrackIdentification(identification);
        
        // Update smoothed values with audio-derived data
        updateSmoothedValues(aiAnalyzer, midiData);
        
      } catch (error) {
        console.warn('⚠️ Audio-driven AI analysis error:', error);
      }
    }, 200); // Run every 200ms for real-time dual-source analysis

    return () => {
      clearInterval(audioAnalysisInterval);
      console.log('🔇 Stopped simultaneous MIDI + Audio AI analysis');
    };
  }, [aiAnalyzer, isAIReady, audioInput.isListening, audioInput.audioMetrics]);

  /**
   * Create audio metrics from controller state
   */
  const createAudioMetricsFromController = (controllerState: any): AdvancedMetrics => {
    // Simulate audio metrics from controller data
    const avgEQ = (
      controllerState.channelA.eq.low + 
      controllerState.channelA.eq.mid + 
      controllerState.channelA.eq.high +
      controllerState.channelB.eq.low + 
      controllerState.channelB.eq.mid + 
      controllerState.channelB.eq.high
    ) / 6;

    const eqSpread = Math.abs(
      Math.max(controllerState.channelA.eq.high, controllerState.channelB.eq.high) -
      Math.min(controllerState.channelA.eq.low, controllerState.channelB.eq.low)
    );

    return {
      spectralCentroid: (avgEQ / 127) * 4000, // 0-4kHz simulation
      spectralBandwidth: (eqSpread / 127) * 2000, // 0-2kHz simulation  
      spectralRolloff: (Math.max(controllerState.channelA.eq.high, controllerState.channelB.eq.high) / 127) * 8000,
      zeroCrossingRate: (controllerState.crossfader / 127) * 0.2, // Simulate based on crossfader
      mfcc: Array.from({ length: 13 }, () => Math.random() * 2 - 1), // Random MFCC for now
      chroma: Array.from({ length: 12 }, () => Math.random()), // Random chroma features
      tonnetz: Array.from({ length: 6 }, () => Math.random() * 2 - 1) // Random tonnetz features
    };
  };

  /**
   * Update smoothed values using AI filters
   */
  const updateSmoothedValues = (analyzer: RealTimeAudioAnalyzer, midiData: any) => {
    const filters = analyzer.smartSmoothing.adaptiveFilters;
    
    const bpmFilter = filters.get('bpm');
    const volumeFilter = filters.get('volume');
    const energyFilter = filters.get('energy');
    
    setSmartSmoothedValues(prev => ({
      bpm: bpmFilter && bpmFilter.history.length > 0 
        ? bpmFilter.history[bpmFilter.history.length - 1] 
        : midiData.bpm || prev.bpm,
      volume: volumeFilter && volumeFilter.history.length > 0
        ? volumeFilter.history[volumeFilter.history.length - 1]
        : midiData.volume || prev.volume,
      energy: energyFilter && energyFilter.history.length > 0
        ? energyFilter.history[energyFilter.history.length - 1]
        : analyzer.patternRecognition.energyPrediction.currentEnergy || prev.energy
    }));
  };

  /**
   * Load track database for identification
   */
  const loadTrackDatabase = (tracks: Track[]) => {
    if (aiAnalyzer) {
      (aiAnalyzer as any).loadTrackDatabase(tracks);
      console.log(`🎯 Loaded ${tracks.length} tracks for AI identification`);
    }
  };

  // Return hook interface
  return {
    aiAnalyzer,
    isAIReady,
    predictiveBeats: aiState?.predictiveBeats || {
      nextBeatPrediction: 0,
      confidence: 0,
      beatPattern: [],
      tempoStability: 0,
      phaseCorrection: 0
    },
    patternRecognition: aiState?.patternRecognition || {
      detectedPatterns: [],
      genreClassification: {
        detectedGenre: 'unknown',
        confidence: 0,
        characteristics: {
          avgBPM: 120,
          eqProfile: { low: 0.5, mid: 0.5, high: 0.5, balance: 0.5 },
          rhythmComplexity: 0.5,
          energyProfile: []
        }
      },
      energyPrediction: {
        currentEnergy: 0.5,
        predictedEnergy: [],
        energyTrend: 'stable',
        peakPrediction: 0
      },
      transitionDetection: {
        isTransitioning: false,
        transitionType: 'verse',
        confidence: 0,
        timeRemaining: 0
      }
    },
    memorySystem: aiState?.memorySystem || {
      shortTermMemory: new Map(),
      longTermMemory: new Map(),
      sessionMemory: new Map(),
      adaptationRate: 0.1
    },
    aiConfidence: aiState?.predictiveBeats?.confidence || 0,
    smartSmoothedValues,
    aiInsights: {
      detectedGenre: aiState?.patternRecognition?.genreClassification?.detectedGenre || 'unknown',
      energyTrend: aiState?.patternRecognition?.energyPrediction?.energyTrend || 'stable',
      nextBeatPrediction: aiState?.predictiveBeats?.nextBeatPrediction || 0,
      tempoStability: aiState?.predictiveBeats?.tempoStability || 0
    },
    audioInput: {
      isListening: audioInput.isListening,
      isConnected: audioInput.isConnected,
      audioLevel: audioInput.audioLevel,
      availableDevices: audioInput.availableDevices,
      selectedDeviceId: audioInput.selectedDeviceId,
      startListening: audioInput.startListening,
      stopListening: audioInput.stopListening,
      selectDevice: audioInput.selectDevice,
      refreshDevices: audioInput.refreshDevices,
      error: audioInput.error,
      inputGain: audioInput.inputGain,
      setInputGain: audioInput.setInputGain,
      sensitivity: audioInput.sensitivity,
      setSensitivity: audioInput.setSensitivity
    },
    trackIdentification,
    loadTrackDatabase
  };
};

export default useAIAudioAnalyzer; 