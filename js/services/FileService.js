import { Activity } from '../models/Activity.js';

export class FileService {
    static saveActivities(activities) {
        if (activities.length === 0) {
            throw new Error('No hay actividades para guardar.');
        }

        const dataStr = JSON.stringify(activities.map(a => a.toJSON()), null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const a = document.createElement('a');
        a.href = url;
        const today = new Date().toISOString().split('T')[0];
        a.download = `proyecto-pert-${today}.json`;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static loadActivities(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    const loadedData = JSON.parse(content);

                    if (!Array.isArray(loadedData)) {
                        throw new Error('El archivo no contiene un array válido');
                    }

                    const activities = loadedData.map(data => Activity.fromJSON(data));
                    resolve(activities);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsText(file);
        });
    }
}