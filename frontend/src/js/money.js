/** @typedef {'PC' | 'PP' | 'PO' | 'PL'} Coin */

/** @type {Record<Coin, number>} */
export const COINS = { PC: 1, PP: 10, PO: 100, PL: 1000 };

// String/BigInt arithmetic avoids rounding 0.29 PO to 28 copper pieces.
/**
 * Valor digitado ("2,5") na moeda escolhida, em PC; NaN se nao der PC inteiro.
 * @param {string | number} text
 * @param {Coin} [unit]
 * @returns {number}
 */
export function parseMoney(text, unit = 'PC') {
  const value = String(text).trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(value) || !COINS[unit]) return NaN;
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = value.replace('-', '').split('.');
  if (whole.length + fraction.length > 20) return NaN;
  const scale = 10n ** BigInt(fraction.length);
  const amount = BigInt(whole + fraction) * BigInt(COINS[unit]);
  if (amount % scale !== 0n) return NaN;
  const result = Number(amount / scale) * (negative ? -1 : 1);
  return Number.isSafeInteger(result) ? result : NaN;
}

/**
 * @param {number} value Valor em PC.
 * @param {Coin} unit
 * @returns {string}
 */
export function moneyInUnit(value, unit) {
  if (!Number.isSafeInteger(value)) return '';
  const rate = COINS[unit];
  const abs = Math.abs(value);
  const fraction = String(abs % rate).padStart(String(rate).length - 1, '0').replace(/0+$/, '');
  return `${value < 0 ? '-' : ''}${Math.floor(abs / rate)}${fraction ? `.${fraction}` : ''}`;
}

// Na tela a maior moeda e a PO, como nos precos do SRD: 250 PO, e nao 25 PL.
// A PL continua valendo nos campos de valor.
/** @type {Coin[]} */
const DISPLAY_COINS = ['PO', 'PP', 'PC'];

/**
 * @param {number} value Valor em PC.
 * @returns {string} Ex.: "248 PO 5 PP".
 */
export function formatMoney(value) {
  if (!Number.isSafeInteger(value)) return '—';
  let remaining = Math.abs(value);
  const parts = [];
  for (const unit of DISPLAY_COINS) {
    const rate = COINS[unit];
    const count = Math.floor(remaining / rate);
    if (count) parts.push(`${count} ${unit}`);
    remaining %= rate;
  }
  return `${value < 0 ? '-' : ''}${parts.join(' ') || '0 PC'}`;
}
