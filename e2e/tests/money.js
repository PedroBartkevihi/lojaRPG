// Le um valor exibido na tela ("1 PO 5 PP") em pecas de cobre, para os testes
// compararem saldos antes e depois sem depender do valor inicial.
const RATES = { PL: 1000, PO: 100, PP: 10, PC: 1 };

export function parseMoneyText(text) {
  const matches = [...String(text).matchAll(/(-?\d+)\s*(PL|PO|PP|PC)/g)];

  if (matches.length === 0) {
    throw new Error(`Valor sem moeda: "${text}"`);
  }

  return matches.reduce((total, [, amount, unit]) => total + Number(amount) * RATES[unit], 0);
}
