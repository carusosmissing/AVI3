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
    console.log(`📥 Attempting to load ${tracks.length} tracks into database...`);
    
    // Much more lenient filtering - only reject completely empty tracks
    const validTracks = tracks.filter((track, index) => {
      const hasAnyName = track.name && track.name.trim() !== '';
      const hasAnyArtist = track.artist && track.artist.trim() !== '';
      const hasValidBPM = track.bpm && track.bpm > 0;
      
      // Very lenient - accept tracks with at least some basic info
      const isValid = hasAnyName || hasAnyArtist || hasValidBPM;
      
      // Log first few tracks regardless of validity for debugging
      if (index < 5) {
        console.log(`🔍 Track ${index + 1}: "${track.name}" by "${track.artist}" (BPM: ${track.bpm}) - Valid: ${isValid}`);
      }
      
      if (!isValid && index < 10) {
        console.log(`🚫 Filtered out track ${index + 1}: "${track.name}" by "${track.artist}" (BPM: ${track.bpm}) - completely empty`);
      }
      
      return isValid;
    });
    
    console.log(`🧹 Filtered out ${tracks.length - validTracks.length} tracks with missing metadata`);
    
    this.trackDatabase = [...validTracks]; // Create a copy to ensure proper storage
    console.log(`📚 Successfully loaded ${this.trackDatabase.length} valid tracks into identification database`);
    
    if (this.trackDatabase.length > 0) {
      console.log(`🔍 Database verification: First track: "${this.trackDatabase[0]?.name}" by "${this.trackDatabase[0]?.artist}"`);
      console.log(`🔍 Last track: "${this.trackDatabase[this.trackDatabase.length - 1]?.name}" by "${this.trackDatabase[this.trackDatabase.length - 1]?.artist}"`);
    } else {
      console.log('⚠️ Warning: No valid tracks found in database after filtering');
    }
    
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
    
    console.log(`🔍 Searching through ${this.trackDatabase.length} tracks for matches...`);
    
    for (const track of this.trackDatabase) {
      const matchScore = this.calculateTrackMatchScore(audioMetrics, audioLevel, track, midiData);
      
      if (matchScore.overall > 0.4) { // Higher threshold for quality matches
        matches.push({
          track,
          confidence: matchScore.overall,
          matchedFeatures: matchScore,
          timeOffset: this.estimateTimeOffset(audioLevel, track),
          reasoning: this.generateMatchReasoning(matchScore, track)
        });
      }
    }
    
    console.log(`🎯 Found ${matches.length} potential matches with scores above 0.4`);
    
    matches.sort((a, b) => b.confidence - a.confidence);
    
    // Log top matches for debugging
    if (matches.length > 0) {
      console.log('🏆 Top 3 matches:');
      matches.slice(0, 3).forEach((match, index) => {
        console.log(`  ${index + 1}. "${match.track.name}" by ${match.track.artist} (${(match.confidence * 100).toFixed(1)}%)`);
        console.log(`     Scores: tempo=${(match.matchedFeatures.tempo * 100).toFixed(0)}%, key=${(match.matchedFeatures.key * 100).toFixed(0)}%, energy=${(match.matchedFeatures.energy * 100).toFixed(0)}%, spectral=${(match.matchedFeatures.spectral * 100).toFixed(0)}%`);
      });
    } else {
      console.log('❌ No matches found - this might indicate the matching algorithm needs adjustment');
    }
    
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
    // Start with zero scores - tracks must earn their points
    let tempoScore = 0;
    let keyScore = 0;
    let energyScore = 0;
    let spectralScore = 0;
    
    // GENRE FILTERING FIRST - eliminate obvious mismatches
    const detectedGenre = this.detectGenreFromAudio(audioMetrics);
    const genreCompatible = this.checkGenreCompatibility(detectedGenre, track.genre);
    
    // If genres are incompatible, eliminate completely for electronic music
    const genrePenalty = genreCompatible ? 1.0 : 0.0;
    
    // Debug logging for genre matching
    if (track.name === 'Hey Nineteen' || track.name === "Don't Stop Believin'" || track.artist === 'Journey') {
      console.log(`🎭 Genre Debug: "${track.name}" by ${track.artist}:`);
      console.log(`   Detected: ${detectedGenre}, Track: ${track.genre}`);
      console.log(`   Compatible: ${genreCompatible}, Penalty: ${genrePenalty}`);
    }
    
    // Tempo matching - estimate BPM from audio if no MIDI
    const estimatedBPM = this.estimateBPMFromAudio(audioMetrics, midiData);
    if (estimatedBPM > 0 && track.bpm > 0) {
      const tempoDiff = Math.abs(estimatedBPM - track.bpm);
      if (tempoDiff <= 3) tempoScore = 1.0;      // Perfect match
      else if (tempoDiff <= 6) tempoScore = 0.9; // Excellent  
      else if (tempoDiff <= 10) tempoScore = 0.7; // Good
      else if (tempoDiff <= 15) tempoScore = 0.5; // Okay
      else if (tempoDiff <= 20) tempoScore = 0.3; // Poor
      else tempoScore = 0.1; // Very poor
    }
    
    // Key matching - only score if we have good chroma data
    if (audioMetrics.chroma && audioMetrics.chroma.length >= 12 && track.key) {
      const rawKeyScore = this.calculateKeyMatchScore(audioMetrics.chroma, track.key);
      // Only give points for good key matches
      if (rawKeyScore > 0.6) keyScore = rawKeyScore;
      else if (rawKeyScore > 0.4) keyScore = rawKeyScore * 0.7;
      else keyScore = 0;
    }
    
    // Energy matching - compare audio energy to track energy
    if (track.energyAnalysis && audioLevel > 0.1) {
      const trackEnergy = track.energyAnalysis.overall / 10;
      const energyDiff = Math.abs(trackEnergy - audioLevel);
      if (energyDiff <= 0.2) energyScore = 1.0;
      else if (energyDiff <= 0.4) energyScore = 0.7;
      else if (energyDiff <= 0.6) energyScore = 0.4;
      else energyScore = 0.1;
    }
    
    // Spectral matching - must be strict about audio characteristics
    spectralScore = this.calculateSpectralMatchScore(audioMetrics, track);
    
    // Debug logging for score calculation
    if (track.name === 'Hey Nineteen' || track.name === "Don't Stop Believin'" || track.artist === 'Journey') {
      console.log(`📊 Score Debug for "${track.name}":`);
      console.log(`   Before penalty: tempo=${tempoScore.toFixed(2)}, spectral=${spectralScore.toFixed(2)}, energy=${energyScore.toFixed(2)}, key=${keyScore.toFixed(2)}`);
    }
    
    // Apply genre penalty to all scores
    tempoScore *= genrePenalty;
    keyScore *= genrePenalty;
    energyScore *= genrePenalty;
    spectralScore *= genrePenalty;
    
    // Debug logging after penalty
    if (track.name === 'Hey Nineteen' || track.name === "Don't Stop Believin'" || track.artist === 'Journey') {
      console.log(`   After penalty: tempo=${tempoScore.toFixed(2)}, spectral=${spectralScore.toFixed(2)}, energy=${energyScore.toFixed(2)}, key=${keyScore.toFixed(2)}`);
    }
    
    // Calculate overall score - require multiple good matches
    const scoreWeights = { tempo: 0.35, spectral: 0.35, energy: 0.2, key: 0.1 };
    const overall = (
      tempoScore * scoreWeights.tempo +
      spectralScore * scoreWeights.spectral +
      energyScore * scoreWeights.energy +
      keyScore * scoreWeights.key
    );
    
    // Debug final score
    if (track.name === 'Hey Nineteen' || track.name === "Don't Stop Believin'" || track.artist === 'Journey') {
      console.log(`   Overall score: ${overall.toFixed(3)}, Final: ${overall > 0.25 ? overall.toFixed(3) : '0'}`);
    }
    
    // Only return non-zero if it's actually a decent match
    const finalOverall = overall > 0.25 ? overall : 0;
    
    return { 
      tempo: tempoScore, 
      key: keyScore, 
      energy: energyScore, 
      spectral: spectralScore, 
      overall: finalOverall
    };
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
   * Detect genre from audio characteristics
   */
  private detectGenreFromAudio(audioMetrics: AdvancedMetrics): string {
    const brightness = audioMetrics.spectralCentroid / 22050;
    const bandwidth = audioMetrics.spectralBandwidth / 4000;
    const rolloff = audioMetrics.spectralRolloff / 22050;
    
    // Electronic/Dance music characteristics
    if (brightness > 0.6 && bandwidth > 0.5 && rolloff > 0.7) {
      return 'electronic';
    }
    // Rock/Metal characteristics  
    else if (bandwidth > 0.7 && rolloff > 0.6) {
      return 'rock';
    }
    // Classical/Ambient characteristics
    else if (brightness < 0.4 && bandwidth < 0.4) {
      return 'classical';
    }
    // Hip-hop/Rap characteristics
    else if (bandwidth > 0.6 && brightness < 0.5) {
      return 'hip-hop';
    }
    
    return 'unknown';
  }

  /**
   * Check if detected genre is compatible with track genre
   */
  private checkGenreCompatibility(detectedGenre: string, trackGenre?: string): boolean {
    if (!trackGenre) return true; // No genre info, allow it
    if (detectedGenre === 'unknown') return true; // Can't detect, be neutral
    
    const detected = detectedGenre.toLowerCase();
    const track = trackGenre.toLowerCase();
    
    // Electronic music family - be very inclusive
    const electronicGenres = ['electronic', 'house', 'techno', 'dance', 'edm', 'trance', 'dubstep', 'drum', 'bass', 'disco', 'funk', 'electro'];
    const isDetectedElectronic = detected === 'electronic';
    const isTrackElectronic = electronicGenres.some(genre => track.includes(genre));
    
    // If we detect electronic music, ONLY allow electronic tracks
    if (isDetectedElectronic) {
      return isTrackElectronic;
    }
    
    // Rock music family  
    const rockGenres = ['rock', 'metal', 'punk', 'alternative', 'indie', 'grunge', 'classic', 'pop'];
    const isDetectedRock = detected === 'rock';
    const isTrackRock = rockGenres.some(genre => track.includes(genre));
    
    if (isDetectedRock && isTrackRock) return true;
    
    // For other genres, be more permissive
    if (detected === 'hip-hop') {
      return track.includes('hip') || track.includes('rap') || track.includes('r&b');
    }
    
    if (detected === 'classical') {
      return track.includes('classical') || track.includes('ambient') || track.includes('instrumental');
    }
    
    // Default to incompatible for unmatched cases
    return false;
  }

  /**
   * Estimate BPM from audio analysis and MIDI data
   */
  private estimateBPMFromAudio(audioMetrics: AdvancedMetrics, midiData?: any): number {
    // Prefer MIDI BPM if available
    if (midiData?.bpm && midiData.bpm > 0) {
      return midiData.bpm;
    }
    
    // Estimate from zero crossing rate and spectral features
    // This is a rough estimation - real BPM detection would need more sophisticated analysis
    const zcr = audioMetrics.zeroCrossingRate;
    const brightness = audioMetrics.spectralCentroid / 22050;
    
    // Rough BPM estimation based on audio characteristics
    let estimatedBPM = 120; // Default
    
    // High zero crossing rate suggests faster tempo
    if (zcr > 0.3) estimatedBPM += 20;
    if (zcr > 0.5) estimatedBPM += 20;
    
    // Brightness can indicate genre which correlates with typical BPM ranges
    if (brightness > 0.6) {
      // Electronic music tends to be 120-140 BPM
      estimatedBPM = 128;
    } else if (brightness < 0.4) {
      // Slower, more organic music
      estimatedBPM = 100;
    }
    
    return estimatedBPM;
  }

  /**
   * Calculate spectral matching score based on genre characteristics
   */
  private calculateSpectralMatchScore(audioMetrics: AdvancedMetrics, track: Track): number {
    if (!track.genre) return 0;
    
    const genre = track.genre.toLowerCase();
    let score = 0;
    
    const brightness = audioMetrics.spectralCentroid / 22050;
    const bandwidth = audioMetrics.spectralBandwidth / 4000;
    const rolloff = audioMetrics.spectralRolloff / 22050;
    
    // Electronic/Dance music - high brightness and rolloff
    if (genre.includes('electronic') || genre.includes('house') || genre.includes('techno') || genre.includes('dance')) {
      if (brightness > 0.6 && rolloff > 0.7) score = 0.9;
      else if (brightness > 0.5 && rolloff > 0.6) score = 0.7;
      else if (brightness > 0.4) score = 0.4;
      else score = 0.1;
    }
    // Rock/Metal - high bandwidth  
    else if (genre.includes('rock') || genre.includes('metal')) {
      if (bandwidth > 0.7) score = 0.9;
      else if (bandwidth > 0.5) score = 0.7;
      else if (bandwidth > 0.3) score = 0.4;
      else score = 0.1;
    }
    // Classical/Ambient - lower brightness and bandwidth
    else if (genre.includes('classical') || genre.includes('ambient')) {
      if (brightness < 0.4 && bandwidth < 0.4) score = 0.9;
      else if (brightness < 0.6 && bandwidth < 0.6) score = 0.6;
      else score = 0.3;
    }
    // Hip-hop/Rap - moderate brightness, higher bandwidth
    else if (genre.includes('hip') || genre.includes('rap')) {
      if (brightness > 0.3 && brightness < 0.6 && bandwidth > 0.5) score = 0.8;
      else if (bandwidth > 0.4) score = 0.5;
      else score = 0.2;
    }
    // Default for other genres
    else {
      score = 0.3;
    }
    
    return score;
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
    
    console.log(`🎯 Best match: "${bestMatch.track.name}" by ${bestMatch.track.artist} with ${(bestMatch.confidence * 100).toFixed(1)}% confidence`);
    
    if (this.currentMatch) {
      if (this.currentMatch.track.id === bestMatch.track.id) {
        // Same track - increase confidence gradually
        this.currentMatch.confidence = Math.min(0.98, this.currentMatch.confidence * 1.05);
        console.log(`✅ Confidence boost for "${this.currentMatch.track.name}": ${(this.currentMatch.confidence * 100).toFixed(1)}%`);
      } else if (bestMatch.confidence > this.currentMatch.confidence + 0.1) {
        // New track is significantly better
        this.currentMatch = bestMatch;
        console.log(`🔄 Switched to new track: "${bestMatch.track.name}"`);
      }
    } else if (bestMatch.confidence > 0.5) { // Higher threshold for accepting matches
      this.currentMatch = bestMatch;
      console.log(`🆕 New track identified: "${bestMatch.track.name}" with ${(bestMatch.confidence * 100).toFixed(1)}% confidence`);
    } else {
      console.log(`❌ Best match "${bestMatch.track.name}" below threshold (${(bestMatch.confidence * 100).toFixed(1)}% < 50%)`);
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