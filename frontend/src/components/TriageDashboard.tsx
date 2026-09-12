'use client';

import React, { useState } from 'react';
import { 
  DetectedItem, 
  VisionScanResult 
} from '@/lib/types';
import { 
  Trash2, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Layers, 
  Sparkles, 
  Edit3, 
  PlusCircle, 
  Info,
  ChevronDown,
  ChevronUp,
  Zap,
  Calendar,
  Clock,
  MapPin
} from 'lucide-react';
import { NeighborhoodOption } from '@/lib/types';
import { AppLanguage, TRANSLATIONS } from '@/lib/translations';

interface TriageDashboardProps {
  scanResult: VisionScanResult;
  activeNeighborhood?: NeighborhoodOption;
  activeMunicipalityName?: string;
  language?: AppLanguage;
  onToggleDisposal: (id: string) => void;
  onUpdateItem: (id: string, newName: string, newDim: number) => void;
  onAddItem: (name: string, material: string, dim: number) => void;
  onEscalateTier2: () => void;
  isEscalating: boolean;
}

export default function TriageDashboard({
  scanResult,
  activeNeighborhood,
  activeMunicipalityName,
  language = 'mix',
  onToggleDisposal,
  onUpdateItem,
  onAddItem,
  onEscalateTier2,
  isEscalating
}: TriageDashboardProps) {
  const t = TRANSLATIONS[language];


  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDim, setEditDim] = useState(0);

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMaterial, setNewMaterial] = useState('');
  const [newDim, setNewDim] = useState(15);

  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  const disposalItems = scanResult.items.filter(i => i.is_marked_for_disposal);
  const safeguardItems = scanResult.items.filter(i => !i.is_marked_for_disposal);

  const toggleSteps = (id: string) => {
    setExpandedSteps(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartEdit = (item: DetectedItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditDim(item.estimated_dim_cm);
  };

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      onUpdateItem(id, editName.trim(), editDim);
    }
    setEditingId(null);
  };

  const handleAddNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAddItem(newName.trim(), newMaterial.trim() || 'General', newDim);
      setNewName('');
      setNewMaterial('');
      setIsAddingNew(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Glanceable Top Summary Bar */}
      <div className="utility-card" style={{ padding: '18px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          {/* Counts */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-green)' }}></div>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Items to Discard:</span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{disposalItems.length}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-blue)' }}></div>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Safeguarded Assets:</span>
              <strong style={{ fontSize: '1.25rem', color: '#0284C7' }}>{safeguardItems.length}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Model Confidence:</span>
              <span className={`badge ${scanResult.overall_confidence >= 0.85 ? 'badge-green' : 'badge-amber'}`}>
                {Math.round(scanResult.overall_confidence * 100)}%
                {scanResult.needs_escalation && ' (Needs Review)'}
              </span>
            </div>
          </div>

          {/* Tier-2 Escalation Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={onEscalateTier2}
              disabled={isEscalating}
              className="btn btn-secondary"
              style={{
                padding: '8px 14px',
                fontSize: '0.82rem',
                border: '1.5px solid #7C3AED',
                color: '#6D28D9',
                background: '#FAF5FF'
              }}
              title="Re-analyze image with Claude 3.7 Sonnet / Nova Pro reasoning"
            >
              <Zap className="w-4 h-4 text-purple-600" />
              <span>{isEscalating ? 'Reasoning with Claude 3.7...' : '⚡ Re-Scan with SOTA Model (Tier-2)'}</span>
            </button>

            <button
              onClick={() => setIsAddingNew(true)}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.82rem' }}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Missing Item</span>
            </button>
          </div>
        </div>

        {/* Low Confidence or Safeguard Notice */}
        {scanResult.needs_escalation && (
          <div style={{
            marginTop: '14px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: '#FEF3C7',
            border: '1.5px solid #F59E0B',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.82rem',
            color: '#92400E'
          }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Confidence Alert:</strong> Low light or boundary overlap detected in Tier-1. Click <em>&quot;Re-Scan with SOTA Model&quot;</em> above or manually verify item boundaries below.
            </span>
          </div>
        )}
      </div>

      {/* 2. Live Municipal Timetable Banner */}
      {activeNeighborhood && (
        <div style={{
          background: '#FFFFFF',
          border: '2px solid #0F172A',
          borderRadius: '16px',
          padding: '14px 20px',
          boxShadow: '3px 3px 0 #0F172A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#F0FDF4',
              border: '2px solid #00A86B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00A86B'
            }}>
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <strong style={{ fontSize: '0.92rem', color: '#0F172A' }}>
                  {activeMunicipalityName} • {activeNeighborhood.name_en}
                </strong>
                {activeNeighborhood.postal_code && (
                  <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                    📮 〒{activeNeighborhood.postal_code}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '0.76rem', color: '#64748B' }}>
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Morning Cutoff: <strong>08:00 AM (Take out before 8:00 AM)</strong></span>
                <span>•</span>
                <span>Pattern ID: <code>{activeNeighborhood.pattern_id}</code></span>
              </div>
            </div>
          </div>

          {/* Schedule Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {activeNeighborhood.schedules && Object.entries(activeNeighborhood.schedules).map(([key, days]) => {
              const label = key === 'combustible' ? '🔥 Burnable' :
                            key === 'plastic_packaging' ? '🧴 Plastics' :
                            key === 'cans_bottles_pet' ? '🥫 Cans/PET' :
                            key === 'resources' ? '📦 Resources' :
                            key === 'metal_ceramics_glass' ? '🏺 Ceramics/Glass' :
                            key === 'station_dropoff' ? '🍃 Zero-Waste Station' : key;

              return (
                <div key={key} style={{
                  background: key === 'combustible' ? '#FEF2F2' : key === 'resources' || key === 'cans_bottles_pet' ? '#F0FDF4' : '#F8FAFC',
                  border: `1.5px solid ${key === 'combustible' ? '#FECACA' : '#CBD5E1'}`,
                  borderRadius: '10px',
                  padding: '5px 10px',
                  fontSize: '0.75rem'
                }}>
                  <strong style={{ color: key === 'combustible' ? '#DC2626' : '#0F172A' }}>{label}:</strong>
                  <span style={{ color: '#475569', marginLeft: '4px', fontWeight: 600 }}>
                    {Array.isArray(days) ? days.join(', ') : days}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Main Dual-Stream Layout */}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* LEFT COLUMN: ITEMS FOR DISPOSAL */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trash2 className="w-5 h-5 text-emerald-600" />
              <span>Items for Disposal ({disposalItems.length})</span>
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
              Click to move back to Keep
            </span>
          </div>

          {disposalItems.length === 0 ? (
            <div className="utility-card" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <p style={{ fontWeight: 700, color: '#475569' }}>All detected objects are marked as Keep / Safeguarded.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Click &quot;Add Missing Item&quot; or restore an item from the Safeguards panel on the right.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {disposalItems.map((item) => {
                const isEditing = editingId === item.id;
                const isExpanded = !!expandedSteps[item.id];
                const prep = item.preparation;

                return (
                  <div
                    key={item.id}
                    className="utility-card"
                    style={{
                      padding: '18px 20px',
                      borderLeft: `5px solid ${item.is_low_confidence ? '#D97706' : '#00A86B'}`,
                      position: 'relative'
                    }}
                  >
                    {/* Item Top Bar */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              style={{
                                padding: '6px 10px',
                                fontSize: '0.88rem',
                                border: '1.5px solid #CBD5E1',
                                borderRadius: '8px',
                                flex: 1,
                                outline: 'none'
                              }}
                            />
                            <input
                              type="number"
                              value={editDim}
                              onChange={(e) => setEditDim(Number(e.target.value))}
                              style={{
                                width: '70px',
                                padding: '6px',
                                fontSize: '0.88rem',
                                border: '1.5px solid #CBD5E1',
                                borderRadius: '8px',
                                outline: 'none'
                              }}
                              title="Dimension in cm"
                            />
                            <button onClick={() => handleSaveEdit(item.id)} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Save</button>
                            <button onClick={() => setEditingId(null)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>{item.name}</h3>
                            <button
                              onClick={() => handleStartEdit(item)}
                              style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
                              title="Edit item name or size"
                            >
                              <Edit3 className="w-3.5 h-3.5 hover:text-slate-800" />
                            </button>
                            {item.user_edited && (
                              <span className="badge badge-amber" style={{ fontSize: '0.62rem' }}>User Edited</span>
                            )}
                          </div>
                        )}

                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '2px' }}>
                          {item.description}
                        </p>

                        {/* Metadata Pills */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                          <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>
                            Material: {item.material}
                          </span>
                          <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>
                            Approx. {item.estimated_dim_cm} cm
                            {item.estimated_dim_cm > 30 && <strong style={{ color: '#7C3AED', marginLeft: '4px' }}>(Sodai Gomi Candidate)</strong>}
                          </span>
                          <span
                            className={`badge ${item.confidence >= 0.85 ? 'badge-green' : 'badge-amber'}`}
                            style={{ fontSize: '0.68rem' }}
                          >
                            {Math.round(item.confidence * 100)}% Confidence
                          </span>
                        </div>
                      </div>

                      {/* 1-Click Toggle: "No, I am keeping this!" */}
                      <button
                        onClick={() => onToggleDisposal(item.id)}
                        className="btn btn-secondary"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: '1.5px solid #FECACA',
                          color: '#DC2626',
                          background: '#FFF5F5'
                        }}
                        title="Click if this item was accidentally included and you are NOT throwing it away"
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                        <span>Keep this</span>
                      </button>
                    </div>

                    {/* Preparation Action Prescription Banner */}
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: '#FAFBFD',
                        border: '1px solid #E2E8F0'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`badge badge-${prep.badge_color === 'emerald' ? 'green' : prep.badge_color === 'cyan' ? 'blue' : prep.badge_color}`}>
                            {prep.action_label}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                            {prep.action_label_jp}
                          </span>
                        </div>

                        <button
                          onClick={() => toggleSteps(item.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#00A86B',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>{isExpanded ? 'Hide Action Steps' : 'View Action Steps'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Safety Warning if applicable */}
                      {prep.safety_warning && (
                        <div style={{
                          marginTop: '8px',
                          fontSize: '0.76rem',
                          color: '#B91C1C',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: 600
                        }}>
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-red-600" />
                          <span>{prep.safety_warning}</span>
                        </div>
                      )}

                      {/* Expandable Step-by-Step Instructions */}
                      {isExpanded && (
                        <div style={{ marginTop: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '10px' }}>
                          <ol style={{ paddingLeft: '18px', fontSize: '0.8rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {prep.steps.map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ol>

                          {/* Hand-Separable Components Breakdown */}
                          {prep.components && prep.components.length > 0 && (
                            <div style={{ marginTop: '10px' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                ✂️ Separable Waste Streams:
                              </span>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px', marginTop: '6px' }}>
                                {prep.components.map((comp, cIdx) => (
                                  <div
                                    key={cIdx}
                                    style={{
                                      padding: '6px 10px',
                                      background: '#F0F9FF',
                                      borderRadius: '8px',
                                      border: '1px solid #BAE6FD',
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    <strong style={{ color: '#0369A1' }}>{comp.name}</strong>
                                    <div style={{ color: '#0284C7', fontSize: '0.7rem', marginTop: '1px' }}>
                                      → {comp.destination_stream}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: SAFEGUARDED PERSONAL OBJECTS */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <span>Safeguarded Non-Waste ({safeguardItems.length})</span>
            </h2>
          </div>

          <div
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid #BAE6FD',
              background: '#F0F9FF',
              marginBottom: '14px',
              fontSize: '0.78rem',
              color: '#0369A1'
            }}
          >
            <p>
              <strong>🛡️ Accidental Non-Waste Guard:</strong> Identified as personal property or active belongings. Excluded from trash automatically.
            </p>
          </div>

          {safeguardItems.length === 0 ? (
            <div className="utility-card" style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              No non-waste objects detected in this frame.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {safeguardItems.map((item) => (
                <div
                  key={item.id}
                  className="utility-card"
                  style={{
                    padding: '16px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>{item.name}</span>
                        <span className="badge badge-blue" style={{ fontSize: '0.62rem' }}>Personal Asset</span>
                      </div>
                      <p style={{ fontSize: '0.76rem', color: '#475569', marginTop: '2px' }}>
                        {item.description}
                      </p>
                      <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#64748B' }}>
                        Confidence: <strong>{Math.round(item.confidence * 100)}%</strong> (Kept Safe)
                      </div>
                    </div>

                    {/* Override Toggle: "I actually want to discard this" */}
                    <button
                      onClick={() => onToggleDisposal(item.id)}
                      className="btn btn-secondary"
                      style={{
                        padding: '6px 10px',
                        fontSize: '0.72rem',
                        whiteSpace: 'nowrap',
                        border: '1.5px solid #A3E5CB',
                        color: '#047857',
                        background: '#F0FDF4'
                      }}
                      title="Click if this item is broken and you actually want to discard it"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Discard this</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD MISSING ITEM */}
      {isAddingNew && (
        <div className="modal-overlay" onClick={() => setIsAddingNew(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px', color: '#0F172A' }}>
              Add Missing Waste Item
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '16px' }}>
              Add any un-detected object from your room to prescribe sorting actions.
            </p>
            <form onSubmit={handleAddNewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Item Name (e.g., Frying pan, Coffee grounds, Takeout chopsticks)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Item name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Primary Material
                </label>
                <input
                  type="text"
                  placeholder="Metal, Plastic, Ceramic, Paper..."
                  value={newMaterial}
                  onChange={(e) => setNewMaterial(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Longest Dimension (cm)
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={newDim}
                  onChange={(e) => setNewDim(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsAddingNew(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
