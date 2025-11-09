export class NetworkDiagram {

    /**
     * @param {HTMLElement} containerElement El elemento <div> donde se renderizará el diagrama.
     */
    constructor(containerElement) {
        if (!containerElement) {
            throw new Error("NetworkDiagram requires a valid container element.");
        }
        this.container = containerElement;
        this.network = null;

        // Opciones por defecto para un diagrama PERT (LR = Left-to-Right)
        this.options = {
            layout: {
                hierarchical: {
                    direction: 'LR',
                    sortMethod: 'directed',
                    nodeSpacing: 200,
                    levelSeparation: 300,
                }
            },
            physics: {
                enabled: false // Deshabilitar físicas para un layout estático
            },
            nodes: {
                shape: 'box',
                margin: 15,
                borderWidth: 2,
                borderWidthSelected: 3,
                font: {
                    multi: true,
                    face: 'Inter, system-ui, -apple-system, sans-serif',
                    align: 'center',
                    size: 13,
                    color: '#1f2937',
                    bold: { color: '#111827', size: 14 }
                },
                shadow: {
                    enabled: true,
                    color: 'rgba(0,0,0,0.1)',
                    size: 8,
                    x: 0,
                    y: 2
                },
                shapeProperties: {
                    borderRadius: 8
                }
            },
            edges: {
                width: 2,
                arrows: {
                    to: { 
                        enabled: true, 
                        scaleFactor: 0.8,
                        type: 'arrow'
                    }
                },
                smooth: {
                    enabled: true,
                    type: 'cubicBezier',
                    forceDirection: 'horizontal',
                    roundness: 0.5
                },
                shadow: {
                    enabled: true,
                    color: 'rgba(0,0,0,0.08)',
                    size: 4,
                    x: 0,
                    y: 1
                }
            },
            interaction: {
                hover: true,
                tooltipDelay: 200,
                zoomView: true,
                dragView: true
            }
        };
    }

    /**
     * Renderiza el diagrama de red basado en los cálculos del proyecto.
     * @param {ProjectCalculations} calculations El objeto de cálculos que contiene las actividades.
     */
    render(calculations) {
        // 1. Validar Vis.js
        if (typeof vis === 'undefined') {
            this.container.innerHTML = '<p class="text-center p-10 text-red-500">Error: La librería Vis.js no está cargada.</p>';
            return;
        }

        // 2. Validar datos
        if (!calculations || calculations.isEmpty() || calculations.activities.length === 0) {
            this.container.innerHTML = '<p class="text-center p-10 text-gray-500">No hay actividades para mostrar</p>';
            if (this.network) {
                this.network.destroy();
                this.network = null;
            }
            return;
        }

        // 3. Transformar datos
        try {
            const { nodes, edges } = this._transformData(calculations.activities);
            const data = { nodes, edges };

            // 4. Renderizar la red
            if (this.network) {
                this.network.destroy(); // Limpiar red anterior
            }
            this.network = new vis.Network(this.container, data, this.options);
        } catch (error) {
            console.error("Error al renderizar el diagrama de red:", error);
            this.container.innerHTML = `<p class="text-center p-10 text-red-700">Error al procesar los datos del diagrama: ${error.message}</p>`;
        }
    }

    /**
     * Convierte la lista de actividades en nodos y aristas para Vis.js
     * @param {Array} activities
     * @returns {{nodes: vis.DataSet, edges: vis.DataSet}}
     */
    _transformData(activities) {
        const nodes = new vis.DataSet();
        const edges = new vis.DataSet();

        // Nombres de actividades que son predecesoras de al menos una
        const allPredecessorNames = new Set(
            activities.flatMap(a =>
                a.predecessors.split(',')
                    .map(p => p.trim())
                    .filter(p => p)
            )
        );

        // --- NODO DE INICIO ---
        nodes.add({
            id: 'START',
            label: '<b>Inicio</b>',
            color: { 
                background: '#6ee7b7',
                border: '#10b981'
            },
            shape: 'ellipse',
            font: { size: 14, color: '#065f46' }
        });

        // --- NODOS DE ACTIVIDAD ---
        activities.forEach(act => {
            const label = this._createNodeLabel(act);
            const color = act.isCritical
                ? { 
                    background: '#fee2e2',
                    border: '#ef4444',
                    highlight: { background: '#fecaca', border: '#dc2626' }
                }
                : { 
                    background: '#e0e7ff',
                    border: '#6366f1',
                    highlight: { background: '#c7d2fe', border: '#4f46e5' }
                };

            nodes.add({
                id: act.name,
                label: label,
                color: color,
                borderWidth: act.isCritical ? 3 : 2
            });

            // --- ARISTAS (Conexiones) ---
            const preds = act.predecessors.split(',')
                .map(p => p.trim())
                .filter(p => p);

            if (preds.length === 0) {
                // Conectar desde el nodo de INICIO
                edges.add(this._createEdge('START', act.name, act.isCritical));
            } else {
                // Conectar desde cada predecesora
                preds.forEach(predName => {
                    const predAct = activities.find(a => a.name === predName);
                    const isCriticalEdge = predAct && predAct.isCritical && act.isCritical;
                    edges.add(this._createEdge(predName, act.name, isCriticalEdge));
                });
            }

            // Conectar al nodo de FIN
            if (!allPredecessorNames.has(act.name)) {
                if (!nodes.get('END')) {
                    nodes.add({
                        id: 'END',
                        label: '<b>Fin</b>',
                        color: { 
                            background: '#6ee7b7',
                            border: '#10b981'
                        },
                        shape: 'ellipse',
                        font: { size: 14, color: '#065f46' }
                    });
                }
                edges.add(this._createEdge(act.name, 'END', act.isCritical));
            }
        });

        return { nodes, edges };
    }

    /**
     * Helper para crear la etiqueta de un nodo en formato PERT.
     * @param {Object} act
     * @returns {string}
     */
    _createNodeLabel(act) {
        const es = act.es.toFixed(1);
        const ef = act.ef.toFixed(1);
        const ls = act.ls.toFixed(1);
        const lf = act.lf.toFixed(1);
        const te = act.te.toFixed(1);
        const slack = act.slack.toFixed(1);

        // Formato moderno con mejor legibilidad
        return `<b>${act.name}</b>\n━━━━━━━━━━━\n` +
               `ES: ${es}  |  tₑ: ${te}  |  EF: ${ef}\n` +
               `LS: ${ls}  |  S: ${slack}  |  LF: ${lf}`;
    }

    /**
     * Helper para crear un objeto de arista (edge).
     * @param {string} from
     * @param {string} to
     * @param {boolean} isCritical
     * @returns {Object}
     */
    _createEdge(from, to, isCritical) {
        return {
            from: from,
            to: to,
            color: isCritical 
                ? { color: '#ef4444', highlight: '#dc2626', hover: '#f87171' }
                : { color: '#9ca3af', highlight: '#6b7280', hover: '#6366f1' },
            width: isCritical ? 3 : 2
        };
    }
}