import type { StorageMetadata } from "@/providers/storage/storage-provider";

export interface DownloadableMedia {
  access_type: "free" | "paid";
  status: string;
}

export interface DownloadableFile {
  file_name: string;
  mime_type: string;
  file_size: number | string;
  checksum: string;
}

export function canDownloadMedia(media: DownloadableMedia | null, hasEntitlement: boolean) {
  if (!media || !["published", "degraded"].includes(media.status)) return false;
  return media.access_type === "free" || hasEntitlement;
}

export function storedFileMatches(file: DownloadableFile, metadata: StorageMetadata) {
  return metadata.fileName === file.file_name
    && metadata.mimeType === file.mime_type
    && metadata.size === Number(file.file_size)
    && (!file.checksum || metadata.checksum === file.checksum);
}
