// Minimal mail sender via Resend's REST API (no SDK dependency).
// Degrades gracefully: with no RESEND_API_KEY it logs the message and returns
// { sent: false } instead of throwing, so invites/reset still work in dev and
// before email is configured.

type SendArgs = { to: string; subject: string; html: string; text?: string };

export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<{ sent: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Nestling <onboarding@resend.dev>";

  if (!key) {
    console.log(`[email suppressed — set RESEND_API_KEY to send] to=${to} subject="${subject}"`);
    return { sent: false };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`email send failed ${res.status}: ${body}`);
      return { sent: false, error: `send failed (${res.status})` };
    }
    return { sent: true };
  } catch (e: any) {
    console.error("email error:", e?.message);
    return { sent: false, error: e?.message };
  }
}

// ——— simple shared email templates ———

export function inviteEmail(inviter: string, childName: string, url: string) {
  return {
    subject: `${inviter} invited you to track ${childName} on Nestling`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px">
      <h2>🐣 You're invited to Nestling</h2>
      <p><b>${escapeHtml(inviter)}</b> wants you to help track <b>${escapeHtml(childName)}</b> — you'll share one live timeline of feeds, sleep and diapers.</p>
      <p><a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:600">Accept invite</a></p>
      <p style="color:#888;font-size:13px">Or paste this link: ${url}<br/>This link expires in 7 days.</p>
    </div>`,
    text: `${inviter} invited you to track ${childName} on Nestling. Accept: ${url} (expires in 7 days).`,
  };
}

export function resetEmail(url: string) {
  return {
    subject: "Reset your Nestling password",
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px">
      <h2>Reset your password</h2>
      <p>Tap the button to choose a new password. If you didn't request this, you can ignore this email.</p>
      <p><a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:600">Reset password</a></p>
      <p style="color:#888;font-size:13px">Or paste this link: ${url}<br/>This link expires in 1 hour.</p>
    </div>`,
    text: `Reset your Nestling password: ${url} (expires in 1 hour). If you didn't request this, ignore this email.`,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
