import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    const resendApiKey = this.configService
      .get<string>('RESEND_API_KEY')
      ?.trim();

    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL')?.trim() ||
      'onboarding@resend.dev';

    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL')?.trim() ||
      'http://localhost:5173';

    if (!resendApiKey) {
      throw new Error(
        'RESEND_API_KEY must be defined in environment variables.',
      );
    }

    this.resend = new Resend(resendApiKey);
  }

  async verifyConnection(): Promise<boolean> {
    console.log('✅ Resend configuration loaded successfully.');

    return true;
  }

  // SEND VERIFICATION EMAIL

  async sendVerificationEmail(
    email: string,
    fullName: string,
    token: string,
  ): Promise<void> {
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

    try {
      const { data, error } = await this.resend.emails.send({
        from: `"YGS Documentation Management System" <${this.fromEmail}>`,
        to: email,
        subject: 'Verify your YGS account',

        text: `
Hello ${fullName},

Thank you for registering for the YGS Documentation Management System.

Please verify your email address by opening the following link:

${verificationUrl}

This verification link will expire in 24 hours.

If you did not create this account, you can safely ignore this email.

Regards,
YGS Documentation Management System
        `.trim(),

        html: `
          <div
            style="
              font-family: Arial, sans-serif;
              line-height: 1.6;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            "
          >
            <h2>Verify your YGS account</h2>

            <p>Hello ${fullName},</p>

            <p>
              Thank you for registering for the
              <strong>YGS Documentation Management System</strong>.
            </p>

            <p>
              Please click the button below to verify your email address.
            </p>

            <p>
              <a
                href="${verificationUrl}"
                style="
                  display: inline-block;
                  padding: 12px 20px;
                  background-color: #2563eb;
                  color: white;
                  text-decoration: none;
                  border-radius: 6px;
                  font-weight: bold;
                "
              >
                Verify Email
              </a>
            </p>

            <p>Or copy and open this link:</p>

            <p
              style="
                word-break: break-all;
                color: #2563eb;
              "
            >
              ${verificationUrl}
            </p>

            <p>
              This verification link will expire in
              <strong>24 hours</strong>.
            </p>

            <p>
              If you did not create this account, you can safely ignore this
              email.
            </p>

            <p>
              Regards,<br />
              <strong>YGS Documentation Management System</strong>
            </p>
          </div>
        `,
      });

      if (error) {
        console.error(
          `❌ Resend failed to send verification email to ${email}`,
        );
        console.error(error);

        throw new InternalServerErrorException(
          'Unable to send verification email.',
        );
      }

      console.log(`📧 Resend email ID: ${data?.id ?? 'unknown'}`);
      console.log(`✅ Verification email sent successfully to ${email}`);
    } catch (error) {
      console.error(`❌ Failed to send verification email to ${email}`);
      console.error(error);

      throw new InternalServerErrorException(
        'Unable to send verification email.',
      );
    }
  }

  // SEND PASSWORD RESET EMAIL

  async sendPasswordResetEmail(
    email: string,
    fullName: string,
    token: string,
  ): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

    try {
      const { data, error } = await this.resend.emails.send({
        from: `"YGS Documentation Management System" <${this.fromEmail}>`,
        to: email,
        subject: 'Reset your YGS account password',

        text: `
Hello ${fullName},

We received a request to reset your YGS Documentation Management System password.

Please open the following link to create a new password:

${resetUrl}

This password reset link will expire in 1 hour.

If you did not request a password reset, you can safely ignore this email.

Regards,
YGS Documentation Management System
        `.trim(),

        html: `
          <div
            style="
              font-family: Arial, sans-serif;
              line-height: 1.6;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            "
          >
            <h2>Reset your password</h2>

            <p>Hello ${fullName},</p>

            <p>
              We received a request to reset your
              <strong>YGS Documentation Management System</strong>
              password.
            </p>

            <p>
              Click the button below to create a new password.
            </p>

            <p>
              <a
                href="${resetUrl}"
                style="
                  display: inline-block;
                  padding: 12px 20px;
                  background-color: #2563eb;
                  color: white;
                  text-decoration: none;
                  border-radius: 6px;
                  font-weight: bold;
                "
              >
                Reset Password
              </a>
            </p>

            <p>Or copy and open this link:</p>

            <p
              style="
                word-break: break-all;
                color: #2563eb;
              "
            >
              ${resetUrl}
            </p>

            <p>
              This password reset link will expire in
              <strong>1 hour</strong>.
            </p>

            <p>
              If you did not request a password reset,
              you can safely ignore this email.
            </p>

            <p>
              Regards,<br />
              <strong>YGS Documentation Management System</strong>
            </p>
          </div>
        `,
      });

      if (error) {
        console.error(
          `❌ Resend failed to send password reset email to ${email}`,
        );
        console.error(error);

        throw new InternalServerErrorException(
          'Unable to send password reset email.',
        );
      }

      console.log(`📧 Resend email ID: ${data?.id ?? 'unknown'}`);
      console.log(`✅ Password reset email sent successfully to ${email}`);
    } catch (error) {
      console.error(`❌ Failed to send password reset email to ${email}`);
      console.error(error);

      throw new InternalServerErrorException(
        'Unable to send password reset email.',
      );
    }
  }
}
