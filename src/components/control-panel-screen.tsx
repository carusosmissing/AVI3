import React, { useState, useCallback, useEffect } from 'react';
import TrackIdentificationPanel from './track-identification-panel';
import { VisualDNAProfileSelector } from './visual-dna-profile-selector';
import useAIAudioAnalyzer from '../hooks/useAIAudioAnalyzer';
import { DDJFlx4Controller } from '../controllers/ddj-flx4-controller';
import { AppState, Track } from '../types';
import { VisualDNASystem, ActiveVisualState } from '../ai/visual-dna-system';

// Collapsible Section Component (copied from ai-enhanced-visualizer)
function CollapsibleSection({ title, children, defaultOpen = false }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: '15px' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '6px',
          border: '1px solid #444',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#00ffff',
          marginBottom: '8px',
          userSelect: 'none'
        }}
      >
        <span>{title}</span>
        <span style={{ 
          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }}>
          ▶
        </span>
      </div>
      {isOpen && (
        <div style={{
          padding: '12px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '6px',
          border: '1px solid #333'
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

interface ControlPanelScreenProps {
  // Props from App.tsx left panel
  isControllerConnected: boolean;
  connectionAttempts: number;
  visualDNAEnabled: boolean;
  appState: AppState;
  ddjController: DDJFlx4Controller;
  identificationTracks: Track[];
  identificationResult: any;
  onVisualDNAToggle: (enabled: boolean) => void;
  onRetryConnection: () => void;
  onTracksLoaded: (tracks: Track[]) => void;
  
  // Props for AI analysis
  controller: any;
  aiAnalysis: any; // Shared AI analysis from App level
}

export default function ControlPanelScreen({
  isControllerConnected,
  connectionAttempts,
  visualDNAEnabled,
  appState,
  ddjController,
  identificationTracks,
  identificationResult,
  onVisualDNAToggle,
  onRetryConnection,
  onTracksLoaded,
  controller,
  aiAnalysis
}: ControlPanelScreenProps) {
  const [isControllerSectionCollapsed, setIsControllerSectionCollapsed] = useState(false);
  
  // Visual DNA System
  const [visualDNA] = useState(() => new VisualDNASystem());
  const [visualState, setVisualState] = useState<ActiveVisualState>(visualDNA.getActiveState());
  
  // AI Audio Analysis is now passed as prop from App level

  // Update Visual DNA state
  useEffect(() => {
    const animate = () => {
      const newState = visualDNA.update(performance.now());
      
      // Force state update by creating a new object reference
      setVisualState({
        ...newState,
        currentProfile: { ...newState.currentProfile },
        targetProfile: newState.targetProfile ? { ...newState.targetProfile } : null
      });
    };
    
    const intervalId = setInterval(animate, 100); // Update every 100ms
    
    return () => clearInterval(intervalId);
  }, [visualDNA]);

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: 'linear-gradient(135deg, #1e3c72, #2a5298)',
      color: 'white',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '2px solid #444',
        background: 'rgba(0,0,0,0.3)'
      }}>
        <h1 style={{ margin: 0, fontSize: '28px', textAlign: 'center' }}>
          🎛️ DDJ Audio Visualizer Control Center
        </h1>
        <p style={{ margin: '10px 0 0 0', textAlign: 'center', opacity: 0.8 }}>
          Complete control panel for your audio visualization experience
        </p>
      </div>

      {/* Main Content - Two Column Layout */}
      <div style={{
        display: 'flex',
        height: 'calc(100vh - 120px)',
        overflow: 'hidden'
      }}>
        
        {/* Left Column - Hardware & Basic Controls */}
        <div style={{
          width: '50%',
          padding: '20px',
          overflowY: 'auto',
          borderRight: '2px solid #444'
        }}>
          <h2 style={{ marginTop: 0, color: '#00ffff' }}>🔧 Hardware & System Controls</h2>
          
          {/* Connection Status */}
          <div style={{ marginBottom: '25px' }}>
            <div className={`connection-status ${isControllerConnected ? 'connected' : 'disconnected'}`}
              style={{
                padding: '15px',
                borderRadius: '8px',
                border: `2px solid ${isControllerConnected ? '#2ed573' : '#ff4757'}`,
                background: `rgba(${isControllerConnected ? '46, 213, 115' : '255, 71, 87'}, 0.1)`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div style={{ fontSize: '20px' }}>
                  {isControllerConnected ? '🟢' : '🔴'}
                </div>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {isControllerConnected ? 'DDJ-FLX4 Connected' : 'DDJ-FLX4 Disconnected'}
                </span>
              </div>
              {!isControllerConnected && (
                <button 
                  onClick={onRetryConnection}
                  style={{
                    padding: '10px 15px',
                    backgroundColor: '#ff4757',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Retry Connection {connectionAttempts > 0 && `(${connectionAttempts})`}
                </button>
              )}
            </div>
          </div>

          {/* Visual DNA System Controls */}
          <CollapsibleSection title="🧬 Visual DNA System" defaultOpen={true}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={visualDNAEnabled}
                  onChange={(e) => onVisualDNAToggle(e.target.checked)}
                  style={{ 
                    width: '18px', 
                    height: '18px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  🧬 Enable Visual DNA System
                </span>
              </label>
            </div>

            <div style={{ 
              color: '#74b9ff', 
              fontSize: '13px',
              background: 'rgba(116, 185, 255, 0.1)',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid rgba(116, 185, 255, 0.3)',
              lineHeight: '1.4'
            }}>
              💡 <strong>Tip:</strong> The Visual DNA System provides AI-powered adaptive visuals that analyze your music in real-time and create unique visual experiences tailored to each track's characteristics.
            </div>
          </CollapsibleSection>

          {/* Visual DNA Profile Selector */}
          <CollapsibleSection title="🧬 Visual DNA Profile Selection" defaultOpen={true}>
            <div style={{ marginBottom: '15px' }}>
              <div style={{ 
                marginBottom: '10px', 
                padding: '10px', 
                background: 'rgba(255,255,255,0.05)', 
                borderRadius: '6px',
                border: `2px solid ${visualState.currentProfile.colorPalette?.accent || '#00ffff'}`
              }}>
                <div style={{ 
                  fontWeight: 'bold', 
                  fontSize: '16px',
                  color: visualState.currentProfile.colorPalette?.primary || '#00ffff',
                  marginBottom: '5px'
                }}>
                  🧬 {visualState.currentProfile.name}
                  {visualDNA.isManualMode() && (
                    <span style={{ color: '#ffa502', fontSize: '12px', marginLeft: '10px' }}>[Manual]</span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#ccc' }}>
                  <div><strong>Type:</strong> {visualState.currentProfile.visualElements.type}</div>
                  <div><strong>Dimension:</strong> {visualState.currentProfile.visualElements.dimension}</div>
                  <div><strong>Mood:</strong> {visualState.currentProfile.moodTags.join(', ')}</div>
                  <div><strong>Genres:</strong> {visualState.currentProfile.genreAffinity.join(', ')}</div>
                </div>
                {visualState.targetProfile && (
                  <div style={{ 
                    marginTop: '8px', 
                    fontSize: '11px', 
                    color: '#ffa502',
                    fontStyle: 'italic'
                  }}>
                    Transitioning to: {visualState.targetProfile.name} ({(visualState.interpolationProgress * 100).toFixed(0)}%)
                  </div>
                )}
              </div>
              
              <div style={{ 
                position: 'relative',
                minHeight: '200px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                border: '1px solid #333'
              }}>
                <VisualDNAProfileSelector 
                  visualDNA={visualDNA}
                  currentProfileId={visualState.currentProfile.id}
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Controller Status */}
          <CollapsibleSection title="🎛️ Controller Status" defaultOpen={false}>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <div style={{ marginBottom: '8px' }}><strong>Crossfader:</strong> {appState.controller.crossfader}</div>
              <div style={{ marginBottom: '8px' }}><strong>Channel A Volume:</strong> {appState.controller.channelA.volume}</div>
              <div style={{ marginBottom: '8px' }}><strong>Channel B Volume:</strong> {appState.controller.channelB.volume}</div>
              
              <div style={{ marginTop: '15px', marginBottom: '10px', fontWeight: 'bold', color: '#00ffff' }}>Channel A EQ:</div>
              <div style={{ marginLeft: '15px' }}>
                <div>High: {appState.controller.channelA.eq.high}</div>
                <div>Mid: {appState.controller.channelA.eq.mid}</div>
                <div>Low: {appState.controller.channelA.eq.low}</div>
              </div>
              
              <div style={{ marginTop: '15px', marginBottom: '10px', fontWeight: 'bold', color: '#00ffff' }}>Channel B EQ:</div>
              <div style={{ marginLeft: '15px' }}>
                <div>High: {appState.controller.channelB.eq.high}</div>
                <div>Mid: {appState.controller.channelB.eq.mid}</div>
                <div>Low: {appState.controller.channelB.eq.low}</div>
              </div>
              
              <div style={{ marginTop: '15px' }}>
                <strong>Active Performance Pads:</strong> {appState.controller.performancePads.pads.filter(p => p.isPressed).length}
              </div>
            </div>
          </CollapsibleSection>

          {/* Track Identification Panel */}
          <CollapsibleSection title="🎯 AI Track Identification System" defaultOpen={true}>
            <div style={{ 
              background: '#1a1a1a', 
              borderRadius: '8px', 
              padding: '15px',
              border: '1px solid #333'
            }}>
              <TrackIdentificationPanel 
                onTracksLoaded={onTracksLoaded}
                identificationResult={identificationResult}
                isAIReady={true}
              />
            </div>
          </CollapsibleSection>

          {/* Debug Info */}
          <CollapsibleSection title="🔍 Debug Information" defaultOpen={false}>
            <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
              <div><strong>MIDI Enabled:</strong> {typeof window !== 'undefined' && 'navigator' in window && 'requestMIDIAccess' in navigator ? '✅' : '❌'}</div>
              <div><strong>Available MIDI Devices:</strong> {ddjController.getAvailableInputs().length}</div>
              
              {ddjController.getAvailableInputs().length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <strong>Device List:</strong>
                  <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    {ddjController.getAvailableInputs().map((device, index) => (
                      <li key={index} style={{ fontSize: '11px', color: '#ccc' }}>{device}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                <div><strong>Browser Support:</strong></div>
                <div style={{ fontSize: '11px', marginTop: '5px' }}>
                  <div>Web Audio API: {typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext) ? '✅' : '❌'}</div>
                  <div>MIDI Access: {typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function' ? '✅' : '❌'}</div>
                  <div>Local Storage: {typeof Storage !== "undefined" ? '✅' : '❌'}</div>
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* Right Column - AI & Audio Controls */}
        <div style={{
          width: '50%',
          padding: '20px',
          overflowY: 'auto'
        }}>
          <h2 style={{ marginTop: 0, color: '#00ffff' }}>🤖 AI & Audio Analysis Controls</h2>

          {/* Audio Input Controls */}
          <CollapsibleSection title="🎤 Audio Input Control (Shared across all screens)" defaultOpen={true}>
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
                  color: Math.round(aiAnalysis.audioInput.audioLevel * 100) >= 70 ? '#ff4757' : 
                        Math.round(aiAnalysis.audioInput.audioLevel * 100) >= 40 ? '#2ed573' : 
                        Math.round(aiAnalysis.audioInput.audioLevel * 100) >= 20 ? '#ffa502' : '#ff6b6b',
                  fontWeight: 'bold',
                  fontSize: '18px'
                }}>
                  {Math.round(aiAnalysis.audioInput.audioLevel * 100)}%
                </span>
              </div>
              
              {/* Audio Level Bar */}
              <div style={{
                width: '100%',
                height: '25px',
                backgroundColor: '#2c2c2c',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '2px solid #444'
              }}>
                <div style={{
                  width: `${Math.min(100, Math.round(aiAnalysis.audioInput.audioLevel * 100))}%`,
                  height: '100%',
                  backgroundColor: Math.round(aiAnalysis.audioInput.audioLevel * 100) >= 70 ? '#ff4757' : 
                                  Math.round(aiAnalysis.audioInput.audioLevel * 100) >= 40 ? '#2ed573' : 
                                  Math.round(aiAnalysis.audioInput.audioLevel * 100) >= 20 ? '#ffa502' : '#ff6b6b',
                  transition: 'all 0.1s ease',
                  borderRadius: '10px'
                }} />
              </div>
              
              {Math.round(aiAnalysis.audioInput.audioLevel * 100) < 20 && (
                <div style={{ 
                  color: '#ffa502', 
                  fontSize: '13px', 
                  marginTop: '8px',
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
                <span style={{ color: '#00d2d3', fontWeight: 'bold' }}>{aiAnalysis.audioInput.inputGain.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="20"
                step="0.1"
                value={aiAnalysis.audioInput.inputGain}
                onChange={(e) => aiAnalysis.audioInput.setInputGain(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '15px',
                  borderRadius: '8px',
                  background: `linear-gradient(to right, #00d2d3 0%, #00d2d3 ${(aiAnalysis.audioInput.inputGain / 20) * 100}%, #2c2c2c ${(aiAnalysis.audioInput.inputGain / 20) * 100}%, #2c2c2c 100%)`,
                  outline: 'none',
                  cursor: 'pointer',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  border: '2px solid #444'
                }}
              />
            </div>

            {/* Sensitivity Control */}
            <div style={{ marginBottom: '15px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: '8px'
              }}>
                <span>Sensitivity:</span>
                <span style={{ color: '#00d2d3', fontWeight: 'bold' }}>{aiAnalysis.audioInput.sensitivity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={aiAnalysis.audioInput.sensitivity}
                onChange={(e) => aiAnalysis.audioInput.setSensitivity(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '15px',
                  borderRadius: '8px',
                  background: `linear-gradient(to right, #ffa502 0%, #ffa502 ${(aiAnalysis.audioInput.sensitivity / 10) * 100}%, #2c2c2c ${(aiAnalysis.audioInput.sensitivity / 10) * 100}%, #2c2c2c 100%)`,
                  outline: 'none',
                  cursor: 'pointer',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  border: '2px solid #444'
                }}
              />
            </div>

            {/* Device Selection */}
            <div style={{ marginBottom: '15px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '8px' 
              }}>
                <span style={{ fontWeight: 'bold' }}>Input Device:</span>
                <button
                  onClick={aiAnalysis.audioInput.refreshDevices}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#00d2d3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  🔄 Refresh
                </button>
              </div>
              
              <select
                value={aiAnalysis.audioInput.selectedDeviceId || ''}
                onChange={(e) => aiAnalysis.audioInput.selectDevice(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  backgroundColor: '#2c2c2c',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                <option value="">Default Device</option>
                {aiAnalysis.audioInput.availableDevices.map((device: MediaDeviceInfo) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Audio Input Device ${device.deviceId.substring(0, 8)}...`}
                  </option>
                ))}
              </select>
              
              {aiAnalysis.audioInput.availableDevices.length === 0 && (
                <div style={{ 
                  color: '#ffa502', 
                  fontSize: '12px', 
                  marginTop: '5px',
                  fontStyle: 'italic',
                  background: 'rgba(255, 165, 2, 0.1)',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(255, 165, 2, 0.3)'
                }}>
                  ⚠️ No audio devices detected. Click "Refresh" to scan for devices and grant microphone permission.
                </div>
              )}
              
                             {aiAnalysis.audioInput.availableDevices.length > 0 && 
                aiAnalysis.audioInput.availableDevices.every((d: MediaDeviceInfo) => !d.label || d.label.trim() === '') && (
                <div style={{ 
                  color: '#74b9ff', 
                  fontSize: '12px', 
                  marginTop: '5px',
                  fontStyle: 'italic',
                  background: 'rgba(116, 185, 255, 0.1)',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(116, 185, 255, 0.3)'
                }}>
                  💡 Device names not shown. Click "Refresh" to grant microphone permission and see device names.
                </div>
              )}
            </div>

            {/* Control Buttons */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
              <button
                onClick={aiAnalysis.audioInput.isListening ? aiAnalysis.audioInput.stopListening : aiAnalysis.audioInput.startListening}
                style={{
                  flex: 1,
                  padding: '15px',
                  backgroundColor: aiAnalysis.audioInput.isListening ? '#ff4757' : '#2ed573',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {aiAnalysis.audioInput.isListening ? '🔇 Stop Audio' : '🎤 Start Audio'}
              </button>
              <button
                onClick={aiAnalysis.audioInput.refreshDevices}
                style={{
                  padding: '15px 20px',
                  backgroundColor: '#444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                🔄 Refresh
              </button>
            </div>

            {/* Quick Preset Buttons */}
            <div style={{ marginBottom: '15px' }}>
              <div style={{ fontSize: '14px', marginBottom: '8px', fontWeight: 'bold' }}>
                Quick Presets:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { aiAnalysis.audioInput.setInputGain(1.0); aiAnalysis.audioInput.setSensitivity(1.0); }}
                  style={{ padding: '8px 12px', backgroundColor: '#555', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                >
                  Default
                </button>
                <button
                  onClick={() => { aiAnalysis.audioInput.setInputGain(3.0); aiAnalysis.audioInput.setSensitivity(2.0); }}
                  style={{ padding: '8px 12px', backgroundColor: '#555', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                >
                  Boosted
                </button>
                <button
                  onClick={() => { aiAnalysis.audioInput.setInputGain(5.0); aiAnalysis.audioInput.setSensitivity(3.0); }}
                  style={{ padding: '8px 12px', backgroundColor: '#555', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                >
                  Max Gain
                </button>
              </div>
            </div>

            {/* Error Display */}
            {aiAnalysis.audioInput.error && (
              <div style={{
                backgroundColor: '#ff4757',
                color: 'white',
                padding: '10px',
                borderRadius: '6px',
                fontSize: '13px',
                marginTop: '10px'
              }}>
                ❌ {aiAnalysis.audioInput.error}
              </div>
            )}
          </CollapsibleSection>

          {/* Beat Detection & Rhythm Analysis */}
          <CollapsibleSection title="🥁 Beat Detection & Rhythm" defaultOpen={true}>
            <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
              <div style={{ marginBottom: '10px', padding: '8px', background: 'rgba(0,255,255,0.1)', borderRadius: '6px' }}>
                <div><strong>Next Beat Prediction:</strong> {aiAnalysis.predictiveBeats?.nextBeatPrediction ? `${Math.max(0, aiAnalysis.predictiveBeats.nextBeatPrediction - performance.now()).toFixed(0)}ms` : 'N/A'}</div>
                <div><strong>Beat Confidence:</strong> <span style={{color: aiAnalysis.predictiveBeats?.confidence > 0.8 ? '#2ed573' : aiAnalysis.predictiveBeats?.confidence > 0.5 ? '#ffa502' : '#ff4757'}}>{((aiAnalysis.predictiveBeats?.confidence || 0) * 100).toFixed(1)}%</span></div>
                <div><strong>Tempo Stability:</strong> <span style={{color: (aiAnalysis.predictiveBeats?.tempoStability || 0) > 0.8 ? '#2ed573' : '#ffa502'}}>{((aiAnalysis.predictiveBeats?.tempoStability || 0) * 100).toFixed(1)}%</span></div>
              </div>
              <div><strong>AI Smoothed BPM:</strong> {aiAnalysis.smartSmoothedValues?.bpm?.toFixed(1) || 'N/A'} BPM</div>
                              <div><strong>Beat Pattern:</strong> {aiAnalysis.predictiveBeats?.beatPattern?.map((interval: number) => `${interval.toFixed(0)}ms`).join(', ') || 'Learning...'}</div>
            </div>
          </CollapsibleSection>

          {/* Energy & Genre Analysis */}
          <CollapsibleSection title="⚡ Energy & Genre Analysis" defaultOpen={false}>
            <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
              <div style={{ marginBottom: '10px', padding: '8px', background: 'rgba(46,213,115,0.1)', borderRadius: '6px' }}>
                <div><strong>Current Energy:</strong> <span style={{color: '#2ed573'}}>{((aiAnalysis.patternRecognition?.energyPrediction?.currentEnergy || 0) * 100).toFixed(1)}%</span></div>
                <div><strong>Energy Trend:</strong> 
                  <span style={{
                    color: aiAnalysis.patternRecognition?.energyPrediction?.energyTrend === 'rising' ? '#2ed573' :
                          aiAnalysis.patternRecognition?.energyPrediction?.energyTrend === 'falling' ? '#ff4757' : '#ffa502',
                    marginLeft: '8px'
                  }}>
                    {aiAnalysis.patternRecognition?.energyPrediction?.energyTrend || 'stable'} 
                  </span>
                </div>
              </div>
              <div style={{ marginBottom: '10px', padding: '8px', background: 'rgba(255,0,255,0.1)', borderRadius: '6px' }}>
                <div><strong>Detected Genre:</strong> 
                  <span style={{ color: '#ff00ff', marginLeft: '8px', textTransform: 'capitalize', fontWeight: 'bold' }}>
                    {aiAnalysis.patternRecognition?.genreClassification?.detectedGenre || 'unknown'}
                  </span>
                </div>
                <div><strong>Genre Confidence:</strong> 
                  <span style={{
                    color: (aiAnalysis.patternRecognition?.genreClassification?.confidence || 0) > 0.7 ? '#2ed573' :
                          (aiAnalysis.patternRecognition?.genreClassification?.confidence || 0) > 0.4 ? '#ffa502' : '#ff4757',
                    marginLeft: '8px'
                  }}>
                    {((aiAnalysis.patternRecognition?.genreClassification?.confidence || 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Performance & System Status */}
          <CollapsibleSection title="⚡ Performance & System Status" defaultOpen={false}>
            <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
              <div style={{ marginBottom: '10px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                <div><strong>AI Status:</strong> <span style={{color: aiAnalysis.isAIReady ? '#2ed573' : '#ff4757'}}>{aiAnalysis.isAIReady ? '✅ Ready' : '❌ Initializing'}</span></div>
                <div><strong>Analysis Rate:</strong> ~40 Hz (25ms intervals)</div>
                <div><strong>Buffer Size:</strong> 2048 samples</div>
              </div>
              <div><strong>Data Sources:</strong></div>
              <div style={{ marginLeft: '15px', fontSize: '11px' }}>
                <div>MIDI: <span style={{color: controller ? '#2ed573' : '#ff4757'}}>{controller ? '✅ Connected' : '❌ Disconnected'}</span></div>
                <div>Audio Input: <span style={{color: aiAnalysis.audioInput.isListening ? '#2ed573' : '#ff4757'}}>{aiAnalysis.audioInput.isListening ? '✅ Active' : '❌ Inactive'}</span></div>
              </div>
              <div><strong>Total AI Confidence:</strong> 
                <span style={{
                  color: aiAnalysis.aiConfidence > 0.8 ? '#2ed573' : aiAnalysis.aiConfidence > 0.5 ? '#ffa502' : '#ff4757',
                  marginLeft: '8px',
                  fontWeight: 'bold'
                }}>
                  {(aiAnalysis.aiConfidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </CollapsibleSection>

          {/* ML Models Status */}
          <CollapsibleSection title="🧠 ML Models & Neural Networks" defaultOpen={false}>
            <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
              {aiAnalysis.isAIReady ? (
                <>
                  <div style={{ marginBottom: '8px', padding: '6px', background: 'rgba(0,255,0,0.1)', borderRadius: '4px' }}>
                    <div><strong>Beat Predictor:</strong> <span style={{color: '#2ed573'}}>✅ Active</span></div>
                    <div style={{fontSize: '10px', color: '#999'}}>Neural Network: TensorFlow.js | Input: 32 beats → Output: 4 predictions</div>
                  </div>
                  <div style={{ marginBottom: '8px', padding: '6px', background: 'rgba(255,0,255,0.1)', borderRadius: '4px' }}>
                    <div><strong>Genre Classifier:</strong> <span style={{color: '#2ed573'}}>✅ Active</span></div>
                    <div style={{fontSize: '10px', color: '#999'}}>Neural Network: TensorFlow.js | MFCC features → 10 genres</div>
                  </div>
                  <div style={{ marginBottom: '8px', padding: '6px', background: 'rgba(255,165,0,0.1)', borderRadius: '4px' }}>
                    <div><strong>Energy Predictor:</strong> <span style={{color: '#2ed573'}}>✅ Active</span></div>
                    <div style={{fontSize: '10px', color: '#999'}}>Neural Network: TensorFlow.js | 16 features → 8 energy levels</div>
                  </div>
                </>
              ) : (
                <div style={{ color: '#999', fontStyle: 'italic' }}>Neural networks initializing...</div>
              )}
            </div>
          </CollapsibleSection>

          {/* Memory & Learning */}
          <CollapsibleSection title="🧠 Memory System & Learning" defaultOpen={false}>
            <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
              <div style={{ marginBottom: '8px', padding: '6px', background: 'rgba(116,185,255,0.1)', borderRadius: '4px' }}>
                <div><strong>Short-term Memory:</strong> <span style={{color: '#74b9ff'}}>{aiAnalysis.memorySystem?.shortTermMemory?.size || 0} patterns</span></div>
                <div><strong>Long-term Memory:</strong> <span style={{color: '#74b9ff'}}>{aiAnalysis.memorySystem?.longTermMemory?.size || 0} memories</span></div>
                <div><strong>Session Memory:</strong> <span style={{color: '#74b9ff'}}>{aiAnalysis.memorySystem?.sessionMemory?.size || 0} entries</span></div>
              </div>
              <div><strong>Learning Status:</strong> {(aiAnalysis.memorySystem?.shortTermMemory?.size || 0) > 10 ? '🧠 Actively Learning' : '📚 Collecting Data'}</div>
              <div><strong>Data Quality:</strong> {aiAnalysis.audioInput.isListening ? 'High (Audio + MIDI)' : 'Medium (MIDI Only)'}</div>
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </div>
  );
} 