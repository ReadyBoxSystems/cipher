/* global React, CipherData */
// Cipher app — all screens in one component, hash-based "router" via state.
// This is a high-fidelity demo: real-feeling interactions, no backend.

const { useState, useEffect, useRef } = React;
const {
  CIPHERS, CIPHER_LABELS, CIPHER_HINT, CIPHER_USES_KEY,
  applyCipher, renderCipher,
  ME_USER, CONTACTS, CONVERSATIONS, DEMO_MESSAGES, DEFAULT_SETTINGS,
  strColor, ago, timeOnly
} = CipherData;

// ── Logo ──────────────────────────────────────────────────

function Logo({ size = 'md' }) {
  return (
    <div className="cipher-logo">
      <div className="logo-mark" style={size === 'lg' ? { width: 72, height: 72 } : null}>
        <span style={size === 'lg' ? { fontSize: 28 } : null}>⌘</span>
      </div>
      <div className="logo-name">CIPHER</div>
      <div className="logo-by">BY READYBOX SYSTEMS</div>
    </div>
  );
}

// ── Auth screen ──────────────────────────────────────────

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('in');
  return (
    <div className="screen auth-screen">
      <Logo size="lg" />
      <div className="auth-block">
        <div className="tab-row">
          <button className={`tab ${mode === 'in' ? 'active' : ''}`} onClick={() => setMode('in')}>Sign In</button>
          <button className={`tab ${mode === 'up' ? 'active' : ''}`} onClick={() => setMode('up')}>Sign Up</button>
        </div>
        <form className="form" onSubmit={(e) => { e.preventDefault(); onAuth(); }}>
          <input className="field" type="email" placeholder="email"
            defaultValue="jordan@readyboxhq.com" autoComplete="email" />
          <input className="field" type="password" placeholder="password"
            defaultValue="••••••••" autoComplete={mode === 'up' ? 'new-password' : 'current-password'} />
          <button className="btn" type="submit">{mode === 'in' ? 'Sign In' : 'Create Account'}</button>
        </form>
        <div className="error-msg"></div>
      </div>
      <div className="legal-line">
        AES-256-GCM · Web Crypto<br />
        Server stores ciphertext only
      </div>
    </div>
  );
}

// ── Inbox ────────────────────────────────────────────────

function InboxScreen({ onOpen, onNew, onSettings }) {
  return (
    <div className="screen">
      <div className="topbar">
        <button className="icon-btn" onClick={onSettings} title="Settings">≡</button>
        <div className="topbar-center">
          <div className="topbar-title">CIPHER</div>
          <div className="topbar-sub">@{ME_USER.username}</div>
        </div>
        <button className="icon-btn accent" onClick={onNew} title="New conversation">＋</button>
      </div>

      <div className="inbox-list">
        <div className="inbox-meta">
          <span><span className="dot"></span>Encrypted · 3 active</span>
          <span>Live</span>
        </div>

        {CONVERSATIONS.map(c => {
          const contact = CONTACTS[c.contact];
          const settings = DEFAULT_SETTINGS[c.id];
          const lastMsg = (DEMO_MESSAGES[c.id] || []).slice(-1)[0];
          const ini = (contact.display_name || contact.username)[0].toUpperCase();
          const isLocked = !settings.keep;
          const preview = isLocked
            ? renderCipher(lastMsg).slice(0, 28)
            : lastMsg.text.slice(0, 36);

          return (
            <div key={c.id} className="conv-row" onClick={() => onOpen(c.id)}>
              <div className={`avatar has-cipher`} style={{ background: strColor(contact.username) }}>
                {ini}
                {c.unread > 0 && <div className="conv-unread">{c.unread}</div>}
              </div>
              <div className="conv-info">
                <div className="conv-name">
                  @{contact.username}
                  <span className="conv-cipher-tag">{CIPHER_LABELS[settings.cipher]}</span>
                </div>
                <div className={`conv-preview ${isLocked ? 'locked' : ''}`}>
                  {isLocked && <span className="lock-mini">⚿</span>}
                  {preview}{preview.length >= 28 ? '…' : ''}
                </div>
              </div>
              <div className="conv-time">{ago(c.last_at)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Cipher picker sheet ──────────────────────────────────

function CipherSheet({ active, onPick, onClose }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">SELECT CIPHER</div>
        <div className="sheet-list">
          {CIPHERS.map(c => (
            <div key={c} className={`sheet-row ${c === active ? 'active' : ''}`} onClick={() => onPick(c)}>
              <span>{CIPHER_LABELS[c]}</span>
              <span className="sheet-row-hint">{CIPHER_HINT[c]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Single message bubble (with optional flip) ───────────

function MessageBubble({ msg, mine, isLocked, isFlipped, onTap, flipStyle, onDecode, decodeError, isFreshIncoming }) {
  const cipherText = renderCipher(msg);

  // Decoded — render as plain bubble (no flip element)
  if (!isLocked) {
    return (
      <div className={`bubble ${mine ? 'mine' : 'theirs'}`}>
        <div className="cipher-tag-row">
          <span className="cipher-tag">{CIPHER_LABELS[msg.cipher]}</span>
          {msg.key && <span className="cipher-tag" style={{ opacity: 0.6 }}>KEY · {msg.key}</span>}
        </div>
        <div className="bubble-text">{msg.text}</div>
      </div>
    );
  }

  // Locked — front face shows cipher text, back face shows decode form
  return (
    <div className="card-container">
      <div className={`card ${flipStyle === 'x' ? 'flip-x' : 'flip-y'} ${isFlipped ? 'flipped' : ''}`}>
        <div className="card-face front">
          <div
            className={`bubble locked ${mine ? 'mine' : 'theirs'}`}
            onClick={onTap}
          >
            <div className="cipher-tag-row">
              <span className={`lock-glyph-tiny ${isFreshIncoming ? 'pulse-once' : ''}`}>⚿</span>
              <span className="cipher-tag" style={{ opacity: 0.5 }}>LOCKED</span>
            </div>
            <div className={`bubble-cipher ${msg.cipher}`}>
              {cipherText}
            </div>
          </div>
        </div>

        <div className="card-face back">
          <div className="decode-form">
            <div className="decode-title">DECODE MESSAGE</div>
            <div className="decode-row">
              <select
                className="field-sm"
                defaultValue={msg.cipher}
                onClick={e => e.stopPropagation()}
                style={{ flex: 1.4 }}
              >
                {CIPHERS.map(c => (
                  <option key={c} value={c}>{CIPHER_LABELS[c]}</option>
                ))}
              </select>
              <input
                className="field-sm"
                placeholder="key"
                defaultValue={msg.key}
                onClick={e => e.stopPropagation()}
              />
            </div>
            <label className="check-label" onClick={e => e.stopPropagation()}>
              <input type="checkbox" defaultChecked={false} />
              Keep decoded for me
            </label>
            {decodeError && <div className="error-msg">{decodeError}</div>}
            <div className="decode-row" style={{ gap: 6 }}>
              <button
                className="btn-sm"
                style={{ flex: 1, background: 'transparent', borderColor: 'var(--border2)', color: 'var(--text-mid)' }}
                onClick={(e) => { e.stopPropagation(); onTap(); }}
              >
                Cancel
              </button>
              <button
                className="btn-sm"
                style={{ flex: 1.2 }}
                onClick={(e) => { e.stopPropagation(); onDecode(); }}
              >
                Decode
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Chat ─────────────────────────────────────────────────

function ChatScreen({ convId, onBack, flipStyle, demoMode }) {
  const conv = CONVERSATIONS.find(c => c.id === convId);
  const contact = CONTACTS[conv.contact];
  const baseSettings = DEFAULT_SETTINGS[convId];

  // Local state
  const [settings, setSettings] = useState(baseSettings);
  const [messages, setMessages] = useState(() => {
    // Mark which messages are "decoded" given the keep state
    return DEMO_MESSAGES[convId].map(m => ({ ...m, _decoded: baseSettings.keep }));
  });
  const [flippedId, setFlippedId] = useState(null);
  const [showCipherSheet, setShowCipherSheet] = useState(null); // 'compose'
  const [composeText, setComposeText] = useState('');
  const [decodeError, setDecodeError] = useState({});

  // Demo mode — auto-flip the latest unread message to show off mid-decode state
  useEffect(() => {
    if (demoMode === 'mid-decode') {
      const lastTheirs = [...messages].reverse().find(m => m.from !== 'me' && !m._decoded);
      if (lastTheirs) setFlippedId(lastTheirs.id);
    }
  }, [demoMode]);

  const listRef = useRef(null);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [convId]);

  function handleTap(id) {
    setFlippedId(prev => prev === id ? null : id);
    setDecodeError(d => ({ ...d, [id]: null }));
  }

  function handleDecode(id) {
    // Demo — always succeed
    setMessages(prev => prev.map(m => m.id === id ? { ...m, _decoded: true } : m));
    setFlippedId(null);
  }

  function handleSend() {
    const text = composeText.trim();
    if (!text) return;
    const newMsg = {
      id: 'sent-' + Date.now(),
      from: 'me',
      text,
      cipher: settings.cipher,
      key: settings.key,
      mins_ago: 0,
      _decoded: true
    };
    setMessages(prev => [...prev, newMsg]);
    setComposeText('');
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }

  return (
    <div className="screen chat-screen">
      <div className="chat-topbar">
        <button className="icon-btn" onClick={onBack}>←</button>
        <div className="chat-contact">
          <div className="avatar" style={{ background: strColor(contact.username) }}>
            {contact.display_name[0].toUpperCase()}
          </div>
          <div className="chat-contact-info">
            <div className="chat-contact-name">@{contact.username}</div>
            <div className="chat-contact-status">
              <span className="pulse"></span>
              {settings.keep ? 'AUTO-DECODE · ' + CIPHER_LABELS[settings.cipher].toUpperCase() : 'LOCKED · ' + CIPHER_LABELS[settings.cipher].toUpperCase()}
            </div>
          </div>
        </div>
        <button className="icon-btn">⋯</button>
      </div>

      <div className="messages-list" ref={listRef}>
        <div className="day-divider">TODAY</div>
        {messages.map((m, i) => {
          const mine = m.from === 'me';
          const isLocked = !m._decoded;
          const isFlipped = flippedId === m.id;
          // Pulse the most recent locked theirs message
          const lastTheirsLockedIdx = (() => {
            for (let j = messages.length - 1; j >= 0; j--) {
              if (messages[j].from !== 'me' && !messages[j]._decoded) return j;
            }
            return -1;
          })();
          const isFreshIncoming = i === lastTheirsLockedIdx;

          return (
            <div key={m.id} className={`msg-wrap ${mine ? 'mine' : 'theirs'}`}>
              <MessageBubble
                msg={m}
                mine={mine}
                isLocked={isLocked}
                isFlipped={isFlipped}
                flipStyle={flipStyle}
                onTap={() => handleTap(m.id)}
                onDecode={() => handleDecode(m.id)}
                decodeError={decodeError[m.id]}
                isFreshIncoming={isFreshIncoming}
              />
              <div className="msg-time">{timeOnly(m.mins_ago)}</div>
            </div>
          );
        })}
      </div>

      <div className="compose-bar">
        <div className="compose-meta">
          <button className="cipher-pill" onClick={() => setShowCipherSheet('compose')}>
            {CIPHER_LABELS[settings.cipher]}
            <span className="caret">▾</span>
          </button>
          {CIPHER_USES_KEY[settings.cipher] && (
            <input
              className="key-mini"
              placeholder="key"
              value={settings.key}
              onChange={e => setSettings(s => ({ ...s, key: e.target.value }))}
            />
          )}
          {settings.keep && (
            <div className="auto-indicator">
              <span className="dot"></span>AUTO
            </div>
          )}
        </div>
        <div className="compose-row">
          <textarea
            className="compose-input"
            placeholder="Type a message…"
            rows="1"
            value={composeText}
            onChange={e => setComposeText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button className="send-btn" onClick={handleSend} disabled={!composeText.trim()}>→</button>
        </div>
      </div>

      {showCipherSheet === 'compose' && (
        <CipherSheet
          active={settings.cipher}
          onPick={(c) => {
            setSettings(s => ({ ...s, cipher: c }));
            setShowCipherSheet(null);
          }}
          onClose={() => setShowCipherSheet(null)}
        />
      )}
    </div>
  );
}

// ── New conversation / invite ────────────────────────────

function NewChatScreen({ onBack }) {
  const [copied, setCopied] = useState(false);
  const code = 'a3f8b2c1';
  const url = `cipher.readyboxhq.com/#/invite/${code}`;

  function handleCopy() {
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="screen">
      <div className="topbar">
        <button className="icon-btn" onClick={onBack}>←</button>
        <div className="topbar-center">
          <div className="topbar-title">NEW CHANNEL</div>
        </div>
        <div style={{ width: 44 }}></div>
      </div>
      <div className="invite-body">
        <div className="empty-glyph">⚷</div>
        <div className="invite-block">
          <div className="invite-hint">
            Share this one-time link to start a conversation.<br />
            Agree on a cipher and key out of band.
          </div>
          <div className="invite-link-box">
            <div className="small-tag">INVITE · 7D</div>
            {url}
          </div>
          <button className="btn" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy Link'}
          </button>
        </div>
        <div className="invite-note">
          THE LINK DOES NOT REVEAL<br />
          YOUR KEY OR CIPHER
        </div>
      </div>
    </div>
  );
}

// ── Settings ─────────────────────────────────────────────

function SettingsScreen({ onBack, onSignOut }) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(ME_USER.display_name);

  return (
    <div className="screen">
      <div className="topbar">
        <button className="icon-btn" onClick={onBack}>←</button>
        <div className="topbar-center">
          <div className="topbar-title">SETTINGS</div>
        </div>
        <div style={{ width: 44 }}></div>
      </div>

      <div className="settings-list">
        <div className="settings-header">
          <div className="avatar" style={{ background: strColor(ME_USER.username), width: 48, height: 48, fontSize: 18 }}>
            {ME_USER.display_name[0].toUpperCase()}
          </div>
          <div className="settings-header-info">
            <div className="name">@{ME_USER.username}</div>
            <div className="email">{ME_USER.email}</div>
          </div>
        </div>

        <div className="settings-section-label">PROFILE</div>
        <div className="settings-row" onClick={() => setEditingName(v => !v)}>
          <span className="label">Display name</span>
          {editingName ? (
            <input
              autoFocus
              className="field-sm"
              style={{ maxWidth: 140, fontSize: 12 }}
              value={name}
              onClick={e => e.stopPropagation()}
              onChange={e => setName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={e => { if (e.key === 'Enter') setEditingName(false); }}
            />
          ) : (
            <span className="value editable">{name} <span className="chev">›</span></span>
          )}
        </div>
        <div className="settings-row readonly">
          <span className="label">Handle</span>
          <span className="value">@{ME_USER.username}</span>
        </div>
        <div className="settings-row readonly">
          <span className="label">Email</span>
          <span className="value">{ME_USER.email}</span>
        </div>

        <div className="settings-section-label">APP</div>
        <div className="settings-row action">
          <span className="label">Install Cipher</span>
          <span className="value"><span className="chev">›</span></span>
        </div>

        <div className="settings-section-label">ACCOUNT</div>
        <div className="settings-row danger" onClick={onSignOut}>
          <span className="label">Sign out</span>
          <span className="value"><span className="chev" style={{ color: 'var(--danger)' }}>›</span></span>
        </div>

        <div style={{ padding: '24px 20px 16px', textAlign: 'center', fontSize: 9, letterSpacing: '0.22em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
          v1.0 · readybox systems
        </div>
      </div>
    </div>
  );
}

// ── Main app shell ───────────────────────────────────────

function CipherApp({ initialScreen = 'chat-cheryl', flipStyle = 'y', accentHue = 42, demoMode = 'mid-decode' }) {
  const [screen, setScreen] = useState(initialScreen);
  // screen values: 'auth' | 'inbox' | 'chat-cheryl' | 'chat-rune' | 'new' | 'settings'

  function go(s) { setScreen(s); }

  let body;
  if (screen === 'auth') body = <AuthScreen onAuth={() => go('inbox')} />;
  else if (screen === 'inbox') body = <InboxScreen
    onOpen={(id) => go('chat-' + id)}
    onNew={() => go('new')}
    onSettings={() => go('settings')}
  />;
  else if (screen.startsWith('chat-')) body = <ChatScreen
    convId={screen.slice(5)}
    onBack={() => go('inbox')}
    flipStyle={flipStyle}
    demoMode={screen === initialScreen ? demoMode : null}
  />;
  else if (screen === 'new') body = <NewChatScreen onBack={() => go('inbox')} />;
  else if (screen === 'settings') body = <SettingsScreen onBack={() => go('inbox')} onSignOut={() => go('auth')} />;

  return (
    <div className="cipher-app" style={{ '--accent-h': accentHue }}>
      {body}
    </div>
  );
}

window.CipherApp = CipherApp;
window.AuthScreen = AuthScreen;
window.InboxScreen = InboxScreen;
window.ChatScreen = ChatScreen;
window.NewChatScreen = NewChatScreen;
window.SettingsScreen = SettingsScreen;
window.MessageBubble = MessageBubble;
window.Logo = Logo;
