-- Executado pelo container do PostgreSQL apenas na primeira inicializacao do
-- volume. Cria os bancos separados dos testes automatizados (Vitest e
-- Playwright). Num volume que ja existia, crie o segundo com:
--   docker compose exec db psql -U lojarpg -c "CREATE DATABASE lojarpg_e2e"
CREATE DATABASE lojarpg_test OWNER lojarpg;
CREATE DATABASE lojarpg_e2e OWNER lojarpg;
