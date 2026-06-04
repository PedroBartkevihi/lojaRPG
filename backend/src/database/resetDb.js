import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { closeDatabase, getDatabase } from './connection.js';
import { projectRoot } from '../config/env.js';
import { initializeSchema } from './schema.js';

closeDatabase();

for (const suffix of ['', '-wal', '-shm']) {
  const file = `${env.databaseFile}${suffix}`;
  if (fs.existsSync(file)) {
    fs.rmSync(file, { force: true });
  }
}

initializeSchema();

const seedPath = path.join(projectRoot, 'database', 'seed.sql');
const sql = fs.readFileSync(seedPath, 'utf8');
getDatabase().exec(sql);

console.log('Banco recriado e populado com sucesso.');
