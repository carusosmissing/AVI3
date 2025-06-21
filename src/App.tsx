import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import AIEnhancedVisualizer from './components/ai-enhanced-visualizer';
import ControlPanelScreen from './components/control-panel-screen';
import useMIDIBPM from './hooks/useMIDIBPM';
import useAIAudioAnalyzer from './hooks/useAIAudioAnalyzer';

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

  // Shared AI Audio Analyzer - this will maintain audio input state across components
  const aiAnalysis = useAIAudioAnalyzer(ddjController, {
    currentBPM,
    isConnected: bpmConnected,
    beatPhase,
    beatInterval
  });

  
  // Visual DNA system toggle
  const [visualDNAEnabled, setVisualDNAEnabled] = useState(true);
  
  // Navigation state - current screen
  const [currentScreen, setCurrentScreen] = useState<'visualizer' | 'controls'>('visualizer');
  
  // UI state - removed old control panel variables since we now use dedicated control panel screen
  
  // Track identification state
  const [identificationTracks, setIdentificationTracks] = useState<Track[]>([]);
  const [identificationResult, setIdentificationResult] = useState<any>(null);



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
      {/* Navigation Bar */}
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1002,
        display: 'flex',
        gap: '10px',
        background: 'rgba(0, 0, 0, 0.9)',
        padding: '10px 15px',
        borderRadius: '25px',
        border: '2px solid #333',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}>
        <button
          onClick={() => setCurrentScreen('visualizer')}
          style={{
            padding: '8px 16px',
            backgroundColor: currentScreen === 'visualizer' ? '#2ed573' : 'transparent',
            color: 'white',
            border: currentScreen === 'visualizer' ? '2px solid #2ed573' : '2px solid #555',
            borderRadius: '15px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.3s ease'
          }}
        >
          🎵 Visualizer
        </button>
        <button
          onClick={() => setCurrentScreen('controls')}
          style={{
            padding: '8px 16px',
            backgroundColor: currentScreen === 'controls' ? '#ff6348' : 'transparent',
            color: 'white',
            border: currentScreen === 'controls' ? '2px solid #ff6348' : '2px solid #555',
            borderRadius: '15px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.3s ease'
          }}
        >
          🎛️ Control Panel
        </button>
      </div>

      {/* Render current screen */}
      {currentScreen === 'controls' ? (
        <ControlPanelScreen 
          isControllerConnected={isControllerConnected}
          connectionAttempts={connectionAttempts}
          visualDNAEnabled={visualDNAEnabled}
          appState={appState}
          ddjController={ddjController}
          identificationTracks={identificationTracks}
          identificationResult={identificationResult}
          onVisualDNAToggle={setVisualDNAEnabled}
          onRetryConnection={retryConnection}
          onTracksLoaded={handleTracksLoaded}
          controller={ddjController}
          aiAnalysis={aiAnalysis}
        />
      ) : (
        // Clean visualizer screen - AI-enhanced mode only
        <div style={{ width: '100%', height: '100vh' }}>
          <AIEnhancedVisualizer
            controller={ddjController}
            controllerState={appState.controller}
            visualParams={appState.visualParams}
            identificationTracks={identificationTracks}
            onTrackIdentification={handleTrackIdentification}
            visualDNAEnabled={visualDNAEnabled}
            bpmData={{
              currentBPM,
              isConnected: bpmConnected,
              beatPhase,
              beatInterval
            }}
            aiAnalysis={aiAnalysis}
          />
        </div>
      )}
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
