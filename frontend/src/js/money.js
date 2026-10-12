export const COINS = { PC: 1, PP: 10, PO: 100, PL: 1000 };

// String/BigInt arithmetic avoids rounding 0.29 PO to 28 copper pieces.
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

export function moneyInUnit(value, unit) {
  if (!Number.isSafeInteger(value)) return '';
  const rate = COINS[unit];
  const abs = Math.abs(value);
  const fraction = String(abs % rate).padStart(String(rate).length - 1, '0').replace(/0+$/, '');
  return `${value < 0 ? '-' : ''}${Math.floor(abs / rate)}${fraction ? `.${fraction}` : ''}`;
}

export function formatMoney(value) {
  if (!Number.isSafeInteger(value)) return '—';
  let remaining = Math.abs(value);
  const parts = [];
  for (const [unit, rate] of Object.entries(COINS).reverse()) {
    const count = Math.floor(remaining / rate);
    if (count) parts.push(`${count} ${unit}`);
    remaining %= rate;
  }
  return `${value < 0 ? '-' : ''}${parts.join(' ') || '0 PC'}`;
}
