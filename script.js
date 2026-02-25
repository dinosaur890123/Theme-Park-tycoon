const GRID_SIZE = 40;
const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;
const WORLD_WIDTH = 1000;
const WORLD_HEIGHT = 1000;
let money = 1000;
let maxGuests = 30;
let guests = [];
let buildings = [];
let particles = [];
let selectedTool = null;
let selectedBuilding = null;
let autoCollect = false;
let camera = {x: (WORLD_WIDTH /2 ) - (CANVAS_WIDTH /2 ), y: (WORLD_HEIGHT / 2) - (CANVAS_HEIGHT / 2)};
let isDragging = false;
let lastMouse = {x: 0, y: 0};
let frameCount = 0;
let parkWidth = 16;
let parkHeight = 12;
const PARK_ORIGIN_X = Math.floor(WORLD_WIDTH / GRID_SIZE / 2 - parkWidth / 2);
const PARK_ORIGIN_Y = Math.floor(WORLD_HEIGHT / GRID_SIZE / 2 - parkHeight / 2);
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const entrances = [
    {id: 0, x: PARK_ORIGIN_X + 2, y: PARK_ORIGIN_Y - 2, unlocked: true, price: 0},
    {id: 1, x: PARK_ORIGIN_X + 8, y: PARK_ORIGIN_Y - 2, unlocked: false, price: 500},
    {id: 2, x: PARK_ORIGIN_X + 14, y: PARK_ORIGIN_Y - 2, unlocked: false, price: 500},
    {id: 3, x: PARK_ORIGIN_X + 18, y: PARK_ORIGIN_Y + 4, unlocked: false, price: 800},
    {id: 4, x: PARK_ORIGIN_X + 18, y: PARK_ORIGIN_Y + 10, unlocked: false, price: 800},
    {id: 5, x: PARK_ORIGIN_X + 8, y: PARK_ORIGIN_Y + 14, unlocked: false, price: 600},
    {id: 6, x: PARK_ORIGIN_X - 2, y: PARK_ORIGIN_Y + 8, unlocked: false, price: 600},
    {id: 7, x: PARK_ORIGIN_X - 2, y: PARK_ORIGIN_Y + 2, unlocked: false, price: 600}
];
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
function getWorldMouse(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left + camera.x, y: e.clientY - rect.top + camera.y
    };
}
function updateMoney(amount) {
    money += amount;
    document.getElementById('money-display').innerText = Math.floor(money);
    updateGuestCapacity();
}
function updateGuestCapacity() {
    let cap = 5;
    const carParks = buildings.filter(b => b.type === 'car_park');
    carParks.forEach(cp => {
        cap += cp.capacity;
    });
    document.getElementById('max-guests-display').innerText = cap;
    return cap;
}
window.selectTool = function(toolName) {
    selectedTool = toolName;
    document.querySelectorAll('.tool-button').forEach(button => button.classList.remove('active'));
    if (toolName) {
        document.getElementById(`button-${toolName}`).classList.add('active');
        canvas.style.cursor = 'crosshair';
    } else {
        document.getElementById(`button-pointer`).classList.add('active');
        canvas.style.cursor = 'grab';
    }
};
window.toggleUpgrades = function() {
    document.getElementById('upgrades-menu').classList.toggle('hidden');
    document.getElementById('building-menu').classList.add('hidden');
};
window.buyGlobalUpgrade = function(type) {
    if (type === 'auto_collect') {
        if (money >= 2000 && !autoCollect) {
            updateMoney(-2000);
            autoCollect = true;
            document.getElementById('button-auto-collect').innerText = "Owned";
            document.getElementById('button-auto-collect').disabled = true;
            spawnFloatingText("Auto collect on!", camera.x + CANVAS_WIDTH / 2, camera.y + CANVAS_HEIGHT/2, '#ccac2b');
        }
    } else if (type === 'expand_land') {
        if (money >= 500) {
            updateMoney(-500);
            parkWidth += 2;
            parkHeight += 2;
            spawnFloatingText("Land expanded!", camera.x + CANVAS_WIDTH / 2, camera.y + CANVAS_HEIGHT / 2, '#c2a324');
        }
    }
};
function openBuildingMenu(b) {
    selectedBuilding = b;
    const menu = document.getElementById('building-menu');
    menu.classList.remove('hidden');
    document.getElementById('upgrades-menu').classList.add('hidden');
    let name = b.type.replace('_', ' ').toUpperCase();
    document.getElementById('b-menu-title').innerText = name;
    document.getElementById('b-menu-level').innerText = `Level ${b.level}`;
    document.getElementById('b-menu-stored').innerText = b.storedMoney;

    const upgradeCost = b.level * 150;
    const button = document.getElementById('b-menu-upgrade-button');
    button.innerText = `$${upgradeCost}`;
    button.onclick = () => upgradeSelectedBuilding();
}
window.closeBuildingMenu = function() {
    document.getElementById('building-menu').classList.add('hidden');
    selectedBuilding = null;
};
window.collectSelected = function() {
    if (selectedBuilding && selectedBuilding.storedMoney > 0) {
        collectMoneyFromBuilding(selectedBuilding);
        document.getElementById('b-menu-stored').innerText = 0;
    }
};
function collectMoneyFromBuilding(b) {
    if (b.storedMoney) {
        const amount = b.storedMoney;
        updateMoney(amount);
        spawnFloatingText(`+$${amount}`, b.x * GRID_SIZE + GRID_SIZE/2, b.y * GRID_SIZE, '#2ecc71');
        b.storedMoney = 0;
    }
}
window.upgradeSelectedBuilding = function() {
    if (selectedBuilding) return;
    const cost = selectedBuilding.level * 150;
    if (money >= cost) {
        updateMoney(-cost);
        selectedBuilding.level++;
        if (selectedBuilding.type === 'car_park') {
            selectedBuilding.capacity += 5;
            updateGuestCapacity();
        } else {
            selectedBuilding.ticketPrice += 5;
            selectedBuilding.duration = Math.max(20, selectedBuilding.duration - 5);
        }
        spawnFloatingText("Level up!", selectedBuilding.x * GRID_SIZE, selectedBuilding.y * GRID_SIZE, '#e67e22');
        openBuildingMenu(selectedBuilding);
    } else {
        alert("Not enough cash!");
    }
};
window.deleteSelectedBuilding = function() {
    if (selectedBuilding) {
        const idx = buildings.indexOf(selectedBuilding);
        if (idx !== -1) {
            buildings.splice(idx, 1);
            updateGuestCapacity();
        }
        closeBuildingMenu();
    }
};
class Guest {
    constructor() {
        const available = ENTRANCES.filter(e => e.unlocked);
        const entry = available[Math.floor(Math.random() * available.length)];
        this.x = entry.x * GRID_SIZE + GRID_SIZE / 2;
        this.y = entry.y * GRID_SIZE + GRID_SIZE / 2;
        this.targetX = this.x;
        this.targetY = this.y;
        this.size = 6;
        this.color = `hsl(${Math.random() * 360}, 70%, 60%)`;
        this.speed = 0.5 + Math.random() * 0.4;
        this.state = 'wandering'; 
        this.targetBuilding = ticketBooth;
        this.money = 50 + Math.floor(Math.random() * 100);
        this.targetBuilding = null;
        this.targetX = (PARK_ORIGIN_X + parkWidth / 2) * GRID_SIZE;
        this.targetY = (PARK_ORIGIN_Y + parkHeight / 2) * GRID_SIZE;
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
        if (this.state === 'walking_to_ride') {
            if (this.targetBuilding && buildings.includes(this.targetBuilding)) {
                this.targetBuilding.queue.push(this);
                this.state = 'queuing';
            } else {
                this.state = 'wandering';
                this.pickNewAction();
            }
        } else {
            this.pickNewAction();
        }
    }
    pickNewAction() {
        if (this.money < 5 || Math.random() < 0.005) {
            const idx = guests.indexOf(this);
            if (idx > -1) guests.splice(idx, 1);
            return;
        }
        const attractions = buildings.filter(b => (b.type === 'burger' || b.type === 'ride_swing'));
        if (attractions.length > 0 && Math.random() < 0.7) {
            const ride = attractions[Math.floor(Math.random() * attractions.length)];
            if (this.money >= ride.ticketPrice) {
                this.state = 'walking_to_ride';
                this.goToBuilding(ride);
                return;
            }
        }
        const minX = PARK_ORIGIN_X * GRID_SIZE;
        const maxX = (PARK_ORIGIN_X + parkWidth) * GRID_SIZE;
        const minY = PARK_ORIGIN_Y * GRID_SIZE;
        const maxY = (PARK_ORIGIN_Y + parkHeight) * GRID_SIZE;
        this.state = 'wandering';
        this.targetX = minX + Math.random() * (maxX - minX);
        this.targetY = minY + Math.random() * (maxY - minY);
    }

    draw() {
        if (this.state === 'riding') return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
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
        ctx.globalAlpha = 1.0;
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
        if (autoCollect && b.storedMoney > 0 && frameCount % 60 === 0) {
            collectMoneyFromBuilding(b);
        }
        if (b.type === 'path' || b.type === 'car_park') return;

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