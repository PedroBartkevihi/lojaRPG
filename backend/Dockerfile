FROM node:24-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci

COPY backend/prisma.config.js ./
COPY backend/prisma ./prisma
RUN npx prisma generate

COPY backend/src ./src

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Como no Render: com DEMO_RESET_ON_START=true o seed recria a mesa de
# demonstracao a cada inicio, e os botoes "Entrar como..." funcionam.
CMD ["sh", "-c", "npx prisma migrate deploy && if [ \"$DEMO_RESET_ON_START\" = \"true\" ]; then node prisma/seed.js; fi && node src/server.js"]
