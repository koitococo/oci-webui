export const OCI_MEDIA_TYPES = {
  MANIFEST_V2: "application/vnd.docker.distribution.manifest.v2+json",
  MANIFEST_LIST_V2:
    "application/vnd.docker.distribution.manifest.list.v2+json",
  OCI_MANIFEST: "application/vnd.oci.image.manifest.v1+json",
  OCI_INDEX: "application/vnd.oci.image.index.v1+json",
  OCI_IMAGE_CONFIG: "application/vnd.oci.image.config.v1+json",
  DOCKER_IMAGE_CONFIG:
    "application/vnd.docker.container.image.v1+json",
  OCI_LAYER: "application/vnd.oci.image.layer.v1.tar+gzip",
  DOCKER_LAYER:
    "application/vnd.docker.image.rootfs.diff.tar.gzip",
} as const;

export const OCI_ACCEPT_HEADERS = [
  OCI_MEDIA_TYPES.OCI_MANIFEST,
  OCI_MEDIA_TYPES.OCI_INDEX,
  OCI_MEDIA_TYPES.MANIFEST_V2,
  OCI_MEDIA_TYPES.MANIFEST_LIST_V2,
].join(", ");
