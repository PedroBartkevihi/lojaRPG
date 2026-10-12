import { useEffect, useId, useRef, useState } from 'react';
import { COINS, formatMoney, moneyInUnit, parseMoney } from '../js/money.js';

export default function MoneyInput({ label, value, onChange, required = false, disabled = false, signed = false, max = 100000000, placeholder }) {
  const id = useId();
  const input = useRef(null);
  const emitted = useRef(value);
  const [unit, setUnit] = useState('PC');
  const [text, setText] = useState(value === '' ? '' : moneyInUnit(Number(value), 'PC'));
  useEffect(() => {
    if (!Object.is(value, emitted.current)) {
      emitted.current = value;
      setText(value === '' ? '' : moneyInUnit(Number(value), unit));
      input.current?.setCustomValidity('');
    }
  }, [value, unit]);
  function change(text) {
    setText(text);
    const next = text === '' ? '' : parseMoney(text, unit);
    input.current.setCustomValidity(text !== '' && !Number.isSafeInteger(next) ? 'Informe um valor que corresponda a peças inteiras de cobre.' : '');
    emitted.current = next;
    onChange(next);
  }
  return <div className="money-field">
    <label htmlFor={id}>{label}</label>
    <div className="money-input">
      <input id={id} ref={input} type="number" step={1 / COINS[unit]} min={signed ? -max / COINS[unit] : 0} max={max / COINS[unit]}
        required={required} disabled={disabled} value={text} placeholder={placeholder} onChange={(e) => change(e.target.value)} />
      <select aria-label={`Moeda: ${label}`} value={unit} disabled={disabled} onChange={(e) => {
        setUnit(e.target.value); setText(value === '' ? '' : moneyInUnit(Number(value), e.target.value)); input.current.setCustomValidity('');
      }}>{Object.keys(COINS).map((coin) => <option key={coin}>{coin}</option>)}</select>
    </div>
    {value !== '' && Number.isSafeInteger(value) && <small>{formatMoney(value)}</small>}
  </div>;
}
