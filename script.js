const GRID_SIZE = 40;
const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;
let money = 1000;
let guests = [];
let buildings = [];
let particles = []; 
let selectedTool = null;
let frameCount = 0;
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
const ENTRANCE_GRID = {x: 2, y: 2};
const ticketBooth = {
    x: ENTRANCE_GRID.x,
    y: ENTRANCE_GRID.y,
    type: 'ticket_booth',
    queue: [],
    riders: [],
    capacity: 1, 
    duration: 30,
    state: 'idle',
    timer: 0
};
buildings.push(ticketBooth);

class Guest {
    constructor() {
        this.x = -20; 
        this.y = ENTRANCE_GRID.y * GRID_SIZE + GRID_SIZE / 2;
        this.targetX = this.x;
        this.targetY = this.y;
        this.size = 6;
        this.color = `hsl(${Math.random() * 360}, 70%, 60%)`;
        this.speed = 0.5 + Math.random() * 0.4;
        this.state = 'entering'; 
        this.targetBuilding = ticketBooth;
        this.money = 50 + Math.floor(Math.random() * 100);
        this.goToBuilding(ticketBooth);
    }

    update() {
        if (this.state === 'riding' || this.state === 'queuing') return;
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this.speed) {
            this.x += (dx / dist) * this.speed;
            this.y += (dy / dist) * this.speed;
        } else {
            this.handleArrival();
        }
    }

    goToBuilding(b) {
        this.targetBuilding = b;
        this.targetX = b.x * GRID_SIZE + GRID_SIZE / 2;
        this.targetY = b.y * GRID_SIZE + GRID_SIZE / 2;
    }

    handleArrival() {
        if (this.state === 'entering') {
            if (this.targetBuilding && this.targetBuilding.type === 'ticket_booth') {
                this.targetBuilding.queue.push(this);
                this.state = 'queuing';
            }
        }
        else if (this.state === 'wandering') {
            this.pickNewAction();
        }
        else if (this.state === 'walking_to_ride') {
            if (this.targetBuilding) {
                this.targetBuilding.queue.push(this);
                this.state = 'queuing';
            } else {
                this.state = 'wandering';
                this.pickNewAction();
            }
        }
    }
    pickNewAction() {
        
    }
}