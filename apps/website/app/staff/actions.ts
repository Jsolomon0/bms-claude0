"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getFmleSupabaseConfig } from "../../lib/customer-auth.ts";
import { callFmleRpc, isFmleStaff } from "../../lib/staff-data.ts";

function textValue(formData: FormData, name: string, max = 500) {
  return String(formData.get(name) ?? "").trim().slice(0, max);
}

function requireValue(formData: FormData, name: string, max = 500) {
  const value = textValue(formData, name, max);
  if (!value) throw new Error(`${name}_required`);
  return value;
}

function numberValue(formData: FormData, name: string, fallback = 0) {
  const value = Number(String(formData.get(name) ?? ""));
  return Number.isFinite(value) ? value : fallback;
}

function done(action: string): never {
  revalidatePath("/staff");
  revalidatePath("/account");
  redirect(`/staff?success=${encodeURIComponent(action)}`);
}

function failed(action: string, error: unknown): never {
  console.error(`FMLE staff action failed: ${action}`, error);
  redirect(`/staff?error=${encodeURIComponent(action)}`);
}

export async function updateTaxReturnAction(formData: FormData): Promise<never> {
  try {
    await callFmleRpc("fmle_staff_upsert_tax_return", {
      p_customer_id: requireValue(formData, "customerId", 80),
      p_tax_year: Math.trunc(numberValue(formData, "taxYear")),
      p_return_type: requireValue(formData, "returnType", 80),
      p_status: requireValue(formData, "status", 80),
      p_status_message: textValue(formData, "statusMessage", 1500) || null
    });
    done("tax-status");
  } catch (error) {
    failed("tax-status", error);
  }
}

export async function createInvoiceAction(formData: FormData): Promise<never> {
  try {
    await callFmleRpc("fmle_staff_create_invoice", {
      p_customer_id: requireValue(formData, "customerId", 80),
      p_description: requireValue(formData, "description", 500),
      p_amount: numberValue(formData, "amount"),
      p_due_at: requireValue(formData, "dueAt", 20),
      p_tax_amount: numberValue(formData, "taxAmount", 0)
    });
    done("invoice");
  } catch (error) {
    failed("invoice", error);
  }
}

export async function recordPaymentAction(formData: FormData): Promise<never> {
  try {
    await callFmleRpc("fmle_staff_record_payment", {
      p_customer_id: requireValue(formData, "customerId", 80),
      p_amount: numberValue(formData, "amount"),
      p_payment_method: requireValue(formData, "paymentMethod", 30),
      p_invoice_id: textValue(formData, "invoiceId", 80) || null,
      p_reference: textValue(formData, "reference", 200) || null
    });
    done("payment");
  } catch (error) {
    failed("payment", error);
  }
}

export async function sendCustomerMessageAction(formData: FormData): Promise<never> {
  try {
    await callFmleRpc("fmle_staff_send_message", {
      p_customer_id: requireValue(formData, "customerId", 80),
      p_subject: textValue(formData, "subject", 200),
      p_body: requireValue(formData, "body", 5000),
      p_thread_id: textValue(formData, "threadId", 80) || null
    });
    done("message");
  } catch (error) {
    failed("message", error);
  }
}

export async function uploadCustomerDocumentAction(formData: FormData): Promise<never> {
  let uploadedPath: string | null = null;
  try {
    if (!(await isFmleStaff())) throw new Error("staff_access_denied");

    const customerId = requireValue(formData, "customerId", 80);
    const title = requireValue(formData, "title", 200);
    const category = requireValue(formData, "category", 100);
    const file = formData.get("file");

    if (!(file instanceof File) || file.size <= 0) throw new Error("file_required");
    if (file.size > 20 * 1024 * 1024) throw new Error("file_too_large");

    const allowed = new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ]);
    if (!allowed.has(file.type)) throw new Error("unsupported_file_type");

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.FMLE_DOCUMENT_BUCKET || "customer-documents";
    const { url } = getFmleSupabaseConfig();
    if (!serviceRoleKey) throw new Error("storage_not_configured");

    const bytes = Buffer.from(await file.arrayBuffer());
    const checksum = createHash("sha256").update(bytes).digest("hex");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-140);
    uploadedPath = `${customerId}/${new Date().getUTCFullYear()}/${randomUUID()}-${safeName}`;

    const uploadResponse = await fetch(
      `${url}/storage/v1/object/${encodeURIComponent(bucket)}/${uploadedPath.split("/").map(encodeURIComponent).join("/")}`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": file.type,
          "x-upsert": "false"
        },
        body: bytes
      }
    );

    if (!uploadResponse.ok) {
      throw new Error(`storage_upload_failed:${await uploadResponse.text()}`);
    }

    await callFmleRpc("fmle_staff_create_document_record", {
      p_customer_id: customerId,
      p_title: title,
      p_category: category,
      p_file_name: file.name,
      p_content_type: file.type,
      p_storage_key: uploadedPath,
      p_checksum_sha256: checksum,
      p_byte_size: file.size
    });

    done("document");
  } catch (error) {
    if (uploadedPath && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { url } = getFmleSupabaseConfig();
        const bucket = process.env.FMLE_DOCUMENT_BUCKET || "customer-documents";
        await fetch(
          `${url}/storage/v1/object/${encodeURIComponent(bucket)}/${uploadedPath.split("/").map(encodeURIComponent).join("/")}`,
          {
            method: "DELETE",
            headers: {
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            }
          }
        );
      } catch {
        // Best-effort orphan cleanup only.
      }
    }
    failed("document", error);
  }
}
