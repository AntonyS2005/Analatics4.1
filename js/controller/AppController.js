export class AppController {
    constructor() {
        this.activities = [];
        this.calculations = new ProjectCalculations();
        this.currentTab = 'activities';
        this.startDate = new Date();
        
        this.activityTable = null;
        this.resultsTable = null;
        this.networkDiagram = null;
        this.ganttDiagram = null;
        this.probabilityAnalysis = null;
    }

    initialize() {
        this._setupEventListeners();
        this._loadExampleData();
        this.changeTab('activities');
    }

    _setupEventListeners() {
        document.querySelectorAll('[id^="tab-"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.id.replace('tab-', '');
                this.changeTab(tab);
            });
        });

        document.getElementById('start-date')?.addEventListener('change', () => {
            this.updateDates();
        });
    }

    changeTab(tabName) {
        this.currentTab = tabName;

        ['activities', 'network', 'gantt', 'probability'].forEach(tab => {
            const btn = document.getElementById(`tab-${tab}`);
            const content = document.getElementById(`content-${tab}`);

            if (!btn || !content) return;

            if (tab === tabName) {
                btn.classList.add('tab-active');
                btn.classList.remove('tab-inactive');
                content.classList.remove('hidden');
            } else {
                btn.classList.remove('tab-active');
                btn.classList.add('tab-inactive');
                content.classList.add('hidden');
            }
        });

        this._renderCurrentTab();
    }

    _renderCurrentTab() {
        switch (this.currentTab) {
            case 'network':
                this.networkDiagram?.render(this.calculations);
                break;
            case 'gantt':
                this.ganttDiagram?.render(this.calculations, this.startDate);
                break;
            case 'probability':
                this.probabilityAnalysis?.render(this.calculations, this.startDate);
                break;
        }
    }

    addActivity() {
        const newId = this.activities.length > 0 
            ? Math.max(...this.activities.map(a => a.id)) + 1 
            : 1;
        
        const newActivity = new Activity(
            newId,
            String.fromCharCode(64 + newId)
        );
        
        this.activities.push(newActivity);
        this._recalculateAndRender();
    }

    deleteActivity(id) {
        if (!confirm('¿Estás seguro de eliminar esta actividad?')) return;
        
        this.activities = this.activities.filter(a => a.id !== id);
        this._recalculateAndRender();
    }

    updateActivity(id, field, value) {
        const activity = this.activities.find(a => a.id === id);
        if (!activity) return;

        if (['a', 'm', 'b'].includes(field)) {
            activity[field] = parseFloat(value) || 0;
        } else {
            activity[field] = value;
        }

        this._recalculateAndRender();
    }

    _recalculateAndRender() {
        const calculator = new PertCalculator(this.activities);
        this.calculations = calculator.calculate();
        
        this.activityTable?.render(this.activities);
        this.resultsTable?.render(this.calculations, this.startDate);
        this._renderCurrentTab();
    }

    _loadExampleData() {
        this.activities = [
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
        
        this._recalculateAndRender();
    }

    saveProject() {
        try {
            FileService.saveActivities(this.activities);
        } catch (error) {
            alert(error.message);
        }
    }

    async loadProject(file) {
        try {
            this.activities = await FileService.loadActivities(file);
            this._recalculateAndRender();
            this.changeTab('activities');
            alert('Proyecto cargado exitosamente.');
        } catch (error) {
            alert('Error al cargar el proyecto: ' + error.message);
        }
    }
}