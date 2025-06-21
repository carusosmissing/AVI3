# 🎯 Reactive Geometry System Usage Guide

## Overview
The new Reactive Geometry system provides audio-reactive 3D shapes with vertex displacement, custom shaders, and beat-responsive materials that morph in real-time based on your music.

## ✨ What's New

### 🔮 Vertex Displacement
- **Frequency-based displacement**: Each vertex moves based on corresponding frequency data
- **Multi-layered morphing**: Base noise + audio displacement + beat displacement
- **Real-time geometry deformation**: Sphere vertices respond to bass, mid, and treble frequencies

### 🎨 Custom Shader Materials
- **Dynamic color mixing**: Colors blend based on frequency intensity and audio level
- **Fresnel rim lighting**: Audio-reactive glow around object edges  
- **Beat-responsive flashing**: Synchronized strobing effects on beat detection
- **Emissive displacement glow**: Displaced vertices emit light based on deformation

### ⚡ Advanced Lighting Effects
- **Multi-directional lighting**: Ambient + directional + specular highlights
- **Audio-reactive intensity**: Light brightness responds to audio levels
- **Profile-based colors**: Lighting adapts to Visual DNA profile colors

## 🎛️ Components Available

### 1. `ReactiveGeometry` - Main Morphing Sphere
```tsx
<ReactiveGeometry
  audioData={{
    audioLevel: 0.7,              // Overall volume (0-1)
    spectralFeatures: {
      bass: 0.8,                  // Low frequencies (0-1)
      mid: 0.6,                   // Mid frequencies (0-1) 
      high: 0.4,                  // High frequencies (0-1)
      brightness: 2500,           // Spectral centroid
      bandwidth: 1200             // Spectral bandwidth
    },
    beatDetection: {
      isBeat: true,               // Current beat detected
      beatStrength: 0.9,          // Beat intensity (0-1)
      beatPhase: 0.2              // Beat cycle position (0-1)
    },
    frequencyData: freqArray      // Optional: Raw frequency data (Uint8Array)
  }}
  visualDNAProfile={profile}      // Visual DNA profile for colors/behavior
  position={[0, 0, 0]}           // 3D position
  scale={2}                      // Size multiplier
/>
```

### 2. `ReactiveTorus` - Geometric Ring
```tsx
<ReactiveTorus
  audioData={audioData}
  visualDNAProfile={profile}
  position={[5, 0, -3]}
  scale={1.5}
/>
```

### 3. `ReactiveCrystal` - Multi-Shard Formation
```tsx
<ReactiveCrystal
  audioData={audioData}
  visualDNAProfile={profile}
  position={[0, 0, -8]}
  scale={1}
/>
```

## 🎚️ Audio Data Integration

### From DDJ-FLX4 Controller
```tsx
const audioData = {
  audioLevel: (channelA.volume + channelB.volume) / 254,
  spectralFeatures: {
    bass: (channelA.eq.low + channelB.eq.low) / 254,
    mid: (channelA.eq.mid + channelB.eq.mid) / 254,
    high: (channelA.eq.high + channelB.eq.high) / 254,
    brightness: 2000 + (channelA.eq.high + channelB.eq.high) * 10,
    bandwidth: 1000 + (channelA.eq.mid + channelB.eq.mid) * 5
  },
  beatDetection: {
    isBeat: beatPhase < 0.1,
    beatStrength: Math.max(0, 1 - beatPhase * 4),
    beatPhase: beatPhase
  }
};
```

### From Real Audio Input
```tsx
const audioData = {
  audioLevel: useAudioInput().audioLevel,
  spectralFeatures: {
    bass: audioMetrics.lowFrequencyEnergy,
    mid: audioMetrics.midFrequencyEnergy, 
    high: audioMetrics.highFrequencyEnergy,
    brightness: audioMetrics.spectralCentroid,
    bandwidth: audioMetrics.spectralBandwidth
  },
  beatDetection: aiAnalysis.beatDetection,
  frequencyData: audioMetrics.frequencyData // Raw FFT data
};
```

## 🧬 Visual DNA Profile Integration

The reactive geometry adapts to Visual DNA profiles:

### Profile-Specific Behaviors
```tsx
// Different profiles create different visual styles
'neon-pulse': {
  // Sharp, aggressive morphing
  colorPalette: { primary: '#FF006E', secondary: '#3A86FF', accent: '#FFBE0B' },
  complexity: { geometryDetail: 0.8, effectIntensity: 0.9, movementSpeed: 1.2 },
  reactivity: { bass: 0.9, mid: 0.6, treble: 0.7, rhythm: 1.0 }
}

'liquid-dreams': {
  // Smooth, flowing morphing  
  colorPalette: { primary: '#7209B7', secondary: '#560BAD', accent: '#B5179E' },
  complexity: { geometryDetail: 0.6, effectIntensity: 0.7, movementSpeed: 0.4 },
  reactivity: { bass: 0.4, mid: 0.7, treble: 0.9, rhythm: 0.3 }
}
```

### Geometry Detail Levels
- **Low Detail** (0.0-0.3): 16-24 subdivisions - smooth, minimal displacement
- **Medium Detail** (0.4-0.7): 32-48 subdivisions - balanced detail and performance  
- **High Detail** (0.8-1.0): 56-64 subdivisions - maximum displacement detail

## 🎮 Interactive Controls

### Real-time Parameter Updates
```tsx
// Shader uniforms update every frame
material.uniforms.audioLevel.value = audioLevel;
material.uniforms.beatIntensity.value = beatStrength;
material.uniforms.frequencyData.value = frequencyArray;

// Colors adapt to profile changes
material.uniforms.bassColor.value = new THREE.Color(profile.colorPalette.primary);
material.uniforms.midColor.value = new THREE.Color(profile.colorPalette.secondary);
material.uniforms.trebleColor.value = new THREE.Color(profile.colorPalette.accent);
```

### Beat Detection Response
```tsx
// Beat intensity smoothing with decay
if (beatDetection.isBeat && beatStrength > 0.3) {
  beatDecay = beatStrength;        // Instant response
}
beatDecay *= 0.85;                 // Smooth decay
material.uniforms.beatIntensity.value = beatDecay;
```

## 🛠️ Customization Options

### Creating Custom Profiles
```tsx
const customProfile = {
  id: 'my-custom-style',
  colorPalette: {
    primary: '#FF0080',           // Bass frequencies
    secondary: '#00FF80',         // Mid frequencies  
    accent: '#8000FF',            // Treble frequencies
    highlights: ['#FF4040', '#40FF40', '#4040FF']
  },
  complexity: {
    geometryDetail: 0.8,          // Vertex density (0-1)
    effectIntensity: 0.9,         // Shader effect strength
    movementSpeed: 1.2            // Animation speed multiplier
  },
  reactivity: {
    bass: 1.0,                    // Low frequency response
    mid: 0.7,                     // Mid frequency response
    treble: 0.8,                  // High frequency response  
    rhythm: 0.9                   // Beat/rhythm response
  }
};
```

### Shader Customization
```glsl
// Custom displacement in vertex shader
float customDisplacement = sin(position.y * 5.0 + time) * audioLevel * 0.3;
totalDisplacement += customDisplacement;

// Custom lighting in fragment shader  
vec3 customGlow = bassColor * rim * beatIntensity * 2.0;
litColor += customGlow;
```

## 🚀 Performance Tips

### Optimization Settings
```tsx
// Balance quality vs performance
const optimizedSettings = {
  geometryDetail: 0.6,           // Reduce for better performance
  maxParticles: 1500,           // Limit particle count
  enableLOD: true,              // Use level-of-detail
  updateFrequency: 60           // Target frame rate
};
```

### GPU Performance
- **High-end GPU**: Use max detail (0.8-1.0), all effects enabled
- **Mid-range GPU**: Medium detail (0.5-0.7), selective effects
- **Low-end GPU**: Low detail (0.3-0.5), basic effects only

## 🎯 Integration Examples

### Basic Mode Integration
```tsx
<ReactiveGeometry
  audioData={simulatedFromMIDI}
  visualDNAProfile={basicModeProfile}
  position={[0, 0, -5]}
  scale={1.5}
/>
```

### AI-Enhanced Mode Integration  
```tsx
<ReactiveGeometry
  audioData={realAudioAnalysis}
  visualDNAProfile={currentAIProfile}
  position={[0, 0, 0]}
  scale={2}
/>

{profile.id === 'crystal-matrix' && (
  <ReactiveCrystal
    audioData={realAudioAnalysis}
    visualDNAProfile={currentAIProfile}
    position={[0, 0, -8]}
    scale={1}
  />
)}
```

## 🔧 Troubleshooting

### Common Issues

**Geometry not morphing:**
- Check `audioLevel` is > 0
- Verify `spectralFeatures` data is valid
- Ensure shader uniforms are updating

**Performance issues:**
- Reduce `geometryDetail` value  
- Lower `maxParticles` count
- Enable LOD system

**Colors not changing:**
- Verify Visual DNA profile is passed correctly
- Check color palette format (hex strings)
- Ensure profile changes trigger re-render

### Debug Tips
```tsx
// Log audio data in component
console.log('Audio Level:', audioLevel);
console.log('Beat Detected:', beatDetection.isBeat);
console.log('Frequency Data Length:', frequencyData?.length);

// Monitor shader uniforms
console.log('Shader Time:', material.uniforms.time.value);
console.log('Beat Intensity:', material.uniforms.beatIntensity.value);
```

## 🎵 Best Practices

1. **Audio Responsiveness**: Use real audio input for best results
2. **Profile Matching**: Match geometry complexity to music genre
3. **Beat Synchronization**: Tune beat detection thresholds for your music
4. **Color Harmony**: Use complementary colors in profile palettes
5. **Performance Monitoring**: Watch frame rate and adjust quality accordingly

---

**The reactive geometry system transforms your audio visualizer from static shapes to living, breathing art that responds to every beat, frequency, and musical nuance!** 🎨✨ 