/* global React */
// Cipher demo data + helpers shared across screens.
// Live demo only — no Supabase, no real crypto. Uses ciphers.js for the visual encoding.

const { useState, useEffect, useRef, useCallback, useMemo } = React;

// Lightweight in-page copy of applyCipher (subset) so we don't need ESM imports.
// Real app uses src/ciphers.js which is the same logic.
const CIPHERS = ['caesar','vigenere','atbash','railfence','polybius','morse','futhark'];

const CIPHER_LABELS = {
  caesar: 'Caesar',
  vigenere: 'Vigenère',
  atbash: 'Atbash',
  railfence: 'Rail Fence',
  polybius: 'Polybius',
  morse: 'Morse',
  futhark: 'Futhark'
};

const CIPHER_HINT = {
  caesar:    'Shift number',
  vigenere:  'Keyword',
  atbash:    'No key',
  railfence: 'Rail count',
  polybius:  'No key',
  morse:     'No key',
  futhark:   'No key'
};

const CIPHER_USES_KEY = { caesar: true, vigenere: true, railfence: true };

function caesarShift(text, shift, encode) {
  shift = ((parseInt(shift) || 13) % 26 + 26) % 26;
  if (!encode) shift = (26 - shift) % 26;
  return text.split('').map(c => {
    if (/[a-z]/.test(c)) return String.fromCharCode((c.charCodeAt(0) - 97 + shift) % 26 + 97);
    if (/[A-Z]/.test(c)) return String.fromCharCode((c.charCodeAt(0) - 65 + shift) % 26 + 65);
    return c;
  }).join('');
}

function vigenere(text, key, encode) {
  key = (key || 'KEY').toUpperCase().replace(/[^A-Z]/g, '') || 'KEY';
  let ki = 0;
  return text.split('').map(c => {
    if (!/[a-zA-Z]/.test(c)) return c;
    const upper = c === c.toUpperCase(), base = upper ? 65 : 97;
    const shift = key.charCodeAt(ki % key.length) - 65; ki++;
    const s = encode ? shift : (26 - shift) % 26;
    return String.fromCharCode((c.charCodeAt(0) - base + s) % 26 + base);
  }).join('');
}

function atbash(text) {
  return text.split('').map(c => {
    if (/[a-z]/.test(c)) return String.fromCharCode(122 - (c.charCodeAt(0) - 97));
    if (/[A-Z]/.test(c)) return String.fromCharCode(90  - (c.charCodeAt(0) - 65));
    return c;
  }).join('');
}

const PB = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';
function polybius(text, encode) {
  if (encode) {
    return text.toUpperCase().split('').map(c => {
      if (c === 'J') c = 'I';
      const i = PB.indexOf(c);
      if (i === -1) return /\s/.test(c) ? ' ' : c;
      return `${Math.floor(i/5)+1}${(i%5)+1}`;
    }).join(' ');
  }
  return text;
}

const ME = {
  A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',
  K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',
  U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..'
};
function morse(text) {
  return text.toUpperCase().split('').map(c => c === ' ' ? '/' : (ME[c] ?? c)).join(' ').replace(/ \/ /g,' / ');
}

const FENC = {A:'ᚨ',B:'ᛒ',C:'ᚲ',D:'ᛞ',E:'ᛖ',F:'ᚠ',G:'ᚷ',H:'ᚺ',I:'ᛁ',J:'ᛃ',K:'ᚲ',L:'ᛚ',M:'ᛗ',N:'ᚾ',O:'ᛟ',P:'ᛈ',Q:'ᚲ',R:'ᚱ',S:'ᛊ',T:'ᛏ',U:'ᚢ',V:'ᚢ',W:'ᚹ',X:'ᛉ',Y:'ᛁ',Z:'ᛉ'};
function futhark(text) {
  return text.toUpperCase().split('').map(c => FENC[c] ?? c).join('');
}

function railFence(text, rails, encode) {
  const n = Math.max(2, parseInt(rails) || 3);
  if (n >= text.length) return text;
  if (encode) {
    const fence = Array.from({length: n}, () => []);
    let rail = 0, dir = 1;
    for (const c of text) {
      fence[rail].push(c);
      if (rail === 0) dir = 1; else if (rail === n - 1) dir = -1;
      rail += dir;
    }
    return fence.map(r => r.join('')).join('');
  }
  return text;
}

function applyCipher(text, cipher, key, encode = true) {
  switch (cipher) {
    case 'caesar':    return caesarShift(text, key, encode);
    case 'vigenere':  return vigenere(text, key, encode);
    case 'atbash':    return atbash(text);
    case 'railfence': return railFence(text, key, encode);
    case 'polybius':  return polybius(text, encode);
    case 'morse':     return morse(text, encode);
    case 'futhark':   return futhark(text, encode);
    default:          return text;
  }
}

// ── Demo conversation data ──────────────────────────────

const ME_USER = {
  id: 'me',
  username: 'jordan',
  display_name: 'Jordan',
  email: 'jordan@readyboxhq.com'
};

const CONTACTS = {
  cheryl:  { id: 'u-cheryl',  username: 'cheryl',  display_name: 'Cheryl' },
  rune:    { id: 'u-rune',    username: 'rune',    display_name: 'Rune' },
  mara:    { id: 'u-mara',    username: 'mara',    display_name: 'Mara' },
  archive: { id: 'u-archive', username: 'archive', display_name: 'archive' }
};

// "Cheryl" thread — primary demo (mid-decode flow lives here)
const DEMO_MESSAGES = {
  cheryl: [
    { id: 'm1', from: 'cheryl', text: 'Did the package arrive yet?',                      cipher: 'vigenere', key: 'WOLF', mins_ago: 184 },
    { id: 'm2', from: 'me',     text: 'Yeah. Wrapped exactly as described.',              cipher: 'vigenere', key: 'WOLF', mins_ago: 180 },
    { id: 'm3', from: 'cheryl', text: 'Good. Coordinates inside?',                        cipher: 'vigenere', key: 'WOLF', mins_ago: 176 },
    { id: 'm4', from: 'me',     text: 'On the back of the second card.',                  cipher: 'vigenere', key: 'WOLF', mins_ago: 174 },
    { id: 'm5', from: 'cheryl', text: 'Switching to Caesar 13 for the next one.',         cipher: 'caesar',   key: '13',   mins_ago: 12 },
    { id: 'm6', from: 'cheryl', text: 'Meet at the usual place. 9pm.',                    cipher: 'caesar',   key: '13',   mins_ago: 8 },
    { id: 'm7', from: 'cheryl', text: 'Bring the second envelope.',                       cipher: 'caesar',   key: '13',   mins_ago: 2 }
  ],
  rune: [
    { id: 'r1', from: 'rune', text: 'wheel arrived. testing it tonight', cipher: 'futhark',   key: '', mins_ago: 1440 }
  ],
  mara: [
    { id: 'a1', from: 'mara', text: 'morse practice tomorrow at 7?',     cipher: 'morse',     key: '', mins_ago: 60 * 26 }
  ]
};

// Per-conversation cipher settings (the local-only "keep decoded" prefs)
const DEFAULT_SETTINGS = {
  cheryl:  { cipher: 'caesar',   key: '13',   keep: false },
  rune:    { cipher: 'futhark',  key: '',     keep: true  },  // already trusted — auto-decode
  mara:    { cipher: 'morse',    key: '',     keep: false }
};

const CONVERSATIONS = [
  { id: 'cheryl', contact: 'cheryl', last_at: 2,        unread: 3 },
  { id: 'rune',   contact: 'rune',   last_at: 60 * 24,  unread: 0 },
  { id: 'mara',   contact: 'mara',   last_at: 60 * 26,  unread: 1 }
];

function strColor(str) {
  let h = 0;
  for (const c of str) h = c.charCodeAt(0) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360}, 24%, 26%)`;
}

function ago(mins) {
  if (mins < 1)        return 'NOW';
  if (mins < 60)       return `${Math.floor(mins)}M`;
  if (mins < 60 * 24)  return `${Math.floor(mins / 60)}H`;
  return `${Math.floor(mins / 60 / 24)}D`;
}

function timeOnly(mins) {
  // Convert "minutes ago" into a fake clock time for the chat list
  const d = new Date(Date.now() - mins * 60000);
  let h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

// Render the cipher text for a message, given its cipher type + key
function renderCipher(msg) {
  return applyCipher(msg.text, msg.cipher, msg.key, true);
}

window.CipherData = {
  CIPHERS, CIPHER_LABELS, CIPHER_HINT, CIPHER_USES_KEY,
  applyCipher, renderCipher,
  ME_USER, CONTACTS, CONVERSATIONS, DEMO_MESSAGES, DEFAULT_SETTINGS,
  strColor, ago, timeOnly
};
