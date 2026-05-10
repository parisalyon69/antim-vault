import { Resend } from 'resend'
import { ADMIN_EMAIL, FROM_EMAIL, WHATSAPP_DISPLAY } from '@/lib/constants'

// Lazy-initialize so the constructor doesn't throw at build time when the key is absent
function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vault.antim.services'

// ─── Welcome email ────────────────────────────────────────────────────────────
// Sent after vault is activated (post-payment webhook)

export async function sendWelcomeEmail(to: string, firstName: string) {
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Your vault is ready — Antim',
    text: [
      `Hi ${firstName},`,
      ``,
      `Your Antim vault is set up and ready to fill.`,
      ``,
      `It takes about 20 minutes to complete — add your accounts, upload key documents, name a nominee, and write a short letter.`,
      ``,
      `When it's done, your family won't have to guess what to do.`,
      ``,
      `Open your vault: ${APP_URL}/vault`,
      ``,
      `If you have any questions, just reply to this email or WhatsApp us at ${WHATSAPP_DISPLAY}.`,
      ``,
      `The Antim team`,
    ].join('\n'),
  })
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
  return getResend().emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject: `New vault release request — ${data.deceasedName}`,
    text: [
      `A new vault release request has been submitted.`,
      ``,
      `Deceased: ${data.deceasedName} (${data.deceasedEmail})`,
      `Requested by: ${data.requestedByName} (${data.relationship})`,
      `Contact: ${data.requestedByEmail} | ${data.requestedByPhone}`,
      `Note: ${data.note || '(none)'}`,
      `Vault found: ${data.vaultFound ? 'Yes' : 'No — email not registered'}`,
      ``,
      `Review at: ${APP_URL}/admin`,
    ].join('\n'),
  })
}

// ─── Release approved — nominee notification ──────────────────────────────────
// Sent to the nominee when admin approves their release request

export async function sendReleaseApprovedEmail(to: string, name: string, token: string) {
  const accessUrl = `${APP_URL}/release/view?token=${token}`
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Your vault access request has been approved — Antim',
    text: [
      `Dear ${name},`,
      ``,
      `We have reviewed and approved your request to access the vault.`,
      ``,
      `You can view the vault using the secure link below. This link is valid for 72 hours.`,
      ``,
      accessUrl,
      ``,
      `If you have any questions, please contact us at ${ADMIN_EMAIL} or WhatsApp ${WHATSAPP_DISPLAY}.`,
      ``,
      `We are deeply sorry for your loss.`,
      ``,
      `The Antim team`,
    ].join('\n'),
  })
}

// ─── Release rejected — nominee notification ──────────────────────────────────
// Sent to the nominee when admin rejects their release request

export async function sendReleaseRejectedEmail(to: string, name: string, reason?: string) {
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Update on your vault access request — Antim',
    text: [
      `Dear ${name},`,
      ``,
      `We have reviewed your request to access the vault.`,
      ``,
      `Unfortunately, we were unable to approve your request at this time.`,
      reason ? `\nReason: ${reason}\n` : '',
      `If you believe this is a mistake or have additional documentation to provide, please contact us at ${ADMIN_EMAIL} or WhatsApp ${WHATSAPP_DISPLAY}.`,
      ``,
      `We are deeply sorry for your loss.`,
      ``,
      `The Antim team`,
    ].join('\n'),
  })
}
