import React, { useState, useEffect } from 'react';
import { VisualDNAVisualizer } from './visual-dna-visualizer';
import { DDJFlx4AIController } from '../controllers/ddj-flx4-ai-controller';

interface VisualDNAIntegrationProps {
  controller: any; // DDJFlx4Controller base instance
  controllerState: any;
  visualParams: any;
  identificationTracks?: any[];
  onTrackIdentification?: (result: any) => void;
}

export const VisualDNAIntegration: React.FC<VisualDNAIntegrationProps> = ({
  controller,
  controllerState,
  visualParams,
  identificationTracks,
  onTrackIdentification
}) => {
  // Create AI controller wrapper
  const [aiController] = useState(() => {
    // If controller is already AI-enhanced, use it
    if (controller instanceof DDJFlx4AIController) {
      return controller;
    }
    // Otherwise create new AI controller
    return new DDJFlx4AIController();
  });

  const [audioLevel, setAudioLevel] = useState(0);
  const [spectralFeatures, setSpectralFeatures] = useState<any>(null);
  const [showInfo, setShowInfo] = useState(true);

  // Load tracks when available
  useEffect(() => {
    if (identificationTracks && identificationTracks.length > 0) {
      const analyzer = aiController.getAIState().aiAnalyzer;
      // Check if analyzer has the loadTrackDatabase method
      if (analyzer && 'loadTrackDatabase' in analyzer) {
        console.log(`🎯 Loading ${identificationTracks.length} tracks into Visual DNA system`);
        (analyzer as any).loadTrackDatabase(identificationTracks);
      }
    }
  }, [identificationTracks, aiController]);

  // Simulate audio data for testing (remove this when you have real audio input)
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate audio levels based on controller state
      const channelAVolume = controllerState.channelA.volume / 127;
      const channelBVolume = controllerState.channelB.volume / 127;
      const crossfaderPos = controllerState.crossfader / 127;
      
      // Mix channels based on crossfader
      const mixedVolume = (channelAVolume * (1 - crossfaderPos)) + (channelBVolume * crossfaderPos);
      
      setAudioLevel(mixedVolume * 0.8 + Math.random() * 0.2); // Add some randomness
      
      // Simulate spectral features
      setSpectralFeatures({
        brightness: 2000 + Math.random() * 2000,
        bandwidth: 1000 + Math.random() * 1000,
        rolloff: 4000 + Math.random() * 4000
      });
    }, 50);

    return () => clearInterval(interval);
  }, [controllerState]);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <VisualDNAVisualizer
        analyzer={aiController.getAIState().aiAnalyzer as any}
        controllerState={aiController.getAIState()}
        audioLevel={audioLevel}
        spectralFeatures={spectralFeatures}
      />
      
      {/* Info Panel */}
      {showInfo && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '12px',
          maxWidth: '300px',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <button 
            onClick={() => setShowInfo(false)}
            style={{
              position: 'absolute',
              top: 5,
              right: 5,
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ×
          </button>
          
          <h4 style={{ margin: '0 0 10px 0', color: '#00ffff' }}>🧬 Visual DNA System</h4>
          
          <div style={{ marginBottom: '8px' }}>
            <strong>Controls:</strong>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Channel volumes affect energy</li>
              <li>Crossfader controls visual blend</li>
              <li>EQ changes color intensity</li>
              <li>BPM syncs animations</li>
            </ul>
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <strong>Features:</strong>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>10 unique visual profiles</li>
              <li>AI genre detection</li>
              <li>Dynamic color palettes</li>
              <li>Smooth transitions</li>
              <li>MIDI-reactive effects</li>
            </ul>
          </div>
          
          <div style={{ fontSize: '10px', color: '#888', marginTop: '10px' }}>
            💡 Connect audio input for full AI analysis
          </div>
        </div>
      )}
      
      {!showInfo && (
        <button
          onClick={() => setShowInfo(true)}
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            padding: '8px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ℹ️ Show Info
        </button>
      )}
    </div>
  );
}; 