/* global React */
// Cipher — logo explorations.
// Each logo is presented on a dark card with the mark, wordmark, and a tiny caption.
// Marks should read at small sizes (favicon/app-icon scale) and feel encrypted/mechanical.

const { useState: useStateL } = React;

// ── Shared logo card chrome ────────────────────────────

function LogoCard({ children, name, caption, footer }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#0a0908',
      display: 'flex', flexDirection: 'column',
      padding: '24px 20px 18px',
      gap: 16,
      fontFamily: "'JetBrains Mono', monospace",
      color: '#c4b49a',
      position: 'relative',
    }}>
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 50%, rgba(212,168,67,0.06) 0%, transparent 70%)',
        border: '1px solid #1a1a1a',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {children}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 9, letterSpacing: '0.3em', color: '#d4a843', textTransform: 'uppercase' }}>
          {name}
        </div>
        <div style={{ fontSize: 10, color: '#707070', letterSpacing: '0.04em', lineHeight: 1.5 }}>
          {caption}
        </div>
        {footer && (
          <div style={{ fontSize: 8, letterSpacing: '0.25em', color: '#404040', textTransform: 'uppercase', marginTop: 4 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Wordmark used across most logos — proper Cipher wordmark
function Wordmark({ size = 14, dim = false, spaced = true }) {
  return (
    <div style={{
      fontSize: size,
      letterSpacing: spaced ? '0.5em' : '0.18em',
      color: dim ? '#707070' : '#c4b49a',
      paddingLeft: spaced ? '0.5em' : 0,
      fontWeight: 400,
    }}>
      CIPHER
    </div>
  );
}

// ── 01: Rotor — concentric dashed ring, mechanical wheel reference ──

function LogoRotor() {
  return (
    <LogoCard
      name="01 · Rotor"
      caption="Concentric rings reference a cipher wheel / Enigma rotor. The break in the inner ring hints at a 'key position'."
      footer="Animated · 22s rotation">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <svg width="84" height="84" viewBox="0 0 84 84">
          <circle cx="42" cy="42" r="40" fill="none" stroke="oklch(0.72 0.13 42)" strokeWidth="1"/>
          <circle cx="42" cy="42" r="32" fill="none" stroke="oklch(0.72 0.13 42)" strokeWidth="1" strokeDasharray="3 3" opacity="0.55">
            <animateTransform attributeName="transform" type="rotate" from="0 42 42" to="360 42 42" dur="22s" repeatCount="indefinite"/>
          </circle>
          <circle cx="42" cy="42" r="22" fill="none" stroke="oklch(0.72 0.13 42)" strokeWidth="1" strokeDasharray="32 8" opacity="0.4" transform="rotate(-30 42 42)"/>
          {/* tick marks */}
          {[0,30,60,90,120,150,180,210,240,270,300,330].map(a => (
            <line key={a} x1="42" y1="2" x2="42" y2="6" stroke="oklch(0.72 0.13 42)" strokeWidth="1" transform={`rotate(${a} 42 42)`} opacity="0.7"/>
          ))}
          <text x="42" y="48" textAnchor="middle" fill="oklch(0.82 0.13 42)" fontFamily="'JetBrains Mono', monospace" fontSize="20" letterSpacing="0.05em" style={{ filter: 'drop-shadow(0 0 8px oklch(0.72 0.13 42 / 0.5))' }}>C</text>
        </svg>
        <Wordmark />
      </div>
    </LogoCard>
  );
}

// ── 02: Glyph swap — C transmuting to ⌘ ──

function LogoGlyphSwap() {
  const [phase, setPhase] = useStateL(0);
  React.useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 1) % 4), 1300);
    return () => clearInterval(id);
  }, []);
  const glyphs = ['C', '⌖', '◈', '⌘'];
  return (
    <LogoCard
      name="02 · Glyph swap"
      caption="The 'C' encrypts itself in real-time, cycling through cipher glyphs. Embodies the product."
      footer="Animated · 4-step cycle">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 76, height: 76,
          border: '1px solid oklch(0.72 0.13 42 / 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'oklch(0.72 0.13 42 / 0.05)',
          position: 'relative',
        }}>
          <span style={{
            fontSize: 38,
            color: 'oklch(0.82 0.13 42)',
            fontFamily: "'JetBrains Mono', monospace",
            textShadow: '0 0 14px oklch(0.72 0.13 42 / 0.6)',
            transition: 'opacity 0.25s',
          }}>{glyphs[phase]}</span>
          <span style={{ position: 'absolute', top: 4, left: 6, fontSize: 7, color: '#707070', letterSpacing: '0.2em' }}>0x{phase.toString(16).toUpperCase()}1</span>
        </div>
        <Wordmark />
      </div>
    </LogoCard>
  );
}

// ── 03: Key-bracket — typographic [C] mark ──

function LogoBracket() {
  return (
    <LogoCard
      name="03 · Bracket"
      caption="Brackets read as a 'sealed container' or code block. Pure type, scales perfectly to favicon."
      footer="Wordmark only · no animation">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', fontFamily: "'JetBrains Mono', monospace" }}>
          <span style={{ fontSize: 56, color: '#404040', fontWeight: 300, lineHeight: 1 }}>[</span>
          <span style={{
            fontSize: 38,
            color: 'oklch(0.82 0.13 42)',
            letterSpacing: '0.05em',
            margin: '0 6px',
            textShadow: '0 0 12px oklch(0.72 0.13 42 / 0.5)',
            lineHeight: 1,
          }}>C</span>
          <span style={{ fontSize: 56, color: '#404040', fontWeight: 300, lineHeight: 1 }}>]</span>
        </div>
        <Wordmark />
      </div>
    </LogoCard>
  );
}

// ── 04: Caesar shift — ABC → DEF visual ──

function LogoCaesar() {
  return (
    <LogoCard
      name="04 · Caesar shift"
      caption="The mark IS the cipher. A→D shift visualized — the literal mechanic, instantly legible to insiders."
      footer="Conceptual · for splash/about">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ position: 'relative', fontFamily: "'JetBrains Mono', monospace" }}>
          <div style={{ fontSize: 20, color: '#404040', letterSpacing: '0.4em', lineHeight: 1.2 }}>ABC</div>
          <div style={{
            fontSize: 20,
            color: 'oklch(0.82 0.13 42)',
            letterSpacing: '0.4em',
            lineHeight: 1.2,
            marginTop: 4,
            textShadow: '0 0 10px oklch(0.72 0.13 42 / 0.5)',
          }}>DEF</div>
          {/* arrow */}
          <svg width="14" height="50" style={{ position: 'absolute', right: -22, top: 4 }} viewBox="0 0 14 50">
            <line x1="7" y1="2" x2="7" y2="44" stroke="oklch(0.72 0.13 42)" strokeWidth="1" opacity="0.6"/>
            <polyline points="3,40 7,46 11,40" fill="none" stroke="oklch(0.72 0.13 42)" strokeWidth="1" opacity="0.8"/>
          </svg>
        </div>
        <Wordmark />
      </div>
    </LogoCard>
  );
}

// ── 05: Lock-cell — 5×5 grid forming a C, references Polybius ──

function LogoPolybius() {
  // 5x5 grid; lit cells form a chunky C
  const lit = new Set([
    '0,1','0,2','0,3',
    '1,0','2,0','3,0',
    '4,1','4,2','4,3',
  ]);
  return (
    <LogoCard
      name="05 · Polybius"
      caption="A 5×5 grid (Polybius square) with lit cells forming a C. Honors the cipher metaphor in pure geometry."
      footer="No type required · works as standalone mark">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 12px)',
          gridTemplateRows: 'repeat(5, 12px)',
          gap: 2,
        }}>
          {Array.from({ length: 25 }).map((_, i) => {
            const r = Math.floor(i / 5);
            const c = i % 5;
            const on = lit.has(`${r},${c}`);
            return (
              <div key={i} style={{
                width: 12, height: 12,
                background: on ? 'oklch(0.72 0.13 42)' : '#161616',
                boxShadow: on ? '0 0 8px oklch(0.72 0.13 42 / 0.6)' : 'none',
                border: on ? 'none' : '1px solid #1f1f1f',
              }}/>
            );
          })}
        </div>
        <Wordmark />
      </div>
    </LogoCard>
  );
}

// ── 06: Aperture / iris — concentric blades ──

function LogoAperture() {
  return (
    <LogoCard
      name="06 · Aperture"
      caption="Iris blades form a sealed chamber — opens to reveal. Conveys privacy + mechanical precision."
      footer="Static · could animate on auth">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <svg width="84" height="84" viewBox="0 0 84 84">
          <circle cx="42" cy="42" r="38" fill="none" stroke="oklch(0.72 0.13 42 / 0.3)" strokeWidth="1"/>
          {/* 6 iris blades */}
          {[0,60,120,180,240,300].map((a, i) => (
            <polygon key={i}
              points="42,42 42,8 26,30"
              fill="oklch(0.72 0.13 42 / 0.18)"
              stroke="oklch(0.72 0.13 42)"
              strokeWidth="1"
              transform={`rotate(${a} 42 42)`}
            />
          ))}
          <circle cx="42" cy="42" r="6" fill="#0a0908" stroke="oklch(0.82 0.13 42)" strokeWidth="1"/>
          <circle cx="42" cy="42" r="2" fill="oklch(0.82 0.13 42)" style={{ filter: 'drop-shadow(0 0 4px oklch(0.72 0.13 42 / 0.8))' }}/>
        </svg>
        <Wordmark />
      </div>
    </LogoCard>
  );
}

// ── 07: ASCII / terminal — pure type with cursor ──

function LogoTerminal() {
  return (
    <LogoCard
      name="07 · Terminal"
      caption="Reads as a CLI prompt. Strongest 'developer trust' signal — encrypted by default, no marketing fluff."
      footer="Animated cursor · pairs with monospace UI">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 18 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, letterSpacing: '0.05em', display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ color: 'oklch(0.72 0.13 42)' }}>$</span>
          <span style={{ color: '#c4b49a' }}>cipher</span>
          <span style={{
            display: 'inline-block',
            width: 10, height: 22,
            background: 'oklch(0.72 0.13 42)',
            marginLeft: 2,
            animation: 'logoBlink 1.1s steps(2) infinite',
            boxShadow: '0 0 8px oklch(0.72 0.13 42 / 0.5)',
          }}/>
        </div>
        <div style={{ fontSize: 8, letterSpacing: '0.3em', color: '#404040', textTransform: 'uppercase' }}>
          ENCRYPTED · OPEN SOURCE
        </div>
        <style>{`@keyframes logoBlink { 50% { opacity: 0; } }`}</style>
      </div>
    </LogoCard>
  );
}

// ── 08: Monogram seal — embossed circular badge ──

function LogoSeal() {
  return (
    <LogoCard
      name="08 · Seal"
      caption="Wax-seal vibe — communiqués, sealed letters. Heritage feel; works as merch / sticker / about-page."
      footer="Premium · feels like an institution">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <svg width="88" height="88" viewBox="0 0 88 88">
          <defs>
            <path id="sealCurve" d="M 44,44 m -34,0 a 34,34 0 1,1 68,0 a 34,34 0 1,1 -68,0"/>
          </defs>
          {/* outer */}
          <circle cx="44" cy="44" r="40" fill="oklch(0.72 0.13 42 / 0.04)" stroke="oklch(0.72 0.13 42)" strokeWidth="1.5"/>
          <circle cx="44" cy="44" r="34" fill="none" stroke="oklch(0.72 0.13 42 / 0.4)" strokeWidth="0.5"/>
          {/* curved label */}
          <text fill="oklch(0.72 0.13 42)" fontFamily="'JetBrains Mono', monospace" fontSize="6.5" letterSpacing="3">
            <textPath href="#sealCurve" startOffset="2%">CIPHER · ENCRYPTED · CIPHER · ENCRYPTED · </textPath>
          </text>
          {/* inner monogram */}
          <text x="44" y="52" textAnchor="middle" fill="oklch(0.82 0.13 42)" fontFamily="'JetBrains Mono', monospace" fontSize="26" fontWeight="500" letterSpacing="0.05em" style={{ filter: 'drop-shadow(0 0 6px oklch(0.72 0.13 42 / 0.6))' }}>C</text>
          {/* tiny stars */}
          {[0,90,180,270].map(a => (
            <text key={a} fill="oklch(0.72 0.13 42)" fontSize="6" fontFamily="'JetBrains Mono', monospace"
              x="44" y="14" textAnchor="middle" transform={`rotate(${a} 44 44)`}>✦</text>
          ))}
        </svg>
        <Wordmark />
      </div>
    </LogoCard>
  );
}

// ── 09: At-handle — @cipher reference ──

function LogoAtHandle() {
  return (
    <LogoCard
      name="09 · @handle"
      caption="Embraces the @handle system. Recognizable in chat lists & invite links — the mark IS the address."
      footer="Pairs with @-based identity">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', fontFamily: "'JetBrains Mono', monospace" }}>
          <span style={{
            fontSize: 44,
            color: 'oklch(0.82 0.13 42)',
            textShadow: '0 0 14px oklch(0.72 0.13 42 / 0.6)',
            lineHeight: 1,
          }}>@</span>
          <span style={{
            fontSize: 22,
            color: '#c4b49a',
            letterSpacing: '0.18em',
            marginLeft: 4,
            paddingLeft: '0.18em',
            lineHeight: 1.2,
          }}>cipher</span>
        </div>
        <div style={{ fontSize: 8, letterSpacing: '0.25em', color: '#404040', textTransform: 'uppercase' }}>
          encrypted · by handle
        </div>
      </div>
    </LogoCard>
  );
}

window.CipherLogos = {
  LogoRotor, LogoGlyphSwap, LogoBracket, LogoCaesar, LogoPolybius,
  LogoAperture, LogoTerminal, LogoSeal, LogoAtHandle
};
