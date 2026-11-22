import nodemailer, { Transporter } from "nodemailer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

let transporter: Transporter | null = null;

export function getSMTPConfig() {
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  return {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER || "",
      pass: (process.env.SMTP_PASS || "").replace(/\s+/g, " ").trim(),
    },
    from: process.env.SMTP_FROM || process.env.SMTP_USER || "",
    fromName: process.env.SMTP_FROM_NAME || "Anas Labzar",
  };
}

export function createTransporter(): Transporter {
  const config = getSMTPConfig();
  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.auth.user,
      pass: config.auth.pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  return transporter;
}

export async function verifySMTP(): Promise<{ success: boolean; message: string }> {
  try {
    const transport = createTransporter();
    await transport.verify();
    console.log("[SMTP] Gmail SMTP connection verified successfully");
    return { success: true, message: "Connexion SMTP Gmail établie et authentifiée avec succès." };
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[SMTP] Connection verification failed:", msg);
    return { success: false, message: msg };
  }
}

export interface SendEmailOptions {
  to: string;
  toName: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  attachmentPath?: string;
  attachmentFilename?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(
  to: string,
  toName: string,
  subject: string,
  htmlBody: string,
  textBody?: string,
  attachmentPath?: string,
  attachmentFilename?: string
): Promise<SendEmailResult> {
  try {
    const transport = createTransporter();
    const config = getSMTPConfig();

    if (!config.auth.user || !config.auth.pass) {
      return { success: false, error: "SMTP credentials not configured in .env" };
    }

    const attachments: Array<{ filename: string; path: string }> = [];

    // Attach CV PDF if provided and exists
    if (attachmentPath && fs.existsSync(attachmentPath)) {
      attachments.push({
        filename: attachmentFilename || path.basename(attachmentPath),
        path: attachmentPath,
      });
    } else {
      // Fallback: check default CV PDF
      const defaultFr = path.resolve(process.cwd(), "public/pdf/cv Anas Labzar - Fr (1).pdf");
      if (fs.existsSync(defaultFr)) {
        attachments.push({
          filename: "CV_Anas_Labzar.pdf",
          path: defaultFr,
        });
      }
    }

    const mailOptions: any = {
      from: `"${config.fromName}" <${config.from}>`,
      to: toName ? `"${toName}" <${to}>` : to,
      subject,
      text: textBody || htmlBody.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      html: htmlBody,
      attachments: attachments.length > 0 ? attachments : undefined,
      headers: {
        "X-Mailer": "Gmail Client",
        "Importance": "normal",
      },
    };

    const info = await transport.sendMail(mailOptions);
    console.log(`[SMTP] Application email successfully sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[SMTP] Failed to send email to ${to}:`, msg);
    return { success: false, error: msg };
  }
}

/**
 * Human-like Clean Email Formatting (Anti-AI & Anti-Spam Detector)
 * No robotic gradient headers, no bot disclaimers, authentic executive styling.
 */
export function emailToHTML(subject: string, body: string, signature?: string): string {
  const formattedBody = body
    .split("\n\n")
    .map((p) => `<p style="margin: 0 0 14px 0; line-height: 1.6; color: #1f2937; font-size: 15px;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  const sigBlock = signature
    ? `<div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #e5e7eb; color: #374151; font-size: 14px; line-height: 1.5;">${signature}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 20px 10px;">
  <div style="max-width: 620px; margin: 0 auto; background: #ffffff;">
    ${formattedBody}
    ${sigBlock}
    <div style="margin-top: 20px; font-size: 12px; color: #6b7280; font-style: italic;">
      Pièce jointe : CV mis à jour (PDF)
    </div>
  </div>
</body>
</html>`;
}
