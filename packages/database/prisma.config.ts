import { defineConfig } from 'prisma/config';

import {
  assertDatabaseResetAllowed,
  isPrismaResetCommand,
  resolvePrismaDatabaseUrl,
} from './prisma/reset-safety.mjs';

if (isPrismaResetCommand(process.argv)) {
  assertDatabaseResetAllowed(process.env);
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: resolvePrismaDatabaseUrl(process.env),
  },
});
