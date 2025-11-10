// src/ui/ProbabilityController.js

import { ProbabilityService } from '../services/ProbabilityService.js';
import { DateUtils } from '../utils/DateUtils.js';

export class ProbabilityController {
    
    constructor(appState) {
        this.appState = appState;
        
        // CORRECCIÓN CLAVE: Mapear los nombres internos del JS a los IDs reales del HTML
        // ¡Asegúrate de que estos IDs existan en tu HTML!
        this.elements = {
            // Calculadora 1: Días -> Probabilidad
            targetDaysInput: document.getElementById('target-days'),
            resultProbContainer: document.getElementById('probability-result'),
            resultProb: document.getElementById('probability-percent'),
            zValueOutput: document.getElementById('z-value'),
            zFormulaOutput: document.getElementById('z-formula'), // Usado para mostrar la probabilidad de tabla (p)
            probabilityText: document.getElementById('probability-text'),
            probabilityDate: document.getElementById('probability-date'),
            
            // Calculadora 2: Probabilidad -> Días
            targetProbInput: document.getElementById('target-prob'),
            resultDaysContainer: document.getElementById('days-result'),
            resultDays: document.getElementById('days-needed'),
            resultDate: document.getElementById('days-date'),
            zInverseOutput: document.getElementById('z-inverse'),
            daysFormulaOutput: document.getElementById('days-formula'),
            daysText: document.getElementById('days-text'),
            
            // Tabla y Análisis
            probabilityTable: document.getElementById('probability-table'), 
            rangeAnalysis: document.getElementById('range-analysis'), 
            probabilitySection: document.getElementById('content-probability'),
        };

        // Escuchar cambios en los inputs para recalcular automáticamente
        // AGREGANDO VERIFICACIÓN DE NULL
        if (this.elements.targetDaysInput) {
            this.elements.targetDaysInput.addEventListener('input', () => this.calculateProbability());
        }
        if (this.elements.targetProbInput) {
            this.elements.targetProbInput.addEventListener('input', () => this.calculateDays());
            // Valor por defecto si es necesario (ej. 95)
            if (this.elements.targetProbInput.value === '') {
                this.elements.targetProbInput.value = 95;
            }
        }
    }

    /**
     * Función principal para renderizar la vista probabilística y configurar valores iniciales.
     */
    render() {
        if (!this.appState.calculations || !this.appState.calculations.projectDuration || this.appState.calculations.projectDuration <= 0) {
            if (this.elements.probabilitySection) {
                this.elements.probabilitySection.classList.add('hidden');
            }
            return;
        }
        
        if (this.elements.probabilitySection) {
            this.elements.probabilitySection.classList.remove('hidden');
        }

        const projectDuration = this.appState.calculations.projectDuration;
        
        // 1. Mostrar la duración crítica como valor objetivo inicial (días)
        if (this.elements.targetDaysInput) {
            this.elements.targetDaysInput.value = projectDuration.toFixed(1); 
        }
        
        // 2. Inicializar ambos cálculos
        this.calculateProbability(); 
        this.calculateDays();
        
        // 3. Renderizar la tabla de rangos y el análisis
        this.renderRangeTable();
    }

    /**
     * Calcula la probabilidad de terminar en un número de días objetivo.
     */
    calculateProbability() {
        const { calculations, startDate } = this.appState;
        if (!calculations || calculations.projectDuration === 0) return;
        
        const projectDuration = calculations.projectDuration;
        const projectSigma = calculations.projectSigma;
        
        // Usar 0 si el input es null/undefined por si acaso
        const targetDays = parseFloat(this.elements.targetDaysInput?.value) || 0;
        
        if (this.elements.resultProbContainer) {
            this.elements.resultProbContainer.classList.remove('hidden');
        }

        if (isNaN(targetDays) || targetDays < 0 || projectSigma === 0) {
            const message = (projectSigma === 0) ? 'Riesgo 0. Desviación 0.' : 'Ingrese días válidos';
            
            if (this.elements.resultProb) this.elements.resultProb.textContent = (projectSigma === 0) ? '100 %' : 'N/A';
            if (this.elements.probabilityText) this.elements.probabilityText.textContent = message;
            if (this.elements.zValueOutput) this.elements.zValueOutput.textContent = '';
            if (this.elements.zFormulaOutput) this.elements.zFormulaOutput.textContent = '';
            if (this.elements.probabilityDate) this.elements.probabilityDate.textContent = (projectSigma === 0) ? `Fecha: ${DateUtils.format(DateUtils.addDays(startDate, projectDuration))}` : '';
            return;
        }

        // LLAMADA CORREGIDA: Usamos el método existente y getZScore por separado
        const probability = ProbabilityService.calculateProbabilityForDays(
            targetDays,
            projectDuration,
            projectSigma
        );
        const zScore = ProbabilityService.getZScore(targetDays, projectDuration, projectSigma);
        const zTableProb = probability / 100; // Probabilidad de tabla (p) en formato decimal
        
        const targetDate = DateUtils.addDays(startDate, targetDays);

        // Rellenar resultados en el DOM
        if (this.elements.resultProb) this.elements.resultProb.textContent = `${probability.toFixed(2)} %`;
        if (this.elements.zValueOutput) this.elements.zValueOutput.textContent = `Valor Z: ${zScore.toFixed(3)}`;
        if (this.elements.zFormulaOutput) this.elements.zFormulaOutput.textContent = `Probabilidad de Tabla (p): ${zTableProb.toFixed(4)}`;
        if (this.elements.probabilityDate) this.elements.probabilityDate.textContent = `Fecha de finalización objetivo: ${DateUtils.format(targetDate)}`;

        if (this.elements.probabilityText) {
            if (probability > 90) {
                this.elements.probabilityText.textContent = '¡Alto nivel de confianza! El proyecto tiene una alta probabilidad de completarse a tiempo.';
            } else if (probability < 50) {
                this.elements.probabilityText.textContent = 'Bajo nivel de confianza. Se necesitan más días para alcanzar una probabilidad aceptable.';
            } else {
                this.elements.probabilityText.textContent = 'Nivel de confianza moderado. Monitoree de cerca la ruta crítica.';
            }
        }
    }

    /**
     * Calcula el número de días necesario para una probabilidad objetivo.
     */
    calculateDays() {
        const { calculations, startDate } = this.appState;
        if (!calculations || calculations.projectDuration === 0) return;

        const projectDuration = calculations.projectDuration;
        const projectSigma = calculations.projectSigma;
        
        // Usar valor de input o 95 por defecto
        const targetProbPercent = parseFloat(this.elements.targetProbInput?.value) || 95;
        
        if (this.elements.resultDaysContainer) {
            this.elements.resultDaysContainer.classList.remove('hidden');
        }

        if (isNaN(targetProbPercent) || targetProbPercent < 1 || targetProbPercent > 99 || projectSigma === 0) {
            const message = (projectSigma === 0) ? 'Riesgo 0. Desviación 0.' : 'Ingrese prob. (1-99)';
            
            if (this.elements.resultDays) this.elements.resultDays.textContent = (projectSigma === 0) ? `${projectDuration.toFixed(2)} días` : 'N/A';
            if (this.elements.resultDate) this.elements.resultDate.textContent = (projectSigma === 0) ? `Fecha: ${DateUtils.format(DateUtils.addDays(startDate, projectDuration))}` : '';
            if (this.elements.zInverseOutput) this.elements.zInverseOutput.textContent = '';
            if (this.elements.daysFormulaOutput) this.elements.daysFormulaOutput.textContent = '';
            if (this.elements.daysText) this.elements.daysText.textContent = message;
            return;
        }
        
        // LLAMADA CORREGIDA: Usamos el método existente y normalInverseCDF por separado
        const days = ProbabilityService.calculateDaysForProbability(
            targetProbPercent,
            projectDuration,
            projectSigma
        );
        
        // Obtenemos Z inverso directamente del servicio
        const zInverse = ProbabilityService.normalInverseCDF(targetProbPercent / 100);
        
        const targetDate = DateUtils.addDays(startDate, days);

        // Rellenar resultados en el DOM
        if (this.elements.resultDays) this.elements.resultDays.textContent = `${days.toFixed(2)} días`;
        if (this.elements.resultDate) this.elements.resultDate.textContent = `Fecha: ${DateUtils.format(targetDate)}`;
        if (this.elements.zInverseOutput) this.elements.zInverseOutput.textContent = `Valor Z inverso: ${zInverse.toFixed(3)}`;
        if (this.elements.daysFormulaOutput) this.elements.daysFormulaOutput.textContent = `Fórmula: μ + Zσ`;
        
        if (this.elements.daysText) {
            if (days > projectDuration) {
                this.elements.daysText.textContent = `Para un ${targetProbPercent}% de probabilidad, debes permitir ${(days - projectDuration).toFixed(2)} días adicionales al esperado.`;
            } else {
                this.elements.daysText.textContent = 'La duración requerida es menor que la duración esperada. ¡Excelente colchón de tiempo!';
            }
        }
    }

    /**
     * Renderiza la tabla de probabilidad basada en desviaciones estándar y el análisis de rangos.
     */
    renderRangeTable() {
        if (!this.appState.calculations || !this.elements.rangeAnalysis || !this.elements.probabilityTable) return;

        const projectDuration = this.appState.calculations.projectDuration;
        const projectSigma = this.appState.calculations.projectSigma;
        
        // Rangos a mostrar (desviaciones estándar: -3σ, -2σ, -1σ, 0, +1σ, +2σ, +3σ)
        const zScores = [-3, -2, -1, 0, 1, 2, 3];

        const html = zScores.map(z => {
            const targetDays = projectDuration + z * projectSigma;
            
            // Obtener solo la probabilidad (el 4to parámetro es false por defecto)
            const probability = ProbabilityService.calculateProbabilityForDays(
                targetDays, projectDuration, projectSigma
            );
            const targetDate = DateUtils.addDays(this.appState.startDate, targetDays);
            
            const daysText = (Math.abs(targetDays - projectDuration) < 0.01) // Comparación para punto flotante
                ? `${targetDays.toFixed(2)} (TE)` 
                : targetDays.toFixed(2);
            
            return `
                <tr class="${z === 0 ? 'bg-purple-100 font-bold' : 'hover:bg-gray-50'}">
                    <td class="border border-purple-300 p-2 text-center">${daysText}</td>
                    <td class="border border-purple-300 p-2 text-center text-xs">${DateUtils.format(targetDate)}</td>
                    <td class="border border-purple-300 p-2 text-center">${z.toFixed(2)}σ</td>
                    <td class="border border-purple-300 p-2 text-center text-purple-700">${probability.toFixed(2)} %</td>
                </tr>
            `;
        }).join('');

        // Se corrigió el uso del ID correcto: 'probability-table' (que es el <tbody>)
        this.elements.probabilityTable.innerHTML = html;

        // Mostrar el análisis de rango
        if (projectSigma === 0) {
            this.elements.rangeAnalysis.innerHTML = '<p class="text-center p-4 text-green-700">La desviación estándar es cero. La duración del proyecto es determinística.</p>';
            return;
        }

        // Probabilidad de estar entre -1σ y +1σ (Aproximadamente 68.27% para distribución normal)
        const probPlusOneSigma = ProbabilityService.calculateProbabilityForDays(projectDuration + projectSigma, projectDuration, projectSigma);
        const probMinusOneSigma = ProbabilityService.calculateProbabilityForDays(projectDuration - projectSigma, projectDuration, projectSigma);
        const probOneSigmaRange = probPlusOneSigma - probMinusOneSigma;
        
        // Probabilidad de estar entre -2σ y +2σ (Aproximadamente 95.45%)
        const probPlusTwoSigma = ProbabilityService.calculateProbabilityForDays(projectDuration + (2 * projectSigma), projectDuration, projectSigma);
        const probMinusTwoSigma = ProbabilityService.calculateProbabilityForDays(projectDuration - (2 * projectSigma), projectDuration, projectSigma);
        const probTwoSigmaRange = probPlusTwoSigma - probMinusTwoSigma;
        
        this.elements.rangeAnalysis.innerHTML = `
            <div class="p-4 bg-white rounded-lg shadow-inner border-l-4 border-purple-400">
                <p class="font-semibold text-sm text-gray-600 mb-1">μ ± 1σ (Riesgo Moderado)</p>
                <p class="text-xl font-bold text-purple-600">${probOneSigmaRange.toFixed(2)} %</p>
                <p class="text-xs text-gray-500">Completar entre ${ (projectDuration - projectSigma).toFixed(2) } y ${ (projectDuration + projectSigma).toFixed(2) } días.</p>
            </div>
            <div class="p-4 bg-white rounded-lg shadow-inner border-l-4 border-purple-600">
                <p class="font-semibold text-sm text-gray-600 mb-1">μ ± 2σ (Riesgo Bajo)</p>
                <p class="text-xl font-bold text-purple-600">${probTwoSigmaRange.toFixed(2)} %</p>
                <p class="text-xs text-gray-500">Completar entre ${ (projectDuration - (2 * projectSigma)).toFixed(2) } y ${ (projectDuration + (2 * projectSigma)).toFixed(2) } días.</p>
            </div>
            <div class="p-4 bg-white rounded-lg shadow-inner border-l-4 border-indigo-400">
                <p class="font-semibold text-sm text-gray-600 mb-1">Duración Esperada (μ)</p>
                <p class="text-xl font-bold text-indigo-600">${projectDuration.toFixed(2)} días</p>
                <p class="text-xs text-gray-500">Desviación Estándar (σ): ${projectSigma.toFixed(2)} días.</p>
            </div>
            <div class="p-4 bg-white rounded-lg shadow-inner border-l-4 border-indigo-600">
                <p class="font-semibold text-sm text-gray-600 mb-1">Probabilidad Esperada</p>
                <p class="text-xl font-bold text-indigo-600">50.00 %</p>
                <p class="text-xs text-gray-500">Probabilidad de terminar el proyecto en ${projectDuration.toFixed(2)} días o antes.</p>
            </div>
        `;
    }
}