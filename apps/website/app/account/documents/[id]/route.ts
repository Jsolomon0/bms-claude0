import { NextResponse } from "next/server";
import { getCustomerDocumentDownload } from "../../../../lib/portal-data.ts";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const document = await getCustomerDocumentDownload(id);

  if (!document) {
    return new NextResponse("Document not found or access denied.", { status: 404 });
  }

  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.FMLE_DOCUMENT_BUCKET || "customer-documents";

  if (!url || !serviceRoleKey) {
    return new NextResponse("Secure document downloads are not configured yet.", { status: 503 });
  }

  const signResponse = await fetch(
    `${url}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${document.storageKey.split("/").map(encodeURIComponent).join("/")}`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ expiresIn: 60 })
    }
  );

  if (!signResponse.ok) {
    console.error("FMLE document signing failed", signResponse.status, await signResponse.text());
    return new NextResponse("Unable to prepare this download.", { status: 502 });
  }

  const payload = (await signResponse.json()) as { signedURL?: string; signedUrl?: string };
  const signedPath = payload.signedURL || payload.signedUrl;
  if (!signedPath) {
    return new NextResponse("Unable to prepare this download.", { status: 502 });
  }

  const signedUrl = signedPath.startsWith("http") ? signedPath : `${url}/storage/v1${signedPath}`;
  return NextResponse.redirect(signedUrl);
}
