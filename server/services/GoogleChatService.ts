import fetch from 'node-fetch';

export interface GoogleChatSpace {
  name: string;
  displayName: string;
  type: string;
}

export interface GoogleChatMessage {
  name: string;
  sender: any;
  text: string;
  createTime: string;
}

export class GoogleChatService {
  /**
   * Fetch spaces (rooms/DMs) the authenticated user belongs to
   */
  static async listSpaces(token: string): Promise<GoogleChatSpace[]> {
    const url = 'https://chat.googleapis.com/v1/spaces';
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Google Chat API list spaces error:', errText);
      throw new Error(`Falla al obtener espacios de Google Chat: ${res.statusText}`);
    }

    const data = (await res.json()) as any;
    return data.spaces || [];
  }

  /**
   * Post a message to a specific Google Chat Space
   */
  static async sendMessage(token: string, spaceName: string, text: string): Promise<GoogleChatMessage> {
    // spaceName format is usually "spaces/<SPACE_ID>"
    const url = `https://chat.googleapis.com/v1/${spaceName}/messages`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Google Chat API send message error:', errText);
      throw new Error(`Falla al enviar mensaje de Google Chat: ${res.statusText}`);
    }

    return (await res.json()) as GoogleChatMessage;
  }
}
