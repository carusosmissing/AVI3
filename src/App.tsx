import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import VisualizerScene from './components/visualizer-scene';
import AIEnhancedVisualizer from './components/ai-enhanced-visualizer';
import TrackIdentificationPanel from './components/track-identification-panel';
import useMIDIBPM from './hooks/useMIDIBPM';

import { DDJFlx4Controller } from './controllers/ddj-flx4-controller';
import { DDJControllerState, VisualParams, AppState, Track } from './types';

function App() {
  // BPM Detection Hook
  const { currentBPM, isConnected: bpmConnected, beatPhase, beatInterval } = useMIDIBPM();
  

  
  // App state
  const [appState, setAppState] = useState<AppState>({
    tracks: [],
    controller: getInitialControllerState(),
    visualParams: getInitialVisualParams(),
    isPlaying: false,
    masterVolume: 75
  });

  // Instances
  const [ddjController] = useState(() => new DDJFlx4Controller());

  // Connection status
  const [isControllerConnected, setIsControllerConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);


  
  // Visualizer mode - basic or AI
  const [visualizerMode, setVisualizerMode] = useState<'basic' | 'ai'>('basic');
  
  // Visual DNA overlay toggle
  const [visualDNAEnabled, setVisualDNAEnabled] = useState(true);
  
  // UI state
  const [isControllerSectionCollapsed, setIsControllerSectionCollapsed] = useState(false);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  
  // Track identification state
  const [identificationTracks, setIdentificationTracks] = useState<Track[]>([]);
  const [identificationResult, setIdentificationResult] = useState<any>(null);

  // Prepare BPM data for visualizer
  const bpmData = {
    currentBPM,
    isConnected: bpmConnected,
    beatPhase,
    beatInterval
  };

  /**
   * Handle tracks loaded from identification panel
   */
  const handleTracksLoaded = useCallback((tracks: Track[]) => {
    setIdentificationTracks(tracks);
    console.log(`🎯 Track identification system loaded ${tracks.length} tracks for AI analysis`);
  }, []);

  /**
   * Handle track identification results from AI system
   */
  const handleTrackIdentification = useCallback((result: any) => {
    setIdentificationResult(result);
  }, []);

  /**
   * Initialize controller connection and event listeners
   */
  useEffect(() => {
    console.log('🚀 Initializing DDJ Audio Visualizer...');

    // Set up MIDI controller event listeners
    ddjController.on('connected', (data: any) => {
      console.log('✅ Controller connected:', data.controller);
      setIsControllerConnected(true);
      setConnectionAttempts(0);
      // Update app state controller connection
      setAppState(prev => ({
        ...prev,
        controller: {
          ...prev.controller,
          isConnected: true
        }
      }));
    });

    ddjController.on('disconnected', () => {
      console.log('🔌 Controller disconnected');
      setIsControllerConnected(false);
      // Update app state controller connection
      setAppState(prev => ({
        ...prev,
        controller: {
          ...prev.controller,
          isConnected: false
        }
      }));
    });

    // Real-time controller state updates
    ddjController.on('crossfader', (data: any) => {
      setAppState(prev => ({
        ...prev,
        controller: {
          ...prev.controller,
          crossfader: data.value
        }
      }));
    });

    // Channel A events
    ddjController.on('channelA:volume', (data: any) => {
      console.log('📱 App received channelA:volume event:', data.value);
      setAppState(prev => ({
        ...prev,
        controller: {
          ...prev.controller,
          channelA: {
            ...prev.controller.channelA,
            volume: data.value
          }
        }
      }));
    });

    ddjController.on('channelA:eq:high', (data: any) => {
      setAppState(prev => ({
        ...prev,
        controller: {
          ...prev.controller,
          channelA: {
            ...prev.controller.channelA,
            eq: { ...prev.controller.channelA.eq, high: data.value }
          }
        }
      }));
    });

    ddjController.on('channelA:eq:mid', (data: any) => {
      setAppState(prev => ({
        ...prev,
        controller: {
          ...prev.controller,
          channelA: {
            ...prev.controller.channelA,
            eq: { ...prev.controller.channelA.eq, mid: data.value }
          }
        }
      }));
    });

    ddjController.on('channelA:eq:low', (data: any) => {
      setAppState(prev => ({
        ...prev,
        controller: {
          ...prev.controller,
          channelA: {
            ...prev.controller.channelA,
            eq: { ...prev.controller.channelA.eq, low: data.value }
          }
        }
      }));
    });

    // Channel B events 
    ddjController.on('channelB:volume', (data: any) => {
      console.log('📱 App received channelB:volume event:', data.value);
      setAppState(prev => ({
        ...prev,
        controller: {
          ...prev.controller,
          channelB: {
            ...prev.controller.channelB,
            volume: data.value
          }
        }
      }));
    });

    ddjController.on('channelB:eq:high', (data: any) => {
      setAppState(prev => ({
        ...prev,
        controller: {
          ...prev.controller,
          channelB: {
            ...prev.controller.channelB,
            eq: { ...prev.controller.channelB.eq, high: data.value }
          }
        }
      }));
    });

    ddjController.on('channelB:eq:mid', (data: any) => {
      setAppState(prev => ({
        ...prev,
        controller: {
          ...prev.controller,
          channelB: {
            ...prev.controller.channelB,
            eq: { ...prev.controller.channelB.eq, mid: data.value }
          }
        }
      }));
    });

    ddjController.on('channelB:eq:low', (data: any) => {
      setAppState(prev => ({
        ...prev,
        controller: {
          ...prev.controller,
          channelB: {
            ...prev.controller.channelB,
            eq: { ...prev.controller.channelB.eq, low: data.value }
          }
        }
      }));
    });

    // Also listen for generic MIDI events to debug
    ddjController.on('midi', (data: any) => {
      console.log('📡 MIDI Event received in App:', data);
    });

    // Performance pad events
    ddjController.on('pad', (data: any) => {
      setAppState(prev => {
        const newPads = [...prev.controller.performancePads.pads];
        newPads[data.id] = {
          id: data.id,
          isPressed: data.isPressed,
          velocity: data.velocity,
          mode: 'hotcue'
        };
        return {
          ...prev,
          controller: {
            ...prev.controller,
            performancePads: { pads: newPads }
          }
        };
      });
    });

    // Update connection status
    setIsControllerConnected(ddjController.isControllerConnected());

    // Cleanup on unmount
    return () => {
      ddjController.disconnect();
    };
  }, [ddjController]);



  /**
   * Load track to specific deck
   */
  const loadTrackToDeck = useCallback((track: any, deck: 'A' | 'B') => {
    if (deck === 'A') {
      ddjController.loadTrackToDeckA(track);
      setAppState(prev => ({
        ...prev,
        currentTrackA: track,
        controller: {
          ...prev.controller,
          channelA: {
            ...prev.controller.channelA,
            bpm: track.bpm,
            currentTrackId: track.id
          }
        }
      }));
    } else {
      ddjController.loadTrackToDeckB(track);
      setAppState(prev => ({
        ...prev,
        currentTrackB: track,
        controller: {
          ...prev.controller,
          channelB: {
            ...prev.controller.channelB,
            bpm: track.bpm,
            currentTrackId: track.id
          }
        }
      }));
    }
    console.log(`📀 Loaded "${track.name}" to Deck ${deck} (${track.bpm} BPM)`);
  }, [ddjController]);

  /**
   * Retry controller connection
   */
  const retryConnection = useCallback(() => {
    console.log('🔄 Retrying controller connection...');
    setConnectionAttempts(prev => prev + 1);
    
    // Get available devices for debugging
    const availableInputs = ddjController.getAvailableInputs();
    console.log('Available MIDI inputs:', availableInputs);
    
    // Try to find any DDJ device
    const ddjDevice = ddjController.findAnyDDJDevice();
    if (ddjDevice) {
      console.log(`🎛️ Found DDJ device: ${ddjDevice}`);
      const connected = ddjController.connectToInput(ddjDevice);
      if (connected) {
        console.log('✅ Manual connection successful');
      }
    } else {
      console.log('❌ No DDJ devices found');
      alert(`No DDJ controllers found. Available MIDI devices: ${availableInputs.join(', ') || 'None'}\n\nMake sure your DDJ-FLX4 is:\n1. Connected via USB\n2. Powered on\n3. Recognized by your system`);
    }
  }, [ddjController]);

  return (
    <div className="App">
      {/* Left Panel Toggle Button */}
      <button
        onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
        style={{
          position: 'fixed',
          top: '20px',
          left: isLeftPanelOpen ? '320px' : '20px',
          zIndex: 1001,
          background: 'rgba(0, 0, 0, 0.9)',
          border: '2px solid #333',
          color: 'white',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          transition: 'all 0.3s ease',
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(50, 50, 50, 0.9)';
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {isLeftPanelOpen ? '◀' : '▶'}
      </button>

      {/* Control Panel */}
      <div 
        className="control-panel" 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '300px',
          height: '100vh',
          background: 'linear-gradient(135deg, #1e3c72, #2a5298)',
          color: 'white',
          padding: '20px',
          boxSizing: 'border-box',
          overflowY: 'auto',
          zIndex: 1000,
          transform: isLeftPanelOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          boxShadow: isLeftPanelOpen ? '2px 0 10px rgba(0,0,0,0.3)' : 'none'
        }}
      >
        <div className="control-section">
          <h2>🎛️ DDJ-FLX4 Audio Visualizer</h2>
          
          {/* Connection Status */}
          <div className={`connection-status ${isControllerConnected ? 'connected' : 'disconnected'}`}>
            <div className="status-indicator">
              {isControllerConnected ? '🟢' : '🔴'}
            </div>
            <span>
              {isControllerConnected ? 'DDJ-FLX4 Connected' : 'DDJ-FLX4 Disconnected'}
            </span>
            {!isControllerConnected && (
              <button onClick={retryConnection} className="retry-btn">
                Retry Connection {connectionAttempts > 0 && `(${connectionAttempts})`}
              </button>
            )}
          </div>

          {/* Visualizer Mode Toggle */}
          <div className="visualizer-toggle">
            <div className="mode-selection">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <select
                  value={visualizerMode}
                  onChange={(e) => setVisualizerMode(e.target.value as 'basic' | 'ai')}
                  style={{
                    padding: '5px 10px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    backgroundColor: '#2c3e50',
                    color: 'white',
                    border: '1px solid #34495e',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="basic">🎵 Basic Visualizer</option>
                  <option value="ai">🤖 AI-Enhanced</option>
                </select>
              </label>
              
              {/* Visual DNA Toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '20px' }}>
                <input
                  type="checkbox"
                  checked={visualDNAEnabled}
                  onChange={(e) => setVisualDNAEnabled(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  🧬 Visual DNA {visualizerMode === 'basic' ? 'Overlay' : ''}
                </span>
              </label>
            </div>
            
            <div className="mode-description">
              {visualizerMode === 'ai' ? (
                <>
                  🧠 <strong>AI Mode:</strong> Predictive beats + learning + smart smoothing
                  <div style={{ fontSize: '12px', color: '#a4b0be', marginTop: '8px' }}>
                    • AI predicts next beats for seamless visual sync<br/>
                    • Machine learning adapts to your mixing style<br/>
                    • Smart smoothing prevents jarring changes<br/>
                    • Genre detection influences visual behavior<br/>
                    • Memory system learns from session patterns
                  </div>
                </>
              ) : (
                <>
                  🎵🎛️ <strong>Basic Mode:</strong> Real-time beat detection + controller response
                  <div style={{ fontSize: '12px', color: '#a4b0be', marginTop: '8px' }}>
                    • EQ/Volume controls affect size and color<br/>
                    • BPM detection adds beat-synced pulsing<br/>
                    • Performance pads trigger particle effects<br/>
                    • Manual BPM tapping: Notes 150, 99, 127
                  </div>
                </>
              )}
              
              {/* Visual DNA Description when enabled */}
              {visualDNAEnabled && (
                <div style={{ 
                  fontSize: '12px', 
                  color: '#e74c3c', 
                  marginTop: '8px',
                  background: 'rgba(231, 76, 60, 0.1)',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(231, 76, 60, 0.3)'
                }}>
                  🧬 <strong>Visual DNA {visualizerMode === 'basic' ? 'Overlay' : 'System'} Active:</strong>
                  <div style={{ marginTop: '4px' }}>
                    {visualizerMode === 'basic' ? (
                      <>
                        • Overlay mode: Semi-transparent layer over basic visualizer<br/>
                        • MIDI-only: Reacts to controller movements<br/>
                        • Simulated genre detection based on EQ settings
                      </>
                    ) : (
                      <>
                        • Full replacement: Visual DNA is the main visualizer<br/>
                        • AI-powered: Real audio analysis & genre detection<br/>
                        • 10 unique profiles with smooth transitions
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Audio Input Note */}
          <div style={{ 
            color: '#74b9ff', 
            fontSize: '12px',
            background: 'rgba(116, 185, 255, 0.1)',
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(116, 185, 255, 0.3)',
            lineHeight: '1.4',
            marginBottom: '20px'
          }}>
            💡 <strong>Audio Input:</strong> Use the AI panel (top-right) to control audio input for enhanced AI-powered visualizations!
          </div>



          {/* Controller Status */}
          <div className="controller-info">
            <h3 onClick={() => setIsControllerSectionCollapsed(!isControllerSectionCollapsed)}>
              Controller Status
              <span className={`collapse-icon ${!isControllerSectionCollapsed ? 'expanded' : ''}`}>
                ▼
              </span>
            </h3>
            <div className={`controller-values ${isControllerSectionCollapsed ? 'collapsed' : ''}`}>
              <div>Crossfader: {appState.controller.crossfader}</div>
              <div>Channel A Volume: {appState.controller.channelA.volume}</div>
              <div>Channel B Volume: {appState.controller.channelB.volume}</div>
              <div>Channel A EQ High: {appState.controller.channelA.eq.high}</div>
              <div>Channel A EQ Mid: {appState.controller.channelA.eq.mid}</div>
              <div>Channel A EQ Low: {appState.controller.channelA.eq.low}</div>
              <div>Channel B EQ High: {appState.controller.channelB.eq.high}</div>
              <div>Channel B EQ Mid: {appState.controller.channelB.eq.mid}</div>
              <div>Channel B EQ Low: {appState.controller.channelB.eq.low}</div>
              <div>
                Active Pads: {appState.controller.performancePads.pads.filter(p => p.isPressed).length}
              </div>
            </div>
          </div>



          {/* Track Identification Panel */}
          <div className="track-identification-section">
            <h3>🎯 AI Track Identification System</h3>
            <div style={{ 
              background: '#1a1a1a', 
              borderRadius: '8px', 
              padding: '15px',
              border: '1px solid #333'
            }}>
              <TrackIdentificationPanel 
                onTracksLoaded={handleTracksLoaded}
                identificationResult={identificationResult}
                isAIReady={true} // Assume AI is ready in this context
              />
            </div>
          </div>

          {/* Debug Info */}
          <div className="debug-info">
            <h3>Debug Info</h3>
            <div className="debug-values">
              <div>MIDI Enabled: {typeof window !== 'undefined' && 'navigator' in window && 'requestMIDIAccess' in navigator ? '✅' : '❌'}</div>
              <div>Available Devices: {ddjController.getAvailableInputs().length}</div>
              <div className="device-list">
                {ddjController.getAvailableInputs().length > 0 ? (
                  <details>
                    <summary>Show Devices ({ddjController.getAvailableInputs().length})</summary>
                    <ul>
                      {ddjController.getAvailableInputs().map((device, index) => (
                        <li key={index}>{device}</li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <span>No MIDI devices found</span>
                )}
              </div>
              <div className="debug-note">
                <small>
                  💡 <strong>Tip:</strong> Open browser DevTools (F12) → Console to see detailed MIDI event logs when you move controls
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Visualizer */}
      <div style={{ 
        marginLeft: isLeftPanelOpen ? '300px' : '0px',
        transition: 'margin-left 0.3s ease',
        width: isLeftPanelOpen ? 'calc(100% - 300px)' : '100%',
        height: '100vh'
      }}>
        {visualizerMode === 'ai' ? (
          <AIEnhancedVisualizer
            controller={ddjController}
            controllerState={appState.controller}
            visualParams={appState.visualParams}
            identificationTracks={identificationTracks}
            onTrackIdentification={handleTrackIdentification}
            visualDNAEnabled={visualDNAEnabled}
          />
        ) : (
          <VisualizerScene 
            controllerState={appState.controller}
            visualParams={appState.visualParams}
            bpmData={bpmData}
            visualDNAEnabled={visualDNAEnabled}
          />
        )}
      </div>


    </div>
  );
}

/**
 * Get initial controller state
 */
function getInitialControllerState(): DDJControllerState {
  return {
    crossfader: 64,
    channelA: {
      volume: 127,
      eq: { high: 64, mid: 64, low: 64 },
      cue: false,
      play: false,
      jogWheel: { position: 0, isTouched: false, velocity: 0 },
      bpm: 120,
      currentTrackId: undefined
    },
    channelB: {
      volume: 127,
      eq: { high: 64, mid: 64, low: 64 },
      cue: false,
      play: false,
      jogWheel: { position: 0, isTouched: false, velocity: 0 },
      bpm: 120,
      currentTrackId: undefined
    },
    performancePads: {
      pads: Array.from({ length: 16 }, (_, i) => ({
        id: i,
        isPressed: false,
        velocity: 0,
        mode: 'hotcue'
      }))
    },
    isConnected: false
  };
}

/**
 * Get initial visual parameters
 */
function getInitialVisualParams(): VisualParams {
  return {
    intensity: 0.5,
    color: { hue: 180, saturation: 0.7, lightness: 0.5 },
    speed: 1.0,
    scale: 1.0,
    effects: []
  };
}

export default App;
