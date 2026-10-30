import "server-only";

import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";

/**
 * Files are stored outside the Next.js application directory.
 * Configure MEDIA_STORAGE_ROOT separately for each environment.
 */
export function getMediaRoot(): string {
  const configuredRoot = process.env.MEDIA_STORAGE_ROOT?.trim();
  const mediaRoot = path.resolve(
    configuredRoot || path.join(process.cwd(), "..", "innovex-media"),
  );
  const appRoot = path.resolve(process.cwd());
  const filesystemRoot = path.parse(mediaRoot).root;

  if (
    mediaRoot === appRoot ||
    mediaRoot.startsWith(`${appRoot}${path.sep}`) ||
    mediaRoot === filesystemRoot
  ) {
    throw new Error(
      "MEDIA_STORAGE_ROOT must be a dedicated directory outside the application folder and cannot be a filesystem root.",
    );
  }

  return mediaRoot;
}

function normalizeMediaKey(key: string): string {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalized.split("/");

  if (
    !normalized ||
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.includes("\0"),
    )
  ) {
    throw new Error("Invalid media path.");
  }

  return segments.join(path.sep);
}

export function getMediaFilePath(key: string): string {
  const root = path.resolve(getMediaRoot(), "public");
  const safeKey = normalizeMediaKey(key);
  const absolutePath = path.resolve(root, safeKey);

  if (!absolutePath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid media path.");
  }

  return absolutePath;
}

export function getMediaDirectory(key: string): string {
  const root = path.resolve(getMediaRoot(), "public");
  const safeKey = normalizeMediaKey(key);
  const absolutePath = path.resolve(root, safeKey);

  if (!absolutePath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid media directory.");
  }

  return absolutePath;
}

export function toMediaUrl(key: string): string {
  const safeKey = normalizeMediaKey(key).split(path.sep).join("/");
  return `/media/${safeKey}`;
}

export async function saveMediaFile(
  key: string,
  contents: Buffer,
): Promise<{ absolutePath: string; url: string }> {
  const absolutePath = getMediaFilePath(key);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  const { writeFile } = await import("node:fs/promises");
  await writeFile(absolutePath, contents, { flag: "wx" });

  return {
    absolutePath,
    url: toMediaUrl(key),
  };
}

/**
 * Delete files created by the external media store and legacy files still
 * located under public/. Legacy URLs are retained for existing records.
 */
export async function deleteStoredMediaFile(url: string | null | undefined) {
  const value = url?.trim();
  if (!value || !value.startsWith("/")) return;

  let absolutePath: string;

  if (value.startsWith("/media/")) {
    absolutePath = getMediaFilePath(value.slice("/media/".length));
  } else if (
    value.startsWith("/product-images/") ||
    value.startsWith("/category-images/") ||
    value.startsWith("/uploads/")
  ) {
    const publicRoot = path.resolve(process.cwd(), "public");
    const relative = value.slice(1).replace(/\\/g, "/");
    if (relative.split("/").some((part) => part === ".." || part === ".")) {
      return;
    }
    absolutePath = path.resolve(publicRoot, relative);
    if (!absolutePath.startsWith(`${publicRoot}${path.sep}`)) return;
  } else {
    return;
  }

  await unlink(absolutePath).catch((error: unknown) => {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    if (code !== "ENOENT") throw error;
  });
}

export function getStoredMediaAbsolutePath(url: string): string | null {
  if (url.startsWith("/media/")) {
    return getMediaFilePath(url.slice("/media/".length));
  }

  if (
    url.startsWith("/product-images/") ||
    url.startsWith("/category-images/") ||
    url.startsWith("/uploads/")
  ) {
    const publicRoot = path.resolve(process.cwd(), "public");
    const relative = url.slice(1).replace(/\\/g, "/");
    if (relative.split("/").some((part) => part === ".." || part === ".")) {
      return null;
    }
    const absolutePath = path.resolve(publicRoot, relative);
    return absolutePath.startsWith(`${publicRoot}${path.sep}`)
      ? absolutePath
      : null;
  }

  return null;
}
