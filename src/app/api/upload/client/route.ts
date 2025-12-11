import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

// Allowed file types
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png", 
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov files
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
];

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

// POST /api/upload/client - Handle client-side uploads for large files (videos)
// This bypasses the serverless function body limit by using Vercel Blob's client upload
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.blobs_READ_WRITE_TOKEN;
    if (!blobToken) {
      return NextResponse.json(
        { error: "File storage not configured." },
        { status: 503 }
      );
    }

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Validate user is authenticated
        const userSession = await auth();
        if (!userSession?.user?.id) {
          throw new Error("Unauthorized");
        }

        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_SIZE,
          tokenPayload: JSON.stringify({
            userId: userSession.user.id,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Called after the upload is completed
        // Could be used for logging or updating database
        console.log("Upload completed:", blob.url, "by user:", tokenPayload);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Client upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 400 }
    );
  }
}
