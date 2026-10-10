// Configuracao do CLI do Prisma (substitui o bloco "prisma" do package.json,
// que deixa de valer no Prisma 7). Com este arquivo o CLI nao le mais o .env
// sozinho; o dotenv/config faz isso no desenvolvimento, sem sobrescrever
// variaveis ja definidas (Render, Docker, testes).
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'node prisma/seed.js'
  }
});
