import "dotenv/config";
import Bluebird from "bluebird";
import { port } from "./config/vars.js";
import { connectClients } from "./config/client.js";
import { getLicense } from "./config/license.js";
import app from "./config/app.js";

// make bluebird default Promise
global.Promise = Bluebird; // eslint-disable-line no-global-assign

// Verified once here (rather than lazily on first entitlement check) so a
// bad/expired license is visible in the boot log immediately, not silently
// discovered later when someone hits a gated route.
getLicense();

connectClients()
  .then(() => app.listen(port, () => console.info(`server started on port ${port}`)))
  .catch((err) => {
    console.error("failed to establish connections", err);
    process.exit(1);
  });

/**
 * Exports express
 * @public
 */
export default app;
