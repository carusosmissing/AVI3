import React from 'react';

interface AudioInputPanelProps {
  audioInput: {
    isListening: boolean;
    isConnected: boolean;
    audioLevel: number;
    availableDevices: MediaDeviceInfo[];
    selectedDeviceId: string | null;
    startListening: () => Promise<void>;
    stopListening: () => void;
    selectDevice: (deviceId: string) => Promise<void>;
    refreshDevices: () => Promise<void>;
    error: string | null;
    inputGain: number;
    setInputGain: (gain: number) => void;
    sensitivity: number;
    setSensitivity: (sensitivity: number) => void;
  };
}

export default function AudioInputPanel({ audioInput }: AudioInputPanelProps) {
  const {
    isListening,
    isConnected,
    audioLevel,
    availableDevices,
    selectedDeviceId,
    startListening,
    stopListening,
    selectDevice,
    refreshDevices,
    error,
    inputGain,
    setInputGain,
    sensitivity,
    setSensitivity
  } = audioInput;

  // Get level percentage and color
  const levelPercentage = Math.round(audioLevel * 100);
  const getLevelColor = () => {
    if (levelPercentage >= 70) return '#ff4757'; // Red (too high)
    if (levelPercentage >= 40) return '#2ed573'; // Green (good)
    if (levelPercentage >= 20) return '#ffa502'; // Orange (okay)
    return '#ff6b6b'; // Light red (too low)
  };

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '20px',
      borderRadius: '12px',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      minWidth: '300px',
      maxWidth: '320px',
      border: '2px solid #333',
      zIndex: 999 // Lower than track identification panel
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '15px',
        fontSize: '16px',
        fontWeight: 'bold'
      }}>
        🎤 Audio Input Control
        <div style={{
          marginLeft: 'auto',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: isConnected ? '#2ed573' : '#ff4757'
        }} />
      </div>

      {/* Audio Level Display */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span>Audio Level:</span>
          <span style={{ 
            color: getLevelColor(),
            fontWeight: 'bold',
            fontSize: '16px'
          }}>
            {levelPercentage}%
          </span>
        </div>
        
        {/* Audio Level Bar */}
        <div style={{
          width: '100%',
          height: '20px',
          backgroundColor: '#2c2c2c',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid #444'
        }}>
          <div style={{
            width: `${Math.min(100, levelPercentage)}%`,
            height: '100%',
            backgroundColor: getLevelColor(),
            transition: 'all 0.1s ease',
            borderRadius: '10px'
          }} />
        </div>
        
        {levelPercentage < 20 && (
          <div style={{ 
            color: '#ffa502', 
            fontSize: '12px', 
            marginTop: '5px',
            fontStyle: 'italic'
          }}>
            ⚠️ Audio level too low - try adjusting gain settings below
          </div>
        )}
      </div>

      {/* Input Gain Control */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '8px'
        }}>
          <span>Input Gain:</span>
          <span style={{ color: '#00d2d3' }}>{inputGain.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="10"
          step="0.5"
          value={inputGain}
          onChange={(e) => setInputGain(parseFloat(e.target.value))}
          style={{
            width: '100%',
            height: '6px',
            borderRadius: '3px',
            background: '#2c2c2c',
            outline: 'none',
            cursor: 'pointer'
          }}
        />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '11px', 
          color: '#999',
          marginTop: '2px'
        }}>
          <span>0.5x</span>
          <span>10x</span>
        </div>
      </div>

      {/* Sensitivity Control */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '8px'
        }}>
          <span>Sensitivity:</span>
          <span style={{ color: '#00d2d3' }}>{sensitivity.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="5"
          step="0.1"
          value={sensitivity}
          onChange={(e) => setSensitivity(parseFloat(e.target.value))}
          style={{
            width: '100%',
            height: '6px',
            borderRadius: '3px',
            background: '#2c2c2c',
            outline: 'none',
            cursor: 'pointer'
          }}
        />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '11px', 
          color: '#999',
          marginTop: '2px'
        }}>
          <span>0.5x</span>
          <span>5x</span>
        </div>
      </div>

      {/* Device Selection */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ marginBottom: '8px' }}>Input Device:</div>
        <select
          value={selectedDeviceId || ''}
          onChange={(e) => selectDevice(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid #444',
            backgroundColor: '#2c2c2c',
            color: 'white',
            fontSize: '13px',
            outline: 'none'
          }}
        >
          <option value="">Default Device</option>
          {availableDevices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Device ${device.deviceId.substring(0, 8)}...`}
            </option>
          ))}
        </select>
        <button
          onClick={refreshDevices}
          style={{
            marginTop: '5px',
            padding: '4px 8px',
            backgroundColor: '#444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh Devices
        </button>
      </div>

      {/* Control Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <button
          onClick={isListening ? stopListening : startListening}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: isListening ? '#ff4757' : '#2ed573',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          {isListening ? '🔇 Stop' : '🎤 Start'} Audio Input
        </button>
      </div>

      {/* Quick Preset Buttons */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '12px', marginBottom: '5px', color: '#999' }}>
          Quick Presets:
        </div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setInputGain(1.0); setSensitivity(1.0); }}
            style={{ padding: '4px 8px', backgroundColor: '#555', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
          >
            Default
          </button>
          <button
            onClick={() => { setInputGain(3.0); setSensitivity(2.0); }}
            style={{ padding: '4px 8px', backgroundColor: '#555', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
          >
            Boosted
          </button>
          <button
            onClick={() => { setInputGain(5.0); setSensitivity(3.0); }}
            style={{ padding: '4px 8px', backgroundColor: '#555', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
          >
            Max Gain
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          backgroundColor: '#ff4757',
          color: 'white',
          padding: '8px',
          borderRadius: '6px',
          fontSize: '12px',
          marginTop: '10px'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Tips */}
      <div style={{ 
        fontSize: '11px', 
        color: '#888', 
        marginTop: '10px',
        lineHeight: '1.4'
      }}>
        💡 <strong>Tips:</strong><br/>
        • Try "Boosted" preset for low audio levels<br/>
        • Input Gain affects hardware amplification<br/>
        • Sensitivity affects software detection<br/>
        • Aim for 40-70% audio level for best results
      </div>
    </div>
  );
} 