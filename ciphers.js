// Historical cipher implementations.
// These are the aesthetic layer — AES handles actual security.

export const CIPHERS = ['caesar','vigenere','atbash','railfence','polybius','morse','futhark']

export const CIPHER_LABELS = {
  caesar: 'Caesar', vigenere: 'Vigenère', atbash: 'Atbash',
  railfence: 'Rail Fence', polybius: 'Polybius Square',
  morse: 'Morse Code', futhark: 'Elder Futhark'
}

// Which ciphers use the key as part of the cipher itself (vs just AES)
export const CIPHER_USES_KEY = { caesar: true, vigenere: true, railfence: true }

function caesarShift(text, shift, encode) {
  shift = ((parseInt(shift) || 13) % 26 + 26) % 26
  if (!encode) shift = (26 - shift) % 26
  return text.split('').map(c => {
    if (/[a-z]/.test(c)) return String.fromCharCode((c.charCodeAt(0) - 97 + shift) % 26 + 97)
    if (/[A-Z]/.test(c)) return String.fromCharCode((c.charCodeAt(0) - 65 + shift) % 26 + 65)
    return c
  }).join('')
}

function vigenere(text, key, encode) {
  key = (key || 'KEY').toUpperCase().replace(/[^A-Z]/g, '') || 'KEY'
  let ki = 0
  return text.split('').map(c => {
    if (!/[a-zA-Z]/.test(c)) return c
    const upper = c === c.toUpperCase(), base = upper ? 65 : 97
    const shift = key.charCodeAt(ki % key.length) - 65; ki++
    const s = encode ? shift : (26 - shift) % 26
    return String.fromCharCode((c.charCodeAt(0) - base + s) % 26 + base)
  }).join('')
}

function atbash(text) {
  return text.split('').map(c => {
    if (/[a-z]/.test(c)) return String.fromCharCode(122 - (c.charCodeAt(0) - 97))
    if (/[A-Z]/.test(c)) return String.fromCharCode(90  - (c.charCodeAt(0) - 65))
    return c
  }).join('')
}

function railFence(text, rails, encode) {
  const n = Math.max(2, parseInt(rails) || 3)
  if (n >= text.length) return text
  if (encode) {
    const fence = Array.from({length: n}, () => [])
    let rail = 0, dir = 1
    for (const c of text) {
      fence[rail].push(c)
      if (rail === 0) dir = 1; else if (rail === n - 1) dir = -1
      rail += dir
    }
    return fence.map(r => r.join('')).join('')
  } else {
    const len = text.length, lens = new Array(n).fill(0)
    let rail = 0, dir = 1
    for (let i = 0; i < len; i++) {
      lens[rail]++
      if (rail === 0) dir = 1; else if (rail === n - 1) dir = -1
      rail += dir
    }
    const rows = []; let idx = 0
    for (let r = 0; r < n; r++) { rows.push(text.slice(idx, idx + lens[r]).split('')); idx += lens[r] }
    const result = [], ri = new Array(n).fill(0)
    rail = 0; dir = 1
    for (let i = 0; i < len; i++) {
      result.push(rows[rail][ri[rail]++])
      if (rail === 0) dir = 1; else if (rail === n - 1) dir = -1
      rail += dir
    }
    return result.join('')
  }
}

const PB = 'ABCDEFGHIKLMNOPQRSTUVWXYZ'
function polybius(text, encode) {
  if (encode) {
    return text.toUpperCase().split('').map(c => {
      if (c === 'J') c = 'I'
      const i = PB.indexOf(c)
      if (i === -1) return /\s/.test(c) ? ' ' : c
      return `${Math.floor(i/5)+1}${(i%5)+1}`
    }).join('')
  } else {
    const out = []; let i = 0
    while (i < text.length) {
      const c = text[i]
      if (/[1-5]/.test(c) && i+1 < text.length && /[1-5]/.test(text[i+1])) {
        const idx = (parseInt(c)-1)*5 + (parseInt(text[i+1])-1)
        out.push(idx < PB.length ? PB[idx] : '?'); i += 2
      } else { out.push(c); i++ }
    }
    return out.join('')
  }
}

const ME = {
  A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',
  K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',
  U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',
  '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....',
  '6':'-....','7':'--...','8':'---..','9':'----.'
}
const MD = Object.fromEntries(Object.entries(ME).map(([k,v]) => [v,k]))
function morse(text, encode) {
  if (encode) return text.toUpperCase().split('').map(c => c === ' ' ? '/' : (ME[c] ?? c)).join(' ').replace(/ \/ /g,' / ')
  return text.split(' / ').map(w => w.trim().split(' ').map(code => MD[code] ?? code).join('')).join(' ')
}

const FENC = {A:'ᚨ',B:'ᛒ',C:'ᚲ',D:'ᛞ',E:'ᛖ',F:'ᚠ',G:'ᚷ',H:'ᚺ',I:'ᛁ',J:'ᛃ',K:'ᚲ',L:'ᛚ',M:'ᛗ',N:'ᚾ',O:'ᛟ',P:'ᛈ',Q:'ᚲ',R:'ᚱ',S:'ᛊ',T:'ᛏ',U:'ᚢ',V:'ᚢ',W:'ᚹ',X:'ᛉ',Y:'ᛁ',Z:'ᛉ'}
const FDEC = {'ᚨ':'A','ᛒ':'B','ᚲ':'K','ᛞ':'D','ᛖ':'E','ᚠ':'F','ᚷ':'G','ᚺ':'H','ᛁ':'I','ᛃ':'J','ᛚ':'L','ᛗ':'M','ᚾ':'N','ᛟ':'O','ᛈ':'P','ᚱ':'R','ᛊ':'S','ᛏ':'T','ᚢ':'U','ᚹ':'W','ᛉ':'Z'}
function futhark(text, encode) {
  if (encode) return text.toUpperCase().split('').map(c => FENC[c] ?? c).join('')
  return text.split('').map(c => FDEC[c] ?? c).join('')
}

export function applyCipher(text, cipher, key, encode) {
  switch (cipher) {
    case 'caesar':    return caesarShift(text, key, encode)
    case 'vigenere':  return vigenere(text, key, encode)
    case 'atbash':    return atbash(text)
    case 'railfence': return railFence(text, key, encode)
    case 'polybius':  return polybius(text, encode)
    case 'morse':     return morse(text, encode)
    case 'futhark':   return futhark(text, encode)
    default:          return text
  }
}
