"use server";

import { redirect } from "next/navigation";

const DEFAULT_TO_EMAIL = "fmletax@outlook.com";

function clean(value: FormDataEntryValue | null, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function requestAppointmentAction(formData: FormData): Promise<never> {
  const name = clean(formData.get("name"), 120);
  const email = clean(formData.get("email"), 180);
  const phone = clean(formData.get("phone"), 60);
  const service = clean(formData.get("service"), 160);
  const date = clean(formData.get("date"), 20);
  const time = clean(formData.get("time"), 20);
  const notes = clean(formData.get("notes"), 2000);

  if (!name || !email || !phone || !service || !date || !time) {
    redirect("/appointments?error=validation");
  }

  const requested = new Date(`${date}T${time}:00`);
  if (Number.isNaN(requested.getTime()) || requested.getTime() <= Date.now()) {
    redirect("/appointments?error=date");
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.APPOINTMENT_FROM_EMAIL;
  const to = process.env.APPOINTMENT_TO_EMAIL || DEFAULT_TO_EMAIL;

  if (!apiKey || !from) {
    console.error("Appointment email is not configured. Missing RESEND_API_KEY or APPOINTMENT_FROM_EMAIL.");
    redirect("/appointments?error=config");
  }

  const safe = {
    name: escapeHtml(name),
    email: escapeHtml(email),
    phone: escapeHtml(phone),
    service: escapeHtml(service),
    date: escapeHtml(date),
    time: escapeHtml(time),
    notes: escapeHtml(notes || "No additional notes.")
  };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `FMLE appointment request — ${service} — ${date} ${time}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#102238">
          <h1 style="color:#163f67">New FMLE appointment request</h1>
          <p>A visitor submitted an appointment request from the FMLE website.</p>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;border-bottom:1px solid #ddd"><strong>Name</strong></td><td style="padding:8px;border-bottom:1px solid #ddd">${safe.name}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #ddd"><strong>Email</strong></td><td style="padding:8px;border-bottom:1px solid #ddd">${safe.email}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #ddd"><strong>Phone</strong></td><td style="padding:8px;border-bottom:1px solid #ddd">${safe.phone}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #ddd"><strong>Service</strong></td><td style="padding:8px;border-bottom:1px solid #ddd">${safe.service}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #ddd"><strong>Preferred date</strong></td><td style="padding:8px;border-bottom:1px solid #ddd">${safe.date}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #ddd"><strong>Preferred time</strong></td><td style="padding:8px;border-bottom:1px solid #ddd">${safe.time} ET</td></tr>
          </table>
          <h2 style="color:#163f67">Notes</h2>
          <p style="white-space:pre-wrap">${safe.notes}</p>
          <p><strong>Reply to this email</strong> to respond directly to ${safe.name}.</p>
        </div>
      `
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Appointment email failed", response.status, detail);
    redirect("/appointments?error=send");
  }

  redirect(`/appointments/success?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`);
}
