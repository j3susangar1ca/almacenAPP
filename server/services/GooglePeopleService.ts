import fetch from 'node-fetch';

export interface GoogleContact {
  resourceName: string;
  etag: string;
  names?: {
    displayName?: string;
    familyName?: string;
    givenName?: string;
  }[];
  emailAddresses?: {
    value?: string;
    type?: string;
  }[];
  phoneNumbers?: {
    value?: string;
    type?: string;
  }[];
  organizations?: {
    name?: string;
    title?: string;
  }[];
}

export class GooglePeopleService {
  /**
   * Fetch contacts from the user's Google Contacts
   */
  static async listContacts(token: string): Promise<GoogleContact[]> {
    const url = 'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,organizations&pageSize=100';
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Google People API list error:', errText);
      throw new Error(`Falla al obtener contactos de Google: ${res.statusText}`);
    }

    const data = (await res.json()) as any;
    return data.connections || [];
  }

  /**
   * Create a new contact in the user's Google Contacts
   */
  static async createContact(token: string, contactData: {
    givenName: string;
    familyName: string;
    email?: string;
    phone?: string;
    organization?: string;
    title?: string;
  }): Promise<GoogleContact> {
    const url = 'https://people.googleapis.com/v1/people:createContact';
    
    const body: any = {
      names: [
        {
          givenName: contactData.givenName,
          familyName: contactData.familyName
        }
      ]
    };

    if (contactData.email) {
      body.emailAddresses = [
        {
          value: contactData.email,
          type: 'work'
        }
      ];
    }

    if (contactData.phone) {
      body.phoneNumbers = [
        {
          value: contactData.phone,
          type: 'mobile'
        }
      ];
    }

    if (contactData.organization || contactData.title) {
      body.organizations = [
        {
          name: contactData.organization || '',
          title: contactData.title || '',
          type: 'work'
        }
      ];
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Google People API create error:', errText);
      throw new Error(`Falla al crear contacto en Google: ${res.statusText}`);
    }

    return (await res.json()) as GoogleContact;
  }
}
