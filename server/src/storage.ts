import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL;

const AVATAR_DIR = path.resolve("data/uploads/avatars");
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const EXT_TO_CONTENT_TYPE = new Map(
  Array.from(ALLOWED_AVATAR_TYPES.entries()).map(([type, ext]) => [ext, type]),
);

let r2Client: S3Client | null = null;

function hasR2Config(): boolean {
  return !!(
    R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_BUCKET
  );
}

function getR2Client(): S3Client {
  r2Client ??= new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
  return r2Client;
}

function extToContentType(ext: string): string {
  return EXT_TO_CONTENT_TYPE.get(ext.toLowerCase()) ?? "application/octet-stream";
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (!body) return Buffer.from([]);
  if (body instanceof Buffer) return body;
  if (ArrayBuffer.isView(body)) return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (typeof (body as any).arrayBuffer === "function") {
    return Buffer.from(await (body as any).arrayBuffer());
  }
  if (typeof (body as any)[Symbol.asyncIterator] === "function") {
    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<unknown>) {
      if (typeof chunk === "string") chunks.push(Buffer.from(chunk));
      else if (chunk instanceof Uint8Array) chunks.push(Buffer.from(chunk));
      else if (chunk instanceof Buffer) chunks.push(chunk);
      else chunks.push(Buffer.from(String(chunk)));
    }
    return Buffer.concat(chunks);
  }
  throw new Error("Unsupported body type for avatar fetch.");
}

export async function fetchAvatarImage(
  key: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!key || key.includes("..") || !key.startsWith("avatars/")) return null;

  const localPath = path.resolve("data/uploads", key);
  try {
    const buffer = await readFile(localPath);
    const ext = path.extname(localPath).slice(1);
    return { buffer, contentType: extToContentType(ext) };
  } catch {
    // ignore local fallback and try R2 if configured
  }

  if (!hasR2Config()) return null;

  try {
    const response = await getR2Client().send(
      new GetObjectCommand({
        Bucket: R2_BUCKET!,
        Key: key,
      }),
    );
    const contentType = String(response.ContentType ?? extToContentType(path.extname(key).slice(1)));
    const buffer = await streamToBuffer(response.Body);
    return { buffer, contentType };
  } catch {
    return null;
  }
}

export function validateAvatarUpload(
  contentType: string,
  size: number,
): { ext: string } | { error: string } {
  const ext = ALLOWED_AVATAR_TYPES.get(contentType.toLowerCase());
  if (!ext) return { error: "Envie uma imagem PNG, JPG ou WEBP." };
  if (size <= 0) return { error: "Imagem vazia." };
  if (size > MAX_AVATAR_BYTES) return { error: "Imagem muito grande. Limite: 2 MB." };
  return { ext };
}

export async function saveAvatarImage({
  userId,
  bytes,
  contentType,
  ext,
}: {
  userId: string;
  bytes: Buffer;
  contentType: string;
  ext: string;
}): Promise<{ key: string; url: string; provider: "r2" | "local" }> {
  const key = `avatars/${userId}/${Date.now()}-${randomUUID()}.${ext}`;

  if (hasR2Config()) {
    await getR2Client().send(
      new PutObjectCommand({
        Bucket: R2_BUCKET!,
        Key: key,
        Body: bytes,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return {
      key,
      url: `/avatar/${userId}/${encodeURIComponent(key.split("/").pop() ?? "")}`,
      provider: "r2",
    };
  }

  await mkdir(path.join(AVATAR_DIR, userId), { recursive: true });
  await writeFile(path.resolve("data/uploads", key), bytes);
  return { key, url: `/uploads/${key}`, provider: "local" };
}

export function localUploadsDir(): string {
  return path.resolve("data/uploads");
}
