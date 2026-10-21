/**
 * Sui Dhaga: Test script to upload an image to Express POST /measurements
 * 
 * Usage:
 *   npx tsx src/modules/measurements/upload-and-infer.ts path/to/photo.jpg 175 female [optionalAuthToken]
 */

import fs from "fs";
import path from "path";

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log("Usage: npx tsx src/modules/measurements/upload-and-infer.ts <image_path> <height_cm> [gender] [jwt_token]");
    console.log("Example: npx tsx src/modules/measurements/upload-and-infer.ts ./sample.jpg 175 female");
    process.exit(1);
  }

  const [imagePath, heightStr, gender = "female", authToken = ""] = args;
  const heightCm = parseFloat(heightStr);

  if (!fs.existsSync(imagePath)) {
    console.error(`Error: File does not exist at ${imagePath}`);
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(imagePath);
  const fileName = path.basename(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  console.log(`\n======================================================`);
  console.log(`  SUI DHAGA: UPLOADING PHOTO TO MEASUREMENT ENDPOINT  `);
  console.log(`======================================================`);
  console.log(`Image:    ${fileName} (${(fileBuffer.length / 1024).toFixed(1)} KB)`);
  console.log(`Height:   ${heightCm} cm`);
  console.log(`Gender:   ${gender}`);
  console.log(`------------------------------------------------------`);

  // Target either Express API (:4000) or direct Python service (:8000)
  const apiUrl = process.env.API_URL || "http://localhost:4000/api/v1/measurements";
  console.log(`Target URL: ${apiUrl}`);

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
  formData.append("image", blob, fileName);
  formData.append("heightCm", heightCm.toString());
  formData.append("gender", gender);
  formData.append("unit", "cm");
  formData.append("title", "AI Tailor Test Profile");

  const headers: Record<string, string> = {};
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: formData,
    });

    const json = await res.json() as any;

    if (!res.ok) {
      console.error(`\n[API Error ${res.status}]:`, json);
      process.exit(1);
    }

    console.log(`\n[SUCCESS] Response received from server:`);
    console.log(JSON.stringify(json, null, 2));

    const data = json.data || json;
    console.log(`\n------------------------------------------------------`);
    console.log(`Profile ID:    ${data.id || "N/A"}`);
    console.log(`Chest:         ${data.chest} cm`);
    console.log(`Waist:         ${data.waist} cm`);
    console.log(`Hips:          ${data.hips} cm`);
    console.log(`Shoulder:      ${data.shoulder} cm`);
    console.log(`Sleeve Length: ${data.sleeveLength} cm`);
    console.log(`Inseam:        ${data.inseam} cm`);
    console.log(`Neck:          ${data.neck} cm`);
    console.log(`Notes:         ${data.notes}`);
    console.log(`======================================================\n`);
  } catch (err: any) {
    console.error(`\n[Network Error]: Could not connect to ${apiUrl}:`, err.message);
  }
}

main();
