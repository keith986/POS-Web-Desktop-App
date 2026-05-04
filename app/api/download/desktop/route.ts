import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET() {
  const filePath = path.join(process.cwd(), "public/downloads/postore.exe");

  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { error: "File not found", path: filePath },
      { status: 404 }
    );
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Disposition": 'attachment; filename="postore.exe"',
      "Content-Type": "application/octet-stream",
      "Content-Length": fileBuffer.length.toString(),
    },
  });
}