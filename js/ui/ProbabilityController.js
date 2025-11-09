// src/ui/ProbabilityController.js

import { ProbabilityService } from '../services/ProbabilityService.js';
import { DateUtils } from '../utils/DateUtils.js';

export class ProbabilityController {
    
    constructor(appState) {
        this.appState = appState;
        
        // CORRECCIÓN CLAVE: Mapear los nombres internos del JS a los IDs reales del HTML
        this.elements = {
            // Calculadora 1: Días -> Probabilidad
            targetDaysInput: document.getElementById('target-days'),
            resultProbContainer: document.getElementById('probability-result'), // Contenedor principal
            resultProb: document.getElementById('probability-percent'), // Porcentaje (%)
            zValueOutput: document.getElementById('z-value'), // Valor Z
            zFormulaOutput: document.getElementById('z-formula'), // Fórmula Z
            probabilityText: document.getElementById('probability-text'), // Texto de resultado
            probabilityDate: document.getElementById('probability-date'), // Fecha de resultado
            
            // Calculadora 2: Probabilidad -> Días
            targetProbInput: document.getElementById('target-prob'),
            resultDaysContainer: document.getElementById('days-result'), // Contenedor principal
            resultDays: document.getElementById('days-needed'), // Días
            resultDate: document.getElementById('days-date'), // Fecha
            zInverseOutput: document.getElementById('z-inverse'), // Valor Z Inverso
            daysFormulaOutput: document.getElementById('days-formula'), // Fórmula Días
            daysText: document.getElementById('days-text'), // Texto de resultado
            
            // Tabla y Análisis
            probabilityTable: document.getElementById('probability-table'), // Era 'probability-table-tbody', pero el tbody no tiene ese ID. Usamos el ID del <tbody> real.
            rangeAnalysis: document.getElementById('range-analysis'), // ID corregido de 'resultRangeAnalysis'
            
            probabilitySection: document.getElementById('content-probability'),
        };

        // Escuchar cambios en los inputs para recalcular automáticamente
        this.elements.targetDaysInput.addEventListener('input', () => this.calculateProbability());
        this.elements.targetProbInput.addEventListener('input', () => this.calculateDays());
    }

    /**
     * Función principal para renderizar la vista probabilística y configurar valores iniciales.
     */
    render() {
        // Validación de cálculos
        if (!this.appState.calculations || this.appState.calculations.projectDuration === 0) {
            // Esto solo oculta el contenido. Si necesitas reemplazar el HTML completo, necesitas el HTML de fallback.
            this.elements.probabilitySection.classList.add('hidden');
            return;
        }
        
        this.elements.probabilitySection.classList.remove('hidden');

        const projectDuration = this.appState.calculations.projectDuration;
        
        // 1. Mostrar la duración crítica como valor objetivo inicial (días)
        this.elements.targetDaysInput.value = projectDuration.toFixed(1); 
        
        // 2. Inicializar ambos cálculos
        this.calculateProbability(); 
        this.calculateDays(); // Inicializar días necesarios para un porcentaje por defecto (ej. 95%)
        
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
        const targetDays = parseFloat(this.elements.targetDaysInput.value);
        
        this.elements.resultProbContainer.classList.remove('hidden'); // Mostrar resultados

        if (isNaN(targetDays) || targetDays < 0 || projectSigma === 0) {
            this.elements.resultProb.textContent = (projectSigma === 0) ? '0%' : 'N/A';
            this.elements.probabilityText.textContent = (projectSigma === 0) ? 'Riesgo 0. Desviación 0.' : 'Ingrese días válidos';
            this.elements.zValueOutput.textContent = '';
            this.elements.zFormulaOutput.textContent = '';
            this.elements.probabilityDate.textContent = '';
            return;
        }

        const { probability, zScore, zTableProb } = ProbabilityService.calculateProbabilityForDays(
            targetDays,
            projectDuration,
            projectSigma,
            true // Devuelve detalles
        );
        
        const targetDate = DateUtils.addDays(startDate, targetDays);

        // Rellenar resultados en el DOM
        this.elements.resultProb.textContent = `${probability.toFixed(2)} %`;
        this.elements.zValueOutput.textContent = `Valor Z: ${zScore.toFixed(3)}`;
        this.elements.zFormulaOutput.textContent = `Probabilidad de Tabla (p): ${zTableProb.toFixed(4)}`;
        this.elements.probabilityDate.textContent = `Fecha de finalización objetivo: ${DateUtils.format(targetDate)}`;

        if (probability > 90) {
            this.elements.probabilityText.textContent = '¡Alto nivel de confianza! El proyecto tiene una alta probabilidad de completarse a tiempo.';
        } else if (probability < 50) {
            this.elements.probabilityText.textContent = 'Bajo nivel de confianza. Se necesitan más días para alcanzar una probabilidad aceptable.';
        } else {
            this.elements.probabilityText.textContent = 'Nivel de confianza moderado. Monitoree de cerca la ruta crítica.';
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
        const targetProbPercent = parseFloat(this.elements.targetProbInput.value);
        
        this.elements.resultDaysContainer.classList.remove('hidden'); // Mostrar resultados

        if (isNaN(targetProbPercent) || targetProbPercent < 1 || targetProbPercent > 99 || projectSigma === 0) {
            this.elements.resultDays.textContent = (projectSigma === 0) ? 'N/A' : 'Ingrese prob. (1-99)';
            this.elements.resultDate.textContent = '';
            this.elements.zInverseOutput.textContent = '';
            this.elements.daysFormulaOutput.textContent = '';
            this.elements.daysText.textContent = (projectSigma === 0) ? 'Riesgo 0. Desviación 0.' : '';
            return;
        }
        
        const { days, zInverse } = ProbabilityService.calculateDaysForProbability(
            targetProbPercent,
            projectDuration,
            projectSigma,
            true // Devuelve detalles
        );
        
        const targetDate = DateUtils.addDays(startDate, days);

        // Rellenar resultados en el DOM
        this.elements.resultDays.textContent = `${days.toFixed(2)} días`;
        this.elements.resultDate.textContent = `Fecha: ${DateUtils.format(targetDate)}`;
        this.elements.zInverseOutput.textContent = `Valor Z inverso: ${zInverse.toFixed(3)}`;
        this.elements.daysFormulaOutput.textContent = `Fórmula: μ + Zσ`;
        
        if (days > projectDuration) {
            this.elements.daysText.textContent = `Para un ${targetProbPercent}% de probabilidad, debes permitir ${(days - projectDuration).toFixed(2)} días adicionales al esperado.`;
        } else {
            this.elements.daysText.textContent = 'La duración requerida es menor que la duración esperada. ¡Excelente colchón de tiempo!';
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
            
            const daysText = targetDays.toFixed(2) === projectDuration.toFixed(2) 
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
        // Se corrigió el uso del ID correcto: 'range-analysis'
        
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
                <p class="text-xs text-gray-500">Probabilidad de terminar el proyecto exactamente en μ días.</p>
            </div>
        `;
    }
}