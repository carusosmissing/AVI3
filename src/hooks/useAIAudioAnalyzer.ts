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

interface MIDITempoData {
  currentBPM: number;
  isConnected: boolean;
  beatPhase: number;
  beatInterval: number;
}

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

export const useAIAudioAnalyzer = (
  controller: DDJFlx4Controller | null, 
  midiTempoData?: MIDITempoData
): AIAudioAnalyzerHook => {
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
        
        // Extract MIDI data for AI - prioritize MIDI BPM
        const primaryBPM = midiTempoData?.isConnected && midiTempoData.currentBPM > 0 ? 
          midiTempoData.currentBPM : 120;
        
        const midiData = {
          bpm: primaryBPM, // Use MIDI BPM as primary tempo driver
          volume: (controllerState.channelA.volume + controllerState.channelB.volume) / 2,
          eq: {
            low: (controllerState.channelA.eq.low + controllerState.channelB.eq.low) / 2,
            mid: (controllerState.channelA.eq.mid + controllerState.channelB.eq.mid) / 2,
            high: (controllerState.channelA.eq.high + controllerState.channelB.eq.high) / 2
          },
          crossfader: controllerState.crossfader,
          timestamp: now,
          // Include real audio level if available
          audioLevel: audioInput.audioLevel || 0,
          // Pass MIDI tempo data to AI for enhanced analysis
          midiTempo: midiTempoData ? {
            isConnected: midiTempoData.isConnected,
            beatPhase: midiTempoData.beatPhase,
            beatInterval: midiTempoData.beatInterval
          } : null
        };
        
        console.log(`🎵 AI Hook - Using Primary BPM: ${primaryBPM.toFixed(1)} (MIDI: ${midiTempoData?.isConnected ? 'Connected' : 'Disconnected'})`);

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
    if (!aiAnalyzer || !isAIReady || !audioInput.isListening) {
      console.log('🚫 AI analysis loop conditions not met:', {
        hasAnalyzer: !!aiAnalyzer,
        isReady: isAIReady,
        isListening: audioInput.isListening
      });
      return;
    }

    console.log('🎵 Starting enhanced audio AI analysis - FIXED VERSION');
    
    const audioAnalysisInterval = setInterval(async () => {
      try {
        const now = performance.now();
        const currentAudioLevel = audioInput.getCurrentAudioLevel(); // Get IMMEDIATE audio level (no React state delay)
        
        // Skip analysis if audio level is too low
        if (currentAudioLevel < 0.01) {
          console.log('⏭️ Skipping analysis - audio level too low:', currentAudioLevel.toFixed(4));
          return;
        }
        
        console.log('🤖 Running AI analysis with IMMEDIATE audioLevel:', currentAudioLevel.toFixed(3), '(vs React state:', audioInput.audioLevel.toFixed(3), ')');
        
        // Create enhanced MIDI data enriched with real audio analysis - prioritize MIDI BPM
        const primaryBPM = midiTempoData?.isConnected && midiTempoData.currentBPM > 0 ? 
          midiTempoData.currentBPM : 120;
        
        const midiData = {
          bpm: primaryBPM, // Use MIDI BPM as primary tempo driver
          volume: Math.max(1, currentAudioLevel * 127), // Ensure minimum volume for processing
          eq: {
            // Extract frequency band information from spectral data for MIDI simulation
            low: audioInput.audioMetrics ? Math.min(127, audioInput.audioMetrics.spectralCentroid < 200 ? 100 : 50) : Math.max(32, currentAudioLevel * 127),
            mid: audioInput.audioMetrics ? Math.min(127, (audioInput.audioMetrics.spectralCentroid / 4000) * 127) : Math.max(32, currentAudioLevel * 127),
            high: audioInput.audioMetrics ? Math.min(127, audioInput.audioMetrics.spectralRolloff > 4000 ? 100 : 30) : Math.max(32, currentAudioLevel * 127)
          },
          crossfader: 64, // Neutral when using audio input
          timestamp: now,
          audioLevel: currentAudioLevel,
          // Indicate this is dual-source analysis
          isDualSource: true,
          spectralFeatures: audioInput.audioMetrics ? {
            brightness: audioInput.audioMetrics.spectralCentroid,
            bandwidth: audioInput.audioMetrics.spectralBandwidth,
            rolloff: audioInput.audioMetrics.spectralRolloff
          } : {
            brightness: Math.max(100, currentAudioLevel * 2000), // Ensure minimum values
            bandwidth: Math.max(50, currentAudioLevel * 1000),
            rolloff: Math.max(200, currentAudioLevel * 4000)
          },
          // Pass MIDI tempo data to AI for enhanced analysis
          midiTempo: midiTempoData ? {
            isConnected: midiTempoData.isConnected,
            beatPhase: midiTempoData.beatPhase,
            beatInterval: midiTempoData.beatInterval
          } : null
        };
        
        console.log(`🎵 Audio Analysis Loop - Using Primary BPM: ${primaryBPM.toFixed(1)} (MIDI: ${midiTempoData?.isConnected ? 'Connected' : 'Disconnected'})`);

        // Run AI analysis with real audio data combined with MIDI-derived data
        const audioInputData = {
          audioLevel: currentAudioLevel,
          spectralFeatures: audioInput.audioMetrics ? {
            brightness: audioInput.audioMetrics.spectralCentroid,
            bandwidth: audioInput.audioMetrics.spectralBandwidth,
            rolloff: audioInput.audioMetrics.spectralRolloff
          } : {
            brightness: Math.max(100, currentAudioLevel * 2000), // Ensure minimum values
            bandwidth: Math.max(50, currentAudioLevel * 1000),
            rolloff: Math.max(200, currentAudioLevel * 4000)
          }
        };

        // Use real audio metrics if available, otherwise create realistic fake ones
        const audioMetrics = audioInput.audioMetrics || {
          spectralCentroid: Math.max(100, currentAudioLevel * 2000),
          spectralBandwidth: Math.max(50, currentAudioLevel * 1000),
          spectralRolloff: Math.max(200, currentAudioLevel * 4000),
          zeroCrossingRate: Math.max(0.01, currentAudioLevel * 0.1),
          mfcc: Array.from({ length: 13 }, (_, i) => (Math.random() - 0.5) * Math.max(0.1, currentAudioLevel) * (i + 1) * 0.1),
          chroma: Array.from({ length: 12 }, () => Math.random() * Math.max(0.1, currentAudioLevel)),
          tonnetz: Array.from({ length: 6 }, () => (Math.random() - 0.5) * Math.max(0.1, currentAudioLevel))
        };
        
        console.log('📊 About to call AI analyzer with:', {
          audioLevel: currentAudioLevel.toFixed(3),
          hasRealMetrics: !!audioInput.audioMetrics,
          spectralCentroid: audioMetrics.spectralCentroid?.toFixed(0),
          midiVolume: midiData.volume.toFixed(0)
        });
        
        await aiAnalyzer.analyzeAudioData(midiData, audioMetrics, now, audioInputData);
        
        console.log('✅ AI analysis completed, getting state...');
        
        // Update AI state including track identification  
        const newAIState = (aiAnalyzer as any).getEnhancedAIState();
        
        if (newAIState) {
          setAIState(newAIState);
          
          console.log('🧠 AI State updated successfully:', {
            genreConfidence: newAIState?.patternRecognition?.genreClassification?.confidence?.toFixed(3),
            detectedGenre: newAIState?.patternRecognition?.genreClassification?.detectedGenre,
            energyTrend: newAIState?.patternRecognition?.energyPrediction?.energyTrend,
            patternsDetected: newAIState?.patternRecognition?.detectedPatterns?.length || 0,
            tempoStability: newAIState?.predictiveBeats?.tempoStability?.toFixed(3)
          });
        } else {
          console.warn('⚠️ AI state is null or undefined');
        }
        
        // Update track identification separately for reactive updates
        const identification = (aiAnalyzer as any).getTrackIdentification();
        setTrackIdentification(identification);
        
        // Update smoothed values with audio-derived data
        updateSmoothedValues(aiAnalyzer, midiData);
        
      } catch (error) {
        console.error('❌ Audio-driven AI analysis error:', error);
        if (error instanceof Error) {
          console.error('Error details:', error.stack);
        }
      }
    }, 500); // Faster analysis for more responsive AI

    return () => {
      clearInterval(audioAnalysisInterval);
      console.log('🔇 Stopped enhanced audio AI analysis');
    };
  }, [aiAnalyzer, isAIReady, audioInput.isListening, midiTempoData]); // Include MIDI tempo data for updates

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
   * Update smoothed values using AI filters - prioritize MIDI BPM
   */
  const updateSmoothedValues = (analyzer: RealTimeAudioAnalyzer, midiData: any) => {
    const filters = analyzer.smartSmoothing.adaptiveFilters;
    
    const bpmFilter = filters.get('bpm');
    const volumeFilter = filters.get('volume');
    const energyFilter = filters.get('energy');
    
    // Prioritize MIDI BPM over AI-smoothed BPM
    const primaryBPM = midiData.midiTempo?.isConnected && midiData.bpm > 0 ? 
      midiData.bpm : // Use MIDI BPM directly (no AI smoothing needed for hardware tempo)
      (bpmFilter && bpmFilter.history.length > 0 
        ? bpmFilter.history[bpmFilter.history.length - 1] 
        : midiData.bpm);
    
    setSmartSmoothedValues(prev => ({
      bpm: primaryBPM || prev.bpm,
      volume: volumeFilter && volumeFilter.history.length > 0
        ? volumeFilter.history[volumeFilter.history.length - 1]
        : midiData.volume || prev.volume,
      energy: energyFilter && energyFilter.history.length > 0
        ? energyFilter.history[energyFilter.history.length - 1]
        : analyzer.patternRecognition.energyPrediction.currentEnergy || prev.energy
    }));
    
    console.log(`🎵 Smoothed Values - Primary BPM: ${primaryBPM.toFixed(1)} (MIDI: ${midiData.midiTempo?.isConnected ? 'Connected' : 'Disconnected'})`);
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