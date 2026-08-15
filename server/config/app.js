import express from "express";
import bodyParser from "body-parser";
import compress from "compression";
import methodOverride from "method-override";
import cors from "cors";
import helmet from "helmet";
import adminRoutes from "../admin/routes/index.js";
import dataPlaneRoutes from "../dataplane/routes/index.js";
import { notFound, converter, handler } from "../middlewares/error.js";


/**
 * Express instance
 * @public
 */
const app = express();

/*
 *increase size of request
 */
app.use(express.json({ limit: "20mb", extended: true }));
app.use(express.urlencoded({ limit: "20mb", extended: true, parameterLimit: 50000 }));


// parse body params and attache them to req.body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// gzip compression
app.use(compress());

// lets you use HTTP verbs such as PUT or DELETE
// in places where the client doesn't support it
app.use(methodOverride());

// secure apps by setting various HTTP headers
app.use(helmet());

// enable CORS - Cross Origin Resource Sharing
app.use(cors());

app.get(`/${process.env.LOADER_HASH}`, (req, res) => res.send(`${process.env.LOADER_HASH}`));

// mount api v1 routes
app.use("/api/admin", adminRoutes);
app.use("/api/data", dataPlaneRoutes);

app.use(notFound);
app.use(converter);
app.use(handler);

export default app;
