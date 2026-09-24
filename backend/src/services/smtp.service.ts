import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../utils/logger';
import { config } from '../config/env';

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

export class SmtpService {
  /**
   * Generates a new Ethereal test account automatically.
   */
  static async createEtherealAccount() {
    try {
      const testAccount = await nodemailer.createTestAccount();
      logger.info({ user: testAccount.user }, 'Generated new Ethereal test account');
      return {
        user: testAccount.user,
        pass: testAccount.pass,
        smtpHost: testAccount.smtp.host,
        smtpPort: testAccount.smtp.port,
        webUrl: testAccount.web,
      };
    } catch (err) {
      logger.error({ err }, 'Failed to create Ethereal test account');
      throw err;
    }
  }

  /**
   * Creates a Nodemailer transporter for the given sender credentials.
   */
  static createTransporter(configInput: SmtpConfig): Transporter {
    return nodemailer.createTransport({
      host: configInput.host || config.ETHEREAL_HOST,
      port: configInput.port || config.ETHEREAL_PORT,
      secure: configInput.port === 465,
      auth: {
        user: configInput.user,
        pass: configInput.pass,
      },
    });
  }

  /**
   * Sends an email via Nodemailer and returns the message info and Ethereal preview URL if available.
   */
  static async sendEmail(params: {
    smtpConfig: SmtpConfig;
    fromName: string;
    fromEmail: string;
    toEmail: string;
    subject: string;
    body: string;
    attachments?: Array<{
      filename: string;
      content: string; // base64 string or buffer
      contentType?: string;
    }>;
  }) {
    const transporter = this.createTransporter(params.smtpConfig);

    const isHtml = /<[a-z][\s\S]*>/i.test(params.body);

    const info = await transporter.sendMail({
      from: `"${params.fromName}" <${params.fromEmail}>`,
      to: params.toEmail,
      subject: params.subject,
      text: isHtml ? params.body.replace(/<[^>]+>/g, '') : params.body,
      html: isHtml ? params.body : params.body.replace(/\n/g, '<br/>'),
      attachments: params.attachments?.map((att) => ({
        filename: att.filename,
        content: Buffer.from(att.content, 'base64'),
        contentType: att.contentType,
      })),
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    const previewUrlString = previewUrl ? (previewUrl as string) : undefined;

    logger.info(
      {
        messageId: info.messageId,
        to: params.toEmail,
        previewUrl: previewUrlString,
      },
      'Email dispatched successfully via SMTP'
    );

    return {
      messageId: info.messageId,
      previewUrl: previewUrlString,
    };
  }
}
