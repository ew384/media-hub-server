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
    this.transporter = nodemailer.createTransporter({
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
}
