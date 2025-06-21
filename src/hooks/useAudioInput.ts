import { useState, useEffect, useRef, useCallback } from 'react';
import { AdvancedMetrics } from '../types';

interface AudioInputHook {
  isListening: boolean;
  isConnected: boolean;
  audioLevel: number;
  audioMetrics: AdvancedMetrics | null;
  availableDevices: MediaDeviceInfo[];
  selectedDeviceId: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  selectDevice: (deviceId: string) => Promise<void>;
  refreshDevices: () => Promise<void>;
  error: string | null;
  // Audio gain controls
  inputGain: number;
  setInputGain: (gain: number) => void;
  sensitivity: number;
  setSensitivity: (sensitivity: number) => void;
  // Direct access to current audio level (no React state delay)
  getCurrentAudioLevel: () => number;
}

export const useAudioInput = (): AudioInputHook => {
  const [isListening, setIsListening] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioMetrics, setAudioMetrics] = useState<AdvancedMetrics | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Audio gain controls
  const [inputGain, setInputGain] = useState(2.0); // Reasonable gain for actual signal levels
  const [sensitivity, setSensitivity] = useState(1.5); // Moderate sensitivity for raw audio

  // Custom setInputGain that also updates the active gain node
  const updateInputGain = useCallback((newGain: number) => {
    setInputGain(newGain);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newGain;
      console.log(`🎚️ Updated gain node to ${newGain.toFixed(1)}x (immediate)`);
    }
  }, []);

  // Custom setSensitivity that logs the change
  const updateSensitivity = useCallback((newSensitivity: number) => {
    setSensitivity(newSensitivity);
    console.log(`🔍 Updated sensitivity to ${newSensitivity.toFixed(1)}x`);
  }, []);

  // Audio processing refs
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Analysis buffers
  const freqDataRef = useRef<Uint8Array | null>(null);
  const timeDataRef = useRef<Uint8Array | null>(null);
  
  // Current audio level ref for immediate access (no React state delay)
  const currentAudioLevelRef = useRef<number>(0);
  
  // Enhanced smoothing state
  const smoothingStateRef = useRef({
    audioLevel: 0,
    audioLevelVelocity: 0,
    audioLevelHistory: [] as number[],
    lastUpdateTime: 0,
    targetLevel: 0
  });
  
  // Configuration
  const FFT_SIZE = 2048;
  const SMOOTHING_TIME_CONSTANT = 0.8; // Increased smoothing for stable analysis
  const UPDATE_INTERVAL = 50; // ms - faster updates for smoother visuals

  /**
   * Get available audio input devices
   */
  const getAudioDevices = useCallback(async () => {
    try {
      console.log('🔍 Enumerating audio devices...');
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      console.log(`🎤 Found ${audioInputs.length} audio input devices:`);
      audioInputs.forEach((device, index) => {
        console.log(`  ${index + 1}. ${device.label || `Unnamed Device ${index + 1}`}`);
        console.log(`     ID: ${device.deviceId}`);
        console.log(`     Group: ${device.groupId}`);
      });
      
      setAvailableDevices(audioInputs);
      return audioInputs;
    } catch (err) {
      console.error('❌ Failed to enumerate devices:', err);
      setError('Failed to access audio devices');
      return [];
    }
  }, []);

  /**
   * Initialize Web Audio API
   */
  const initializeAudioContext = useCallback(() => {
    try {
      // Create audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create analyser node
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = FFT_SIZE;
      analyserRef.current.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;
      
      // Create gain node for input amplification
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = inputGain; // Use current inputGain value
      
      // Initialize data arrays
      const bufferLength = analyserRef.current.frequencyBinCount;
      freqDataRef.current = new Uint8Array(bufferLength);
      timeDataRef.current = new Uint8Array(bufferLength);
      
      console.log('🔊 Audio context initialized');
      console.log(`   • Sample rate: ${audioContextRef.current.sampleRate} Hz`);
      console.log(`   • FFT size: ${FFT_SIZE}`);
      console.log(`   • Frequency bins: ${bufferLength}`);
      console.log(`   • Initial gain: ${inputGain.toFixed(1)}x`);
      
      return true;
    } catch (err) {
      console.error('❌ Failed to initialize audio context:', err);
      setError('Failed to initialize audio processing');
      return false;
    }
  }, [inputGain]); // Add inputGain as dependency

  /**
   * Start audio input capture
   */
  const startListening = useCallback(async () => {
    try {
      setError(null);
      console.log('🎤 Starting audio input...');
      
      // Initialize audio context if needed
      if (!audioContextRef.current && !initializeAudioContext()) {
        return;
      }

      // Resume audio context if suspended
      if (audioContextRef.current?.state === 'suspended') {
        console.log('🔊 Resuming audio context...');
        await audioContextRef.current.resume();
      }

      // Simple audio constraints that work reliably  
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId 
          ? { deviceId: { exact: selectedDeviceId } }
          : true
      };
      
      console.log('🎤 Requesting media stream...');
      streamRef.current = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Enhanced stream diagnostics
      const tracks = streamRef.current.getAudioTracks();
      if (tracks.length > 0) {
        const track = tracks[0];
        console.log('🎵 Audio track details:');
        console.log(`   • Label: ${track.label}`);
        console.log(`   • Kind: ${track.kind}`);
        console.log(`   • Enabled: ${track.enabled}`);
        console.log(`   • Ready state: ${track.readyState}`);
        console.log(`   • Muted: ${track.muted}`);
        console.log(`   • Settings:`, track.getSettings());
        console.log(`   • Capabilities:`, track.getCapabilities());
        
        // Test if track is receiving any data
        track.addEventListener('mute', () => {
          console.warn('🔇 Audio track was muted!');
        });
        
        track.addEventListener('unmute', () => {
          console.log('🔊 Audio track unmuted');
        });
        
        track.addEventListener('ended', () => {
          console.warn('🛑 Audio track ended unexpectedly');
        });
      }
      
      // Create audio source
      sourceRef.current = audioContextRef.current!.createMediaStreamSource(streamRef.current);
      
      // Ensure gain node is using current values
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = inputGain;
        console.log(`🎚️ Set gain node to ${inputGain.toFixed(1)}x`);
      }
      
      // Connect source -> gain -> analyser 
      sourceRef.current.connect(gainNodeRef.current!);
      gainNodeRef.current!.connect(analyserRef.current!);
      
      setIsListening(true);
      setIsConnected(true);
      
      // Refresh device list now that we have permissions
      await getAudioDevices();
      
      // Start analysis loop
      startAnalysisLoop();
      
      console.log('✅ Audio input started successfully');
      if (selectedDeviceId) {
        const device = availableDevices.find(d => d.deviceId === selectedDeviceId);
        console.log(`   • Using device: ${device?.label || 'Unknown device'}`);
      } else {
        console.log('   • Using default audio input device');
      }
      
      // Additional diagnostics for BlackHole
      if (tracks[0]?.label.includes('BlackHole')) {
        console.log('🕳️ BlackHole detected! Make sure:');
        console.log('   • Your audio source app is outputting to BlackHole');
        console.log('   • BlackHole is receiving audio signal');
        console.log('   • Check Audio MIDI Setup.app on macOS');
      }
      
    } catch (err) {
      console.error('❌ Failed to start audio input:', err);
      let errorMessage = 'Failed to access audio input.';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Microphone permission denied. Please allow access and try again.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No audio input device found.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Selected audio device does not support required constraints. Try a different device.';
        } else {
          errorMessage = `Audio error: ${err.message}`;
        }
      }
      
      setError(errorMessage);
      setIsListening(false);
      setIsConnected(false);
    }
  }, [selectedDeviceId, availableDevices, initializeAudioContext, getAudioDevices, inputGain]);

  /**
   * Stop audio input capture
   */
  const stopListening = useCallback(() => {
    // Stop analysis loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Disconnect audio nodes
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsListening(false);
    setIsConnected(false);
    setAudioLevel(0);
    setAudioMetrics(null);
    
    console.log('🔇 Audio input stopped');
  }, []);

  /**
   * Select audio input device
   */
  const selectDevice = useCallback(async (deviceId: string) => {
    const wasListening = isListening;
    
    if (wasListening) {
      stopListening();
    }
    
    setSelectedDeviceId(deviceId);
    
    if (wasListening) {
      // Small delay to ensure cleanup is complete
      setTimeout(() => startListening(), 100);
    }
  }, [isListening, stopListening, startListening]);

  /**
   * Main analysis loop
   */
  const startAnalysisLoop = useCallback(() => {
    let frameCount = 0;
    let lastLogTime = performance.now();
    
    const analyze = () => {
      if (!analyserRef.current || !freqDataRef.current || !timeDataRef.current) {
        return;
      }

      // Get frequency and time domain data
      analyserRef.current.getByteFrequencyData(freqDataRef.current);
      analyserRef.current.getByteTimeDomainData(timeDataRef.current);

      // Calculate audio level using multiple methods for better accuracy
      
      // Method 1: Traditional RMS from time domain
      let rms = 0;
      for (let i = 0; i < timeDataRef.current.length; i++) {
        const amplitude = (timeDataRef.current[i] - 128) / 128;
        rms += amplitude * amplitude;
      }
      rms = Math.sqrt(rms / timeDataRef.current.length);
      
      // Method 2: Peak detection from time domain (more responsive)
      let peak = 0;
      for (let i = 0; i < timeDataRef.current.length; i++) {
        const amplitude = Math.abs(timeDataRef.current[i] - 128) / 128;
        if (amplitude > peak) peak = amplitude;
      }
      
      // Method 3: Average energy from frequency domain (good for music)
      let freqEnergy = 0;
      for (let i = 0; i < freqDataRef.current.length; i++) {
        freqEnergy += freqDataRef.current[i] / 255;
      }
      freqEnergy = freqEnergy / freqDataRef.current.length;
      
      // Method 4: Weighted frequency analysis (emphasize important frequencies)
      let weightedEnergy = 0;
      const totalBins = freqDataRef.current.length;
      for (let i = 0; i < totalBins; i++) {
        const freq = (i / totalBins) * (audioContextRef.current!.sampleRate / 2);
        let weight = 1.0;
        
        // Boost important frequency ranges for music
        if (freq >= 60 && freq <= 250) weight = 2.0;    // Bass/kick drums
        if (freq >= 250 && freq <= 2000) weight = 1.5;  // Midrange/vocals
        if (freq >= 2000 && freq <= 8000) weight = 1.2; // Presence
        
        weightedEnergy += (freqDataRef.current[i] / 255) * weight;
      }
      weightedEnergy = weightedEnergy / totalBins;
      
      // Combine methods for final level calculation
      const rmsLevel = rms * 8.0;           // Boost RMS significantly
      const peakLevel = peak * 2.0;         // Peak is already more responsive
      const freqLevel = freqEnergy * 3.0;   // Frequency energy
      const weightedLevel = weightedEnergy * 2.5; // Weighted frequency
      
      // Take the maximum of the methods to ensure we catch any signal
      const combinedLevel = Math.max(rmsLevel, peakLevel, freqLevel, weightedLevel);
      
      // Apply gain and sensitivity to the combined level
      const rawLevel = Math.min(1.0, combinedLevel * inputGain * sensitivity);
      
      // Enhanced smoothing with momentum and history
      const currentTime = performance.now();
      const deltaTime = Math.min(50, currentTime - smoothingStateRef.current.lastUpdateTime) / 1000; // Cap at 50ms
      smoothingStateRef.current.lastUpdateTime = currentTime;
      
      // Add to history (keep last 10 values for trend analysis)
      smoothingStateRef.current.audioLevelHistory.push(rawLevel);
      if (smoothingStateRef.current.audioLevelHistory.length > 10) {
        smoothingStateRef.current.audioLevelHistory.shift();
      }
      
      // Calculate trend for predictive smoothing
      const history = smoothingStateRef.current.audioLevelHistory;
      const trend = history.length > 2 ? 
        (history[history.length - 1] - history[history.length - 3]) / 2 : 0;
      
      // Adaptive smoothing based on change rate
      const changeRate = Math.abs(rawLevel - smoothingStateRef.current.audioLevel);
      const adaptiveSmoothing = Math.max(0.05, Math.min(0.3, 0.15 - changeRate * 0.5));
      
      // Physics-based smoothing with velocity
      const targetDiff = rawLevel - smoothingStateRef.current.audioLevel;
      smoothingStateRef.current.audioLevelVelocity += targetDiff * 8.0 * deltaTime;
      smoothingStateRef.current.audioLevelVelocity *= 0.85; // Damping
      
      // Update with velocity and trend prediction
      const velocityContribution = smoothingStateRef.current.audioLevelVelocity * deltaTime;
      const trendContribution = trend * 0.1;
      smoothingStateRef.current.audioLevel += velocityContribution + trendContribution;
      
      // Additional exponential smoothing for stability
      smoothingStateRef.current.audioLevel = smoothingStateRef.current.audioLevel * (1 - adaptiveSmoothing) + rawLevel * adaptiveSmoothing;
      
      // Clamp final level
      const finalLevel = Math.max(0, Math.min(1, smoothingStateRef.current.audioLevel));
      
      setAudioLevel(finalLevel);
      currentAudioLevelRef.current = finalLevel;

      // Calculate advanced audio metrics
      const metrics = calculateAudioMetrics(freqDataRef.current, timeDataRef.current);
      setAudioMetrics(metrics);

      // Enhanced logging every 3 seconds
      frameCount++;
      const now = performance.now();
      if (now - lastLogTime > 3000) {
        console.log(`🔊 Audio Analysis:`, {
          finalLevel: finalLevel.toFixed(4),
          rmsLevel: (rms * 8.0).toFixed(4), 
          peakLevel: (peak * 2.0).toFixed(4),
          freqLevel: (freqEnergy * 3.0).toFixed(4),
          weightedLevel: (weightedEnergy * 2.5).toFixed(4),
          combinedLevel: combinedLevel.toFixed(4),
          gain: inputGain,
          sensitivity: sensitivity
        });
        lastLogTime = now;
      }

      // Continue loop
      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    console.log('🔄 Starting audio analysis...');
    analyze();
  }, [inputGain, sensitivity]);

  /**
   * Calculate advanced audio metrics from frequency/time data
   */
  const calculateAudioMetrics = (freqData: Uint8Array, timeData: Uint8Array): AdvancedMetrics => {
    const sampleRate = audioContextRef.current?.sampleRate || 44100;
    const freqBinSize = sampleRate / FFT_SIZE;
    
    // Spectral Centroid (brightness)
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 1; i < freqData.length; i++) {
      const magnitude = freqData[i] / 255;
      const frequency = i * freqBinSize;
      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
    }
    
    const spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
    
    // Spectral Bandwidth
    let bandwidthSum = 0;
    for (let i = 1; i < freqData.length; i++) {
      const magnitude = freqData[i] / 255;
      const frequency = i * freqBinSize;
      bandwidthSum += Math.pow(frequency - spectralCentroid, 2) * magnitude;
    }
    const spectralBandwidth = magnitudeSum > 0 ? Math.sqrt(bandwidthSum / magnitudeSum) : 0;
    
    // Spectral Rolloff (85% of energy)
    const targetEnergy = magnitudeSum * 0.85;
    let energySum = 0;
    let rolloffFreq = 0;
    
    for (let i = 1; i < freqData.length; i++) {
      energySum += freqData[i] / 255;
      if (energySum >= targetEnergy) {
        rolloffFreq = i * freqBinSize;
        break;
      }
    }
    
    // Zero Crossing Rate
    let zeroCrossings = 0;
    for (let i = 1; i < timeData.length; i++) {
      if ((timeData[i-1] >= 128) !== (timeData[i] >= 128)) {
        zeroCrossings++;
      }
    }
    const zeroCrossingRate = zeroCrossings / timeData.length;
    
    // Simplified MFCC (basic implementation)
    const mfcc = calculateSimpleMFCC(freqData);
    
    // Basic chroma features (12 pitch classes)
    const chroma = calculateChromaFeatures(freqData);
    
    // Basic tonnetz features
    const tonnetz = calculateTonnetzFeatures(chroma);

    return {
      spectralCentroid,
      spectralBandwidth,
      spectralRolloff: rolloffFreq,
      zeroCrossingRate,
      mfcc,
      chroma,
      tonnetz
    };
  };

  /**
   * Calculate simplified MFCC features
   */
  const calculateSimpleMFCC = (freqData: Uint8Array): number[] => {
    const numCoeffs = 13;
    const mfcc: number[] = [];
    
    // Simple mel-scale approximation
    for (let i = 0; i < numCoeffs; i++) {
      let sum = 0;
      const startBin = Math.floor((i * freqData.length) / numCoeffs);
      const endBin = Math.floor(((i + 1) * freqData.length) / numCoeffs);
      
      for (let j = startBin; j < endBin; j++) {
        sum += freqData[j] / 255;
      }
      
      mfcc.push(Math.log(sum + 1e-10)); // Add small epsilon to avoid log(0)
    }
    
    return mfcc;
  };

  /**
   * Calculate chroma features (pitch class profiles)
   */
  const calculateChromaFeatures = (freqData: Uint8Array): number[] => {
    const chroma = new Array(12).fill(0);
    const sampleRate = audioContextRef.current?.sampleRate || 44100;
    const freqBinSize = sampleRate / FFT_SIZE;
    
    for (let i = 1; i < freqData.length; i++) {
      const frequency = i * freqBinSize;
      if (frequency > 80 && frequency < 8000) { // Focus on musical range
        const pitch = 12 * Math.log2(frequency / 440) + 69; // A4 = 440Hz
        const pitchClass = Math.round(pitch) % 12;
        if (pitchClass >= 0 && pitchClass < 12) {
          chroma[pitchClass] += freqData[i] / 255;
        }
      }
    }
    
    // Normalize
    const sum = chroma.reduce((a, b) => a + b, 0);
    return sum > 0 ? chroma.map(x => x / sum) : chroma;
  };

  /**
   * Calculate tonnetz features (harmonic network)
   */
  const calculateTonnetzFeatures = (chroma: number[]): number[] => {
    const tonnetz = new Array(6).fill(0);
    
    // Perfect fifths
    tonnetz[0] = chroma[0] * Math.cos(7 * 2 * Math.PI / 12) + chroma[7] * Math.cos(0);
    tonnetz[1] = chroma[0] * Math.sin(7 * 2 * Math.PI / 12) + chroma[7] * Math.sin(0);
    
    // Major thirds
    tonnetz[2] = chroma[0] * Math.cos(4 * 2 * Math.PI / 12) + chroma[4] * Math.cos(0);
    tonnetz[3] = chroma[0] * Math.sin(4 * 2 * Math.PI / 12) + chroma[4] * Math.sin(0);
    
    // Minor thirds
    tonnetz[4] = chroma[0] * Math.cos(3 * 2 * Math.PI / 12) + chroma[3] * Math.cos(0);
    tonnetz[5] = chroma[0] * Math.sin(3 * 2 * Math.PI / 12) + chroma[3] * Math.sin(0);
    
    return tonnetz;
  };

  /**
   * Refresh devices manually
   */
  const refreshDevices = useCallback(async () => {
    console.log('🔄 Manually refreshing audio devices...');
    await getAudioDevices();
  }, [getAudioDevices]);

  // Initialize and get devices on mount
  useEffect(() => {
    getAudioDevices();
    
    // Listen for device changes
    const handleDeviceChange = () => getAudioDevices();
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      stopListening();
    };
  }, [getAudioDevices, stopListening]);

  // Update gain node when inputGain changes
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = inputGain;
      console.log(`🎚️ Updated audio gain to ${inputGain.toFixed(1)}x`);
    }
  }, [inputGain]);

  return {
    isListening,
    isConnected,
    audioLevel,
    audioMetrics,
    availableDevices,
    selectedDeviceId,
    startListening,
    stopListening,
    selectDevice,
    refreshDevices,
    error,
    inputGain,
    setInputGain: updateInputGain,
    sensitivity,
    setSensitivity: updateSensitivity,
    // Direct access to current audio level (no React state delay)
    getCurrentAudioLevel: () => currentAudioLevelRef.current
  };
};

export default useAudioInput; 