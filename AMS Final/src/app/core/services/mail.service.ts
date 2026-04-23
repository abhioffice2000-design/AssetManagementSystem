import { Injectable } from '@angular/core';
import emailjs from '@emailjs/browser';
import { HeroService } from './hero.service';


/**
 * Generic, reusable email service powered by EmailJS.
 *
 * Usage:
 *   1. Welcome email  → mailService.sendWelcomeEmail(email, name, password)
 *   2. Any other email → mailService.sendEmail(templateId, { ...params })
 *
 * All outbound emails are routed through the configured EmailJS service.
 */
@Injectable({
  providedIn: 'root'
})
export class MailService {

  // ── EmailJS credentials ──────────────────────────────────────────────
  private readonly SERVICE_ID = 'service_y8s6jx8';
  private readonly PUBLIC_KEY = 'cMu81a_oTTdOsVM3x';

  // Pre-configured template IDs
  static readonly TEMPLATES = {
    WELCOME: 'template_776wpxc',
    // Create a new template on EmailJS for asset requests and put its ID here:
    ASSET_REQUEST: 'template_776wpxc',  // TODO: replace with dedicated template ID
  };

  constructor(private hs: HeroService) { }

  // ── Generic send ─────────────────────────────────────────────────────

  /**
   * Sends an email using any EmailJS template.
   *
   * @param templateId  – The EmailJS template ID to use
   * @param params      – Key-value pairs matching the template variables
   * @returns             Promise resolving on success
   */
  async sendEmail(templateId: string, params: Record<string, string>): Promise<void> {
    console.log('[MailService] Sending email with params:', JSON.stringify(params, null, 2));
    try {
      const response = await emailjs.send(
        this.SERVICE_ID,
        templateId,
        params,
        { publicKey: this.PUBLIC_KEY }
      );
      console.log('[MailService] ✅ Email sent successfully', response.status, response.text);
    } catch (error) {
      console.error('[MailService] ❌ Failed to send email', error);
      throw error;
    }
  }

  // ── Convenience wrappers ─────────────────────────────────────────────

  /**
   * Sends a welcome email with login credentials to a newly registered user via Cordys SOAP.
   */
  async sendWelcomeEmail(
    userEmail: string,
    userName: string,
    password: string
  ): Promise<void> {
    console.log('[MailService] sendWelcomeEmail (SOAP) starting for:', userEmail);

    const subject = 'Your Adnate Asset Management Account is Ready!';
    const loginUrl = window.location.origin + '/auth/login';
    
    const body = `
Dear ${userName},

Welcome to Adnate IT Solutions Asset Management System!

Your professional account has been successfully created. You can now log in to the portal to track your assets, submit new requests, and manage your allocations.

Below are your secure login credentials:
Login ID: ${userEmail}
Initial Password: ${password}

Access the Portal: ${loginUrl}

For security reasons, we recommend that you change your password after your first successful login.

If you have any questions or require assistance, please contact the IT Support Helpdesk.

Best Regards,
IT Support Team
Adnate IT Solutions
    `.trim();

    const welcomeSoap = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <WelcomeEmail_BPM xmlns="http://schemas.cordys.com/default">
      <toemail>sourabhsharma1003@gmail.com</toemail>
      <toname>${this.xmlEscape(userName)}</toname>
      <subject>${this.xmlEscape(subject)}</subject>
      <body>${this.xmlEscape(body)}</body>
    </WelcomeEmail_BPM>
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      await this.hs.ajax(null, null, {}, welcomeSoap);
      console.log('[MailService] ✅ Welcome Email SOAP sent successfully');
    } catch (error) {
      console.error('[MailService] ❌ Failed to send Welcome Email SOAP', error);
      // We don't throw here to avoid breaking the registration flow if mail server is down
    }
  }

  private xmlEscape(value: string): string {
    if (!value) return '';
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }


  /**
   * Sends a confirmation email to the employee who raised the asset request via Cordys SOAP.
   */
  async sendAssetRequestConfirmation(params: {
    employeeName: string;
    employeeEmail: string;
    assetType: string;
    category: string;
    requestId: string;
    justification: string;
    urgency?: string;
  }): Promise<void> {
    console.log('[MailService] sendAssetRequestConfirmation (SOAP) for:', params.requestId);

    const subject = `Asset Request Submitted: ${params.requestId}`;
    
    const body = `
Dear ${params.employeeName},

Your new asset request has been successfully submitted to the system.

Request Details:
--------------------------------------------
Request ID:    ${params.requestId}
Asset Type:    ${params.assetType}
Sub-Category:  ${params.category}
Urgency Level: ${params.urgency || 'Medium'}
Justification: ${params.justification}
--------------------------------------------

Your request has been routed for approval. You can track the real-time progress of this request on your dashboard.

Track Your Request: ${window.location.origin}/employee/my-requests

If you have any questions or did not authorize this request, please contact IT Support immediately.

Best Regards,
IT Support Team
Adnate IT Solutions
    `.trim();

    const requestSoap = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <WelcomeEmail_BPM xmlns="http://schemas.cordys.com/default">
      <toemail>sourabhsharma1003@gmail.com</toemail>
      <toname>${this.xmlEscape(params.employeeName)}</toname>
      <subject>${this.xmlEscape(subject)}</subject>
      <body>${this.xmlEscape(body)}</body>
    </WelcomeEmail_BPM>
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      await this.hs.ajax(null, null, {}, requestSoap);
      console.log('[MailService] ✅ Asset Request Confirmation SOAP sent');
    } catch (error) {
      console.error('[MailService] ❌ Failed to send Asset Request SOAP', error);
    }
  }


  /**
   * Sends a notification email to the team leader about a new asset request.
   */
  async sendAssetRequestToTeamLead(params: {
    teamLeadName: string;
    teamLeadEmail: string;
    employeeName: string;
    assetType: string;
    category: string;
    requestId: string;
    justification: string;
  }): Promise<void> {
    console.log('[MailService] sendAssetRequestToTeamLead:', params);

    const templateParams: Record<string, string> = {
      name: params.teamLeadName,
      userName: params.teamLeadName,
      to_email: 'sourabhsharma8151@gmail.com',
      email: `Request by: ${params.employeeName} | Asset: ${params.assetType} | Category: ${params.category}`,
      password: `Request ID: ${params.requestId} | Reason: ${params.justification}`,
      loginUrl: window.location.origin + '/team-lead/dashboard'
    };

    return this.sendEmail(MailService.TEMPLATES.ASSET_REQUEST, templateParams);
  }
}
