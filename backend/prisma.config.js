// Configuracao do CLI do Prisma. O CLI nao le o .env sozinho; o dotenv/config
// faz isso no desenvolvimento, sem sobrescrever variaveis ja definidas
// (Render, Docker, testes). A URL vem de process.env em vez de env() para que
// `prisma generate` funcione no build sem DATABASE_URL.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js'
  },
  datasource: {
    url: process.env.DATABASE_URL ?? ''
  }
});
