const GRID_SIZE = 40;
const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;
const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;
let money = 1000;
let maxGuests = 30;
let guests = [];
let buildings = [];
let particles = [];
let selectedTool = null;
let frameCount = 0;
let parkWidth = 15;
let parkHeight = 12;
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
    duration: 60,
    state: 'idle',
    timer: 0
};
buildings.push(ticketBooth);
function toggleUpgrades() {
    const menu = document.getElementById('upgrades-menu');
    menu.classList.toggle('hidden');
}
window.buyUpgrade = function(type) {
    if (type === 'expand_land') {
        if (money >= 500) {
            updateMoney(-500);
            parkWidth += 5;
            parkHeight += 5;
            spawnFloatingText("Park expanded!", canvas.width / 2, canvas.height / 2, '#f1c40f');
        } else {
            alert("Not enough money");
        }
    } else if (type === 'marketing') {
        if (money >= 300) {
            updateMoney(-300);
            maxGuests += 10;
            document.getElementById('max-guests-display').innerText = maxGuests;
            spawnFloatingText("CAPACITY UP!", canvas.width / 2, canvas.height / 2, '#3498db');
        } else {
            alert("Not enough money");
        }
    } else if (type === 'fast_tickets') {
        if (money >= 200) {
            uppdateMoney(-200);
            ticketBooth.duration = 30;
            spawnFloatingText("Speedy tickets")
        }
    }
}
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
    document.querySelectorAll('.tool-button').forEach(button => button.classList.remove('active'));
    if (toolName) {
        document.getElementById(`btn-${toolName}`).classList.add('active');
    }
}
function spawnFloatingText(text, x, y, color) {
    particles.push(new FloatingText(text, x, y, color));
}
function processBuildings() {
    buildings.forEach(b => {
        if (b.type === 'path') return;
        if (b.type === 'ticket_booth') {
            if (b.state === 'idle' && b.queue.length > 0) {
                b.state = 'processing';
                b.timer = b.duration;
                const guest = b.queue.shift();
                b.riders = [guest];
            } else if (b.state === 'processing') {
                b.timer--;
                if (b.timer <= 0) {
                    const guest = b.riders[0];
                    if (guest) {
                        guest.money -= 15;
                        updateMoney(15);
                        spawnFloatingText("+$15", b.x * GRID_SIZE, b.y * GRID_SIZE);
                        guest.state = 'wandering';
                        guest.pickNewAction();
                    }
                    b.riders = [];
                    b.state = 'idle';
                }
            }
        } else {
            if (b.state === 'idle') {
                if (b.queue.length = 0) {
                    while (b.riders.length < b.capacity && b.queue.length > 0) {
                        const guest = b.queue.shift();
                        const cost = (b.type === 'burger') ? 10 : 25;
                        guest.money -= cost;
                        updateMoney(cost);
                        spawnFloatingText(`+$${cost}`, b.x * GRID_SIZE + GRID_SIZE/2, b.y * GRID_SIZE);
                        b.riders.push(guest);
                    }
                    b.state = 'running';
                    b.timer = b.duration;
                }
            } else if (b.state === 'running') {
                b.timer--;
                if (b.timer <= 0) {
                    b.riders.forEach(g => {
                        g.state = 'wandering';
                        g.x = b.x * GRID_SIZE + GRID_SIZE / 2;
                        g.sy = b.y * GRID_SIZE + GRID_SIZE + 5;
                        g.pickNewAction();
                    });
                    b.riders = [];
                    b.state = 'idle';
                }
            }
        }
    });
}
canvas.addEventListener('mouesdown', (e) => {
    if (!selectedTool) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const gridX = Math.floor(mouseX / GRID_SIZE);
    const gridY = Math.floor(mouseY / GRID_SIZE);
    const existingIndex = buildings.findIndex(b => b.x === gridX && b.y === gridY);
    if (selectedTool === 'delete') {
        if (existingIndex !== -1) {
            const b = buildings[existingIndex];
            if (b.type === 'ticket_booth') {
                alert("You can't delete the entrance!");
                return;
            }
            b.queue.forEach(g => {
                g.state = 'wandering';
                g.pickNewAction();
            });
            b.riders.forEach(g => {
                g.state = 'wandering';
                g.pickNewAction();
            });

            buildings.splice(existingIndex, 1);
            updateMoney(-50);
            spawnFloatingText("-$50", mouseX, mouseY, '#e74c3c');
        }
        return;
    }
    if (existingIndex === -1) {
        let cost = 0;
        let building = {
            x: gridX, y: gridY, type: selectedTool, queue: [], riders: [], state: 'idle', timer: 0
        };
        if (selectedTool === 'path') {
            cost = 10;
        } else if (selectedTool === 'burger') {
            cost = 200;
            building.capacity = 1;
            building.duration = 40;
        } else if (selectedTool === 'ride_swing') {
            cost = 500;
            building.capacity = 4;
            building.duration = 180;
            building.swingAngle = 0;
        }
        
        if (money >= cost) {
            updateMoney(-cost);
            buildings.push(building);
            spawnFloatingText(`-$${cost}`, mouseX, mouseY, '#e74c3c');
        } else {
            alert("Not enough money :(")
        }
    }
});
function drawGrid() {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawBuilding(b) {
    const px = b.x * GRID_SIZE;
    const py = b.y * GRID_SIZE;
    const cx = px + GRID_SIZE / 2;
    const cy = py + GRID_SIZE / 2;
    if (b.queue.length > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(px - 10, py, 5, Math.min(b.queue.length * 5, GRID_SIZE));
    }
    if (b.type === 'path') {
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(px, py, GRID_SIZE, GRID_SIZE);
    } else if (b.type === 'ticket_booth') {
        ctx.fillStyle = '#8e44ad';
        ctx.fillRect(px, py + 10, GRID_SIZE, GRID_SIZE - 10);
        ctx.fillStyle = '#9b59b6';
        ctx.beginPath();
        ctx.moveTo(px, py + 8);
        ctx.lineTo(cx, py - 3);
        ctx.lineTo(px + GRID_SIZE, py + 10);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Calibri';
        ctx.textAlign = 'center';
        ctx.fillText('ENTRY', cx, cy + 10);
    } else if (b.type === 'burger') {
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(px + 5, py + 10, GRID_SIZE - 10, GRID_SIZE - 10);
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(px, py + 10);
        ctx.lineTo(cx, py - 5);
        ctx.lineTo(px + GRID_SIZE, py + 10);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.Font = '10px Calibri';
        ctx.textAlign = 'center';
        ctx.fillText('Burger', cx, cy + 5);

        if (b.state === 'running') {
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(px, py - 10, (b.timer / b.duration) * GRID_SIZE, 5);
        }
    } else if (b.type === 'ride_swing') {
        ctx.fillStyle = '#34495e';
        ctx.fillRect(px, py, GRID_SIZE, GRID_SIZE);
        let swing = 0;
        if (b.state === 'running') {
            swing = Math.sin(Date.now() / 200) * 1.2;
        } else {
            swing = Math.sin(Date.now() / 1000) * 0.1;
        }

        ctx.save();
        ctx.translate(cx, py + 5);
        ctx.strokeStyle = '#7f8c8d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-15, 35);
        ctx.moveTo(0, 0);
        ctx.lineTo(15, 35);
        ctx.stroke();
        ctx.rotate(swing); 
        ctx.strokeStyle = '#e67e22';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 25);
        ctx.stroke();
        ctx.fillStyle = b.state === 'running' ? '#e74c3c' : '#95a5a6';
        ctx.fillRect(-8, 25, 16, 8);
        ctx.restore();
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Calibri';
        ctx.fillText(`${b.riders.length}/${b.capacity}`, cx, py + GRID_SIZE - 2);
    }
}
function loop() {
    frameCount++;
    processBuildings();
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    buildings.forEach(drawBuilding);
    if (guests.length < 30 && Math.random() < 0.002) {
        guests.push(new Guest());
        document.getElementById('guest-display').innerText = guests.length;
    }
    guests.forEach(g => {
        g.update();
        g.draw();
    });
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw();
        if (p.life <= 0) particles.splice(i, 1);
    }
    requestAnimationFrame(loop);
}
loop();
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});