/* global React */
// Cipher — deep dives on Rotor (01) and Aperture (06).
// Multiple weights, scales, color variations, and motion behaviors.

const { useState: useStateD, useEffect: useEffectD, useRef: useRefD } = React;

// Re-usable card chrome for these explorations
function DeepCard({ children, label, sub, footer, bg = '#0a0908' }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: bg,
      display: 'flex', flexDirection: 'column',
      padding: '20px 18px 14px',
      gap: 12,
      fontFamily: "'JetBrains Mono', monospace",
      color: '#c4b49a',
      position: 'relative',
    }}>
      <div style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 50%, rgba(212,168,67,0.05) 0%, transparent 70%)',
        border: '1px solid #1a1a1a',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {children}
      </div>
      <div>
        <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'oklch(0.82 0.13 42)', textTransform: 'uppercase' }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: '#707070', letterSpacing: '0.04em', marginTop: 4, lineHeight: 1.5 }}>{sub}</div>}
        {footer && <div style={{ fontSize: 8, letterSpacing: '0.25em', color: '#404040', textTransform: 'uppercase', marginTop: 4 }}>{footer}</div>}
      </div>
    </div>
  );
}

const ACCENT     = 'oklch(0.72 0.13 42)';
const ACCENT_HI  = 'oklch(0.82 0.13 42)';
const ACCENT_LO  = 'oklch(0.72 0.13 42 / 0.4)';
const ACCENT_GLO = 'oklch(0.72 0.13 42 / 0.6)';

// ─────────────────────────────────────────────────────────
// ROTOR DEEP DIVE
// ─────────────────────────────────────────────────────────

// Reusable Rotor SVG — knob = which "look", size = px
function RotorMark({ size = 96, weight = 'regular', glyph = 'C', spin = true, ticked = true }) {
  const sw = weight === 'bold' ? 2 : weight === 'thin' ? 0.5 : 1;
  const center = size / 2;
  const outerR = center - 2;
  const midR   = outerR - 8;
  const innerR = midR - 10;
  const tickPositions = ticked ? [0,30,60,90,120,150,180,210,240,270,300,330] : [];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={center} cy={center} r={outerR} fill="none" stroke={ACCENT} strokeWidth={sw}/>
      <g style={spin ? { transformOrigin: `${center}px ${center}px`, animation: 'rotorSpinD 22s linear infinite' } : {}}>
        <circle cx={center} cy={center} r={midR} fill="none" stroke={ACCENT} strokeWidth={sw} strokeDasharray="3 3" opacity="0.55"/>
      </g>
      <circle cx={center} cy={center} r={innerR} fill="none" stroke={ACCENT} strokeWidth={sw} strokeDasharray="32 8" opacity="0.4" transform={`rotate(-30 ${center} ${center})`}/>
      {tickPositions.map(a => (
        <line key={a} x1={center} y1={2} x2={center} y2={6} stroke={ACCENT} strokeWidth={sw} transform={`rotate(${a} ${center} ${center})`} opacity="0.7"/>
      ))}
      <text x={center} y={center + size * 0.07} textAnchor="middle" fill={ACCENT_HI}
        fontFamily="'JetBrains Mono', monospace"
        fontSize={size * 0.24}
        letterSpacing="0.05em"
        style={{ filter: `drop-shadow(0 0 ${size * 0.08}px ${ACCENT_GLO})` }}>
        {glyph}
      </text>
    </svg>
  );
}

// 01 — Hero scale, refined
function RotorHero() {
  return (
    <DeepCard label="01 · Rotor / Hero" sub="The current direction at full splash size. Glow, idle drift, primary palette." footer="Splash · auth · loading">
      <RotorMark size={140} />
    </DeepCard>
  );
}

// 02 — Horizontal lockup (mark + wordmark)
function RotorLockup() {
  return (
    <DeepCard label="02 · Rotor / Lockup" sub="Mark + wordmark for nav, header, OG-image. Sized so the cap-height aligns with mid-ring." footer="Header · OG · email signature">
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <RotorMark size={56}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 22, letterSpacing: '0.42em', color: '#c4b49a', paddingLeft: '0.42em' }}>CIPHER</div>
          <div style={{ fontSize: 8, letterSpacing: '0.28em', color: '#707070', textTransform: 'uppercase' }}>Encrypted Messaging</div>
        </div>
      </div>
    </DeepCard>
  );
}

// 03 — App icon (iOS/Android rounded square)
function RotorAppIcon() {
  const Tile = ({ size, rounded, dark }) => (
    <div style={{
      width: size, height: size,
      background: dark
        ? 'radial-gradient(circle at 30% 25%, #1a1714 0%, #050505 100%)'
        : 'radial-gradient(circle at 30% 25%, oklch(0.72 0.13 42) 0%, oklch(0.4 0.13 42) 100%)',
      borderRadius: rounded,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 6px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
      border: dark ? '1px solid #2a2520' : 'none',
    }}>
      {dark ? <RotorMark size={size * 0.7} spin={false}/> : (
        <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.95"/>
          <circle cx="50" cy="50" r="36" fill="none" stroke="#fff" strokeWidth="1.6" strokeDasharray="3 3" opacity="0.7"/>
          <circle cx="50" cy="50" r="24" fill="none" stroke="#fff" strokeWidth="1.6" strokeDasharray="32 8" opacity="0.5" transform="rotate(-30 50 50)"/>
          <text x="50" y="58" textAnchor="middle" fill="#fff" fontFamily="'JetBrains Mono', monospace" fontSize="26" letterSpacing="0.05em">C</text>
        </svg>
      )}
    </div>
  );
  return (
    <DeepCard label="03 · Rotor / App icon" sub="iOS/Android tile. Dark for system dark mode, amber-fill for dock prominence." footer="Home screen · launcher">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <Tile size={88} rounded={20} dark={true}/>
          <Tile size={88} rounded={20} dark={false}/>
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Tile size={56} rounded={12} dark={true}/>
          <Tile size={56} rounded={12} dark={false}/>
          <Tile size={36} rounded={8} dark={true}/>
          <Tile size={36} rounded={8} dark={false}/>
        </div>
      </div>
    </DeepCard>
  );
}

// 04 — Favicon-scale stack with pixel-grid showing
function RotorFavicon() {
  return (
    <DeepCard label="04 · Rotor / Favicon scale" sub="Tested at 64 / 32 / 16px. At 16, simplifies to a glyph + outline ring." footer="Browser tab · system tray">
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <RotorMark size={64} spin={false}/>
          <div style={{ fontSize: 8, color: '#707070', letterSpacing: '0.2em' }}>64</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <RotorMark size={32} spin={false} ticked={false}/>
          <div style={{ fontSize: 8, color: '#707070', letterSpacing: '0.2em' }}>32</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          {/* Simplified 16px: ring + dot only */}
          <svg width="32" height="32" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
            <circle cx="8" cy="8" r="7" fill="none" stroke={ACCENT} strokeWidth="1"/>
            <circle cx="8" cy="8" r="2" fill={ACCENT_HI}/>
          </svg>
          <div style={{ fontSize: 8, color: '#707070', letterSpacing: '0.2em' }}>16</div>
        </div>
      </div>
    </DeepCard>
  );
}

// 05 — Decode motion: rotor "clicks" through positions in steps
function RotorDecodeMotion() {
  const [pos, setPos] = useStateD(0);
  useEffectD(() => {
    const id = setInterval(() => setPos(p => (p + 1) % 26), 700);
    return () => clearInterval(id);
  }, []);
  const angle = (pos / 26) * 360;
  const letter = String.fromCharCode(65 + pos);
  return (
    <DeepCard label="05 · Rotor / Decode motion" sub="When a message is decoding, the rotor 'clicks' through positions one letter at a time. Mechanical, not smooth." footer="Active · loading state">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="56" fill="none" stroke={ACCENT} strokeWidth="1"/>
          {/* stepped rotation on inner ring */}
          <g style={{ transformOrigin: '60px 60px', transform: `rotate(${angle}deg)`, transition: 'transform 0.18s cubic-bezier(0.5, 1.6, 0.4, 1)' }}>
            <circle cx="60" cy="60" r="46" fill="none" stroke={ACCENT} strokeWidth="1" strokeDasharray="3 3" opacity="0.55"/>
            {/* indicator notch */}
            <line x1="60" y1="14" x2="60" y2="6" stroke={ACCENT_HI} strokeWidth="2" style={{ filter: `drop-shadow(0 0 4px ${ACCENT_GLO})` }}/>
          </g>
          <circle cx="60" cy="60" r="32" fill="none" stroke={ACCENT} strokeWidth="1" strokeDasharray="32 8" opacity="0.4" transform="rotate(-30 60 60)"/>
          {Array.from({ length: 26 }).map((_, i) => (
            <line key={i} x1="60" y1="6" x2="60" y2="10" stroke={ACCENT} strokeWidth="0.6" transform={`rotate(${(i / 26) * 360} 60 60)`} opacity="0.55"/>
          ))}
          <text x="60" y="68" textAnchor="middle" fill={ACCENT_HI}
            fontFamily="'JetBrains Mono', monospace" fontSize="28" letterSpacing="0.05em"
            style={{ filter: `drop-shadow(0 0 8px ${ACCENT_GLO})` }}>{letter}</text>
        </svg>
        <div style={{ fontSize: 9, letterSpacing: '0.3em', color: ACCENT, textTransform: 'uppercase' }}>
          DECODING · POS {pos.toString().padStart(2, '0')}
        </div>
      </div>
    </DeepCard>
  );
}

// 06 — Color variations
function RotorColorways() {
  return (
    <DeepCard label="06 · Rotor / Colorways" sub="Amber primary, violet for v2/mesh-network, mono-white for partner co-branding, inverse for light surfaces." footer="Brand system">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ '--ovr': 'oklch(0.72 0.13 42)' }}><RotorMark size={64} spin={false}/></div>
            <div style={{ fontSize: 7, color: '#707070', letterSpacing: '0.18em' }}>AMBER</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <ColoredRotor size={64} hue={280} cap="VIOLET"/>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <ColoredRotor size={64} hue={null} mono={true} cap="MONO"/>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <ColoredRotor size={56} hue={42} bg="#c4b49a" inverted={true} cap="ON LIGHT"/>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <ColoredRotor size={56} hue={140} cap="GREEN"/>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <ColoredRotor size={56} hue={20} cap="RED · ALERT"/>
          </div>
        </div>
      </div>
    </DeepCard>
  );
}

// Helper for colored rotors with overrides
function ColoredRotor({ size = 64, hue = 42, mono = false, inverted = false, bg, cap }) {
  const color = mono ? '#e8e8e8' : `oklch(0.72 0.13 ${hue})`;
  const colorHi = mono ? '#fff' : `oklch(0.85 0.13 ${hue})`;
  const glow = mono ? 'rgba(255,255,255,0.4)' : `oklch(0.72 0.13 ${hue} / 0.6)`;
  const center = size / 2;
  return (
    <>
      <div style={{
        width: size + 16, height: size + 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: bg || 'transparent',
        borderRadius: bg ? 8 : 0,
        padding: bg ? 8 : 0,
      }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={center} cy={center} r={center - 2} fill="none" stroke={color} strokeWidth="1"/>
          <circle cx={center} cy={center} r={center - 10} fill="none" stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.55"/>
          <circle cx={center} cy={center} r={center - 20} fill="none" stroke={color} strokeWidth="1" strokeDasharray="22 6" opacity="0.4" transform={`rotate(-30 ${center} ${center})`}/>
          <text x={center} y={center + size * 0.07} textAnchor="middle" fill={colorHi}
            fontFamily="'JetBrains Mono', monospace" fontSize={size * 0.24}
            style={{ filter: `drop-shadow(0 0 ${size * 0.08}px ${glow})` }}>C</text>
        </svg>
      </div>
      {cap && <div style={{ fontSize: 7, color: '#707070', letterSpacing: '0.18em' }}>{cap}</div>}
    </>
  );
}

// ─────────────────────────────────────────────────────────
// APERTURE DEEP DIVE
// ─────────────────────────────────────────────────────────

// Reusable Aperture mark with animation modes
// mode: 'static' | 'breathe' | 'open' | 'reveal'
function ApertureMark({ size = 96, mode = 'static', glyph = null, openAmount = 0 }) {
  const center = size / 2;
  const outer = center - 2;
  const blades = [0, 60, 120, 180, 240, 300];

  // openAmount: 0 closed, 1 fully open
  // Each blade rotates outward and translates slightly
  const bladeRotation = openAmount * 38;        // 0..38 deg outward
  const bladeScale    = 1 - openAmount * 0.55;  // 1..0.45 shrink
  const innerEyeR     = 6 + openAmount * 22;    // 6..28
  const innerEyeOpacity = 1 - openAmount * 0.4;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={center} cy={center} r={outer} fill="none" stroke="oklch(0.72 0.13 42 / 0.3)" strokeWidth="1"/>
      {blades.map((a, i) => {
        // blade is a triangle from center upward
        const points = `${center},${center} ${center},${center - outer + 2} ${center - outer * 0.4},${center - outer * 0.55}`;
        const transform = `rotate(${a + bladeRotation} ${center} ${center}) scale(${bladeScale}) translate(${(1 - bladeScale) * center * (1/bladeScale - 1) * 0}, 0)`;
        return (
          <polygon key={i}
            points={points}
            fill="oklch(0.72 0.13 42 / 0.18)"
            stroke="oklch(0.72 0.13 42)"
            strokeWidth="1"
            transform={`rotate(${a + bladeRotation} ${center} ${center})`}
            style={{
              transformOrigin: `${center}px ${center}px`,
              transform: `rotate(${a + bladeRotation}deg) scale(${bladeScale})`,
              transition: 'transform 0.5s cubic-bezier(0.65, 0, 0.35, 1)',
            }}
          />
        );
      })}
      {/* center eye */}
      <circle cx={center} cy={center} r={innerEyeR} fill="#0a0908" stroke="oklch(0.82 0.13 42)" strokeWidth="1" opacity={innerEyeOpacity}/>
      {glyph && openAmount > 0.5 ? (
        <text x={center} y={center + 5} textAnchor="middle" fill="oklch(0.85 0.13 42)"
          fontFamily="'JetBrains Mono', monospace" fontSize={innerEyeR * 1.1}
          opacity={(openAmount - 0.5) * 2}
          style={{ filter: `drop-shadow(0 0 6px ${ACCENT_GLO})` }}>
          {glyph}
        </text>
      ) : (
        <circle cx={center} cy={center} r={2} fill="oklch(0.85 0.13 42)"
          style={{ filter: `drop-shadow(0 0 4px ${ACCENT_GLO})` }} opacity={1 - openAmount}/>
      )}
    </svg>
  );
}

// 07 — Hero
function ApertureHero() {
  return (
    <DeepCard label="07 · Aperture / Hero" sub="Refined static. Iris fully closed — sealed chamber. Pinhole of light dead center." footer="Splash · auth">
      <ApertureMark size={140} mode="static" openAmount={0}/>
    </DeepCard>
  );
}

// 08 — Lockup
function ApertureLockup() {
  return (
    <DeepCard label="08 · Aperture / Lockup" sub="Horizontal lockup. Aperture's circular form anchors against the geometric wordmark." footer="Header · OG">
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <ApertureMark size={56} openAmount={0}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 22, letterSpacing: '0.42em', color: '#c4b49a', paddingLeft: '0.42em' }}>CIPHER</div>
          <div style={{ fontSize: 8, letterSpacing: '0.28em', color: '#707070', textTransform: 'uppercase' }}>Encrypted Messaging</div>
        </div>
      </div>
    </DeepCard>
  );
}

// 09 — Open/close on tap
function ApertureOpenClose() {
  const [open, setOpen] = useStateD(false);
  return (
    <DeepCard label="09 · Aperture / Tap to open" sub="Tap = open the iris. The 'gesture' for revealing a message — physical, satisfying. Could replace card-flip entirely." footer="Hero decode interaction">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }} onClick={() => setOpen(o => !o)}>
        <div style={{ cursor: 'pointer', padding: 10 }}>
          <ApertureMark size={132} openAmount={open ? 1 : 0}/>
        </div>
        <div style={{ fontSize: 9, letterSpacing: '0.3em', color: ACCENT, textTransform: 'uppercase' }}>
          {open ? 'OPEN · 0.5s ease' : 'TAP TO OPEN'}
        </div>
      </div>
    </DeepCard>
  );
}

// 10 — Breathe (idle pulse)
function ApertureBreathe() {
  const [t, setT] = useStateD(0);
  useEffectD(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const elapsed = (now - start) / 1000;
      // Sine breathing: 0 → 0.18 → 0 over 4s
      const v = (Math.sin(elapsed * (Math.PI * 2) / 4) * 0.5 + 0.5) * 0.22;
      setT(v);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <DeepCard label="10 · Aperture / Breathe" sub="Idle state — iris breathes ~4s cycle. Subtle but alive. Suggests app is listening." footer="Idle · waiting">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <ApertureMark size={132} openAmount={t}/>
        <div style={{ fontSize: 9, letterSpacing: '0.3em', color: '#707070', textTransform: 'uppercase' }}>
          IDLE · 4S BREATH CYCLE
        </div>
      </div>
    </DeepCard>
  );
}

// 11 — Decode reveal: opens to show the contact's initial
function ApertureReveal() {
  const [phase, setPhase] = useStateD(0); // 0: closed, 1: opening, 2: open w/ glyph
  useEffectD(() => {
    const id = setInterval(() => {
      setPhase(p => (p + 1) % 3);
    }, 1500);
    return () => clearInterval(id);
  }, []);
  const open = phase === 0 ? 0 : 1;
  const showGlyph = phase === 2;
  return (
    <DeepCard label="11 · Aperture / Reveal sequence" sub="Closed → opens → shows contact's initial inside the eye. Loops through the cycle." footer="Avatar / unread state">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <ApertureMark size={132} openAmount={open} glyph={showGlyph ? 'C' : null}/>
        <div style={{ fontSize: 9, letterSpacing: '0.3em', color: ACCENT, textTransform: 'uppercase' }}>
          {phase === 0 ? 'SEALED' : phase === 1 ? 'OPENING' : 'CHERYL'}
        </div>
      </div>
    </DeepCard>
  );
}

// 12 — Aperture app icon + favicon stack
function ApertureScale() {
  const Tile = ({ size, rounded, dark }) => (
    <div style={{
      width: size, height: size,
      background: dark
        ? 'radial-gradient(circle at 30% 25%, #1a1714 0%, #050505 100%)'
        : 'radial-gradient(circle at 30% 25%, oklch(0.72 0.13 42) 0%, oklch(0.4 0.13 42) 100%)',
      borderRadius: rounded,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 6px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
      border: dark ? '1px solid #2a2520' : 'none',
    }}>
      {dark ? <ApertureMark size={size * 0.7} openAmount={0}/> : (
        <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.4"/>
          {[0,60,120,180,240,300].map(a => (
            <polygon key={a} points="50,50 50,10 32,30" fill="rgba(255,255,255,0.2)" stroke="#fff" strokeWidth="1.5" transform={`rotate(${a} 50 50)`}/>
          ))}
          <circle cx="50" cy="50" r="7" fill="oklch(0.4 0.13 42)" stroke="#fff" strokeWidth="1.5"/>
          <circle cx="50" cy="50" r="2.5" fill="#fff"/>
        </svg>
      )}
    </div>
  );
  return (
    <DeepCard label="12 · Aperture / Scale tests" sub="App icons (88, 56, 36) plus 16/32/64 favicon. At 16px, the blades collapse to a hexagonal silhouette." footer="Home screen · favicon">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <Tile size={72} rounded={16} dark={true}/>
          <Tile size={72} rounded={16} dark={false}/>
          <Tile size={48} rounded={10} dark={true}/>
          <Tile size={32} rounded={7} dark={false}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <ApertureMark size={48} openAmount={0}/>
            <div style={{ fontSize: 7, color: '#707070', letterSpacing: '0.2em' }}>32</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {/* simplified 16: hexagon + center dot */}
            <svg width="32" height="32" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
              <polygon points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5" fill="none" stroke={ACCENT} strokeWidth="1"/>
              <circle cx="8" cy="8" r="2" fill={ACCENT_HI}/>
            </svg>
            <div style={{ fontSize: 7, color: '#707070', letterSpacing: '0.2em' }}>16</div>
          </div>
        </div>
      </div>
    </DeepCard>
  );
}

window.CipherDeepDives = {
  RotorHero, RotorLockup, RotorAppIcon, RotorFavicon, RotorDecodeMotion, RotorColorways,
  ApertureHero, ApertureLockup, ApertureOpenClose, ApertureBreathe, ApertureReveal, ApertureScale,
};

// Inject keyframe needed by spinning rotor instances
if (!document.getElementById('rotor-keyframes')) {
  const s = document.createElement('style');
  s.id = 'rotor-keyframes';
  s.textContent = `@keyframes rotorSpinD { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  document.head.appendChild(s);
}
