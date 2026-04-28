/* global React */
// Cipher — bold/experimental message-decode metaphors.
// Each pushes the "encrypted → revealed" interaction in a different physical direction.

const { useState: useStateB, useEffect: useEffectB } = React;

// Shared frame for these mini-screens
function BoldFrame({ children, label, sub }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#070707',
      fontFamily: "'JetBrains Mono', monospace",
      color: '#c4b49a',
      display: 'flex', flexDirection: 'column',
      padding: '20px 18px 16px',
      gap: 12,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'oklch(0.82 0.13 42)', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 8, letterSpacing: '0.18em', color: '#404040', textTransform: 'uppercase' }}>{sub}</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}

// ── 01: Wax seal — break-the-seal interaction ───────────

function VariantWaxSeal() {
  const [broken, setBroken] = useStateB(false);
  return (
    <BoldFrame label="Sealed envelope" sub="Tap the seal to break">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        {/* envelope */}
        <div style={{
          width: 240, height: 150,
          background: 'linear-gradient(180deg, #161412 0%, #0d0c0b 100%)',
          border: '1px solid #2a2520',
          position: 'relative',
          boxShadow: '0 4px 18px rgba(0,0,0,0.5)',
        }}>
          {/* fold lines */}
          <svg width="240" height="150" viewBox="0 0 240 150" style={{ position: 'absolute', inset: 0 }}>
            <line x1="0" y1="0" x2="120" y2="60" stroke="#1f1c19" strokeWidth="1"/>
            <line x1="240" y1="0" x2="120" y2="60" stroke="#1f1c19" strokeWidth="1"/>
            <line x1="0" y1="150" x2="120" y2="60" stroke="#1f1c19" strokeWidth="0.5" opacity="0.5"/>
            <line x1="240" y1="150" x2="120" y2="60" stroke="#1f1c19" strokeWidth="0.5" opacity="0.5"/>
          </svg>
          {/* faint content peeking */}
          {broken && (
            <div style={{
              position: 'absolute', inset: '15px 14px',
              fontSize: 8, letterSpacing: '0.05em', color: '#707070', lineHeight: 1.7,
              animation: 'fadeUpB 0.6s ease-out',
            }}>
              meet at the<br/>usual place.<br/>9pm. bring<br/>the second<br/>envelope.
            </div>
          )}
          {/* seal */}
          <div onClick={() => setBroken(b => !b)} style={{
            position: 'absolute',
            top: 'calc(50% - 22px)', left: 'calc(50% - 22px)',
            width: 44, height: 44,
            cursor: 'pointer',
          }}>
            {broken ? (
              <svg width="44" height="44" viewBox="0 0 44 44">
                {/* cracked halves */}
                <path d="M 22,22 L 4,8 A 20,20 0 0,1 22,2 Z" fill="oklch(0.5 0.13 28)" stroke="oklch(0.65 0.15 30)" strokeWidth="0.5"/>
                <path d="M 22,22 L 22,2 A 20,20 0 0,1 38,12 Z" fill="oklch(0.45 0.13 28)" stroke="oklch(0.65 0.15 30)" strokeWidth="0.5"/>
                <path d="M 22,22 L 38,12 A 20,20 0 0,1 42,32 Z" fill="oklch(0.5 0.13 28)" stroke="oklch(0.65 0.15 30)" strokeWidth="0.5"/>
                <path d="M 22,22 L 42,32 A 20,20 0 0,1 22,42 Z" fill="oklch(0.42 0.13 28)" stroke="oklch(0.65 0.15 30)" strokeWidth="0.5"/>
                <path d="M 22,22 L 22,42 A 20,20 0 0,1 4,8 Z" fill="oklch(0.48 0.13 28)" stroke="oklch(0.65 0.15 30)" strokeWidth="0.5"/>
                <line x1="22" y1="22" x2="4" y2="8"   stroke="#0a0908" strokeWidth="1"/>
                <line x1="22" y1="22" x2="22" y2="2"  stroke="#0a0908" strokeWidth="1"/>
                <line x1="22" y1="22" x2="38" y2="12" stroke="#0a0908" strokeWidth="1"/>
                <line x1="22" y1="22" x2="42" y2="32" stroke="#0a0908" strokeWidth="1"/>
                <line x1="22" y1="22" x2="22" y2="42" stroke="#0a0908" strokeWidth="1"/>
              </svg>
            ) : (
              <svg width="44" height="44" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="20" fill="oklch(0.5 0.13 28)" stroke="oklch(0.7 0.15 30)" strokeWidth="1" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}/>
                <circle cx="22" cy="22" r="16" fill="none" stroke="oklch(0.7 0.15 30 / 0.4)" strokeWidth="0.5" strokeDasharray="2 2"/>
                <text x="22" y="27" textAnchor="middle" fill="oklch(0.85 0.13 30)" fontSize="14" fontFamily="'JetBrains Mono', monospace" fontWeight="600">C</text>
              </svg>
            )}
          </div>
        </div>
        <div style={{ fontSize: 10, color: '#707070', letterSpacing: '0.04em', textAlign: 'center', maxWidth: 240, lineHeight: 1.6 }}>
          {broken
            ? <>Seal broken. Once revealed, message stays open until you reseal.</>
            : <>Tactile decode metaphor — the seal is the lock. Heritage feel for the brand.</>}
        </div>
      </div>
      <style>{`@keyframes fadeUpB { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </BoldFrame>
  );
}

// ── 02: Scrub-decode reel — drag to interpolate ─────────

function VariantScrub() {
  const [t, setT] = useStateB(0);
  const cipher = "ZRRG NG GUR HFHNY CYNPR";
  const plain  = "MEET AT THE USUAL PLACE";
  const txt = cipher.split('').map((c, i) => {
    if (c === ' ') return ' ';
    const cc = c.charCodeAt(0) - 65;
    const pc = plain.charCodeAt(i) - 65;
    if (cc < 0 || pc < 0) return c;
    // interpolate via shifted index
    const steps = 13;
    const cur = (cc + Math.round(t * steps)) % 26;
    return String.fromCharCode(65 + cur);
  }).join('');
  return (
    <BoldFrame label="Scrub decode" sub="Drag to interpolate">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, alignItems: 'center' }}>
        <div style={{
          width: '100%',
          padding: '22px 16px',
          background: '#0d0d0d',
          border: '1px solid oklch(0.72 0.13 42 / 0.2)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 14,
          letterSpacing: '0.18em',
          color: t > 0.95 ? '#c4b49a' : 'oklch(0.72 0.13 42)',
          textAlign: 'center',
          lineHeight: 1.7,
          minHeight: 80,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          textShadow: t < 0.95 ? '0 0 8px oklch(0.72 0.13 42 / 0.3)' : 'none',
          transition: 'color 0.2s',
        }}>
          {txt}
        </div>

        {/* scrubber */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, letterSpacing: '0.22em', color: '#404040' }}>
            <span>CIPHER</span>
            <span style={{ color: 'oklch(0.72 0.13 42)' }}>SHIFT {Math.round(t * 13)}</span>
            <span>PLAIN</span>
          </div>
          <input
            type="range" min="0" max="100" value={t * 100}
            onChange={e => setT(parseFloat(e.target.value) / 100)}
            style={{ width: '100%', accentColor: 'oklch(0.72 0.13 42)' }}
          />
        </div>

        <div style={{ fontSize: 10, color: '#707070', letterSpacing: '0.04em', textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
          Decode is a <em>process</em>, not a switch. Each character animates through the alphabet to its plaintext.
        </div>
      </div>
    </BoldFrame>
  );
}

// ── 03: Redaction — black bars fade away ─────────────────

function VariantRedaction() {
  const [revealed, setRevealed] = useStateB(false);
  const blocks = [
    { w: 60, text: 'MEET' },
    { w: 30, text: 'AT' },
    { w: 38, text: 'THE' },
    { w: 78, text: 'USUAL' },
    { w: 80, text: 'PLACE' },
    { w: 50, text: '9PM' },
    { w: 70, text: 'BRING' },
    { w: 60, text: 'THE' },
    { w: 100, text: 'SECOND' },
    { w: 100, text: 'ENVELOPE' },
  ];
  return (
    <BoldFrame label="Redacted dossier" sub="Tap to declassify">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        {/* document header */}
        <div style={{ alignSelf: 'stretch', borderBottom: '1px solid #2a2520', paddingBottom: 8, display: 'flex', justifyContent: 'space-between', fontSize: 8, letterSpacing: '0.2em', color: '#707070', textTransform: 'uppercase' }}>
          <span>file · 0x4F2A</span>
          <span style={{ color: revealed ? 'oklch(0.72 0.13 42)' : '#cc3322' }}>{revealed ? 'CLEARED' : 'CLASSIFIED'}</span>
        </div>

        <div onClick={() => setRevealed(r => !r)} style={{
          width: '100%',
          padding: 14,
          background: '#0d0c0b',
          border: '1px solid #2a2520',
          cursor: 'pointer',
          minHeight: 180,
          display: 'flex', flexWrap: 'wrap', gap: 6, alignContent: 'flex-start',
        }}>
          {blocks.map((b, i) => (
            <div key={i} style={{
              position: 'relative',
              display: 'inline-block',
              minHeight: 18,
            }}>
              {/* text underneath */}
              <span style={{
                fontSize: 12,
                letterSpacing: '0.06em',
                color: '#c4b49a',
                fontFamily: "'JetBrains Mono', monospace",
                opacity: revealed ? 1 : 0,
                transition: 'opacity 0.4s',
              }}>{b.text}</span>
              {/* black bar over */}
              <span style={{
                position: 'absolute',
                inset: '-2px -3px',
                background: '#000',
                border: '1px solid #1a1a1a',
                opacity: revealed ? 0 : 1,
                transition: `opacity 0.45s ${i * 0.04}s`,
                width: revealed ? '100%' : `${b.w}px`,
              }}/>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 10, color: '#707070', letterSpacing: '0.04em', textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
          Locked = redacted government doc. Decode = bars fade in sequence. Plays into the conspiracy aesthetic.
        </div>
      </div>
    </BoldFrame>
  );
}

// ── 04: Punch tape — physical paper tape ────────────────

function VariantPunchTape() {
  // 8 columns of holes per row, "punched" pattern encodes 5 chars
  // Each row = 1 character; 8 bits with sprocket hole in middle
  const chars = "MEET AT 9";
  const rows = chars.split('').map(c => {
    const code = c.charCodeAt(0);
    return Array.from({ length: 8 }, (_, i) => (code >> (7 - i)) & 1);
  });
  return (
    <BoldFrame label="Punch tape" sub="ASCII paper tape · 1960s">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
        {/* tape */}
        <div style={{
          width: 130,
          background: '#1a1612',
          border: '1px solid #2a2520',
          padding: '12px 0',
          position: 'relative',
          boxShadow: 'inset 0 0 12px rgba(0,0,0,0.5)',
        }}>
          {/* feed-perforation edges */}
          <div style={{ position: 'absolute', top: 4, left: 4, bottom: 4, width: 4, background: 'repeating-linear-gradient(0deg, transparent 0 3px, #0a0908 3px 5px)' }}/>
          <div style={{ position: 'absolute', top: 4, right: 4, bottom: 4, width: 4, background: 'repeating-linear-gradient(0deg, transparent 0 3px, #0a0908 3px 5px)' }}/>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            {rows.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                {row.slice(0, 4).map((bit, i) => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: bit ? '#0a0908' : 'transparent',
                    border: bit ? '1px solid #050403' : '1px solid #2a2520',
                    boxShadow: bit ? 'inset 0 1px 2px rgba(0,0,0,0.8)' : 'none',
                  }}/>
                ))}
                {/* sprocket */}
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#0a0908', border: '1px solid #050403' }}/>
                {row.slice(4).map((bit, i) => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: bit ? '#0a0908' : 'transparent',
                    border: bit ? '1px solid #050403' : '1px solid #2a2520',
                    boxShadow: bit ? 'inset 0 1px 2px rgba(0,0,0,0.8)' : 'none',
                  }}/>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 10, letterSpacing: '0.3em', color: 'oklch(0.72 0.13 42)' }}>
          {chars}
        </div>

        <div style={{ fontSize: 10, color: '#707070', letterSpacing: '0.04em', textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
          Messages as physical artifacts. Each row = 1 char in 8-bit ASCII. Strongest 'spy era' read.
        </div>
      </div>
    </BoldFrame>
  );
}

// ── 05: Constellation — letters as plotted stars ────────

function VariantConstellation() {
  // Stars positioned as letters; lines connect to read "CIPHER"
  // We position 6 letter-points and animate connecting lines on reveal
  const [revealed, setRevealed] = useStateB(false);

  const stars = [
    { x: 36,  y: 90,  letter: 'C' },
    { x: 80,  y: 50,  letter: 'I' },
    { x: 130, y: 110, letter: 'P' },
    { x: 175, y: 60,  letter: 'H' },
    { x: 220, y: 130, letter: 'E' },
    { x: 270, y: 80,  letter: 'R' },
  ];
  // background filler stars
  const filler = Array.from({ length: 36 }, (_, i) => ({
    x: (i * 73 + 23) % 300,
    y: (i * 47 + 11) % 200,
    r: 0.6 + ((i * 13) % 7) / 8,
  }));

  return (
    <BoldFrame label="Constellation" sub="Tap to draw">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
        <svg width="300" height="200" viewBox="0 0 300 200"
          onClick={() => setRevealed(r => !r)}
          style={{ cursor: 'pointer', background: 'radial-gradient(ellipse at center, #0a0a14 0%, #050505 80%)', border: '1px solid #1a1a1a' }}>
          {/* filler stars */}
          {filler.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#404040" opacity="0.5"/>
          ))}
          {/* connecting lines */}
          {revealed && stars.map((s, i) => {
            if (i === 0) return null;
            const prev = stars[i - 1];
            return (
              <line key={i} x1={prev.x} y1={prev.y} x2={s.x} y2={s.y}
                stroke="oklch(0.72 0.13 42)" strokeWidth="1" opacity="0.6"
                strokeDasharray="100" strokeDashoffset="100"
                style={{ animation: `cstrokeB 0.6s ease-out ${i * 0.15}s forwards` }}/>
            );
          })}
          {/* letter stars */}
          {stars.map((s, i) => (
            <g key={i}>
              <circle cx={s.x} cy={s.y} r="3.5" fill="oklch(0.85 0.13 42)"
                style={{ filter: 'drop-shadow(0 0 5px oklch(0.72 0.13 42 / 0.8))' }}/>
              <circle cx={s.x} cy={s.y} r="1.5" fill="#fff"/>
              {revealed && (
                <text x={s.x} y={s.y - 9} textAnchor="middle" fill="oklch(0.85 0.13 42)" fontSize="9" fontFamily="'JetBrains Mono', monospace" letterSpacing="1"
                  style={{ animation: `fadeStarB 0.4s ease-out ${i * 0.15 + 0.2}s both` }}>
                  {s.letter}
                </text>
              )}
            </g>
          ))}
        </svg>
        <style>{`
          @keyframes cstrokeB { to { stroke-dashoffset: 0; } }
          @keyframes fadeStarB { from { opacity: 0; } to { opacity: 1; } }
        `}</style>

        <div style={{ fontSize: 10, color: '#707070', letterSpacing: '0.04em', textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
          Message as a star map. Decode = constellations connecting. Best for splash, onboarding, brand moments.
        </div>
      </div>
    </BoldFrame>
  );
}

window.CipherBold = {
  VariantWaxSeal, VariantScrub, VariantRedaction, VariantPunchTape, VariantConstellation
};
