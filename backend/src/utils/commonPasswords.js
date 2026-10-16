// Senhas que aparecem no topo das listas de vazamentos (as globais e as mais
// usadas no Brasil), com 8 caracteres ou mais: as menores ja caem no tamanho
// minimo. A lista fica no codigo para a checagem nao depender de servico
// externo nem mandar a senha para lugar nenhum.
const COMMON_PASSWORDS = [
  '12345678',
  '123456789',
  '1234567890',
  '12345678910',
  '123123123',
  '11111111',
  '00000000',
  '88888888',
  '87654321',
  '11223344',
  '12341234',
  '1q2w3e4r',
  '1q2w3e4r5t',
  'q1w2e3r4',
  'qwertyui',
  'qwertyuiop',
  'qwerty123',
  'qwerty12',
  'asdfghjk',
  'asdfghjkl',
  'zxcvbnm1',
  'abcd1234',
  'abc12345',
  'abcdefgh',
  'aa123456',
  'a1234567',
  'password',
  'password1',
  'password123',
  'passw0rd',
  'p@ssw0rd',
  'iloveyou',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'welcome1',
  'superman',
  'whatever',
  'trustno1',
  'starwars',
  'pokemon1',
  'dragon12',
  'letmein1',
  'master12',
  'admin123',
  'administrator',
  'changeme',
  'senha123',
  'senha1234',
  'senha12345',
  'minhasenha',
  'senhasenha',
  'mudar123',
  'trocar123',
  'brasil123',
  'brasil2026',
  'flamengo',
  'flamengo1',
  'corinthians',
  'palmeiras',
  'vasco123',
  'gremio123',
  'santos123',
  'saopaulo',
  'botafogo',
  'fluminense',
  'cruzeiro',
  'internacional',
  'meuamor1',
  'teamo123',
  'amorzinho',
  'gabriel1',
  'lucas123',
  'mateus123',
  'jesus123',
  'deusefiel',
  'q1w2e3r4t5',
  'mestre123',
  'jogador123',
  'dungeons',
  'dragons1',
  'dungeonsanddragons',
  'lojarpg1',
  'lojarpg123',
  'rpgdemesa'
];

const COMMON = new Set(COMMON_PASSWORDS);

// "aaaaaaaa", "12121212" e afins: um bloco curto repetido ate o fim.
/** @param {string} value */
function isRepetition(value) {
  return /^(.{1,2})\1+$/.test(value);
}

/** @param {string} password */
export function isCommonPassword(password) {
  const value = password.trim().toLowerCase();
  return COMMON.has(value) || isRepetition(value);
}
