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
     * 🚨 MODIFICACIÓN CLAVE: Redondea la duración esperada (te) de cada actividad.
     */
    _buildGraph() {
        this.activities.forEach(act => {
            this.graph[act.name] = {
                activity: {
                    ...act,
                    // Aplicamos Math.round() a la duración esperada (te) para que todos 
                    // los cálculos de tiempo posteriores utilicen un entero.
                    te: Math.round(act.te) 
                },
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
                // startTime (ES) será entero, ya que calculateEF devuelve EF (que es entero)
                startTime = Math.max(...node.preds.map(calculateEF));
            }

            this.es[nodeName] = startTime;
            // node.activity.te ya está redondeado, por lo que EF también será entero.
            this.ef[nodeName] = startTime + node.activity.te;
            memo[nodeName] = this.ef[nodeName];

            return this.ef[nodeName];
        };

        Object.keys(this.graph).forEach(name => calculateEF(name));
    }

    _calculateBackwardPass() {
        // projectDuration es entero (el máximo de los EF enteros)
        const projectDuration = Math.max(0, ...Object.values(this.ef)); 
        const sortedNodes = Object.keys(this.graph).sort((a, b) => this.ef[b] - this.ef[a]);

        sortedNodes.forEach(name => {
            const node = this.graph[name];
            const successors = Object.values(this.graph)
                .filter(n => n.preds.includes(name));

            if (successors.length === 0) {
                this.lf[name] = projectDuration;
            } else {
                // lf será entero (mínimo de los LS, que son enteros)
                this.lf[name] = Math.min(...successors.map(s => this.ls[s.activity.name]));
            }

            // node.activity.te ya está redondeado, por lo que LS también será entero.
            this.ls[name] = this.lf[name] - node.activity.te;
            this.slack[name] = this.lf[name] - this.ef[name];
        });

        return projectDuration;
    }

    _findCriticalPath() {
        return Object.keys(this.graph).filter(name =>
            // La holgura (slack) será 0 para la ruta crítica, ya que todos los tiempos son enteros
            Math.abs(this.slack[name]) < 0.001
        );
    }

    _buildResults(criticalPath, projectDuration) {
        const results = new ProjectCalculations();
        results.activities = this.activities.map(act => ({
        ...act,
        // Los valores originales (con decimales, si los hubo) se mantienen aquí,
        // pero ES, EF, LS, LF y slack serán los valores enteros calculados.
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

        results.projectDuration = projectDuration;
        results.criticalPath = criticalPath;
        results.projectVariance = criticalPath.reduce((sum, name) => {
        // NOTA: Para la varianza del proyecto, se recomienda usar la varianza (act.variance) ORIGINAL,
        // que no se redondeó, para mantener la precisión estadística.
        const node = this.graph[name];
          return sum + (node ? node.activity.variance : 0);
          }, 0);
          results.projectSigma = Math.sqrt(results.projectVariance);

          return results;
    }
}