import fetch from 'node-fetch';

export class GoogleDriveService {
  static async setupFolders(token: string): Promise<any> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // 1. Create Root "SIGAL_DATA" Folder
    const rootRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'SIGAL_DATA',
        mimeType: 'application/vnd.google-apps.folder'
      })
    });

    if (!rootRes.ok) throw new Error('No se pudo crear la carpeta raíz SIGAL_DATA en Google Drive.');
    const rootData = (await rootRes.json()) as any;
    const rootId = rootData.id;

    // 2. Create Year Folder inside Root
    const yearRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: String(year),
        mimeType: 'application/vnd.google-apps.folder',
        parents: [rootId]
      })
    });
    if (!yearRes.ok) throw new Error(`No se pudo crear la carpeta del año ${year}`);
    const yearData = (await yearRes.json()) as any;

    // 3. Create Month Folder inside Year
    const monthRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: month,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [yearData.id]
      })
    });
    if (!monthRes.ok) throw new Error(`No se pudo crear la carpeta del mes ${month}`);
    const monthData = (await monthRes.json()) as any;

    // 4. Create subfolders: /Pedidos, /Licitaciones, /Menus, /Reportes
    const subfolders = ['Pedidos', 'Licitaciones', 'Menus', 'Reportes'];
    const subfolderIds: Record<string, string> = {};

    for (const folder of subfolders) {
      const fRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: folder,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [monthData.id]
        })
      });
      if (fRes.ok) {
        const fData = (await fRes.json()) as any;
        subfolderIds[folder] = fData.id;
      }
    }

    return {
      success: true,
      rootFolderId: rootId,
      subfolders: subfolderIds
    };
  }
}
