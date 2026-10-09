-- Executado pelo container do PostgreSQL apenas na primeira inicializacao do
-- volume. Cria o banco separado usado pelos testes automatizados.
CREATE DATABASE lojarpg_test OWNER lojarpg;
