import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CharacterPanel from './CharacterPanel.jsx';

describe('CharacterPanel', () => {
  it('permite selecionar o personagem ativo quando ha mais de um', async () => {
    const user = userEvent.setup();
    const onSelectCharacter = vi.fn();
    const characters = [
      { id: 1, name: 'Aria', className: 'Ladino', race: 'Elfo', level: 4, gold: 250 },
      { id: 2, name: 'Borin', className: 'Guerreiro', race: 'Anão', level: 5, gold: 320 }
    ];

    render(
      <CharacterPanel
        character={characters[0]}
        characters={characters}
        selectedCharacterId={1}
        onSelectCharacter={onSelectCharacter}
      />
    );

    await user.selectOptions(screen.getByLabelText(/personagem ativo/i), '2');

    expect(onSelectCharacter).toHaveBeenCalledWith(2);
  });

  it('cria personagem e atualiza a sessão', async () => {
    const user = userEvent.setup();
    const api = {
      createCharacter: vi.fn().mockResolvedValue({ character: { id: 10 } })
    };
    const onRefreshSession = vi.fn().mockResolvedValue();
    const showNotice = vi.fn();

    render(<CharacterPanel api={api} onRefreshSession={onRefreshSession} showNotice={showNotice} />);

    await user.type(screen.getByLabelText(/^nome$/i), 'Nym');
    await user.type(screen.getByLabelText(/^classe$/i), 'Bardo');
    await user.type(screen.getByLabelText(/^raça$/i), 'Humano');
    await user.clear(screen.getByLabelText(/^nível$/i));
    await user.type(screen.getByLabelText(/^nível$/i), '3');
    await user.click(screen.getByRole('button', { name: /salvar personagem/i }));

    expect(api.createCharacter).toHaveBeenCalledWith({
      name: 'Nym',
      className: 'Bardo',
      race: 'Humano',
      level: 3,
      strength: 10
    });
    expect(onRefreshSession).toHaveBeenCalledTimes(1);
    expect(showNotice).toHaveBeenCalledWith('Personagem criado.');
  });

  it('cria um segundo personagem e passa a usar o novo', async () => {
    const user = userEvent.setup();
    const aria = { id: 1, name: 'Aria', className: 'Ladino', race: 'Elfo', level: 4, gold: 250 };
    const api = { createCharacter: vi.fn().mockResolvedValue({ character: { id: 7 } }) };
    const onRefreshSession = vi.fn().mockResolvedValue();
    const onSelectCharacter = vi.fn();

    render(
      <CharacterPanel
        api={api}
        character={aria}
        characters={[aria]}
        onRefreshSession={onRefreshSession}
        onSelectCharacter={onSelectCharacter}
        showNotice={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /novo personagem/i }));
    await user.type(screen.getByLabelText(/^nome$/i), 'Nym');
    await user.type(screen.getByLabelText(/^classe$/i), 'Bardo');
    await user.type(screen.getByLabelText(/^raça$/i), 'Humano');
    await user.click(screen.getByRole('button', { name: /salvar personagem/i }));

    expect(api.createCharacter).toHaveBeenCalledWith({ name: 'Nym', className: 'Bardo', race: 'Humano', level: 1, strength: 10 });
    expect(onSelectCharacter).toHaveBeenCalledWith(7);
  });

  it('cancela o novo personagem e volta ao atual', async () => {
    const user = userEvent.setup();
    const aria = { id: 1, name: 'Aria', className: 'Ladino', race: 'Elfo', level: 4, gold: 250 };

    render(<CharacterPanel character={aria} characters={[aria]} />);

    await user.click(screen.getByRole('button', { name: /novo personagem/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(screen.getByRole('heading', { name: 'Aria' })).toBeInTheDocument();
  });

  it('mostra a carga e avisa quando passa da capacidade', () => {
    const borin = { id: 2, name: 'Borin', className: 'Guerreiro', race: 'Anão', level: 5, gold: 320, strength: 8, carryCapacity: 120, carriedWeight: 130.5 };
    render(<CharacterPanel character={borin} characters={[borin]} />);

    expect(screen.getByText('Carga (Força 8)')).toBeInTheDocument();
    expect(screen.getByText('130,5 lb de 120 lb')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Borin passou da capacidade de carga');
  });
});
