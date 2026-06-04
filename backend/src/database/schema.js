import fs from 'node:fs';
import path from 'node:path';
import { projectRoot } from '../config/env.js';
import { getDatabase } from './connection.js';

export function initializeSchema() {
  const schemaPath = path.join(projectRoot, 'database', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  getDatabase().exec(sql);
}
