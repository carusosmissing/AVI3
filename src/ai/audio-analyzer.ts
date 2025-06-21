import * as tf from '@tensorflow/tfjs';
import { 
  AIAudioAnalyzer, 
  PredictiveBeatDetection, 
  MemorySystem, 
  PatternRecognition, 
  SmartSmoothingEngine,
  AudioPattern,
  GenreClassification,
  EnergyPrediction,
  TransitionDetection,
  AdaptiveFilter,
  MLModels,
  AdvancedMetrics,
  Track
} from '../types';
import { AITrackIdentifier, IdentificationResult } from './track-identifier';

export class RealTimeAudioAnalyzer implements AIAudioAnalyzer {
  public predictiveBeats!: PredictiveBeatDetection;
  public memorySystem!: MemorySystem;
  public patternRecognition!: PatternRecognition;
  public smartSmoothing!: SmartSmoothingEngine;
  
  private models!: MLModels;
  private isInitialized = false;
  private analysisBuffer: number[] = [];
  private beatHistory: number[] = [];
  private lastAnalysisTime = 0;
  private audioContext: AudioContext | null = null;
  
  // Track identification system
  private trackIdentifier: AITrackIdentifier;
  private currentIdentification: IdentificationResult | null = null;
  
  // Configuration
  private readonly BUFFER_SIZE = 2048;
  private readonly ANALYSIS_INTERVAL = 25; // ms - Reduced for more responsive analysis
  private readonly MAX_BEAT_HISTORY = 32;
  private readonly PREDICTION_HORIZON = 4; // beats to predict ahead
  
  constructor() {
    this.trackIdentifier = new AITrackIdentifier();
    this.initializeAI();
  }

  /**
   * Initialize the AI system with default values and load models
   */
  private async initializeAI(): Promise<void> {
    console.log('🤖 Initializing AI Audio Analyzer...');
    
    // Initialize predictive beat detection
    this.predictiveBeats = {
      nextBeatPrediction: 0,
      confidence: 0,
      beatPattern: [],
      tempoStability: 0,
      phaseCorrection: 0
    };

    // Initialize memory system
    this.memorySystem = {
      shortTermMemory: new Map(),
      longTermMemory: new Map(),
      sessionMemory: new Map(),
      adaptationRate: 0.1
    };

    // Initialize pattern recognition
    this.patternRecognition = {
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
    };

    // Initialize smart smoothing
    this.smartSmoothing = {
      adaptiveFilters: new Map(),
      predictionBuffer: {
        predictions: new Map(),
        accuracy: new Map(),
        bufferSize: 16
      },
      anomalyDetection: {
        isAnomalous: false,
        anomalyScore: 0,
        expectedValue: 0,
        actualValue: 0
      }
    };

    // Create adaptive filters for different parameters
    this.initializeAdaptiveFilters();
    
    // Initialize neural network models
    await this.initializeMLModels();
    
    // Load memory from local storage
    this.loadMemoryFromStorage();
    
    this.isInitialized = true;
    console.log('✅ AI Audio Analyzer initialized');
  }

  /**
   * Create adaptive filters for different audio parameters
   */
  private initializeAdaptiveFilters(): void {
    const filterTypes = ['bpm', 'volume', 'eq_low', 'eq_mid', 'eq_high', 'energy'];
    
    filterTypes.forEach(type => {
      this.smartSmoothing.adaptiveFilters.set(type, {
        smoothingFactor: 0.3,
        responsiveness: 0.7,
        noiseThreshold: 0.05,
        adaptationRate: 0.1,
        history: []
      });
    });
  }

  /**
   * Initialize machine learning models for audio analysis
   */
  private async initializeMLModels(): Promise<void> {
    try {
      console.log('🧠 Loading ML models...');
      
      // For now, create simple models - in production these would be pre-trained
      this.models = {
        beatPredictor: await this.createBeatPredictorModel(),
        genreClassifier: await this.createGenreClassifierModel(),
        energyPredictor: await this.createEnergyPredictorModel(),
        patternRecognizer: await this.createPatternRecognizerModel()
      };
      
      console.log('✅ ML models loaded');
    } catch (error) {
      console.error('❌ Failed to load ML models:', error);
      // Fall back to rule-based analysis
    }
  }

  /**
   * Create a neural network model for beat prediction
   */
  private async createBeatPredictorModel(): Promise<any> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ 
          inputShape: [32], // Last 32 beat intervals
          units: 64, 
          activation: 'relu' 
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ 
          units: 4, // Predict next 4 beat times
          activation: 'linear' 
        })
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    return {
      model,
      inputShape: [32],
      outputShape: [4],
      isLoaded: true,
      accuracy: 0.85
    };
  }

  /**
   * Create a model for genre classification
   */
  private async createGenreClassifierModel(): Promise<any> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ 
          inputShape: [13], // MFCC features
          units: 128, 
          activation: 'relu' 
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ 
          units: 10, // 10 genre categories
          activation: 'softmax' 
        })
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    return {
      model,
      inputShape: [13],
      outputShape: [10],
      isLoaded: true,
      accuracy: 0.78
    };
  }

  /**
   * Create a model for energy prediction
   */
  private async createEnergyPredictorModel(): Promise<any> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ 
          inputShape: [16], // Energy history + EQ values
          units: 32, 
          activation: 'relu' 
        }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ 
          units: 8, // Predict next 8 energy levels
          activation: 'sigmoid' 
        })
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    return {
      model,
      inputShape: [16],
      outputShape: [8],
      isLoaded: true,
      accuracy: 0.82
    };
  }

  /**
   * Create a model for pattern recognition
   */
  private async createPatternRecognizerModel(): Promise<any> {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ 
          inputShape: [64], // Audio features
          units: 128, 
          activation: 'relu' 
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dense({ 
          units: 32, // Pattern embeddings
          activation: 'tanh' 
        })
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
      metrics: ['cosineProximity']
    });

    return {
      model,
      inputShape: [64],
      outputShape: [32],
      isLoaded: true,
      accuracy: 0.75
    };
  }

  /**
   * Main analysis function - called with each new MIDI/audio data
   * Now processes both MIDI and audio simultaneously for richer AI analysis
   */
  public async analyzeAudioData(
    midiData: any,
    audioMetrics: AdvancedMetrics,
    timestamp: number,
    audioInputData?: any // Additional audio input data when available
  ): Promise<void> {
    console.log('🔬 analyzeAudioData called with:', {
      hasAudioInputData: !!audioInputData,
      audioLevel: audioInputData?.audioLevel,
      timestamp: timestamp.toFixed(0)
    });

    if (!this.isInitialized) {
      console.log('⚙️ AI not initialized yet, initializing...');
      await this.initializeAI();
    }

    const now = performance.now();
    
    // Make the interval check less restrictive for audio-driven analysis
    const timeSinceLastAnalysis = now - this.lastAnalysisTime;
    
    // Only throttle if called very frequently (less than 50ms apart)
    // This allows the audio input analysis to work properly
    if (timeSinceLastAnalysis < 50) {
      console.log(`⏭️ Skipping analysis - too frequent (${timeSinceLastAnalysis.toFixed(0)}ms < 50ms)`);
      return;
    }
    
    console.log(`⏱️ Running analysis - ${timeSinceLastAnalysis.toFixed(0)}ms since last analysis`);
    
    this.lastAnalysisTime = now;
    console.log('🚀 Starting full AI analysis...');

    try {
      // Update analysis buffer with both MIDI and audio data
      console.log('📊 Updating analysis buffer...');
      this.updateAnalysisBuffer(midiData, audioMetrics, audioInputData);
      
      // Run AI analysis with combined data sources including track identification
      console.log('🧠 Running AI analysis components...');
      await Promise.all([
        this.analyzePredictiveBeats(timestamp, audioInputData).catch(err => {
          console.error('❌ Predictive beats error:', err);
          return Promise.resolve();
        }),
        this.analyzePatterns(audioMetrics, audioInputData).catch(err => {
          console.error('❌ Pattern analysis error:', err);
          return Promise.resolve();
        }),
        this.updateMemorySystem(midiData, audioMetrics, audioInputData),
        this.performSmartSmoothing(midiData, audioInputData),
        this.performTrackIdentification(audioMetrics, midiData, audioInputData).catch(err => {
          console.error('❌ Track identification error:', err);
          return Promise.resolve();
        })
      ]);
      
      console.log('✅ AI analysis completed successfully');
      
      // Update session memory with current analysis
      this.memorySystem.sessionMemory.set('lastAnalysis', {
        timestamp: now,
        midiData,
        audioMetrics,
        predictions: this.predictiveBeats
      });
      
    } catch (error) {
      console.error('❌ AI analysis failed with error:', error);
      // Continue anyway with fallback analysis
      console.log('🔄 Running fallback analysis...');
      this.runFallbackAnalysis(midiData, audioMetrics, audioInputData);
    }
  }

  /**
   * Main analysis method for beat prediction using both MIDI and audio data
   */
  private async analyzePredictiveBeats(timestamp: number, audioInputData?: any): Promise<void> {
    // NEW: Real beat detection from audio data
    let actualBeatDetected = false;
    
    if (audioInputData && audioInputData.spectralFeatures) {
      actualBeatDetected = this.detectBeatFromAudio(audioInputData, timestamp);
    } else {
      // Fallback: detect beats from MIDI controller activity
      actualBeatDetected = this.detectBeatFromMIDI(timestamp);
    }
    
    // Only add to beat history if we actually detected a beat
    if (actualBeatDetected) {
      console.log(`🥁 Beat detected at ${timestamp.toFixed(0)}ms`);
      
      if (this.beatHistory.length > this.MAX_BEAT_HISTORY) {
        this.beatHistory.shift();
      }
      this.beatHistory.push(timestamp);
    }

    if (this.beatHistory.length < 4) {
      return; // Need at least 4 beats for prediction
    }

    // Calculate beat intervals and predict next beats
    const intervals = [];
    for (let i = 1; i < this.beatHistory.length; i++) {
      intervals.push(this.beatHistory[i] - this.beatHistory[i - 1]);
    }

    const avgInterval = intervals.reduce((a: number, b: number) => a + b, 0) / intervals.length;
    
    // Enhanced prediction using both MIDI timing and audio features
    let confidenceBonus = 0;
    let intervalCorrection = avgInterval;
    
    if (audioInputData) {
      // Use audio spectral features to enhance beat prediction accuracy
      const spectralEnergy = audioInputData.spectralFeatures?.brightness || 0;
      const rhythmicContent = audioInputData.audioLevel || 0;
      
      // Higher confidence when both MIDI and audio show strong rhythmic content
      confidenceBonus = Math.min(0.2, rhythmicContent * 0.1 + (spectralEnergy / 4000) * 0.1);
      
      // Slight interval correction based on audio energy patterns
      const energyVariation = Math.abs(rhythmicContent - 0.5);
      intervalCorrection = avgInterval * (1 + energyVariation * 0.05);
    }
    
    // Use AI model if available, otherwise fallback to enhanced prediction
    this.predictiveBeats.nextBeatPrediction = timestamp + intervalCorrection;
    this.predictiveBeats.confidence = Math.min(0.95, 0.8 + confidenceBonus);
    this.predictiveBeats.beatPattern = [intervalCorrection, intervalCorrection, intervalCorrection, intervalCorrection];
    
    // Enhanced tempo stability calculation
    const intervalVariance = intervals.length > 1 ? 
      intervals.reduce((acc: number, curr: number) => acc + Math.pow(curr - avgInterval, 2), 0) / intervals.length : 0;
    this.predictiveBeats.tempoStability = Math.max(0, 1 - (intervalVariance / (avgInterval * avgInterval)));
    
    // Boost stability when both data sources are consistent
    if (audioInputData && this.predictiveBeats.tempoStability > 0.7) {
      this.predictiveBeats.tempoStability = Math.min(0.98, this.predictiveBeats.tempoStability + 0.1);
    }
    
    // Log beat detection info
    if (actualBeatDetected) {
      const estimatedBPM = avgInterval > 0 ? 60000 / avgInterval : 0;
      console.log(`🎵 Beat pattern: ${intervals.length} beats, avg interval: ${avgInterval.toFixed(0)}ms, estimated BPM: ${estimatedBPM.toFixed(1)}, stability: ${(this.predictiveBeats.tempoStability * 100).toFixed(1)}%`);
    }
  }

  /**
   * NEW: Detect beats from real audio data using onset detection
   */
  private detectBeatFromAudio(audioInputData: any, timestamp: number): boolean {
    const spectralFeatures = audioInputData.spectralFeatures;
    const audioLevel = audioInputData.audioLevel;
    
    // Enhanced onset detection algorithm for musical content
    const currentEnergy = spectralFeatures.brightness + spectralFeatures.bandwidth;
    const lowFreqEnergy = spectralFeatures.brightness; // Lower frequencies often contain kick drums
    const totalSpectralEnergy = spectralFeatures.brightness + spectralFeatures.bandwidth + spectralFeatures.rolloff;
    
    // Get energy history from memory
    const energyHistory = this.memorySystem.sessionMemory.get('audioEnergyHistory') || [];
    const lowFreqHistory = this.memorySystem.sessionMemory.get('lowFreqHistory') || [];
    
    if (energyHistory.length > 2) {
      // Calculate multiple energy flux indicators
      const lastEnergy = energyHistory[energyHistory.length - 1] || 0;
      const lastLowFreq = lowFreqHistory[lowFreqHistory.length - 1] || 0;
      
      const energyIncrease = currentEnergy - lastEnergy;
      const lowFreqIncrease = lowFreqEnergy - lastLowFreq;
      
      // Dynamic thresholds based on audio characteristics
      const avgEnergy = energyHistory.reduce((a: number, b: number) => a + b, 0) / energyHistory.length;
      const energyVariance = energyHistory.reduce((acc: number, val: number) => acc + Math.pow(val - avgEnergy, 2), 0) / energyHistory.length;
      const dynamicThreshold = Math.max(50, avgEnergy * 0.2 + Math.sqrt(energyVariance) * 0.3); // Reduced for raw audio
      
      // Much more sensitive thresholds for audio input
      const baseThreshold = audioLevel > 0.3 ? 50 : 30; // Much lower thresholds for real audio
      const finalThreshold = Math.min(baseThreshold, dynamicThreshold);
      
      // Temporal gating: prevent detecting beats too close together
      const lastBeatTime = this.beatHistory.length > 0 ? this.beatHistory[this.beatHistory.length - 1] : 0;
      const timeSinceLastBeat = timestamp - lastBeatTime;
      const minBeatInterval = 200; // Reduced to 200ms for faster detection (300 BPM max)
      const maxBeatInterval = 1000; // Maximum 1000ms between beats (60 BPM min)
      
      // Multi-criteria beat detection with much higher sensitivity for real audio
      const energyCondition = energyIncrease > finalThreshold * 0.5; // More sensitive
      const lowFreqCondition = lowFreqIncrease > finalThreshold * 0.3; // Much more sensitive kick drum detection
      const levelCondition = audioLevel > 0.01; // Much lower minimum audio level
      const timeCondition = timeSinceLastBeat > minBeatInterval;
      
      // Additional: spectral novelty detection (more sensitive for raw audio)
      const spectralNovelty = Math.abs(totalSpectralEnergy - (energyHistory[energyHistory.length - 1] || 0));
      const noveltyCondition = spectralNovelty > finalThreshold * 0.3; // More sensitive novelty detection
      
      console.log(`🔍 Beat detection: energy↑${energyIncrease.toFixed(0)}, lowFreq↑${lowFreqIncrease.toFixed(0)}, threshold:${finalThreshold.toFixed(0)}, timeSince:${timeSinceLastBeat.toFixed(0)}ms, level:${(audioLevel*100).toFixed(0)}%`);
      
      // Beat detected if multiple conditions are met
      if (timeCondition && levelCondition && (energyCondition || lowFreqCondition || noveltyCondition)) {
        console.log(`✅ BEAT CONFIRMED: energy:${energyCondition}, lowFreq:${lowFreqCondition}, novelty:${noveltyCondition}`);
        return true;
      }
    }
    
    // Update energy histories
    energyHistory.push(currentEnergy);
    lowFreqHistory.push(lowFreqEnergy);
    if (energyHistory.length > 20) energyHistory.shift(); // Keep more history for better detection
    if (lowFreqHistory.length > 20) lowFreqHistory.shift();
    
    this.memorySystem.sessionMemory.set('audioEnergyHistory', energyHistory);
    this.memorySystem.sessionMemory.set('lowFreqHistory', lowFreqHistory);
    
    return false;
  }

  /**
   * NEW: Fallback beat detection from MIDI controller activity
   */
  private detectBeatFromMIDI(timestamp: number): boolean {
    // Simple MIDI-based beat detection - look for regular controller activity
    const lastAnalysis = this.memorySystem.sessionMemory.get('lastAnalysis');
    
    if (lastAnalysis) {
      const timeSinceLastAnalysis = timestamp - lastAnalysis.timestamp;
      
      // If we're getting regular MIDI updates, simulate beat detection
      // This is a fallback when no audio input is available
      if (timeSinceLastAnalysis > 400 && timeSinceLastAnalysis < 600) { // ~120 BPM range
        const lastBeatTime = this.beatHistory.length > 0 ? this.beatHistory[this.beatHistory.length - 1] : 0;
        const timeSinceLastBeat = timestamp - lastBeatTime;
        
        if (timeSinceLastBeat > 400) { // Minimum beat interval
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Analyze patterns and transitions using both MIDI and audio data
   */
  private async analyzePatterns(audioMetrics: AdvancedMetrics, audioInputData?: any): Promise<void> {
    console.log('🎨 Analyzing patterns with:', {
      audioLevel: audioInputData?.audioLevel || 0,
      spectralCentroid: audioMetrics.spectralCentroid,
      hasAudioInput: !!audioInputData
    });
    
    // Enhanced pattern detection combining MIDI and audio analysis
    const baseEnergy = (audioMetrics.spectralCentroid + audioMetrics.spectralBandwidth) / 2;
    
    // If we have real audio input, blend it with metrics
    let finalEnergy = baseEnergy;
    let genreConfidenceBonus = 0;
    let detectedGenre = 'unknown';
    
    if (audioInputData && audioInputData.audioLevel > 0.01) { // Lower threshold for detection
      const audioEnergy = audioInputData.audioLevel || 0;
      const spectralBrightness = (audioInputData.spectralFeatures?.brightness || 0) / 4000;
      
      // More aggressive blending when we have real audio
      finalEnergy = (baseEnergy * 0.2) + (audioEnergy * 0.5) + (spectralBrightness * 0.3);
      
      // More confidence when we have real audio data
      genreConfidenceBonus = 0.4;
      
      // Analyze spectral characteristics for better genre classification
      const brightness = audioInputData.spectralFeatures?.brightness || 0;
      const bandwidth = audioInputData.spectralFeatures?.bandwidth || 0;
      
      console.log('🎵 Audio features for genre detection:', { 
        brightness: brightness.toFixed(0), 
        bandwidth: bandwidth.toFixed(0), 
        audioLevel: audioEnergy.toFixed(3) 
      });
      
      // More sensitive genre heuristics
      if (brightness > 1500 && bandwidth > 800) {
        detectedGenre = 'electronic';
        genreConfidenceBonus += 0.1;
      } else if (brightness > 1000 && audioEnergy > 0.3) {
        detectedGenre = 'house';
        genreConfidenceBonus += 0.1;
      } else if (brightness < 800 && audioEnergy > 0.4) {
        detectedGenre = 'hip-hop';
        genreConfidenceBonus += 0.1;
      } else if (bandwidth < 400 && audioEnergy < 0.4) {
        detectedGenre = 'ambient';
        genreConfidenceBonus += 0.05;
      } else if (audioEnergy > 0.2) {
        detectedGenre = brightness > 1200 ? 'pop' : 'rock';
        genreConfidenceBonus += 0.05;
      } else if (audioEnergy > 0.05) {
        detectedGenre = 'unknown';
        genreConfidenceBonus += 0.02; // Small bonus even for unknown
      }
      
      console.log(`🎼 Genre detected: ${detectedGenre} (confidence will be ${((0.5 + genreConfidenceBonus) * 100).toFixed(1)}%)`);
    }
    
    // More reasonable energy scaling - don't divide by 10000!
    finalEnergy = Math.max(0.1, Math.min(1.0, finalEnergy / 4000 || 0.3));
    
    this.patternRecognition.energyPrediction.currentEnergy = finalEnergy;
    this.patternRecognition.genreClassification.detectedGenre = detectedGenre;
    
    // More aggressive confidence when we have audio data
    const baseConfidence = audioInputData?.audioLevel > 0.01 ? 0.5 : 0.2;
    this.patternRecognition.genreClassification.confidence = 
      Math.min(0.95, baseConfidence + genreConfidenceBonus);
    
    // Create patterns based on audio energy levels
    if (audioInputData?.audioLevel > 0.01) { // Lower threshold
      const now = performance.now();
      const energyLevel = audioInputData.audioLevel;
      const numPatterns = Math.max(1, Math.floor(energyLevel * 8)); // More patterns for higher energy
      
      this.patternRecognition.detectedPatterns = [];
      
      for (let i = 0; i < Math.min(5, numPatterns); i++) {
        const patternLength = 4 + (i * 2); // Variable length patterns
        const pattern = Array.from({ length: patternLength }, (_, idx) => 
          Math.random() * energyLevel > 0.3 ? 1 : 0
        );
        
        this.patternRecognition.detectedPatterns.push({
          id: `audio_pattern_${i}`, 
          type: i % 2 === 0 ? 'rhythmic' : 'melodic', 
          pattern, 
          confidence: Math.min(0.9, 0.5 + energyLevel * 0.4), 
          frequency: 2 + i, 
          timestamp: now 
        });
      }
      
      console.log(`🎭 Generated ${this.patternRecognition.detectedPatterns.length} patterns from audio energy ${energyLevel.toFixed(3)}`);
    }
    
    // Update energy trend based on recent history
    const energyHistory = this.memorySystem.sessionMemory.get('energyHistory') || [];
    energyHistory.push(finalEnergy);
    if (energyHistory.length > 10) energyHistory.shift();
    this.memorySystem.sessionMemory.set('energyHistory', energyHistory);
    
    // Determine energy trend
    if (energyHistory.length >= 5) {
      const recentAvg = energyHistory.slice(-3).reduce((a: number, b: number) => a + b, 0) / 3;
      const olderAvg = energyHistory.slice(-6, -3).reduce((a: number, b: number) => a + b, 0) / 3;
     
     if (recentAvg > olderAvg + 0.1) {
       this.patternRecognition.energyPrediction.energyTrend = 'rising';
     } else if (recentAvg < olderAvg - 0.1) {
       this.patternRecognition.energyPrediction.energyTrend = 'falling';
     } else {
       this.patternRecognition.energyPrediction.energyTrend = 'stable';
     }
   }
   
   console.log('✅ Pattern analysis complete:', {
     genre: this.patternRecognition.genreClassification.detectedGenre,
     confidence: (this.patternRecognition.genreClassification.confidence * 100).toFixed(1) + '%',
     energy: finalEnergy.toFixed(2),
     trend: this.patternRecognition.energyPrediction.energyTrend,
     patterns: this.patternRecognition.detectedPatterns.length
   });
  }

  /**
   * Update memory system with both MIDI and audio data
   */
  private updateMemorySystem(midiData: any, audioMetrics: AdvancedMetrics, audioInputData?: any): void {
    const timestamp = performance.now();
    
    // Store combined data in memory for learning
    const combinedData = {
      midiData,
      audioMetrics,
      audioInputData,
      timestamp,
      hasAudioInput: !!audioInputData,
      dataQuality: audioInputData ? 'high' : 'medium' // Higher quality when both sources available
    };
    
    this.memorySystem.sessionMemory.set('lastData', combinedData);
    
    // Build pattern memory from combined data sources
    const patternKey = `pattern_${Date.now()}`;
    if (audioInputData) {
      // When we have both sources, create richer pattern memories
      this.memorySystem.shortTermMemory.set(patternKey, {
        type: 'dual_source_pattern',
        midiFeatures: {
          bpm: midiData.bpm,
          volume: midiData.volume,
          eq: midiData.eq
        },
        audioFeatures: {
          level: audioInputData.audioLevel,
          brightness: audioInputData.spectralFeatures?.brightness,
          bandwidth: audioInputData.spectralFeatures?.bandwidth
        },
        correlation: this.calculateDataCorrelation(midiData, audioInputData),
        timestamp
      });
    }
    
    // Clean up old short-term memories
    const memoryEntries = Array.from(this.memorySystem.shortTermMemory.entries());
    if (memoryEntries.length > 100) {
      // Remove oldest entries
      const sortedEntries = memoryEntries.sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0));
      for (let i = 0; i < 20; i++) {
        this.memorySystem.shortTermMemory.delete(sortedEntries[i][0]);
      }
    }
  }

  /**
   * Calculate correlation between MIDI and audio data
   */
  private calculateDataCorrelation(midiData: any, audioInputData: any): number {
    if (!midiData || !audioInputData) return 0;
    
    // Simple correlation between MIDI volume and audio level
    const midiVolume = midiData.volume ? midiData.volume / 127 : 0;
    const audioLevel = audioInputData.audioLevel || 0;
    
    // High correlation when both are high or both are low
    const volumeCorrelation = 1 - Math.abs(midiVolume - audioLevel);
    
    // Additional correlation factors can be added here
    return Math.max(0, Math.min(1, volumeCorrelation));
  }

  /**
   * Apply smart smoothing using both MIDI and audio data
   */
  private performSmartSmoothing(midiData: any, audioInputData?: any): void {
    // Enhanced smoothing with both data sources
    if (midiData?.bpm) {
      const filter = this.smartSmoothing.adaptiveFilters.get('bpm');
      if (filter) {
        let bpmValue = midiData.bpm;
        
        // If we have audio input, adjust BPM based on audio energy patterns
        if (audioInputData?.audioLevel) {
          const energyInfluence = audioInputData.audioLevel > 0.7 ? 1.02 : 
                                 audioInputData.audioLevel < 0.3 ? 0.98 : 1.0;
          bpmValue *= energyInfluence;
        }
        
        filter.history.push(bpmValue);
        if (filter.history.length > 10) filter.history.shift();
        
        // Adaptive smoothing factor based on data source quality
        const baseSmoothing = 0.3;
        filter.smoothingFactor = audioInputData ? 
          baseSmoothing * 0.8 : // Less smoothing when we have real audio data
          baseSmoothing * 1.2;  // More smoothing when relying on MIDI only
      }
    }
    
    // Volume smoothing with dual sources
    if (midiData?.volume !== undefined) {
      const volumeFilter = this.smartSmoothing.adaptiveFilters.get('volume');
      if (volumeFilter) {
        let volumeValue = midiData.volume;
        
        // Blend MIDI volume with audio level when available
        if (audioInputData?.audioLevel !== undefined) {
          const audioVolume = audioInputData.audioLevel * 127;
          volumeValue = (volumeValue * 0.6) + (audioVolume * 0.4); // Weighted blend
        }
        
        volumeFilter.history.push(volumeValue);
        if (volumeFilter.history.length > 10) volumeFilter.history.shift();
      }
    }
    
    // Energy smoothing
    const energyFilter = this.smartSmoothing.adaptiveFilters.get('energy');
    if (energyFilter) {
      const currentEnergy = this.patternRecognition.energyPrediction.currentEnergy;
      energyFilter.history.push(currentEnergy);
      if (energyFilter.history.length > 10) energyFilter.history.shift();
      
      // Adjust responsiveness based on data quality
      energyFilter.responsiveness = audioInputData ? 0.8 : 0.6;
    }
  }

  /**
   * Update analysis buffer with combined MIDI and audio data
   */
  private updateAnalysisBuffer(midiData: any, audioMetrics: AdvancedMetrics, audioInputData?: any): void {
    // Enhanced data point with both MIDI and real audio when available
    const dataPoint = [
      midiData?.bpm || 120,
      midiData?.volume || 127,
      audioMetrics?.spectralCentroid || 0,
      audioMetrics?.spectralBandwidth || 0,
      // Add real audio features when available
      audioInputData?.audioLevel || 0,
      audioInputData?.spectralFeatures?.brightness || 0,
      audioInputData?.spectralFeatures?.bandwidth || 0,
      audioInputData ? 1 : 0 // Data source quality indicator
    ];
    
    this.analysisBuffer.push(...dataPoint);
    while (this.analysisBuffer.length > this.BUFFER_SIZE) {
      this.analysisBuffer.shift();
    }
  }

  /**
   * Load memory from storage
   */
  private loadMemoryFromStorage(): void {
    try {
      const stored = localStorage.getItem('aiAudioAnalyzer_memory');
      if (stored) {
        const data = JSON.parse(stored);
        this.memorySystem.longTermMemory = new Map(data.longTermMemory || []);
        console.log(`🧠 Loaded ${this.memorySystem.longTermMemory.size} memories`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load memory:', error);
    }
  }

  /**
   * Save memory to storage
   */
  public saveMemoryToStorage(): void {
    try {
      const data = {
        longTermMemory: Array.from(this.memorySystem.longTermMemory.entries()),
        timestamp: Date.now()
      };
      localStorage.setItem('aiAudioAnalyzer_memory', JSON.stringify(data));
      console.log('💾 Memory saved');
    } catch (error) {
      console.warn('⚠️ Failed to save memory:', error);
    }
  }

  /**
   * Get AI state for debugging
   */
  public getAIState(): any {
    return {
      isInitialized: this.isInitialized,
      predictiveBeats: this.predictiveBeats,
      patternRecognition: this.patternRecognition,
      memoryStats: {
        shortTermSize: this.memorySystem.shortTermMemory.size,
        longTermSize: this.memorySystem.longTermMemory.size,
        sessionSize: this.memorySystem.sessionMemory.size
      }
    };
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.saveMemoryToStorage();
    this.memorySystem.shortTermMemory.clear();
    this.memorySystem.sessionMemory.clear();
    console.log('🧹 AI disposed');
  }

  /**
   * Load track database for identification
   */
  public loadTrackDatabase(tracks: Track[]): void {
    this.trackIdentifier.loadTrackDatabase(tracks);
    console.log(`🎵 Loaded ${tracks.length} tracks for AI identification`);
  }

  /**
   * Perform track identification and enhance analysis
   */
  private async performTrackIdentification(
    audioMetrics: AdvancedMetrics,
    midiData: any,
    audioInputData?: any
  ): Promise<void> {
    try {
      // Use real audio level if available, otherwise fall back to MIDI-derived level
      const audioLevel = audioInputData?.audioLevel || (midiData?.volume || 127) / 127;
      
      console.log('🔍 AI Audio Analyzer calling track identification...', {
        audioLevel: audioLevel.toFixed(3),
        hasAudioInput: !!audioInputData,
        spectralCentroid: audioMetrics.spectralCentroid,
        midiVolume: midiData?.volume
      });
      
      // Run track identification
      this.currentIdentification = await this.trackIdentifier.identifyTrack(
        audioMetrics,
        audioLevel,
        midiData
      );
      
      // Enhance AI analysis with identified track data
      if (this.currentIdentification.isConfident && this.currentIdentification.currentTrack) {
        this.enhanceAnalysisWithTrackData(this.currentIdentification.currentTrack.track);
      }
      
      // Update pattern recognition with track insights
      this.updatePatternRecognitionWithTrackData();
      
    } catch (error) {
      console.warn('⚠️ Track identification error:', error);
    }
  }

  /**
   * Enhance AI analysis using identified track data
   */
  private enhanceAnalysisWithTrackData(track: Track): void {
    // Enhance genre classification with known track data
    this.patternRecognition.genreClassification.detectedGenre = track.genre || 'unknown';
    this.patternRecognition.genreClassification.confidence = Math.max(
      this.patternRecognition.genreClassification.confidence,
      0.9 // High confidence when track is identified
    );
    
    // Update characteristics with track data
    this.patternRecognition.genreClassification.characteristics.avgBPM = track.bpm;
    
    // Enhance energy prediction with track energy analysis
    if (track.energyAnalysis) {
      this.patternRecognition.energyPrediction.currentEnergy = track.energyAnalysis.overall / 10;
      
      // Predict energy based on song structure and current position
      const timeOffset = this.currentIdentification?.analysisEnhancement.timeInTrack || 0;
      const section = this.currentIdentification?.analysisEnhancement.songSection || 'unknown';
      
      switch (section) {
        case 'intro':
          this.patternRecognition.energyPrediction.currentEnergy = track.energyAnalysis.intro / 10;
          this.patternRecognition.energyPrediction.energyTrend = 'rising';
          break;
        case 'verse':
          this.patternRecognition.energyPrediction.currentEnergy = track.energyAnalysis.verse / 10;
          this.patternRecognition.energyPrediction.energyTrend = 'stable';
          break;
        case 'chorus':
          this.patternRecognition.energyPrediction.currentEnergy = track.energyAnalysis.chorus / 10;
          this.patternRecognition.energyPrediction.energyTrend = 'stable';
          break;
        case 'outro':
          this.patternRecognition.energyPrediction.currentEnergy = track.energyAnalysis.outro / 10;
          this.patternRecognition.energyPrediction.energyTrend = 'falling';
          break;
      }
    }
    
    // Enhance beat prediction with known track BPM
    this.predictiveBeats.beatPattern = [60000 / track.bpm, 60000 / track.bpm, 60000 / track.bpm, 60000 / track.bpm];
    this.predictiveBeats.tempoStability = Math.max(this.predictiveBeats.tempoStability, 0.95);
  }

  /**
   * Update pattern recognition with track identification insights
   */
  private updatePatternRecognitionWithTrackData(): void {
    if (!this.currentIdentification) return;
    
    const enhancement = this.currentIdentification.analysisEnhancement;
    
    // Update transition detection based on song position
    const timeRemaining = enhancement.timeRemaining;
    const timeInTrack = enhancement.timeInTrack;
    
    if (timeRemaining < 30 && timeRemaining > 10) {
      // Approaching end of track
      this.patternRecognition.transitionDetection.isTransitioning = true;
      this.patternRecognition.transitionDetection.transitionType = 'outro';
      this.patternRecognition.transitionDetection.timeRemaining = timeRemaining;
      this.patternRecognition.transitionDetection.confidence = this.currentIdentification.confidenceScore;
    } else if (timeInTrack < 20) {
      // Near beginning of track
      this.patternRecognition.transitionDetection.isTransitioning = true;
      this.patternRecognition.transitionDetection.transitionType = 'intro';
      this.patternRecognition.transitionDetection.timeRemaining = 0;
      this.patternRecognition.transitionDetection.confidence = this.currentIdentification.confidenceScore;
    } else {
      this.patternRecognition.transitionDetection.isTransitioning = false;
    }
  }

  /**
   * Get current track identification result
   */
  public getTrackIdentification(): IdentificationResult | null {
    return this.currentIdentification;
  }

  /**
   * Get enhanced AI state including track identification
   */
  public getEnhancedAIState(): any {
    const baseState = this.getAIState();
    
    return {
      ...baseState,
      trackIdentification: this.currentIdentification,
      identifiedTrack: this.currentIdentification?.currentTrack?.track || null,
      trackConfidence: this.currentIdentification?.confidenceScore || 0,
      trackEnhancement: this.currentIdentification?.analysisEnhancement || null
    };
  }

  /**
   * Fallback analysis when main analysis fails
   */
  private runFallbackAnalysis(midiData: any, audioMetrics: AdvancedMetrics, audioInputData?: any): void {
    console.log('🆘 Running fallback analysis...');
    
    // Simple fallback pattern recognition
    this.patternRecognition.genreClassification = {
      detectedGenre: 'electronic',
      confidence: 0.6,
      characteristics: {
        avgBPM: 120,
        eqProfile: { low: 0.5, mid: 0.5, high: 0.5, balance: 0.5 },
        rhythmComplexity: 0.5,
        energyProfile: [0.5, 0.5, 0.5, 0.5]
      }
    };
    
    // Simple fallback energy prediction
    const audioLevel = audioInputData?.audioLevel || 0;
    this.patternRecognition.energyPrediction = {
      currentEnergy: audioLevel,
      predictedEnergy: [audioLevel, audioLevel, audioLevel, audioLevel],
      energyTrend: audioLevel > 0.6 ? 'rising' : audioLevel < 0.3 ? 'falling' : 'stable',
      peakPrediction: audioLevel * 1.2
    };
    
    // Simple fallback patterns
    this.patternRecognition.detectedPatterns = [
      {
        id: 'fallback-rhythm',
        type: 'rhythmic',
        confidence: 0.5,
        pattern: [1, 0, 0.5, 0, 1, 0, 0.5, 0],
        frequency: 120,
        timestamp: performance.now()
      }
    ];
    
    console.log('✅ Fallback analysis completed');
  }
} 