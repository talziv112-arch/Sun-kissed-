// Telegram notification service — sends alerts to admin about key events.
// Token & Chat IDs are hardcoded (safe: they're like public links to chats).

const TELEGRAM_BOT_TOKEN = "8921425329:AAGLgQ5V97nGIdnws0Xy0pSSr_uO82Scn94";
const TELEGRAM_ADMIN_CHAT_IDS = ["1904331777", "5948002751"]; // Primary + Secondary admin
const API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

async function sendTelegramMessage(text: string): Promise<void> {
  try {
    // Send to all authorized admins
    for (const chatId of TELEGRAM_ADMIN_CHAT_IDS) {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        }),
      });
    }
  } catch (err) {
    console.error("Telegram send failed (non-critical):", err);
    // fail silently — don't break the app if Telegram is down
  }
}

export async function notifyNewUser(phone: string, name: string): Promise<void> {
  const msg = `👤 <b>משתמש חדש</b>\n🔗 <code>${phone}</code>\n📝 ${name}`;
  await sendTelegramMessage(msg);
}

export async function notifyNewAppointment(
  phone: string,
  name: string,
  service: string,
  date: string,
  time: string
): Promise<void> {
  const msg = `📅 <b>תור חדש</b>\n👤 ${name}\n🔗 <code>${phone}</code>\n💅 ${service}\n📆 ${date} 🕐 ${time}`;
  await sendTelegramMessage(msg);
}

export async function notifyCancelledAppointment(
  name: string,
  service: string,
  date: string,
  time: string
): Promise<void> {
  const msg = `❌ <b>ביטול תור</b>\n👤 ${name}\n💅 ${service}\n📆 ${date} 🕐 ${time}`;
  await sendTelegramMessage(msg);
}

export async function notifyRescheduledAppointment(
  name: string,
  service: string,
  oldDate: string,
  oldTime: string,
  newDate: string,
  newTime: string
): Promise<void> {
  const msg = `🔄 <b>שינוי תור</b>\n👤 ${name}\n💅 ${service}\n📅 <s>${oldDate} ${oldTime}</s> → ${newDate} ${newTime}`;
  await sendTelegramMessage(msg);
}

export async function notifySettingsUpdated(details: string): Promise<void> {
  const msg = `⚙️ <b>הגדרות עודכנו</b>\n${details}`;
  await sendTelegramMessage(msg);
}
