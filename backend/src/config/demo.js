// Contas da demonstracao publica (as senhas estao no README e nos botoes da
// tela de entrada). Elas ficam so na mesa de demonstracao: numa mesa real,
// qualquer visitante que entrasse com a mesma conta veria a mesa, e o reset da
// demonstracao apagaria os personagens e as compras dela.
export const DEMO_ACCOUNT_EMAILS = [
  'mestre@lojarpg.local',
  'aria@lojarpg.local',
  'borin@lojarpg.local',
  'lia@lojarpg.local'
];

export function isDemoAccount(user) {
  return DEMO_ACCOUNT_EMAILS.includes(user?.email);
}
