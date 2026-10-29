// Sends the customer their personal access link through Resend's REST API.
// Returns false (instead of throwing) when email is not configured or fails.
export async function sendAccessEmail(to: string, accessUrl: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      subject: "הקישור האישי שלך ל-AI Visibility Score",
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.6">
        <p>תודה על הרכישה!</p>
        <p>הקישור האישי שלך לביצוע הבדיקה (שימוש חד-פעמי):</p>
        <p><a href="${accessUrl}">${accessUrl}</a></p>
        <p>שמרו את הקישור – גם הדוח יישמר בו.</p></div>`,
    }),
  });
  if (!res.ok) console.error("Resend failed", res.status, await res.text().catch(() => ""));
  return res.ok;
}
