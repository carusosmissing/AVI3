import { Track, HotCue, MemoryCue, BeatGridData, Beat } from '../types';

export class RekordboxParser {
  /**
   * Parse Rekordbox XML export file
   */
  public static async parseXML(xmlContent: string): Promise<Track[]> {
    console.log('🎵 Starting Rekordbox XML parsing...');
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      
      // Check for parsing errors
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        throw new Error(`XML parsing error: ${parseError.textContent}`);
      }
      
      // Get all TRACK elements
      const trackElements = xmlDoc.querySelectorAll('TRACK');
      console.log(`📚 Found ${trackElements.length} tracks in XML`);
      
      const tracks: Track[] = [];
      
      for (let i = 0; i < trackElements.length; i++) {
        const trackElement = trackElements[i];
        try {
          const track = this.parseTrackElement(trackElement);
          if (track) {
            tracks.push(track);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to parse track ${i + 1}:`, error);
        }
      }
      
      console.log(`✅ Successfully parsed ${tracks.length} tracks from Rekordbox XML`);
      return tracks;
      
    } catch (error) {
      console.error('❌ Error parsing Rekordbox XML:', error);
      throw new Error(`Failed to parse Rekordbox XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Parse individual TRACK element
   */
  private static parseTrackElement(trackElement: Element): Track | null {
    try {
      // Extract basic track information
      const trackId = trackElement.getAttribute('TrackID') || '';
      const name = trackElement.getAttribute('Name') || '';
      const artist = trackElement.getAttribute('Artist') || '';
      const album = trackElement.getAttribute('Album') || '';
      const genre = trackElement.getAttribute('Genre') || '';
      const composer = trackElement.getAttribute('Composer') || '';
      const remixer = trackElement.getAttribute('Remixer') || '';
      const label = trackElement.getAttribute('Label') || '';
      const comments = trackElement.getAttribute('Comments') || '';
      const tonality = trackElement.getAttribute('Tonality') || '';
      const mix = trackElement.getAttribute('Mix') || '';
      
      // Parse numerical values
      const bpm = parseFloat(trackElement.getAttribute('AverageBpm') || '0');
      const duration = parseInt(trackElement.getAttribute('TotalTime') || '0');
      const year = parseInt(trackElement.getAttribute('Year') || '0');
      const trackNumber = parseInt(trackElement.getAttribute('TrackNumber') || '0');
      const discNumber = parseInt(trackElement.getAttribute('DiscNumber') || '0');
      const bitRate = parseInt(trackElement.getAttribute('BitRate') || '0');
      const sampleRate = parseInt(trackElement.getAttribute('SampleRate') || '0');
      const playCount = parseInt(trackElement.getAttribute('PlayCount') || '0');
      const rating = parseInt(trackElement.getAttribute('Rating') || '0');
      
      // Parse date
      const dateAddedStr = trackElement.getAttribute('DateAdded') || '';
      const dateAdded = dateAddedStr ? new Date(dateAddedStr) : new Date();
      
      // Extract file location
      const location = trackElement.getAttribute('Location') || '';
      
      // Parse key information (Rekordbox uses musical notation)
      let key = tonality || 'C';
      // Clean up the key notation if needed
      key = this.normalizeKeyNotation(key);
      
      // Skip tracks with no name or artist (completely empty tracks)
      if (!name && !artist) {
        console.log(`⏭️ Skipping empty track with ID: ${trackId}`);
        return null;
      }
      
      // Parse TEMPO elements for beat grid data
      const beatGrid = this.parseBeatGrid(trackElement, bpm);
      
      // Parse HOT_CUE elements
      const hotCues = this.parseHotCues(trackElement);
      
      // Parse MEMORY_CUE elements  
      const memoryCues = this.parseMemoryCues(trackElement);
      
      // Estimate energy analysis based on genre and BPM
      const energyAnalysis = this.estimateEnergyAnalysis(genre, bpm, duration);
      
      // Create Track object
      const track: Track = {
        id: trackId || `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name || 'Unknown Track',
        artist: artist || 'Unknown Artist',
        album,
        genre,
        bpm: bpm > 0 ? bpm : 120, // Default to 120 BPM if invalid
        key,
        duration: duration > 0 ? duration : 180, // Default to 3 minutes if invalid
        filepath: this.cleanFilePath(location),
        dateAdded,
        year: year > 0 ? year : undefined,
        composer: composer || undefined,
        remixer: remixer || undefined,
        label: label || undefined,
        comments: comments || undefined,
        beatGrid,
        hotCues,
        memoryCues,
        energyAnalysis
      };
      
      return track;
      
    } catch (error) {
      console.error('❌ Error parsing track element:', error);
      return null;
    }
  }
  
  /**
   * Parse TEMPO elements for beat grid data
   */
  private static parseBeatGrid(trackElement: Element, trackBpm: number): BeatGridData {
    const tempoElements = trackElement.querySelectorAll('TEMPO');
    const beats: Beat[] = [];
    
    tempoElements.forEach((tempoElement, index) => {
      const inizio = parseFloat(tempoElement.getAttribute('Inizio') || '0'); // Start position
      const bpm = parseFloat(tempoElement.getAttribute('Bpm') || trackBpm.toString());
      const metro = tempoElement.getAttribute('Metro') || '4/4';
      const battito = parseInt(tempoElement.getAttribute('Battito') || '1');
      
      // Convert Inizio (which appears to be a fraction of the track) to seconds
      // This is an approximation - Rekordbox uses complex timing
      const timeInSeconds = inizio * 60; // Rough conversion
      
      beats.push({
        time: timeInSeconds,
        beatNumber: index + 1,
        isDownbeat: battito === 1, // First beat of measure
        localBpm: bpm
      });
    });
    
    return {
      beats,
      bpm: trackBpm,
      firstBeatTime: beats.length > 0 ? beats[0].time : 0
    };
  }
  
  /**
   * Parse HOT_CUE elements
   */
  private static parseHotCues(trackElement: Element): HotCue[] {
    const hotCueElements = trackElement.querySelectorAll('POSITION_MARK[Type="0"]'); // Type 0 = Hot Cue
    const hotCues: HotCue[] = [];
    
    hotCueElements.forEach((cueElement, index) => {
      const start = parseFloat(cueElement.getAttribute('Start') || '0');
      const name = cueElement.getAttribute('Name') || `Hot Cue ${index + 1}`;
      const num = parseInt(cueElement.getAttribute('Num') || index.toString());
      
      hotCues.push({
        id: num,
        name,
        time: start,
        color: this.getHotCueColor(num),
        type: 'cue'
      });
    });
    
    return hotCues;
  }
  
  /**
   * Parse MEMORY_CUE elements
   */
  private static parseMemoryCues(trackElement: Element): MemoryCue[] {
    const memoryCueElements = trackElement.querySelectorAll('POSITION_MARK[Type="1"]'); // Type 1 = Memory Cue
    const memoryCues: MemoryCue[] = [];
    
    memoryCueElements.forEach((cueElement, index) => {
      const start = parseFloat(cueElement.getAttribute('Start') || '0');
      const name = cueElement.getAttribute('Name') || '';
      const num = parseInt(cueElement.getAttribute('Num') || index.toString());
      
      memoryCues.push({
        id: num,
        time: start,
        color: '#ffffff',
        comment: name
      });
    });
    
    return memoryCues;
  }
  
  /**
   * Normalize key notation for consistency
   */
  private static normalizeKeyNotation(key: string): string {
    if (!key) return 'C';
    
    // Handle Rekordbox key notation
    // Examples: "Bbm", "C#", "Am", etc.
    let normalized = key.trim();
    
    // Convert flat notation
    normalized = normalized.replace('b', '♭');
    
    // Convert sharp notation  
    normalized = normalized.replace('#', '♯');
    
    // Ensure major/minor notation is consistent
    if (normalized.includes('m') && !normalized.includes('♭') && !normalized.includes('♯')) {
      normalized = normalized.replace('m', ' minor');
    }
    
    return normalized;
  }
  
  /**
   * Clean up file path from Rekordbox format
   */
  private static cleanFilePath(location: string): string {
    if (!location) return '';
    
    // Rekordbox stores paths as file:// URIs, decode them
    try {
      const decoded = decodeURIComponent(location);
      // Remove file:// prefix
      return decoded.replace(/^file:\/\//, '');
    } catch (error) {
      return location;
    }
  }
  
  /**
   * Get color for hot cue based on number
   */
  private static getHotCueColor(num: number): string {
    const colors = [
      '#ff4757', '#2ed573', '#3742fa', '#ffa502',
      '#7bed9f', '#ff6b6b', '#70a1ff', '#5352ed'
    ];
    return colors[num % colors.length];
  }
  
  /**
   * Estimate energy analysis based on genre and BPM
   */
  private static estimateEnergyAnalysis(genre: string, bpm: number, duration: number) {
    const genreLower = (genre || '').toLowerCase();
    let baseEnergy = 5; // Default medium energy
    
    // Adjust energy based on genre
    if (genreLower.includes('house') || genreLower.includes('techno') || genreLower.includes('dance')) {
      baseEnergy = 7;
    } else if (genreLower.includes('ambient') || genreLower.includes('classical')) {
      baseEnergy = 3;
    } else if (genreLower.includes('rock') || genreLower.includes('metal')) {
      baseEnergy = 8;
    } else if (genreLower.includes('electronic') || genreLower.includes('edm')) {
      baseEnergy = 8;
    }
    
    // Adjust based on BPM
    if (bpm > 140) baseEnergy += 1;
    if (bpm > 160) baseEnergy += 1;
    if (bpm < 100) baseEnergy -= 1;
    
    // Clamp to 1-10 range
    baseEnergy = Math.max(1, Math.min(10, baseEnergy));
    
    return {
      overall: baseEnergy,
      intro: Math.max(1, baseEnergy - 2),
      verse: Math.max(1, baseEnergy - 1), 
      chorus: Math.min(10, baseEnergy + 1),
      bridge: baseEnergy,
      outro: Math.max(1, baseEnergy - 3)
    };
  }
}

/**
 * Utility function to read file as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      resolve(text);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsText(file);
  });
} 