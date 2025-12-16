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
      console.error("[UPLOAD-CLIENT] BLOB_READ_WRITE_TOKEN / blobs_READ_WRITE_TOKEN not configured");
      return NextResponse.json(
        { error: "File storage not configured." },
        { status: 503 }
      );
    }

    const jsonResponse = await handleUpload({
      body,
      request,
      // Pass token explicitly to fix the "Blob token" 500 error (P0 fix E)
      token: blobToken,
      onBeforeGenerateToken: async (pathname) => {
        // Validate user is authenticated
        const userSession = await auth();
        if (!userSession?.user?.id) {
          throw new Error("Unauthorized");
        }

        console.log(`[UPLOAD-CLIENT] Generating token for ${pathname} by user ${userSession.user.id}`);

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
        console.log("[UPLOAD-CLIENT] Upload completed:", blob.url, "by user:", tokenPayload);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("[UPLOAD-CLIENT] Client upload error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Provide helpful error messages
    if (errorMessage.includes("token") || errorMessage.includes("BLOB")) {
      return NextResponse.json(
        { error: "File storage configuration error. Please contact support." },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 400 }
    );
  }
}
