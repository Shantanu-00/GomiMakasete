'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ScannerSection from '@/components/ScannerSection';
import TriageDashboard from '@/components/TriageDashboard';
import SplashBuffer from '@/components/SplashBuffer';
import ProfileModal from '@/components/ProfileModal';
import HistoryDrawer from '@/components/HistoryDrawer';
import ChatBox from '@/components/ChatBox';
import AnalysisStepper from '@/components/AnalysisStepper';
import { 
  VisionScanResult, 
  DetectedItem, 
  UserProfile, 
  ScanHistoryRecord,
  MunicipalityOption,
  NeighborhoodOption
} from '@/lib/types';
import { AppLanguage, TRANSLATIONS } from '@/lib/translations';
import { 
  HARDCODED_MUNICIPALITIES, 
  ALL_HARDCODED_NEIGHBORHOODS, 
  getHardcodedNeighborhoodsFor 
} from '@/lib/municipalities-data';
import { determinePreparationPrescription, evaluateIntentSafeguard } from '@/lib/vision-engine';
import { 
  getActiveProfile, 
  getStoredProfiles, 
  setActiveProfileId, 
  saveProfile, 
  getScanHistory, 
  addScanHistoryRecord 
} from '@/lib/profile-store';
import { CheckCircle2, RefreshCw } from 'lucide-react';

export default function Home() {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [activePreset, setActivePreset] = useState<string>('messy_desk');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEscalating, setIsEscalating] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<VisionScanResult | null>(null);

  const [dailySpend, setDailySpend] = useState<number>(0.042);

  // Language state (mix, pure Japanese, pure English)
  const [language, setLanguage] = useState<AppLanguage>('mix');

  // DB Sync state & toast notification
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Profile & History States
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [scanHistory, setScanHistory] = useState<ScanHistoryRecord[]>([]);

  // 4 Municipalities & Hardcoded 178 Neighborhoods
  const [municipalities] = useState<MunicipalityOption[]>(HARDCODED_MUNICIPALITIES);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodOption[]>([]);

  // Initialize Profiles & Hardcoded Data
  useEffect(() => {
    const loadedProfiles = getStoredProfiles();
    const current = getActiveProfile();
    setProfiles(loadedProfiles);
    setActiveProfile(current);
    setScanHistory(getScanHistory(current.id));

    // Hardcode: load all neighborhoods for active municipality immediately (0ms)
    const initialNeighs = getHardcodedNeighborhoodsFor(current.municipality_id);
    setNeighborhoods(initialNeighs);

    // Load saved language if any
    const savedLang = localStorage.getItem('gomi_language') as AppLanguage;
    if (savedLang && (savedLang === 'mix' || savedLang === 'ja' || savedLang === 'en')) {
      setLanguage(savedLang);
    }
  }, []);

  const handleChangeLanguage = (newLang: AppLanguage) => {
    setLanguage(newLang);
    localStorage.setItem('gomi_language', newLang);
    speakText(newLang === 'ja' ? '言語を日本語に切り替えました。' : newLang === 'en' ? 'Language switched to English.' : 'Switched to Japanese and English mix.');
  };

  // Helper for Ambient Voice announcements
  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Initial Scan on Mount
  useEffect(() => {
    loadScan('messy_desk', false);
  }, []);

  const loadScan = async (presetKey: string, forceTier2: boolean = false) => {
    if (forceTier2) setIsEscalating(true);
    else setIsLoading(true);

    try {
      const resp = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: presetKey, forceTier2 })
      });

      if (resp.ok) {
        const data: VisionScanResult = await resp.json();
        setScanResult(data);
        setActivePreset(presetKey);

        if ((data as any).budget_info?.spent_today_usd) {
          setDailySpend(Number((data as any).budget_info.spent_today_usd));
        }

        const discardCount = data.items.filter(i => i.is_marked_for_disposal).length;
        const safeguardCount = data.items.filter(i => !i.is_marked_for_disposal).length;

        // Persist to local scan history scoped to active profile
        if (activeProfile) {
          const newRecord: ScanHistoryRecord = {
            id: `scan_${Date.now()}`,
            timestamp: new Date().toISOString(),
            profile_id: activeProfile.id,
            municipality_id: activeProfile.municipality_id,
            preset_used: presetKey,
            model_used: data.model_used,
            items_detected: data.items,
            discard_count: discardCount,
            safeguard_count: safeguardCount
          };
          addScanHistoryRecord(newRecord);
          setScanHistory(getScanHistory(activeProfile.id));
        }

        if (forceTier2) {
          speakText(`Tier-2 escalation complete. Analyzed with Claude 3.7 Sonnet. ${discardCount} items ready for disposal.`);
        } else {
          speakText(`Scan complete. Detected ${data.items.length} objects. ${safeguardCount} personal assets kept safe.`);
        }
      }
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setIsLoading(false);
      setIsEscalating(false);
    }
  };

  // Handler: Select Resident Profile (Merged with City Selection)
  const handleSelectProfile = (profileId: string) => {
    setActiveProfileId(profileId);
    const updated = getActiveProfile();
    setActiveProfile(updated);
    setScanHistory(getScanHistory(updated.id));

    // Instantly switch to hardcoded neighborhoods for this city (0ms)
    const newNeighs = getHardcodedNeighborhoodsFor(updated.municipality_id);
    setNeighborhoods(newNeighs);

    speakText(`Loaded profile for ${updated.name} in ${updated.municipality_name}.`);
  };

  // Handler: Select Neighborhood
  const handleSelectNeighborhood = (neighId: string) => {
    if (!activeProfile) return;
    const found = neighborhoods.find(n => n.neighborhood_id === neighId);
    if (!found) return;

    const updatedProfile: UserProfile = {
      ...activeProfile,
      neighborhood: found.name_en,
      neighborhood_id: found.neighborhood_id
    };

    setActiveProfile(updatedProfile);
    saveProfile(updatedProfile);
    speakText(`Timetable updated to ${found.name_en}.`);
  };

  // Handler: Refresh on-click only from Database
  const handleRefreshFromDatabase = async () => {
    if (!activeProfile) return;
    setIsRefreshing(true);

    try {
      const res = await fetch(`/api/neighborhoods?municipality_id=${activeProfile.municipality_id}`);
      if (res.ok) {
        const json = await res.json();
        setNeighborhoods(json.data);
        const t = TRANSLATIONS[language];
        setToastMessage(t.synced_toast);
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err) {
      console.error('Refresh error:', err);
      // Even if network fails, fallback to hardcoded
      setNeighborhoods(getHardcodedNeighborhoodsFor(activeProfile.municipality_id));
    } finally {
      setIsRefreshing(false);
    }
  };

  // Save new custom profile
  const handleSaveProfile = (newProfile: UserProfile) => {
    saveProfile(newProfile);
    const loaded = getStoredProfiles();
    setProfiles(loaded);
  };

  // Reload past scan from history drawer
  const handleSelectHistoryScan = (record: ScanHistoryRecord) => {
    if (!scanResult) return;
    setScanResult({
      ...scanResult,
      model_used: record.model_used,
      items: record.items_detected
    });
    setActivePreset(record.preset_used || 'custom');
    speakText(`Reloaded scan from ${new Date(record.timestamp).toLocaleDateString()}.`);
  };

  // Toggle item between Disposal and Keep
  const handleToggleDisposal = (id: string) => {
    if (!scanResult) return;

    let targetItemName = '';
    let willDispose = false;

    const updated = scanResult.items.map(item => {
      if (item.id === id) {
        targetItemName = item.name;
        willDispose = !item.is_marked_for_disposal;
        return { ...item, is_marked_for_disposal: willDispose };
      }
      return item;
    });

    setScanResult({
      ...scanResult,
      items: updated
    });

    if (willDispose) {
      speakText(`${targetItemName} marked for disposal.`);
    } else {
      speakText(`${targetItemName} moved to keep list.`);
    }
  };

  // Inline Item Update
  const handleUpdateItem = (id: string, newName: string, newDim: number) => {
    if (!scanResult) return;

    const updated = scanResult.items.map(item => {
      if (item.id === id) {
        const newPrep = determinePreparationPrescription(newName, item.material);
        return {
          ...item,
          name: newName,
          estimated_dim_cm: newDim,
          user_edited: true,
          preparation: newPrep
        };
      }
      return item;
    });

    setScanResult({
      ...scanResult,
      items: updated
    });
    speakText(`Updated ${newName}.`);
  };

  // Add Custom Missing Item
  const handleAddItem = (name: string, material: string, dim: number) => {
    if (!scanResult) return;

    const intent = evaluateIntentSafeguard(name);
    const prep = determinePreparationPrescription(name, material);

    const newItem: DetectedItem = {
      id: `custom-${Date.now()}`,
      name,
      description: 'Manually added by resident.',
      material,
      estimated_dim_cm: dim,
      confidence: 1.0,
      model_tier: scanResult.model_used as any,
      is_low_confidence: false,
      intent_category: intent.intent,
      is_marked_for_disposal: intent.intent === 'DISCARD_CANDIDATE',
      user_edited: true,
      preparation: prep
    };

    setScanResult({
      ...scanResult,
      items: [newItem, ...scanResult.items]
    });
    speakText(`Added ${name} to disposal list.`);
  };

  const handleToggleVoice = () => {
    const nextState = !voiceEnabled;
    setVoiceEnabled(nextState);
    if (nextState) {
      speakText('Ambient voice assistant enabled. I will announce scan results hands-free.');
    }
  };

  if (!activeProfile) return null;

  const currentNeighborhood = neighborhoods.find(
    n => n.neighborhood_id === activeProfile.neighborhood_id
  ) || neighborhoods[0];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toast Notification for DynamoDB Sync */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#0F172A',
          color: '#FFFFFF',
          padding: '10px 20px',
          borderRadius: '9999px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 9999,
          fontSize: '0.82rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '2px solid #00A86B'
        }}>
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Branded Free-Flowing Buffer Page with Bilingual Explanation */}
      {showSplash && (
        <SplashBuffer
          onComplete={() => setShowSplash(false)}
          municipalityName={activeProfile.municipality_name}
        />
      )}

      {/* 2. Light Theme Header with Merged Profile/City Selector & Language Selector */}
      <Header
        activeModel={scanResult?.model_used || 'Tier-1 (Nova 2 Lite)'}
        voiceEnabled={voiceEnabled}
        onToggleVoice={handleToggleVoice}
        activeProfile={activeProfile}
        profiles={profiles}
        municipalities={municipalities}
        neighborhoods={neighborhoods}
        selectedNeighborhoodId={activeProfile.neighborhood_id || (currentNeighborhood?.neighborhood_id ?? '')}
        onSelectProfile={handleSelectProfile}
        onSelectNeighborhood={handleSelectNeighborhood}
        onOpenHistoryDrawer={() => setShowHistoryDrawer(true)}
        onRefreshFromDatabase={handleRefreshFromDatabase}
        isRefreshing={isRefreshing}
        language={language}
        onChangeLanguage={handleChangeLanguage}
      />

      {/* 3. Main Body */}
      <main className="main-wrapper" style={{ flex: 1 }}>
        <ScannerSection
          onScanPreset={(key) => loadScan(key, false)}
          isLoading={isLoading || isEscalating}
          activePreset={activePreset}
          language={language}
        />

        {/* 2-Pass Pipeline Stepper showing exact steps & hard budget */}
        <AnalysisStepper
          isAnalyzing={isLoading}
          isEscalating={isEscalating}
          modelUsed={scanResult?.model_used || 'Tier-1 (Amazon Nova 2 Lite)'}
          latencyMs={scanResult?.latency_ms || 280}
          safeguardCount={scanResult?.items.filter(i => !i.is_marked_for_disposal).length || 1}
          discardCount={scanResult?.items.filter(i => i.is_marked_for_disposal).length || 2}
          activeCity={activeProfile.municipality_name}
          activeNeighborhood={activeProfile.neighborhood}
          dailySpend={dailySpend}
          budgetLimit={5.00}
          language={language}
        />

        {scanResult && (
          <TriageDashboard
            scanResult={scanResult}
            activeNeighborhood={currentNeighborhood}
            activeMunicipalityName={activeProfile.municipality_name}
            language={language}
            onToggleDisposal={handleToggleDisposal}
            onUpdateItem={handleUpdateItem}
            onAddItem={handleAddItem}
            onEscalateTier2={() => loadScan(activePreset, true)}
            isEscalating={isEscalating}
          />
        )}
      </main>

      {/* 4. Interactive Resident Chatbox */}
      <ChatBox activeProfile={activeProfile} />

      {/* 5. Profile Switcher Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profiles={profiles}
        activeProfile={activeProfile}
        municipalities={municipalities}
        onSelectProfile={handleSelectProfile}
        onSaveProfile={handleSaveProfile}
      />

      {/* 6. Scan History Drawer */}
      <HistoryDrawer
        isOpen={showHistoryDrawer}
        onClose={() => setShowHistoryDrawer(false)}
        activeProfile={activeProfile}
        history={scanHistory}
        onSelectScan={handleSelectHistoryScan}
      />

      {/* 7. Footer */}
      <footer style={{
        borderTop: '2px solid var(--border-light)',
        padding: '24px',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        fontSize: '0.82rem',
        background: '#FFFFFF'
      }}>
        <p style={{ fontWeight: 600 }}>
          GomiMakasete (ゴミ？まかせて！) — Built for AWS Agents for Humans Hackathon 2026
        </p>
        <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px' }}>
          Amazon Bedrock AgentCore Runtime • 4 Municipalities (178 Neighborhoods) • Multi-lingual &amp; DynamoDB Ready
        </p>
      </footer>
    </div>
  );
}
