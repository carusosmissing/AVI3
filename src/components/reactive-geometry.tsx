import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Simplified shader for better performance and stability
const reactiveVertexShader = `
  uniform float time;
  uniform float audioLevel;
  uniform float bassLevel;
  uniform float midLevel;
  uniform float highLevel;
  uniform float beatIntensity;
  uniform vec3 bassColor;
  uniform vec3 midColor;
  uniform vec3 trebleColor;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vDisplacement;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    
    // Calculate which face this vertex belongs to based on normal direction
    vec3 absNormal = abs(normal);
    float maxComponent = max(max(absNormal.x, absNormal.y), absNormal.z);
    
    // Determine face direction
    vec3 faceDirection = vec3(0.0);
    if (absNormal.x == maxComponent) {
      faceDirection = vec3(sign(normal.x), 0.0, 0.0);
    } else if (absNormal.y == maxComponent) {
      faceDirection = vec3(0.0, sign(normal.y), 0.0);
    } else {
      faceDirection = vec3(0.0, 0.0, sign(normal.z));
    }
    
    // Calculate displacement based on audio levels - MUCH more aggressive scaling
    // Use quadratic scaling so low volumes = tight cube, high volumes = explosion
    float audioIntensity = audioLevel * audioLevel * 2.0; // Quadratic scaling
    float beatDisplacement = beatIntensity * beatIntensity * 1.0; // Quadratic beat scaling
    
    // Different displacement amounts for different faces based on frequency
    float faceDisplacement = 0.0;
    if (abs(faceDirection.x) > 0.5) {
      // Left/Right faces respond to bass - only when bass is significant
      faceDisplacement = audioIntensity + (bassLevel * bassLevel * 2.5);
    } else if (abs(faceDirection.y) > 0.5) {
      // Top/Bottom faces respond to mid - only when mid is significant  
      faceDisplacement = audioIntensity + (midLevel * midLevel * 2.0);
    } else {
      // Front/Back faces respond to high - only when high is significant
      faceDisplacement = audioIntensity + (highLevel * highLevel * 1.5);
    }
    
    // Add beat pulse to all faces - only when beats are strong
    faceDisplacement += beatDisplacement;
    
    // Move entire face away from center (keeping faces flat)
    vec3 newPosition = position + faceDirection * faceDisplacement;
    
    vDisplacement = faceDisplacement;
    
    // Color mixing based on face and audio
    float colorMix = audioLevel + faceDisplacement * 0.3;
    vColor = mix(mix(bassColor, midColor, colorMix), trebleColor, beatIntensity);
    
    vPosition = newPosition;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const reactiveFragmentShader = `
  uniform float time;
  uniform float audioLevel;
  uniform float beatIntensity;
  uniform vec3 bassColor;
  uniform vec3 midColor;
  uniform vec3 trebleColor;
  uniform float emissiveIntensity;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying vec3 vColor;
  varying float vDisplacement;
  
  void main() {
    vec3 normal = normalize(vNormal);
    
    // Simple lighting
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float diff = max(dot(normal, lightDir), 0.0);
    
    // Base color
    vec3 baseColor = vColor;
    
    // Simple diffuse lighting
    vec3 litColor = baseColor * (0.4 + diff * 0.6);
    
    // Beat flash
    float beatFlash = beatIntensity * 0.3;
    litColor += vec3(beatFlash);
    
    // Displacement glow
    vec3 emissive = baseColor * vDisplacement * emissiveIntensity;
    litColor += emissive;
    
    gl_FragColor = vec4(litColor, 1.0);
  }
`;

interface ReactiveGeometryProps {
  audioData: {
    audioLevel: number;
    spectralFeatures?: {
      bass: number;
      mid: number;
      high: number;
      brightness: number;
      bandwidth: number;
    };
    beatDetection?: {
      isBeat: boolean;
      beatStrength: number;
      beatPhase: number;
    };
    frequencyData?: Uint8Array;
  };
  visualDNAProfile?: {
    id: string;
    colorPalette: {
      primary: string;
      secondary: string;
      accent: string;
      highlights: string[];
    };
    complexity: {
      geometryDetail: number;
      effectIntensity: number;
      movementSpeed: number;
    };
    reactivity: {
      bass: number;
      mid: number;
      treble: number;
      rhythm: number;
    };
  };
  position?: [number, number, number];
  scale?: number;
  logoTexture?: string;
}

export const ReactiveGeometry: React.FC<ReactiveGeometryProps> = ({
  audioData,
  visualDNAProfile,
  position = [0, 0, 0],
  scale = 1,
  logoTexture
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const [beatIntensity, setBeatIntensity] = useState(0);

  // Create geometry with appropriate subdivision for displacement
  const geometry = useMemo(() => {
    const detail = visualDNAProfile?.complexity.geometryDetail || 0.5;
    const subdivisions = Math.floor(4 + detail * 12); // 4-16 subdivisions for better performance
    return new THREE.BoxGeometry(2, 2, 2, subdivisions, subdivisions, subdivisions);
  }, [visualDNAProfile?.complexity.geometryDetail]);

  // Load the logo texture
  const texture = useMemo(() => {
    if (!logoTexture) return null;
    
    const loader = new THREE.TextureLoader();
    const tex = loader.load(
      logoTexture,
      (loadedTexture) => {
        console.log('✅ Logo texture loaded for reactive geometry!');
        loadedTexture.needsUpdate = true;
      },
      undefined,
      (error) => {
        console.error('❌ Failed to load logo texture for reactive geometry:', error);
      }
    );
    
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.flipY = true; // Fix backwards logo
    
    return tex;
  }, [logoTexture]);

  // Beat detection and smoothing
  const beatStateRef = useRef({
    lastBeatTime: 0,
    beatDecay: 0,
    avgBeatStrength: 0
  });

  // Enhanced smoothing for all audio values with momentum and pumping
  const smoothingStateRef = useRef({
    audioLevel: 0,
    bassLevel: 0,
    midLevel: 0,
    highLevel: 0,
    beatIntensity: 0,
    lastUpdateTime: 0,
    // Position smoothing with momentum
    position: { x: 0, y: 0, z: 0 },
    positionVelocity: { x: 0, y: 0, z: 0 },
    targetPosition: { x: 0, y: 0, z: 0 },
    // Pumping motion state
    pumpPhase: 0,
    pumpIntensity: 0,
    lastBeatTime: 0
  });

  useFrame((state) => {
    if (!materialRef.current) return;

    const time = state.clock.getElapsedTime();
    const currentTime = performance.now();
    const deltaTime = currentTime - smoothingStateRef.current.lastUpdateTime;
    smoothingStateRef.current.lastUpdateTime = currentTime;

    // Throttle updates to prevent overwhelming the GPU
    if (deltaTime < 16) return; // ~60fps max updates

    const { audioLevel = 0, spectralFeatures, beatDetection } = audioData;

    // Enhanced smoothing with adaptive response for volume changes
    const targetAudioLevel = Math.max(0, Math.min(1, audioLevel));
    const targetBassLevel = Math.max(0, Math.min(1, spectralFeatures?.bass || audioLevel * 0.8));
    const targetMidLevel = Math.max(0, Math.min(1, spectralFeatures?.mid || audioLevel * 0.6));
    const targetHighLevel = Math.max(0, Math.min(1, spectralFeatures?.high || audioLevel * 0.4));

    // Adaptive smoothing - faster response to increases, slower to decreases for pump effect
    const getAdaptiveSmoothingFactor = (current: number, target: number) => {
      const difference = Math.abs(target - current);
      const isIncreasing = target > current;
      
      // Faster response to volume increases, slower decay for smooth pumping
      if (isIncreasing) {
        return Math.min(0.25, 0.12 + difference * 0.3); // Quick response to increases
      } else {
        return Math.min(0.15, 0.08 + difference * 0.2); // Slower decay for smooth pumping
      }
    };

    // Apply adaptive exponential smoothing
    smoothingStateRef.current.audioLevel += (targetAudioLevel - smoothingStateRef.current.audioLevel) * getAdaptiveSmoothingFactor(smoothingStateRef.current.audioLevel, targetAudioLevel);
    smoothingStateRef.current.bassLevel += (targetBassLevel - smoothingStateRef.current.bassLevel) * getAdaptiveSmoothingFactor(smoothingStateRef.current.bassLevel, targetBassLevel);
    smoothingStateRef.current.midLevel += (targetMidLevel - smoothingStateRef.current.midLevel) * getAdaptiveSmoothingFactor(smoothingStateRef.current.midLevel, targetMidLevel);
    smoothingStateRef.current.highLevel += (targetHighLevel - smoothingStateRef.current.highLevel) * getAdaptiveSmoothingFactor(smoothingStateRef.current.highLevel, targetHighLevel);

    // Update material properties for clean logo display
    if (materialRef.current) {
      // When using a texture, color acts as a multiplier - use white to show texture properly
      materialRef.current.color.setHex(0xffffff); // White so texture shows through
      
      // Only add subtle emissive glow on beats
      const emissiveIntensity = smoothingStateRef.current.beatIntensity * 0.3;
      if (emissiveIntensity > 0.1) {
        materialRef.current.emissive.setHex(0x333333); // Dark gray glow on beats
        materialRef.current.emissiveIntensity = emissiveIntensity;
      } else {
        materialRef.current.emissive.setHex(0x000000); // No glow when quiet
      }
    }

    // Process beat detection with smoothing
    if (beatDetection?.isBeat && beatDetection.beatStrength > 0.3) {
      const beatTime = time;
      if (beatTime - beatStateRef.current.lastBeatTime > 0.1) { // Prevent rapid beats
        beatStateRef.current.beatDecay = beatDetection.beatStrength;
        beatStateRef.current.lastBeatTime = beatTime;
        beatStateRef.current.avgBeatStrength = 
          beatStateRef.current.avgBeatStrength * 0.9 + beatDetection.beatStrength * 0.1;
      }
    }

    // Smooth beat intensity decay
    beatStateRef.current.beatDecay *= 0.85;
    const targetBeatIntensity = Math.max(0, beatStateRef.current.beatDecay);
    smoothingStateRef.current.beatIntensity += (targetBeatIntensity - smoothingStateRef.current.beatIntensity) * 0.2;
    
    setBeatIntensity(smoothingStateRef.current.beatIntensity);

    // DRAMATIC mesh animations based on profile and individual frequency bands
    if (meshRef.current && visualDNAProfile) {
      const { movementSpeed } = visualDNAProfile.complexity;
      const { rhythm } = visualDNAProfile.reactivity;

      // More reasonable scaling with subtle breathing motion
      const baseScale = 0.6 + smoothingStateRef.current.audioLevel * 1.2; // Range from 0.6 to 1.8 
      const beatScale = 1 + smoothingStateRef.current.beatIntensity * rhythm * 0.4; // Beat responsive scaling
      
      // Add subtle breathing motion even when quiet
      const breathingSpeed = 1.5; // Slow breathing
      const breathingIntensity = 0.08 + smoothingStateRef.current.audioLevel * 0.05; // Subtle but responsive
      const breathingMotion = 1 + Math.sin(time * breathingSpeed) * breathingIntensity;
      
      // Combine all scaling factors
      const finalScale = scale * baseScale * beatScale * breathingMotion;
      
      if (!isNaN(finalScale) && isFinite(finalScale)) {
        meshRef.current.scale.setScalar(finalScale);
      }

      // SMOOTH POSITION MOVEMENT with pumping motion and spring physics
      const frameTime = Math.min(deltaTime / 1000, 1/30); // Convert to seconds, cap for stability
      
      // Calculate pumping motion based on beats and audio level
      if (beatDetection?.isBeat && beatDetection.beatStrength > 0.4) {
        if (time - smoothingStateRef.current.lastBeatTime > 0.2) { // Prevent rapid pumps
          smoothingStateRef.current.pumpIntensity = beatDetection.beatStrength;
          smoothingStateRef.current.lastBeatTime = time;
          smoothingStateRef.current.pumpPhase = 0; // Reset pump phase
        }
      }
      
      // Update pump phase and decay intensity
      smoothingStateRef.current.pumpPhase += frameTime * 8.0; // Pump speed
      smoothingStateRef.current.pumpIntensity *= 0.92; // Smooth decay
      
      // Create pumping motion (breathing effect)
      const pumpWave = Math.sin(smoothingStateRef.current.pumpPhase) * Math.exp(-smoothingStateRef.current.pumpPhase * 0.8);
      const pumpOffset = pumpWave * smoothingStateRef.current.pumpIntensity * 0.8;
      
      // Calculate target positions based on frequency bands with reduced intensity
      const positionMultiplier = 2.5; // Reduced from 6.0 for smoother movement
      const bassMovement = (smoothingStateRef.current.bassLevel - 0.5) * positionMultiplier;
      const midMovement = (smoothingStateRef.current.midLevel - 0.5) * positionMultiplier * 0.6;
      const highMovement = Math.sin(time * 0.8) * smoothingStateRef.current.highLevel * 1.2;
      
      // Set target positions with pumping motion
      smoothingStateRef.current.targetPosition.x = position[0] + bassMovement + pumpOffset * 0.5;
      smoothingStateRef.current.targetPosition.y = position[1] + midMovement + pumpOffset;
      smoothingStateRef.current.targetPosition.z = position[2] + highMovement + pumpOffset * 0.3;
      
      // Spring physics for smooth movement
      const springStrength = 12.0; // How strong the spring is
      const damping = 0.7; // How much damping (0 = no damping, 1 = heavy damping)
      
      // Calculate spring forces
      const forceX = (smoothingStateRef.current.targetPosition.x - smoothingStateRef.current.position.x) * springStrength;
      const forceY = (smoothingStateRef.current.targetPosition.y - smoothingStateRef.current.position.y) * springStrength;
      const forceZ = (smoothingStateRef.current.targetPosition.z - smoothingStateRef.current.position.z) * springStrength;
      
      // Update velocity with forces
      smoothingStateRef.current.positionVelocity.x += forceX * frameTime;
      smoothingStateRef.current.positionVelocity.y += forceY * frameTime;
      smoothingStateRef.current.positionVelocity.z += forceZ * frameTime;
      
      // Apply damping to velocity
      smoothingStateRef.current.positionVelocity.x *= Math.pow(damping, frameTime);
      smoothingStateRef.current.positionVelocity.y *= Math.pow(damping, frameTime);
      smoothingStateRef.current.positionVelocity.z *= Math.pow(damping, frameTime);
      
      // Update position with velocity
      smoothingStateRef.current.position.x += smoothingStateRef.current.positionVelocity.x * frameTime;
      smoothingStateRef.current.position.y += smoothingStateRef.current.positionVelocity.y * frameTime;
      smoothingStateRef.current.position.z += smoothingStateRef.current.positionVelocity.z * frameTime;
      
      // Apply to mesh
      if (!isNaN(smoothingStateRef.current.position.x) && !isNaN(smoothingStateRef.current.position.y) && !isNaN(smoothingStateRef.current.position.z)) {
        meshRef.current.position.set(
          smoothingStateRef.current.position.x,
          smoothingStateRef.current.position.y,
          smoothingStateRef.current.position.z
        );
      }

      // DRAMATIC ROTATION based on audio levels and frequency content
      const volumeRotationSpeed = smoothingStateRef.current.audioLevel * 12.0; // Much faster rotation
      const bassRotation = smoothingStateRef.current.bassLevel * 0.02; // Bass drives X rotation
      const midRotation = smoothingStateRef.current.midLevel * 0.015; // Mid drives Y rotation
      const highRotation = smoothingStateRef.current.highLevel * 0.01; // High drives Z rotation
      
      // Combine movement speed with dramatic audio-driven rotation
      if (!isNaN(movementSpeed) && !isNaN(volumeRotationSpeed)) {
        meshRef.current.rotation.x += movementSpeed * 0.005 + bassRotation + volumeRotationSpeed * 0.001;
        meshRef.current.rotation.y += movementSpeed * 0.008 + midRotation + volumeRotationSpeed * 0.0015;
        meshRef.current.rotation.z += highRotation + volumeRotationSpeed * 0.0008;
      }

      // Beat-driven spinning burst effect
      if (smoothingStateRef.current.beatIntensity > 0.5) {
        const spinBurst = smoothingStateRef.current.beatIntensity * 0.05;
        meshRef.current.rotation.x += spinBurst;
        meshRef.current.rotation.y += spinBurst * 1.2;
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={position}
      scale={scale}
    >
      <meshStandardMaterial
        ref={materialRef}
        attach="material"
        map={texture}
        color="#ffffff"
        metalness={0.1}
        roughness={0.8}
        transparent={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// Enhanced reactive torus for additional geometry variety
export const ReactiveTorus: React.FC<ReactiveGeometryProps> = ({
  audioData,
  visualDNAProfile,
  position = [0, 0, 0],
  scale = 1
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Smoothing for torus to prevent glitches
  const smoothingStateRef = useRef({
    audioLevel: 0,
    bassLevel: 0,
    midLevel: 0,
    highLevel: 0,
    beatIntensity: 0,
    lastUpdateTime: 0
  });

  // Torus-specific geometry with HIGH subdivision for warping
  const geometry = useMemo(() => {
    const detail = visualDNAProfile?.complexity.geometryDetail || 0.5;
    const radialSegments = Math.floor(32 + detail * 64); // MUCH higher subdivision
    const tubularSegments = Math.floor(64 + detail * 128); // MUCH higher subdivision
    return new THREE.TorusGeometry(1, 0.4, radialSegments, tubularSegments);
  }, [visualDNAProfile?.complexity.geometryDetail]);

  // Shader uniforms for torus
  const uniforms = useMemo(() => {
    const colors = visualDNAProfile?.colorPalette;
    return {
      time: { value: 0 },
      audioLevel: { value: 0 },
      bassLevel: { value: 0 },
      midLevel: { value: 0 },
      highLevel: { value: 0 },
      beatIntensity: { value: 0 },
      bassColor: { value: new THREE.Color(colors?.primary || '#ff006e') },
      midColor: { value: new THREE.Color(colors?.secondary || '#3a86ff') },
      trebleColor: { value: new THREE.Color(colors?.accent || '#ffbe0b') },
      emissiveIntensity: { value: visualDNAProfile?.complexity.effectIntensity || 0.5 }
    };
  }, [visualDNAProfile]);

  useFrame((state) => {
    if (!materialRef.current || !meshRef.current) return;

    const time = state.clock.getElapsedTime();
    const currentTime = performance.now();
    const deltaTime = currentTime - smoothingStateRef.current.lastUpdateTime;
    smoothingStateRef.current.lastUpdateTime = currentTime;

    // Throttle updates to prevent overwhelming
    if (deltaTime < 16) return; // ~60fps max

    const { audioLevel = 0, beatDetection, spectralFeatures } = audioData;

    // Smooth all values for torus
    const smoothingFactor = 0.12; // Slightly faster smoothing for torus
    const targetAudioLevel = Math.max(0, Math.min(1, audioLevel));
    const targetBassLevel = Math.max(0, Math.min(1, spectralFeatures?.bass || audioLevel * 0.8));
    const targetMidLevel = Math.max(0, Math.min(1, spectralFeatures?.mid || audioLevel * 0.6));
    const targetHighLevel = Math.max(0, Math.min(1, spectralFeatures?.high || audioLevel * 0.4));
    const targetBeatIntensity = beatDetection?.beatStrength || 0;

    // Apply smoothing
    smoothingStateRef.current.audioLevel += (targetAudioLevel - smoothingStateRef.current.audioLevel) * smoothingFactor;
    smoothingStateRef.current.bassLevel += (targetBassLevel - smoothingStateRef.current.bassLevel) * smoothingFactor;
    smoothingStateRef.current.midLevel += (targetMidLevel - smoothingStateRef.current.midLevel) * smoothingFactor;
    smoothingStateRef.current.highLevel += (targetHighLevel - smoothingStateRef.current.highLevel) * smoothingFactor;
    smoothingStateRef.current.beatIntensity += (targetBeatIntensity - smoothingStateRef.current.beatIntensity) * 0.25;

    // Update uniforms with smoothed values and validation
    if (materialRef.current.uniforms.time && !isNaN(time) && isFinite(time)) {
      materialRef.current.uniforms.time.value = time;
    }
    if (materialRef.current.uniforms.audioLevel && !isNaN(smoothingStateRef.current.audioLevel) && isFinite(smoothingStateRef.current.audioLevel)) {
      materialRef.current.uniforms.audioLevel.value = smoothingStateRef.current.audioLevel;
    }
    if (materialRef.current.uniforms.beatIntensity && !isNaN(smoothingStateRef.current.beatIntensity) && isFinite(smoothingStateRef.current.beatIntensity)) {
      materialRef.current.uniforms.beatIntensity.value = smoothingStateRef.current.beatIntensity;
    }
    if (materialRef.current.uniforms.bassLevel && !isNaN(smoothingStateRef.current.bassLevel) && isFinite(smoothingStateRef.current.bassLevel)) {
      materialRef.current.uniforms.bassLevel.value = smoothingStateRef.current.bassLevel;
    }
    if (materialRef.current.uniforms.midLevel && !isNaN(smoothingStateRef.current.midLevel) && isFinite(smoothingStateRef.current.midLevel)) {
      materialRef.current.uniforms.midLevel.value = smoothingStateRef.current.midLevel;
    }
    if (materialRef.current.uniforms.highLevel && !isNaN(smoothingStateRef.current.highLevel) && isFinite(smoothingStateRef.current.highLevel)) {
      materialRef.current.uniforms.highLevel.value = smoothingStateRef.current.highLevel;
    }

    // DRAMATIC torus warping and bulging animations
    if (visualDNAProfile && meshRef.current) {
      const { movementSpeed } = visualDNAProfile.complexity;
      
      // CRAZY rotation around multiple axes
      if (!isNaN(movementSpeed) && isFinite(movementSpeed)) {
        meshRef.current.rotation.x += movementSpeed * 0.02 + smoothingStateRef.current.audioLevel * 0.05;
        meshRef.current.rotation.y += movementSpeed * 0.03 + smoothingStateRef.current.bassLevel * 0.08;
        meshRef.current.rotation.z += movementSpeed * 0.015 + smoothingStateRef.current.highLevel * 0.06;
      }

      // DRAMATIC scaling based on audio levels - much more aggressive
      const audioScale = 0.5 + smoothingStateRef.current.audioLevel * 3.0; // Range 0.5 to 3.5!
      const beatScale = 1 + smoothingStateRef.current.beatIntensity * 1.5; // More intense beat scaling
      const bassBoost = 1 + smoothingStateRef.current.bassLevel * 2.0; // Bass makes it HUGE
      const finalScale = scale * audioScale * beatScale * bassBoost;
      
      if (!isNaN(finalScale) && isFinite(finalScale)) {
        meshRef.current.scale.setScalar(finalScale);
      }

      // WILD position movement - make it dance around
      const positionRadius = 3.0;
      const baseX = position[0];
      const baseY = position[1]; 
      const baseZ = position[2];
      
      const newX = baseX + Math.sin(time * 2 + smoothingStateRef.current.bassLevel * 10) * positionRadius * smoothingStateRef.current.audioLevel;
      const newY = baseY + Math.cos(time * 1.5 + smoothingStateRef.current.midLevel * 8) * positionRadius * 0.5 * smoothingStateRef.current.audioLevel;
      const newZ = baseZ + Math.sin(time * 3 + smoothingStateRef.current.highLevel * 12) * positionRadius * 0.8 * smoothingStateRef.current.audioLevel;
      
      if (!isNaN(newX) && !isNaN(newY) && !isNaN(newZ)) {
        meshRef.current.position.x = newX;
        meshRef.current.position.y = newY;
        meshRef.current.position.z = newZ;
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={position}
      scale={scale}
    >
      <shaderMaterial
        ref={materialRef}
        attach="material"
        uniforms={{
          ...uniforms,
          // EXTRA uniforms for dramatic torus warping
          warpStrength: { value: 3.0 }, // Much stronger warping
          bulgeIntensity: { value: 2.5 }, // Dramatic bulging
          noiseScale: { value: 8.0 } // More chaotic noise
        }}
        vertexShader={`
          uniform float time;
          uniform float audioLevel;
          uniform float bassLevel;
          uniform float midLevel;
          uniform float highLevel;
          uniform float beatIntensity;
          uniform float warpStrength;
          uniform float bulgeIntensity;
          uniform float noiseScale;
          uniform vec3 bassColor;
          uniform vec3 midColor;
          uniform vec3 trebleColor;
          
          varying vec3 vNormal;
          varying vec3 vPosition;
          varying vec2 vUv;
          varying vec3 vColor;
          varying float vDisplacement;
          
          // Simple noise function for torus warping
          float noise(vec3 p) {
            return sin(p.x * noiseScale) * sin(p.y * noiseScale) * sin(p.z * noiseScale);
          }
          
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vUv = uv;
            
            // CRAZY TORUS WARPING - multiple displacement layers
            float timeWarp = time * 2.0;
            
            // Base displacement along normal for bulging
            float baseBulge = (audioLevel + bassLevel) * bulgeIntensity;
            
            // Oscillating displacement for warping
            float warpX = sin(timeWarp + position.x * 5.0 + bassLevel * 10.0) * warpStrength * audioLevel;
            float warpY = cos(timeWarp + position.y * 4.0 + midLevel * 8.0) * warpStrength * audioLevel;
            float warpZ = sin(timeWarp + position.z * 6.0 + highLevel * 12.0) * warpStrength * audioLevel;
            
            // Noise-based chaotic displacement
            float chaosDisplacement = noise(position + timeWarp * 0.5) * audioLevel * 1.5;
            
            // Beat-driven explosive displacement
            float beatBulge = beatIntensity * beatIntensity * 2.0;
            
            // Combine all displacements
            vec3 totalDisplacement = normal * (baseBulge + chaosDisplacement + beatBulge);
            totalDisplacement += vec3(warpX, warpY, warpZ);
            
            // Apply displacement
            vec3 newPosition = position + totalDisplacement;
            
            vDisplacement = length(totalDisplacement);
            
            // Dynamic color based on displacement intensity
            float colorMix = audioLevel + vDisplacement * 0.5;
            vColor = mix(mix(bassColor, midColor, colorMix), trebleColor, beatIntensity);
            
            vPosition = newPosition;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
          }
        `}
        fragmentShader={reactiveFragmentShader}
        transparent={false}
        wireframe={visualDNAProfile?.id.includes('geometric')}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// Reactive crystal formations
export const ReactiveCrystal: React.FC<ReactiveGeometryProps> = ({
  audioData,
  visualDNAProfile,
  position = [0, 0, 0],
  scale = 1
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Create multiple crystal shards
  const crystalCount = Math.floor(3 + (visualDNAProfile?.complexity.geometryDetail || 0.5) * 5);

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();
    const { audioLevel, beatDetection } = audioData;

    // Rotate entire crystal formation
    groupRef.current.rotation.y = time * 0.5;
    
    // Beat-responsive scaling
    const beatScale = 1 + (beatDetection?.beatStrength || 0) * 0.3;
    groupRef.current.scale.setScalar(scale * beatScale);

    // Individual crystal animations
    groupRef.current.children.forEach((crystal, index) => {
      if (crystal instanceof THREE.Mesh) {
        crystal.rotation.x = time * (0.5 + index * 0.1);
        crystal.rotation.z = time * (0.3 + index * 0.05);
        
        // Audio-reactive positioning
        const offset = audioLevel * Math.sin(time * 2 + index) * 0.5;
        crystal.position.y = Math.sin(time + index) + offset;
      }
    });
  });

  return (
    <group ref={groupRef} position={position}>
      {Array.from({ length: crystalCount }, (_, index) => {
        const angle = (index / crystalCount) * Math.PI * 2;
        const radius = 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <ReactiveGeometry
            key={index}
            audioData={audioData}
            visualDNAProfile={visualDNAProfile}
            position={[x, 0, z]}
            scale={0.3 + index * 0.1}
          />
        );
      })}
    </group>
  );
};

export default ReactiveGeometry; 