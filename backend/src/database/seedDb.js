import fs from 'node:fs';
import path from 'node:path';
import { projectRoot } from '../config/env.js';
import { getDatabase } from './connection.js';
import { initializeSchema } from './schema.js';

initializeSchema();

const seedPath = path.join(projectRoot, 'database', 'seed.sql');
const sql = fs.readFileSync(seedPath, 'utf8');
getDatabase().exec(sql);

console.log('Dados iniciais inseridos com sucesso.');
