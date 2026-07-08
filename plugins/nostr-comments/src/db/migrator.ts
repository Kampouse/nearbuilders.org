import type { PgDatabase } from "drizzle-orm/pg-core";

// Minimal migrator — applies SQL migrations from the virtual import
// (rspack plugin injects these at build time, matching the projects plugin pattern)
export async function migrate(
  db: PgDatabase<any>,
  migrations: { default: string },
) {
  // Split on semicolons and execute each statement
  const statements = migrations.default
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await db.execute(statement);
  }
}
