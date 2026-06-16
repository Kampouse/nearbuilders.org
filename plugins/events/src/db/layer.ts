import { Context, Effect, Layer } from "every-plugin/effect";
import type { EventsDatabase } from "./index";
import { migrate } from "./migrator";

export const DatabaseTag = Context.Tag("events/Database")<EventsDatabase, EventsDatabase>();

export const DatabaseLive = (url: string) =>
  Layer.scoped(
    DatabaseTag,
    Effect.acquireRelease(
      Effect.promise(async () => {
        const { createDatabaseDriver } = await import("./index");
        const driver = await createDatabaseDriver(url);

        const migrations = await import("virtual:drizzle-migrations.sql");
        await migrate(driver.db, migrations.default);
        console.log("[Events] Migrations applied");

        return driver.db;
      }),
      () => Effect.void,
    ),
  );
