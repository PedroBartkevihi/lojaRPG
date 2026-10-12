import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, it } from 'vitest';
import MoneyInput from './MoneyInput.jsx';

function Field() {
  const [value, setValue] = useState('');
  return <><MoneyInput label="Preço" value={value} onChange={setValue} /><output data-testid="copper">{String(value)}</output></>;
}

it('permite informar prata/ouro e trocar a unidade sem alterar o valor', async () => {
  const user = userEvent.setup();
  render(<Field />);
  await user.selectOptions(screen.getByLabelText('Moeda: Preço'), 'PO');
  await user.type(screen.getByLabelText('Preço'), '1.5');
  expect(screen.getByTestId('copper')).toHaveTextContent('150');
  expect(screen.getByText('1 PO 5 PP')).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Moeda: Preço'), 'PP');
  expect(screen.getByLabelText('Preço')).toHaveValue(15);
  expect(screen.getByTestId('copper')).toHaveTextContent('150');
});
