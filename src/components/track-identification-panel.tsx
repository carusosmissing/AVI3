import React, { useState, useRef } from 'react';
import { Track } from '../types';
import { RekordboxParser, readFileAsText } from '../parsers/rekordbox-parser';

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
  const [parseStatus, setParseStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        energyAnalysis: { overall: 7, intro: 4, breakdown: 6, buildup: 8, drop: 7, outro: 3 },
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
        energyAnalysis: { overall: 8, intro: 5, breakdown: 7, buildup: 9, drop: 8, outro: 4 },
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
    setParseStatus('✅ Sample tracks loaded');
    console.log('🎵 Loaded sample tracks for testing');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xml')) {
      setParseStatus('❌ Please select an XML file');
      return;
    }

    setIsLoading(true);
    setParseStatus('🔄 Parsing Rekordbox XML...');

    try {
      console.log('📁 Loading XML file:', file.name);
      const xmlContent = await readFileAsText(file);
      
      console.log('🔍 Parsing XML content...');
      const parsedTracks = await RekordboxParser.parseXML(xmlContent);
      
      if (parsedTracks.length === 0) {
        setParseStatus('⚠️ No valid tracks found in XML');
        return;
      }

      setTracks(parsedTracks);
      onTracksLoaded(parsedTracks);
      setParseStatus(`✅ Loaded ${parsedTracks.length} tracks from ${file.name}`);
      
      console.log(`🎵 Successfully loaded ${parsedTracks.length} tracks from Rekordbox XML`);
      
    } catch (error) {
      console.error('❌ Error parsing XML:', error);
      setParseStatus(`❌ Error parsing XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
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
        
        {/* File Upload Row */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          
          <button
            onClick={handleUploadClick}
            disabled={isLoading}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: isLoading ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? '🔄 Parsing...' : '📁 Upload Rekordbox XML'}
          </button>
          
          <button
            onClick={handleLoadSampleTracks}
            disabled={isLoading}
            style={{
              padding: '8px 12px',
              backgroundColor: isLoading ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            🧪 Sample
          </button>
          
          <button
            onClick={() => {
              setTracks([]);
              onTracksLoaded([]);
              setParseStatus('');
            }}
            disabled={isLoading}
            style={{
              padding: '8px 12px',
              backgroundColor: isLoading ? '#6c757d' : '#ff4757',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            🗑️
          </button>
        </div>

        {/* Parse Status */}
        {parseStatus && (
          <div style={{
            fontSize: '11px',
            color: parseStatus.includes('❌') ? '#ff6b6b' : 
                   parseStatus.includes('⚠️') ? '#ffa502' : 
                   parseStatus.includes('✅') ? '#2ed573' : '#74b9ff',
            marginBottom: '8px',
            fontWeight: '500'
          }}>
            {parseStatus}
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
        • Upload your Rekordbox XML export for AI track identification<br/>
        • Export XML from Rekordbox: File → Export Collection in XML format<br/>
        • Or load sample tracks for testing AI identification features<br/>
        • Play music and watch AI identify tracks from your collection<br/>
        • AI analyzes live audio and matches against your track database
      </div>
    </div>
  );
} 