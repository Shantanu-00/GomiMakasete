'use client';

import React, { useState } from 'react';
import { UserProfile, MunicipalityOption } from '@/lib/types';
import { 
  X, 
  User, 
  Check, 
  Plus, 
  MapPin, 
  ShieldCheck, 
  Home, 
  Building2,
  Sparkles
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: UserProfile[];
  activeProfile: UserProfile;
  municipalities?: MunicipalityOption[];
  onSelectProfile: (profileId: string) => void;
  onSaveProfile: (profile: UserProfile) => void;
}

const MUNICIPALITY_NAMES: Record<string, string> = {
  tokyo_shinjuku: 'Shinjuku City (新宿区)',
  kanagawa_yokohama: 'Yokohama City (横浜市)',
  kyoto_kyoto: 'Kyoto City (京都市)',
  tokushima_kamikatsu: 'Kamikatsu Town (上勝町)'
};

const MUNICIPALITY_COLORS: Record<string, string> = {
  tokyo_shinjuku: '#00A86B',
  kanagawa_yokohama: '#0284C7',
  kyoto_kyoto: '#D97706',
  tokushima_kamikatsu: '#059669'
};

export default function ProfileModal({
  isOpen,
  onClose,
  profiles,
  activeProfile,
  onSelectProfile,
  onSaveProfile
}: ProfileModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [municipalityId, setMunicipalityId] = useState<'tokyo_shinjuku' | 'kanagawa_yokohama' | 'kyoto_kyoto' | 'tokushima_kamikatsu'>('tokyo_shinjuku');
  const [neighborhood, setNeighborhood] = useState('');
  const [banchi, setBanchi] = useState('');

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newProfile: UserProfile = {
      id: `user_${Date.now()}`,
      name: name.trim(),
      avatar_color: MUNICIPALITY_COLORS[municipalityId] || '#00A86B',
      municipality_id: municipalityId,
      municipality_name: MUNICIPALITY_NAMES[municipalityId] || 'Shinjuku City (新宿区)',
      neighborhood: neighborhood.trim() || (municipalityId === 'tokyo_shinjuku' ? 'Arakicho' : municipalityId === 'kanagawa_yokohama' ? 'Minato Mirai' : municipalityId === 'kyoto_kyoto' ? 'Gionmachi' : 'Kamikatsu All'),
      banchi: banchi.trim() || '1',
      created_at: new Date().toISOString()
    };

    onSaveProfile(newProfile);
    onSelectProfile(newProfile.id);
    setIsCreating(false);
    setName('');
    setNeighborhood('');
    setBanchi('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '540px' }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Resident Profiles</span>
              <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>4 Jurisdictions</span>
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
              Select a resident to load their municipal sorting timetable and past scans.
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              background: '#F1F5F9', 
              border: '2px solid #0F172A', 
              borderRadius: '8px', 
              padding: '6px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X className="w-4 h-4 text-slate-800" />
          </button>
        </div>

        {/* Profiles List */}
        {!isCreating ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {profiles.map((profile) => {
              const isActive = profile.id === activeProfile.id;
              const color = profile.avatar_color || MUNICIPALITY_COLORS[profile.municipality_id] || '#00A86B';

              return (
                <div
                  key={profile.id}
                  onClick={() => {
                    onSelectProfile(profile.id);
                    onClose();
                  }}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: `2px solid ${isActive ? '#0F172A' : '#E2E8F0'}`,
                    background: isActive ? '#F0FDF4' : '#FFFFFF',
                    boxShadow: isActive ? '3px 3px 0 #0F172A' : '0 1px 3px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: color,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1rem',
                      border: '2px solid #0F172A',
                      boxShadow: '2px 2px 0 #0F172A',
                      flexShrink: 0
                    }}>
                      {profile.name.charAt(0)}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>
                          {profile.name}
                        </span>
                        {isActive && (
                          <span className="badge badge-green" style={{ fontSize: '0.62rem' }}>
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', fontSize: '0.75rem', color: '#64748B' }}>
                        <MapPin className="w-3.5 h-3.5" style={{ color }} />
                        <span style={{ fontWeight: 600 }}>{profile.municipality_name}</span>
                        <span>•</span>
                        <span>{profile.neighborhood}</span>
                      </div>
                    </div>
                  </div>

                  {isActive ? (
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: '#00A86B',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '5px 10px', fontSize: '0.72rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProfile(profile.id);
                        onClose();
                      }}
                    >
                      Select
                    </button>
                  )}
                </div>
              );
            })}

            {/* Create Profile Button */}
            <button
              onClick={() => setIsCreating(true)}
              style={{
                marginTop: '6px',
                padding: '10px',
                borderRadius: '12px',
                border: '2px dashed #CBD5E1',
                background: '#F8FAFC',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 700,
                fontSize: '0.82rem',
                color: '#475569',
                transition: 'all 0.15s ease'
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Resident Profile</span>
            </button>
          </div>
        ) : (
          /* Create Profile Form */
          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Resident Name (e.g. Jane, Kenji, Alex)
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '2px solid #CBD5E1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Municipality (Rules Jurisdiction)
              </label>
              <select
                value={municipalityId}
                onChange={(e) => setMunicipalityId(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '2px solid #CBD5E1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  fontFamily: 'inherit',
                  background: '#FFF'
                }}
              >
                <option value="tokyo_shinjuku">🏙️ Tokyo - Shinjuku City (新宿区)</option>
                <option value="kanagawa_yokohama">🌊 Kanagawa - Yokohama City (横浜市)</option>
                <option value="kyoto_kyoto">⛩️ Kyoto - Kyoto City (京都市)</option>
                <option value="tokushima_kamikatsu">🍃 Tokushima - Kamikatsu Town (上勝町)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Neighborhood / Chome
                </label>
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder={
                    municipalityId === 'tokyo_shinjuku' ? 'Arakicho, Nishi-Shinjuku' :
                    municipalityId === 'kanagawa_yokohama' ? 'Minato Mirai, Yamashita' :
                    municipalityId === 'kyoto_kyoto' ? 'Gionmachi, Kawaramachi' : 'All Districts'
                  }
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '2px solid #CBD5E1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Banchi
                </label>
                <input
                  type="text"
                  value={banchi}
                  onChange={(e) => setBanchi(e.target.value)}
                  placeholder="22"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '2px solid #CBD5E1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2 }}
              >
                Save Profile
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
