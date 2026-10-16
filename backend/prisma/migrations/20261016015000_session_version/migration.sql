-- Versao da sessao: a troca de senha sobe a da conta, e os tokens emitidos
-- com a versao antiga sao recusados. Colunas novas com padrao 0, sem tocar
-- nos dados existentes (as sessoes abertas continuam valendo).
ALTER TABLE "users" ADD COLUMN "session_version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "refresh_tokens" ADD COLUMN "session_version" INTEGER NOT NULL DEFAULT 0;
