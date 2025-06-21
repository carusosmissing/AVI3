// rekordbox Track Data Types
export interface Track {
  id: string;
  name: string;
  artist: string;
  album?: string;
  genre?: string;
  bpm: number;
  key: string;
  duration: number; // in seconds
  filepath: string;
  dateAdded: Date;
  // Additional Rekordbox-specific fields
  year?: number;
  composer?: string;
  remixer?: string;
  label?: string;
  comments?: string;
  // Parsed data structures
  waveform?: WaveformData;
  beatGrid?: BeatGridData;
  hotCues: HotCue[];
  memoryCues: MemoryCue[];
  energyAnalysis?: EnergyAnalysis;
  songStructure?: SongStructure;
  musicalAnalysis?: {
    keyConfidence: number;
    bpmVariance: number;
    energyCurve: number[];
    timbreVectors: number[][];
  };
}

export interface WaveformData {
  peaks: number[];
  length: number;
  sampleRate: number;
}

export interface BeatGridData {
  beats: Beat[];
  bpm: number;
  firstBeatTime: number;
}

export interface Beat {
  time: number; // in seconds
  beatNumber: number;
  isDownbeat: boolean;
  localBpm?: number; // BPM at this specific beat (for tempo changes)
}

export interface HotCue {
  id: number;
  name: string;
  time: number; // in seconds
  color: string;
  type: 'cue' | 'loop' | 'roll';
}

export interface MemoryCue {
  id: number;
  time: number; // in seconds
  color: string;
  comment?: string;
}

export interface EnergyAnalysis {
  overall: number; // 1-10 scale
  intro: number;
  breakdown: number;
  buildup: number;
  drop: number;
  outro: number;
}

export interface SongStructure {
  intro?: TimeRange;
  verses: TimeRange[];
  choruses: TimeRange[];
  bridges: TimeRange[];
  outro?: TimeRange;
}

export interface TimeRange {
  start: number; // in seconds
  end: number; // in seconds
}

// DDJ-FLX4 MIDI Controller Types
export interface DDJControllerState {
  crossfader: number; // 0-127
  channelA: ChannelState;
  channelB: ChannelState;
  performancePads: PerformancePadState;
  isConnected: boolean;
}

export interface ChannelState {
  volume: number; // 0-127
  eq: {
    high: number; // 0-127
    mid: number; // 0-127
    low: number; // 0-127
  };
  cue: boolean;
  play: boolean;
  jogWheel: {
    position: number;
    isTouched: boolean;
    velocity: number;
  };
  bpm: number; // Current BPM from loaded track
  currentTrackId?: string; // ID of currently loaded track
}

export interface PerformancePadState {
  pads: PadState[]; // 16 pads total (8 per deck)
}

export interface PadState {
  id: number;
  isPressed: boolean;
  velocity: number; // 0-127
  mode: 'hotcue' | 'roll' | 'slicer' | 'sampler';
}

// Visual System Types
export interface VisualParams {
  intensity: number; // 0-1
  color: {
    hue: number; // 0-360
    saturation: number; // 0-1
    lightness: number; // 0-1
  };
  speed: number; // animation speed multiplier
  scale: number; // size multiplier
  effects: VisualEffect[];
}

export interface VisualEffect {
  type: 'strobe' | 'pulse' | 'wave' | 'particle' | 'tunnel' | 'sphere';
  intensity: number; // 0-1
  params: Record<string, any>;
}

// MIDI Event Types
export interface MIDIEvent {
  type: 'controlchange' | 'noteon' | 'noteoff';
  channel: number;
  controller?: number;
  note?: number;
  value: number;
  timestamp: number;
}

// MIDI BPM Detection Types
export interface MIDIBPMData {
  currentBPM: number;
  isConnected: boolean;
  beatPhase: number; // 0-1 within current beat
  beatInterval: number; // milliseconds per beat
  clocksReceived: number;
  lastBeatTime: number;
}

export interface MIDIClockState {
  clockCounter: number;
  lastBeatTime: number;
  beatIntervals: number[];
  smoothedBPM: number;
  lastClockTime: number;
}

// App State Types
export interface AppState {
  tracks: Track[];
  currentTrackA?: Track;
  currentTrackB?: Track;
  controller: DDJControllerState;
  visualParams: VisualParams;
  isPlaying: boolean;
  masterVolume: number;
  midiBPM?: MIDIBPMData;
}

// AI Audio Analysis Types
export interface AIAudioAnalyzer {
  predictiveBeats: PredictiveBeatDetection;
  memorySystem: MemorySystem;
  patternRecognition: PatternRecognition;
  smartSmoothing: SmartSmoothingEngine;
}

export interface PredictiveBeatDetection {
  nextBeatPrediction: number; // timestamp of next predicted beat
  confidence: number; // 0-1 confidence score
  beatPattern: number[]; // detected beat pattern
  tempoStability: number; // how stable the tempo is
  phaseCorrection: number; // phase adjustment for sync
}

export interface MemorySystem {
  shortTermMemory: Map<string, any>; // Recent patterns and behaviors
  longTermMemory: Map<string, any>; // Learned preferences and patterns
  sessionMemory: Map<string, any>; // Current session data
  adaptationRate: number; // How quickly to adapt to new patterns
}

export interface PatternRecognition {
  detectedPatterns: AudioPattern[];
  genreClassification: GenreClassification;
  energyPrediction: EnergyPrediction;
  transitionDetection: TransitionDetection;
}

export interface AudioPattern {
  id: string;
  type: 'rhythmic' | 'melodic' | 'harmonic' | 'energy';
  pattern: number[];
  confidence: number;
  frequency: number; // how often this pattern occurs
  timestamp: number;
}

export interface EQProfile {
  low: number;
  mid: number;
  high: number;
  balance: number; // overall EQ balance
}

export interface GenreClassification {
  detectedGenre: string;
  confidence: number;
  characteristics: {
    avgBPM: number;
    eqProfile: EQProfile;
    rhythmComplexity: number;
    energyProfile: number[];
  };
}

export interface EnergyPrediction {
  currentEnergy: number;
  predictedEnergy: number[];
  energyTrend: 'rising' | 'falling' | 'stable';
  peakPrediction: number; // timestamp of next predicted energy peak
}

export interface TransitionDetection {
  isTransitioning: boolean;
  transitionType: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'drop';
  confidence: number;
  timeRemaining: number; // time until transition completes
}

export interface SmartSmoothingEngine {
  adaptiveFilters: Map<string, AdaptiveFilter>;
  predictionBuffer: PredictionBuffer;
  anomalyDetection: AnomalyDetection;
}

export interface AdaptiveFilter {
  smoothingFactor: number;
  responsiveness: number;
  noiseThreshold: number;
  adaptationRate: number;
  history: number[];
}

export interface PredictionBuffer {
  predictions: Map<string, number[]>;
  accuracy: Map<string, number>;
  bufferSize: number;
}

export interface AnomalyDetection {
  isAnomalous: boolean;
  anomalyScore: number;
  expectedValue: number;
  actualValue: number;
}

// Enhanced Controller State with AI Features
export interface AIEnhancedControllerState extends DDJControllerState {
  aiAnalyzer: AIAudioAnalyzer;
  effectControls: EffectControls;
  advancedMetrics: AdvancedMetrics;
}

export interface EffectControls {
  filter: {
    low: number;
    high: number;
    resonance: number;
  };
  reverb: {
    level: number;
    time: number;
    feedback: number;
  };
  delay: {
    level: number;
    time: number;
    feedback: number;
  };
  echo: {
    level: number;
    beats: number;
  };
}

export interface AdvancedMetrics {
  spectralCentroid: number;
  spectralBandwidth: number;
  spectralRolloff: number;
  zeroCrossingRate: number;
  mfcc: number[]; // Mel-frequency cepstral coefficients
  chroma: number[]; // Chroma features for harmonic analysis
  tonnetz: number[]; // Tonal centroid features
}

// AI Event Types
export interface AIEvent extends MIDIEvent {
  aiData?: {
    prediction?: any;
    pattern?: AudioPattern;
    memory?: any;
    confidence?: number;
  };
}

// Neural Network Types for Audio Analysis
export interface AudioNeuralNetwork {
  model: any; // TensorFlow.js model
  inputShape: number[];
  outputShape: number[];
  isLoaded: boolean;
  accuracy: number;
}

export interface MLModels {
  beatPredictor: AudioNeuralNetwork;
  genreClassifier: AudioNeuralNetwork;
  energyPredictor: AudioNeuralNetwork;
  patternRecognizer: AudioNeuralNetwork;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: number;
  updatedAt: number;
}

export interface RekordboxData {
  tracks: Track[];
  playlists: Playlist[];
  importedAt: number;
}

// Visual DNA System Types
export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  highlights: string[];
  gradients: Array<{ from: string; to: string; angle: number }>;
}

export interface VisualComplexity {
  particleCount: number;
  geometryDetail: number;
  layerCount: number;
  effectIntensity: number;
  movementSpeed: number;
  turbulence: number;
}

export interface TransitionStyle {
  type: 'smooth' | 'hard' | 'glitch' | 'morph' | 'dissolve' | 'shatter';
  duration: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce' | 'elastic';
  intensity: number;
}

export interface VisualElements {
  type: 'geometric' | 'organic' | 'hybrid';
  dimension: '2D' | '3D' | 'fractal';
  shapes: string[];
  textures: string[];
  behaviors: Array<{
    name: string;
    intensity: number;
    frequency: number;
  }>;
}

export interface EnergyMapping {
  buildUpCurve: number[];
  dropImpact: number;
  breakdownSoftness: number;
  peakIntensity: number;
  energyFlow: 'linear' | 'exponential' | 'logarithmic' | 'sine';
}

export interface VisualDNAProfile {
  id: string;
  name: string;
  description: string;
  colorPalette: ColorPalette;
  complexity: VisualComplexity;
  transitionStyle: TransitionStyle;
  visualElements: VisualElements;
  energyMapping: EnergyMapping;
  genreAffinity: string[];
  moodTags: string[];
  reactivity: {
    bass: number;
    mid: number;
    treble: number;
    rhythm: number;
    harmony: number;
  };
}

export interface ActiveVisualState {
  currentProfile: VisualDNAProfile;
  targetProfile: VisualDNAProfile | null;
  interpolationProgress: number;
  colorTransitions: Map<string, { from: string; to: string; progress: number }>;
  complexityTransitions: Map<string, { from: number; to: number; progress: number }>;
  activePatterns: Array<{ pattern: any; confidence: number }>;
  midiModulations: Map<string, number>;
} 