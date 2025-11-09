export class MathUtils {
    static round(value, decimals = 2) {
        return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    static isApproximatelyEqual(a, b, epsilon = 0.001) {
        return Math.abs(a - b) < epsilon;
    }
}