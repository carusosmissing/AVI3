import React from 'react';
import { DDJControllerState } from '../types';

interface VisualDNAOverlayProps {
  controllerState: DDJControllerState;
  audioLevel: number;
  spectralFeatures: any;
  isAIMode: boolean;
}

export const VisualDNAOverlay: React.FC<VisualDNAOverlayProps> = ({
  controllerState,
  audioLevel,
  spectralFeatures,
  isAIMode
}) => {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Status indicator for no audio */}
      {audioLevel === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#ffa502',
          fontSize: '24px',
          fontFamily: 'monospace',
          textAlign: 'center',
          textShadow: '0 0 20px rgba(255, 165, 2, 0.8)',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '20px',
          borderRadius: '10px',
          border: '2px solid #ffa502'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>🎵 Visual DNA Active</div>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>
            {isAIMode ? 'AI Mode - Waiting for Audio Input' : 'MIDI-Only Mode'}
          </div>
          <div style={{ fontSize: '14px', color: '#ccc' }}>
            {isAIMode 
              ? 'Click "Start" in the Audio Input panel to enable full visualization' 
              : 'Move MIDI controllers to change visuals'}
          </div>
          <div style={{ fontSize: '12px', marginTop: '10px', color: '#888' }}>
            Current Profile: Controlled by MIDI Energy
          </div>
        </div>
      )}
      
      {/* MIDI activity indicator */}
      {audioLevel === 0 && controllerState.isConnected && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#2ed573',
          fontSize: '12px',
          fontFamily: 'monospace',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '10px 20px',
          borderRadius: '20px',
          border: '1px solid #2ed573'
        }}>
          🎛️ MIDI Controller Connected - Move faders and knobs to control visuals
        </div>
      )}
    </div>
  );
}; 