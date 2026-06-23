import "dotenv/config";
import type { PluginConfigInput } from "every-plugin";
import packageJson from "./package.json" with { type: "json" };
import type Plugin from "./src/index";

export default {
  pluginId: packageJson.name,
  port: Number(process.env.PORT) || 3015,
  config: {
    variables: {},
    secrets: {
      NOTIFICATIONS_DATABASE_URL:
        process.env.NOTIFICATIONS_DATABASE_URL || "pglite:.bos/notifications/:memory:",
    },
  } satisfies PluginConfigInput<typeof Plugin>,
};
