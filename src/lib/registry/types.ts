export interface OCIDescriptor {
  mediaType: string;
  digest: string;
  size: number;
  annotations?: Record<string, string>;
  urls?: string[];
}

export interface OCIManifest {
  schemaVersion: number;
  mediaType: string;
  config: OCIDescriptor;
  layers: OCIDescriptor[];
  annotations?: Record<string, string>;
}

export interface OCIIndex {
  schemaVersion: number;
  mediaType: string;
  manifests: Array<
    OCIDescriptor & {
      platform?: {
        architecture: string;
        os: string;
        variant?: string;
      };
    }
  >;
  annotations?: Record<string, string>;
}

export interface OCITagList {
  name: string;
  tags: string[];
}

export interface OCICatalog {
  repositories: string[];
}

export interface RegistryConfig {
  name: string;
  url: string;
}

export interface AuthToken {
  token: string;
  expiresAt?: number;
}

export type AuthType = "bearer" | "basic" | "dockerhub" | "none";
export interface OCIImageConfigRuntime {
  [key: string]: unknown;
  User?: string;
  ExposedPorts?: Record<string, Record<string, never>>;
  Env?: string[];
  Entrypoint?: string[];
  Cmd?: string[];
  Volumes?: Record<string, Record<string, never>>;
  WorkingDir?: string;
  Labels?: Record<string, string>;
  StopSignal?: string;
  ArgsEscaped?: boolean;
}

export interface OCIImageConfigRootFS {
  type: string;
  diff_ids: string[];
}

export interface OCIImageConfigHistory {
  [key: string]: unknown;
  created?: string;
  created_by?: string;
  empty_layer?: boolean;
  comment?: string;
  author?: string;
}

export interface OCIImageConfig {
  [key: string]: unknown;
  created?: string;
  author?: string;
  architecture: string;
  os: string;
  variant?: string;
  config: OCIImageConfigRuntime;
  rootfs: OCIImageConfigRootFS;
  history?: OCIImageConfigHistory[];
}

export interface ManifestResponse {
  manifest: OCIManifest | OCIIndex;
  digest: string;
  contentType: string;
}

export interface ImageConfigResponse {
  config: OCIImageConfig;
  contentType: string;
}
