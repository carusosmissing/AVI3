import React, { useState } from 'react';
import { VisualDNASystem } from '../ai/visual-dna-system';

interface ProfileSelectorProps {
  visualDNA: VisualDNASystem;
  currentProfileId: string;
}

export const VisualDNAProfileSelector: React.FC<ProfileSelectorProps> = ({
  visualDNA,
  currentProfileId
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const profiles = visualDNA.getProfileList();
  const isManualMode = visualDNA.isManualMode();

  const handleProfileSelect = (profileId: string) => {
    visualDNA.selectProfileManually(profileId);
    setIsExpanded(false);
  };

  const handleToggleMode = () => {
    visualDNA.toggleManualMode();
  };

  // Profile color schemes for visual identification
  const profileColors: { [key: string]: { primary: string; accent: string } } = {
    'neon-pulse': { primary: '#FF006E', accent: '#3A86FF' },
    'liquid-dreams': { primary: '#7209B7', accent: '#F72585' },
    'crystal-matrix': { primary: '#00F5FF', accent: '#FF00F5' },
    'urban-chaos': { primary: '#FF4500', accent: '#FFD700' },
    'digital-garden': { primary: '#2ECC71', accent: '#E74C3C' },
    'void-walker': { primary: '#FF0000', accent: '#FFFFFF' },
    'cosmic-voyage': { primary: '#4B0082', accent: '#FF1493' },
    'retro-wave': { primary: '#FF0080', accent: '#00FFFF' },
    'neural-network': { primary: '#00FF41', accent: '#FF0040' },
    'ocean-deep': { primary: '#006994', accent: '#0C7489' }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      zIndex: 1000,
      fontFamily: 'monospace'
    }}>
      {/* Main Control Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          background: 'rgba(0, 0, 0, 0.9)',
          border: `2px solid ${isManualMode ? '#ffa502' : '#2ed573'}`,
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          transition: 'all 0.3s ease',
          boxShadow: `0 0 20px ${isManualMode ? 'rgba(255, 165, 2, 0.5)' : 'rgba(46, 213, 115, 0.5)'}`
        }}
      >
        <span style={{ fontSize: '18px' }}>🧬</span>
        <span>{isManualMode ? 'Manual Mode' : 'Auto Mode'}</span>
        <span style={{ fontSize: '12px' }}>{isExpanded ? '▼' : '▶'}</span>
      </button>

      {/* Profile List */}
      {isExpanded && (
        <div style={{
          marginTop: '10px',
          background: 'rgba(0, 0, 0, 0.95)',
          border: '2px solid #333',
          borderRadius: '12px',
          padding: '15px',
          maxHeight: '70vh',
          overflowY: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8)'
        }}>
          <div style={{ color: '#fff', fontSize: '16px', marginBottom: '15px', fontWeight: 'bold' }}>
            Visual DNA Profiles
          </div>

          {/* Manual/Auto Mode Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            padding: '15px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            border: '1px solid #444'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>
                {isManualMode ? '🎛️' : '🤖'}
              </span>
              <div>
                <div style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
                  {isManualMode ? 'Manual Control' : 'Automatic Selection'}
                </div>
                <div style={{ color: '#999', fontSize: '11px' }}>
                  {isManualMode ? 'You control profile changes' : 'AI selects based on music'}
                </div>
              </div>
            </div>
            
            {/* Toggle Switch */}
            <button
              onClick={handleToggleMode}
              style={{
                background: isManualMode ? '#ffa502' : '#2ed573',
                border: 'none',
                borderRadius: '20px',
                width: '60px',
                height: '30px',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: `0 0 10px ${isManualMode ? 'rgba(255, 165, 2, 0.5)' : 'rgba(46, 213, 115, 0.5)'}`
              }}
            >
              <div style={{
                position: 'absolute',
                top: '3px',
                left: isManualMode ? '33px' : '3px',
                width: '24px',
                height: '24px',
                background: 'white',
                borderRadius: '50%',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }} />
            </button>
          </div>

          {/* Profile Grid */}
          <div style={{
            display: 'grid',
            gap: '10px',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))'
          }}>
            {profiles.map((profile) => {
              const colors = profileColors[profile.id] || { primary: '#fff', accent: '#999' };
              const isActive = profile.id === currentProfileId;
              
              return (
                <button
                  key={profile.id}
                  onClick={() => handleProfileSelect(profile.id)}
                  disabled={!isManualMode}
                  style={{
                    background: isActive 
                      ? `linear-gradient(135deg, ${colors.primary}40, ${colors.accent}40)`
                      : 'rgba(255, 255, 255, 0.05)',
                    border: `2px solid ${isActive ? colors.primary : '#444'}`,
                    borderRadius: '8px',
                    padding: '12px',
                    cursor: isManualMode ? 'pointer' : 'not-allowed',
                    transition: 'all 0.3s ease',
                    textAlign: 'left',
                    position: 'relative',
                    overflow: 'hidden',
                    opacity: isManualMode ? 1 : 0.5
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive && isManualMode) {
                      e.currentTarget.style.background = `linear-gradient(135deg, ${colors.primary}20, ${colors.accent}20)`;
                      e.currentTarget.style.borderColor = colors.primary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive && isManualMode) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = '#444';
                    }
                  }}
                >
                  {/* Active Indicator */}
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      top: '5px',
                      right: '5px',
                      width: '8px',
                      height: '8px',
                      background: colors.primary,
                      borderRadius: '50%',
                      boxShadow: `0 0 10px ${colors.primary}`
                    }} />
                  )}

                  {/* Profile Name */}
                  <div style={{
                    color: colors.primary,
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '5px'
                  }}>
                    {profile.name}
                  </div>

                  {/* Profile Description */}
                  <div style={{
                    color: '#aaa',
                    fontSize: '11px',
                    lineHeight: '1.3',
                    marginBottom: '8px'
                  }}>
                    {profile.description}
                  </div>

                  {/* Mood Tags */}
                  <div style={{
                    display: 'flex',
                    gap: '5px',
                    flexWrap: 'wrap'
                  }}>
                    {profile.moodTags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          background: `${colors.accent}30`,
                          color: colors.accent,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '9px',
                          border: `1px solid ${colors.accent}50`
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Updated Info Text */}
          <div style={{
            marginTop: '15px',
            padding: '10px',
            background: isManualMode ? 'rgba(255, 165, 2, 0.1)' : 'rgba(46, 213, 115, 0.1)',
            border: `1px solid ${isManualMode ? '#ffa502' : '#2ed573'}`,
            borderRadius: '6px',
            fontSize: '11px',
            color: isManualMode ? '#ffa502' : '#2ed573'
          }}>
            {isManualMode ? (
              <>
                🎛️ <strong>Manual Mode:</strong> Click any profile to instantly switch. Toggle to Auto Mode for AI-driven selection based on music analysis.
              </>
            ) : (
              <>
                🤖 <strong>Auto Mode:</strong> Profiles automatically change based on music analysis. Toggle to Manual Mode to take control.
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 