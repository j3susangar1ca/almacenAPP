import fetch from 'node-fetch';

export class GmailCalendarService {
  static async sendAlertEmail(token: string, to: string, subject: string, htmlBody: string): Promise<any> {
    const rawMessage = [
      `To: ${to}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${subject}`,
      '',
      htmlBody
    ].join('\n');

    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const emailRes = await fetch('https://gmail.googleapis.com/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encodedMessage })
    });

    if (!emailRes.ok) {
      throw new Error('Gmail API failed to dispatch message');
    }

    return { success: true, msg: 'Email dispatched successfully.' };
  }

  static async scheduleCalendarEvent(token: string, title: string, description: string, date: string): Promise<any> {
    const eventRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary: title,
        description,
        start: { date: date }, // All-day event
        end: { date: date }
      })
    });

    if (!eventRes.ok) throw new Error('Google Calendar API failed to schedule event.');
    return { success: true, msg: 'Calendar event scheduled successfully.' };
  }
}
