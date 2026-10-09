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
      level: 3
    });
    expect(onRefreshSession).toHaveBeenCalledTimes(1);
    expect(showNotice).toHaveBeenCalledWith('Personagem criado.');
  });
});
