import { definePrismaConfig } from 'prisma/config';

export default definePrismaConfig({
  orm: {
    // Database schema path
    schema: './prisma/schema.prisma',
    // Migrations & seeder configuration
    migrations: {
      seed: 'ts-node prisma/seed.ts',
    },
  },
  skills: {
    check: false, // Disables automatic agent skills sync checks
  },
});
