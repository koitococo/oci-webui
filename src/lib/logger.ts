import { createRequire } from "node:module";
import { LogLayer } from "loglayer";
import { PinoTransport } from "@loglayer/transport-pino";
import pino from "pino";

// Pino's caller-based resolution cannot resolve Next's bundled module identifiers.
const requireFromProject = createRequire(`${process.cwd()}/package.json`);

const pinoInstance = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(process.env.NODE_ENV === "development" && {
    transport: {
      target: requireFromProject.resolve("pino-pretty"),
      options: { colorize: true },
    },
  }),
});

export const log = new LogLayer({
  transport: new PinoTransport({ logger: pinoInstance }),
});
