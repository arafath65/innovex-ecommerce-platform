import { readFile, stat } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getMediaFilePath } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const CONTENT_TYPES: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  avif: "image/avif",
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { path: segments } = await context.params;

    if (
      !segments.length ||
      segments.length > 12 ||
      segments.some(
        (segment) =>
          !segment ||
          segment === "." ||
          segment === ".." ||
          segment.includes("\\") ||
          segment.includes("\0"),
      )
    ) {
      return new NextResponse("Not found", { status: 404 });
    }

    const key = segments.join("/");
    const extension = segments.at(-1)?.split(".").pop()?.toLowerCase() ?? "";
    const contentType = CONTENT_TYPES[extension];

    if (!contentType) {
      return new NextResponse("Unsupported media type", { status: 415 });
    }

    const absolutePath = getMediaFilePath(key);
    const fileStat = await stat(absolutePath);

    if (!fileStat.isFile() || fileStat.size > 50 * 1024 * 1024) {
      return new NextResponse("Not found", { status: 404 });
    }

    const contents = await readFile(absolutePath);

    return new NextResponse(new Uint8Array(contents), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(contents.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
