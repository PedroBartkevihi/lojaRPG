import { PrismaClient } from '@prisma/client';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

let database;
let prisma;

export function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient();
  }

  return prisma;
}

export function getDatabase() {
  if (!database) {
    fs.mkdirSync(path.dirname(env.databaseFile), { recursive: true });
    database = new DatabaseSync(env.databaseFile);
    database.exec('PRAGMA foreign_keys = ON;');
    database.exec('PRAGMA journal_mode = WAL;');
  }

  return database;
}

export async function closeDatabase() {
  if (database) {
    database.close();
    database = undefined;
  }

  if (prisma) {
    await prisma.$disconnect();
    prisma = undefined;
  }
}
