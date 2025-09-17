import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    template: string;
    context: any;
  }) {
    const { to, subject, template, context } = options;
    
    try {
      const templatePath = path.join(process.cwd(), 'src', 'email', 'templates', `${template}.hbs`);
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      const compiledTemplate = handlebars.compile(templateContent);
      const html = compiledTemplate(context);

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@example.com',
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      throw error;
    }
  }

  // 为了兼容 payment.service.ts 中的调用，添加这些方法
  async sendPaymentSuccessEmail(to: string, data: {
    orderNo: string;
    planName: string;
    amount: number;
    paidAt: Date;
  }) {
    await this.sendEmail({
      to,
      subject: '支付成功通知',
      template: 'payment-success',
      context: data,
    });
  }

  async sendRefundNotificationEmail(to: string, data: {
    orderNo: string;
    refundAmount: number;
    refundReason?: string;
  }) {
    await this.sendEmail({
      to,
      subject: '退款通知',
      template: 'refund-notification',
      context: data,
    });
  }
}