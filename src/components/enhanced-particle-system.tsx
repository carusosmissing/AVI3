import React, { useRef, useState, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Particle types enum
export enum ParticleType {
  SPARK = 'spark',
  SMOKE = 'smoke',
  LIQUID = 'liquid',
  ENERGY_TRAIL = 'energy_trail',
  GEOMETRIC = 'geometric',
  PIXEL = 'pixel'  // New pixel type for reflective surfaces
}

// Individual particle data structure
interface Particle {
  id: number;
  type: ParticleType;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  age: number;
  maxAge: number;
  size: number;
  startSize: number;
  endSize: number;
  color: { h: number; s: number; l: number };
  startColor: { h: number; s: number; l: number };
  endColor: { h: number; s: number; l: number };
  alpha: number;
  mass: number;
  trail?: THREE.Vector3[];
  isAlive: boolean;
  audioReactivity: number;
  spawnSource: 'beat' | 'bass' | 'mid' | 'high' | 'energy' | 'continuous';
}

// Physics field interfaces
interface GravityWell {
  position: THREE.Vector3;
  strength: number;
  radius: number;
}

interface MagneticField {
  position: THREE.Vector3;
  strength: number;
  radius: number;
  axis: THREE.Vector3;
}

interface TurbulenceField {
  position: THREE.Vector3;
  strength: number;
  radius: number;
  frequency: number;
  phase: number;
}

// Audio analysis interface
interface AudioData {
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
}

// LOD levels
enum LODLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

interface EnhancedParticleSystemProps {
  audioData: AudioData;
  maxParticles?: number;
  enableLOD?: boolean;
  cameraPosition?: THREE.Vector3;
  visualDNAProfile?: {
    id: string;
    name: string;
    visualElements: {
      type: 'geometric' | 'organic' | 'hybrid';
      dimension: '2D' | '3D' | 'fractal';
      behaviors: Array<{
        name: string;
        intensity: number;
        frequency: number;
      }>;
    };
    complexity: {
      particleCount: number;
      geometryDetail: number;
      movementSpeed: number;
      turbulence: number;
      effectIntensity: number;
    };
    moodTags: string[];
    genreAffinity: string[];
    reactivity: {
      bass: number;
      mid: number;
      treble: number;
      rhythm: number;
      harmony: number;
    };
  };
}

export const EnhancedParticleSystem: React.FC<EnhancedParticleSystemProps> = ({
  audioData,
  maxParticles = 2000,
  enableLOD = true,
  cameraPosition,
  visualDNAProfile
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  
  // Particle management
  const [particles, setParticles] = useState<Particle[]>([]);
  const [currentLOD, setCurrentLOD] = useState<LODLevel>(LODLevel.HIGH);
  const particleIdCounter = useRef(0);
  
  // Physics fields
  const [gravityWells] = useState<GravityWell[]>([
    { position: new THREE.Vector3(0, -5, 0), strength: 2.0, radius: 10 },
    { position: new THREE.Vector3(5, 5, 0), strength: -1.5, radius: 8 }, // Repulsive
  ]);
  
  const [magneticFields] = useState<MagneticField[]>([
    { position: new THREE.Vector3(-3, 0, 0), strength: 1.0, radius: 6, axis: new THREE.Vector3(0, 1, 0) },
    { position: new THREE.Vector3(3, 0, 0), strength: -0.8, radius: 6, axis: new THREE.Vector3(0, 0, 1) },
  ]);
  
  const [turbulenceFields] = useState<TurbulenceField[]>([
    { position: new THREE.Vector3(0, 0, 0), strength: 0.5, radius: 15, frequency: 2.0, phase: 0 },
    { position: new THREE.Vector3(-8, 3, 2), strength: 0.3, radius: 8, frequency: 3.5, phase: Math.PI },
  ]);

  // Instanced mesh references for different particle types
  const sparkInstancedMesh = useRef<THREE.InstancedMesh>(null);
  const smokeInstancedMesh = useRef<THREE.InstancedMesh>(null);
  const liquidInstancedMesh = useRef<THREE.InstancedMesh>(null);
  const geometricInstancedMesh = useRef<THREE.InstancedMesh>(null);
  const pixelInstancedMesh = useRef<THREE.InstancedMesh>(null);

  // Geometries for different particle types
  const geometries = useMemo(() => ({
    spark: new THREE.SphereGeometry(0.02, 6, 6),
    smoke: new THREE.PlaneGeometry(0.1, 0.1),
    liquid: new THREE.SphereGeometry(0.03, 8, 8),
    geometric: new THREE.BoxGeometry(0.04, 0.04, 0.04),
    pixel: new THREE.BoxGeometry(0.12, 0.12, 0.03), // Small square retro pixel blocks
  }), []);

  // Materials for different particle types
  const materials = useMemo(() => ({
    spark: new THREE.MeshBasicMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
    }),
    smoke: new THREE.MeshBasicMaterial({
      transparent: true,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    }),
    liquid: new THREE.MeshPhongMaterial({
      transparent: true,
      shininess: 100,
    }),
    geometric: new THREE.MeshStandardMaterial({
      transparent: true,
      metalness: 0.8,
      roughness: 0.2,
    }),
    pixel: new THREE.MeshStandardMaterial({
      transparent: true,
      color: '#39ff14',         // Classic 80s computer phosphor green
      metalness: 0.3,           // Slightly metallic for some reflection
      roughness: 0.2,           // Slight roughness for authentic CRT look
      emissive: '#39ff14',      // Bright green phosphor glow
      emissiveIntensity: 0.8,   // Strong CRT-style glow
    }),
  }), []);

  // Particle factory function
  const createParticle = useCallback((type: ParticleType, position: THREE.Vector3, spawnSource: Particle['spawnSource']): Particle => {
    const baseColor = {
      h: Math.random() * 360,
      s: 0.7 + Math.random() * 0.3,
      l: 0.5 + Math.random() * 0.3
    };

    const particle: Particle = {
      id: particleIdCounter.current++,
      type,
      position: position.clone(),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ),
      acceleration: new THREE.Vector3(0, 0, 0),
      age: 0,
      maxAge: getParticleMaxAge(type),
      size: getParticleStartSize(type),
      startSize: getParticleStartSize(type),
      endSize: getParticleEndSize(type),
      color: { ...baseColor },
      startColor: { ...baseColor },
      endColor: { 
        h: (baseColor.h + 60) % 360,
        s: Math.max(0.2, baseColor.s - 0.3),
        l: Math.max(0.1, baseColor.l - 0.4)
      },
      alpha: 1.0,
      mass: getParticleMass(type),
      trail: type === ParticleType.ENERGY_TRAIL ? [] : undefined,
      isAlive: true,
      audioReactivity: Math.random() * 0.5 + 0.5,
      spawnSource
    };

    // Type-specific initialization
    switch (type) {
      case ParticleType.SPARK:
        particle.velocity.multiplyScalar(3 + Math.random() * 2);
        break;
      case ParticleType.SMOKE:
        particle.velocity.y += 1 + Math.random();
        particle.velocity.multiplyScalar(0.5);
        break;
      case ParticleType.LIQUID:
        particle.velocity.y -= 2;
        particle.velocity.multiplyScalar(1.5);
        break;
      case ParticleType.ENERGY_TRAIL:
        particle.velocity.multiplyScalar(2);
        particle.trail = [position.clone()];
        break;
      case ParticleType.GEOMETRIC:
        particle.velocity.multiplyScalar(1 + Math.random());
        break;
      case ParticleType.PIXEL:
        // Pixels float with controlled movement for reflective display
        particle.velocity.multiplyScalar(0.8 + Math.random() * 1.2);
        particle.velocity.y *= 0.3; // Less vertical movement
        // Add slight rotational velocity for holographic shimmer effect
        particle.velocity.add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.5
        ));
        break;
    }

    return particle;
  }, []);

  // Helper functions for particle properties
  const getParticleMaxAge = (type: ParticleType): number => {
    switch (type) {
      case ParticleType.SPARK: return 1.0 + Math.random() * 0.5;
      case ParticleType.SMOKE: return 3.0 + Math.random() * 2.0;
      case ParticleType.LIQUID: return 2.0 + Math.random() * 1.0;
      case ParticleType.ENERGY_TRAIL: return 1.5 + Math.random() * 1.0;
      case ParticleType.GEOMETRIC: return 2.5 + Math.random() * 1.5;
      case ParticleType.PIXEL: return 1.8 + Math.random() * 1.2; // Longer lived for reflective effect
      default: return 2.0;
    }
  };

  const getParticleStartSize = (type: ParticleType): number => {
    switch (type) {
      case ParticleType.SPARK: return 0.02 + Math.random() * 0.01;
      case ParticleType.SMOKE: return 0.05 + Math.random() * 0.03;
      case ParticleType.LIQUID: return 0.03 + Math.random() * 0.02;
      case ParticleType.ENERGY_TRAIL: return 0.01 + Math.random() * 0.005;
      case ParticleType.GEOMETRIC: return 0.04 + Math.random() * 0.02;
      case ParticleType.PIXEL: return 0.3 + Math.random() * 0.2; // Small retro computer pixels
      default: return 0.02;
    }
  };

  const getParticleEndSize = (type: ParticleType): number => {
    switch (type) {
      case ParticleType.SPARK: return 0.001;
      case ParticleType.SMOKE: return 0.15 + Math.random() * 0.1;
      case ParticleType.LIQUID: return 0.01;
      case ParticleType.ENERGY_TRAIL: return 0.005;
      case ParticleType.GEOMETRIC: return 0.01;
      case ParticleType.PIXEL: return 0.02; // Pixels fade to smaller size but stay visible
      default: return 0.01;
    }
  };

  const getParticleMass = (type: ParticleType): number => {
    switch (type) {
      case ParticleType.SPARK: return 0.1;
      case ParticleType.SMOKE: return 0.05;
      case ParticleType.LIQUID: return 1.0;
      case ParticleType.ENERGY_TRAIL: return 0.2;
      case ParticleType.GEOMETRIC: return 0.5;
      case ParticleType.PIXEL: return 0.3; // Light but not too light, for good physics
      default: return 0.5;
    }
  };

  // Profile-specific particle type distribution
  const getProfileParticleDistribution = useCallback(() => {
    if (!visualDNAProfile) {
      // Default distribution
      return {
        [ParticleType.SPARK]: 0.3,
        [ParticleType.SMOKE]: 0.2,
        [ParticleType.LIQUID]: 0.2,
        [ParticleType.ENERGY_TRAIL]: 0.2,
        [ParticleType.GEOMETRIC]: 0.1,
        [ParticleType.PIXEL]: 0.0
      };
    }

    // Profile-specific distributions based on Visual DNA characteristics
    const profileId = visualDNAProfile.id;
    const visualType = visualDNAProfile.visualElements.type;
    const moodTags = visualDNAProfile.moodTags;

    const distributions: Record<string, Record<ParticleType, number>> = {
      'neon-pulse': {
        [ParticleType.SPARK]: 0.4,      // High energy sparks
        [ParticleType.GEOMETRIC]: 0.3,   // Sharp geometric shapes
        [ParticleType.ENERGY_TRAIL]: 0.2, // Electric trails
        [ParticleType.SMOKE]: 0.1,       // Minimal smoke
        [ParticleType.LIQUID]: 0.0,      // No liquid for electronic
        [ParticleType.PIXEL]: 0.0        // No pixels
      },
      'liquid-dreams': {
        [ParticleType.LIQUID]: 0.5,      // Lots of flowing liquid
        [ParticleType.SMOKE]: 0.3,       // Soft atmospheric smoke
        [ParticleType.ENERGY_TRAIL]: 0.1, // Gentle trails
        [ParticleType.SPARK]: 0.1,       // Minimal sparks
        [ParticleType.GEOMETRIC]: 0.0,   // No hard geometry
        [ParticleType.PIXEL]: 0.0        // No pixels
      },
      'crystal-matrix': {
        [ParticleType.GEOMETRIC]: 0.4,   // Crystalline structures
        [ParticleType.SPARK]: 0.3,       // Refractive sparks
        [ParticleType.ENERGY_TRAIL]: 0.2, // Rainbow trails
        [ParticleType.LIQUID]: 0.1,      // Minimal liquid
        [ParticleType.SMOKE]: 0.0,       // No smoke for clarity
        [ParticleType.PIXEL]: 0.0        // No pixels
      },
      'urban-chaos': {
        [ParticleType.SPARK]: 0.5,       // Explosive sparks
        [ParticleType.GEOMETRIC]: 0.2,   // Gritty shapes
        [ParticleType.SMOKE]: 0.2,       // Urban smoke
        [ParticleType.ENERGY_TRAIL]: 0.1, // Glitchy trails
        [ParticleType.LIQUID]: 0.0,      // No organic liquid
        [ParticleType.PIXEL]: 0.0        // No pixels
      },
      'digital-garden': {
        [ParticleType.LIQUID]: 0.3,      // Organic flow
        [ParticleType.GEOMETRIC]: 0.3,   // Digital structures
        [ParticleType.SPARK]: 0.2,       // Blooming sparks
        [ParticleType.ENERGY_TRAIL]: 0.1, // Growth trails
        [ParticleType.SMOKE]: 0.1,       // Soft atmospherics
        [ParticleType.PIXEL]: 0.0        // No pixels
      },
      'void-walker': {
        [ParticleType.PIXEL]: 1.0,       // 100% reflective pixels - PIXELS ONLY!
        [ParticleType.ENERGY_TRAIL]: 0.0, // No energy streams - PURE PIXELS
        [ParticleType.GEOMETRIC]: 0.0,   // No geometric shapes - PURE PIXELS
        [ParticleType.SPARK]: 0.0,       // No sparks - PURE PIXELS
        [ParticleType.LIQUID]: 0.0,      // No liquid - PURE PIXELS
        [ParticleType.SMOKE]: 0.0        // No smoke - PURE PIXELS
      },
      'cosmic-voyage': {
        [ParticleType.ENERGY_TRAIL]: 0.3, // Cosmic rays
        [ParticleType.SPARK]: 0.3,       // Star particles
        [ParticleType.LIQUID]: 0.2,      // Nebula flows
        [ParticleType.GEOMETRIC]: 0.1,   // Cosmic structures
        [ParticleType.SMOKE]: 0.1,       // Space dust
        [ParticleType.PIXEL]: 0.0        // No pixels
      }
    };

    // Use profile-specific distribution or fall back to type-based
    if (distributions[profileId]) {
      return distributions[profileId];
    }

    // Fallback based on visual type and mood
    if (visualType === 'geometric') {
      return {
        [ParticleType.GEOMETRIC]: 0.4,
        [ParticleType.SPARK]: 0.3,
        [ParticleType.ENERGY_TRAIL]: 0.2,
        [ParticleType.SMOKE]: 0.1,
        [ParticleType.LIQUID]: 0.0,
        [ParticleType.PIXEL]: 0.0
      };
    } else if (visualType === 'organic') {
      return {
        [ParticleType.LIQUID]: 0.4,
        [ParticleType.SMOKE]: 0.3,
        [ParticleType.ENERGY_TRAIL]: 0.2,
        [ParticleType.SPARK]: 0.1,
        [ParticleType.GEOMETRIC]: 0.0,
        [ParticleType.PIXEL]: 0.0
      };
    } else { // hybrid
      return {
        [ParticleType.LIQUID]: 0.25,
        [ParticleType.GEOMETRIC]: 0.25,
        [ParticleType.SPARK]: 0.2,
        [ParticleType.ENERGY_TRAIL]: 0.2,
        [ParticleType.SMOKE]: 0.1,
        [ParticleType.PIXEL]: 0.0
      };
    }
  }, [visualDNAProfile]);

  // Get profile-specific physics parameters
  const getProfilePhysicsParams = useCallback(() => {
    if (!visualDNAProfile) {
      return {
        gravityStrength: 1.0,
        magneticStrength: 1.0,
        turbulenceStrength: 1.0,
        movementMultiplier: 1.0
      };
    }

    const profileId = visualDNAProfile.id;
    const moodTags = visualDNAProfile.moodTags;
    const complexity = visualDNAProfile.complexity;

    // Profile-specific physics
    const physicsParams: Record<string, any> = {
      'neon-pulse': {
        gravityStrength: 0.5,        // Low gravity for energy
        magneticStrength: 1.5,       // Strong magnetic fields
        turbulenceStrength: 0.8,     // Controlled chaos
        movementMultiplier: 1.5      // Fast movement
      },
      'liquid-dreams': {
        gravityStrength: 1.5,        // Flowing gravity
        magneticStrength: 0.3,       // Gentle magnetic influence
        turbulenceStrength: 1.2,     // Organic turbulence
        movementMultiplier: 0.6      // Slow, flowing movement
      },
      'crystal-matrix': {
        gravityStrength: 0.8,        // Structured gravity
        magneticStrength: 1.0,       // Organized fields
        turbulenceStrength: 0.4,     // Minimal chaos
        movementMultiplier: 0.8      // Precise movement
      },
      'urban-chaos': {
        gravityStrength: 1.2,        // Urban weight
        magneticStrength: 0.7,       // Chaotic fields
        turbulenceStrength: 1.5,     // Maximum chaos
        movementMultiplier: 1.2      // Aggressive movement
      },
      'digital-garden': {
        gravityStrength: 1.0,        // Balanced gravity
        magneticStrength: 0.8,       // Organic-digital blend
        turbulenceStrength: 1.0,     // Natural turbulence
        movementMultiplier: 0.9      // Growth-like movement
      },
      'void-walker': {
        gravityStrength: 2.0,        // Heavy, dark gravity
        magneticStrength: 0.2,       // Minimal magnetic influence
        turbulenceStrength: 0.3,     // Minimal chaos
        movementMultiplier: 1.8      // Sharp, fast movement
      },
      'cosmic-voyage': {
        gravityStrength: 0.3,        // Zero-g space
        magneticStrength: 1.8,       // Cosmic forces
        turbulenceStrength: 1.4,     // Psychedelic chaos
        movementMultiplier: 0.7      // Floating movement
      }
    };

    const defaults = {
      gravityStrength: 1.0,
      magneticStrength: 1.0,
      turbulenceStrength: 1.0,
      movementMultiplier: 1.0
    };

    return physicsParams[profileId] || defaults;
  }, [visualDNAProfile]);

  // Audio-reactive particle spawning
  const spawnAudioReactiveParticles = useCallback((deltaTime: number) => {
    const { audioLevel, spectralFeatures, beatDetection } = audioData;
    const particleDistribution = getProfileParticleDistribution();
    const physicsParams = getProfilePhysicsParams();
    
    // Profile-adjusted base spawning rate
    const baseSpawnRate = visualDNAProfile ? 
      (visualDNAProfile.complexity.particleCount / 200) : 10; // Scale based on profile complexity
    const audioSpawnRate = baseSpawnRate * (1 + audioLevel * 3) * physicsParams.movementMultiplier;
    const particlesToSpawn = Math.floor(audioSpawnRate * deltaTime);

    // Helper function to select particle type based on profile distribution
    const selectParticleType = (): ParticleType => {
      const random = Math.random();
      let cumulative = 0;
      
      for (const [type, probability] of Object.entries(particleDistribution)) {
        cumulative += probability;
        if (random <= cumulative) {
          return type as ParticleType;
        }
      }
      
      // Fallback
      return ParticleType.SPARK;
    };

    // Beat-triggered spawning with profile-specific types
    if (beatDetection?.isBeat && beatDetection.beatStrength > 0.5) {
      const profileIntensity = visualDNAProfile?.reactivity.rhythm || 1.0;
      const beatParticles = Math.floor(beatDetection.beatStrength * 20 * profileIntensity);
      
      for (let i = 0; i < beatParticles; i++) {
        const position = new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          -2 + Math.random() * 2,
          (Math.random() - 0.5) * 4
        );
        
        // Use profile-specific particle type for beats
        const particleType = selectParticleType();
        const newParticle = createParticle(particleType, position, 'beat');
        newParticle.velocity.multiplyScalar((1 + beatDetection.beatStrength) * physicsParams.movementMultiplier);
        
        setParticles(prev => [...prev.slice(-(maxParticles - 1)), newParticle]);
      }
    }

    // Frequency-based spawning with profile-specific reactivity
    if (spectralFeatures) {
      const bassReactivity = visualDNAProfile?.reactivity.bass || 1.0;
      const midReactivity = visualDNAProfile?.reactivity.mid || 1.0;
      const trebleReactivity = visualDNAProfile?.reactivity.treble || 1.0;

      // Bass spawning
      if (spectralFeatures.bass > 0.6) {
        const bassParticles = Math.floor(spectralFeatures.bass * 5 * bassReactivity);
        for (let i = 0; i < bassParticles; i++) {
          const position = new THREE.Vector3(
            (Math.random() - 0.5) * 6,
            2 + Math.random() * 2,
            (Math.random() - 0.5) * 6
          );
          // Bass-heavy profiles prefer certain particle types
          const particleType = particleDistribution[ParticleType.LIQUID] > 0.2 ? 
            ParticleType.LIQUID : selectParticleType();
          const newParticle = createParticle(particleType, position, 'bass');
          newParticle.velocity.multiplyScalar(physicsParams.movementMultiplier);
          setParticles(prev => [...prev.slice(-(maxParticles - 1)), newParticle]);
        }
      }

      // Mid spawning
      if (spectralFeatures.mid > 0.5) {
        const midParticles = Math.floor(spectralFeatures.mid * 3 * midReactivity);
        for (let i = 0; i < midParticles; i++) {
          const position = new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            -1 + Math.random() * 2,
            (Math.random() - 0.5) * 8
          );
          // Mid-heavy profiles prefer certain particle types
          const particleType = particleDistribution[ParticleType.SMOKE] > 0.2 ? 
            ParticleType.SMOKE : selectParticleType();
          const newParticle = createParticle(particleType, position, 'mid');
          newParticle.velocity.multiplyScalar(physicsParams.movementMultiplier);
          setParticles(prev => [...prev.slice(-(maxParticles - 1)), newParticle]);
        }
      }

      // High spawning
      if (spectralFeatures.high > 0.4) {
        const highParticles = Math.floor(spectralFeatures.high * 8 * trebleReactivity);
        for (let i = 0; i < highParticles; i++) {
          const position = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            Math.random() * 4 - 2,
            (Math.random() - 0.5) * 10
          );
          // High-frequency profiles prefer sparks and geometric
          const particleType = particleDistribution[ParticleType.SPARK] > 0.2 ? 
            (Math.random() < 0.7 ? ParticleType.SPARK : ParticleType.GEOMETRIC) : 
            selectParticleType();
          const newParticle = createParticle(particleType, position, 'high');
          newParticle.velocity.multiplyScalar(physicsParams.movementMultiplier);
          setParticles(prev => [...prev.slice(-(maxParticles - 1)), newParticle]);
        }
      }
    }

    // Continuous spawning with profile-specific types
    for (let i = 0; i < particlesToSpawn && i < 5; i++) {
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 12
      );
      
      // Use profile distribution for continuous spawning
      const particleType = selectParticleType();
      const newParticle = createParticle(particleType, position, 'continuous');
      newParticle.velocity.multiplyScalar(physicsParams.movementMultiplier);
      
      setParticles(prev => [...prev.slice(-(maxParticles - 1)), newParticle]);
    }
  }, [audioData, createParticle, maxParticles, getProfileParticleDistribution, getProfilePhysicsParams, visualDNAProfile]);

  // Apply physics forces to a particle
  const applyPhysicsForces = useCallback((particle: Particle, deltaTime: number) => {
    const physicsParams = getProfilePhysicsParams();
    
    // Reset acceleration
    particle.acceleration.set(0, 0, 0);

    // Gravity wells with profile-specific strength
    gravityWells.forEach(well => {
      const distance = particle.position.distanceTo(well.position);
      if (distance < well.radius && distance > 0.1) {
        const direction = well.position.clone().sub(particle.position).normalize();
        const force = (well.strength * physicsParams.gravityStrength / (distance * distance)) * particle.mass;
        particle.acceleration.add(direction.multiplyScalar(force));
      }
    });

    // Magnetic fields with profile-specific strength
    magneticFields.forEach(field => {
      const distance = particle.position.distanceTo(field.position);
      if (distance < field.radius) {
        const direction = field.position.clone().sub(particle.position);
        const perpendicular = direction.clone().cross(field.axis).normalize();
        const force = (field.strength * physicsParams.magneticStrength / (distance + 1)) * particle.mass;
        particle.acceleration.add(perpendicular.multiplyScalar(force));
      }
    });

    // Turbulence fields with profile-specific strength
    turbulenceFields.forEach(field => {
      const distance = particle.position.distanceTo(field.position);
      if (distance < field.radius) {
        const noise = Math.sin(field.phase + particle.position.x * field.frequency) * 
                     Math.cos(field.phase + particle.position.y * field.frequency) * 
                     Math.sin(field.phase + particle.position.z * field.frequency);
        const force = noise * field.strength * physicsParams.turbulenceStrength * (1 - distance / field.radius);
        
        particle.acceleration.add(new THREE.Vector3(
          Math.sin(field.phase + particle.id * 0.1) * force,
          Math.cos(field.phase + particle.id * 0.1) * force,
          Math.sin(field.phase + particle.id * 0.05) * force
        ));
      }
    });

    // Air resistance/drag
    const drag = particle.velocity.clone().multiplyScalar(-0.02);
    particle.acceleration.add(drag);

    // Audio reactivity with profile-specific intensity
    if (audioData.audioLevel > 0) {
      const profileReactivity = visualDNAProfile?.reactivity.harmony || 1.0;
      const audioForce = new THREE.Vector3(
        (Math.random() - 0.5) * audioData.audioLevel * particle.audioReactivity * profileReactivity,
        (Math.random() - 0.5) * audioData.audioLevel * particle.audioReactivity * profileReactivity,
        (Math.random() - 0.5) * audioData.audioLevel * particle.audioReactivity * profileReactivity
      );
      particle.acceleration.add(audioForce);
    }
  }, [gravityWells, magneticFields, turbulenceFields, audioData, getProfilePhysicsParams, visualDNAProfile]);

  // Update particle lifecycle
  const updateParticleLifecycle = useCallback((particle: Particle, deltaTime: number) => {
    // Age the particle
    particle.age += deltaTime;
    const ageRatio = particle.age / particle.maxAge;

    // Kill old particles
    if (ageRatio >= 1.0 || particle.position.length() > 50) {
      particle.isAlive = false;
      return;
    }

    // Interpolate size
    particle.size = THREE.MathUtils.lerp(particle.startSize, particle.endSize, ageRatio);

    // Interpolate color (HSL)
    particle.color.h = THREE.MathUtils.lerp(particle.startColor.h, particle.endColor.h, ageRatio);
    particle.color.s = THREE.MathUtils.lerp(particle.startColor.s, particle.endColor.s, ageRatio);
    particle.color.l = THREE.MathUtils.lerp(particle.startColor.l, particle.endColor.l, ageRatio);

    // Calculate alpha based on age and particle type
    switch (particle.type) {
      case ParticleType.SPARK:
        particle.alpha = Math.max(0, 1 - ageRatio * ageRatio);
        break;
      case ParticleType.SMOKE:
        particle.alpha = Math.max(0, 0.8 * (1 - ageRatio));
        break;
      case ParticleType.LIQUID:
        particle.alpha = Math.max(0, 0.9 * (1 - ageRatio * 0.7));
        break;
      case ParticleType.ENERGY_TRAIL:
        particle.alpha = Math.max(0, 1 - ageRatio * ageRatio * ageRatio);
        break;
      case ParticleType.GEOMETRIC:
        particle.alpha = Math.max(0, 0.8 * (1 - ageRatio));
        break;
      case ParticleType.PIXEL:
        // Pixels maintain higher alpha longer for reflectivity, then fade smoothly
        particle.alpha = Math.max(0.1, 0.95 * (1 - ageRatio * 0.8));
        // Add subtle shimmer effect by modulating alpha slightly
        particle.alpha *= (1 + Math.sin(Date.now() * 0.01 + particle.id) * 0.1);
        break;
    }

    // Update trail for energy trail particles
    if (particle.type === ParticleType.ENERGY_TRAIL && particle.trail) {
      particle.trail.push(particle.position.clone());
      if (particle.trail.length > 10) {
        particle.trail.shift();
      }
    }
  }, []);

  // Collision detection (simplified)
  const handleCollisions = useCallback((particles: Particle[]) => {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        
        if (!p1.isAlive || !p2.isAlive) continue;
        
        const distance = p1.position.distanceTo(p2.position);
        const minDistance = p1.size + p2.size;
        
        if (distance < minDistance) {
          // Simple elastic collision
          const collision = p2.position.clone().sub(p1.position).normalize();
          const relativeVelocity = p1.velocity.clone().sub(p2.velocity);
          const speed = relativeVelocity.dot(collision);
          
          if (speed < 0) continue; // Objects separating
          
          const impulse = 2 * speed / (p1.mass + p2.mass);
          p1.velocity.sub(collision.clone().multiplyScalar(impulse * p2.mass));
          p2.velocity.add(collision.clone().multiplyScalar(impulse * p1.mass));
          
          // Separate particles
          const overlap = minDistance - distance;
          const separation = collision.multiplyScalar(overlap * 0.5);
          p1.position.sub(separation);
          p2.position.add(separation);
        }
      }
    }
  }, []);

  // LOD calculation
  const calculateLOD = useCallback(() => {
    if (!enableLOD) return LODLevel.HIGH;
    
    const cameraPos = cameraPosition || camera.position;
    const distance = cameraPos.length();
    
    if (distance < 10) return LODLevel.HIGH;
    if (distance < 20) return LODLevel.MEDIUM;
    return LODLevel.LOW;
  }, [enableLOD, cameraPosition, camera.position]);

  // Main update loop
  useFrame((state, deltaTime) => {
    const clampedDelta = Math.min(deltaTime, 1/30); // Cap delta time
    
    // Update LOD
    const newLOD = calculateLOD();
    if (newLOD !== currentLOD) {
      setCurrentLOD(newLOD);
    }

    // Update turbulence field phases
    turbulenceFields.forEach(field => {
      field.phase += clampedDelta * field.frequency;
    });

    // Spawn new particles
    spawnAudioReactiveParticles(clampedDelta);

    // Update existing particles
    setParticles(prevParticles => {
      const updatedParticles = prevParticles.map(particle => {
        if (!particle.isAlive) return particle;

        // Apply physics
        applyPhysicsForces(particle, clampedDelta);
        
        // Update velocity and position
        particle.velocity.add(particle.acceleration.clone().multiplyScalar(clampedDelta));
        particle.position.add(particle.velocity.clone().multiplyScalar(clampedDelta));
        
        // Update lifecycle
        updateParticleLifecycle(particle, clampedDelta);
        
        return particle;
      });

      // Handle collisions (expensive, only do on high LOD)
      if (currentLOD === LODLevel.HIGH) {
        handleCollisions(updatedParticles);
      }

      // Remove dead particles
      return updatedParticles.filter(p => p.isAlive);
    });
  });

  // Render instanced meshes based on LOD
  const getParticleCount = useCallback((type: ParticleType) => {
    const typeParticles = particles.filter(p => p.type === type && p.isAlive);
    
    switch (currentLOD) {
      case LODLevel.HIGH: return typeParticles.length;
      case LODLevel.MEDIUM: return Math.floor(typeParticles.length * 0.7);
      case LODLevel.LOW: return Math.floor(typeParticles.length * 0.4);
      default: return typeParticles.length;
    }
  }, [particles, currentLOD]);

  // Update instanced meshes
  React.useEffect(() => {
    const updateInstancedMesh = (
      mesh: React.RefObject<THREE.InstancedMesh | null>,
      particleType: ParticleType
    ) => {
      if (!mesh.current) return;
      
      const typeParticles = particles.filter(p => p.type === particleType && p.isAlive);
      const count = getParticleCount(particleType);
      
      if (count === 0) return;
      
      const matrix = new THREE.Matrix4();
      const color = new THREE.Color();
      
      for (let i = 0; i < count && i < typeParticles.length; i++) {
        const particle = typeParticles[i];
        
        // Set matrix (position, rotation, scale)
        matrix.makeScale(particle.size, particle.size, particle.size);
        matrix.setPosition(particle.position);
        mesh.current.setMatrixAt(i, matrix);
        
        // Set color
        color.setHSL(particle.color.h / 360, particle.color.s, particle.color.l);
        color.multiplyScalar(particle.alpha);
        mesh.current.setColorAt(i, color);
      }
      
      mesh.current.instanceMatrix.needsUpdate = true;
      if (mesh.current.instanceColor) {
        mesh.current.instanceColor.needsUpdate = true;
      }
    };

    updateInstancedMesh(sparkInstancedMesh, ParticleType.SPARK);
    updateInstancedMesh(smokeInstancedMesh, ParticleType.SMOKE);
    updateInstancedMesh(liquidInstancedMesh, ParticleType.LIQUID);
    updateInstancedMesh(geometricInstancedMesh, ParticleType.GEOMETRIC);
    updateInstancedMesh(pixelInstancedMesh, ParticleType.PIXEL);
  }, [particles, currentLOD, getParticleCount]);

  // Render energy trails separately
  const energyTrailParticles = particles.filter(p => p.type === ParticleType.ENERGY_TRAIL && p.isAlive && p.trail);

  return (
    <group ref={groupRef}>
      {/* Instanced meshes for performance */}
      <instancedMesh
        ref={sparkInstancedMesh}
        args={[geometries.spark, materials.spark, Math.max(1, getParticleCount(ParticleType.SPARK))]}
      />
      
      <instancedMesh
        ref={smokeInstancedMesh}
        args={[geometries.smoke, materials.smoke, Math.max(1, getParticleCount(ParticleType.SMOKE))]}
      />
      
      <instancedMesh
        ref={liquidInstancedMesh}
        args={[geometries.liquid, materials.liquid, Math.max(1, getParticleCount(ParticleType.LIQUID))]}
      />
      
      <instancedMesh
        ref={geometricInstancedMesh}
        args={[geometries.geometric, materials.geometric, Math.max(1, getParticleCount(ParticleType.GEOMETRIC))]}
      />
      
      <instancedMesh
        ref={pixelInstancedMesh}
        args={[geometries.pixel, materials.pixel, Math.max(1, getParticleCount(ParticleType.PIXEL))]}
      />

      {/* Energy trails rendered as line segments */}
      {energyTrailParticles.map(particle => (
        particle.trail && particle.trail.length > 1 && (
          <line key={particle.id}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array(particle.trail.flatMap(v => [v.x, v.y, v.z])), 3]}
                count={particle.trail.length}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color={new THREE.Color().setHSL(particle.color.h / 360, particle.color.s, particle.color.l)}
              transparent
              opacity={particle.alpha}
              blending={THREE.AdditiveBlending}
            />
          </line>
        )
      ))}
    </group>
  );
}; 
