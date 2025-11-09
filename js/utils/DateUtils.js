export class DateUtils {
    static addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + Math.round(days));
        return result;
    }

    static format(date) {
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    static getTodayISO() {
        return new Date().toISOString().split('T')[0];
    }

    static parseISO(dateString) {
        return new Date(dateString);
    }
}