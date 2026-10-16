# Duas etapas: a primeira instala so as dependencias de producao (o CLI do
# Prisma esta nelas, porque o inicio da API aplica as migrations) e gera o
# cliente; a segunda leva so node_modules e o codigo, sem o cache do npm nem as
# ferramentas de teste e lint. Antes, com as devDependencies, eram ~1 GB.
FROM node:24-alpine AS deps

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/prisma.config.js ./
COPY backend/prisma ./prisma
# O typescript entra no --omit=dev como peer opcional do Prisma (~24 MB) e so
# serve para o npm run typecheck; o prisma generate nao precisa dele.
RUN npx prisma generate && rm -rf node_modules/typescript node_modules/.bin/tsc node_modules/.bin/tsserver

FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=deps /app/node_modules ./node_modules
COPY backend/package*.json backend/prisma.config.js ./
COPY backend/prisma ./prisma
COPY backend/src ./src

# Sem root dentro do container.
USER node

EXPOSE 3001

# Como no Render: com DEMO_RESET_ON_START=true o seed recria a mesa de
# demonstracao a cada inicio, e os botoes "Entrar como..." funcionam.
CMD ["sh", "-c", "npx prisma migrate deploy && if [ \"$DEMO_RESET_ON_START\" = \"true\" ]; then node prisma/seed.js; fi && node src/server.js"]
