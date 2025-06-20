import { useState, useEffect, useRef } from 'react';

const useMIDIBPM = () => {
  // Hook state
  const [currentBPM, setCurrentBPM] = useState(120);
  const [isConnected, setIsConnected] = useState(false);
  const [beatPhase, setBeatPhase] = useState(0);

  // Refs for timing calculations
  const midiAccessRef = useRef(null);
  const clockCounterRef = useRef(0);
  const lastBeatTimeRef = useRef(0);
  const beatIntervalsRef = useRef([]);
  const animationFrameRef = useRef(null);
  const smoothedBPMRef = useRef(120);
  const lastClockTimeRef = useRef(0);

  // Constants
  const CLOCKS_PER_BEAT = 24; // MIDI standard: 24 clock pulses per quarter note
  const BPM_SMOOTHING_FACTOR = 0.1;
  const MAX_BEAT_INTERVALS = 4; // Use last 4 beats for BPM calculation
  const MIDI_CLOCK_STATUS = 0xF8;

  /**
   * Initialize Web MIDI API and connect to DDJ-FLX4
   */
  const initializeMIDI = async () => {
    try {
      console.log('🎛️ Initializing MIDI BPM Detection...');
      
      // Request MIDI access
      const midiAccess = await navigator.requestMIDIAccess();
      midiAccessRef.current = midiAccess;
      
      console.log('✅ MIDI access granted');
      
      // Find DDJ-FLX4 device
      const flx4Input = findFLX4Device(midiAccess);
      
      if (flx4Input) {
        console.log(`🎛️ Found DDJ-FLX4: ${flx4Input.name}`);
        setupMIDIListeners(flx4Input);
        setIsConnected(true);
        
        // Start beat phase animation
        startBeatPhaseAnimation();
      } else {
        console.warn('⚠️ DDJ-FLX4 not found');
        listAvailableDevices(midiAccess);
        setIsConnected(false);
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize MIDI:', error);
      setIsConnected(false);
    }
  };

  /**
   * Find DDJ-FLX4 device from available MIDI inputs
   */
  const findFLX4Device = (midiAccess) => {
    const inputs = Array.from(midiAccess.inputs.values());
    
    return inputs.find(input => 
      input.name.toLowerCase().includes('ddj-flx4') ||
      input.name.toLowerCase().includes('flx4') ||
      (input.name.toLowerCase().includes('ddj') && input.name.toLowerCase().includes('pioneer'))
    );
  };

  /**
   * List available MIDI devices for debugging
   */
  const listAvailableDevices = (midiAccess) => {
    console.log('📋 Available MIDI devices:');
    const inputs = Array.from(midiAccess.inputs.values());
    inputs.forEach((input, index) => {
      console.log(`  ${index + 1}. ${input.name} (${input.manufacturer})`);
    });
  };

  /**
   * Setup MIDI message listeners for clock signals
   */
  const setupMIDIListeners = (input) => {
    let messageCount = 0;
    let lastLogTime = 0;
    
    input.onmidimessage = (message) => {
      const [status, data1, data2] = message.data;
      const timestamp = performance.now();
      messageCount++;
      
      // Log MIDI messages but throttle to avoid spam
      if (timestamp - lastLogTime > 1000) { // Log every second
        console.log(`🔧 MIDI Activity: ${messageCount} messages received`);
        lastLogTime = timestamp;
        messageCount = 0;
      }
      
      // Always log important messages
      if (status === MIDI_CLOCK_STATUS) {
        console.log(`⏰ MIDI Clock received! Status: 0x${status.toString(16)}`);
        handleMIDIClock(timestamp);
      } else if (status >= 0x90 && status <= 0x9F && data2 > 0) { // Note On with velocity
        console.log(`🎹 Note On: Status 0x${status.toString(16)}, Note ${data1}, Velocity ${data2}`);
      } else if (status >= 0xB0 && status <= 0xBF) { // Control Change
        console.log(`🎛️ Control Change: Status 0x${status.toString(16)}, Controller ${data1}, Value ${data2}`);
      }
      
      // Fallback: Monitor other potential timing signals
      handleFallbackTiming(status, data1, data2, timestamp);
    };
    
    console.log('🎵 MIDI BPM listeners setup complete');
    console.log('🎵 BPM Manual Tap Detection:');
    console.log('   • Standard BPM tap notes: 150, 99, 127');
    console.log('   • Channel 1 cue button: Status 0x90, Note 12');
    console.log('   • Channel 2 cue button: Status 0x91, Note 12');
    console.log('   • Total of 5 buttons available for BPM control');
    console.log('   • Tap any of these buttons in rhythm with your music');
    console.log('   • Other notes will be logged but won\'t affect BPM');
    console.log('   • MIDI clock detection still active if available');
  };

  /**
   * Handle MIDI clock signals for BPM calculation
   */
  const handleMIDIClock = (timestamp) => {
    clockCounterRef.current++;
    lastClockTimeRef.current = timestamp;
    
    // Every 24 clocks = 1 beat (quarter note)
    if (clockCounterRef.current >= CLOCKS_PER_BEAT) {
      const beatTime = timestamp;
      
      if (lastBeatTimeRef.current > 0) {
        const beatInterval = beatTime - lastBeatTimeRef.current;
        
        // Calculate BPM: 60000ms / beatInterval = BPM
        const instantBPM = 60000 / beatInterval;
        
        // Only process reasonable BPM values (60-200 BPM)
        if (instantBPM >= 60 && instantBPM <= 200) {
          updateBPMCalculation(instantBPM);
          console.log(`🎵 Beat detected! Instant BPM: ${instantBPM.toFixed(1)}`);
        }
      }
      
      lastBeatTimeRef.current = beatTime;
      clockCounterRef.current = 0; // Reset counter
    }
  };

  /**
   * Enhanced fallback timing detection for manual BPM tapping
   */
  const handleFallbackTiming = (status, data1, data2, timestamp) => {
    // Manual BPM tap detection - only respond to specific MIDI notes that don't interfere with track control
    if (status >= 0x90 && status <= 0x9F && data2 > 0) { // Note On with velocity
      // Custom BPM tap notes [150, 99, 127] - these shouldn't interfere with track playback
      const bpmTapNotes = [150, 99, 127];
      
      // Check for standard BPM tap notes
      if (bpmTapNotes.includes(data1)) {
        console.log(`🎵 Manual BPM tap detected: Note ${data1}, Velocity ${data2}`);
        attemptBeatSync(timestamp, `manual_tap_${data1}`);
        return;
      }
      
      // Check for Channel 1 and Channel 2 cue button BPM taps
      // Channel 1 cue button: Status 0x90, Note 12
      // Channel 2 cue button: Status 0x91, Note 12
      if ((status === 0x90 || status === 0x91) && data1 === 12) {
        const channelName = status === 0x90 ? 'Channel 1' : 'Channel 2';
        console.log(`🎵 Cue Button BPM tap detected: ${channelName} (Status 0x${status.toString(16)}, Note ${data1}), Velocity ${data2}`);
        attemptBeatSync(timestamp, `cue_button_${channelName.toLowerCase().replace(' ', '_')}`);
        return;
      }
    }
    
    // Log other notes for debugging but don't use for BPM detection
    if (status >= 0x90 && status <= 0x9F && data2 > 0) { // Note On
      console.log(`🎹 Other note (not BPM tap): Status 0x${status.toString(16)}, Note ${data1} - add to BPM detection if needed`);
    }
  };

  // Add refs for manual tap sequence tracking
  const tapSequenceRef = useRef([]);
  const lastTapTimeRef = useRef(0);
  const SEQUENCE_RESET_TIMEOUT = 3000; // Reset sequence after 3 seconds of no taps

  /**
   * Attempt to detect beat timing from user interactions
   */
  const attemptBeatSync = (timestamp, source) => {
    const timeSinceLastTap = lastTapTimeRef.current > 0 ? timestamp - lastTapTimeRef.current : 0;
    
    // Reset tap sequence if too much time has passed (starting new tempo)
    if (timeSinceLastTap > SEQUENCE_RESET_TIMEOUT) {
      console.log(`🔄 Resetting BPM tap sequence - starting fresh tempo detection`);
      tapSequenceRef.current = [];
      beatIntervalsRef.current = []; // Clear old BPM data
      // CRITICAL: Reset smoothed BPM baseline to avoid bad starting point
      smoothedBPMRef.current = 120; // Reset to neutral baseline
      console.log(`🔄 Reset smoothed BPM baseline to 120`);
    }
    
    // Add this tap to the sequence
    tapSequenceRef.current.push(timestamp);
    lastTapTimeRef.current = timestamp;
    
    // Keep only the last 8 taps (generous buffer)
    if (tapSequenceRef.current.length > 8) {
      tapSequenceRef.current.shift();
    }
    
    console.log(`🎵 Tap ${tapSequenceRef.current.length} from ${source} at ${timestamp.toFixed(0)}ms`);
    
    // Need at least 2 taps to calculate BPM
    if (tapSequenceRef.current.length >= 2) {
      // Calculate BPM from the most recent tap interval
      const recentTaps = tapSequenceRef.current.slice(-2); // Last 2 taps
      const interval = recentTaps[1] - recentTaps[0];
      
      console.log(`⏱️ Interval between last 2 taps: ${interval.toFixed(0)}ms`);
      
      if (interval > 300 && interval < 2000) { // Reasonable beat interval
        const instantBPM = 60000 / interval;
        console.log(`🎵 Instant BPM calculation: 60000 / ${interval.toFixed(0)} = ${instantBPM.toFixed(1)} BPM`);
        
        if (instantBPM >= 60 && instantBPM <= 200) {
          updateBPMCalculation(instantBPM);
          lastBeatTimeRef.current = timestamp;
        } else {
          console.log(`❌ BPM ${instantBPM.toFixed(1)} outside valid range (60-200)`);
        }
      } else {
        console.log(`❌ Interval ${interval.toFixed(0)}ms outside valid range (300-2000ms)`);
      }
    }
    
    // After 4+ taps, calculate average BPM from individual intervals (more accurate)
    if (tapSequenceRef.current.length >= 4) {
      const recentTaps = tapSequenceRef.current.slice(-4); // Last 4 taps
      
      // Calculate individual intervals between consecutive taps
      const allIntervals = [];
      for (let i = 1; i < recentTaps.length; i++) {
        allIntervals.push(recentTaps[i] - recentTaps[i-1]);
      }
      
      console.log(`📊 Raw intervals: [${allIntervals.map(i => i.toFixed(0)).join('ms, ')}ms]`);
      
      // Filter out invalid intervals (too small = duplicate taps, too large = missed beats)
      const validIntervals = allIntervals.filter(interval => interval >= 100 && interval <= 2000);
      
      console.log(`📊 Valid intervals after filtering: [${validIntervals.map(i => i.toFixed(0)).join('ms, ')}ms]`);
      
      if (validIntervals.length >= 2) { // Need at least 2 valid intervals
        // Average the valid intervals
        const averageInterval = validIntervals.reduce((sum, interval) => sum + interval, 0) / validIntervals.length;
        
        console.log(`📊 Average interval from ${validIntervals.length} valid intervals: ${averageInterval.toFixed(0)}ms`);
        
        if (averageInterval > 300 && averageInterval < 2000) {
          const averageBPM = 60000 / averageInterval;
          console.log(`🎯 4-tap BPM from filtered intervals: 60000 / ${averageInterval.toFixed(0)} = ${averageBPM.toFixed(1)} BPM`);
          
          if (averageBPM >= 60 && averageBPM <= 200) {
            // Force update to the new average BPM (bypass smoothing completely)
            smoothedBPMRef.current = averageBPM;
            setCurrentBPM(Math.round(averageBPM * 10) / 10);
            console.log(`✅ NEW TEMPO LOCKED (filtered & bypassed smoothing): ${averageBPM.toFixed(1)} BPM`);
            
            // Also clear beat intervals to prevent interference
            beatIntervalsRef.current = [averageBPM];
          } else {
            console.log(`❌ 4-tap average BPM ${averageBPM.toFixed(1)} outside valid range`);
          }
        } else {
          console.log(`❌ 4-tap average interval ${averageInterval.toFixed(0)}ms outside valid range`);
        }
      } else {
        console.log(`❌ Not enough valid intervals (${validIntervals.length}/4) for 4-tap calculation`);
      }
    }
  };

  /**
   * Update BPM calculation with smoothing (for incremental updates)
   */
  const updateBPMCalculation = (newBPM) => {
    console.log(`📈 Updating BPM with new value: ${newBPM.toFixed(1)}`);
    
    // Add to intervals array
    beatIntervalsRef.current.push(newBPM);
    
    // Keep only last few intervals
    if (beatIntervalsRef.current.length > MAX_BEAT_INTERVALS) {
      beatIntervalsRef.current.shift();
    }
    
    // Calculate average BPM from recent intervals
    const averageBPM = beatIntervalsRef.current.reduce((sum, bpm) => sum + bpm, 0) / beatIntervalsRef.current.length;
    
    console.log(`📊 Beat intervals: [${beatIntervalsRef.current.map(b => b.toFixed(1)).join(', ')}]`);
    console.log(`📊 Average from intervals: ${averageBPM.toFixed(1)}`);
    
    // Smooth BPM transitions to avoid jumps
    const previousSmoothed = smoothedBPMRef.current;
    smoothedBPMRef.current = smoothedBPMRef.current + (averageBPM - smoothedBPMRef.current) * BPM_SMOOTHING_FACTOR;
    
    console.log(`📊 Smoothing: ${previousSmoothed.toFixed(1)} → ${smoothedBPMRef.current.toFixed(1)} (factor: ${BPM_SMOOTHING_FACTOR})`);
    
    // Update state with rounded BPM
    const finalBPM = Math.round(smoothedBPMRef.current * 10) / 10;
    setCurrentBPM(finalBPM);
    
    console.log(`✅ Final BPM displayed: ${finalBPM}`);
  };

  /**
   * Start beat phase animation for visual sync
   */
  const startBeatPhaseAnimation = () => {
    const updateBeatPhase = () => {
      if (lastBeatTimeRef.current > 0 && smoothedBPMRef.current > 0) {
        const now = performance.now();
        const timeSinceLastBeat = now - lastBeatTimeRef.current;
        const beatDuration = 60000 / smoothedBPMRef.current; // ms per beat
        
        // Calculate phase (0-1 within current beat)
        const phase = (timeSinceLastBeat % beatDuration) / beatDuration;
        setBeatPhase(phase);
      }
      
      animationFrameRef.current = requestAnimationFrame(updateBeatPhase);
    };
    
    updateBeatPhase();
  };

  /**
   * Cleanup function
   */
  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (midiAccessRef.current) {
      const inputs = Array.from(midiAccessRef.current.inputs.values());
      inputs.forEach(input => {
        if (input.onmidimessage) {
          input.onmidimessage = null;
        }
      });
    }
    
    console.log('🔌 MIDI BPM cleanup complete');
  };

  // Initialize on mount
  useEffect(() => {
    // Check if Web MIDI is supported
    if (!navigator.requestMIDIAccess) {
      console.error('❌ Web MIDI API not supported in this browser');
      return;
    }
    
    initializeMIDI();
    
    // Cleanup on unmount
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle MIDI access changes (device connect/disconnect)
  useEffect(() => {
    if (midiAccessRef.current) {
      const handleStateChange = (event) => {
        console.log(`🔌 MIDI State Change: ${event.port.name} ${event.port.state}`);
        
        if (event.port.state === 'connected') {
          // Try to reconnect if it's a DDJ-FLX4
          if (event.port.name.toLowerCase().includes('ddj-flx4') || 
              event.port.name.toLowerCase().includes('flx4')) {
            console.log('🎛️ DDJ-FLX4 reconnected');
            setupMIDIListeners(event.port);
            setIsConnected(true);
          }
        } else if (event.port.state === 'disconnected') {
          console.log('🔌 Device disconnected');
          setIsConnected(false);
        }
      };
      
      midiAccessRef.current.onstatechange = handleStateChange;
      
      return () => {
        if (midiAccessRef.current) {
          midiAccessRef.current.onstatechange = null;
        }
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    currentBPM,
    isConnected,
    beatPhase,
    // Additional useful data for Three.js components
    beatInterval: smoothedBPMRef.current > 0 ? 60000 / smoothedBPMRef.current : 500,
    clocksReceived: clockCounterRef.current,
    lastBeatTime: lastBeatTimeRef.current,
  };
};

export default useMIDIBPM; 