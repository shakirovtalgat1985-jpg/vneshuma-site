// netlify/functions/check-start.js
//
// Клиент после отправки заявки получает ссылку t.me/vneshuma_bot?start=<bookingId>.
// Если он открывает её и жмёт Start, в чат с ботом приходит сообщение "/start <bookingId>".
// Эта функция вызывается с сайта каждые ~2.5 сек и спрашивает Telegram (getUpdates),
// не пришло ли такое сообщение — если да, тут же шлёт клиенту копию его заявки
// и возвращает {found:true}, чтобы сайт показал "копия отправлена".
//
// Токен читается только из переменных окружения Netlify (BOT_TOKEN) — на сайте его нет.
//
// Ограничение: getUpdates — общий "почтовый ящик" бота. Если когда-нибудь появится
// отдельный постоянно работающий бот-процесс (на VPS), которому тоже нужны эти
// обновления, два независимых потребителя getUpdates будут друг другу мешать —
// тогда этот механизм нужно будет заменить на webhook.

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

  const { bookingId, message } = body;
  if (!bookingId) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing bookingId" }) };
  }

  const token = process.env.BOT_TOKEN;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: "Server not configured" }) };
  }

  try {
    const updRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100`);
    const upd = await updRes.json();
    if (!upd.ok) {
      return { statusCode: 502, body: JSON.stringify({ error: "Telegram error" }) };
    }

    const target = `/start ${bookingId}`;
    let clientChatId = null;
    for (const u of upd.result) {
      const m = u.message;
      if (m && m.text && m.text.trim() === target) {
        clientChatId = m.chat.id;
        break;
      }
    }

    if (!clientChatId) {
      return { statusCode: 200, body: JSON.stringify({ found: false }) };
    }

    const copyText = 'Твоя заявка в «вне шума» принята.\nМы свяжемся с тобой в течение 15 минут.\n\n──── Копия заявки ────\n\n' + (message || '');
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: clientChatId, text: copyText }),
    });

    return { statusCode: 200, body: JSON.stringify({ found: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Server error" }) };
  }
};
