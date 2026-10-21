import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

function key() {
  const secret = process.env.SCREENING_ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Set SCREENING_ENCRYPTION_KEY (at least 32 characters) before storing screening data");
  return scryptSync(secret, "skillbridge-screening-v1", 32);
}
export function sealScreening(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const bytes = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), bytes.toString("base64")].join(".");
}
export function openScreening<T>(value: string): T {
  const [version, iv, tag, bytes] = value.split(".");
  if (version !== "v1") throw new Error("Unsupported screening payload");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(bytes, "base64")), decipher.final()]).toString("utf8"));
}
