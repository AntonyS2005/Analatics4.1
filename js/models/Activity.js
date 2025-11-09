export class Activity {
    constructor(id, name, predecessors = '', a = 1, m = 2, b = 3) {
        this.id = id;
        this.name = name;
        this.predecessors = predecessors;
        this.a = a;
        this.m = m;
        this.b = b;
    }

    get te() {
        return (this.a + 4 * this.m + this.b) / 6;
    }

    get variance() {
        return Math.pow((this.b - this.a) / 6, 2);
    }

    get sigma() {
        return Math.sqrt(this.variance);
    }

    getPredecessorsList() {
        return this.predecessors
            .split(',')
            .map(p => p.trim())
            .filter(p => p);
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            predecessors: this.predecessors,
            a: this.a,
            m: this.m,
            b: this.b
        };
    }

    static fromJSON(json) {
        return new Activity(
            json.id,
            json.name,
            json.predecessors,
            json.a,
            json.m,
            json.b
        );
    }}