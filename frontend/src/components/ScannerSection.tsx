'use client';

import React, { useState } from 'react';
import { Camera, UploadCloud, Eye, AlertTriangle, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';
import { AppLanguage, TRANSLATIONS } from '@/lib/translations';

interface ScannerSectionProps {
  onScanPreset: (presetKey: string) => void;
  isLoading: boolean;
  activePreset: string;
  language?: AppLanguage;
}

export default function ScannerSection({ onScanPreset, isLoading, activePreset, language = 'mix' }: ScannerSectionProps) {
  const [dragOver, setDragOver] = useState(false);
  const t = TRANSLATIONS[language];

  return (
    <section className="utility-card" style={{ padding: '24px 28px', marginBottom: '28px' }}>
      <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 20px auto' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#0F172A', marginBottom: '6px' }}>
          {t.scan_heading}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {t.scan_desc}
        </p>
      </div>


      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onScanPreset('messy_desk');
        }}
        style={{
          border: `2px dashed ${dragOver ? '#00A86B' : '#CBD5E1'}`,
          borderRadius: 'var(--radius-md)',
          padding: '30px 20px',
          textAlign: 'center',
          background: dragOver ? '#F0FDF4' : '#FAFBFD',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          marginBottom: '20px'
        }}
        onClick={() => onScanPreset('messy_desk')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: '#E6F7F0',
              border: '2px solid #00A86B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00A86B'
            }}
          >
            {isLoading ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              <Camera className="w-6 h-6" />
            )}
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>
              {isLoading ? 'Analyzing Scene with Bedrock Vision...' : t.drop_prompt}
            </p>
            <p style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
              {t.drop_sub}
            </p>
          </div>
        </div>
      </div>

      {/* 1-Click Multi-Modal Test Scenarios */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t.test_scenarios_label}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#00A86B', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles className="w-3.5 h-3.5" /> {t.eval_ready}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {/* Scenario 1 */}
          <button
            onClick={() => onScanPreset('messy_desk')}
            disabled={isLoading}
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              border: activePreset === 'messy_desk' ? '2px solid #00A86B' : '1.5px solid #CBD5E1',
              background: activePreset === 'messy_desk' ? '#F0FDF4' : '#FFFFFF',
              boxShadow: activePreset === 'messy_desk' ? '2px 2px 0 #00A86B' : 'var(--shadow-sm)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.88rem' }}>
                📸 1. Desk: PET Bottle + iPhone 15
              </span>
              <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>Safeguard Test</span>
            </div>
            <p style={{ fontSize: '0.76rem', color: '#475569', lineHeight: 1.35 }}>
              Tests non-waste protection: Safely sequesters iPhone while decomposing PET bottle into cap, label, and bottle.
            </p>
          </button>

          {/* Scenario 2 */}
          <button
            onClick={() => onScanPreset('appliance_box')}
            disabled={isLoading}
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              border: activePreset === 'appliance_box' ? '2px solid #00A86B' : '1.5px solid #CBD5E1',
              background: activePreset === 'appliance_box' ? '#F0FDF4' : '#FFFFFF',
              boxShadow: activePreset === 'appliance_box' ? '2px 2px 0 #00A86B' : 'var(--shadow-sm)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.88rem' }}>
                ⚡ 2. Appliance: Rice Cooker &amp; Box
              </span>
              <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>Bulky Waste</span>
            </div>
            <p style={{ fontSize: '0.76rem', color: '#475569', lineHeight: 1.35 }}>
              Identifies 34cm appliance as Sodai Gomi (fee &amp; stickers), and prescribes twine bundling for corrugated box.
            </p>
          </button>

          {/* Scenario 3 */}
          <button
            onClick={() => onScanPreset('hazardous_kitchen')}
            disabled={isLoading}
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              border: activePreset === 'hazardous_kitchen' ? '2px solid #00A86B' : '1.5px solid #CBD5E1',
              background: activePreset === 'hazardous_kitchen' ? '#F0FDF4' : '#FFFFFF',
              boxShadow: activePreset === 'hazardous_kitchen' ? '2px 2px 0 #00A86B' : 'var(--shadow-sm)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.88rem' }}>
                ⚠️ 3. Hazardous: Gas Canister &amp; Bowl
              </span>
              <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>Safety Hazard</span>
            </div>
            <p style={{ fontSize: '0.76rem', color: '#475569', lineHeight: 1.35 }}>
              Prescribes Outdoor Degassing (fire prevention) and Thick Paper Wrapping with red 「キケン」 labeling.
            </p>
          </button>
        </div>
      </div>
    </section>
  );
}
