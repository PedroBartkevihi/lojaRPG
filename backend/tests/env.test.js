import { describe, expect, it } from 'vitest';
import { assertProductionSecrets } from '../src/config/env.js';

const strongSecrets = {
  nodeEnv: 'production',
  jwtSecret: 'a'.repeat(48),
  masterRegistrationKey: 'b'.repeat(24)
};

describe('segredos de producao', () => {
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

  it.each([['chave-dev-para-criar-mestre'], ['troque-esta-chave'], ['configure-uma-chave-privada'], ['curta']])(
    'recusa MASTER_REGISTRATION_KEY %j',
    (masterRegistrationKey) => {
      expect(() => assertProductionSecrets({ ...strongSecrets, masterRegistrationKey })).toThrow(
        /MASTER_REGISTRATION_KEY/
      );
    }
  );

  it('nao exige segredos fora de producao', () => {
    expect(() =>
      assertProductionSecrets({
        nodeEnv: 'development',
        jwtSecret: 'dev-secret-change-me',
        masterRegistrationKey: 'chave-dev-para-criar-mestre'
      })
    ).not.toThrow();
  });
});
