import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SITE } from '../config/site';

export const cvAvailable = existsSync(join(process.cwd(), 'public', SITE.cv));

if (!cvAvailable) {
  console.warn(`[cv] TODO: public${SITE.cv} is missing. CV links are hidden until the file is added.`);
}
