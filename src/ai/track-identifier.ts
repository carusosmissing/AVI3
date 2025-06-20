import { Track, AdvancedMetrics } from '../types';

export interface AudioFingerprint {
  spectralProfile: number[];
  tempoProfile: number[];
  energyProfile: number[];
  keyProfile: number[];
  timestamp: number;
  confidence: number;
}

export interface TrackMatch {
  track: Track;
  confidence: number;
  matchedFeatures: {
    tempo: number;
    key: number;
    energy: number;
    spectral: number;
    overall: number;
  };
  timeOffset: number;
  reasoning: string[];
}

export interface IdentificationResult {
  currentTrack: TrackMatch | null;
  alternativeTracks: TrackMatch[];
  isConfident: boolean;
  confidenceScore: number;
  analysisEnhancement: {
    predictedBPM: number;
    predictedKey: string;
    predictedGenre: string;
    predictedEnergy: number;
    songSection: string;
    timeInTrack: number;
    timeRemaining: number;
  };
}

export class AITrackIdentifier {
  private trackDatabase: Track[] = [];
  private fingerprintHistory: AudioFingerprint[] = [];
  private currentMatch: TrackMatch | null = null;
  private matchHistory: TrackMatch[] = [];
  
  // Configuration
  private readonly FINGERPRINT_HISTORY_SIZE = 50;
  private readonly MATCH_CONFIDENCE_THRESHOLD = 0.7;
  private readonly SPECTRAL_BINS = 32;
  private readonly TEMPO_ANALYSIS_WINDOW = 10; // seconds
  
  constructor() {
    console.log('🎯 Initializing AI Track Identifier...');
  }

  /**
   * Load track database from Rekordbox collection
   */
  public loadTrackDatabase(tracks: Track[]): void {
    this.trackDatabase = tracks;
    console.log(`📚 Loaded ${tracks.length} tracks into identification database`);
    
    // Pre-process tracks for faster matching
    this.preprocessTracks();
  }

  /**
   * Identify current track from live audio analysis
   */
  public async identifyTrack(
    audioMetrics: AdvancedMetrics,
    audioLevel: number,
    midiData?: any
  ): Promise<IdentificationResult> {
    
    console.log('🎯 Track identification running...', {
      audioLevel: audioLevel.toFixed(3),
      spectralCentroid: audioMetrics.spectralCentroid?.toFixed(0),
      databaseSize: this.trackDatabase.length,
      midiData: midiData ? 'present' : 'none'
    });
    
    const matches = await this.findMatches(audioMetrics, audioLevel, midiData);
    
    console.log(`🔍 Found ${matches.length} potential matches:`, 
      matches.slice(0, 3).map(m => `${m.track.name} (${(m.confidence * 100).toFixed(0)}%)`));
    
    this.updateCurrentMatch(matches);
    const enhancement = this.generateEnhancedAnalysis();
    
    return {
      currentTrack: this.currentMatch,
      alternativeTracks: matches.slice(0, 3),
      isConfident: this.currentMatch ? this.currentMatch.confidence > 0.5 : false, // Lower threshold
      confidenceScore: this.currentMatch?.confidence || 0,
      analysisEnhancement: enhancement
    };
  }

  /**
   * Create audio fingerprint from current audio analysis
   */
  private createAudioFingerprint(
    audioMetrics: AdvancedMetrics,
    audioLevel: number,
    midiData?: any
  ): AudioFingerprint {
    
    // Spectral profile (frequency distribution)
    const spectralProfile = this.createSpectralProfile(audioMetrics);
    
    // Tempo profile (rhythm analysis)
    const tempoProfile = this.createTempoProfile(audioMetrics, midiData);
    
    // Energy profile (loudness and dynamics)
    const energyProfile = this.createEnergyProfile(audioLevel, audioMetrics);
    
    // Key profile (harmonic content)
    const keyProfile = this.createKeyProfile(audioMetrics);
    
    // Calculate confidence based on signal quality
    const confidence = this.calculateFingerprintConfidence(audioLevel, audioMetrics);
    
    return {
      spectralProfile,
      tempoProfile,
      energyProfile,
      keyProfile,
      timestamp: performance.now(),
      confidence
    };
  }

  /**
   * Create spectral profile for frequency-based matching
   */
  private createSpectralProfile(audioMetrics: AdvancedMetrics): number[] {
    const profile = new Array(this.SPECTRAL_BINS).fill(0);
    
    // Use MFCC features as basis for spectral profile
    if (audioMetrics.mfcc && audioMetrics.mfcc.length > 0) {
      for (let i = 0; i < Math.min(this.SPECTRAL_BINS, audioMetrics.mfcc.length); i++) {
        profile[i] = audioMetrics.mfcc[i];
      }
    }
    
    // Add spectral centroid information
    const centroidBin = Math.floor((audioMetrics.spectralCentroid / 22050) * this.SPECTRAL_BINS);
    if (centroidBin < this.SPECTRAL_BINS) {
      profile[centroidBin] += 0.5;
    }
    
    // Add spectral rolloff information
    const rolloffBin = Math.floor((audioMetrics.spectralRolloff / 22050) * this.SPECTRAL_BINS);
    if (rolloffBin < this.SPECTRAL_BINS) {
      profile[rolloffBin] += 0.3;
    }
    
    return profile;
  }

  /**
   * Create tempo profile for rhythm-based matching
   */
  private createTempoProfile(audioMetrics: AdvancedMetrics, midiData?: any): number[] {
    const profile = new Array(8).fill(0);
    
    // Zero crossing rate indicates rhythmic content
    profile[0] = audioMetrics.zeroCrossingRate;
    
    // MIDI BPM if available
    if (midiData?.bpm) {
      const bpmNormalized = (midiData.bpm - 60) / 140; // Normalize 60-200 BPM to 0-1
      profile[1] = Math.max(0, Math.min(1, bpmNormalized));
    }
    
    // Spectral bandwidth can indicate rhythm complexity
    profile[2] = Math.min(1, audioMetrics.spectralBandwidth / 4000);
    
    // Fill remaining with rhythm analysis from chroma features
    if (audioMetrics.chroma) {
      for (let i = 0; i < Math.min(5, audioMetrics.chroma.length); i++) {
        profile[3 + i] = audioMetrics.chroma[i];
      }
    }
    
    return profile;
  }

  /**
   * Create energy profile for dynamics-based matching
   */
  private createEnergyProfile(audioLevel: number, audioMetrics: AdvancedMetrics): number[] {
    const profile = new Array(4).fill(0);
    
    profile[0] = audioLevel; // Current audio level
    profile[1] = audioMetrics.spectralCentroid / 22050; // Brightness
    profile[2] = audioMetrics.spectralBandwidth / 4000; // Spread
    profile[3] = audioMetrics.spectralRolloff / 22050; // High frequency content
    
    return profile;
  }

  /**
   * Create key profile for harmonic matching
   */
  private createKeyProfile(audioMetrics: AdvancedMetrics): number[] {
    // Use chroma features for key detection
    if (audioMetrics.chroma && audioMetrics.chroma.length >= 12) {
      return [...audioMetrics.chroma.slice(0, 12)];
    }
    
    // Fallback to basic harmonic analysis
    return new Array(12).fill(0.083); // Equal temperament baseline
  }

  /**
   * Calculate fingerprint confidence based on signal quality
   */
  private calculateFingerprintConfidence(audioLevel: number, audioMetrics: AdvancedMetrics): number {
    let confidence = 0;
    
    // Audio level contributes to confidence (need good signal)
    if (audioLevel > 0.1) confidence += 0.3;
    if (audioLevel > 0.3) confidence += 0.2;
    
    // Spectral content contributes to confidence
    if (audioMetrics.spectralCentroid > 100) confidence += 0.2;
    if (audioMetrics.spectralBandwidth > 200) confidence += 0.2;
    
    // MFCC quality
    if (audioMetrics.mfcc && audioMetrics.mfcc.some(val => Math.abs(val) > 0.1)) {
      confidence += 0.1;
    }
    
    return Math.min(1, confidence);
  }

  /**
   * Find matching tracks in database
   */
  private async findMatches(
    audioMetrics: AdvancedMetrics,
    audioLevel: number,
    midiData?: any
  ): Promise<TrackMatch[]> {
    const matches: TrackMatch[] = [];
    
    for (const track of this.trackDatabase) {
      const matchScore = this.calculateTrackMatchScore(audioMetrics, audioLevel, track, midiData);
      
      if (matchScore.overall > 0.2) { // Lower threshold for testing
        matches.push({
          track,
          confidence: matchScore.overall,
          matchedFeatures: matchScore,
          timeOffset: this.estimateTimeOffset(audioLevel, track),
          reasoning: this.generateMatchReasoning(matchScore, track)
        });
      }
    }
    
    matches.sort((a, b) => b.confidence - a.confidence);
    return matches.slice(0, 10);
  }

  /**
   * Calculate how well a fingerprint matches a track
   */
  private calculateTrackMatchScore(
    audioMetrics: AdvancedMetrics,
    audioLevel: number,
    track: Track,
    midiData?: any
  ): TrackMatch['matchedFeatures'] {
    let tempoScore = 0;
    let keyScore = 0.3; // Give a baseline score even without key data
    let energyScore = 0.2; // Give a baseline score 
    let spectralScore = 0.4; // Give a baseline score
    
    // Tempo matching - make more lenient
    if (midiData?.bpm && track.bpm) {
      const tempoDiff = Math.abs(midiData.bpm - track.bpm) / track.bpm;
      tempoScore = Math.max(0, 1 - (tempoDiff * 0.5)); // More lenient tempo matching
    } else {
      // If no MIDI BPM, give a neutral score
      tempoScore = 0.4;
    }
    
    // Key matching using chroma features  
    if (audioMetrics.chroma && audioMetrics.chroma.length >= 12 && track.key) {
      const calculatedScore = this.calculateKeyMatchScore(audioMetrics.chroma, track.key);
      keyScore = Math.max(keyScore, calculatedScore);
    }
    
    // Energy matching - make more lenient
    if (track.energyAnalysis && audioLevel > 0) {
      const trackEnergy = track.energyAnalysis.overall / 10;
      const energyDiff = Math.abs(trackEnergy - audioLevel);
      energyScore = Math.max(0.2, 1 - (energyDiff * 0.8)); // More lenient energy matching
    }
    
    // Spectral matching based on genre - always give some score
    const calculatedSpectral = this.calculateSpectralMatchScore(audioMetrics, track);
    spectralScore = Math.max(spectralScore, calculatedSpectral);
    
    // More balanced weighting
    const overall = (tempoScore * 0.25 + keyScore * 0.25 + energyScore * 0.25 + spectralScore * 0.25);
    
    return { tempo: tempoScore, key: keyScore, energy: energyScore, spectral: spectralScore, overall };
  }

  /**
   * Calculate key matching score
   */
  private calculateKeyMatchScore(chroma: number[], trackKey: string): number {
    const keyMap: { [key: string]: number } = {
      'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
      'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
    };
    
    const trackKeyIndex = keyMap[trackKey.replace('m', '')] || 0;
    const chromaStrength = chroma[trackKeyIndex] || 0;
    return Math.min(1, chromaStrength * 2);
  }

  /**
   * Calculate spectral matching score based on genre characteristics
   */
  private calculateSpectralMatchScore(audioMetrics: AdvancedMetrics, track: Track): number {
    if (!track.genre) return 0.5;
    
    const genre = track.genre.toLowerCase();
    let score = 0.5;
    
    const brightness = audioMetrics.spectralCentroid / 22050;
    const bandwidth = audioMetrics.spectralBandwidth / 4000;
    
    if (genre.includes('electronic') || genre.includes('house') || genre.includes('techno')) {
      score += brightness * 0.3;
    } else if (genre.includes('rock') || genre.includes('metal')) {
      score += bandwidth * 0.4;
    } else if (genre.includes('ambient') || genre.includes('classical')) {
      score += (1 - Math.abs(brightness - 0.5)) * 0.3;
    }
    
    return Math.min(1, score);
  }

  /**
   * Estimate time offset within the track
   */
  private estimateTimeOffset(audioLevel: number, track: Track): number {
    if (audioLevel < 0.3) return track.duration * 0.05; // Intro
    if (audioLevel > 0.7) return track.duration * 0.4; // Chorus
    return track.duration * 0.3; // Verse
  }

  /**
   * Generate reasoning for why tracks matched
   */
  private generateMatchReasoning(matchScore: TrackMatch['matchedFeatures'], track: Track): string[] {
    const reasoning: string[] = [];
    
    if (matchScore.tempo > 0.7) reasoning.push(`Strong BPM match (${track.bpm} BPM)`);
    if (matchScore.key > 0.6) reasoning.push(`Key signature match (${track.key})`);
    if (matchScore.energy > 0.6) reasoning.push(`Energy level match`);
    if (matchScore.spectral > 0.6) reasoning.push(`Genre characteristics match (${track.genre})`);
    
    if (reasoning.length === 0) reasoning.push('Weak overall similarity');
    return reasoning;
  }

  /**
   * Add fingerprint to history
   */
  private addToHistory(fingerprint: AudioFingerprint): void {
    this.fingerprintHistory.push(fingerprint);
    
    if (this.fingerprintHistory.length > this.FINGERPRINT_HISTORY_SIZE) {
      this.fingerprintHistory.shift();
    }
  }

  /**
   * Update current match with confidence tracking
   */
  private updateCurrentMatch(matches: TrackMatch[]): void {
    if (matches.length === 0) {
      this.currentMatch = null;
      return;
    }
    
    const bestMatch = matches[0];
    
    if (this.currentMatch) {
      if (this.currentMatch.track.id === bestMatch.track.id) {
        this.currentMatch.confidence = Math.min(0.98, this.currentMatch.confidence * 1.1);
      } else if (bestMatch.confidence > this.currentMatch.confidence + 0.2) {
        this.currentMatch = bestMatch;
      }
    } else if (bestMatch.confidence > 0.3) { // Lower threshold for better testing
      this.currentMatch = bestMatch;
    }
  }

  /**
   * Generate enhanced analysis based on identified track
   */
  private generateEnhancedAnalysis(): IdentificationResult['analysisEnhancement'] {
    if (!this.currentMatch) {
      return {
        predictedBPM: 120,
        predictedKey: 'C',
        predictedGenre: 'unknown',
        predictedEnergy: 0.5,
        songSection: 'unknown',
        timeInTrack: 0,
        timeRemaining: 0
      };
    }
    
    const track = this.currentMatch.track;
    const timeOffset = this.currentMatch.timeOffset;
    
    return {
      predictedBPM: track.bpm,
      predictedKey: track.key,
      predictedGenre: track.genre || 'unknown',
      predictedEnergy: track.energyAnalysis ? track.energyAnalysis.overall / 10 : 0.5,
      songSection: this.predictCurrentSection(track, timeOffset),
      timeInTrack: timeOffset,
      timeRemaining: Math.max(0, track.duration - timeOffset)
    };
  }

  /**
   * Predict current section of the song
   */
  private predictCurrentSection(track: Track, timeOffset: number): string {
    if (!track.songStructure) return 'unknown';
    
    const structure = track.songStructure;
    const ratio = timeOffset / track.duration;
    
    if (ratio < 0.1) return 'intro';
    if (ratio > 0.9) return 'outro';
    if (ratio > 0.3 && ratio < 0.5) return 'chorus';
    if (ratio > 0.7 && ratio < 0.9) return 'chorus';
    return 'verse';
  }

  /**
   * Pre-process tracks for faster matching
   */
  private preprocessTracks(): void {
    // This could include creating searchable indices, 
    // pre-computing fingerprints, etc.
    console.log('🔧 Pre-processing tracks for faster identification...');
  }

  /**
   * Get current match information
   */
  public getCurrentMatch(): TrackMatch | null {
    return this.currentMatch;
  }

  /**
   * Get identification statistics
   */
  public getStats() {
    return {
      databaseSize: this.trackDatabase.length,
      currentMatch: this.currentMatch?.track.name || 'None',
      confidence: this.currentMatch?.confidence || 0
    };
  }
} 