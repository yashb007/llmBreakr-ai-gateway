import "dotenv/config";
import Bluebird from "bluebird";
import { port } from "./config/vars.js";
import { connectClients } from "./config/client.js";
import app from "./config/app.js";

// make bluebird default Promise
global.Promise = Bluebird; // eslint-disable-line no-global-assign

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
