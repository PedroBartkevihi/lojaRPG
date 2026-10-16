import { acceptDialogs, expect, register, test, uniqueEmail } from './fixtures.js';

// Uma mesa de verdade do começo ao fim: o Mestre cria a mesa, o jogador entra
// pelo link (cadastrando a conta no caminho), cria o personagem, recebe moedas,
// encontra a loja fechada e é removido. As telas do jogador mudam pela
// atualização automática de 10 s, sem recarregar a página.
test('convite por link, recompensa, loja fechada e remoção do jogador', async ({ page, browser }) => {
  test.setTimeout(150000);
  acceptDialogs(page);

  await test.step('Mestre cria a conta e a mesa', async () => {
    await page.goto('/');
    await register(page, { name: 'Mestra Iris', email: uniqueEmail('iris') });
    await expect(page.getByRole('heading', { name: 'Minhas mesas' })).toBeVisible();
    await page.getByLabel('Nome da mesa').fill('Mesa da Costa');
    await page.getByRole('button', { name: 'Criar mesa' }).click();
    await expect(page.getByLabel('Link de convite')).toHaveValue(/\/convite\/[A-Z0-9]{8}$/);
  });

  const inviteLink = await page.getByLabel('Link de convite').inputValue();
  const playerContext = await browser.newContext({ extraHTTPHeaders: { 'X-Forwarded-For': '203.0.113.77' } });
  const player = await playerContext.newPage();
  acceptDialogs(player);

  await test.step('jogador abre o link sem conta, cadastra-se e cai na mesa', async () => {
    await player.goto(new URL(inviteLink).pathname);
    await expect(player.getByText('Entre ou crie sua conta para participar da mesa do convite.')).toBeVisible();
    // Quem chega por convite precisa de conta própria: a demonstração some.
    await expect(player.getByRole('button', { name: /Entrar como jogador/ })).toHaveCount(0);
    await register(player, { name: 'Tomas', email: uniqueEmail('tomas') });
    await expect(player.locator('.toast')).toHaveText('Você entrou na mesa "Mesa da Costa".');
    await expect(player.getByRole('heading', { name: 'Loja da campanha' })).toBeVisible();
  });

  await test.step('jogador cria o personagem', async () => {
    const form = player.locator('form', { has: player.getByRole('heading', { name: 'Criar personagem' }) });
    await form.getByLabel('Nome').fill('Tomas Vela');
    await form.getByLabel('Classe').fill('Bardo');
    await form.getByLabel('Raça').fill('Halfling');
    await form.getByRole('button', { name: 'Salvar personagem' }).click();
    await expect(player.locator('.toast')).toHaveText('Personagem criado.');
    await expect(player.locator('.character-panel')).toContainText('0 PC');
  });

  await test.step('Mestre dá moedas e o saldo aparece para o jogador', async () => {
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Mestre' }).click();
    const rewards = page.locator('.rewards-panel');
    await expect(rewards.getByRole('checkbox', { name: 'Tomas Vela' })).toBeChecked();
    await rewards.getByLabel('Moeda: Valor da recompensa').selectOption('PO');
    await rewards.getByRole('spinbutton', { name: 'Valor da recompensa' }).fill('30');
    await rewards.getByLabel('Motivo', { exact: true }).fill('Pagamento do capitão');
    await rewards.getByRole('button', { name: 'Dar moedas' }).click();
    await expect(page.locator('.toast')).toContainText('para Tomas Vela');
    await expect(player.locator('.character-panel')).toContainText('30 PO', { timeout: 15000 });
  });

  await test.step('Mestre fecha a loja e o jogador não consegue comprar', async () => {
    await page.getByRole('tab', { name: 'Vendedores' }).click();
    await page.getByRole('button', { name: 'Fechar loja' }).click();
    await expect(page.locator('.toast')).toHaveText('Loja fechada para compras e vendas.');
    const sword = player.locator('.item-card', { hasText: 'Espada Longa' });
    await expect(sword.getByRole('button', { name: 'Adicionar' })).toBeDisabled({ timeout: 15000 });
    await expect(sword).toContainText('fechado');
  });

  await test.step('Mestre remove o jogador e a mesa some da tela dele', async () => {
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Mesa' }).click();
    await page.locator('.campaign-row', { hasText: 'Tomas' }).getByRole('button', { name: 'Remover' }).click();
    await expect(page.locator('.toast')).toHaveText('Jogador removido da mesa.');
    await expect(player.getByText('Você ainda não participa de nenhuma mesa.', { exact: false })).toBeVisible({
      timeout: 15000
    });
  });

  await playerContext.close();
});
