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
