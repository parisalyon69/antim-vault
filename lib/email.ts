import { Resend } from 'resend'
import { ADMIN_EMAIL, FROM_EMAIL, WHATSAPP_DISPLAY } from '@/lib/constants'

// Lazy-initialize so the constructor doesn't throw at build time when the key is absent
function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vault.antim.services'

// ─── HTML base template ───────────────────────────────────────────────────────

function baseHtml({
  bodyContent,
  previewText = '',
}: {
  bodyContent: string
  previewText?: string
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Antim</title>
  ${previewText ? `<meta name="description" content="${previewText}">` : ''}
</head>
<body style="margin:0;padding:0;background-color:#F7F4ED;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F7F4ED;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background-color:#4F6F52;padding:24px 32px;border-radius:8px 8px 0 0;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:-0.3px;">Antim</span>
            </td>
          </tr>

          <!-- Body card -->
          <tr>
            <td style="background-color:#ffffff;padding:36px 32px;border-radius:0 0 8px 8px;border:1px solid #e8e3da;border-top:none;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 8px;text-align:center;">
              <p style="font-size:12px;color:#9ca3af;margin:0 0 4px;line-height:1.5;">
                You are receiving this because you created an Antim vault.
              </p>
              <p style="font-size:12px;color:#9ca3af;margin:0;">
                <a href="https://antim.services" style="color:#9ca3af;text-decoration:underline;">antim.services</a>
                &nbsp;&middot;&nbsp;
                <a href="mailto:${ADMIN_EMAIL}" style="color:#9ca3af;text-decoration:underline;">${ADMIN_EMAIL}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background-color:#B8722C;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:6px;font-size:14px;font-weight:600;font-family:Arial,Helvetica,sans-serif;letter-spacing:0.1px;">${label}</a>`
}

function h2(text: string): string {
  return `<h2 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a1a1a;margin:0 0 16px;font-weight:normal;line-height:1.3;">${text}</h2>`
}

function p(text: string, opts: { muted?: boolean; small?: boolean } = {}): string {
  const color = opts.muted ? '#6b7280' : '#374151'
  const size = opts.small ? '13px' : '15px'
  return `<p style="font-size:${size};line-height:1.65;color:${color};margin:0 0 16px;">${text}</p>`
}

function divider(): string {
  return `<div style="height:1px;background-color:#f0ece4;margin:24px 0;"></div>`
}

// ─── Welcome email ────────────────────────────────────────────────────────────
// Sent after vault is activated (post-payment webhook)

export async function sendWelcomeEmail(to: string, firstName: string) {
  const subject = 'Your Antim vault is ready'
  const html = baseHtml({
    previewText: `Your vault is set up, ${firstName}. Here is where to start.`,
    bodyContent: `
      ${h2(`Hi ${firstName}, your vault is ready.`)}
      ${p('You have just done something most people never do. Your family will thank you for it.')}
      ${p('Your Antim vault is where they will find everything they need when the time comes. Accounts, documents, your personal letter. It all lives here, safely.')}
      ${divider()}
      ${p('<strong style="color:#1a1a1a;">Three things to do first:</strong>')}
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;width:100%;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0ece4;">
            <span style="font-size:15px;color:#4F6F52;font-weight:bold;">1</span>
            &nbsp;&nbsp;<span style="font-size:15px;color:#374151;">Add your accounts and assets</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f0ece4;">
            <span style="font-size:15px;color:#4F6F52;font-weight:bold;">2</span>
            &nbsp;&nbsp;<span style="font-size:15px;color:#374151;">Name a nominee who will receive access</span>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;">
            <span style="font-size:15px;color:#4F6F52;font-weight:bold;">3</span>
            &nbsp;&nbsp;<span style="font-size:15px;color:#374151;">Write a personal letter to the people you love</span>
          </td>
        </tr>
      </table>
      <div style="margin:28px 0;">
        ${ctaButton('Open my vault', `${APP_URL}/vault`)}
      </div>
      ${p(`Questions? Reply to this email or WhatsApp us at ${WHATSAPP_DISPLAY}.`, { muted: true })}
      ${p('The Antim team', { muted: true })}
    `,
  })
  return getResend().emails.send({ from: FROM_EMAIL, replyTo: ADMIN_EMAIL, to, subject, html })
}

// ─── Payment failed — vault owner alert ──────────────────────────────────────
// Sent to the vault owner when their subscription payment fails

export async function sendPaymentFailedEmail(to: string, firstName: string) {
  const subject = "Your Antim vault payment didn't go through"
  const html = baseHtml({
    previewText: 'Your payment did not go through. Update your payment method to keep your vault active.',
    bodyContent: `
      ${h2(`Hi ${firstName}, there was a payment issue.`)}
      ${p('We were not able to process your Antim vault subscription payment.')}
      ${p('Your vault remains accessible for now. To make sure nothing is interrupted, please update your payment method as soon as you can.')}
      <div style="margin:28px 0;">
        ${ctaButton('Update payment method', `${APP_URL}/vault/settings`)}
      </div>
      ${p('In your settings, click "Manage subscription" to update your card details.', { muted: true })}
      ${p(`Questions? Reply to this email or WhatsApp us at ${WHATSAPP_DISPLAY}.`, { muted: true })}
      ${p('The Antim team', { muted: true })}
    `,
  })
  return getResend().emails.send({ from: FROM_EMAIL, replyTo: ADMIN_EMAIL, to, subject, html })
}

// ─── Password reset ───────────────────────────────────────────────────────────
// Sent when a user requests a password reset. The resetLink is the full
// Supabase action URL generated via auth.admin.generateLink.

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const subject = 'Reset your Antim vault password'
  const html = baseHtml({
    previewText: 'Click the link to reset your Antim vault password. This link expires in 1 hour.',
    bodyContent: `
      ${h2('Reset your password')}
      ${p('You requested a password reset for your Antim vault. Click below to set a new password.')}
      ${p('This link expires in 1 hour.', { muted: true })}
      <div style="margin:28px 0;">
        ${ctaButton('Reset my password', resetLink)}
      </div>
      ${divider()}
      ${p('If you did not request this, you can safely ignore this email. Your password has not changed.', { muted: true, small: true })}
      ${p('The Antim team', { muted: true })}
    `,
  })
  return getResend().emails.send({ from: FROM_EMAIL, replyTo: ADMIN_EMAIL, to, subject, html })
}

// ─── Nominee alert email ──────────────────────────────────────────────────────
// Sent to the nominee when the vault owner adds them

export async function sendNomineeAlertEmail(
  to: string,
  nomineeName: string,
  ownerName: string
) {
  const subject = `${ownerName} has added you as their Antim vault nominee`
  const html = baseHtml({
    previewText: `${ownerName} has named you as a nominee on their Antim vault.`,
    bodyContent: `
      ${h2(`Dear ${nomineeName},`)}
      ${p(`${ownerName} has stored their important financial documents and account details in a secure digital vault called Antim, and has named you as someone who should receive access when the time comes.`)}
      ${p('You do not need to do anything right now. This is just to let you know.')}
      ${divider()}
      ${p('When the time comes, you or another family member can request access at the link below. You will need to provide a death certificate, and our team will verify the request within 2 to 3 business days.', { muted: true })}
      <div style="margin:28px 0;">
        ${ctaButton('Learn more about Antim', `${APP_URL}`)}
      </div>
      ${p(`Questions? You can reach us at ${ADMIN_EMAIL} or WhatsApp ${WHATSAPP_DISPLAY}.`, { muted: true })}
      ${p('The Antim team', { muted: true })}
    `,
  })
  return getResend().emails.send({ from: FROM_EMAIL, replyTo: ADMIN_EMAIL, to, subject, html })
}

// ─── Release request — admin alert ───────────────────────────────────────────
// Sent to hello@antim.services when a nominee submits a release request

export async function sendReleaseRequestAlert(data: {
  deceasedName: string
  deceasedEmail: string
  requestedByName: string
  requestedByEmail: string
  requestedByPhone: string
  relationship: string
  note: string
  vaultFound: boolean
}) {
  const subject = `New vault release request - action required`
  const html = baseHtml({
    previewText: `New release request from ${data.requestedByName} for ${data.deceasedName}.`,
    bodyContent: `
      ${h2('New vault release request')}
      ${p('A nominee has submitted a release request. Review and take action in the admin panel.')}
      ${divider()}
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:20px;">
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;width:160px;">Deceased</td><td style="padding:8px 0;font-size:14px;color:#1a1a1a;font-weight:500;">${data.deceasedName} (${data.deceasedEmail})</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">Requested by</td><td style="padding:8px 0;font-size:14px;color:#1a1a1a;font-weight:500;">${data.requestedByName} (${data.relationship})</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">Contact</td><td style="padding:8px 0;font-size:14px;color:#1a1a1a;">${data.requestedByEmail}<br>${data.requestedByPhone}</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">Vault found</td><td style="padding:8px 0;font-size:14px;color:${data.vaultFound ? '#16a34a' : '#dc2626'};font-weight:500;">${data.vaultFound ? 'Yes' : 'No - email not registered'}</td></tr>
        ${data.note ? `<tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">Note</td><td style="padding:8px 0;font-size:14px;color:#1a1a1a;">${data.note}</td></tr>` : ''}
      </table>
      <div style="margin:28px 0;">
        ${ctaButton('Review in admin panel', `${APP_URL}/admin`)}
      </div>
    `,
  })
  return getResend().emails.send({
    from: FROM_EMAIL,
    replyTo: ADMIN_EMAIL,
    to: ADMIN_EMAIL,
    subject,
    html,
  })
}

// ─── Release request — nominee acknowledgment ─────────────────────────────────
// Sent to the nominee when their release request is received

export async function sendReleaseRequestAcknowledgmentEmail(to: string, nomineeName: string) {
  const subject = `We've received your request to access the vault`
  const html = baseHtml({
    previewText: 'We have received your vault access request and will review it within 2 to 3 business days.',
    bodyContent: `
      ${h2(`Dear ${nomineeName},`)}
      ${p('We are deeply sorry for your loss.')}
      ${p('We have received your request to access the vault. Our team will review the death certificate and supporting details within 2 to 3 business days.')}
      ${p('We may contact you if we need anything additional. Please do not hesitate to reach out if you have questions.')}
      ${divider()}
      ${p(`You can contact us at <a href="mailto:hello@antim.services" style="color:#4F6F52;">hello@antim.services</a> or WhatsApp ${WHATSAPP_DISPLAY}.`, { muted: true })}
      ${p('The Antim team', { muted: true })}
    `,
  })
  return getResend().emails.send({ from: FROM_EMAIL, replyTo: ADMIN_EMAIL, to, subject, html })
}

// ─── Release approved — nominee notification ──────────────────────────────────
// Sent to the nominee when admin approves their release request

export async function sendReleaseApprovedEmail(to: string, name: string, token: string) {
  const accessUrl = `${APP_URL}/release/view?token=${token}`
  const subject = 'Your vault access request has been approved'
  const html = baseHtml({
    previewText: 'Your request has been approved. Use the secure link to access the vault. Valid for 72 hours.',
    bodyContent: `
      ${h2(`Dear ${name},`)}
      ${p('We have reviewed and approved your request to access the vault.')}
      ${p('Use the secure link below to view the contents. This link is valid for 72 hours.')}
      <div style="margin:28px 0;">
        ${ctaButton('Access the vault', accessUrl)}
      </div>
      ${p('If the button does not work, copy and paste this link into your browser:', { muted: true, small: true })}
      <p style="font-size:12px;color:#9ca3af;word-break:break-all;margin:0 0 16px;">${accessUrl}</p>
      ${divider()}
      ${p(`Questions? Contact us at <a href="mailto:hello@antim.services" style="color:#4F6F52;">hello@antim.services</a> or WhatsApp ${WHATSAPP_DISPLAY}.`, { muted: true })}
      ${p('We are deeply sorry for your loss.', { muted: true })}
      ${p('The Antim team', { muted: true })}
    `,
  })
  return getResend().emails.send({ from: FROM_EMAIL, replyTo: ADMIN_EMAIL, to, subject, html })
}

// ─── Release rejected — nominee notification ──────────────────────────────────
// Sent to the nominee when admin rejects their release request

export async function sendReleaseRejectedEmail(to: string, name: string, reason?: string) {
  const subject = 'Update on your vault access request'
  const html = baseHtml({
    previewText: 'We were unable to approve your vault access request at this time.',
    bodyContent: `
      ${h2(`Dear ${name},`)}
      ${p('We have reviewed your request to access the vault.')}
      ${p('Unfortunately, we were not able to approve your request at this time.')}
      ${reason ? `<div style="background:#fef9f0;border-left:3px solid #B8722C;padding:16px;margin:0 0 16px;border-radius:0 4px 4px 0;">${p(`<strong>Reason:</strong> ${reason}`)}</div>` : ''}
      ${p(`If you believe this is a mistake or have additional documentation to provide, please contact us at <a href="mailto:hello@antim.services" style="color:#4F6F52;">hello@antim.services</a> or WhatsApp ${WHATSAPP_DISPLAY}.`)}
      ${p('We are deeply sorry for your loss.', { muted: true })}
      ${p('The Antim team', { muted: true })}
    `,
  })
  return getResend().emails.send({ from: FROM_EMAIL, replyTo: ADMIN_EMAIL, to, subject, html })
}

// ─── Vault accessed — owner notification ─────────────────────────────────────
// Sent to the vault owner when a nominee first accesses the vault via a release link

export async function sendReleaseAccessedEmail(
  to: string,
  firstName: string,
  nomineeName: string,
  accessedAt: string
) {
  const date = new Date(accessedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  })
  const subject = `Your vault has been accessed by ${nomineeName}`
  const html = baseHtml({
    previewText: `${nomineeName} accessed your Antim vault on ${date} (IST).`,
    bodyContent: `
      ${h2(`Hi ${firstName},`)}
      ${p('This is an automated security notice.')}
      ${p(`<strong>${nomineeName}</strong> accessed your Antim vault on ${date} (IST).`)}
      ${p('If you were not expecting this, please contact us immediately.')}
      ${divider()}
      ${p(`Contact us at <a href="mailto:hello@antim.services" style="color:#4F6F52;">hello@antim.services</a> or WhatsApp ${WHATSAPP_DISPLAY}.`, { muted: true })}
      ${p('The Antim team', { muted: true })}
    `,
  })
  return getResend().emails.send({ from: FROM_EMAIL, replyTo: ADMIN_EMAIL, to, subject, html })
}

// ─── 7-day nudge ─────────────────────────────────────────────────────────────
// Sent 7 days after signup if vault completeness is 0% (no data at all)
//
// TODO: Wire this up to a cron job. Suggested trigger:
//   - Run daily at 09:00 IST
//   - Query vaults created exactly 7 days ago with subscription_status = 'active'
//   - Check vault_assets, vault_documents, vault_nominees counts are all 0
//   - Fetch user email from auth.users and call sendSevenDayNudgeEmail

export async function sendSevenDayNudgeEmail(to: string, firstName: string) {
  const subject = 'Your Antim vault is still empty'
  const html = baseHtml({
    previewText: 'Your family still does not know where to start. It takes 20 minutes to change that.',
    bodyContent: `
      ${h2(`Hi ${firstName},`)}
      ${p('A week has passed and your vault is still empty.')}
      ${p('Your family would not know where to start if something happened today. We know life gets busy. But this takes about 20 minutes and protects years of work.')}
      ${divider()}
      ${p('<strong style="color:#1a1a1a;">Three things to add:</strong>')}
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;width:100%;">
        <tr><td style="padding:8px 0;border-bottom:1px solid #f0ece4;font-size:15px;color:#374151;">Your bank accounts and assets</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #f0ece4;font-size:15px;color:#374151;">A nominee who will receive access</td></tr>
        <tr><td style="padding:8px 0;font-size:15px;color:#374151;">A personal letter to your family</td></tr>
      </table>
      <div style="margin:28px 0;">
        ${ctaButton('Complete my vault', `${APP_URL}/vault`)}
      </div>
      ${p(`Questions? Reply to this email or WhatsApp us at ${WHATSAPP_DISPLAY}.`, { muted: true })}
      ${p('The Antim team', { muted: true })}
    `,
  })
  return getResend().emails.send({ from: FROM_EMAIL, replyTo: ADMIN_EMAIL, to, subject, html })
}

// ─── 14-day nominee nudge ─────────────────────────────────────────────────────
// Sent 14 days after signup if no nominee has been added
//
// TODO: Wire this up to a cron job. Suggested trigger:
//   - Run daily at 09:00 IST
//   - Query vaults created exactly 14 days ago with subscription_status = 'active'
//   - Check vault_nominees count is 0
//   - Fetch user email from auth.users and call sendNomineeNudgeEmail

export async function sendNomineeNudgeEmail(to: string, firstName: string) {
  const subject = 'One thing missing from your Antim vault'
  const html = baseHtml({
    previewText: 'Your vault is only useful if someone knows to open it. Add a nominee.',
    bodyContent: `
      ${h2(`Hi ${firstName},`)}
      ${p('You have started your vault. There is one thing missing.')}
      ${p('A nominee. Without one, your family will not know to look here when the time comes. The vault only works if someone knows it exists and knows to request access.')}
      ${p('It takes two minutes to add a nominee. Their name, email, and phone. That is all.')}
      <div style="margin:28px 0;">
        ${ctaButton('Add a nominee', `${APP_URL}/vault/nominees`)}
      </div>
      ${divider()}
      ${p('A nominee is the person who will be able to request access to your vault after you pass. They will need to provide a death certificate, and we will verify the request before granting access.', { muted: true, small: true })}
      ${p(`Questions? Reply to this email or WhatsApp us at ${WHATSAPP_DISPLAY}.`, { muted: true })}
      ${p('The Antim team', { muted: true })}
    `,
  })
  return getResend().emails.send({ from: FROM_EMAIL, replyTo: ADMIN_EMAIL, to, subject, html })
}
