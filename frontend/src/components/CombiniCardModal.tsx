'use client';

import React, { useState } from 'react';
import { 
  Store, 
  Copy, 
  Check, 
  X, 
  QrCode, 
  ExternalLink,
  Receipt,
  HelpCircle
} from 'lucide-react';
import { StickerBreakdown } from '@/lib/types';

interface CombiniCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  itemDimCm: number;
  municipalityName: string;
  municipalityNameJa?: string;
  stickers: StickerBreakdown;
}

export default function CombiniCardModal({
  isOpen,
  onClose,
  itemName,
  itemDimCm,
  municipalityName,
  municipalityNameJa = '東京都新宿区',
  stickers
}: CombiniCardModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const ticketLines: string[] = [];
  if (stickers.sticker_a_count > 0) {
    ticketLines.push(`・A券 (200円) × ${stickers.sticker_a_count}枚`);
  }
  if (stickers.sticker_b_count > 0) {
    ticketLines.push(`・B券 (300円) × ${stickers.sticker_b_count}枚`);
  }

  const japaneseScript = `【店員さんへ / To Store Clerk】
すみません、粗大ごみ処理券を購入したいです。
自治体: ${municipalityNameJa}
品目: ${itemName} (約${itemDimCm}cm)

必要券種:
${ticketLines.join('\n')}

合計金額: ${stickers.total_cost_yen}円
よろしくお願いします。`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(japaneseScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '460px', 
          width: '94%',
          padding: 0,
          borderRadius: '20px',
          overflow: 'hidden',
          background: '#0F172A',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Modal Top Header */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#00A86B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Convenience Store Card
              </h3>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                コンビニ店頭提示用デジタルカード
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94A3B8',
              cursor: 'pointer'
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* The Digital Store Card (Designed to be shown to the cashier) */}
        <div style={{ padding: '20px' }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '22px 20px',
            color: '#0F172A',
            position: 'relative',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            border: '2px solid #E2E8F0'
          }}>
            {/* Top Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '12px',
              borderBottom: '2px dashed #E2E8F0',
              marginBottom: '14px'
            }}>
              <div style={{
                background: '#FEF3C7',
                color: '#92400E',
                fontWeight: 800,
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: '6px'
              }}>
                【店員さんにお見せください】
              </div>
              <div style={{
                fontSize: '0.72rem',
                color: '#64748B',
                fontWeight: 600
              }}>
                7-Eleven • FamilyMart • Lawson
              </div>
            </div>

            {/* Main Japanese Phrase */}
            <div style={{
              fontSize: '1.25rem',
              fontWeight: 900,
              lineHeight: 1.4,
              color: '#0F172A',
              marginBottom: '14px',
              letterSpacing: '-0.01em'
            }}>
              「すみません、<br/>
              <span style={{ color: '#00A86B', borderBottom: '3px solid #00A86B' }}>
                粗大ごみ処理券
              </span>
              を購入したいです。」
            </div>

            {/* Municipality and Item Specification */}
            <div style={{
              background: '#F8FAFC',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '14px',
              fontSize: '0.82rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748B' }}>対象自治体 / Municipality:</span>
                <strong style={{ color: '#0F172A' }}>{municipalityNameJa}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>品目 / Item:</span>
                <strong style={{ color: '#0F172A' }}>{itemName} (~{itemDimCm}cm)</strong>
              </div>
            </div>

            {/* Exact Sticker Breakdown Box */}
            <div style={{
              border: '2px solid #00A86B',
              borderRadius: '12px',
              padding: '14px',
              background: '#F0FDF4',
              marginBottom: '14px'
            }}>
              <div style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                color: '#065F46',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}>
                購入する処理券の内訳 (Requested Stickers):
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {stickers.sticker_a_count > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    color: '#0F172A'
                  }}>
                    <span>🏷️ A券 (200円)</span>
                    <span style={{ background: '#00A86B', color: '#FFFFFF', padding: '2px 8px', borderRadius: '6px' }}>
                      {stickers.sticker_a_count} 枚
                    </span>
                  </div>
                )}

                {stickers.sticker_b_count > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    color: '#0F172A'
                  }}>
                    <span>🏷️ B券 (300円)</span>
                    <span style={{ background: '#0284C7', color: '#FFFFFF', padding: '2px 8px', borderRadius: '6px' }}>
                      {stickers.sticker_b_count} 枚
                    </span>
                  </div>
                )}
              </div>

              <div style={{
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px solid #BBF7D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#065F46' }}>お支払い合計金額:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#065F46' }}>
                  ¥{stickers.total_cost_yen.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Instruction for resident */}
            <div style={{
              fontSize: '0.72rem',
              color: '#64748B',
              lineHeight: 1.4,
              borderTop: '1px dashed #E2E8F0',
              paddingTop: '10px'
            }}>
              💡 <strong>Next Step:</strong> Write your name or Reservation Number on the sticker sticker, attach it to the item, and place it outside by 8:00 AM on your reservation day.
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
            <button
              type="button"
              onClick={handleCopy}
              className="btn btn-primary"
              style={{
                flex: 1,
                padding: '10px 14px',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: copied ? '#059669' : '#00A86B'
              }}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Japanese Request Text'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{
                padding: '10px 16px',
                fontSize: '0.82rem',
                color: '#E2E8F0',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
