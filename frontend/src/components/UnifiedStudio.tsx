'use client';

import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Eye, 
  Trash2, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  RefreshCw,
  Maximize2
} from 'lucide-react';
import { UploadedImage } from '@/lib/types';
import { AppLanguage, TRANSLATIONS } from '@/lib/translations';

interface UnifiedStudioProps {
  images: UploadedImage[];
  activeIndex: number;
  onSelectImage: (index: number) => void;
  onRemoveImage: (id: string) => void;
  onUploadPhotos: (files: File[], source: 'upload' | 'camera') => void;
  onScanPreset: (presetKey: string) => void;
  activePreset: string;
  isAnalyzing: boolean;
  modelUsed?: string;
  detectedCount: number;
  safeguardCount: number;
  language?: AppLanguage;
}

export default function UnifiedStudio({
  images,
  activeIndex,
  onSelectImage,
  onRemoveImage,
  onUploadPhotos,
  onScanPreset,
  activePreset,
  isAnalyzing,
  modelUsed = 'Tier-1 (Nova 2 Lite)',
  detectedCount,
  safeguardCount,
  language = 'mix'
}: UnifiedStudioProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentImage = images[activeIndex] || images[0];
  const t = TRANSLATIONS[language];

  // File validation guard (<15MB, image MIME)
  const validateAndUpload = (fileList: FileList | File[], source: 'upload' | 'camera') => {
    setUploadError(null);
    const validFiles: File[] = [];
    const files = Array.from(fileList);

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setUploadError(`"${file.name}" is not a valid image format. Please select JPG, PNG, or WebP.`);
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setUploadError(`"${file.name}" exceeds the 15MB limit. Please take a smaller picture.`);
        return;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      onUploadPhotos(validFiles, source);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndUpload(e.dataTransfer.files, 'upload');
    }
  };

  return (
    <section 
      aria-label="Studio Viewport"
      className="utility-card"
      style={{
        padding: '16px',
        marginBottom: '16px',
        border: '2px solid #0F172A',
        boxShadow: '4px 4px 0 #0F172A',
        background: '#FFFFFF',
        borderRadius: '16px'
      }}
    >
      {/* Hidden File Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            validateAndUpload(e.target.files, 'camera');
            e.target.value = '';
          }
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            validateAndUpload(e.target.files, 'upload');
            e.target.value = '';
          }
        }}
      />

      {/* Top Title Strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00A86B' }} />
          <h2 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            STUDIO VIEWPORT (CAMERA &amp; SCAN ANALYSIS)
          </h2>
          <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>
            {images.length} {images.length === 1 ? 'Scene' : 'Scenes'} Loaded
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#64748B' }}>
          <span>AI Vision: <strong>{modelUsed}</strong></span>
        </div>
      </div>

      {/* Error Alert */}
      {uploadError && (
        <div style={{
          padding: '8px 12px',
          background: '#FEF2F2',
          border: '1.5px solid #EF4444',
          borderRadius: '8px',
          color: '#B91C1C',
          fontSize: '0.78rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px'
        }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* 2-Column Responsive Split */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '14px',
        alignItems: 'stretch'
      }}>
        {/* COLUMN 1: TACTICAL HUD VIEWFINDER */}
        <div style={{
          background: '#0F172A',
          borderRadius: '12px',
          border: '2px solid #1E293B',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '220px',
          maxHeight: '280px'
        }}>
          {/* Main Photo Area */}
          <div style={{ position: 'relative', flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {currentImage ? (
              <img
                src={currentImage.url}
                alt={currentImage.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            ) : (
              <div style={{
                color: '#94A3B8',
                textAlign: 'center',
                padding: '28px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1.5px dashed #38BDF8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38BDF8'
                }}>
                  <Camera className="w-5 h-5" />
                </div>
                <strong style={{ fontSize: '0.88rem', color: '#F1F5F9' }}>
                  Awaiting Room Photo
                </strong>
                <p style={{ fontSize: '0.72rem', color: '#64748B', maxWidth: '240px', margin: '0 auto' }}>
                  Use camera, upload room images, or select an evaluation scenario on the right.
                </p>
              </div>
            )}

            {/* Sweeping Laser Line when analyzing */}
            {isAnalyzing && <div className="laser-sweep" />}

            {/* Viewfinder HUD Overlays */}
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap'
            }}>
              <span style={{
                background: 'rgba(15, 23, 42, 0.85)',
                color: '#38BDF8',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.65rem',
                fontWeight: 700,
                border: '1px solid rgba(56, 189, 248, 0.4)',
                backdropFilter: 'blur(4px)'
              }}>
                {currentImage ? (currentImage.source === 'preset' ? 'SCENARIO DEMO' : 'LIVE UPLOAD') : 'STANDBY'}
              </span>

              {detectedCount > 0 && (
                <span style={{
                  background: 'rgba(0, 168, 107, 0.85)',
                  color: '#FFFFFF',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  backdropFilter: 'blur(4px)'
                }}>
                  {detectedCount} Items Detected
                </span>
              )}
            </div>

            {/* Delete Image Button (if multiple images or custom upload) */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => currentImage && onRemoveImage(currentImage.id)}
                title="Remove this photo (cleans up associated items)"
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(239, 68, 68, 0.85)',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backdropFilter: 'blur(4px)'
                }}
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove</span>
              </button>
            )}
          </div>

          {/* Horizontal Thumbnail Carousel if multiple images */}
          {images.length > 1 && (
            <div style={{
              background: '#0B1120',
              padding: '6px 8px',
              borderTop: '1px solid #1E293B',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflowX: 'auto'
            }}>
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => onSelectImage(idx)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    border: activeIndex === idx ? '2px solid #00A86B' : '1px solid #334155',
                    padding: 0,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    flexShrink: 0,
                    position: 'relative'
                  }}
                >
                  <img src={img.url} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  border: '1px dashed #475569',
                  background: 'transparent',
                  color: '#94A3B8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
                title="Add another photo to analysis"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* COLUMN 2: INPUT ACTIONS & PRESET SCENARIO PILLS */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          {/* Action Trigger Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isAnalyzing}
              className="btn btn-primary"
              style={{
                padding: '10px',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Camera className="w-4 h-4" />
              <span>Camera Scan</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className="btn btn-secondary"
              style={{
                padding: '10px',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                border: '1.5px solid #CBD5E1'
              }}
            >
              <Upload className="w-4 h-4 text-slate-700" />
              <span>Browse Files</span>
            </button>
          </div>

          {/* Desktop Drag-and-Drop Catchment */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              flex: 1,
              border: `2px dashed ${isDragOver ? '#00A86B' : '#CBD5E1'}`,
              borderRadius: '10px',
              padding: '12px',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragOver ? '#F0FDF4' : '#F8FAFC',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              minHeight: '80px'
            }}
          >
            <Upload className={`w-5 h-5 mb-1 ${isDragOver ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
              Drag & Drop room photos here
            </span>
            <span style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: '2px' }}>
              Multi-file supported • JPG, PNG, WebP &lt; 15MB
            </span>
          </div>

          {/* Preset Demo Scenarios */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                ⚡ Or Test Real-World Scenarios:
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              <button
                type="button"
                onClick={() => onScanPreset('messy_desk')}
                disabled={isAnalyzing}
                style={{
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: `1.5px solid ${activePreset === 'messy_desk' ? '#00A86B' : '#E2E8F0'}`,
                  background: activePreset === 'messy_desk' ? '#F0FDF4' : '#FFFFFF',
                  color: activePreset === 'messy_desk' ? '#065F46' : '#334155',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title="Desk: PET Bottle, Coffee Can & Android Smartphone"
              >
                1. 📱 Desk (Drinks & Phone)
              </button>

              <button
                type="button"
                onClick={() => onScanPreset('appliance_box')}
                disabled={isAnalyzing}
                style={{
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: `1.5px solid ${activePreset === 'appliance_box' ? '#00A86B' : '#E2E8F0'}`,
                  background: activePreset === 'appliance_box' ? '#F0FDF4' : '#FFFFFF',
                  color: activePreset === 'appliance_box' ? '#065F46' : '#334155',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title="Appliance: Rice Cooker & Delivery Box"
              >
                2. 🍚 Cooker & Box
              </button>

              <button
                type="button"
                onClick={() => onScanPreset('hazardous_kitchen')}
                disabled={isAnalyzing}
                style={{
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: `1.5px solid ${activePreset === 'hazardous_kitchen' ? '#00A86B' : '#E2E8F0'}`,
                  background: activePreset === 'hazardous_kitchen' ? '#F0FDF4' : '#FFFFFF',
                  color: activePreset === 'hazardous_kitchen' ? '#065F46' : '#334155',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title="Hazardous: Gas Canister & Broken Bowl"
              >
                3. 💨 Gas & Bowl
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
