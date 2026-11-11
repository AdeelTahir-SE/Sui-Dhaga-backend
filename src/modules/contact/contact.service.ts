import { getDbClient } from "../../utils/resource-helper.js";
import { emailService } from "../../services/email.service.js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/app-error.js";
import { isMissingTableError } from "../../utils/supabase-error.js";

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const contactService = {
  async submitContactMessage(data: Record<string, unknown>, userId?: string) {
    const name = String(data.name || "").trim();
    const email = String(data.email || "").trim();
    const subject = String(data.subject || "").trim();
    const message = String(data.message || "").trim();
    const category = data.category ? String(data.category).trim() : "general";
    const phone = data.phone ? String(data.phone).trim() : null;

    const client = getDbClient();
    let savedRecord: any = null;

    const { data: created, error } = await client
      .from("contact_messages")
      .insert({
        user_id: userId || null,
        name,
        email,
        phone,
        category,
        subject,
        message,
        status: "new",
      })
      .select()
      .single();

    if (error && !isMissingTableError(error)) {
      throw new AppError(error.message, 400);
    }
    savedRecord = created || {
      id: `contact-${Date.now()}`,
      name,
      email,
      phone,
      category,
      subject,
      message,
      status: "received",
      created_at: new Date().toISOString(),
    };

    const supportRecipient = env.EMAIL_FROM || "support@suidhaga.pk";
    await emailService
      .sendEmail({
        to: supportRecipient,
        subject: `[Sui-Dhaga Contact] ${subject}`,
        html: `
          <h2>New Contact Inquiry</h2>
          <p><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
          <p><strong>Category:</strong> ${escapeHtml(category)}</p>
          ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ""}
          <hr />
          <p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>
        `,
        text: `From: ${name} (${email})\nCategory: ${category}\n\n${message}`,
      })
      .catch((err) => {
        console.warn("[ContactService] Failed to dispatch notification email:", err);
      });

    return savedRecord;
  },
};
