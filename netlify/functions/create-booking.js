// netlify/functions/create-booking.js
//
// Принимает заявку с сайта (вместо прямого вызова Telegram из браузера)
// и пересылает её в чат администратора. Токен бота хранится только здесь,
// в переменных окружения Netlify - на сайте (в HTML/JS) его больше нет.
//
// Нужные переменные окружения (задать в Netlify -> Project configuration ->
  // Environment variables):
//   BOT_TOKEN      - токен Telegram-бота (@icamper_reserve_bot)
//   ADMIN_CHAT_ID  - chat_id администратора, кому приходят заявки
//
// ВАЖНО: старый токен бота уже был публично виден в исходном коде
// icamper.surge.sh/reserve.html - рекомендуется выпустить новый токен
// через @BotFather (/revoke или /token) и сохранить сюда только его,
// нигде больше не публикуя.

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

    let body;
    try {
    body = JSON.parse(event.body || "{}");
    } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { message, bookingId } = body;
  if (!message || !bookingId) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing fields" }) };
  }

    const token = process.env.BOT_TOKEN;
    const adminId = process.env.ADMIN_CHAT_ID;

  if (!token || !adminId) {
    console.error("BOT_TOKEN / ADMIN_CHAT_ID не заданы в переменных окружения Netlify");
    return { statusCode: 500, body: JSON.stringify({ error: "Server not configured" }) };
  }

    try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: adminId, text: message }),
        });
    if (!tgRes.ok) {
      const err = await tgRes.text();
      console.error("Telegram error:", err);
      return { statusCode: 502, body: JSON.stringify({ error: "Telegram error" }) };
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};
