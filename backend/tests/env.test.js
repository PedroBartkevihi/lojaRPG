import { describe, expect, it } from 'vitest';
import { assertProductionSecrets } from '../src/config/env.js';

const strongSecrets = {
  nodeEnv: 'production',
  jwtSecret: 'a'.repeat(48)
};

describe('segredos de produção', () => {
  it('aceita segredos fortes', () => {
    expect(() => assertProductionSecrets(strongSecrets)).not.toThrow();
  });

  it.each([
    ['dev-secret-change-me'],
    ['troque-este-segredo-em-producao'],
    ['configure-um-segredo-longo-e-unico'],
    ['curto-demais'],
    ['']
  ])('recusa JWT_SECRET %j', (jwtSecret) => {
    expect(() => assertProductionSecrets({ ...strongSecrets, jwtSecret })).toThrow(/JWT_SECRET/);
  });

  it('não exige segredos fora de produção', () => {
    expect(() =>
      assertProductionSecrets({
        nodeEnv: 'development',
        jwtSecret: 'dev-secret-change-me'
      })
    ).not.toThrow();
  });
});
