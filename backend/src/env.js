import fs from 'node:fs';
import path from 'node:path';

const envFilePath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envFilePath)) {
  const fileContents = fs.readFileSync(envFilePath, 'utf8');
  const lines = fileContents.split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
    const unquotedValue = rawValue.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');

    if (key && !(key in process.env)) {
      process.env[key] = unquotedValue;
    }
  }
}
