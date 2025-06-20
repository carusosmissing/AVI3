import { WebMidi, Input } from 'webmidi';
import { DDJControllerState, ChannelState, MIDIEvent, Track } from '../types';

export class DDJFlx4Controller {
  private input: Input | null = null;
  private state: DDJControllerState;
  private callbacks: Map<string, Function[]> = new Map();
  private isConnected = false;
  
  // Add tracking for last values to detect erratic behavior
  private lastValues: Map<string, number> = new Map();

  // DDJ-FLX4 MIDI mappings
  private readonly MIDI_MAPPINGS = {
    // Crossfader (usually on channel 1)
    CROSSFADER: { channel: 1, controller: 8 },
    
    // Channel A (MIDI Channel 1 - Status Byte 176) 
    CHANNEL_A_VOLUME: { channel: 1, controller: 51 },
    CHANNEL_A_EQ_HIGH: { channel: 1, controller: 39 },
    CHANNEL_A_EQ_MID: { channel: 1, controller: 43 },
    CHANNEL_A_EQ_LOW: { channel: 1, controller: 47 },
    CHANNEL_A_CUE: { channel: 1, note: 54 },
    CHANNEL_A_PLAY: { channel: 1, note: 11 },
    
    // Channel B (MIDI Channel 2 - Status Byte 177)  
    CHANNEL_B_VOLUME: { channel: 2, controller: 51 },
    CHANNEL_B_EQ_HIGH: { channel: 2, controller: 39 },
    CHANNEL_B_EQ_MID: { channel: 2, controller: 43 },
    CHANNEL_B_EQ_LOW: { channel: 2, controller: 47 },
    CHANNEL_B_CUE: { channel: 2, note: 54 },
    CHANNEL_B_PLAY: { channel: 2, note: 11 },
    
    // Performance Pads (8 per deck)
    PADS_A: [
      { channel: 1, note: 27 }, { channel: 1, note: 28 }, 
      { channel: 1, note: 29 }, { channel: 1, note: 30 },
      { channel: 1, note: 31 }, { channel: 1, note: 32 },
      { channel: 1, note: 33 }, { channel: 1, note: 34 }
    ],
    PADS_B: [
      { channel: 1, note: 35 }, { channel: 1, note: 36 },
      { channel: 1, note: 37 }, { channel: 1, note: 38 },
      { channel: 1, note: 39 }, { channel: 1, note: 40 },
      { channel: 1, note: 41 }, { channel: 1, note: 42 }
    ],
    
    // Jog Wheels
    JOG_A_WHEEL: { channel: 1, controller: 35 },
    JOG_A_TOUCH: { channel: 1, note: 54 },
    JOG_B_WHEEL: { channel: 1, controller: 36 },
    JOG_B_TOUCH: { channel: 1, note: 55 }
  };

  constructor() {
    this.state = this.getInitialState();
    this.initializeWebMIDI();
  }

  /**
   * Initialize Web MIDI and connect to DDJ-FLX4
   */
  private async initializeWebMIDI(): Promise<void> {
    try {
      console.log('🎛️ Initializing Web MIDI...');
      
      await WebMidi.enable();
      
      console.log('✅ Web MIDI enabled');
      console.log('Available inputs:', WebMidi.inputs.map(input => input.name));
      
      // Look for DDJ-FLX4 - be more specific about the search
      const djInput = WebMidi.inputs.find(input => 
        input.name.toLowerCase().includes('ddj-flx4') ||
        input.name.toLowerCase().includes('flx4') ||
        (input.name.toLowerCase().includes('ddj') && input.name.toLowerCase().includes('pioneer'))
      );
      
      if (djInput) {
        console.log(`🎛️ Found controller: ${djInput.name}`);
        this.connectToController(djInput);
      } else {
        console.warn('⚠️ DDJ-FLX4 not found. Available devices:');
        this.listAvailableInputs();
        // Set disconnected state
        this.isConnected = false;
        this.state.isConnected = false;
        this.emit('disconnected');
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize Web MIDI:', error);
      this.isConnected = false;
      this.state.isConnected = false;
      this.emit('disconnected');
    }
  }

  /**
   * Connect to the DDJ-FLX4 controller
   */
  private connectToController(input: Input): void {
    this.input = input;
    this.isConnected = true;
    this.state.isConnected = true;
    
    console.log(`🎛️ Connected to ${input.name}`);
    
    // Set up MIDI event listeners
    this.setupEventListeners();
    
    // Emit connection event
    this.emit('connected', { controller: input.name });
  }

  /**
   * Set up MIDI event listeners for all controller inputs
   */
  private setupEventListeners(): void {
    if (!this.input) return;

    // Control Change events (faders, knobs, crossfader)
    this.input.addListener('controlchange', (e: any) => {
      this.handleControlChange(e);
    });

    // Note On events (button presses, pad hits)
    this.input.addListener('noteon', (e: any) => {
      this.handleNoteOn(e);
    });

    // Note Off events (button releases, pad releases)
    this.input.addListener('noteoff', (e: any) => {
      this.handleNoteOff(e);
    });

    console.log('🎵 MIDI event listeners setup complete');
    console.log('🔧 EQ remapping enabled: 0=center will be mapped to 64=center');
  }

  /**
   * Handle control change events (faders, knobs, crossfader)
   */
  private handleControlChange(event: any): void {
    // Extract channel from WebMIDI event or raw MIDI data
    let channel = event.channel; // WebMIDI provides 1-based channel number
    
    // If channel is undefined, try to extract from raw MIDI data
    if (channel === undefined && event.data && event.data.length > 0) {
      // MIDI status byte format: 1011cccc where cccc is channel (0-15)
      // 176 = 10110000 = Control Change Channel 1 (0-based), so 1 (1-based)
      // 177 = 10110001 = Control Change Channel 2 (0-based), so 2 (1-based)
      const statusByte = event.data[0];
      if (statusByte >= 176 && statusByte <= 191) { // Control Change range
        channel = (statusByte - 176) + 1; // Convert to 1-based channel
        console.log(`🔧 Extracted channel ${channel} from status byte ${statusByte}`);
      }
    }
    
    const controllerNumber = event.controller?.number || event.controller;
    const value = event.value;
    
    // Special handling for EQ knobs - log raw data to understand the pattern
    const isEQ = [39, 43, 47].includes(controllerNumber);
    if (isEQ) {
      console.log(`🎛️ EQ Raw Data - Ch: ${channel}, Ctrl: ${controllerNumber}`);
      console.log(`   event.value: ${value}`);
      console.log(`   event.data: ${event.data ? Array.from(event.data).join(', ') : 'N/A'}`);
      if (event.rawValue !== undefined) {
        console.log(`   event.rawValue: ${event.rawValue}`);
      }
    }
    
    // Check if value is already 0-127 or needs conversion from 0-1
    let midiValue: number;
    if (value <= 1) {
      // Value is normalized (0-1), convert to 0-127
      midiValue = Math.round(value * 127);
    } else {
      // Value is already in MIDI range
      midiValue = Math.round(value);
    }

    // Create a unique key for tracking this controller
    const controlKey = `ch${channel}_ctrl${controllerNumber}`;
    
    // Validate MIDI value range
    if (midiValue < 0 || midiValue > 127) {
      console.error(`❌ Invalid MIDI value: ${midiValue} (raw: ${value}) for ${controlKey}`);
      return;
    }
    
    // Store the current value before remapping
    this.lastValues.set(controlKey, midiValue);

    // Debug logging with both raw and converted values for EQ
    if (isEQ) {
      console.log(`🔧 EQ Control - Ch: ${channel}, Ctrl: ${controllerNumber}, Raw: ${value}, MIDI: ${midiValue}`);
      console.log(`   Position: ${midiValue === 0 ? 'CENTER?' : midiValue < 64 ? 'LEFT' : 'RIGHT'}`);
    }
    
    // Update state based on controller mapping
    if (this.isController(channel, controllerNumber, this.MIDI_MAPPINGS.CROSSFADER)) {
      console.log('✅ Crossfader matched!');
      this.state.crossfader = midiValue;
      this.emit('crossfader', { value: midiValue, normalized: value });
    }
    
    // Channel A controls (MIDI Channel 1)
    else if (this.isController(channel, controllerNumber, this.MIDI_MAPPINGS.CHANNEL_A_VOLUME)) {
      console.log('✅ Channel A Volume matched!');
      this.state.channelA.volume = midiValue;
      this.emit('channelA:volume', { value: midiValue, normalized: value });
    }

    // Channel A EQ controls (MIDI Channel 1)
    else if (this.isController(channel, controllerNumber, this.MIDI_MAPPINGS.CHANNEL_A_EQ_HIGH)) {
      console.log('✅ Channel A EQ High matched!');
      const remappedValue = this.remapEQValue(midiValue, controllerNumber);
      this.state.channelA.eq.high = remappedValue;
      this.emit('channelA:eq:high', { value: remappedValue, normalized: remappedValue / 127 });
    }
    else if (this.isController(channel, controllerNumber, this.MIDI_MAPPINGS.CHANNEL_A_EQ_MID)) {
      console.log('✅ Channel A EQ Mid matched!');
      const remappedValue = this.remapEQValue(midiValue, controllerNumber);
      this.state.channelA.eq.mid = remappedValue;
      this.emit('channelA:eq:mid', { value: remappedValue, normalized: remappedValue / 127 });
    }
    else if (this.isController(channel, controllerNumber, this.MIDI_MAPPINGS.CHANNEL_A_EQ_LOW)) {
      console.log('✅ Channel A EQ Low matched!');
      const remappedValue = this.remapEQValue(midiValue, controllerNumber);
      this.state.channelA.eq.low = remappedValue;
      this.emit('channelA:eq:low', { value: remappedValue, normalized: remappedValue / 127 });
    }

    // Channel B controls (MIDI Channel 2)
    else if (this.isController(channel, controllerNumber, this.MIDI_MAPPINGS.CHANNEL_B_VOLUME)) {
      console.log('✅ Channel B Volume matched!');
      console.log(`🔧 Emitting channelB:volume event with value ${midiValue}`);
      this.state.channelB.volume = midiValue;
      this.emit('channelB:volume', { value: midiValue, normalized: value });
    }
    else if (this.isController(channel, controllerNumber, this.MIDI_MAPPINGS.CHANNEL_B_EQ_HIGH)) {
      console.log('✅ Channel B EQ High matched!');
      const remappedValue = this.remapEQValue(midiValue, controllerNumber);
      this.state.channelB.eq.high = remappedValue;
      this.emit('channelB:eq:high', { value: remappedValue, normalized: remappedValue / 127 });
    }
    else if (this.isController(channel, controllerNumber, this.MIDI_MAPPINGS.CHANNEL_B_EQ_MID)) {
      console.log('✅ Channel B EQ Mid matched!');
      const remappedValue = this.remapEQValue(midiValue, controllerNumber);
      this.state.channelB.eq.mid = remappedValue;
      this.emit('channelB:eq:mid', { value: remappedValue, normalized: remappedValue / 127 });
    }
    else if (this.isController(channel, controllerNumber, this.MIDI_MAPPINGS.CHANNEL_B_EQ_LOW)) {
      console.log('✅ Channel B EQ Low matched!');
      const remappedValue = this.remapEQValue(midiValue, controllerNumber);
      this.state.channelB.eq.low = remappedValue;
      this.emit('channelB:eq:low', { value: remappedValue, normalized: remappedValue / 127 });
    }
    
    // Jog wheels
    else if (this.isController(channel, controllerNumber, this.MIDI_MAPPINGS.JOG_A_WHEEL)) {
      this.handleJogWheel('A', midiValue);
    }
    else if (this.isController(channel, controllerNumber, this.MIDI_MAPPINGS.JOG_B_WHEEL)) {
      this.handleJogWheel('B', midiValue);
    }
    else {
      // Log unmatched controllers to help identify correct mappings
      console.log(`⚠️ Unmatched controller: Channel ${channel}, Controller ${controllerNumber}, Value ${midiValue}`);
      console.log(`   This might be an EQ knob with different mapping!`);
    }

    // Emit generic MIDI event
    this.emit('midi', {
      type: 'controlchange',
      channel,
      controller: controllerNumber,
      value: midiValue,
      timestamp: Date.now()
    } as MIDIEvent);
  }

  /**
   * Handle note on events (button/pad presses)
   */
  private handleNoteOn(event: any): void {
    const { channel, note, velocity } = event;
    const midiVelocity = Math.round(velocity * 127);

    // Performance pads
    this.handlePerformancePads(channel, note.number, midiVelocity, true);
    
    // Transport buttons
    this.handleTransportButtons(channel, note.number, true);

    // Emit generic MIDI event
    this.emit('midi', {
      type: 'noteon',
      channel,
      note: note.number,
      value: midiVelocity,
      timestamp: Date.now()
    } as MIDIEvent);
  }

  /**
   * Handle note off events (button/pad releases)
   */
  private handleNoteOff(event: any): void {
    const { channel, note } = event;

    // Performance pads
    this.handlePerformancePads(channel, note.number, 0, false);
    
    // Transport buttons
    this.handleTransportButtons(channel, note.number, false);

    // Emit generic MIDI event
    this.emit('midi', {
      type: 'noteoff',
      channel,
      note: note.number,
      value: 0,
      timestamp: Date.now()
    } as MIDIEvent);
  }

  /**
   * Handle performance pad events
   */
  private handlePerformancePads(channel: number, note: number, velocity: number, isPressed: boolean): void {
    // Check Channel A pads
    const padAIndex = this.MIDI_MAPPINGS.PADS_A.findIndex(pad => 
      pad.channel === channel && pad.note === note
    );
    
    if (padAIndex !== -1) {
      this.state.performancePads.pads[padAIndex] = {
        id: padAIndex,
        isPressed,
        velocity,
        mode: 'hotcue' // Default mode
      };
      this.emit('pad', { 
        deck: 'A', 
        padIndex: padAIndex, 
        isPressed, 
        velocity,
        id: padAIndex
      });
      return;
    }

    // Check Channel B pads
    const padBIndex = this.MIDI_MAPPINGS.PADS_B.findIndex(pad => 
      pad.channel === channel && pad.note === note
    );
    
    if (padBIndex !== -1) {
      const globalPadIndex = padBIndex + 8; // B pads start at index 8
      this.state.performancePads.pads[globalPadIndex] = {
        id: globalPadIndex,
        isPressed,
        velocity,
        mode: 'hotcue'
      };
      this.emit('pad', { 
        deck: 'B', 
        padIndex: padBIndex, 
        isPressed, 
        velocity,
        id: globalPadIndex
      });
    }
  }

  /**
   * Handle transport button events (play, cue)
   */
  private handleTransportButtons(channel: number, note: number, isPressed: boolean): void {
    if (this.isNote(channel, note, this.MIDI_MAPPINGS.CHANNEL_A_PLAY)) {
      this.state.channelA.play = isPressed;
      this.emit('channelA:play', { isPressed });
    }
    else if (this.isNote(channel, note, this.MIDI_MAPPINGS.CHANNEL_A_CUE)) {
      this.state.channelA.cue = isPressed;
      this.emit('channelA:cue', { isPressed });
    }
    else if (this.isNote(channel, note, this.MIDI_MAPPINGS.CHANNEL_B_PLAY)) {
      this.state.channelB.play = isPressed;
      this.emit('channelB:play', { isPressed });
    }
    else if (this.isNote(channel, note, this.MIDI_MAPPINGS.CHANNEL_B_CUE)) {
      this.state.channelB.cue = isPressed;
      this.emit('channelB:cue', { isPressed });
    }
  }

  /**
   * Handle jog wheel movements
   */
  private handleJogWheel(deck: 'A' | 'B', value: number): void {
    const channel = deck === 'A' ? this.state.channelA : this.state.channelB;
    
    // Calculate velocity based on value change
    const previousPosition = channel.jogWheel.position;
    const velocity = value - previousPosition;
    
    channel.jogWheel.position = value;
    channel.jogWheel.velocity = velocity;
    
    this.emit(`channel${deck}:jog`, {
      position: value,
      velocity,
      isTouched: channel.jogWheel.isTouched
    });
  }

  /**
   * Get initial controller state
   */
  private getInitialState(): DDJControllerState {
    return {
      crossfader: 64, // Center position
      channelA: this.getInitialChannelState(),
      channelB: this.getInitialChannelState(),
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
   * Get initial channel state
   */
  private getInitialChannelState(): ChannelState {
    return {
      volume: 127,
      eq: { high: 64, mid: 64, low: 64 },
      cue: false,
      play: false,
      jogWheel: { position: 0, isTouched: false, velocity: 0 },
      bpm: 120, // Default BPM
      currentTrackId: undefined
    };
  }

  /**
   * Helper to check if controller matches mapping
   */
  private isController(channel: number, controller: number, mapping: any): boolean {
    return mapping.channel === channel && mapping.controller === controller;
  }

  /**
   * Helper to check if note matches mapping
   */
  private isNote(channel: number, note: number, mapping: any): boolean {
    return mapping.channel === channel && mapping.note === note;
  }

  /**
   * Remap EQ values from controller format to standard MIDI format
   * DDJ-FLX4 sends EQ with 0 as center, but we need 64 as center
   */
  private remapEQValue(rawValue: number, controllerNumber: number): number {
    // Only remap for EQ controllers (39, 43, 47)
    if (![39, 43, 47].includes(controllerNumber)) {
      return rawValue;
    }

    // If the DDJ-FLX4 sends 0 at center position, we need to understand the full range
    // Common patterns:
    // 1. 0 = center, 1-127 = boost (clockwise), and cut values might come as:
    //    - Different controller numbers
    //    - Values 128-255 (which get wrapped)
    //    - Negative values
    
    // For now, let's assume a simple linear remapping where:
    // Controller sends: 0 (full cut) -> 63/64 (center) -> 127 (full boost)
    // We want: 0 (full cut) -> 64 (center) -> 127 (full boost)
    
    // If value is around 63-64, it's likely center
    if (rawValue >= 63 && rawValue <= 65) {
      console.log(`   📍 Detected CENTER position (raw: ${rawValue})`);
      return 64; // Force to exact center
    }
    
    // For other values, check if we need to remap
    // If 0 is being sent as center, we need different logic
    if (rawValue === 0) {
      console.log(`   📍 Detected 0 - treating as CENTER`);
      return 64; // 0 means center on this controller
    }
    
    // Values 1-63 might represent boost (right turn from center)
    // Map them to 65-127
    if (rawValue > 0 && rawValue < 64) {
      const remapped = Math.round(64 + (rawValue / 63) * 63);
      console.log(`   📍 Remapping boost: ${rawValue} -> ${remapped}`);
      return remapped;
    }
    
    // Values above 64 might represent cut (left turn from center)
    // This needs investigation - they might come as high values
    if (rawValue > 64) {
      // Could be 65-127 representing cuts
      // Map to 0-63
      const normalized = (rawValue - 64) / 63; // 0 to 1
      const remapped = Math.round(63 - (normalized * 63)); // 63 to 0
      console.log(`   📍 Remapping cut: ${rawValue} -> ${remapped}`);
      return remapped;
    }
    
    return rawValue;
  }

  /**
   * List available MIDI inputs for debugging
   */
  private listAvailableInputs(): void {
    console.log('📋 Available MIDI inputs:');
    WebMidi.inputs.forEach((input, index) => {
      console.log(`  ${index + 1}. ${input.name} (${input.manufacturer})`);
    });
  }

  /**
   * Event emitter functionality
   */
  on(event: string, callback: Function): void {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event)!.push(callback);
  }

  private emit(event: string, data?: any): void {
    const callbacks = this.callbacks.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }

  /**
   * Get current controller state
   */
  getState(): DDJControllerState {
    return { ...this.state };
  }

  /**
   * Check if controller is connected
   */
  isControllerConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect from controller
   */
  disconnect(): void {
    if (this.input) {
      this.input.removeListener();
      this.input = null;
    }
    this.isConnected = false;
    this.state.isConnected = false;
    this.emit('disconnected');
    console.log('🔌 Disconnected from DDJ-FLX4');
  }

  /**
   * Manual connection attempt with specific input
   */
  connectToInput(inputName: string): boolean {
    const input = WebMidi.inputs.find(i => i.name === inputName);
    if (input) {
      this.connectToController(input);
      return true;
    }
    return false;
  }

  /**
   * Get available MIDI inputs for debugging
   */
  getAvailableInputs(): string[] {
    if (!WebMidi.enabled) {
      return [];
    }
    return WebMidi.inputs.map(input => input.name);
  }

  /**
   * Test if any DDJ device is available
   */
  findAnyDDJDevice(): string | null {
    const inputs = this.getAvailableInputs();
    const ddjDevice = inputs.find(name => 
      name.toLowerCase().includes('ddj') ||
      name.toLowerCase().includes('pioneer') ||
      name.toLowerCase().includes('flx')
    );
    return ddjDevice || null;
  }

  /**
   * Load a track onto Deck A and update BPM
   */
  loadTrackToDeckA(track: Track): void {
    this.state.channelA.currentTrackId = track.id;
    this.state.channelA.bpm = track.bpm;
    console.log(`🎵 Loaded track "${track.name}" by ${track.artist} (${track.bpm} BPM) to Deck A`);
    this.emit('channelA:trackLoaded', { track, bpm: track.bpm });
    this.emit('channelA:bpmChanged', { bpm: track.bpm });
  }

  /**
   * Load a track onto Deck B and update BPM
   */
  loadTrackToDeckB(track: Track): void {
    this.state.channelB.currentTrackId = track.id;
    this.state.channelB.bpm = track.bpm;
    console.log(`🎵 Loaded track "${track.name}" by ${track.artist} (${track.bpm} BPM) to Deck B`);
    this.emit('channelB:trackLoaded', { track, bpm: track.bpm });
    this.emit('channelB:bpmChanged', { bpm: track.bpm });
  }

  /**
   * Get current BPM from Deck A
   */
  getCurrentBPMDeckA(): number {
    return this.state.channelA.bpm;
  }

  /**
   * Get current BPM from Deck B
   */
  getCurrentBPMDeckB(): number {
    return this.state.channelB.bpm;
  }

  /**
   * Get the BPM of whichever deck is currently playing
   */
  getCurrentPlayingBPM(): { deckA: number | null, deckB: number | null, active: number | null } {
    const deckABPM = this.state.channelA.play ? this.state.channelA.bpm : null;
    const deckBBPM = this.state.channelB.play ? this.state.channelB.bpm : null;
    
    // Return the BPM of the active deck, or null if none are playing
    let activeBPM = null;
    if (deckABPM && deckBBPM) {
      // Both playing - could return mixed BPM or prefer one deck
      activeBPM = deckABPM; // Prefer deck A for now
    } else if (deckABPM) {
      activeBPM = deckABPM;
    } else if (deckBBPM) {
      activeBPM = deckBBPM;
    }

    return {
      deckA: deckABPM,
      deckB: deckBBPM,
      active: activeBPM
    };
  }

  /**
   * Get loaded track ID for Deck A
   */
  getCurrentTrackIdDeckA(): string | undefined {
    return this.state.channelA.currentTrackId;
  }

  /**
   * Get loaded track ID for Deck B
   */
  getCurrentTrackIdDeckB(): string | undefined {
    return this.state.channelB.currentTrackId;
  }
} 