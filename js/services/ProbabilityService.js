export class ProbabilityService {
    static normalCDF(x) {
        const t = 1 / (1 + 0.2316419 * Math.abs(x));
        const d = 0.3989423 * Math.exp(-x * x / 2);
        const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        return x > 0 ? 1 - p : p;
    }

    static normalInverseCDF(p) {
        if (p <= 0 || p >= 1) return 0;

        let z;
        if (p < 0.5) {
            const t = Math.sqrt(-2 * Math.log(p));
            z = -(t - (2.515517 + 0.802853 * t + 0.010328 * t * t) /
                (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t));
        } else {
            const t = Math.sqrt(-2 * Math.log(1 - p));
            z = t - (2.515517 + 0.802853 * t + 0.010328 * t * t) /
                (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
        }
        return z;
    }

    static calculateProbabilityForDays(targetDays, projectDuration, projectSigma) {
        if (projectSigma === 0) {
            return targetDays >= projectDuration ? 100 : 0;
        }

        const z = (targetDays - projectDuration) / projectSigma;
        return this.normalCDF(z) * 100;
    }

    static calculateDaysForProbability(targetProb, projectDuration, projectSigma) {
        if (projectSigma === 0) {
            return projectDuration;
        }

        const p = targetProb / 100;
        const z = this.normalInverseCDF(p);
        return projectDuration + z * projectSigma;
    }

    static getZScore(targetDays, projectDuration, projectSigma) {
        if (projectSigma === 0) return 0;
        return (targetDays - projectDuration) / projectSigma;
    }
}
