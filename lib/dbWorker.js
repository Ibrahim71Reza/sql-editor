import { PGlite } from "@electric-sql/pglite";
import { worker } from "@electric-sql/pglite/worker";

worker({
  async init(options = {}) {
    return await PGlite.create({
      dataDir: options.dataDir || "idb://sql-studio-pro-local",
      loadDataDir: options.loadDataDir,
    });
  },
});
