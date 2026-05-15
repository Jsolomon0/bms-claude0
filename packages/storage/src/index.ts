export interface ObjectStoragePutObjectInput {
  key: string;
  contentType: string;
  byteSize: number;
  originalFileName: string;
  checksum?: string;
}

export interface StoredObjectRecord {
  key: string;
  contentType: string;
  byteSize: number;
  originalFileName: string;
  checksum?: string;
  createdAt: string;
}

export interface ObjectStorageUrlInput {
  key: string;
  fileName?: string;
  expiresAt?: string;
}

export interface ObjectStorageAdapter {
  putObject(input: ObjectStoragePutObjectInput): Promise<StoredObjectRecord> | StoredObjectRecord;
  getObject(key: string): Promise<StoredObjectRecord | undefined> | StoredObjectRecord | undefined;
  buildPreviewUrl(input: ObjectStorageUrlInput): Promise<string> | string;
  buildDownloadUrl(input: ObjectStorageUrlInput): Promise<string> | string;
}

export interface MalwareScanResult {
  status: "clean" | "infected";
  engine?: string;
  reason?: string;
}

export interface MalwareScanHook {
  scanObject(object: StoredObjectRecord): Promise<MalwareScanResult> | MalwareScanResult;
}

export class MemoryObjectStorageAdapter implements ObjectStorageAdapter {
  private readonly objects = new Map<string, StoredObjectRecord>();
  private readonly now: () => Date;

  constructor(now?: () => Date) {
    this.now = now ?? (() => new Date());
  }

  putObject(input: ObjectStoragePutObjectInput): StoredObjectRecord {
    const object: StoredObjectRecord = {
      key: input.key,
      contentType: input.contentType,
      byteSize: input.byteSize,
      originalFileName: input.originalFileName,
      checksum: input.checksum,
      createdAt: this.now().toISOString()
    };
    this.objects.set(object.key, object);
    return object;
  }

  getObject(key: string): StoredObjectRecord | undefined {
    return this.objects.get(key);
  }

  buildPreviewUrl(input: ObjectStorageUrlInput): string {
    const expires = input.expiresAt ? `?expiresAt=${encodeURIComponent(input.expiresAt)}` : "";
    return `memory://preview/${input.key}${expires}`;
  }

  buildDownloadUrl(input: ObjectStorageUrlInput): string {
    const queryParts = [
      input.fileName ? `fileName=${encodeURIComponent(input.fileName)}` : "",
      input.expiresAt ? `expiresAt=${encodeURIComponent(input.expiresAt)}` : ""
    ].filter(Boolean);
    const suffix = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    return `memory://download/${input.key}${suffix}`;
  }
}

export class NoopMalwareScanHook implements MalwareScanHook {
  scanObject(): MalwareScanResult {
    return {
      status: "clean",
      engine: "noop"
    };
  }
}

export class MemoryMalwareScanHook implements MalwareScanHook {
  private readonly infectedObjectKeys: Set<string>;

  constructor(infectedObjectKeys?: readonly string[]) {
    this.infectedObjectKeys = new Set(infectedObjectKeys ?? []);
  }

  scanObject(object: StoredObjectRecord): MalwareScanResult {
    if (this.infectedObjectKeys.has(object.key)) {
      return {
        status: "infected",
        engine: "memory-scan",
        reason: "Object key marked as infected for test coverage."
      };
    }

    return {
      status: "clean",
      engine: "memory-scan"
    };
  }
}
