/* global React, CipherData, MessageBubble */
// Cipher — static variants for the design canvas.
// Each variant is a self-contained mini-screen showing one design direction.

const { useState } = React;
const { applyCipher, renderCipher, CIPHER_LABELS, strColor, timeOnly, ME_USER, CONTACTS } = CipherData;

const cherylMsg = { id: 'v1', from: 'cheryl', text: 'Meet at the usual place. 9pm.', cipher: 'caesar', key: '13', mins_ago: 8 };
const myMsg     = { id: 'v2', from: 'me',     text: 'Confirmed. Bringing the second envelope.', cipher: 'caesar', key: '13', mins_ago: 6 };

// ── V1: Classic Y-flip (default direction) ───────────────

function VariantYFlip({ flipped: flippedProp = false }) {
  const [flipped, setFlipped] = useState(flippedProp);
  return (
    <div className="cipher-app" style={{ height: 480, padding: 18, gap: 14, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--accent)', textTransform: 'uppercase' }}>Y-AXIS · DEFAULT</div>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
        <div className="msg-wrap theirs" style={{ maxWidth: 240 }}>
          <div className="card-container">
            <div className={`card flip-y ${flipped ? 'flipped' : ''}`}>
              <div className="card-face front">
                <div className="bubble locked theirs" onClick={() => setFlipped(true)}>
                  <div className="cipher-tag-row">
                    <span className="lock-glyph-tiny">⚿</span>
                    <span className="cipher-tag" style={{ opacity: 0.5 }}>LOCKED</span>
                  </div>
                  <div className="bubble-cipher caesar">{renderCipher(cherylMsg)}</div>
                </div>
              </div>
              <div className="card-face back">
                <div className="decode-form">
                  <div className="decode-title">DECODE</div>
                  <div className="decode-row">
                    <select className="field-sm" defaultValue="caesar"><option value="caesar">Caesar</option></select>
                    <input className="field-sm" defaultValue="13" />
                  </div>
                  <label className="check-label"><input type="checkbox" /> Keep decoded for me</label>
                  <button className="btn-sm" onClick={() => setFlipped(false)}>Decode</button>
                </div>
              </div>
            </div>
          </div>
          <div className="msg-time">9:14 PM</div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.06em', textAlign: 'center', width: '100%', marginTop: 6 }}>
        Tap the bubble. 0.5s rotateY ease-in-out.
      </div>
    </div>
  );
}

// ── V2: X-flip (envelope) ────────────────────────────────

function VariantXFlip({ flipped: flippedProp = true }) {
  const [flipped, setFlipped] = useState(flippedProp);
  return (
    <div className="cipher-app" style={{ height: 480, padding: 18, gap: 14, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--accent)', textTransform: 'uppercase' }}>X-AXIS · ENVELOPE</div>
      <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start' }}>
        <div className="msg-wrap theirs" style={{ maxWidth: 240 }}>
          <div className="card-container">
            <div className={`card flip-x ${flipped ? 'flipped' : ''}`}>
              <div className="card-face front">
                <div className="bubble locked theirs" onClick={() => setFlipped(true)}>
                  <div className="cipher-tag-row">
                    <span className="lock-glyph-tiny">⚿</span>
                    <span className="cipher-tag" style={{ opacity: 0.5 }}>SEALED</span>
                  </div>
                  <div className="bubble-cipher caesar">{renderCipher(cherylMsg)}</div>
                </div>
              </div>
              <div className="card-face back">
                <div className="decode-form">
                  <div className="decode-title">UNSEAL</div>
                  <div className="decode-row">
                    <select className="field-sm" defaultValue="caesar"><option value="caesar">Caesar</option></select>
                    <input className="field-sm" defaultValue="13" />
                  </div>
                  <label className="check-label"><input type="checkbox" defaultChecked /> Keep decoded for me</label>
                  <button className="btn-sm" onClick={() => setFlipped(false)}>Open</button>
                </div>
              </div>
            </div>
          </div>
          <div className="msg-time">9:14 PM</div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.06em', textAlign: 'center', width: '100%', marginTop: 6 }}>
        Top hinge. Feels like opening a sealed letter.
      </div>
    </div>
  );
}

// ── V3: Rune dissolve (cipher-flavored) ──────────────────

function VariantDissolve() {
  const [decoded, setDecoded] = useState(false);
  const cipherText = renderCipher({ ...cherylMsg, cipher: 'futhark', key: '' });
  const plain = cherylMsg.text;

  return (
    <div className="cipher-app" style={{ height: 480, padding: 18, gap: 14, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--accent)', textTransform: 'uppercase' }}>RUNE DISSOLVE</div>
      <div className="msg-wrap theirs" style={{ maxWidth: 240 }}>
        <div className="bubble locked theirs" onClick={() => setDecoded(d => !d)} style={{ minHeight: 80 }}>
          <div className="cipher-tag-row">
            <span className="lock-glyph-tiny">⚿</span>
            <span className="cipher-tag">FUTHARK</span>
          </div>
          <div style={{ position: 'relative', minHeight: 40 }}>
            <div className={`bubble-cipher futhark`} style={{
              transition: 'opacity 0.6s, filter 0.6s',
              opacity: decoded ? 0 : 1,
              filter: decoded ? 'blur(8px)' : 'blur(0)',
              position: 'absolute', inset: 0
            }}>{cipherText}</div>
            <div className="bubble-text" style={{
              transition: 'opacity 0.6s 0.15s',
              opacity: decoded ? 1 : 0
            }}>{plain}</div>
          </div>
        </div>
        <div className="msg-time">9:14 PM</div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.06em', textAlign: 'center', width: '100%', marginTop: 6 }}>
        Cross-fade with blur — characters dissolve from rune to plain.
      </div>
    </div>
  );
}

// ── V4: Cipher styling — Morse ───────────────────────────

function VariantMorse() {
  const morse = renderCipher({ text: 'meet at the docks 9pm', cipher: 'morse', key: '' });
  return (
    <div className="cipher-app" style={{ height: 480, padding: 18, gap: 14, display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--accent)', textTransform: 'uppercase' }}>MORSE TYPOGRAPHY</div>
      <div className="msg-wrap theirs" style={{ maxWidth: '100%', alignSelf: 'flex-start' }}>
        <div className="bubble locked theirs">
          <div className="cipher-tag-row">
            <span className="lock-glyph-tiny">⚿</span>
            <span className="cipher-tag">MORSE</span>
          </div>
          <div className="bubble-cipher morse">{morse}</div>
        </div>
        <div className="msg-time">9:14 PM</div>
      </div>
      <div className="msg-wrap mine" style={{ maxWidth: '88%', alignSelf: 'flex-end' }}>
        <div className="bubble locked mine">
          <div className="cipher-tag-row">
            <span className="cipher-tag">MORSE</span>
          </div>
          <div className="bubble-cipher morse">.- -.-. -.- -. --- .-- .-.. . -.. --. . -..</div>
        </div>
        <div className="msg-time">9:16 PM</div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.06em', textAlign: 'center', marginTop: 'auto' }}>
        Wider letter-spacing, mid-tone dots & dashes.
      </div>
    </div>
  );
}

// ── V5: Cipher styling — Futhark ─────────────────────────

function VariantFuthark() {
  return (
    <div className="cipher-app" style={{ height: 480, padding: 18, gap: 14, display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--accent)', textTransform: 'uppercase' }}>ELDER FUTHARK</div>
      <div className="msg-wrap theirs" style={{ maxWidth: '88%', alignSelf: 'flex-start' }}>
        <div className="bubble locked theirs">
          <div className="cipher-tag-row">
            <span className="lock-glyph-tiny">⚿</span>
            <span className="cipher-tag">FUTHARK</span>
          </div>
          <div className="bubble-cipher futhark">ᛗᛖᛖᛏ ᚨᛏ ᛏᚺᛖ ᛞᛟᚲᚲᛊ ᚾᛁᚾᛖ ᛈᛗ</div>
        </div>
        <div className="msg-time">9:14 PM</div>
      </div>
      <div className="msg-wrap mine" style={{ maxWidth: '88%', alignSelf: 'flex-end' }}>
        <div className="bubble locked mine">
          <div className="cipher-tag-row">
            <span className="cipher-tag">FUTHARK</span>
          </div>
          <div className="bubble-cipher futhark">ᚨᚲᚲᚾᛟᚹᛚᛖᛞᚷᛖᛞ</div>
        </div>
        <div className="msg-time">9:16 PM</div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.06em', textAlign: 'center', marginTop: 'auto' }}>
        Larger glyphs with accent glow.
      </div>
    </div>
  );
}

// ── V6: Cipher styling — Polybius grid ───────────────────

function VariantPolybius() {
  return (
    <div className="cipher-app" style={{ height: 480, padding: 18, gap: 14, display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--accent)', textTransform: 'uppercase' }}>POLYBIUS · NUMERIC</div>
      <div className="msg-wrap theirs" style={{ maxWidth: '88%', alignSelf: 'flex-start' }}>
        <div className="bubble locked theirs">
          <div className="cipher-tag-row">
            <span className="lock-glyph-tiny">⚿</span>
            <span className="cipher-tag">POLYBIUS</span>
          </div>
          <div className="bubble-cipher polybius">32 15 15 44   11 44   44 23 15   14 34 13 25 43</div>
        </div>
        <div className="msg-time">9:14 PM</div>
      </div>
      <div className="msg-wrap mine" style={{ maxWidth: '88%', alignSelf: 'flex-end' }}>
        <div className="bubble locked mine">
          <div className="cipher-tag-row">
            <span className="cipher-tag">POLYBIUS</span>
          </div>
          <div className="bubble-cipher polybius">11 13 25 33 34 52 31 15 14 22 15 14</div>
        </div>
        <div className="msg-time">9:16 PM</div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.06em', textAlign: 'center', marginTop: 'auto' }}>
        Coordinate pairs. Tabular numerals.
      </div>
    </div>
  );
}

// ── V7: Cipher wheel concept ─────────────────────────────

function VariantWheel() {
  return (
    <div className="cipher-app" style={{ height: 480, padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--accent)', textTransform: 'uppercase' }}>CIPHER WHEEL · CONCEPT</div>

      <div style={{ position: 'relative', width: 200, height: 200 }}>
        <div style={{
          position: 'absolute', inset: 0,
          border: '1px solid var(--accent-border)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, transparent 30%, var(--accent-faint) 70%, transparent 100%)'
        }}></div>
        <div style={{
          position: 'absolute', inset: 24,
          border: '1px dashed var(--accent-border)',
          borderRadius: '50%'
        }}></div>
        <div style={{
          position: 'absolute', inset: 48,
          border: '1px solid var(--accent)',
          borderRadius: '50%',
          background: 'var(--bg)'
        }}></div>
        {/* Outer ring letters */}
        {Array.from({ length: 26 }).map((_, i) => {
          const angle = (i / 26) * 360;
          const letter = String.fromCharCode(65 + i);
          return (
            <div key={i} style={{
              position: 'absolute',
              left: '50%', top: '50%',
              transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-86px)`,
              fontSize: 9,
              color: 'var(--text-mid)',
              letterSpacing: '0.05em'
            }}>{letter}</div>
          );
        })}
        {/* Inner ring (shifted by 13) */}
        {Array.from({ length: 26 }).map((_, i) => {
          const angle = (i / 26) * 360;
          const letter = String.fromCharCode(65 + ((i + 13) % 26));
          return (
            <div key={i} style={{
              position: 'absolute',
              left: '50%', top: '50%',
              transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-58px)`,
              fontSize: 9,
              color: 'var(--accent)',
              letterSpacing: '0.05em'
            }}>{letter}</div>
          );
        })}
        {/* Center key */}
        <div style={{
          position: 'absolute',
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 16, color: 'var(--accent)',
          letterSpacing: '0.1em',
          textShadow: '0 0 12px var(--accent-glow)'
        }}>13</div>
        {/* Pointer */}
        <div style={{
          position: 'absolute',
          left: '50%', top: 4,
          transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: '8px solid var(--accent)'
        }}></div>
      </div>

      <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.06em', textAlign: 'center', maxWidth: 240, lineHeight: 1.7 }}>
        Inline visualization for Caesar / Vigenère<br />
        in the decode panel.
      </div>
    </div>
  );
}

// ── V8: Bold — full-bleed cipher hero ────────────────────

function VariantHero() {
  return (
    <div className="cipher-app" style={{ height: 480, padding: 0, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(circle at 30% 20%, var(--accent-faint) 0%, transparent 50%),
          repeating-linear-gradient(180deg, transparent 0px, transparent 4px, rgba(0,0,0,0.25) 4px, rgba(0,0,0,0.25) 5px)
        `,
        pointerEvents: 'none'
      }}></div>
      <div style={{ position: 'relative', padding: 24, display: 'flex', flexDirection: 'column', gap: 14, height: '100%', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'var(--accent)', textTransform: 'uppercase' }}>HERO · BOLD</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{
            fontSize: 38,
            color: 'var(--accent)',
            letterSpacing: '0.15em',
            lineHeight: 1.1,
            textShadow: '0 0 24px var(--accent-glow)',
            fontFamily: 'var(--font-rune)'
          }}>ᛗᛖᛖᛏ<br />ᚨᛏ<br />ᚾᛁᚾᛖ</div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.25em' }}>FUTHARK · @CHERYL · 9:14 PM</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn-sm" style={{ fontSize: 10, padding: '10px 16px' }}>UNLOCK</button>
          <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.18em', textAlign: 'center', textTransform: 'uppercase' }}>
            6 sealed messages
          </div>
        </div>
      </div>
    </div>
  );
}

// ── V9: Inbox — minimal vs cipher-styled ─────────────────

function VariantInboxMinimal() {
  return (
    <div className="cipher-app" style={{ height: 480, display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <div style={{ width: 44 }}></div>
        <div className="topbar-center">
          <div className="topbar-title" style={{ letterSpacing: '0.4em' }}>CIPHER</div>
        </div>
        <button className="icon-btn accent">＋</button>
      </div>
      <div className="inbox-list">
        {['cheryl', 'rune', 'mara'].map(name => (
          <div key={name} className="conv-row" style={{ padding: '18px 20px' }}>
            <div className="avatar" style={{ background: strColor(name) }}>{name[0].toUpperCase()}</div>
            <div className="conv-info">
              <div className="conv-name">@{name}</div>
              <div className="conv-preview">— —</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.18em', textAlign: 'center', padding: 12, textTransform: 'uppercase' }}>
        Quietest · No previews
      </div>
    </div>
  );
}

function VariantInboxCipherful() {
  return (
    <div className="cipher-app" style={{ height: 480, display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <div style={{ width: 44 }}></div>
        <div className="topbar-center">
          <div className="topbar-title">CIPHER</div>
          <div className="topbar-sub">3 ACTIVE</div>
        </div>
        <button className="icon-btn accent">＋</button>
      </div>
      <div className="inbox-list">
        <div className="conv-row" style={{ padding: '14px 16px' }}>
          <div className="avatar has-cipher" style={{ background: strColor('cheryl') }}>C</div>
          <div className="conv-info">
            <div className="conv-name">@cheryl <span className="conv-cipher-tag">CAESAR</span></div>
            <div className="conv-preview locked"><span className="lock-mini">⚿</span>Zrrg ng gur hfhny cynpr…</div>
          </div>
          <div className="conv-time">2M</div>
        </div>
        <div className="conv-row" style={{ padding: '14px 16px' }}>
          <div className="avatar has-cipher" style={{ background: strColor('rune') }}>R</div>
          <div className="conv-info">
            <div className="conv-name">@rune <span className="conv-cipher-tag">FUTHARK</span></div>
            <div className="conv-preview">wheel arrived. testing it tonight</div>
          </div>
          <div className="conv-time">1D</div>
        </div>
        <div className="conv-row" style={{ padding: '14px 16px' }}>
          <div className="avatar has-cipher" style={{ background: strColor('mara') }}>M</div>
          <div className="conv-info">
            <div className="conv-name">@mara <span className="conv-cipher-tag">MORSE</span></div>
            <div className="conv-preview locked"><span className="lock-mini">⚿</span>-- --- .-. ... . / .--. .-. .- -.-.</div>
          </div>
          <div className="conv-time">1D</div>
        </div>
      </div>
      <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.18em', textAlign: 'center', padding: 12, textTransform: 'uppercase' }}>
        Loud · Cipher-tagged
      </div>
    </div>
  );
}

// ── V10: Compose bar — collapsed vs expanded ─────────────

function VariantComposeCollapsed() {
  return (
    <div className="cipher-app" style={{ height: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div className="compose-bar">
        <div className="compose-meta">
          <button className="cipher-pill">CAESAR <span className="caret">▾</span></button>
          <input className="key-mini" placeholder="key" defaultValue="13" />
        </div>
        <div className="compose-row">
          <textarea className="compose-input" placeholder="Type a message…" rows="1"></textarea>
          <button className="send-btn">→</button>
        </div>
      </div>
    </div>
  );
}

function VariantComposeAuto() {
  return (
    <div className="cipher-app" style={{ height: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div className="compose-bar">
        <div className="compose-meta">
          <button className="cipher-pill">FUTHARK <span className="caret">▾</span></button>
          <div className="auto-indicator"><span className="dot"></span>AUTO-DECODE ON</div>
        </div>
        <div className="compose-row">
          <textarea className="compose-input" placeholder="Type a message…" rows="1"></textarea>
          <button className="send-btn">→</button>
        </div>
      </div>
    </div>
  );
}

// ── V11: Invite landing — for recipient ──────────────────

function VariantInviteLanding() {
  return (
    <div className="cipher-app" style={{ height: 580, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 28, gap: 26, alignItems: 'center', textAlign: 'center' }}>
      <div className="logo-mark"><span>⌘</span></div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>You've been invited by</div>
        <div style={{ fontSize: 22, color: 'var(--accent)', letterSpacing: '0.08em', marginTop: 8, textShadow: '0 0 16px var(--accent-glow)' }}>@jordan</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-mid)', letterSpacing: '0.05em', lineHeight: 1.8, maxWidth: 260 }}>
        Encrypted messaging. The server never sees your messages — only encrypted blobs.
      </div>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button className="btn">Create Account</button>
        <button className="btn btn-ghost">Sign In</button>
      </div>
      <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
        Invite expires in 7 days
      </div>
    </div>
  );
}

window.CipherVariants = {
  VariantYFlip, VariantXFlip, VariantDissolve,
  VariantMorse, VariantFuthark, VariantPolybius,
  VariantWheel, VariantHero,
  VariantInboxMinimal, VariantInboxCipherful,
  VariantComposeCollapsed, VariantComposeAuto,
  VariantInviteLanding
};
