// src/ui/GanttDiagram.js

import { DateUtils } from '../utils/DateUtils.js'; // Ajusta la ruta si es necesario

export class GanttDiagram {

    /**
     * @param {SVGElement} svgElement El elemento <svg> donde se renderizará el diagrama.
     */
    constructor(svgElement) {
        if (!svgElement || svgElement.tagName.toLowerCase() !== 'svg') {
            throw new Error("GanttDiagram requires a valid <svg> element.");
        }
        this.svg = svgElement;

        // --- Constantes de Configuración del Gráfico ---
        this.ROW_HEIGHT = 30;         // Altura de cada fila de actividad
        this.BAR_HEIGHT = 18;         // Altura de la barra de tarea
        this.HEADER_HEIGHT = 50;      // Espacio para la escala de tiempo
        this.SIDEBAR_WIDTH = 100;     // Espacio para los nombres de tareas
        this.DAY_WIDTH = 30;          // Ancho en píxeles de un día
        this.ARROW_OFFSET = 10;       // Espacio para las flechas
        
        // Colores
        this.COLOR_BAR = '#31708F';
        this.COLOR_BAR_CRITICAL = '#A94442';
        this.COLOR_SLACK = '#f0f0f0';
        this.COLOR_ARROW = '#555';
        this.COLOR_TEXT = '#333';
        this.COLOR_TEXT_LIGHT = '#777';
    }

    /**
     * Renderiza el diagrama de Gantt completo.
     * @param {ProjectCalculations} calculations 
     * @param {Date} startDate 
     */
    render(calculations, startDate) {
        // 1. Validar datos
        if (!calculations || calculations.isEmpty() || calculations.activities.length === 0) {
            this._renderEmpty();
            return;
        }

        // 2. Limpiar y preparar el SVG
        this.svg.innerHTML = ''; // Limpiar contenido anterior
        
        // 3. Ordenar actividades para el gráfico
        const activities = [...calculations.activities].sort((a, b) => a.es - b.es || a.name.localeCompare(b.name));
        const totalDuration = Math.ceil(calculations.projectDuration);

        // 4. Calcular dimensiones del SVG
        const chartHeight = this.HEADER_HEIGHT + (activities.length * this.ROW_HEIGHT);
        const chartWidth = this.SIDEBAR_WIDTH + (totalDuration * this.DAY_WIDTH) + 50; // 50 de padding
        
        this.svg.setAttribute('viewBox', `0 0 ${chartWidth} ${chartHeight}`);
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', chartHeight); // Altura fija basada en contenido

        // 5. Definir el marcador de flecha (lo usamos en _renderArrows)
        this._createArrowMarker();

        // 6. Renderizar las partes del gráfico
        const groups = {
            header: this._createSVGElement('g', { 'class': 'gantt-header' }),
            sidebar: this._createSVGElement('g', { 'class': 'gantt-sidebar' }),
            bars: this._createSVGElement('g', { 'class': 'gantt-bars' }),
            arrows: this._createSVGElement('g', { 'class': 'gantt-arrows' })
        };
        
        // Mapa para que las flechas sepan la posición 'y' de cada actividad
        const activityYMap = new Map();

        activities.forEach((act, index) => {
            const y = this.HEADER_HEIGHT + (index * this.ROW_HEIGHT);
            activityYMap.set(act.name, y + this.ROW_HEIGHT / 2); // Guardar el centro de la fila

            this._renderSidebarRow(groups.sidebar, act, y);
            this._renderBarRow(groups.bars, act, y);
        });

        this._renderHeader(groups.header, totalDuration, startDate);
        this._renderArrows(groups.arrows, activities, activityYMap);

        // 7. Añadir todo al SVG
        this.svg.appendChild(groups.header);
        this.svg.appendChild(groups.sidebar);
        this.svg.appendChild(groups.bars);
        this.svg.appendChild(groups.arrows);
    }

    _renderEmpty() {
        this.svg.innerHTML = '';
        this.svg.setAttribute('height', 100);
        this.svg.setAttribute('width', '100%');
        
        const text = this._createSVGElement('text', {
            x: '50%',
            y: '50%',
            'text-anchor': 'middle',
            fill: this.COLOR_TEXT_LIGHT
        });
        text.textContent = 'No hay actividades para mostrar';
        this.svg.appendChild(text);
    }

    _renderHeader(group, totalDuration, startDate) {
        for (let day = 0; day <= totalDuration; day++) {
            const x = this.SIDEBAR_WIDTH + (day * this.DAY_WIDTH);

            // Línea de la cuadrícula
            group.appendChild(this._createSVGElement('line', {
                x1: x, y1: this.HEADER_HEIGHT - 10,
                x2: x, y2: this.HEADER_HEIGHT + (this.svg.getAttribute('height') - this.HEADER_HEIGHT),
                stroke: this.COLOR_SLACK, 'stroke-width': 1
            }));

            // Etiqueta de Día (ej. Día 5)
            group.appendChild(this._createSVGElement('text', {
                x: x, y: this.HEADER_HEIGHT - 25,
                'text-anchor': 'middle', fill: this.COLOR_TEXT_LIGHT, 'font-size': '10px'
            }, `Día ${day}`));

            // Etiqueta de Fecha (ej. 09/nov)
            const date = DateUtils.addDays(startDate, day);
            const dateText = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            group.appendChild(this._createSVGElement('text', {
                x: x, y: this.HEADER_HEIGHT - 10,
                'text-anchor': 'middle', fill: this.COLOR_TEXT_LIGHT, 'font-size': '10px'
            }, dateText));
        }
    }

    _renderSidebarRow(group, act, y) {
        group.appendChild(this._createSVGElement('rect', {
            x: 0, y: y,
            width: this.SIDEBAR_WIDTH, height: this.ROW_HEIGHT,
            fill: '#f8f8f8', stroke: '#eee'
        }));
        
        group.appendChild(this._createSVGElement('text', {
            x: 10, y: y + this.ROW_HEIGHT / 2,
            'dominant-baseline': 'middle', fill: this.COLOR_TEXT, 'font-size': '12px'
        }, act.name));
    }

    _renderBarRow(group, act, y) {
        const barY = y + (this.ROW_HEIGHT - this.BAR_HEIGHT) / 2;

        // --- Barra de Holgura (Slack) ---
        // Se dibuja primero para que quede detrás
        if (act.slack > 0.01) {
            const slackX = this.SIDEBAR_WIDTH + (act.ef * this.DAY_WIDTH);
            const slackWidth = (act.lf - act.ef) * this.DAY_WIDTH;
            
            group.appendChild(this._createSVGElement('rect', {
                x: slackX, y: barY,
                width: slackWidth, height: this.BAR_HEIGHT,
                fill: this.COLOR_SLACK, rx: 3, ry: 3
            }));
        }

        // --- Barra de Actividad (Early Start a Early Finish) ---
        const barX = this.SIDEBAR_WIDTH + (act.es * this.DAY_WIDTH);
        const barWidth = (act.ef - act.es) * this.DAY_WIDTH; // act.te
        const barColor = act.isCritical ? this.COLOR_BAR_CRITICAL : this.COLOR_BAR;
        
        const bar = this._createSVGElement('rect', {
            x: barX, y: barY,
            width: Math.max(barWidth, 1), // Ancho mínimo de 1px
            height: this.BAR_HEIGHT,
            fill: barColor, rx: 3, ry: 3
        });

        // Tooltip (título)
        bar.appendChild(this._createSVGElement('title', {}, 
            `${act.name}\nDuración: ${act.te.toFixed(2)} días\nES: ${act.es.toFixed(2)} | EF: ${act.ef.toFixed(2)}\nLS: ${act.ls.toFixed(2)} | LF: ${act.lf.toFixed(2)}\nHolgura: ${act.slack.toFixed(2)}`
        ));
        
        group.appendChild(bar);
    }

   _renderArrows(group, activities, activityYMap) {
        activities.forEach(toAct => {
            
            // 👇 LÍNEA ORIGINAL (LA QUE FALLA)
            // const preds = toAct.getPredecessorsList();
            
            // 👇 NUEVA LÍNEA (LA SOLUCIÓN)
            const preds = toAct.predecessors
                .split(',')
                .map(p => p.trim())
                .filter(p => p);
            
            // El resto del código sigue igual...
            if (preds.length === 0) return;

            // Coordenada 'Y' de la actividad de destino
            const y2 = activityYMap.get(toAct.name);
            // ...
        });
    }
    _createArrowMarker() {
        const defs = this._createSVGElement('defs');
        const marker = this._createSVGElement('marker', {
            id: 'arrowhead',
            markerWidth: 6,
            markerHeight: 4,
            refX: 6, // Posiciona la punta de la flecha al final de la línea
            refY: 2,
            orient: 'auto'
        });
        marker.appendChild(this._createSVGElement('path', {
            d: 'M 0 0 L 6 2 L 0 4 z', // Forma de la flecha (un triángulo)
            fill: this.COLOR_ARROW
        }));
        defs.appendChild(marker);
        this.svg.appendChild(defs);
    }

    /**
     * Helper para crear elementos SVG
     * @param {string} tagName 
     * @param {Object} attributes 
     * @param {string} [textContent] 
     * @returns {SVGElement}
     */
    _createSVGElement(tagName, attributes = {}, textContent = '') {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tagName);
        for (const [key, value] of Object.entries(attributes)) {
            el.setAttribute(key, value);
        }
        if (textContent) {
            el.textContent = textContent;
        }
        return el;
    }
}