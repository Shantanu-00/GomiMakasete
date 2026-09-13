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
  language = 'en',
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
    <header className="header-wrap" style={{ padding: '8px 0', borderBottom: '2px solid #0F172A', background: '#FFFFFF' }}>
      <div 
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        {/* 1. BRAND SECTION (LEFT) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/mascot.jpg"
            alt="GomiMakasete Mascot"
            className="logo-mascot-thumb"
            style={{ width: '40px', height: '40px', borderRadius: '10px', border: '2px solid #0F172A', boxShadow: '2px 2px 0 #0F172A' }}
          />
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>GomiMakasete</span>
              {language === 'ja' && (
                <span style={{ fontSize: '0.8rem', color: '#00A86B', fontWeight: 800 }}>
                  ゴミ？まかせて！
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>
              Autonomous Japanese Waste Intelligence
            </div>
          </div>
        </div>

        {/* 2. DECOUPLED CITY & NEIGHBORHOOD BOXES (CENTER / NEAR EACH OTHER) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          {/* BOX 1: CITY SELECTOR (STANDALONE BOX) */}
          <div ref={cityRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                setCityDropdownOpen(!cityDropdownOpen);
                setNeighDropdownOpen(false);
                setLangDropdownOpen(false);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                background: '#FFFFFF',
                border: '2px solid #0F172A',
                boxShadow: '2px 2px 0 #0F172A',
                borderRadius: '10px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.82rem',
                fontWeight: 800,
                color: '#0F172A',
                transition: 'all 0.15s ease'
              }}
              title="Select City / Municipality"
            >
              <span style={{ fontSize: '1.05rem', flexShrink: 0 }}>{currentMuni?.icon || '🏙️'}</span>
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  {activeProfile.municipality_name}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600 }}>
                  City / Ward
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            </button>

            {/* City Selection Popover WITH Integrated DynamoDB Sync Button */}
            {cityDropdownOpen && (
              <div className="tactile-popover" style={{ width: '310px', maxWidth: '90vw', left: 0, right: 'auto', zIndex: 100 }}>
                {/* Popover Header with DynamoDB Refresh Action */}
                <div style={{
                  padding: '8px 12px',
                  background: '#F8FAFC',
                  borderBottom: '1.5px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#0F172A' }}>
                      SELECT CITY / WARD
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#64748B' }}>
                      DynamoDB 178 Neighborhoods
                    </div>
                  </div>

                  {/* Dedicated Sync Button Relocated Inside City Box */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefreshFromDatabase();
                    }}
                    disabled={isRefreshing}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 8px',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      borderRadius: '6px',
                      background: isRefreshing ? '#F0FDF4' : '#FFFFFF',
                      color: isRefreshing ? '#00A86B' : '#0F172A',
                      border: '1.5px solid #0F172A',
                      boxShadow: '1.5px 1.5px 0 #0F172A',
                      cursor: isRefreshing ? 'wait' : 'pointer',
                      transition: 'all 0.1s ease',
                      flexShrink: 0
                    }}
                    title="Fetch & Refresh live timetable from DynamoDB"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
                    <span>{isRefreshing ? 'Syncing...' : 'Sync DB'}</span>
                  </button>
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

          {/* BOX 2: NEIGHBORHOOD SELECTOR (STANDALONE BOX) */}
          <div ref={neighRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                setNeighDropdownOpen(!neighDropdownOpen);
                setCityDropdownOpen(false);
                setLangDropdownOpen(false);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                background: '#FFFFFF',
                border: '2px solid #0F172A',
                boxShadow: '2px 2px 0 #0F172A',
                borderRadius: '10px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.82rem',
                fontWeight: 800,
                color: '#0F172A',
                transition: 'all 0.15s ease'
              }}
              title="Select Neighborhood Area"
            >
              <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{
                  fontWeight: 800,
                  color: '#0F172A',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: '0.8rem',
                  maxWidth: '160px'
                }}>
                  {activeNeigh ? activeNeigh.name_en : 'Select Area'}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 600 }}>
                  District / Chome
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            </button>

            {/* Neighborhood Popover */}
            {neighDropdownOpen && (
              <div className="tactile-popover" style={{ width: '310px', maxWidth: '90vw', left: 0, right: 'auto', zIndex: 100 }}>
                <div style={{ padding: '8px 10px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search className="w-3.5 h-3.5 text-slate-400" style={{ position: 'absolute', left: '8px' }} />
                    <input
                      type="text"
                      value={neighSearch}
                      onChange={(e) => setNeighSearch(e.target.value)}
                      placeholder="Search district (e.g. Kabukicho, Gion)..."
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
                      No matching district found
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
        </div>

        {/* 3. RIGHT CORNER CONTROLS (HISTORY, VOICE, AND LANGUAGE PINNED IN TOP RIGHT) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginLeft: 'auto'
        }}>
          {/* HISTORY BUTTON */}
          <button
            type="button"
            onClick={onOpenHistoryDrawer}
            className="btn btn-secondary"
            style={{
              padding: '6px 10px',
              fontSize: '0.76rem',
              border: '1.5px solid #0F172A',
              boxShadow: '2px 2px 0 #0F172A',
              borderRadius: '8px',
              background: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="View scan history"
          >
            <Clock className="w-3.5 h-3.5 text-slate-700" />
            <span>History</span>
          </button>

          {/* AMBIENT VOICE TOGGLE */}
          <button
            type="button"
            onClick={onToggleVoice}
            className={`btn ${voiceEnabled ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '6px 10px',
              fontSize: '0.76rem',
              border: '1.5px solid #0F172A',
              boxShadow: '2px 2px 0 #0F172A',
              borderRadius: '8px'
            }}
            title={voiceEnabled ? 'Voice assistant active' : 'Enable voice'}
          >
            {voiceEnabled ? (
              <>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                  <span className="soundwave-bar" style={{ height: '4px' }} />
                  <span className="soundwave-bar" style={{ height: '9px' }} />
                  <span className="soundwave-bar" style={{ height: '5px' }} />
                </div>
                <Mic className="w-3.5 h-3.5" />
              </>
            ) : (
              <MicOff className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>

          {/* LANGUAGE OPTION PINNED STRICTLY AT THE TOP RIGHT CORNER */}
          <div ref={langRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => {
                setLangDropdownOpen(!langDropdownOpen);
                setCityDropdownOpen(false);
                setNeighDropdownOpen(false);
              }}
              className="btn btn-secondary"
              style={{
                padding: '6px 10px',
                fontSize: '0.76rem',
                border: '1.5px solid #0F172A',
                boxShadow: '2px 2px 0 #0F172A',
                borderRadius: '8px',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Select display language"
            >
              <Globe className="w-3.5 h-3.5 text-slate-700" />
              <span style={{ fontWeight: 800, color: '#0F172A' }}>
                {language === 'ja' ? '日本語' : 'English'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {langDropdownOpen && (
              <div className="tactile-popover" style={{ width: '150px', right: 0, left: 'auto', zIndex: 100 }}>
                <div style={{ padding: '6px 10px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '0.68rem', fontWeight: 800, color: '#64748B' }}>
                  LANGUAGE
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => { onChangeLanguage('en'); setLangDropdownOpen(false); }}
                    className={`tactile-menu-item ${language === 'en' ? 'active' : ''}`}
                    style={{ fontSize: '0.78rem', padding: '8px 12px' }}
                  >
                    <span>English</span>
                    {language === 'en' && <Check className="w-3.5 h-3.5 text-emerald-600 ml-auto" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => { onChangeLanguage('ja'); setLangDropdownOpen(false); }}
                    className={`tactile-menu-item ${language === 'ja' ? 'active' : ''}`}
                    style={{ fontSize: '0.78rem', padding: '8px 12px' }}
                  >
                    <span>日本語</span>
                    {language === 'ja' && <Check className="w-3.5 h-3.5 text-emerald-600 ml-auto" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
