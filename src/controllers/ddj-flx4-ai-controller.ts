import { DDJFlx4Controller } from './ddj-flx4-controller';
import { RealTimeAudioAnalyzer } from '../ai/audio-analyzer';
import { AIEnhancedControllerState, EffectControls, AdvancedMetrics, MIDIEvent, AIEvent } from '../types';

export class DDJFlx4AIController extends DDJFlx4Controller {
  private aiAnalyzer: RealTimeAudioAnalyzer;
  private aiState!: AIEnhancedControllerState;
  private audioMetrics!: AdvancedMetrics;
  
  // Enhanced MIDI mappings for effects
  private readonly EFFECT_MAPPINGS = {
    FILTER_A: { channel: 1, controller: 26 },
    FILTER_B: { channel: 2, controller: 26 },
    COLOR_FX_A: { channel: 1, controller: 18 },
    COLOR_FX_B: { channel: 2, controller: 18 },
    BEAT_FX_LEVEL: { channel: 1, controller: 19 },
    BEAT_FX_TIME: { channel: 1, controller: 20 },
    SMART_CFX: { channel: 1, controller: 21 },
  };
  
  constructor() {
    super();
    console.log('🤖 Initializing AI-Enhanced DDJ-FLX4 Controller...');
    
    this.aiAnalyzer = new RealTimeAudioAnalyzer();
    this.initializeAIState();
    this.initializeAudioMetrics();
    this.setupAIEventListeners();
    
    console.log('✅ AI-Enhanced DDJ-FLX4 Controller initialized');
  }

  private initializeAIState(): void {
    const baseState = this.getState();
    this.aiState = {
      ...baseState,
      aiAnalyzer: this.aiAnalyzer,
      effectControls: this.getInitialEffectControls(),
      advancedMetrics: this.audioMetrics
    };
  }

  private getInitialEffectControls(): EffectControls {
    return {
      filter: { low: 64, high: 64, resonance: 0 },
      reverb: { level: 0, time: 50, feedback: 30 },
      delay: { level: 0, time: 250, feedback: 25 },
      echo: { level: 0, beats: 1 }
    };
  }

  private initializeAudioMetrics(): void {
    this.audioMetrics = {
      spectralCentroid: 0,
      spectralBandwidth: 0,
      spectralRolloff: 0,
      zeroCrossingRate: 0,
      mfcc: Array(13).fill(0),
      chroma: Array(12).fill(0),
      tonnetz: Array(6).fill(0)
    };
  }

  private setupAIEventListeners(): void {
    this.on('midi', async (event: MIDIEvent) => {
      await this.processWithAI(event);
    });

    this.on('channelA:volume', (data: { value: number }) => this.handleVolumeChangeWithAI('A', data));
    this.on('channelB:volume', (data: { value: number }) => this.handleVolumeChangeWithAI('B', data));
  }

  private async processWithAI(event: MIDIEvent): Promise<void> {
    this.updateAudioMetricsFromMIDI(event);
    
    await this.aiAnalyzer.analyzeAudioData(
      this.extractMIDIDataForAI(event),
      this.audioMetrics,
      event.timestamp
    );
    
    const aiEvent: AIEvent = {
      ...event,
      aiData: {
        prediction: this.aiAnalyzer.predictiveBeats,
        pattern: this.aiAnalyzer.patternRecognition.detectedPatterns[0],
        confidence: this.aiAnalyzer.predictiveBeats.confidence
      }
    };
    
    console.log('AI MIDI Event processed');
    this.processEffectControls(event);
  }

  private async handleVolumeChangeWithAI(channel: 'A' | 'B', data: { value: number }): Promise<void> {
    const smoothingFilter = this.aiAnalyzer.smartSmoothing.adaptiveFilters.get('volume');
    
    if (smoothingFilter) {
      const smoothedValue = this.applyAISmoothing(data.value, smoothingFilter);
      
      if (channel === 'A') {
        this.aiState.channelA.volume = smoothedValue;
      } else {
        this.aiState.channelB.volume = smoothedValue;
      }
      
      // Use console.log instead of private emit method
      console.log(`AI Volume ${channel}: ${data.value} -> ${smoothedValue}`);
    }
  }

  private processEffectControls(event: MIDIEvent): void {
    if (event.type !== 'controlchange') return;

    const { channel, controller, value } = event;
    
    // Ensure values are defined
    if (channel === undefined || controller === undefined || value === undefined) return;

    if (this.isControllerMatch(channel, controller, this.EFFECT_MAPPINGS.FILTER_A)) {
      this.handleFilterControl('A', value);
    } else if (this.isControllerMatch(channel, controller, this.EFFECT_MAPPINGS.FILTER_B)) {
      this.handleFilterControl('B', value);
    } else if (this.isControllerMatch(channel, controller, this.EFFECT_MAPPINGS.COLOR_FX_A)) {
      this.handleColorFX('A', value);
    } else if (this.isControllerMatch(channel, controller, this.EFFECT_MAPPINGS.COLOR_FX_B)) {
      this.handleColorFX('B', value);
    } else if (this.isControllerMatch(channel, controller, this.EFFECT_MAPPINGS.BEAT_FX_LEVEL)) {
      this.handleBeatFXLevel(value);
    } else if (this.isControllerMatch(channel, controller, this.EFFECT_MAPPINGS.BEAT_FX_TIME)) {
      this.handleBeatFXTime(value);
    } else if (this.isControllerMatch(channel, controller, this.EFFECT_MAPPINGS.SMART_CFX)) {
      this.handleSmartCFX(value);
    }
  }

  private handleFilterControl(channel: 'A' | 'B', value: number): void {
    if (value < 64) {
      this.aiState.effectControls.filter.low = 127 - (value * 2);
      this.aiState.effectControls.filter.high = 127;
    } else if (value > 64) {
      this.aiState.effectControls.filter.low = 127;
      this.aiState.effectControls.filter.high = 127 - ((value - 64) * 2);
    } else {
      this.aiState.effectControls.filter.low = 127;
      this.aiState.effectControls.filter.high = 127;
    }
    
    console.log(`🎛️ Filter ${channel}: ${value}`);
  }

  private handleColorFX(channel: 'A' | 'B', value: number): void {
    this.aiState.effectControls.reverb.level = value;
    
    console.log(`🌈 Color FX ${channel}: ${value}`);
  }

  private handleBeatFXLevel(value: number): void {
    this.aiState.effectControls.delay.level = value;
    this.aiState.effectControls.echo.level = value;
    
    console.log(`🥁 Beat FX Level: ${value}`);
  }

  private handleBeatFXTime(value: number): void {
    const beatDivisions = [1/16, 1/8, 1/4, 1/2, 1, 2, 4, 8];
    const divisionIndex = Math.floor((value / 127) * (beatDivisions.length - 1));
    const beats = beatDivisions[divisionIndex];
    
    this.aiState.effectControls.echo.beats = beats;
    
    console.log(`⏱️ Beat FX Time: ${value} -> ${beats} beats`);
  }

  private handleSmartCFX(value: number): void {
    const energyLevel = this.aiAnalyzer.patternRecognition.energyPrediction.currentEnergy;
    const genre = this.aiAnalyzer.patternRecognition.genreClassification.detectedGenre;
    
    console.log(`🧠 Smart CFX: ${value} -> Energy: ${energyLevel.toFixed(2)}, Genre: ${genre}`);
  }

  private applyAISmoothing(value: number, filter: any): number {
    if (!filter || filter.history.length === 0) return value;
    
    const lastValue = filter.history[filter.history.length - 1];
    const smoothingFactor = filter.smoothingFactor;
    
    return lastValue * (1 - smoothingFactor) + value * smoothingFactor;
  }

  private extractMIDIDataForAI(event: MIDIEvent): any {
    return {
      bpm: this.aiAnalyzer.predictiveBeats.beatPattern[0] || 120,
      volume: (this.aiState.channelA.volume + this.aiState.channelB.volume) / 2,
      eq: {
        low: (this.aiState.channelA.eq.low + this.aiState.channelB.eq.low) / 2,
        mid: (this.aiState.channelA.eq.mid + this.aiState.channelB.eq.mid) / 2,
        high: (this.aiState.channelA.eq.high + this.aiState.channelB.eq.high) / 2
      },
      effects: this.aiState.effectControls,
      timestamp: event.timestamp,
      type: event.type
    };
  }

  private updateAudioMetricsFromMIDI(event: MIDIEvent): void {
    if (event.type === 'controlchange') {
      const avgEQ = (this.aiState.channelA.eq.low + this.aiState.channelA.eq.mid + this.aiState.channelA.eq.high) / 3;
      this.audioMetrics.spectralCentroid = (avgEQ / 127) * 4000;
      
      const eqSpread = Math.abs(this.aiState.channelA.eq.high - this.aiState.channelA.eq.low);
      this.audioMetrics.spectralBandwidth = (eqSpread / 127) * 2000;
      
      this.audioMetrics.spectralRolloff = (this.aiState.channelA.eq.high / 127) * 8000;
      
      for (let i = 0; i < 13; i++) {
        this.audioMetrics.mfcc[i] = Math.random() * 2 - 1;
      }
    }
  }

  private isControllerMatch(channel: number, controller: number, mapping: any): boolean {
    return mapping.channel === channel && mapping.controller === controller;
  }

  public getAIState(): AIEnhancedControllerState {
    return this.aiState;
  }

  public getAIAnalysis(): any {
    return this.aiAnalyzer.getAIState();
  }

  public dispose(): void {
    this.aiAnalyzer.dispose();
    console.log('🧹 AI-Enhanced DDJ-FLX4 Controller disposed');
  }
}
