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
        if (this.money < 10 || Math.random() < 0.005) {}
        if (Math.random() < 0.008 && buildings.length > 1) {
            const attractions = buildings.filter(b => b.type !== 'ticket_booth' && b.type !== 'path');
            if (attractions.length > 0) {
                const randomRide = attractions[Math.floor(Math.random() * attractions.length)];
                let cost = (randomRide.type === 'burger') ? 10 : 25;
                if (this.money >= cost) {
                    this.state = 'walking_to_ride';
                    this.goToBuilding(randomRide);
                    return;
                }
            }
        }
        this.state = 'wandering';
        this.targetX = Math.random() * (canvas.width - 50) + 25;
        this.targetY = Math.random() * (canvas.height - 50) + 25;
    }

    draw() {
        if (this.state === 'riding') return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
        if (this.state === 'entering') {
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Calibri';
            ctx.fillText('?', this.x, this.y - 10);
        }
    }
}

class FloatingText {
    constructor(text, x, y, color = '#2ecc71') {
        this.text = text;
        this.x = x;
        this.y = y;
        this.life = 60;
        this.vy = -1;
        this.color = color;
    }
    update() {
        this.y += this.vy;
        this.life--;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
    }
}
function updateMoney(amount) {
    money += amount;
    document.getElementById('money-display').innerText = money;
}
function selectTool(toolName) {
    selectedTool = toolName;
    
}