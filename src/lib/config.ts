import { readFileSync } from "fs";
import type { RegistryConfig } from "./registry/types";

let cachedRegistries: RegistryConfig[] | null = null;

function loadRegistries(): RegistryConfig[] {
  if (cachedRegistries) return cachedRegistries;

  const configPath = process.env.REGISTRIES_CONFIG_PATH;

  if (configPath) {
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw) as { registries: RegistryConfig[] };
    cachedRegistries = parsed.registries;
    return cachedRegistries;
  }

  const url = process.env.REGISTRY_URL;
  if (!url) {
    throw new Error(
      "Either REGISTRY_URL or REGISTRIES_CONFIG_PATH must be set"
    );
  }

  cachedRegistries = [
    {
      name: process.env.REGISTRY_NAME ?? new URL(url).hostname,
      url: url.replace(/\/$/, ""),
    },
  ];
  return cachedRegistries;
}

export function getRegistries(): RegistryConfig[] {
  return loadRegistries();
}

export function getRegistry(name?: string): RegistryConfig {
  const registries = loadRegistries();

  if (name) {
    const found = registries.find((r) => r.name === name);
    if (!found) throw new Error(`Registry "${name}" not found`);
    return found;
  }

  return registries[0];
}
