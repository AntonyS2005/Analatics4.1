export class ProjectCalculations {
    constructor() {
        this.activities = [];
        this.projectDuration = 0;
        this.projectVariance = 0;
        this.projectSigma = 0;
        this.criticalPath = [];
    }

    isEmpty() {
        return this.activities.length === 0;
    }

    getCriticalActivities() {
        return this.activities.filter(a => a.isCritical);
    }
}