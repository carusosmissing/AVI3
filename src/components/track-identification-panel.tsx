import React, { useState, useRef } from 'react';
import { RekordboxParser } from '../parsers/rekordbox-parser';
import { Track } from '../types';

interface TrackIdentificationPanelProps {
  onTracksLoaded: (tracks: Track[]) => void;
  identificationResult?: any;
  isAIReady: boolean;
}

export default function TrackIdentificationPanel({ 
  onTracksLoaded, 
  identificationResult, 
  isAIReady 
}: TrackIdentificationPanelProps) {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('📁 Loading Rekordbox collection file...');
      
      const text = await file.text();
      const parser = new RekordboxParser();
      const parsedTracks = await parser.parseCollection(text);
      
      setTracks(parsedTracks);
      onTracksLoaded(parsedTracks);
      
      console.log(`✅ Successfully loaded ${parsedTracks.length} tracks for AI identification`);
      
    } catch (err) {
      console.error('❌ Failed to load tracks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load track collection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSampleTracks = () => {
    // Create some sample tracks for testing
    const sampleTracks: Track[] = [
      {
        id: 'sample1',
        name: 'Sample House Track',
        artist: 'AI Test Artist',
        album: 'Test Album',
        genre: 'House',
        bpm: 128,
        key: 'Am',
        duration: 240,
        filepath: '',
        dateAdded: new Date(),
        hotCues: [],
        memoryCues: [],
        beatGrid: { beats: [], bpm: 128, firstBeatTime: 0 },
        energyAnalysis: { overall: 7, intro: 4, verse: 6, chorus: 8, bridge: 7, outro: 3 },
        songStructure: {
          intro: { start: 0, end: 24 },
          verses: [{ start: 24, end: 72 }, { start: 120, end: 168 }],
          choruses: [{ start: 72, end: 120 }, { start: 168, end: 216 }],
          bridges: [{ start: 108, end: 120 }],
          outro: { start: 216, end: 240 }
        }
      },
      {
        id: 'sample2',
        name: 'Sample Techno Track',
        artist: 'AI Test Artist 2',
        album: 'Test Album 2',
        genre: 'Techno',
        bpm: 130,
        key: 'Dm',
        duration: 360,
        filepath: '',
        dateAdded: new Date(),
        hotCues: [],
        memoryCues: [],
        beatGrid: { beats: [], bpm: 130, firstBeatTime: 0 },
        energyAnalysis: { overall: 8, intro: 5, verse: 7, chorus: 9, bridge: 8, outro: 4 },
        songStructure: {
          intro: { start: 0, end: 36 },
          verses: [{ start: 36, end: 108 }, { start: 180, end: 252 }],
          choruses: [{ start: 108, end: 180 }, { start: 252, end: 324 }],
          bridges: [{ start: 162, end: 180 }],
          outro: { start: 324, end: 360 }
        }
      }
    ];

    setTracks(sampleTracks);
    onTracksLoaded(sampleTracks);
    console.log('🎵 Loaded sample tracks for testing');
  };

  const currentTrack = identificationResult?.currentTrack?.track;
  const confidence = identificationResult?.confidenceScore || 0;
  const enhancement = identificationResult?.analysisEnhancement;

  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.3)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      width: '100%'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '15px',
        fontSize: '16px',
        fontWeight: 'bold'
      }}>
        🎯 Track Identification System
        <div style={{
          marginLeft: 'auto',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: isAIReady ? '#2ed573' : '#ff4757'
        }} />
      </div>

      {/* Track Database Section */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
          Track Database: {tracks.length} tracks loaded
        </div>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: isLoading ? '#666' : '#007acc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? 'Loading...' : '📁 Load XLF/XML'}
          </button>
          
          <button
            onClick={handleLoadSampleTracks}
            style={{
              padding: '8px 12px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            🧪 Sample Tracks
          </button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml,.xlf"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        
        {error && (
          <div style={{
            backgroundColor: '#ff4757',
            color: 'white',
            padding: '6px',
            borderRadius: '4px',
            fontSize: '11px',
            marginTop: '5px'
          }}>
            ❌ {error}
          </div>
        )}
      </div>

      {/* Current Track Identification */}
      {currentTrack ? (
        <div style={{ marginBottom: '15px' }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 'bold', 
            marginBottom: '8px',
            color: confidence > 0.7 ? '#2ed573' : confidence > 0.5 ? '#ffa502' : '#ff6b6b'
          }}>
            🎵 Identified Track ({(confidence * 100).toFixed(0)}% confidence)
          </div>
          
          <div style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.1)', 
            padding: '10px', 
            borderRadius: '8px',
            fontSize: '12px'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {currentTrack.name}
            </div>
            <div style={{ color: '#ccc', marginBottom: '4px' }}>
              by {currentTrack.artist}
            </div>
            <div style={{ display: 'flex', gap: '10px', fontSize: '11px' }}>
              <span>🎼 {currentTrack.bpm} BPM</span>
              <span>🔑 {currentTrack.key}</span>
              <span>🎸 {currentTrack.genre}</span>
            </div>
          </div>
          
          {identificationResult.currentTrack.reasoning && (
            <div style={{ 
              fontSize: '11px', 
              color: '#999', 
              marginTop: '5px',
              fontStyle: 'italic'
            }}>
              Match reasons: {identificationResult.currentTrack.reasoning.join(', ')}
            </div>
          )}
        </div>
      ) : (
        <div style={{ 
          fontSize: '12px', 
          color: '#999', 
          fontStyle: 'italic',
          marginBottom: '15px'
        }}>
          {tracks.length > 0 ? '🔍 Listening for track matches...' : '📁 Load tracks to enable identification'}
        </div>
      )}

      {/* Enhanced Analysis */}
      {enhancement && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>
            🧠 AI Enhanced Analysis
          </div>
          <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
            <div><strong>Song Section:</strong> {enhancement.songSection}</div>
            <div><strong>Time in Track:</strong> {Math.floor(enhancement.timeInTrack / 60)}:{(enhancement.timeInTrack % 60).toFixed(0).padStart(2, '0')}</div>
            <div><strong>Time Remaining:</strong> {Math.floor(enhancement.timeRemaining / 60)}:{(enhancement.timeRemaining % 60).toFixed(0).padStart(2, '0')}</div>
            <div><strong>Predicted Energy:</strong> {(enhancement.predictedEnergy * 100).toFixed(0)}%</div>
          </div>
        </div>
      )}

      {/* Alternative Matches */}
      {identificationResult?.alternativeTracks?.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
            Alternative Matches:
          </div>
          <div style={{ fontSize: '10px', color: '#999' }}>
            {identificationResult.alternativeTracks.slice(0, 2).map((match: any, index: number) => (
              <div key={index} style={{ marginBottom: '2px' }}>
                • {match.track.name} by {match.track.artist} ({(match.confidence * 100).toFixed(0)}%)
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div style={{ 
        fontSize: '10px', 
        color: '#666', 
        marginTop: '10px',
        borderTop: '1px solid #333',
        paddingTop: '8px',
        lineHeight: '1.3'
      }}>
        💡 <strong>Instructions:</strong><br/>
        • Upload your Rekordbox XML/XLF collection file<br/>
        • Or try sample tracks for testing<br/>
        • Play music and watch AI identify tracks in real-time<br/>
        • AI uses audio analysis + track database for enhanced insights
      </div>
    </div>
  );
} 