# SkyRoute backend (Express + Prisma). Uses Postgres in containers.
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# Switch Prisma to Postgres + compile.
RUN npm run build:prod

EXPOSE 4000

# Create/sync tables + seed tours, then start.
CMD sh -c "npm run predeploy && npm run start"
