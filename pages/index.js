// pages/index.js
import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [tutors, setTutors] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [manualError, setManualError] = useState('');
  const [progress, setProgress] = useState(null); // { current, total, results }

  useEffect(() => {
    setMounted(true);
    fetchTutors();
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

  function toggleTutor(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
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
    // Split by newlines or commas, trim each, filter empty
    return manualInput
      .split(/[\n,]/)
      .map(n => n.trim())
      .filter(n => n.length > 0);
  }

  function validateManualNumbers() {
    const nums = parseManualNumbers();
    const invalid = nums.filter(n => !n.startsWith('+'));
    if (invalid.length > 0) {
      setManualError(`These numbers must start with +: ${invalid.join(', ')}`);
      return false;
    }
    setManualError('');
    return true;
  }

  async function handleSend() {
    const manualNums = parseManualNumbers();
    if (selected.size === 0 && manualNums.length === 0) return alert('Please select at least one tutor or enter a number manually.');
    if (!message.trim()) return alert('Please enter a message.');
    if (manualNums.length > 0 && !validateManualNumbers()) return;

    const totalCount = selected.size + manualNums.length;
    const confirmed = confirm(
      `Send message to ${totalCount} recipient${totalCount > 1 ? 's' : ''}?\n\n"${message.trim()}"`
    );
    if (!confirmed) return;

    setSending(true);
    setResults(null);
    setError(null);

    const fromList = tutors
      .filter(t => selected.has(t.id))
      .map(t => ({ name: t.name, phone: t.phone, tutorId: t.tutorId }));

    const fromManual = manualNums.map(n => ({ name: n, phone: n, tutorId: '—' }));

    const recipients = [...fromList, ...fromManual];

    try {
      const res = await fetch('/api/start-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients, message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to queue messages');
      setResults({ queued: true, ...data });
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setSelected(new Set());
    setMessage('');
    setManualInput('');
    setManualError('');
    setResults(null);
    setError(null);
    setProgress(null);
  }

  if (!mounted) return null;

  return (
    <>
      <Head>
        <title>KEEP TUTORS — Message Sender</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0d0d0d;
          --surface: #161616;
          --surface2: #1e1e1e;
          --border: #2a2a2a;
          --accent: #c8ff00;
          --accent-dim: rgba(200, 255, 0, 0.12);
          --text: #f0f0f0;
          --muted: #666;
          --danger: #ff4d4d;
          --success: #22c55e;
        }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
        }

        .layout {
          display: grid;
          grid-template-columns: 1fr 420px;
          grid-template-rows: auto 1fr;
          height: 100vh;
          gap: 0;
        }

        /* ── HEADER ── */
        header {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 32px;
          border-bottom: 1px solid var(--border);
          background: var(--bg);
        }

        .logo {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 18px;
          letter-spacing: -0.02em;
          color: var(--text);
        }
        .logo span { color: var(--accent); }

        .header-meta {
          font-size: 13px;
          color: var(--muted);
        }
        .header-meta strong {
          color: var(--accent);
          font-weight: 600;
        }

        /* ── LEFT: TUTOR LIST ── */
        .tutor-panel {
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .panel-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--border);
        }

        .panel-title {
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 12px;
        }

        .search-wrap {
          position: relative;
        }
        .search-wrap svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--muted);
          pointer-events: none;
        }
        .search-input {
          width: 100%;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text);
          padding: 9px 12px 9px 36px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color 0.15s;
        }
        .search-input:focus { border-color: var(--accent); }
        .search-input::placeholder { color: var(--muted); }

        .select-all-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 24px;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
          user-select: none;
          font-size: 13px;
          color: var(--muted);
          transition: background 0.1s;
        }
        .select-all-row:hover { background: var(--surface2); }
        .select-all-row .label { display: flex; align-items: center; gap: 10px; }

        .tutor-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px 0;
        }
        .tutor-list::-webkit-scrollbar { width: 4px; }
        .tutor-list::-webkit-scrollbar-track { background: transparent; }
        .tutor-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

        .tutor-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 24px;
          cursor: pointer;
          transition: background 0.1s;
          user-select: none;
        }
        .tutor-item:hover { background: var(--surface2); }
        .tutor-item.is-selected { background: var(--accent-dim); }

        .checkbox {
          width: 18px;
          height: 18px;
          border: 1.5px solid var(--border);
          border-radius: 4px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.1s;
        }
        .tutor-item.is-selected .checkbox {
          background: var(--accent);
          border-color: var(--accent);
        }
        .checkbox svg { display: none; }
        .tutor-item.is-selected .checkbox svg { display: block; }

        .tutor-info { flex: 1; min-width: 0; }
        .tutor-name {
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tutor-phone {
          font-size: 12px;
          color: var(--muted);
          margin-top: 1px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 200px;
          color: var(--muted);
          font-size: 14px;
        }

        /* ── RIGHT: MESSAGE PANEL ── */
        .message-panel {
          display: flex;
          flex-direction: column;
          padding: 28px 28px 24px;
          gap: 20px;
          overflow-y: auto;
        }

        .section-label {
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 10px;
        }

        /* Selected chips */
        .chips-area {
          min-height: 48px;
        }
        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .chip {
          background: var(--accent-dim);
          border: 1px solid rgba(200,255,0,0.2);
          border-radius: 20px;
          padding: 4px 10px;
          font-size: 12px;
          color: var(--accent);
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .chip button {
          background: none;
          border: none;
          color: var(--accent);
          cursor: pointer;
          padding: 0;
          line-height: 1;
          font-size: 14px;
          opacity: 0.6;
          transition: opacity 0.1s;
        }
        .chip button:hover { opacity: 1; }
        .no-selected {
          font-size: 13px;
          color: var(--muted);
          font-style: italic;
        }

        /* Message textarea */
        .msg-box {
          flex: 1;
          min-height: 160px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text);
          padding: 14px;
          font-size: 15px;
          font-family: 'DM Sans', sans-serif;
          resize: none;
          outline: none;
          transition: border-color 0.15s;
          line-height: 1.6;
        }
        .msg-box:focus { border-color: var(--accent); }
        .msg-box::placeholder { color: var(--muted); }

        .char-count {
          font-size: 12px;
          color: var(--muted);
          text-align: right;
          margin-top: -12px;
        }

        /* Send button */
        .send-btn {
          background: var(--accent);
          color: #0d0d0d;
          border: none;
          border-radius: 10px;
          padding: 14px 24px;
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: opacity 0.15s, transform 0.1s;
          letter-spacing: 0.01em;
        }
        .send-btn:hover:not(:disabled) { opacity: 0.9; }
        .send-btn:active:not(:disabled) { transform: scale(0.98); }
        .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Results */
        .results-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 16px;
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

        .results-summary {
          display: flex;
          gap: 16px;
          margin-bottom: 14px;
        }
        .stat {
          flex: 1;
          background: var(--surface2);
          border-radius: 8px;
          padding: 10px 14px;
          text-align: center;
        }
        .stat-num {
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 800;
        }
        .stat-num.green { color: var(--success); }
        .stat-num.red { color: var(--danger); }
        .stat-label { font-size: 11px; color: var(--muted); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.05em; }

        .result-rows { display: flex; flex-direction: column; gap: 4px; max-height: 180px; overflow-y: auto; }
        .result-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
          padding: 6px 8px;
          border-radius: 6px;
          background: var(--surface2);
        }
        .result-row.sent { border-left: 2px solid var(--success); }
        .result-row.failed { border-left: 2px solid var(--danger); }
        .result-status {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .result-status.sent { color: var(--success); }
        .result-status.failed { color: var(--danger); }

        .progress-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }
        .progress-header .label { color: var(--muted); }
        .progress-header .count { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 14px; }
        .progress-bar-track {
          height: 6px;
          background: var(--surface2);
          border-radius: 99px;
          overflow: hidden;
        }
        .progress-bar-fill {
          height: 100%;
          background: var(--accent);
          border-radius: 99px;
          transition: width 0.4s ease;
        }
        .progress-live-rows {
          display: flex;
          flex-direction: column;
          gap: 3px;
          max-height: 140px;
          overflow-y: auto;
        }
        .progress-live-rows::-webkit-scrollbar { width: 3px; }
        .progress-live-rows::-webkit-scrollbar-thumb { background: var(--border); }

        .manual-input-wrap {
          position: relative;
        }
        .manual-textarea {
          width: 100%;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text);
          padding: 12px 14px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          resize: none;
          outline: none;
          transition: border-color 0.15s;
          line-height: 1.6;
        }
        .manual-textarea:focus { border-color: var(--accent); }
        .manual-textarea::placeholder { color: var(--muted); }
        .manual-textarea.has-error { border-color: var(--danger); }
        .manual-hint {
          font-size: 11px;
          color: var(--muted);
          margin-top: 6px;
        }
        .manual-error {
          font-size: 12px;
          color: var(--danger);
          margin-top: 5px;
        }
        .divider {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--muted);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .reset-btn {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--muted);
          border-radius: 8px;
          padding: 10px;
          font-size: 13px;
          cursor: pointer;
          width: 100%;
          transition: all 0.15s;
          font-family: 'DM Sans', sans-serif;
        }
        .reset-btn:hover { border-color: var(--text); color: var(--text); }

        .error-banner {
          background: rgba(255, 77, 77, 0.1);
          border: 1px solid rgba(255, 77, 77, 0.3);
          border-radius: 8px;
          padding: 12px 14px;
          font-size: 13px;
          color: var(--danger);
        }

        /* Skeleton loader */
        .skeleton {
          background: linear-gradient(90deg, var(--surface2) 25%, var(--surface) 50%, var(--surface2) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 6px;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(13,13,13,0.3);
          border-top-color: #0d0d0d;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .layout {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr auto;
          }
          .tutor-panel {
            border-right: none;
            border-bottom: 1px solid var(--border);
            max-height: 45vh;
          }
          header { padding: 14px 18px; }
          .message-panel { padding: 20px 18px; }
        }
      `}</style>

      <div className="layout">
        {/* ── HEADER ── */}
        <header>
          <div className="logo">KEEP <span>TUTORS</span></div>
          {!loading && !error && (
            <div className="header-meta">
              {selected.size > 0 ? (
                <><strong>{selected.size}</strong> of {tutors.length} selected</>
              ) : (
                <>{tutors.length} tutors loaded</>
              )}
            </div>
          )}
        </header>

        {/* ── LEFT: TUTOR LIST ── */}
        <div className="tutor-panel">
          <div className="panel-header">
            <div className="panel-title">Select Tutors</div>
            <div className="search-wrap">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M10 6.5C10 8.43 8.43 10 6.5 10C4.57 10 3 8.43 3 6.5C3 4.57 4.57 3 6.5 3C8.43 3 10 4.57 10 6.5ZM9.35 10.41L12.5 13.56" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                className="search-input"
                placeholder="Search by name, phone or ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {!loading && !error && filtered.length > 0 && (
            <div className="select-all-row" onClick={toggleAll}>
              <span className="label">
                <span className={`checkbox${selected.size === filtered.length && filtered.length > 0 ? ' ' : ''}`}
                  style={selected.size === filtered.length && filtered.length > 0 ? {background:'var(--accent)',borderColor:'var(--accent)'} : {}}>
                  {selected.size === filtered.length && filtered.length > 0 && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#0d0d0d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                Select all {search ? `(${filtered.length} results)` : 'tutors'}
              </span>
            </div>
          )}

          <div className="tutor-list">
            {loading && (
              Array.from({length: 8}).map((_, i) => (
                <div key={i} className="tutor-item" style={{cursor:"default"}}>
                  <div className="skeleton" style={{width:18,height:18,borderRadius:4,flexShrink:0}} />
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:5}}>
                    <div className="skeleton" style={{height:14,width:["70%","55%","80%","65%","75%","60%","85%","50%"][i]}} />
                    <div className="skeleton" style={{height:11,width:"40%"}} />
                  </div>
                </div>
              ))
            )}

            {!loading && error && (
              <div className="empty-state">
                <span style={{fontSize:24}}>⚠️</span>
                <span>Could not load tutors</span>
                <button className="reset-btn" style={{width:'auto',padding:'6px 14px'}} onClick={fetchTutors}>Retry</button>
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div className="empty-state">
                <span>No tutors found</span>
              </div>
            )}

            {!loading && !error && filtered.map(tutor => (
              <div
                key={tutor.id}
                className={`tutor-item${selected.has(tutor.id) ? ' is-selected' : ''}`}
                onClick={() => toggleTutor(tutor.id)}
              >
                <div className="checkbox">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#0d0d0d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="tutor-info">
                  <div className="tutor-name">{tutor.name}</div>
                  <div className="tutor-phone">{tutor.phone} · ID: {tutor.tutorId}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: MESSAGE PANEL ── */}
        <div className="message-panel">

          {/* Selected chips */}
          <div className="chips-area">
            <div className="section-label">Selected</div>
            {selected.size === 0 ? (
              <div className="no-selected">No tutors selected yet — pick from the left</div>
            ) : (
              <div className="chips">
                {tutors.filter(t => selected.has(t.id)).map(t => (
                  <div key={t.id} className="chip">
                    {t.name}
                    <button onClick={() => toggleTutor(t.id)} aria-label={`Remove ${t.name}`}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="divider">or add numbers manually</div>

          {/* Manual number input */}
          <div>
            <div className="section-label">Manual Numbers</div>
            <div className="manual-input-wrap">
              <textarea
                className={`manual-textarea${manualError ? ' has-error' : ''}`}
                placeholder={"+923001234567\n+923331234567\n\nOne per line or comma separated\nMust include country code e.g. +92"}
                value={manualInput}
                onChange={e => { setManualInput(e.target.value); setManualError(''); }}
                rows={4}
              />
            </div>
            {manualError ? (
              <div className="manual-error">⚠ {manualError}</div>
            ) : (
              <div className="manual-hint">Numbers must start with + and include country code · One per line or comma separated · Spaces are removed automatically</div>
            )}
          </div>

          {/* Message box */}
          <div>
            <div className="section-label">Message</div>
            <textarea
              className="msg-box"
              placeholder="Type your message here..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={7}
            />
            <div className="char-count">{message.length} chars</div>
          </div>

          {/* Error banner */}
          {error && !loading && (
            <div className="error-banner">⚠ {error}</div>
          )}

          {/* Queued confirmation card */}
          {results?.queued && (
            <div className="results-card">
              <div style={{textAlign:'center', padding:'8px 0 4px'}}>
                <div style={{fontSize:28, marginBottom:8}}>✅</div>
                <div style={{fontFamily:'Syne, sans-serif', fontWeight:700, fontSize:16, marginBottom:4}}>
                  {results.queued} message{results.queued !== 1 ? 's' : ''} queued
                </div>
                <div style={{fontSize:13, color:'var(--muted)'}}>
                  Sending in background · completes {results.estimatedCompletion}
                </div>
                <div style={{fontSize:12, color:'var(--muted)', marginTop:6}}>
                  You can safely close this tab
                </div>
              </div>
              <div className="result-rows" style={{marginTop:8}}>
                {results.scheduled?.map((r, i) => (
                  <div key={i} className={`result-row ${r.queued ? 'sent' : 'failed'}`}>
                    <span>{r.name}</span>
                    <span className={`result-status ${r.queued ? 'sent' : 'failed'}`}>
                      {r.queued ? r.estimatedSendAt : 'queue failed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buttons */}
          {results?.queued ? (
            <button className="reset-btn" onClick={reset}>↺ Send Another Batch</button>
          ) : (
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={sending || (selected.size === 0 && manualInput.trim().length === 0) || !message.trim()}
            >
              {sending ? (
                <>
                  <div className="spinner" />
                  Sending...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M14 2L7 9M14 2L9.5 14L7 9M14 2L2 6.5L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {(() => {
                    const manualCount = manualInput.trim() ? manualInput.split(/[
,]/).filter(n => n.trim()).length : 0;
                    const total = selected.size + manualCount;
                    return total > 0 ? `Send to ${total} recipient${total > 1 ? 's' : ''}` : 'Send';
                  })()}
                </>
              )}
            </button>
          )}

        </div>
      </div>
    </>
  );
}
