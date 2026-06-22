import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.warn("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set - upload-receipt will fail");
}

const supabaseAdmin = createClient(SUPABASE_URL || "", SERVICE_ROLE_KEY || "", {
  // server side client
});

export const uploadReceipt = async (req: Request, res: Response) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const { data: base64, fileName, userId } = req.body as {
      data?: string;
      fileName?: string;
      userId?: string;
    };

    if (!base64) return res.status(400).json({ error: "Missing base64 data" });

    const filename = fileName || `receipt-${Date.now()}.pdf`;
    const folder = userId ? `receipts/${userId}` : `receipts/anonymous`;
    const path = `${folder}/${Date.now()}_${filename}`;

    // Convert base64 to Buffer
    const buffer = Buffer.from(base64, "base64");

    const { error: uploadError } = await supabaseAdmin.storage.from("receipts").upload(path, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return res.status(500).json({ error: "Upload failed" });
    }

    const expiry = 60 * 60; // 1 hour
    const { data: signed, error: signedErr } = await supabaseAdmin.storage.from("receipts").createSignedUrl(path, expiry);
    if (signedErr) {
      console.error("Signed URL error:", signedErr);
      return res.status(500).json({ error: "Could not create signed URL" });
    }

    return res.json({ url: signed.signedUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export default uploadReceipt;
