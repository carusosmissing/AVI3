import { RealTimeAudioAnalyzer } from './audio-analyzer';
import { 
  AIEnhancedControllerState, 
  AdvancedMetrics,
  PatternRecognition,
  GenreClassification,
  EnergyPrediction
} from '../types';

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

export class VisualDNASystem {
  private profiles: Map<string, VisualDNAProfile> = new Map();
  private activeState: ActiveVisualState;
  private analyzer: RealTimeAudioAnalyzer | null = null;
  private controllerState: AIEnhancedControllerState | null = null;
  
  // Pattern recognition for visual generation
  private patternHistory: Array<{ timestamp: number; pattern: any }> = [];
  private colorHistory: ColorPalette[] = [];
  
  // Manual control
  private manualMode: boolean = false;
  private manualModeTimeout: number | null = null;
  
  // Constants
  private readonly INTERPOLATION_SPEED = 0.02;
  private readonly PATTERN_HISTORY_SIZE = 50;
  private readonly COLOR_HISTORY_SIZE = 10;
  private readonly MANUAL_MODE_DURATION = 30000; // 30 seconds
  
  constructor() {
    console.log('🧬 Initializing Visual DNA System...');
    this.initializeProfiles();
    this.activeState = this.createDefaultActiveState();
    console.log('✅ Visual DNA System initialized with', this.profiles.size, 'profiles');
  }

  /**
   * Initialize the 10 distinct visual DNA profiles
   */
  private initializeProfiles(): void {
    // Profile 1: Neon Pulse - Electronic/House
    this.profiles.set('neon-pulse', {
      id: 'neon-pulse',
      name: 'Neon Pulse',
      description: 'Vibrant neon colors with sharp geometric patterns for electronic music',
      colorPalette: {
        primary: '#FF006E',
        secondary: '#3A86FF',
        accent: '#FFBE0B',
        background: '#0A0A0A',
        highlights: ['#FB5607', '#8338EC', '#06FFB4'],
        gradients: [
          { from: '#FF006E', to: '#3A86FF', angle: 45 },
          { from: '#FFBE0B', to: '#FB5607', angle: 90 }
        ]
      },
      complexity: {
        particleCount: 5000,
        geometryDetail: 0.8,
        layerCount: 5,
        effectIntensity: 0.9,
        movementSpeed: 1.2,
        turbulence: 0.7
      },
      transitionStyle: {
        type: 'hard',
        duration: 200,
        easing: 'bounce',
        intensity: 0.9
      },
      visualElements: {
        type: 'geometric',
        dimension: '3D',
        shapes: ['cube', 'pyramid', 'octahedron', 'icosahedron'],
        textures: ['grid', 'dots', 'lines', 'hexagons'],
        behaviors: [
          { name: 'rotate', intensity: 0.8, frequency: 1.0 },
          { name: 'pulse', intensity: 0.9, frequency: 0.5 },
          { name: 'glitch', intensity: 0.6, frequency: 0.3 }
        ]
      },
      energyMapping: {
        buildUpCurve: [0.1, 0.3, 0.5, 0.7, 0.9, 1.0],
        dropImpact: 1.0,
        breakdownSoftness: 0.3,
        peakIntensity: 1.0,
        energyFlow: 'exponential'
      },
      genreAffinity: ['electronic', 'house', 'techno', 'edm'],
      moodTags: ['energetic', 'aggressive', 'futuristic'],
      reactivity: {
        bass: 0.9,
        mid: 0.6,
        treble: 0.7,
        rhythm: 1.0,
        harmony: 0.5
      }
    });

    // Profile 2: Liquid Dreams - Ambient/Chill
    this.profiles.set('liquid-dreams', {
      id: 'liquid-dreams',
      name: 'Liquid Dreams',
      description: 'Flowing organic shapes with soft pastels for ambient music',
      colorPalette: {
        primary: '#7209B7',
        secondary: '#560BAD',
        accent: '#B5179E',
        background: '#1A0033',
        highlights: ['#F72585', '#4CC9F0', '#4361EE'],
        gradients: [
          { from: '#7209B7', to: '#F72585', angle: 135 },
          { from: '#560BAD', to: '#4CC9F0', angle: 180 }
        ]
      },
      complexity: {
        particleCount: 3000,
        geometryDetail: 0.6,
        layerCount: 8,
        effectIntensity: 0.7,
        movementSpeed: 0.4,
        turbulence: 0.9
      },
      transitionStyle: {
        type: 'smooth',
        duration: 2000,
        easing: 'easeInOut',
        intensity: 0.3
      },
      visualElements: {
        type: 'organic',
        dimension: '3D',
        shapes: ['sphere', 'blob', 'wave', 'spiral'],
        textures: ['clouds', 'water', 'smoke', 'aurora'],
        behaviors: [
          { name: 'flow', intensity: 0.9, frequency: 0.2 },
          { name: 'breathe', intensity: 0.7, frequency: 0.1 },
          { name: 'ripple', intensity: 0.5, frequency: 0.3 }
        ]
      },
      energyMapping: {
        buildUpCurve: [0.2, 0.3, 0.4, 0.5, 0.6, 0.7],
        dropImpact: 0.5,
        breakdownSoftness: 0.9,
        peakIntensity: 0.7,
        energyFlow: 'sine'
      },
      genreAffinity: ['ambient', 'chill', 'downtempo', 'lounge'],
      moodTags: ['relaxed', 'dreamy', 'ethereal'],
      reactivity: {
        bass: 0.4,
        mid: 0.7,
        treble: 0.9,
        rhythm: 0.3,
        harmony: 1.0
      }
    });

    // Profile 3: Crystal Matrix - Trance/Progressive
    this.profiles.set('crystal-matrix', {
      id: 'crystal-matrix',
      name: 'Crystal Matrix',
      description: 'Crystalline structures with rainbow refractions for trance music',
      colorPalette: {
        primary: '#00F5FF',
        secondary: '#FF00F5',
        accent: '#00FF00',
        background: '#000033',
        highlights: ['#FFFF00', '#FF0080', '#00FFFF', '#8000FF'],
        gradients: [
          { from: '#00F5FF', to: '#FF00F5', angle: 60 },
          { from: '#00FF00', to: '#FFFF00', angle: 120 }
        ]
      },
      complexity: {
        particleCount: 8000,
        geometryDetail: 1.0,
        layerCount: 6,
        effectIntensity: 0.85,
        movementSpeed: 0.8,
        turbulence: 0.5
      },
      transitionStyle: {
        type: 'morph',
        duration: 500,
        easing: 'easeOut',
        intensity: 0.7
      },
      visualElements: {
        type: 'geometric',
        dimension: 'fractal',
        shapes: ['crystal', 'prism', 'diamond', 'tetrahedron'],
        textures: ['refraction', 'holographic', 'iridescent', 'glass'],
        behaviors: [
          { name: 'shatter', intensity: 0.6, frequency: 0.4 },
          { name: 'refract', intensity: 0.9, frequency: 0.6 },
          { name: 'sparkle', intensity: 0.8, frequency: 0.8 }
        ]
      },
      energyMapping: {
        buildUpCurve: [0.2, 0.4, 0.6, 0.8, 0.95, 1.0],
        dropImpact: 0.9,
        breakdownSoftness: 0.5,
        peakIntensity: 0.95,
        energyFlow: 'logarithmic'
      },
      genreAffinity: ['trance', 'progressive', 'psytrance', 'uplifting'],
      moodTags: ['euphoric', 'transcendent', 'cosmic'],
      reactivity: {
        bass: 0.7,
        mid: 0.8,
        treble: 0.9,
        rhythm: 0.8,
        harmony: 0.7
      }
    });

    // Profile 4: Urban Chaos - Hip-Hop/Trap
    this.profiles.set('urban-chaos', {
      id: 'urban-chaos',
      name: 'Urban Chaos',
      description: 'Gritty street art aesthetics with bold contrasts for urban music',
      colorPalette: {
        primary: '#FF4500',
        secondary: '#1C1C1C',
        accent: '#FFD700',
        background: '#0A0A0A',
        highlights: ['#DC143C', '#00CED1', '#FF1493'],
        gradients: [
          { from: '#FF4500', to: '#1C1C1C', angle: 90 },
          { from: '#FFD700', to: '#DC143C', angle: 45 }
        ]
      },
      complexity: {
        particleCount: 4000,
        geometryDetail: 0.7,
        layerCount: 4,
        effectIntensity: 0.8,
        movementSpeed: 0.9,
        turbulence: 0.8
      },
      transitionStyle: {
        type: 'glitch',
        duration: 100,
        easing: 'linear',
        intensity: 0.9
      },
      visualElements: {
        type: 'hybrid',
        dimension: '2D',
        shapes: ['graffiti', 'stencil', 'tag', 'splash'],
        textures: ['concrete', 'spray', 'drip', 'scratch'],
        behaviors: [
          { name: 'shake', intensity: 0.8, frequency: 0.7 },
          { name: 'distort', intensity: 0.7, frequency: 0.5 },
          { name: 'flicker', intensity: 0.6, frequency: 0.9 }
        ]
      },
      energyMapping: {
        buildUpCurve: [0.3, 0.4, 0.6, 0.7, 0.85, 1.0],
        dropImpact: 0.95,
        breakdownSoftness: 0.2,
        peakIntensity: 0.9,
        energyFlow: 'linear'
      },
      genreAffinity: ['hip-hop', 'trap', 'rap', 'urban'],
      moodTags: ['aggressive', 'raw', 'street'],
      reactivity: {
        bass: 1.0,
        mid: 0.5,
        treble: 0.4,
        rhythm: 0.95,
        harmony: 0.3
      }
    });

    // Profile 5: Digital Garden - Future Bass/Melodic
    this.profiles.set('digital-garden', {
      id: 'digital-garden',
      name: 'Digital Garden',
      description: 'Organic digital fusion with blooming patterns for melodic bass',
      colorPalette: {
        primary: '#2ECC71',
        secondary: '#E74C3C',
        accent: '#F39C12',
        background: '#0C2427',
        highlights: ['#1ABC9C', '#9B59B6', '#3498DB'],
        gradients: [
          { from: '#2ECC71', to: '#1ABC9C', angle: 30 },
          { from: '#E74C3C', to: '#F39C12', angle: 150 }
        ]
      },
      complexity: {
        particleCount: 6000,
        geometryDetail: 0.85,
        layerCount: 7,
        effectIntensity: 0.75,
        movementSpeed: 0.7,
        turbulence: 0.6
      },
      transitionStyle: {
        type: 'dissolve',
        duration: 800,
        easing: 'easeInOut',
        intensity: 0.6
      },
      visualElements: {
        type: 'hybrid',
        dimension: '3D',
        shapes: ['flower', 'vine', 'circuit', 'polygon'],
        textures: ['leaves', 'digital', 'mesh', 'gradient'],
        behaviors: [
          { name: 'bloom', intensity: 0.8, frequency: 0.3 },
          { name: 'grow', intensity: 0.7, frequency: 0.2 },
          { name: 'pixelate', intensity: 0.5, frequency: 0.6 }
        ]
      },
      energyMapping: {
        buildUpCurve: [0.1, 0.25, 0.45, 0.65, 0.85, 1.0],
        dropImpact: 0.8,
        breakdownSoftness: 0.7,
        peakIntensity: 0.85,
        energyFlow: 'exponential'
      },
      genreAffinity: ['future-bass', 'melodic-dubstep', 'chill-trap'],
      moodTags: ['uplifting', 'colorful', 'playful'],
      reactivity: {
        bass: 0.7,
        mid: 0.9,
        treble: 0.8,
        rhythm: 0.6,
        harmony: 0.95
      }
    });

    // Profile 6: Void Walker - Dark Techno/Industrial
    this.profiles.set('void-walker', {
      id: 'void-walker',
      name: 'Void Walker',
      description: 'Dark minimal aesthetics with sharp contrasts for industrial sounds',
      colorPalette: {
        primary: '#FF0000',
        secondary: '#000000',
        accent: '#FFFFFF',
        background: '#050505',
        highlights: ['#8B0000', '#696969', '#FF6347'],
        gradients: [
          { from: '#FF0000', to: '#000000', angle: 180 },
          { from: '#FFFFFF', to: '#696969', angle: 270 }
        ]
      },
      complexity: {
        particleCount: 2000,
        geometryDetail: 0.9,
        layerCount: 3,
        effectIntensity: 1.0,
        movementSpeed: 1.5,
        turbulence: 0.4
      },
      transitionStyle: {
        type: 'shatter',
        duration: 50,
        easing: 'linear',
        intensity: 1.0
      },
      visualElements: {
        type: 'geometric',
        dimension: '3D',
        shapes: ['spike', 'shard', 'void', 'beam'],
        textures: ['metal', 'rust', 'static', 'void'],
        behaviors: [
          { name: 'strobe', intensity: 0.9, frequency: 0.8 },
          { name: 'implode', intensity: 0.7, frequency: 0.3 },
          { name: 'corrupt', intensity: 0.8, frequency: 0.6 }
        ]
      },
      energyMapping: {
        buildUpCurve: [0.4, 0.5, 0.6, 0.8, 0.9, 1.0],
        dropImpact: 1.0,
        breakdownSoftness: 0.1,
        peakIntensity: 1.0,
        energyFlow: 'linear'
      },
      genreAffinity: ['techno', 'industrial', 'dark', 'minimal'],
      moodTags: ['dark', 'intense', 'mechanical'],
      reactivity: {
        bass: 0.95,
        mid: 0.4,
        treble: 0.6,
        rhythm: 1.0,
        harmony: 0.2
      }
    });

    // Profile 7: Cosmic Voyage - Space/Psychedelic
    this.profiles.set('cosmic-voyage', {
      id: 'cosmic-voyage',
      name: 'Cosmic Voyage',
      description: 'Interstellar journeys with nebula colors for psychedelic experiences',
      colorPalette: {
        primary: '#4B0082',
        secondary: '#FF1493',
        accent: '#00CED1',
        background: '#000014',
        highlights: ['#DA70D6', '#FF69B4', '#7B68EE', '#00FA9A'],
        gradients: [
          { from: '#4B0082', to: '#FF1493', angle: 45 },
          { from: '#00CED1', to: '#DA70D6', angle: 225 }
        ]
      },
      complexity: {
        particleCount: 10000,
        geometryDetail: 0.95,
        layerCount: 9,
        effectIntensity: 0.9,
        movementSpeed: 0.6,
        turbulence: 0.85
      },
      transitionStyle: {
        type: 'morph',
        duration: 1500,
        easing: 'easeInOut',
        intensity: 0.5
      },
      visualElements: {
        type: 'organic',
        dimension: 'fractal',
        shapes: ['nebula', 'galaxy', 'star', 'wormhole'],
        textures: ['space', 'plasma', 'cosmic', 'stardust'],
        behaviors: [
          { name: 'orbit', intensity: 0.7, frequency: 0.1 },
          { name: 'warp', intensity: 0.8, frequency: 0.4 },
          { name: 'twinkle', intensity: 0.9, frequency: 0.7 }
        ]
      },
      energyMapping: {
        buildUpCurve: [0.1, 0.2, 0.35, 0.55, 0.8, 1.0],
        dropImpact: 0.85,
        breakdownSoftness: 0.8,
        peakIntensity: 0.9,
        energyFlow: 'sine'
      },
      genreAffinity: ['psychedelic', 'space', 'cosmic', 'experimental'],
      moodTags: ['trippy', 'expansive', 'otherworldly'],
      reactivity: {
        bass: 0.6,
        mid: 0.8,
        treble: 0.95,
        rhythm: 0.5,
        harmony: 0.9
      }
    });

    // Profile 8: Retro Wave - Synthwave/80s
    this.profiles.set('retro-wave', {
      id: 'retro-wave',
      name: 'Retro Wave',
      description: '80s nostalgia with neon grids and sunset colors',
      colorPalette: {
        primary: '#FF0080',
        secondary: '#00FFFF',
        accent: '#FFFF00',
        background: '#1A0033',
        highlights: ['#FF00FF', '#00FF00', '#FF4500'],
        gradients: [
          { from: '#FF0080', to: '#00FFFF', angle: 90 },
          { from: '#FFFF00', to: '#FF00FF', angle: 180 }
        ]
      },
      complexity: {
        particleCount: 3500,
        geometryDetail: 0.7,
        layerCount: 5,
        effectIntensity: 0.8,
        movementSpeed: 1.0,
        turbulence: 0.3
      },
      transitionStyle: {
        type: 'smooth',
        duration: 400,
        easing: 'linear',
        intensity: 0.7
      },
      visualElements: {
        type: 'geometric',
        dimension: '2D',
        shapes: ['grid', 'triangle', 'sun', 'palm'],
        textures: ['neon', 'chrome', 'laser', 'sunset'],
        behaviors: [
          { name: 'scan', intensity: 0.7, frequency: 0.5 },
          { name: 'glow', intensity: 0.9, frequency: 0.6 },
          { name: 'drive', intensity: 0.6, frequency: 0.3 }
        ]
      },
      energyMapping: {
        buildUpCurve: [0.2, 0.4, 0.5, 0.7, 0.85, 1.0],
        dropImpact: 0.8,
        breakdownSoftness: 0.6,
        peakIntensity: 0.85,
        energyFlow: 'linear'
      },
      genreAffinity: ['synthwave', 'retrowave', 'outrun', '80s'],
      moodTags: ['nostalgic', 'vibrant', 'retro'],
      reactivity: {
        bass: 0.8,
        mid: 0.7,
        treble: 0.6,
        rhythm: 0.85,
        harmony: 0.7
      }
    });

    // Profile 9: Neural Network - Glitch/IDM
    this.profiles.set('neural-network', {
      id: 'neural-network',
      name: 'Neural Network',
      description: 'Data visualization aesthetics with glitch art for experimental music',
      colorPalette: {
        primary: '#00FF41',
        secondary: '#0080FF',
        accent: '#FF0040',
        background: '#0A0A0A',
        highlights: ['#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF'],
        gradients: [
          { from: '#00FF41', to: '#0080FF', angle: 135 },
          { from: '#FF0040', to: '#FFFF00', angle: 315 }
        ]
      },
      complexity: {
        particleCount: 7000,
        geometryDetail: 1.0,
        layerCount: 8,
        effectIntensity: 0.95,
        movementSpeed: 1.3,
        turbulence: 0.9
      },
      transitionStyle: {
        type: 'glitch',
        duration: 150,
        easing: 'linear',
        intensity: 0.95
      },
      visualElements: {
        type: 'hybrid',
        dimension: '3D',
        shapes: ['node', 'connection', 'data', 'matrix'],
        textures: ['code', 'glitch', 'binary', 'scan'],
        behaviors: [
          { name: 'compute', intensity: 0.9, frequency: 0.8 },
          { name: 'fragment', intensity: 0.8, frequency: 0.6 },
          { name: 'decode', intensity: 0.7, frequency: 0.9 }
        ]
      },
      energyMapping: {
        buildUpCurve: [0.3, 0.4, 0.55, 0.7, 0.9, 1.0],
        dropImpact: 0.95,
        breakdownSoftness: 0.3,
        peakIntensity: 0.95,
        energyFlow: 'exponential'
      },
      genreAffinity: ['glitch', 'idm', 'experimental', 'breakcore'],
      moodTags: ['chaotic', 'digital', 'complex'],
      reactivity: {
        bass: 0.7,
        mid: 0.85,
        treble: 0.95,
        rhythm: 0.9,
        harmony: 0.6
      }
    });

    // Profile 10: Ocean Deep - Deep House/Dub
    this.profiles.set('ocean-deep', {
      id: 'ocean-deep',
      name: 'Ocean Deep',
      description: 'Underwater atmospheres with flowing movements for deep grooves',
      colorPalette: {
        primary: '#006994',
        secondary: '#13505B',
        accent: '#0C7489',
        background: '#040F0F',
        highlights: ['#119DA4', '#19647E', '#28AFB0'],
        gradients: [
          { from: '#006994', to: '#040F0F', angle: 180 },
          { from: '#0C7489', to: '#119DA4', angle: 90 }
        ]
      },
      complexity: {
        particleCount: 4500,
        geometryDetail: 0.75,
        layerCount: 6,
        effectIntensity: 0.65,
        movementSpeed: 0.5,
        turbulence: 0.7
      },
      transitionStyle: {
        type: 'smooth',
        duration: 1200,
        easing: 'easeInOut',
        intensity: 0.4
      },
      visualElements: {
        type: 'organic',
        dimension: '3D',
        shapes: ['wave', 'bubble', 'current', 'coral'],
        textures: ['water', 'caustics', 'sand', 'kelp'],
        behaviors: [
          { name: 'drift', intensity: 0.8, frequency: 0.2 },
          { name: 'bubble', intensity: 0.6, frequency: 0.4 },
          { name: 'sway', intensity: 0.7, frequency: 0.3 }
        ]
      },
      energyMapping: {
        buildUpCurve: [0.3, 0.4, 0.5, 0.65, 0.8, 0.9],
        dropImpact: 0.7,
        breakdownSoftness: 0.85,
        peakIntensity: 0.8,
        energyFlow: 'sine'
      },
      genreAffinity: ['deep-house', 'dub', 'minimal', 'tech-house'],
      moodTags: ['deep', 'smooth', 'hypnotic'],
      reactivity: {
        bass: 0.9,
        mid: 0.6,
        treble: 0.5,
        rhythm: 0.8,
        harmony: 0.7
      }
    });
  }

  /**
   * Create default active state
   */
  private createDefaultActiveState(): ActiveVisualState {
    const defaultProfile = this.profiles.get('neon-pulse')!;
    return {
      currentProfile: defaultProfile,
      targetProfile: null,
      interpolationProgress: 0,
      colorTransitions: new Map(),
      complexityTransitions: new Map(),
      activePatterns: [],
      midiModulations: new Map()
    };
  }

  /**
   * Connect to audio analyzer and controller
   */
  public connectSystems(analyzer: RealTimeAudioAnalyzer, controllerState: AIEnhancedControllerState): void {
    this.analyzer = analyzer;
    this.controllerState = controllerState;
    console.log('🔗 Visual DNA System connected to Audio Analyzer and Controller');
  }

  /**
   * Main update loop - processes audio and MIDI data to generate visual state
   */
  public update(timestamp: number): ActiveVisualState {
    // Always process MIDI modulations first
    if (this.controllerState) {
      this.processMIDIModulations();
    }

    // Check if manual mode has expired
    if (this.manualMode && this.manualModeTimeout && timestamp > this.manualModeTimeout) {
      this.manualMode = false;
      this.manualModeTimeout = null;
      console.log('📻 Returning to automatic profile selection');
    }

    if (!this.analyzer || !this.controllerState) {
      return this.activeState;
    }

    try {
      // Get current analysis data
      const aiState = this.analyzer.getAIState();
      const patternRecognition = aiState.patternRecognition as PatternRecognition;
      const genreClassification = patternRecognition?.genreClassification;
      const energyPrediction = patternRecognition?.energyPrediction;
      const transitionDetection = patternRecognition?.transitionDetection;
      
      // Check if we have valid data and audio is actually playing
      const hasValidAudio = aiState.audioInput?.audioLevel > 0.01; // Minimum threshold
      
      if (!genreClassification || !energyPrediction || !hasValidAudio) {
        // Use MIDI-only mode when no audio
        const defaultGenre = { detectedGenre: 'electronic', confidence: 0.5 };
        const defaultEnergy = { 
          currentEnergy: this.getMIDIEnergy(), // Calculate from MIDI instead
          energyTrend: 'stable' as const,
          predictedEnergy: [],
          peakPrediction: 0.5
        };
        
        // Only update patterns if we're actually getting new data
        if (this.activeState.activePatterns.length === 0) {
          this.updateActivePatterns({ detectedPatterns: [], energyPrediction: defaultEnergy } as any);
        }
        
        // Don't initiate transitions in MIDI-only mode unless significant change
        const currentEnergy = this.getMIDIEnergy();
        const lastEnergy = this.activeState.midiModulations.get('lastEnergy') || 0.5;
        const energyDelta = Math.abs(currentEnergy - lastEnergy);
        
        // Only transition if energy change is significant
        if (energyDelta > 0.3) {
          const selectedProfile = this.selectProfileByEnergy(currentEnergy);
          if (selectedProfile.id !== this.activeState.currentProfile.id && !this.activeState.targetProfile) {
            this.initiateProfileTransition(selectedProfile);
          }
          this.activeState.midiModulations.set('lastEnergy', currentEnergy);
        }
        
        // Continue any ongoing transitions
        this.updateInterpolation();
        
        return this.activeState;
      }

    // Update pattern history
    this.updatePatternHistory(patternRecognition, timestamp);

    // Select appropriate profile based on analysis
    const selectedProfile = this.selectProfile(genreClassification, energyPrediction);

    // Handle profile transitions - add cooldown to prevent rapid switching
    const lastTransitionTime = this.activeState.midiModulations.get('lastTransition') || 0;
    const transitionCooldown = 5000; // 5 seconds between transitions
    
    // Only auto-transition if not in manual mode
    if (!this.manualMode &&
        selectedProfile.id !== this.activeState.currentProfile.id && 
        !this.activeState.targetProfile &&
        (timestamp - lastTransitionTime) > transitionCooldown) {
      this.initiateProfileTransition(selectedProfile);
      this.activeState.midiModulations.set('lastTransition', timestamp);
    }

    // Update interpolation
    this.updateInterpolation();

    // Generate dynamic color palette
    this.updateColorPalette(energyPrediction, genreClassification);

    // Scale visual complexity
    this.updateVisualComplexity(energyPrediction, transitionDetection);

    // Process MIDI modulations (already done at start)
    
    // Update active patterns
    this.updateActivePatterns(patternRecognition);

    return this.activeState;
    } catch (error) {
      console.error('Error in Visual DNA update:', error);
      // Return current state on error
      return this.activeState;
    }
  }

  /**
   * Calculate energy from MIDI controller state
   */
  private getMIDIEnergy(): number {
    if (!this.controllerState) return 0.5;
    
    const volumeA = (this.controllerState.channelA?.volume || 127) / 127;
    const volumeB = (this.controllerState.channelB?.volume || 127) / 127;
    const crossfader = (this.controllerState.crossfader || 64) / 127;
    
    // Mix channels based on crossfader position
    const mixedVolume = volumeA * (1 - crossfader) + volumeB * crossfader;
    
    // Add EQ influence
    const eqInfluence = 0.3;
    const avgEqA = ((this.controllerState.channelA?.eq?.low || 64) + 
                    (this.controllerState.channelA?.eq?.mid || 64) + 
                    (this.controllerState.channelA?.eq?.high || 64)) / (3 * 127);
    const avgEqB = ((this.controllerState.channelB?.eq?.low || 64) + 
                    (this.controllerState.channelB?.eq?.mid || 64) + 
                    (this.controllerState.channelB?.eq?.high || 64)) / (3 * 127);
    
    const mixedEq = avgEqA * (1 - crossfader) + avgEqB * crossfader;
    
    return mixedVolume * (1 - eqInfluence) + mixedEq * eqInfluence;
  }

  /**
   * Select profile by energy level only (for MIDI-only mode)
   */
  private selectProfileByEnergy(energyLevel: number): VisualDNAProfile {
    // Get default profile first to ensure we always have a fallback
    const defaultProfile = this.profiles.get('neon-pulse') || this.profiles.values().next().value!;
    
    if (energyLevel > 0.8) {
      return this.profiles.get('neon-pulse') || defaultProfile;
    } else if (energyLevel > 0.6) {
      return this.profiles.get('crystal-matrix') || defaultProfile;
    } else if (energyLevel > 0.4) {
      return this.profiles.get('digital-garden') || defaultProfile;
    } else if (energyLevel > 0.2) {
      return this.profiles.get('ocean-deep') || defaultProfile;
    } else {
      return this.profiles.get('liquid-dreams') || defaultProfile;
    }
  }

  /**
   * Select profile based on current music analysis
   */
  private selectProfile(genre: GenreClassification, energy: EnergyPrediction): VisualDNAProfile {
    const detectedGenre = genre.detectedGenre.toLowerCase();
    const energyLevel = energy.currentEnergy;
    
    // Find profiles with genre affinity
    const matchingProfiles = Array.from(this.profiles.values()).filter(profile => 
      profile.genreAffinity.some(g => detectedGenre.includes(g) || g.includes(detectedGenre))
    );

    if (matchingProfiles.length > 0) {
      // Sort by energy compatibility
      matchingProfiles.sort((a, b) => {
        const aDiff = Math.abs(a.energyMapping.peakIntensity - energyLevel);
        const bDiff = Math.abs(b.energyMapping.peakIntensity - energyLevel);
        return aDiff - bDiff;
      });
      return matchingProfiles[0];
    }

    // Fallback: select by energy level
    if (energyLevel > 0.8) {
      return this.profiles.get('neon-pulse')!;
    } else if (energyLevel > 0.6) {
      return this.profiles.get('crystal-matrix')!;
    } else if (energyLevel > 0.4) {
      return this.profiles.get('digital-garden')!;
    } else {
      return this.profiles.get('liquid-dreams')!;
    }
  }

  /**
   * Initiate smooth transition between profiles
   */
  private initiateProfileTransition(targetProfile: VisualDNAProfile): void {
    this.activeState.targetProfile = targetProfile;
    this.activeState.interpolationProgress = 0;

    // Setup color transitions
    this.activeState.colorTransitions.clear();
    const colorKeys = ['primary', 'secondary', 'accent', 'background'];
    colorKeys.forEach(key => {
      this.activeState.colorTransitions.set(key, {
        from: (this.activeState.currentProfile.colorPalette as any)[key],
        to: (targetProfile.colorPalette as any)[key],
        progress: 0
      });
    });

    // Setup complexity transitions
    this.activeState.complexityTransitions.clear();
    const complexityKeys = Object.keys(this.activeState.currentProfile.complexity);
    complexityKeys.forEach(key => {
      this.activeState.complexityTransitions.set(key, {
        from: (this.activeState.currentProfile.complexity as any)[key],
        to: (targetProfile.complexity as any)[key],
        progress: 0
      });
    });

    console.log(`🎨 Transitioning from ${this.activeState.currentProfile.name} to ${targetProfile.name}`);
  }

  /**
   * Update interpolation between profiles
   */
  private updateInterpolation(): void {
    if (!this.activeState.targetProfile) return;

    this.activeState.interpolationProgress += this.INTERPOLATION_SPEED;

    if (this.activeState.interpolationProgress >= 1) {
      // Transition complete
      this.activeState.currentProfile = this.activeState.targetProfile;
      this.activeState.targetProfile = null;
      this.activeState.interpolationProgress = 0;
      this.activeState.colorTransitions.clear();
      this.activeState.complexityTransitions.clear();
    } else {
      // Update transition progress
      this.activeState.colorTransitions.forEach((transition, key) => {
        transition.progress = this.activeState.interpolationProgress;
      });
      this.activeState.complexityTransitions.forEach((transition, key) => {
        transition.progress = this.activeState.interpolationProgress;
      });
    }
  }

  /**
   * Generate dynamic color palette based on energy and mood
   */
  private updateColorPalette(energy: EnergyPrediction, genre: GenreClassification): void {
    const energyMultiplier = 0.5 + (energy.currentEnergy * 0.5);
    const currentPalette = this.getCurrentInterpolatedPalette();
    
    // Adjust palette brightness based on energy
    const adjustedPalette: ColorPalette = {
      ...currentPalette,
      primary: this.adjustColorBrightness(currentPalette.primary, energyMultiplier),
      secondary: this.adjustColorBrightness(currentPalette.secondary, energyMultiplier * 0.8),
      accent: this.adjustColorBrightness(currentPalette.accent, energyMultiplier * 1.2),
      highlights: currentPalette.highlights.map(color => 
        this.adjustColorBrightness(color, energyMultiplier * 0.9)
      )
    };

    // Store in history
    this.colorHistory.push(adjustedPalette);
    if (this.colorHistory.length > this.COLOR_HISTORY_SIZE) {
      this.colorHistory.shift();
    }
  }

  /**
   * Scale visual complexity based on energy and transitions
   */
  private updateVisualComplexity(energy: EnergyPrediction, transition: any): void {
    const baseComplexity = this.getCurrentInterpolatedComplexity();
    const transitionMultiplier = transition.isTransitioning ? 1.5 : 1.0;
    const energyMultiplier = 0.5 + (energy.currentEnergy * 0.5);

    // Apply modulations from MIDI
    const midiModulation = this.activeState.midiModulations.get('complexity') || 1.0;

    // Calculate final complexity values
    const adjustedComplexity: VisualComplexity = {
      particleCount: Math.floor(baseComplexity.particleCount * energyMultiplier * midiModulation),
      geometryDetail: baseComplexity.geometryDetail * energyMultiplier,
      layerCount: Math.floor(baseComplexity.layerCount * transitionMultiplier),
      effectIntensity: Math.min(1, baseComplexity.effectIntensity * energyMultiplier * transitionMultiplier),
      movementSpeed: baseComplexity.movementSpeed * energyMultiplier,
      turbulence: baseComplexity.turbulence * (transition.isTransitioning ? 1.3 : 1.0)
    };

    // Update active state with adjusted complexity
    this.activeState.currentProfile = {
      ...this.activeState.currentProfile,
      complexity: adjustedComplexity
    };
  }

  /**
   * Process MIDI controller input for real-time modulation
   */
  private processMIDIModulations(): void {
    if (!this.controllerState) return;

    // Map controller values to visual parameters
    const volumeA = (this.controllerState.channelA?.volume || 127) / 127;
    const volumeB = (this.controllerState.channelB?.volume || 127) / 127;
    const crossfader = (this.controllerState.crossfader || 64) / 127;

    // Effects modulation - check if properties exist
    let filterMod = 0.5;
    let reverbMod = 0.5;
    
    if ('effectControls' in this.controllerState && this.controllerState.effectControls) {
      filterMod = (this.controllerState.effectControls.filter?.low || 64) / 127;
      reverbMod = (this.controllerState.effectControls.reverb?.level || 64) / 127;
    } else {
      // Use EQ values as fallback for effect modulation
      const eqALow = this.controllerState.channelA?.eq?.low || 64;
      const eqAMid = this.controllerState.channelA?.eq?.mid || 64;
      const eqAHigh = this.controllerState.channelA?.eq?.high || 64;
      const avgEqA = (eqALow + eqAMid + eqAHigh) / (3 * 127);
      
      const eqBLow = this.controllerState.channelB?.eq?.low || 64;
      const eqBMid = this.controllerState.channelB?.eq?.mid || 64;
      const eqBHigh = this.controllerState.channelB?.eq?.high || 64;
      const avgEqB = (eqBLow + eqBMid + eqBHigh) / (3 * 127);
      filterMod = (avgEqA + avgEqB) / 2;
      reverbMod = Math.abs(crossfader - 0.5) * 2; // Use crossfader position for reverb effect
    }

    // Update modulation values
    this.activeState.midiModulations.set('complexity', 0.5 + (volumeA + volumeB) * 0.25);
    this.activeState.midiModulations.set('speed', 0.5 + crossfader * 0.5);
    this.activeState.midiModulations.set('intensity', filterMod);
    this.activeState.midiModulations.set('turbulence', reverbMod);
  }

  /**
   * Update pattern history and active patterns
   */
  private updatePatternHistory(patterns: PatternRecognition, timestamp: number): void {
    if (patterns.detectedPatterns.length > 0) {
      this.patternHistory.push({
        timestamp,
        pattern: patterns.detectedPatterns[0]
      });

      if (this.patternHistory.length > this.PATTERN_HISTORY_SIZE) {
        this.patternHistory.shift();
      }
    }
  }

  /**
   * Update active patterns for visual generation
   */
  private updateActivePatterns(patterns: PatternRecognition): void {
    this.activeState.activePatterns = patterns.detectedPatterns.map(pattern => ({
      pattern,
      confidence: patterns.energyPrediction.currentEnergy
    }));
  }

  /**
   * Get current interpolated palette
   */
  private getCurrentInterpolatedPalette(): ColorPalette {
    if (!this.activeState.targetProfile) {
      return this.activeState.currentProfile.colorPalette;
    }

    const interpolated: ColorPalette = {
      primary: '',
      secondary: '',
      accent: '',
      background: '',
      highlights: [],
      gradients: []
    };

    // Interpolate each color
    this.activeState.colorTransitions.forEach((transition, key) => {
      (interpolated as any)[key] = this.interpolateColor(
        transition.from,
        transition.to,
        transition.progress
      );
    });

    // Use current highlights and gradients for now
    interpolated.highlights = this.activeState.currentProfile.colorPalette.highlights;
    interpolated.gradients = this.activeState.currentProfile.colorPalette.gradients;

    return interpolated;
  }

  /**
   * Get current interpolated complexity
   */
  private getCurrentInterpolatedComplexity(): VisualComplexity {
    if (!this.activeState.targetProfile) {
      return this.activeState.currentProfile.complexity;
    }

    const interpolated: any = {};

    this.activeState.complexityTransitions.forEach((transition, key) => {
      interpolated[key] = this.interpolateValue(
        transition.from,
        transition.to,
        transition.progress
      );
    });

    return interpolated as VisualComplexity;
  }

  /**
   * Interpolate between two colors
   */
  private interpolateColor(from: string, to: string, progress: number): string {
    // Simple hex color interpolation
    const fromRGB = this.hexToRGB(from);
    const toRGB = this.hexToRGB(to);

    const r = Math.round(fromRGB.r + (toRGB.r - fromRGB.r) * progress);
    const g = Math.round(fromRGB.g + (toRGB.g - fromRGB.g) * progress);
    const b = Math.round(fromRGB.b + (toRGB.b - fromRGB.b) * progress);

    return this.rgbToHex(r, g, b);
  }

  /**
   * Interpolate between two numeric values
   */
  private interpolateValue(from: number, to: number, progress: number): number {
    return from + (to - from) * progress;
  }

  /**
   * Adjust color brightness
   */
  private adjustColorBrightness(color: string, multiplier: number): string {
    const rgb = this.hexToRGB(color);
    const r = Math.min(255, Math.round(rgb.r * multiplier));
    const g = Math.min(255, Math.round(rgb.g * multiplier));
    const b = Math.min(255, Math.round(rgb.b * multiplier));
    return this.rgbToHex(r, g, b);
  }

  /**
   * Convert hex to RGB
   */
  private hexToRGB(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  /**
   * Convert RGB to hex
   */
  private rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /**
   * Get visual DNA profiles
   */
  public getProfiles(): Map<string, VisualDNAProfile> {
    return this.profiles;
  }

  /**
   * Get current visual state
   */
  public getActiveState(): ActiveVisualState {
    return this.activeState;
  }

  /**
   * Get specific profile by ID
   */
  public getProfile(id: string): VisualDNAProfile | undefined {
    return this.profiles.get(id);
  }

  /**
   * Get color history for smooth transitions
   */
  public getColorHistory(): ColorPalette[] {
    return this.colorHistory;
  }

  /**
   * Get pattern history for analysis
   */
  public getPatternHistory(): Array<{ timestamp: number; pattern: any }> {
    return this.patternHistory;
  }

  /**
   * Manually select a profile by ID
   */
  public selectProfileManually(profileId: string): boolean {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      console.error(`Profile ${profileId} not found`);
      return false;
    }

    // Enable manual mode
    this.manualMode = true;
    this.manualModeTimeout = performance.now() + this.MANUAL_MODE_DURATION;
    
    // Initiate transition to selected profile
    if (profile.id !== this.activeState.currentProfile.id) {
      this.initiateProfileTransition(profile);
      console.log(`🎨 Manually switching to ${profile.name}`);
    }
    
    return true;
  }

  /**
   * Get all available profiles for UI
   */
  public getProfileList(): Array<{ id: string; name: string; description: string; moodTags: string[] }> {
    return Array.from(this.profiles.values()).map(profile => ({
      id: profile.id,
      name: profile.name,
      description: profile.description,
      moodTags: profile.moodTags
    }));
  }

  /**
   * Check if in manual mode
   */
  public isManualMode(): boolean {
    return this.manualMode;
  }

  /**
   * Exit manual mode and return to automatic
   */
  public exitManualMode(): void {
    this.manualMode = false;
    this.manualModeTimeout = null;
    console.log('📻 Exited manual mode');
  }
} 