import { ProjectCalculations } from '../models/ProjectCalculations.js';

export class PertCalculator {
    constructor(activities) {
        this.activities = activities;
        this.graph = {};
        this.es = {};
        this.ef = {};
        this.ls = {};
        this.lf = {};
        this.slack = {};
    }

    calculate() {
        if (this.activities.length === 0) {
            return new ProjectCalculations();
        }

        this._buildGraph();
        this._calculateForwardPass();
        const projectDuration = this._calculateBackwardPass();
        const criticalPath = this._findCriticalPath();

        return this._buildResults(criticalPath, projectDuration);
    }

    /**
     * Construye el grafo de actividades.
     * 1. Redondea la duración esperada (te) para los cálculos de la red.
     * 2. Guarda el objeto original (original) para el cálculo preciso de la varianza.
     */
    _buildGraph() {
        this.activities.forEach(act => {
            // Guardamos la actividad original para el cálculo de varianza
            const originalActivity = act;

            // Creamos una versión de la actividad con 'te' redondeado para la red
            const roundedActivity = {
                ...act,
                te: Math.round(act.te) // 🎯 REDONDEO CLAVE para tiempos enteros
            };

            this.graph[act.name] = {
                activity: roundedActivity, // Usado para ES/EF/LS/LF (con TE entero)
                original: originalActivity, // Usado para calcular la varianza del proyecto
                preds: act.getPredecessorsList()
            };
        });
    }

    _calculateForwardPass() {
        const memo = {};

        const calculateEF = (nodeName) => {
            if (memo[nodeName] !== undefined) return memo[nodeName];

            const node = this.graph[nodeName];
            if (!node) return 0;

            let startTime = 0;
            if (node.preds.length > 0) {
                startTime = Math.max(...node.preds.map(calculateEF));
            }

            this.es[nodeName] = startTime; // Será entero
            this.ef[nodeName] = startTime + node.activity.te; // Será entero
            memo[nodeName] = this.ef[nodeName];

            return this.ef[nodeName];
        };

        Object.keys(this.graph).forEach(name => calculateEF(name));
    }

    _calculateBackwardPass() {
        const projectDuration = Math.max(0, ...Object.values(this.ef));
        const sortedNodes = Object.keys(this.graph).sort((a, b) => this.ef[b] - this.ef[a]);

        sortedNodes.forEach(name => {
            const node = this.graph[name];
            const successors = Object.values(this.graph)
                .filter(n => n.preds.includes(name));

            if (successors.length === 0) {
                this.lf[name] = projectDuration;
            } else {
                this.lf[name] = Math.min(...successors.map(s => this.ls[s.activity.name]));
            }

            this.ls[name] = this.lf[name] - node.activity.te;
            this.slack[name] = this.lf[name] - this.ef[name];
        });

        return projectDuration;
    }

    _findCriticalPath() {
        // La comparación con 0.001 es buena práctica incluso con enteros para manejar errores de coma flotante
        return Object.keys(this.graph).filter(name =>
            Math.abs(this.slack[name]) < 0.001
        );
    }

    _buildResults(criticalPath, projectDuration) {
        const results = new ProjectCalculations();
        
        // 1. Asigna los resultados a las actividades
        results.activities = this.activities.map(act => ({
        ...act,
        // Los valores originales de TE, Variance y Sigma se mantienen aquí.
        te: act.te,
        variance: act.variance,
        sigma: act.sigma,
          es: this.es[act.name] || 0,
          ef: this.ef[act.name] || 0,
        ls: this.ls[act.name] || 0,
          lf: this.lf[act.name] || 0,
          slack: this.slack[act.name] || 0,
          isCritical: criticalPath.includes(act.name)
        }));

        // 2. Calcula la duración y la ruta crítica
        results.projectDuration = projectDuration;
        results.criticalPath = criticalPath;
        
        // 3. Calcula la Varianza del Proyecto (usando el objeto original)
        results.projectVariance = criticalPath.reduce((sum, name) => {
            const node = this.graph[name];
            // 🎯 SOLUCIÓN AL NaN: Usamos la varianza del objeto 'original'
            return sum + (node && node.original ? node.original.variance : 0);
        }, 0);

        // 4. Calcula la Desviación Estándar (previene NaN si la varianza es negativa por error)
        results.projectSigma = results.projectVariance >= 0 
                               ? Math.sqrt(results.projectVariance)
                               : 0;

        return results;
    }
}