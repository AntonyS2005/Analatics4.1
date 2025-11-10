import { Activity } from './models/Activity.js';
import { PertCalculator } from './services/PertCalculator.js';
import { FileService } from './services/FileService.js';
import { DateUtils } from './utils/DateUtils.js';
import { NetworkDiagram } from './ui/NetworkDiagram.js'
import { GanttDiagram } from './ui/GanttDiagram.js';
import { ProbabilityController } from './ui/ProbabilityController.js';

const appState = {
    activities: [],
    calculations: null,
    currentTab: 'activities',
    startDate: new Date(),
    networkDiagram: null,
    ganttDiagram: null,
    probabilityController: null,
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando aplicación PERT/CPM...');
    
    const today = DateUtils.getTodayISO();
    document.getElementById('start-date').value = today;
    appState.startDate = new Date(today);
    
    const networkContainer = document.getElementById('network-diagram');
    const ganttContainer = document.getElementById('gantt-diagram');
    
    appState.networkDiagram = new NetworkDiagram(networkContainer);
    appState.ganttDiagram = new GanttDiagram(ganttContainer);
    appState.probabilityController = new ProbabilityController(appState);
    
    loadExample();
    setupEventListeners();
    
    console.log('✅ Aplicación iniciada correctamente');
});

function setupEventListeners() {
    document.querySelectorAll('[data-tab]').forEach(button => {
        button.addEventListener('click', (e) => {
            const tab = e.currentTarget.getAttribute('data-tab');
            changeTab(tab);
        });
    });
    
    document.getElementById('start-date')?.addEventListener('change', updateDates);
    
    document.getElementById('btn-add-activity')?.addEventListener('click', addActivity);
    document.getElementById('btn-load-example')?.addEventListener('click', loadExample);
    document.getElementById('btn-clear-all')?.addEventListener('click', clearAllActivities);
    document.getElementById('btn-save-project')?.addEventListener('click', saveProject);
    document.getElementById('btn-load-project')?.addEventListener('click', () => {
        document.getElementById('file-loader').click();
    });
    
    document.getElementById('file-loader')?.addEventListener('change', handleFileSelect);

    // NOTA: Se eliminaron los listeners duplicados para target-days y target-prob
    //       ya que el ProbabilityController los gestiona internamente.
}

function changeTab(tabName) {
    appState.currentTab = tabName;
    
    ['activities', 'network', 'gantt', 'probability'].forEach(tab => {
        const btn = document.getElementById(`tab-${tab}`);
        const content = document.getElementById(`content-${tab}`);
        
        if (!btn || !content) return;
        
        const isActive = tab === tabName;

        btn.classList.toggle('tab-active', isActive);
        btn.classList.toggle('tab-inactive', !isActive);
        btn.setAttribute('aria-selected', isActive);
        content.classList.toggle('hidden', !isActive);
    });
    
    renderCurrentTab();
}

function renderCurrentTab() {
    switch (appState.currentTab) {
        case 'network':
            renderNetworkDiagram();
            break;
        case 'gantt':
            renderGanttDiagram();
            break;
        case 'probability':
            renderProbabilityAnalysis();
            break;
    }
}

function addActivity() {
    const newId = appState.activities.length > 0 
        ? Math.max(...appState.activities.map(a => a.id)) + 1 
        : 1;
    
    const newActivity = new Activity(
        newId,
        String.fromCharCode(64 + newId),
        '',
        1, 2, 3
    );
    
    appState.activities.push(newActivity);
    recalculateAndRender();
}

function deleteActivity(id) {
    if (!confirm('¿Estás seguro de eliminar esta actividad?')) return;
    
    appState.activities = appState.activities.filter(a => a.id !== id);
    recalculateAndRender();
}

function clearAllActivities() {
    if (!confirm('¿Estás seguro de borrar TODAS las actividades? Esta acción no se puede deshacer.')) return;
    
    appState.activities = [];
    recalculateAndRender();
}

function loadExample() {
    appState.activities = [
        new Activity(1, 'A', '', 5, 5, 5),
        new Activity(2, 'B', '', 4, 4, 4),
        new Activity(3, 'C', 'A,B', 6, 6, 6),
        new Activity(4, 'D', 'A,B', 5, 5, 5),
        new Activity(5, 'E', 'B', 4, 4, 4),
        new Activity(6, 'F', 'C', 2, 2, 2),
        new Activity(7, 'G', 'D', 8, 8, 8),
        new Activity(8, 'H', 'D,E', 4, 4, 4),
        new Activity(9, 'I', 'F,G,H', 4, 4, 4)
    ];
    
    recalculateAndRender();
}

function updateActivity(id, field, value) {
    const activity = appState.activities.find(a => a.id === id);
    if (!activity) return;
    
    if (['a', 'm', 'b'].includes(field)) {
        activity[field] = parseFloat(value) || 0;
    } else {
        activity[field] = value;
    }
    
    recalculateAndRender();
}

function recalculateAndRender() {
    const calculator = new PertCalculator(appState.activities);
    appState.calculations = calculator.calculate();
    
    renderActivitiesTable();
    renderResultsTable();
    renderCurrentTab();
}

function renderActivitiesTable() {
    const tbody = document.getElementById('activities-table');
    
    if (!tbody) return;

    if (appState.activities.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center p-4 text-gray-500">
                    No hay actividades. Haz clic en "Agregar" o "Ejemplo"
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = appState.activities.map(act => `
        <tr class="hover:bg-gray-50">
            <td class="border border-gray-300 p-2">
                <input type="text" value="${act.name}" data-id="${act.id}" data-field="name" class="activity-input w-full px-2 py-1 border rounded focus:ring-2 focus:ring-indigo-300">
            </td>
            <td class="border border-gray-300 p-2">
                <input type="text" value="${act.predecessors}" data-id="${act.id}" data-field="predecessors" placeholder="A,B" class="activity-input w-full px-2 py-1 border rounded focus:ring-2 focus:ring-indigo-300">
            </td>
            <td class="border border-gray-300 p-2">
                <input type="number" value="${act.a}" data-id="${act.id}" data-field="a" class="activity-input w-full px-2 py-1 border rounded focus:ring-2 focus:ring-indigo-300" step="0.1" min="0">
            </td>
            <td class="border border-gray-300 p-2">
                <input type="number" value="${act.m}" data-id="${act.id}" data-field="m" class="activity-input w-full px-2 py-1 border rounded focus:ring-2 focus:ring-indigo-300" step="0.1" min="0">
            </td>
            <td class="border border-gray-300 p-2">
                <input type="number" value="${act.b}" data-id="${act.id}" data-field="b" class="activity-input w-full px-2 py-1 border rounded focus:ring-2 focus:ring-indigo-300" step="0.1" min="0">
            </td>
            <td class="border border-gray-300 p-2 text-center">
                <button data-delete-id="${act.id}" class="btn-delete-activity text-red-600 hover:text-red-800 transition p-1" title="Eliminar Actividad">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');
    
    tbody.querySelectorAll('.activity-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const id = parseInt(e.target.getAttribute('data-id'));
            const field = e.target.getAttribute('data-field');
            updateActivity(id, field, e.target.value);
        });
    });
    
    tbody.querySelectorAll('.btn-delete-activity').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.getAttribute('data-delete-id'));
            deleteActivity(id);
        });
    });
}

function renderResultsTable() {
    const endDate = DateUtils.addDays(appState.startDate, appState.calculations.projectDuration);
    
    document.getElementById('project-duration').textContent = `${appState.calculations.projectDuration.toFixed(2)} días`;
    document.getElementById('project-end-date').textContent = `Fecha fin: ${DateUtils.format(endDate)}`;
    document.getElementById('project-sigma').textContent = `${appState.calculations.projectSigma.toFixed(2)} días`;
    document.getElementById('critical-path').textContent = appState.calculations.criticalPath.join(' → ') || '-';
    document.getElementById('critical-count').textContent = `${appState.calculations.criticalPath.length} actividades`;
    document.getElementById('total-activities').textContent = appState.activities.length;
    document.getElementById('critical-activities').textContent = `${appState.calculations.criticalPath.length} críticas`;
    
    const tbody = document.getElementById('results-table');
    
    if (!tbody) return;

    if (appState.calculations.activities.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center p-4 text-gray-500">
                    No hay datos para mostrar
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = appState.calculations.activities.map(act => {
        const startDateAct = DateUtils.addDays(appState.startDate, act.es);
        const endDateAct = DateUtils.addDays(appState.startDate, act.ef);
        
        return `
            <tr class="${act.isCritical ? 'critical-row' : 'hover:bg-gray-50'}">
                <td class="border border-gray-300 p-2 text-center font-bold">${act.name}</td>
                <td class="border border-gray-300 p-2 text-center">${act.te.toFixed(2)}</td>
                <td class="border border-gray-300 p-2 text-center">${act.sigma.toFixed(2)}</td>
                <td class="border border-gray-300 p-2 text-center">${act.es.toFixed(2)}</td>
                <td class="border border-gray-300 p-2 text-center">${act.ef.toFixed(2)}</td>
                <td class="border border-gray-300 p-2 text-center">${act.ls.toFixed(2)}</td>
                <td class="border border-gray-300 p-2 text-center">${act.lf.toFixed(2)}</td>
                <td class="border border-gray-300 p-2 text-center ${act.slack > 0.01 ? 'bg-yellow-100' : ''}">
                    ${act.slack.toFixed(2)}
                </td>
                <td class="border border-gray-300 p-2 text-center text-xs">${DateUtils.format(startDateAct)}</td>
                <td class="border border-gray-300 p-2 text-center text-xs">${DateUtils.format(endDateAct)}</td>
                <td class="border border-gray-300 p-2 text-center">${act.isCritical ? '✅' : ''}</td>
            </tr>
        `;
    }).join('');
}

function updateDates() {
    const dateInput = document.getElementById('start-date').value;
    appState.startDate = new Date(dateInput);
    
    renderResultsTable();
    
    if (appState.currentTab === 'gantt') {
        renderGanttDiagram();
    } else if (appState.currentTab === 'probability') {
        renderProbabilityAnalysis();
    }
}

function saveProject() {
    try {
        FileService.saveActivities(appState.activities);
    } catch (error) {
        alert(error.message);
    }
}

async function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        appState.activities = await FileService.loadActivities(file);
        recalculateAndRender();
        changeTab('activities');
        alert('Proyecto cargado exitosamente.');
    } catch (error) {
        alert('Error al cargar el proyecto: ' + error.message);
    }
    
    event.target.value = null;
}

function renderNetworkDiagram() {
    appState.networkDiagram.render(appState.calculations);
}

function renderGanttDiagram() {
    appState.ganttDiagram.render(appState.calculations, appState.startDate);
}

function renderProbabilityAnalysis() {
    appState.probabilityController.render();
}

window.appState = appState;