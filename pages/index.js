// pages/index.js
import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [tutors, setTutors] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [tuitions, setTuitions] = useState([]);
  const [selectedTuition, setSelectedTuition] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [manualError, setManualError] = useState('');
  const [tuitionSearch, setTuitionSearch] = useState('');
  const [tuitionOpen, setTuitionOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchTutors();
    fetchTuitions();
  }, []);

  async function fetchTutors() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tutors');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load tutors');
      setTutors(data.tutors);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTuitions() {
    try {
      const res = await fetch('/api/tuitions');
      const data = await res.json();
      if (res.ok) setTuitions(data.tuitions);
    } catch (err) {
      console.error('Failed to load tuitions:', err);
    }
  }

  function toggleTutor(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(t => t.id)));
    }
  }

  const filtered = tutors.filter(t => {
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.phone.toLowerCase().includes(q) ||
      String(t.tutorId).toLowerCase().includes(q)
    );
  });

  function parseManualNumbers() {
    return manualInput.split(/[\n,]/).map(n => n.trim()).filter(n => n.length > 0);
  }

  function validateManualNumbers() {
    const nums = parseManualNumbers();
    const invalid = nums.filter(n => !n.startsWith('+'));
    if (invalid.length > 0) {
      setManualError(`Must start with +: ${invalid.join(', ')}`);
      return false;
    }
    setManualError('');
    return true;
  }

  async function handleSend() {
    const manualNums = parseManualNumbers();
    if (selected.size === 0 && manualNums.length === 0) return alert('Select at least one tutor or enter a number.');
    if (!selectedTuition) return alert('Please select a Tuition ID.');
    if (manualNums.length > 0 && !validateManualNumbers()) return;

    const totalCount = selected.size + manualNums.length;
    const confirmed = confirm(`Send to ${totalCount} recipient${totalCount > 1 ? 's' : ''}?\n\nTuition: ${selectedTuition.tuitionId}`);
    if (!confirmed) return;

    setSending(true);
    setResults(null);
    setError(null);

    const fromList = tutors.filter(t => selected.has(t.id)).map(t => ({ name: t.name, phone: t.phone, tutorId: t.tutorId }));
    const fromManual = manualNums.map(n => ({ name: n, phone: n, tutorId: '-' }));
    const recipients = [...fromList, ...fromManual];

    try {
      if (recipients.length === 1) {
        const r = recipients[0];
        const res = await fetch('/api/send-one', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: r.name, phone: r.phone, message: selectedTuition.message }),
        });
        const data = await res.json();
        setResults({ queued: false, summary: { total: 1, sent: data.status === 'sent' ? 1 : 0, failed: data.status === 'sent' ? 0 : 1 }, results: [data] });
      } else {
        const res = await fetch('/api/start-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipients, message: selectedTuition.message }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to queue messages');
        setResults({ queued: true, ...data });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setSelected(new Set());
    setManualInput('');
    setManualError('');
    setSelectedTuition(null);
    setResults(null);
    setError(null);
  }

  if (!mounted) return null;

  const filteredTuitions = tuitions.filter(t =>
    t.tuitionId.toLowerCase().includes(tuitionSearch.toLowerCase())
  );

  const manualNums = parseManualNumbers();
  const totalRecipients = selected.size + manualNums.length;
  const selectedTutorsList = tutors.filter(t => selected.has(t.id));

  return (
    <>
      <Head>
        <title>KEEP TUTORS — Message Sender</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0d0d0d;
          --surface: #161616;
          --surface2: #1e1e1e;
          --border: #2a2a2a;
          --accent: #c8ff00;
          --accent-dim: rgba(200,255,0,0.08);
          --accent-border: rgba(200,255,0,0.2);
          --text: #f0f0f0;
          --muted: #555;
          --muted2: #888;
          --danger: #ff4d4d;
          --success: #22c55e;
        }
        body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; height: 100vh; overflow: hidden; }
        .app { display: flex; flex-direction: column; height: 100vh; }

        header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 24px; border-bottom: 1px solid var(--border);
          background: var(--bg); flex-shrink: 0;
        }
        .logo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 17px; letter-spacing: -0.02em; }
        .logo span { color: var(--accent); }
        .header-badge {
          background: var(--accent-dim); border: 1px solid var(--accent-border);
          color: var(--accent); font-size: 12px; font-weight: 600;
          padding: 3px 10px; border-radius: 20px;
        }

        .columns {
          display: grid;
          grid-template-columns: 260px 1fr 380px;
          flex: 1;
          overflow: hidden;
          min-height: 0;
        }

        .panel { display: flex; flex-direction: column; border-right: 1px solid var(--border); overflow: hidden; min-height: 0; }
        .panel:last-child { border-right: none; }

        .panel-head { padding: 12px 14px 10px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
        .panel-title { font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted2); margin-bottom: 8px; }
        .panel-body { flex: 1; overflow-y: auto; min-height: 0; }
        .panel-body::-webkit-scrollbar { width: 3px; }
        .panel-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

        .search-wrap { position: relative; }
        .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--muted2); pointer-events: none; }
        .search-input {
          width: 100%; background: var(--surface2); border: 1px solid var(--border);
          border-radius: 7px; color: var(--text); padding: 8px 10px 8px 32px;
          font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s;
        }
        .search-input:focus { border-color: var(--accent); }
        .search-input::placeholder { color: var(--muted); }

        .select-all {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 14px; border-bottom: 1px solid var(--border);
          cursor: pointer; user-select: none; font-size: 12px; color: var(--muted2);
          transition: background 0.1s; flex-shrink: 0;
        }
        .select-all:hover { background: var(--surface2); }

        .tutor-item {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 14px; cursor: pointer; transition: background 0.1s; user-select: none;
        }
        .tutor-item:hover { background: var(--surface2); }
        .tutor-item.is-selected { background: var(--accent-dim); }
        .checkbox {
          width: 15px; height: 15px; border: 1.5px solid var(--border);
          border-radius: 3px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all 0.1s;
        }
        .tutor-item.is-selected .checkbox { background: var(--accent); border-color: var(--accent); }
        .checkbox svg { display: none; }
        .tutor-item.is-selected .checkbox svg { display: block; }
        .tutor-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tutor-meta { font-size: 11px; color: var(--muted2); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .middle-top { padding: 12px 14px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
        .manual-textarea {
          width: 100%; background: var(--surface2); border: 1px solid var(--border);
          border-radius: 7px; color: var(--text); padding: 9px 11px;
          font-size: 13px; font-family: 'DM Sans', sans-serif; resize: none; outline: none;
          transition: border-color 0.15s; line-height: 1.6;
        }
        .manual-textarea:focus { border-color: var(--accent); }
        .manual-textarea::placeholder { color: var(--muted); font-size: 12px; }
        .manual-textarea.has-error { border-color: var(--danger); }
        .field-hint { font-size: 11px; color: var(--muted2); margin-top: 5px; }
        .field-error { font-size: 11px; color: var(--danger); margin-top: 5px; }

        .selected-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px 6px; flex-shrink: 0; }
        .selected-header-label { font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted2); }
        .selected-count { font-size: 11px; color: var(--accent); font-weight: 600; background: var(--accent-dim); border: 1px solid var(--accent-border); padding: 1px 7px; border-radius: 10px; }

        .middle-selected { flex: 1; overflow-y: auto; min-height: 0; }
        .middle-selected::-webkit-scrollbar { width: 3px; }
        .middle-selected::-webkit-scrollbar-thumb { background: var(--border); }

        .selected-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; font-size: 13px; border-bottom: 1px solid var(--border); }
        .selected-item:last-child { border-bottom: none; }
        .selected-item-name { font-weight: 500; font-size: 13px; }
        .selected-item-meta { font-size: 11px; color: var(--muted2); margin-top: 1px; }
        .remove-btn { background: none; border: none; color: var(--muted2); cursor: pointer; font-size: 16px; line-height: 1; padding: 2px 5px; border-radius: 4px; transition: color 0.1s, background 0.1s; flex-shrink: 0; }
        .remove-btn:hover { color: var(--danger); background: rgba(255,77,77,0.1); }

        .empty-msg { padding: 16px 14px; font-size: 12px; color: var(--muted); font-style: italic; }

        .right-panel { padding: 14px; display: flex; flex-direction: column; gap: 14px; overflow: hidden; min-height: 0; }
        .right-panel::-webkit-scrollbar { width: 3px; }
        .right-panel::-webkit-scrollbar-thumb { background: var(--border); }

        .field-label { font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted2); margin-bottom: 7px; }

        .combobox-wrap { position: relative; }
        .combobox-input {
          width: 100%; background: var(--surface2); border: 1px solid var(--border);
          border-radius: 7px; color: var(--text); padding: 9px 11px;
          font-size: 13px; font-family: 'DM Sans', sans-serif; outline: none;
          transition: border-color 0.15s;
        }
        .combobox-input:focus { border-color: var(--accent); }
        .combobox-input::placeholder { color: var(--muted); }
        .combobox-input.has-value { color: var(--accent); font-weight: 500; }
        .combobox-dropdown {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 7px; z-index: 100; max-height: 200px; overflow-y: auto;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        }
        .combobox-dropdown::-webkit-scrollbar { width: 3px; }
        .combobox-dropdown::-webkit-scrollbar-thumb { background: var(--border); }
        .combobox-option {
          padding: 9px 12px; font-size: 13px; cursor: pointer;
          transition: background 0.1s; border-bottom: 1px solid var(--border);
        }
        .combobox-option:last-child { border-bottom: none; }
        .combobox-option:hover { background: var(--surface2); }
        .combobox-option.is-selected { background: var(--accent-dim); color: var(--accent); font-weight: 500; }
        .combobox-empty { padding: 10px 12px; font-size: 12px; color: var(--muted); font-style: italic; }

        .msg-preview {
          background: var(--surface2); border: 1px solid var(--border);
          border-left: 3px solid var(--accent); border-radius: 7px;
          padding: 11px 12px; font-size: 13px; line-height: 1.7; color: var(--text);
          white-space: pre-wrap; flex: 1; overflow-y: auto; min-height: 80px;
        }
        .msg-preview::-webkit-scrollbar { width: 3px; }
        .msg-preview::-webkit-scrollbar-thumb { background: var(--border); }
        .msg-preview-wrap { display: flex; flex-direction: column; flex: 1; min-height: 0; }
        .msg-placeholder { color: var(--muted); font-style: italic; font-size: 12px; }

        .send-btn {
          background: var(--accent); color: #0d0d0d; border: none; border-radius: 8px;
          padding: 12px; font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: opacity 0.15s, transform 0.1s; width: 100%;
        }
        .send-btn:hover:not(:disabled) { opacity: 0.88; }
        .send-btn:active:not(:disabled) { transform: scale(0.98); }
        .send-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .reset-btn {
          background: transparent; border: 1px solid var(--border); color: var(--muted2);
          border-radius: 7px; padding: 9px; font-size: 12px; cursor: pointer; width: 100%;
          transition: all 0.15s; font-family: 'DM Sans', sans-serif;
        }
        .reset-btn:hover { border-color: var(--text); color: var(--text); }

        .error-banner { background: rgba(255,77,77,0.1); border: 1px solid rgba(255,77,77,0.3); border-radius: 7px; padding: 10px 12px; font-size: 12px; color: var(--danger); }

        .results-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
        .results-summary { display: flex; }
        .stat { flex: 1; padding: 10px 8px; text-align: center; border-right: 1px solid var(--border); }
        .stat:last-child { border-right: none; }
        .stat-num { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; }
        .stat-num.green { color: var(--success); }
        .stat-num.red { color: var(--danger); }
        .stat-label { font-size: 10px; color: var(--muted2); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 1px; }
        .result-rows { max-height: 140px; overflow-y: auto; }
        .result-row { display: flex; align-items: center; justify-content: space-between; font-size: 12px; padding: 6px 12px; border-top: 1px solid var(--border); }
        .result-row.sent { border-left: 2px solid var(--success); }
        .result-row.failed { border-left: 2px solid var(--danger); }
        .result-status { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .result-status.sent { color: var(--success); }
        .result-status.failed { color: var(--danger); }

        .queued-card { background: var(--accent-dim); border: 1px solid var(--accent-border); border-radius: 8px; padding: 14px; text-align: center; }
        .queued-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 14px; margin-bottom: 5px; }
        .queued-sub { font-size: 12px; color: var(--muted2); line-height: 1.6; }

        .skeleton { background: linear-gradient(90deg, var(--surface2) 25%, var(--surface) 50%, var(--surface2) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 4px; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .spinner { width: 15px; height: 15px; border: 2px solid rgba(13,13,13,0.3); border-top-color: #0d0d0d; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="app">
        <header>
          <div className="logo">KEEP <span>TUTORS</span></div>
          {totalRecipients > 0 && (
            <div className="header-badge">{totalRecipients} recipient{totalRecipients !== 1 ? 's' : ''} selected</div>
          )}
        </header>

        <div className="columns">

          {/* ── COL 1: TUTOR LIST ── */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Tutors {!loading && `(${filtered.length})`}</div>
              <div className="search-wrap">
                <svg className="search-icon" width="13" height="13" viewBox="0 0 15 15" fill="none">
                  <path d="M10 6.5C10 8.43 8.43 10 6.5 10C4.57 10 3 8.43 3 6.5C3 4.57 4.57 3 6.5 3C8.43 3 10 4.57 10 6.5ZM9.35 10.41L12.5 13.56" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input className="search-input" placeholder="Name, phone or ID..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            {!loading && !error && filtered.length > 0 && (
              <div className="select-all" onClick={toggleAll}>
                <div className="checkbox" style={selected.size === filtered.length && filtered.length > 0 ? {background:'var(--accent)',borderColor:'var(--accent)'} : {}}>
                  {selected.size === filtered.length && filtered.length > 0 && (
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L4 7.5L8.5 2.5" stroke="#0d0d0d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                </div>
                <span>Select all{search ? ` (${filtered.length})` : ''}</span>
              </div>
            )}

            <div className="panel-body">
              {loading && Array.from({length: 9}).map((_, i) => (
                <div key={i} className="tutor-item" style={{cursor:'default'}}>
                  <div className="skeleton" style={{width:15,height:15,borderRadius:3,flexShrink:0}} />
                  <div style={{flex:1,display:'flex',flexDirection:'column',gap:4}}>
                    <div className="skeleton" style={{height:12,width:["70%","55%","80%","65%","75%","60%","85%","50%","68%"][i]}} />
                    <div className="skeleton" style={{height:10,width:"50%"}} />
                  </div>
                </div>
              ))}
              {!loading && error && (
                <div style={{padding:'16px 14px',fontSize:12,color:'var(--danger)'}}>
                  ⚠ {error}
                  <button className="reset-btn" style={{marginTop:8}} onClick={fetchTutors}>Retry</button>
                </div>
              )}
              {!loading && !error && filtered.length === 0 && <div className="empty-msg">No tutors found</div>}
              {!loading && !error && filtered.map(tutor => (
                <div key={tutor.id} className={`tutor-item${selected.has(tutor.id) ? ' is-selected' : ''}`} onClick={() => toggleTutor(tutor.id)}>
                  <div className="checkbox">
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L4 7.5L8.5 2.5" stroke="#0d0d0d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="tutor-name">{tutor.name}</div>
                    <div className="tutor-meta">{tutor.phone} · {tutor.tutorId}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── COL 2: MANUAL NUMBERS + SELECTED TUTORS ── */}
          <div className="panel">
            <div className="middle-top">
              <div className="panel-title">Manual Numbers</div>
              <textarea
                className={`manual-textarea${manualError ? ' has-error' : ''}`}
                placeholder={"+923001234567\n+923331234567\n\nOne per line or comma separated\nMust include country code (+92)"}
                value={manualInput}
                onChange={e => { setManualInput(e.target.value); setManualError(''); }}
                rows={5}
              />
              {manualError
                ? <div className="field-error">⚠ {manualError}</div>
                : <div className="field-hint">Must start with + and country code · spaces removed automatically</div>
              }
            </div>

            <div className="selected-header">
              <span className="selected-header-label">Selected Tutors</span>
              {selected.size > 0 && <span className="selected-count">{selected.size}</span>}
            </div>

            <div className="middle-selected">
              {selectedTutorsList.length === 0
                ? <div className="empty-msg">No tutors selected — click from the left panel</div>
                : selectedTutorsList.map(t => (
                  <div key={t.id} className="selected-item">
                    <div style={{minWidth:0}}>
                      <div className="selected-item-name">{t.name}</div>
                      <div className="selected-item-meta">{t.phone} · {t.tutorId}</div>
                    </div>
                    <button className="remove-btn" onClick={() => toggleTutor(t.id)}>×</button>
                  </div>
                ))
              }
            </div>
          </div>

          {/* ── COL 3: TUITION + MESSAGE + SEND ── */}
          <div className="panel">
            <div className="right-panel">

              <div>
                <div className="field-label">Tuition ID</div>
                <div className="combobox-wrap">
                  <input
                    className={`combobox-input${selectedTuition && !tuitionOpen ? ' has-value' : ''}`}
                    placeholder="Type to search tuition ID..."
                    value={tuitionOpen ? tuitionSearch : (selectedTuition ? selectedTuition.tuitionId : '')}
                    onFocus={() => { setTuitionOpen(true); setTuitionSearch(''); }}
                    onBlur={() => setTimeout(() => setTuitionOpen(false), 150)}
                    onChange={e => setTuitionSearch(e.target.value)}
                  />
                  {tuitionOpen && (
                    <div className="combobox-dropdown">
                      {filteredTuitions.length === 0
                        ? <div className="combobox-empty">No results</div>
                        : filteredTuitions.map(t => (
                          <div
                            key={t.id}
                            className={`combobox-option${selectedTuition?.id === t.id ? ' is-selected' : ''}`}
                            onMouseDown={() => { setSelectedTuition(t); setTuitionOpen(false); setTuitionSearch(''); }}
                          >
                            {t.tuitionId}
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>

              <div className="msg-preview-wrap">
                <div className="field-label">Message</div>
                {selectedTuition
                  ? <div className="msg-preview">{selectedTuition.message}</div>
                  : <div className="msg-placeholder">Select a tuition ID to preview its message</div>
                }
              </div>

              {error && <div className="error-banner">⚠ {error}</div>}

              {results?.queued === true && (
                <div className="queued-card">
                  <div style={{fontSize:22,marginBottom:5}}>✅</div>
                  <div className="queued-title">{results.queued} message{results.queued !== 1 ? 's' : ''} queued</div>
                  <div className="queued-sub">Sending in background · {results.estimatedCompletion}<br/>You can safely close this tab</div>
                  {results.scheduled?.some(r => !r.queued) && (
                    <div className="result-rows" style={{marginTop:8,textAlign:'left'}}>
                      {results.scheduled.filter(r => !r.queued).map((r, i) => (
                        <div key={i} className="result-row failed"><span>{r.name}</span><span className="result-status failed">failed</span></div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {results?.queued === false && results.summary && (
                <div className="results-card">
                  <div className="results-summary">
                    <div className="stat"><div className="stat-num green">{results.summary.sent}</div><div className="stat-label">Sent</div></div>
                    <div className="stat"><div className={`stat-num${results.summary.failed > 0 ? ' red' : ''}`}>{results.summary.failed}</div><div className="stat-label">Failed</div></div>
                  </div>
                  <div className="result-rows">
                    {results.results?.map((r, i) => (
                      <div key={i} className={`result-row ${r.status}`}>
                        <span>{r.name}</span>
                        <span className={`result-status ${r.status}`}>{r.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results ? (
                <button className="reset-btn" onClick={reset}>↺ Send Another Batch</button>
              ) : (
                <button
                  className="send-btn"
                  onClick={handleSend}
                  disabled={sending || totalRecipients === 0 || !selectedTuition}
                >
                  {sending ? (
                    <><div className="spinner" /> Sending...</>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                        <path d="M14 2L7 9M14 2L9.5 14L7 9M14 2L2 6.5L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {totalRecipients > 0 ? `Send to ${totalRecipients} recipient${totalRecipients !== 1 ? 's' : ''}` : 'Select recipients & tuition'}
                    </>
                  )}
                </button>
              )}

            </div>
          </div>

        </div>
      </div>
    </>
  );
}
