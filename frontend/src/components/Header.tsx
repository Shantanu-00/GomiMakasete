'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Clock, 
  ChevronDown, 
  MapPin, 
  Check, 
  RefreshCw,
  Search,
  Globe,
  Building
} from 'lucide-react';
import { UserProfile, MunicipalityOption, NeighborhoodOption } from '@/lib/types';
import { AppLanguage, TRANSLATIONS } from '@/lib/translations';

interface HeaderProps {
  activeModel: string;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  activeProfile: UserProfile;
  profiles: UserProfile[];
  municipalities: MunicipalityOption[];
  neighborhoods: NeighborhoodOption[];
  selectedNeighborhoodId: string;
  onSelectProfile: (profileId: string) => void;
  onSelectNeighborhood: (neighId: string) => void;
  onOpenHistoryDrawer: () => void;
  onRefreshFromDatabase: () => void;
  isRefreshing: boolean;
  language: AppLanguage;
  onChangeLanguage: (lang: AppLanguage) => void;
}

export default function Header({
  activeModel,
  voiceEnabled,
  onToggleVoice,
  activeProfile,
  profiles,
  municipalities,
  neighborhoods,
  selectedNeighborhoodId,
  onSelectProfile,
  onSelectNeighborhood,
  onOpenHistoryDrawer,
  onRefreshFromDatabase,
  isRefreshing,
  language,
  onChangeLanguage
}: HeaderProps) {
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [neighDropdownOpen, setNeighDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [neighSearch, setNeighSearch] = useState('');

  const cityRef = useRef<HTMLDivElement>(null);
  const neighRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

  const t = TRANSLATIONS[language];

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setCityDropdownOpen(false);
      }
      if (neighRef.current && !neighRef.current.contains(e.target as Node)) {
        setNeighDropdownOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeNeigh = neighborhoods.find(n => n.neighborhood_id === selectedNeighborhoodId) || neighborhoods[0];

  const filteredNeighborhoods = neighborhoods.filter(n => {
    if (!neighSearch.trim()) return true;
    const q = neighSearch.toLowerCase();
    return n.name_en.toLowerCase().includes(q) || n.name_ja.includes(q) || (n.postal_code && n.postal_code.includes(q));
  });

  // Current Municipality Object
  const currentMuni = municipalities.find(m => m.id === activeProfile.municipality_id) || municipalities[0];

  return (
    <header className="header-wrap">
      <div className="header-container">
        {/* Left: Brand & Mascot */}
        <div className="brand-badge">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mascot.jpg"
            alt="Gomi-chan Mascot"
            className="logo-mascot-thumb"
          />
          <div>
            <div className="brand-title">
              <span>GomiMakasete</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--accent-green)', fontWeight: 800 }}>
                ゴミ？まかせて！
              </span>
            </div>
            <p className="brand-sub">
              {t.brand_sub}
            </p>
          </div>
        </div>

        {/* Right Controls: Single Row Layout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          
          {/* --- INTEGRATED CITY & NEIGHBORHOOD SELECTION MODULE --- */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#F8FAFC',
            border: '2px solid #0F172A',
            borderRadius: '12px',
            padding: '3px 4px',
            boxShadow: '2px 2px 0 #0F172A',
            gap: '4px'
          }}>
            {/* 1. PRIMARY CITY / JURISDICTION SELECTOR */}
            <div ref={cityRef} style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setCityDropdownOpen(!cityDropdownOpen);
                  setNeighDropdownOpen(false);
                  setLangDropdownOpen(false);
                }}
                style={{
                  padding: '5px 10px',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#FFFFFF',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.1s ease'
                }}
                title="Select City (Primary Jurisdiction)"
              >
                <span style={{ fontSize: '1rem' }}>{currentMuni?.icon || '🏙️'}</span>
                <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
                  <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.82rem' }}>
                    {activeProfile.municipality_name}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#64748B' }}>
                    Profile: {activeProfile.name}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-1" />
              </button>

              {/* City Selection Popover */}
              {cityDropdownOpen && (
                <div className="tactile-popover" style={{ width: '300px' }}>
                  <div style={{ padding: '8px 12px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '0.7rem', fontWeight: 800, color: '#64748B' }}>
                    SELECT CITY / 自治体選択
                  </div>
                  <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                    {profiles.map((p) => {
                      const isSelected = p.id === activeProfile.id;
                      const muni = municipalities.find(m => m.id === p.municipality_id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            onSelectProfile(p.id);
                            setCityDropdownOpen(false);
                          }}
                          className={`tactile-menu-item ${isSelected ? 'active' : ''}`}
                          style={{ borderBottom: '1px solid #F1F5F9', padding: '9px 12px' }}
                        >
                          <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>
                            {muni?.icon || '🏙️'}
                          </span>
                          <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0F172A' }}>
                              {p.municipality_name}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                              Resident: {p.name} • {p.neighborhood}
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 2. MATCHING NEIGHBORHOOD SELECTOR */}
            <div ref={neighRef} style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setNeighDropdownOpen(!neighDropdownOpen);
                  setCityDropdownOpen(false);
                  setLangDropdownOpen(false);
                }}
                style={{
                  padding: '5px 10px',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#FFFFFF',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  maxWidth: '180px',
                  transition: 'all 0.1s ease'
                }}
                title="Select Neighborhood Area"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span style={{
                  fontWeight: 700,
                  color: '#0F172A',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: '0.8rem'
                }}>
                  {activeNeigh ? activeNeigh.name_en : 'Select Area'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              </button>

              {/* Neighborhood Popover */}
              {neighDropdownOpen && (
                <div className="tactile-popover" style={{ width: '310px' }}>
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Search className="w-3.5 h-3.5 text-slate-400" style={{ position: 'absolute', left: '8px' }} />
                      <input
                        type="text"
                        value={neighSearch}
                        onChange={(e) => setNeighSearch(e.target.value)}
                        placeholder="Search area (e.g. Arakicho, 愛住町)..."
                        style={{
                          width: '100%',
                          padding: '6px 8px 6px 28px',
                          fontSize: '0.78rem',
                          border: '1.5px solid #CBD5E1',
                          borderRadius: '8px',
                          outline: 'none',
                          fontFamily: 'inherit'
                        }}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                    {filteredNeighborhoods.length === 0 ? (
                      <div style={{ padding: '16px', fontSize: '0.78rem', color: '#94A3B8', textAlign: 'center' }}>
                        No matching neighborhood found
                      </div>
                    ) : (
                      filteredNeighborhoods.map((n) => {
                        const isSelected = n.neighborhood_id === selectedNeighborhoodId;
                        return (
                          <button
                            key={n.neighborhood_id}
                            onClick={() => {
                              onSelectNeighborhood(n.neighborhood_id);
                              setNeighDropdownOpen(false);
                              setNeighSearch('');
                            }}
                            className={`tactile-menu-item ${isSelected ? 'active' : ''}`}
                            style={{ borderBottom: '1px solid #F1F5F9', padding: '8px 12px' }}
                          >
                            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                              <div style={{ fontWeight: isSelected ? 800 : 600, fontSize: '0.8rem', color: '#0F172A' }}>
                                {n.name_en}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#64748B', display: 'flex', gap: '6px', marginTop: '1px' }}>
                                <span>{n.name_ja}</span>
                                {n.postal_code && <span>• 〒{n.postal_code}</span>}
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 3. CIRCULAR REFRESH FETCH BUTTON (INSIDE THE MODULE) */}
            <button
              onClick={onRefreshFromDatabase}
              disabled={isRefreshing}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '1.5px solid #CBD5E1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#334155',
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0F172A';
                e.currentTarget.style.background = '#F0FDF4';
                e.currentTarget.style.color = '#00A86B';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.background = '#FFFFFF';
                e.currentTarget.style.color = '#334155';
              }}
              title="Fetch & Refresh live timetable from DynamoDB"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>

          {/* 4. HISTORY DRAWER BUTTON */}
          <button
            onClick={onOpenHistoryDrawer}
            className="btn btn-secondary"
            style={{
              padding: '6px 11px',
              fontSize: '0.78rem',
              border: '2px solid #0F172A',
              boxShadow: '2px 2px 0 #0F172A',
              borderRadius: '10px',
              background: '#FFFFFF'
            }}
            title="View past scans and triage sessions"
          >
            <Clock className="w-3.5 h-3.5 text-slate-700" />
            <span>{t.history_btn}</span>
          </button>

          {/* 5. CLEAN LANGUAGE SELECTOR (No repeating globe!) */}
          <div ref={langRef} style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setLangDropdownOpen(!langDropdownOpen);
                setCityDropdownOpen(false);
                setNeighDropdownOpen(false);
              }}
              className="btn btn-secondary"
              style={{
                padding: '6px 11px',
                fontSize: '0.78rem',
                border: '2px solid #0F172A',
                boxShadow: '2px 2px 0 #0F172A',
                borderRadius: '10px',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Change display language"
            >
              <Globe className="w-3.5 h-3.5 text-slate-700" />
              <span style={{ fontWeight: 800, color: '#0F172A' }}>
                {language === 'mix' ? 'EN / JP (Mix)' : language === 'ja' ? '日本語' : 'English'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {/* Language Dropdown Popover */}
            {langDropdownOpen && (
              <div className="tactile-popover" style={{ width: '180px', right: 0, left: 'auto' }}>
                <div style={{ padding: '6px 10px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '0.68rem', fontWeight: 800, color: '#64748B' }}>
                  LANGUAGE / 言語
                </div>
                <div>
                  <button
                    onClick={() => { onChangeLanguage('mix'); setLangDropdownOpen(false); }}
                    className={`tactile-menu-item ${language === 'mix' ? 'active' : ''}`}
                    style={{ fontSize: '0.78rem', padding: '8px 12px' }}
                  >
                    <span>EN / JP (Mix)</span>
                    {language === 'mix' && <Check className="w-3.5 h-3.5 text-emerald-600 ml-auto" />}
                  </button>

                  <button
                    onClick={() => { onChangeLanguage('ja'); setLangDropdownOpen(false); }}
                    className={`tactile-menu-item ${language === 'ja' ? 'active' : ''}`}
                    style={{ fontSize: '0.78rem', padding: '8px 12px' }}
                  >
                    <span>日本語 (Japanese)</span>
                    {language === 'ja' && <Check className="w-3.5 h-3.5 text-emerald-600 ml-auto" />}
                  </button>

                  <button
                    onClick={() => { onChangeLanguage('en'); setLangDropdownOpen(false); }}
                    className={`tactile-menu-item ${language === 'en' ? 'active' : ''}`}
                    style={{ fontSize: '0.78rem', padding: '8px 12px' }}
                  >
                    <span>English</span>
                    {language === 'en' && <Check className="w-3.5 h-3.5 text-emerald-600 ml-auto" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 6. AMBIENT VOICE TOGGLE */}
          <button
            onClick={onToggleVoice}
            className={`btn ${voiceEnabled ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '6px 11px',
              fontSize: '0.78rem',
              border: '2px solid #0F172A',
              boxShadow: '2px 2px 0 #0F172A',
              borderRadius: '10px'
            }}
            title={voiceEnabled ? 'Hands-free voice assistant is active' : 'Enable hands-free ambient voice'}
          >
            {voiceEnabled ? (
              <>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  <span className="soundwave-bar" style={{ height: '5px' }}></span>
                  <span className="soundwave-bar" style={{ height: '10px' }}></span>
                  <span className="soundwave-bar" style={{ height: '6px' }}></span>
                </div>
                <Mic className="w-3.5 h-3.5" />
                <span>Voice</span>
              </>
            ) : (
              <>
                <MicOff className="w-3.5 h-3.5 text-slate-500" />
                <span>Voice</span>
              </>
            )}
          </button>

        </div>
      </div>
    </header>
  );
}
