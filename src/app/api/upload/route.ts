import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";

// Allowed file types
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png", 
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime", // MOV files
  "audio/webm", // For voice recordings
  "audio/mp4",
  "audio/mpeg",
];

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

// POST /api/upload - Upload a file to Vercel Blob
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Vercel Blob is configured (support both env var names)
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.blobs_READ_WRITE_TOKEN;
    if (!blobToken) {
      console.error("BLOB_READ_WRITE_TOKEN / blobs_READ_WRITE_TOKEN not configured");
      return NextResponse.json(
        { error: "File storage not configured. Please contact support." },
        { status: 503 }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Invalid form data" },
        { status: 400 }
      );
    }
    
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: images, videos, and audio.` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "bin";
    const filename = `${folder}/${session.user.id}/${Date.now()}.${ext}`;

    // Upload to Vercel Blob (pass token explicitly to support both env var names)
    try {
      const blob = await put(filename, file, {
        access: "public",
        addRandomSuffix: true,
        token: blobToken,
      });
      
      return NextResponse.json({ url: blob.url }, { status: 201 });
    } catch (uploadError) {
      console.error("Vercel Blob upload error:", uploadError);
      
      // Parse Vercel Blob specific errors
      const errMsg = uploadError instanceof Error ? uploadError.message : String(uploadError);
      
      if (errMsg.includes("Forbidden") || errMsg.includes("403")) {
        return NextResponse.json(
          { error: "Upload forbidden. Please check blob storage permissions or try a smaller file." },
          { status: 403 }
        );
      }
      
      if (errMsg.includes("PayloadTooLarge") || errMsg.includes("413")) {
        return NextResponse.json(
          { error: "File too large for upload. Please try a smaller file (under 4.5MB)." },
          { status: 413 }
        );
      }
      
      throw uploadError;
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    
    // Provide more specific error message
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    if (errorMessage.includes("BLOB_READ_WRITE_TOKEN") || errorMessage.includes("token")) {
      return NextResponse.json(
        { error: "File storage configuration error. Please contact support." },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to upload file. Please try again." },
      { status: 500 }
    );
  }
}
