import { XMLParser } from 'fast-xml-parser';
import { Track, BeatGridData, HotCue, MemoryCue, WaveformData, EnergyAnalysis, SongStructure } from '../types';

export class RekordboxParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
      trimValues: true
    });
  }

  /**
   * Parse rekordbox XML collection file
   * @param xmlContent - Raw XML string from rekordbox export
   * @returns Array of parsed tracks
   */
  async parseCollection(xmlContent: string): Promise<Track[]> {
    try {
      console.log('🎵 Parsing rekordbox collection...');
      const parsed = this.parser.parse(xmlContent);
      
      // Navigate to the COLLECTION section in the XML structure
      const collection = parsed?.DJ_PLAYLISTS?.COLLECTION?.TRACK;
      
      if (!collection) {
        throw new Error('No tracks found in XML collection');
      }

      // Handle both single track and multiple tracks
      const tracks = Array.isArray(collection) ? collection : [collection];
      
      const parsedTracks = tracks.map((track: any) => this.parseTrack(track));
      
      console.log(`✅ Successfully parsed ${parsedTracks.length} tracks`);
      return parsedTracks;
      
    } catch (error) {
      console.error('❌ Error parsing rekordbox XML:', error);
      throw error;
    }
  }

  /**
   * Parse individual track from XML data
   */
  private parseTrack(trackData: any): Track {
    const attributes = trackData['@_'] || {};
    
    return {
      id: attributes.TrackID || 'unknown',
      name: attributes.Name || 'Unknown Track',
      artist: attributes.Artist || 'Unknown Artist',
      album: attributes.Album,
      genre: attributes.Genre,
      bpm: parseFloat(attributes.AverageBpm) || 120,
      key: attributes.Tonality || 'C',
      duration: parseInt(attributes.TotalTime) || 0,
      filepath: attributes.Location || '',
      dateAdded: new Date(attributes.DateAdded || Date.now()),
      hotCues: this.parseHotCues(trackData),
      memoryCues: this.parseMemoryCues(trackData),
      beatGrid: this.parseBeatGrid(trackData, parseFloat(attributes.AverageBpm) || 120),
      waveform: this.parseWaveform(trackData),
      energyAnalysis: this.analyzeEnergy(trackData),
      songStructure: this.analyzeSongStructure(trackData)
    };
  }

  /**
   * Parse hot cues from track data
   */
  private parseHotCues(trackData: any): HotCue[] {
    const hotCues: HotCue[] = [];
    
    // rekordbox stores hot cues in POSITION_MARK elements
    const positionMarks = trackData.POSITION_MARK || [];
    const marks = Array.isArray(positionMarks) ? positionMarks : [positionMarks];
    
    marks.forEach((mark: any, index: number) => {
      const attrs = mark['@_'] || {};
      if (attrs.Type === 0) { // Type 0 = Hot Cue in rekordbox
        hotCues.push({
          id: index,
          name: attrs.Name || `Cue ${index + 1}`,
          time: parseFloat(attrs.Start) / 1000 || 0, // Convert ms to seconds
          color: this.mapRekordboxColor(attrs.Num),
          type: 'cue'
        });
      }
    });
    
    return hotCues;
  }

  /**
   * Parse memory cues from track data
   */
  private parseMemoryCues(trackData: any): MemoryCue[] {
    const memoryCues: MemoryCue[] = [];
    
    const positionMarks = trackData.POSITION_MARK || [];
    const marks = Array.isArray(positionMarks) ? positionMarks : [positionMarks];
    
    marks.forEach((mark: any, index: number) => {
      const attrs = mark['@_'] || {};
      if (attrs.Type === 1) { // Type 1 = Memory Cue in rekordbox
        memoryCues.push({
          id: index,
          time: parseFloat(attrs.Start) / 1000 || 0,
          color: this.mapRekordboxColor(attrs.Num),
          comment: attrs.Name
        });
      }
    });
    
    return memoryCues;
  }

  /**
   * Parse beat grid data from track
   */
  private parseBeatGrid(trackData: any, bpm: number): BeatGridData {
    // rekordbox stores beat grid in TEMPO elements
    const tempoData = trackData.TEMPO || [];
    const tempos = Array.isArray(tempoData) ? tempoData : [tempoData];
    
    const beats = tempos.map((tempo: any, index: number) => {
      const attrs = tempo['@_'] || {};
      return {
        time: parseFloat(attrs.Inizio) / 1000 || 0,
        beatNumber: index + 1,
        isDownbeat: (index % 4) === 0 // Every 4th beat is a downbeat
      };
    });

    return {
      beats,
      bpm,
      firstBeatTime: beats[0]?.time || 0
    };
  }

  /**
   * Parse waveform data (simplified - rekordbox doesn't export detailed waveform)
   */
  private parseWaveform(trackData: any): WaveformData | undefined {
    // rekordbox XML doesn't contain detailed waveform data
    // We'll generate a basic structure for future enhancement
    const duration = parseInt(trackData['@_']?.TotalTime) || 0;
    
    if (duration === 0) return undefined;

    // Generate basic waveform peaks (this would be replaced with actual audio analysis)
    const sampleRate = 44100;
    const peaksCount = Math.floor(duration / 1000 * 10); // 10 peaks per second
    const peaks = Array.from({ length: peaksCount }, () => Math.random());

    return {
      peaks,
      length: peaksCount,
      sampleRate
    };
  }

  /**
   * Analyze energy levels (basic implementation)
   */
  private analyzeEnergy(trackData: any): EnergyAnalysis {
    // This is a simplified analysis - real implementation would analyze audio
    const bpm = parseFloat(trackData['@_']?.AverageBpm) || 120;
    const genre = trackData['@_']?.Genre || '';
    
    // Basic energy estimation based on BPM and genre
    let baseEnergy = Math.min(10, Math.max(1, (bpm - 60) / 20));
    
    // Adjust based on genre
    if (genre.toLowerCase().includes('house') || genre.toLowerCase().includes('techno')) {
      baseEnergy += 2;
    } else if (genre.toLowerCase().includes('ambient') || genre.toLowerCase().includes('chill')) {
      baseEnergy -= 2;
    }
    
    baseEnergy = Math.min(10, Math.max(1, baseEnergy));
    
    return {
      overall: baseEnergy,
      intro: baseEnergy * 0.6,
      verse: baseEnergy * 0.8,
      chorus: baseEnergy,
      bridge: baseEnergy * 0.9,
      outro: baseEnergy * 0.5
    };
  }

  /**
   * Analyze song structure (basic implementation)
   */
  private analyzeSongStructure(trackData: any): SongStructure {
    const duration = parseInt(trackData['@_']?.TotalTime) / 1000 || 0;
    
    if (duration === 0) {
      return { verses: [], choruses: [], bridges: [] };
    }

    // Basic song structure estimation (this would be enhanced with actual analysis)
    return {
      intro: { start: 0, end: duration * 0.1 },
      verses: [
        { start: duration * 0.1, end: duration * 0.3 },
        { start: duration * 0.5, end: duration * 0.7 }
      ],
      choruses: [
        { start: duration * 0.3, end: duration * 0.5 },
        { start: duration * 0.7, end: duration * 0.9 }
      ],
      bridges: [
        { start: duration * 0.45, end: duration * 0.55 }
      ],
      outro: { start: duration * 0.9, end: duration }
    };
  }

  /**
   * Map rekordbox color numbers to CSS colors
   */
  private mapRekordboxColor(colorNum: number): string {
    const colorMap: { [key: number]: string } = {
      0: '#FF0000', // Red
      1: '#FF8000', // Orange  
      2: '#FFFF00', // Yellow
      3: '#80FF00', // Lime
      4: '#00FF00', // Green
      5: '#00FF80', // Spring Green
      6: '#00FFFF', // Cyan
      7: '#0080FF', // Sky Blue
      8: '#0000FF', // Blue
      9: '#8000FF', // Purple
      10: '#FF00FF', // Magenta
      11: '#FF0080', // Pink
    };
    
    return colorMap[colorNum] || '#FFFFFF';
  }

  /**
   * Search tracks by various criteria
   */
  searchTracks(tracks: Track[], query: string): Track[] {
    const lowercaseQuery = query.toLowerCase();
    
    return tracks.filter(track => 
      track.name.toLowerCase().includes(lowercaseQuery) ||
      track.artist.toLowerCase().includes(lowercaseQuery) ||
      track.album?.toLowerCase().includes(lowercaseQuery) ||
      track.genre?.toLowerCase().includes(lowercaseQuery) ||
      track.key.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Get tracks by BPM range
   */
  getTracksByBPMRange(tracks: Track[], minBPM: number, maxBPM: number): Track[] {
    return tracks.filter(track => track.bpm >= minBPM && track.bpm <= maxBPM);
  }

  /**
   * Get tracks by key compatibility (for harmonic mixing)
   */
  getCompatibleTracks(tracks: Track[], currentKey: string): Track[] {
    const compatibleKeys = this.getCompatibleKeys(currentKey);
    return tracks.filter(track => compatibleKeys.includes(track.key));
  }

  /**
   * Get harmonically compatible keys using Camelot wheel
   */
  private getCompatibleKeys(key: string): string[] {
    const camelotWheel: { [key: string]: string[] } = {
      'C': ['C', 'F', 'G', 'Am', 'Dm', 'Em'],
      'G': ['G', 'C', 'D', 'Em', 'Am', 'Bm'],
      'D': ['D', 'G', 'A', 'Bm', 'Em', 'F#m'],
      'A': ['A', 'D', 'E', 'F#m', 'Bm', 'C#m'],
      'E': ['E', 'A', 'B', 'C#m', 'F#m', 'G#m'],
      'B': ['B', 'E', 'F#', 'G#m', 'C#m', 'D#m'],
      'F#': ['F#', 'B', 'C#', 'D#m', 'G#m', 'A#m'],
      'C#': ['C#', 'F#', 'G#', 'A#m', 'D#m', 'Fm'],
      'G#': ['G#', 'C#', 'D#', 'Fm', 'A#m', 'Cm'],
      'D#': ['D#', 'G#', 'A#', 'Cm', 'Fm', 'Gm'],
      'A#': ['A#', 'D#', 'F', 'Gm', 'Cm', 'Dm'],
      'F': ['F', 'A#', 'C', 'Dm', 'Gm', 'Am']
    };
    
    return camelotWheel[key] || [key];
  }
} 