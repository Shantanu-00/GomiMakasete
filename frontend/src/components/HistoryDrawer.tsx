'use client';

import React from 'react';
import { ScanHistoryRecord, UserProfile } from '@/lib/types';
import { 
  X, 
  Clock, 
  Trash2, 
  ShieldCheck, 
  ArrowRight, 
  Calendar,
  Layers
} from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfile: UserProfile;
  history: ScanHistoryRecord[];
  onSelectScan: (record: ScanHistoryRecord) => void;
}

export default function HistoryDrawer({
  isOpen,
  onClose,
  activeProfile,
  history,
  onSelectScan
}: HistoryDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px', width: '100%' }}
      >
        {/* Drawer Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock className="w-5 h-5 text-emerald-600" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                Scan &amp; Triage History
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
              Showing saved waste sorting sessions for <strong>{activeProfile.name}</strong> ({activeProfile.municipality_name}).
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              background: '#F1F5F9', 
              border: '2px solid #0F172A', 
              borderRadius: '8px', 
              padding: '6px', 
              cursor: 'pointer' 
            }}
          >
            <X className="w-5 h-5 text-slate-800" />
          </button>
        </div>

        {/* List of past scans */}
        {history.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            background: '#F8FAFC',
            borderRadius: '14px',
            border: '2px dashed #CBD5E1'
          }}>
            <Layers className="w-10 h-10 text-slate-300" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ fontWeight: 700, color: '#475569', fontSize: '0.95rem' }}>No past scans yet for this profile</p>
            <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '4px' }}>
              Run a camera scan or scenario test and it will automatically persist here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {history.map((record) => {
              const formattedDate = new Date(record.timestamp).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={record.id}
                  onClick={() => {
                    onSelectScan(record);
                    onClose();
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#0F172A';
                    e.currentTarget.style.boxShadow = '3px 3px 0 #0F172A';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.03)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B' }}>
                        {formattedDate}
                      </span>
                    </div>
                    <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                      {record.model_used}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0F172A' }}>
                        {record.items_detected.length} Objects Detected
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '0.76rem' }}>
                        <span style={{ color: '#00A86B', fontWeight: 600 }}>
                          🗑️ {record.discard_count} Discard
                        </span>
                        <span>•</span>
                        <span style={{ color: '#0284C7', fontWeight: 600 }}>
                          🛡️ {record.safeguard_count} Kept Safe
                        </span>
                      </div>
                    </div>

                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '4px' }}
                    >
                      <span>Reload</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
