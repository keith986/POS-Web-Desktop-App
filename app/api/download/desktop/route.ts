import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET() {
  const filePath = path.join(process.cwd(), "public/downloads/postore-setup.exe");
  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Disposition": 'attachment; filename="postore-setup.exe"',
      "Content-Type": "application/octet-stream",
    },
  });
}