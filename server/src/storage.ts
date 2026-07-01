import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

let r2Client: S3Client | null = null;

function hasR2Config(): boolean {
  return !!(
    R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_BUCKET &&
    R2_PUBLIC_BASE_URL
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
      url: `${R2_PUBLIC_BASE_URL!.replace(/\/$/, "")}/${key}`,
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
