import { LogLayer } from "loglayer";
import { PinoTransport } from "@loglayer/transport-pino";
import pino from "pino";

const pinoInstance = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(process.env.NODE_ENV === "development" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  }),
});

export const log = new LogLayer({
  transport: new PinoTransport({ logger: pinoInstance }),
});
