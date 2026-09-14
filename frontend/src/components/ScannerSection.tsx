'use client';

import React, { useState, useRef } from 'react';
import { 
  Camera, 
  UploadCloud, 
  Eye, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  FolderOpen
} from 'lucide-react';
import { AppLanguage, TRANSLATIONS } from '@/lib/translations';

interface ScannerSectionProps {
  onScanPreset: (presetKey: string) => void;
  onUploadPhotos: (files: File[], source: 'upload' | 'camera') => void;
  isLoading: boolean;
  activePreset: string;
  language?: AppLanguage;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function ScannerSection({ 
  onScanPreset, 
  onUploadPhotos,
  isLoading, 
  activePreset, 
  language = 'mix',
  fileInputRef: externalFileInputRef
}: ScannerSectionProps) {
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const internalFileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const activeFileInputRef = externalFileInputRef || internalFileInputRef;
  const t = TRANSLATIONS[language];

  // Validate and dispatch uploaded images
  const processFiles = (fileList: FileList | null, source: 'upload' | 'camera') => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);

    const validFiles: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // Gotcha 1: Validate file is an image
      if (!file.type.startsWith('image/')) {
        setErrorMessage(`"${file.name}" is not an image. Please select JPG, PNG, WebP or HEIC.`);
        continue;
      }
      // Gotcha 2: Limit file size to 15MB to prevent memory/payload blowout
      if (file.size > 15 * 1024 * 1024) {
        setErrorMessage(`"${file.name}" is too large (>15MB). Please choose a smaller photo.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      onUploadPhotos(validFiles, source);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files, 'upload');
    // Reset value so re-uploading the same file triggers change
    e.target.value = '';
  };

  const handleCameraInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files, 'camera');
    e.target.value = '';
  };

  const handleCameraClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      } else if (activeFileInputRef.current) {
        activeFileInputRef.current.click();
      }
    } catch (err) {
      console.warn('Camera trigger fallback:', err);
      activeFileInputRef.current?.click();
    }
  };

  const handleBrowseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    activeFileInputRef.current?.click();
  };

  return (
    <section className="utility-card" style={{ padding: '20px 24px', marginBottom: '24px' }}>
      {/* Hidden File Input for Device Storage / Gallery (Multi-photo enabled) */}
      <input
        type="file"
        ref={activeFileInputRef as any}
        accept="image/*"
        multiple
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        id="gomi-file-input"
      />

      {/* Hidden File Input for Direct Mobile Camera Capture */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleCameraInputChange}
        style={{ display: 'none' }}
        id="gomi-camera-input"
      />

      {/* Heading */}
      <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 16px auto' }}>
        <h1 style={{ fontSize: 'clamp(1.25rem, 3vw, 1.7rem)', fontWeight: 900, letterSpacing: '-0.02em', color: '#0F172A', marginBottom: '4px' }}>
          {t.scan_heading}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
          {t.scan_desc}
        </p>
      </div>

      {/* Error / Warning Alert if any */}
      {errorMessage && (
        <div style={{
          marginBottom: '14px',
          padding: '10px 14px',
          borderRadius: '10px',
          background: '#FEF2F2',
          border: '1.5px solid #F87171',
          color: '#B91C1C',
          fontSize: '0.8rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Interactive Upload & Camera Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          processFiles(e.dataTransfer.files, 'upload');
        }}
        onClick={handleBrowseClick}
        style={{
          border: `2px dashed ${dragOver ? '#00A86B' : '#94A3B8'}`,
          borderRadius: 'var(--radius-md)',
          padding: '24px 16px',
          textAlign: 'center',
          background: dragOver ? '#F0FDF4' : '#FAFBFD',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          marginBottom: '18px',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: '#E6F7F0',
              border: '2px solid #00A86B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00A86B',
              boxShadow: '0 2px 6px rgba(0, 168, 107, 0.2)'
            }}
          >
            {isLoading ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              <Camera className="w-6 h-6" />
            )}
          </div>

          <div>
            <p style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0F172A' }}>
              {isLoading ? 'Analyzing Scene with Bedrock Vision...' : 'Drop Photo(s) here or choose an option below'}
            </p>
            <p style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '2px' }}>
              Supports Multi-Photo: Upload overall trash shot + close-up of plastic/recycling symbols
            </p>
          </div>

          {/* Action Trigger Buttons for Mobile & Desktop */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '10px', 
              flexWrap: 'wrap', 
              marginTop: '6px' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. Direct Mobile Camera Trigger */}
            <button
              type="button"
              onClick={handleCameraClick}
              disabled={isLoading}
              className="btn btn-primary"
              style={{
                padding: '8px 16px',
                fontSize: '0.82rem',
                borderRadius: '10px',
                boxShadow: '2px 2px 0 #007047'
              }}
              title="Open device camera to photograph garbage"
            >
              <Camera className="w-4 h-4" />
              <span>📸 Take Photo (Camera)</span>
            </button>

            {/* 2. File / Gallery Browser */}
            <button
              type="button"
              onClick={handleBrowseClick}
              disabled={isLoading}
              className="btn btn-secondary"
              style={{
                padding: '8px 16px',
                fontSize: '0.82rem',
                borderRadius: '10px',
                border: '2px solid #0F172A',
                boxShadow: '2px 2px 0 #0F172A',
                background: '#FFFFFF'
              }}
              title="Select one or multiple images from device gallery or storage"
            >
              <FolderOpen className="w-4 h-4 text-slate-700" />
              <span>📁 Browse Photos (Multi-select)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1-Click Multi-Modal Test Scenarios */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t.test_scenarios_label}
          </span>
          <span style={{ fontSize: '0.74rem', color: '#00A86B', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles className="w-3.5 h-3.5" /> {t.eval_ready}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '10px' }}>
          {/* Scenario 1 */}
          <button
            onClick={() => onScanPreset('messy_desk')}
            disabled={isLoading}
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              border: activePreset === 'messy_desk' ? '2px solid #00A86B' : '1.5px solid #CBD5E1',
              background: activePreset === 'messy_desk' ? '#F0FDF4' : '#FFFFFF',
              boxShadow: activePreset === 'messy_desk' ? '2px 2px 0 #00A86B' : 'var(--shadow-sm)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.84rem' }}>
                📸 1. Desk: PET Bottle + Android Phone
              </span>
              <span className="badge badge-blue" style={{ fontSize: '0.62rem' }}>Safeguard Test</span>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#475569', lineHeight: 1.35 }}>
              Non-waste protection: Sequester Android Smartphone while sorting PET cap, label, and BOSS coffee can.
            </p>
          </button>

          {/* Scenario 2 */}
          <button
            onClick={() => onScanPreset('appliance_box')}
            disabled={isLoading}
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              border: activePreset === 'appliance_box' ? '2px solid #00A86B' : '1.5px solid #CBD5E1',
              background: activePreset === 'appliance_box' ? '#F0FDF4' : '#FFFFFF',
              boxShadow: activePreset === 'appliance_box' ? '2px 2px 0 #00A86B' : 'var(--shadow-sm)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.84rem' }}>
                ⚡ 2. Appliance: Rice Cooker &amp; Box
              </span>
              <span className="badge badge-purple" style={{ fontSize: '0.62rem' }}>Bulky Waste</span>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#475569', lineHeight: 1.35 }}>
              Flags 34cm appliance as Sodai Gomi (fees), bundles box with twine.
            </p>
          </button>

          {/* Scenario 3 */}
          <button
            onClick={() => onScanPreset('hazardous_kitchen')}
            disabled={isLoading}
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              border: activePreset === 'hazardous_kitchen' ? '2px solid #00A86B' : '1.5px solid #CBD5E1',
              background: activePreset === 'hazardous_kitchen' ? '#F0FDF4' : '#FFFFFF',
              boxShadow: activePreset === 'hazardous_kitchen' ? '2px 2px 0 #00A86B' : 'var(--shadow-sm)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.84rem' }}>
                ⚠️ 3. Hazardous: Gas Can &amp; Bowl
              </span>
              <span className="badge badge-amber" style={{ fontSize: '0.62rem' }}>Safety Hazard</span>
            </div>
            <p style={{ fontSize: '0.74rem', color: '#475569', lineHeight: 1.35 }}>
              Outdoor degassing for butane can; thick wrap &amp; 「キケン」 label for cracked bowl.
            </p>
          </button>
        </div>
      </div>
    </section>
  );
}
