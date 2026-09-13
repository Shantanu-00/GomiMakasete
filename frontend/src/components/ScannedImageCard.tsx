'use client';

import React from 'react';
import { 
  Camera, 
  Eye, 
  Plus, 
  Trash2, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2,
  FileImage
} from 'lucide-react';
import { UploadedImage } from '@/lib/types';
import { AppLanguage } from '@/lib/translations';

interface ScannedImageCardProps {
  images: UploadedImage[];
  activeIndex: number;
  onSelectImage: (index: number) => void;
  onRemoveImage: (id: string) => void;
  onAddMorePhotos: () => void;
  isAnalyzing: boolean;
  modelUsed?: string;
  detectedCount?: number;
  safeguardCount?: number;
  language?: AppLanguage;
}

export default function ScannedImageCard({
  images,
  activeIndex,
  onSelectImage,
  onRemoveImage,
  onAddMorePhotos,
  isAnalyzing,
  modelUsed = 'Amazon Nova 2 Lite',
  detectedCount = 0,
  safeguardCount = 0,
  language = 'mix'
}: ScannedImageCardProps) {
  if (!images || images.length === 0) return null;

  const activeImage = images[activeIndex] || images[0];

  return (
    <div 
      className="utility-card"
      style={{
        padding: '14px 18px',
        marginBottom: '20px',
        background: '#FFFFFF',
        border: '2px solid #0F172A',
        borderRadius: '18px',
        boxShadow: '3px 3px 0 #0F172A'
      }}
    >
      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '10px',
        borderBottom: '1.5px solid #F1F5F9',
        paddingBottom: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            background: isAnalyzing ? '#FEF3C7' : '#E6F7F0',
            border: `1.5px solid ${isAnalyzing ? '#F59E0B' : '#00A86B'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isAnalyzing ? '#D97706' : '#00A86B'
          }}>
            {isAnalyzing ? (
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>
                {isAnalyzing ? 'Analyzing Visual Inspection...' : 'Scanned Scene Image'}
              </span>
              <span className="jp-nowrap" style={{ fontSize: '0.72rem', color: '#00A86B', fontWeight: 700 }}>
                {language === 'ja' ? '画像解析ビュー' : '画像検査'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Status Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isAnalyzing ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#D97706',
              background: '#FEF3C7',
              padding: '2px 8px',
              borderRadius: '9999px',
              border: '1px solid #FDE68A'
            }}>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              Scanning Image...
            </span>
          ) : (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#047857',
              background: '#F0FDF4',
              padding: '2px 8px',
              borderRadius: '9999px',
              border: '1px solid #BBF7D0'
            }}>
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              {detectedCount} Items Detected
            </span>
          )}

          {safeguardCount > 0 && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#0284C7',
              background: '#EFF6FF',
              padding: '2px 8px',
              borderRadius: '9999px',
              border: '1px solid #BAE6FD'
            }}>
              <ShieldCheck className="w-3 h-3 text-blue-500" />
              {safeguardCount} Safeguarded
            </span>
          )}

          <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>
            Photo {activeIndex + 1} of {images.length}
          </span>
        </div>
      </div>

      {/* Main Image HUD Container - Compact & Space-Efficient */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: 'clamp(180px, 30vw, 240px)',
        background: '#0F172A',
        borderRadius: '14px',
        overflow: 'hidden',
        border: '2px solid #1E293B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)'
      }}>
        {/* HUD Grid Overlay */}
        <div className="hud-grid-overlay" />

        {/* 4 Corner Targeting Reticles */}
        <div className="hud-corner hud-corner-tl" />
        <div className="hud-corner hud-corner-tr" />
        <div className="hud-corner hud-corner-bl" />
        <div className="hud-corner hud-corner-br" />

        {/* Laser Scanline (Active while analyzing) */}
        {isAnalyzing && <div className="laser-scanline" />}

        {/* Active Display Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeImage.url}
          alt={activeImage.name}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            display: 'block',
            transition: 'all 0.2s ease',
            filter: isAnalyzing ? 'contrast(1.05) brightness(0.95)' : 'none'
          }}
        />

        {/* On-Image Bottom Overlay Pill */}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '10px',
          right: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none'
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.82)',
            backdropFilter: 'blur(4px)',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            padding: '3px 8px',
            fontSize: '0.68rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            maxWidth: '70%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            <FileImage className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeImage.name}
            </span>
            {activeImage.source === 'camera' && (
              <span style={{ background: '#00A86B', color: '#FFF', padding: '1px 4px', borderRadius: '4px', fontSize: '0.6rem' }}>
                Camera
              </span>
            )}
          </div>

          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveImage(activeImage.id);
              }}
              style={{
                pointerEvents: 'auto',
                background: 'rgba(220, 38, 38, 0.85)',
                backdropFilter: 'blur(4px)',
                color: '#FFFFFF',
                border: '1px solid #EF4444',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.68rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
              title="Remove this photo"
            >
              <Trash2 className="w-3 h-3" />
              <span>Remove</span>
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Multi-Photo Carousel Strip (Keeps everything compact!) */}
      <div style={{
        marginTop: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px',
        scrollbarWidth: 'thin'
      }}>
        <span style={{
          fontSize: '0.7rem',
          fontWeight: 800,
          color: '#64748B',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          flexShrink: 0
        }}>
          Photos ({images.length}):
        </span>

        {images.map((img, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={img.id}
              onClick={() => onSelectImage(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 8px 3px 4px',
                borderRadius: '8px',
                background: isActive ? '#F0FDF4' : '#F8FAFC',
                border: isActive ? '2px solid #00A86B' : '1.5px solid #CBD5E1',
                boxShadow: isActive ? '2px 2px 0 #00A86B' : 'none',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
            >
              {/* Mini Thumbnail */}
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '4px',
                overflow: 'hidden',
                background: '#0F172A',
                border: '1px solid #CBD5E1',
                flexShrink: 0
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? '#065F46' : '#334155',
                  maxWidth: '110px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {img.name}
                </div>
                <div style={{ fontSize: '0.62rem', color: '#94A3B8' }}>
                  #{idx + 1} • {img.source}
                </div>
              </div>
            </button>
          );
        })}

        {/* "+ Add More Photos" Quick Button */}
        <button
          onClick={onAddMorePhotos}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 12px',
            borderRadius: '8px',
            background: '#FFFFFF',
            border: '1.5px dashed #00A86B',
            color: '#00A86B',
            fontSize: '0.72rem',
            fontWeight: 800,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#F0FDF4';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#FFFFFF';
          }}
          title="Upload another angle or close-up detail shot"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Angle / Detail</span>
        </button>
      </div>
    </div>
  );
}
