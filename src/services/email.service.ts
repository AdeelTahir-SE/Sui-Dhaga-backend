import { env } from "../config/env.js";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const emailService = {
  async sendEmail(options: SendEmailOptions) {
    if (!env.EMAIL_PROVIDER_API_KEY) {
      console.log(`[Email Service Mock] To: ${options.to} | Subject: ${options.subject}`);
      return { id: "mock-email-id", status: "queued" };
    }

    // Production email integration (e.g. Resend / Brevo)
    return { id: "email-id", status: "sent" };
  },

  async sendWelcomeEmail(to: string, name: string) {
    return this.sendEmail({
      to,
      subject: "Welcome to Sui Dhaga!",
      html: `<h1>Welcome ${name}</h1><p>Thank you for joining Sui Dhaga.</p>`,
    });
  },

  async sendPasswordResetEmail(to: string, resetLink: string) {
    return this.sendEmail({
      to,
      subject: "Reset your Sui Dhaga Password",
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    });
  },
};
