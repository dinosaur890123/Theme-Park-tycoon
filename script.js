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
const ENTRANCES = [
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
    level: 1,
    storedMoney: 0,
    ticketPrice: 0,
    queue: [],
    riders: [],
    capacity: 1,
    duration: 60,
    state: 'idle',
    timer: 0
};
document.body.classList.add('prestart');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
buildings.push(ticketBooth);
seedStarterLayout();

function enterPark() {
    if (!startScreen) return;
    document.body.classList.remove('prestart');
    startScreen.classList.add('leave');
    setTimeout(() => startScreen.remove(), 700);
}

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
function spawnGuest() {
    const cap = getGuestCap();
    if (guests.length >= cap) return;
    const unlockedCount = ENTRANCES.filter(e => e.unlocked).length;
    const spawnChance = Math.min(0.15 + unlockedCount * 0.02, 0.30);
    if (Math.random() < spawnChance) {
        guests.push(new Guest());
        updateGuestCapacity();
    }
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
    maxGuests = cap;
    document.getElementById('max-guests-display').innerText = cap;
    return cap;
}
function updateGuestDisplay() {
    const guestDisplay = document.getElementById('guest-display');
    if (guestDisplay) guestDisplay.innerText = guests.length;
}
function getGuestCap() {
    let cap = 5;
    const carParks = buildings.filter(b => b.type === 'car_park');
    carParks.forEach(cp => cap += cp.capacity);
    return cap;
}
window.selectTool = function(toolName) {
    selectedTool = toolName;
    document.querySelectorAll('.tool-button').forEach(button => button.classList.remove('active'));

    if (toolName) {
        const activeButton = document.getElementById(`button-${toolName}`);
        if (activeButton) activeButton.classList.add('active');
        canvas.style.cursor = 'crosshair';
    } else {
        canvas.style.cursor = 'grab';
    }
};
window.toggleUpgrades = function() {
    document.getElementById('upgrades-menu').classList.toggle('hidden');
    document.getElementById('building-menu').classList.add('hidden');
};
window.buyUpgrade = function(type) {
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

function isWalkableTile(x, y) {
    if (ENTRANCES.some(e => e.unlocked && e.x === x && e.y === y)) return true;
    const b = buildings.find(v => v.x === x && v.y === y);
    return !!b && (b.type === 'path' || b.type === 'ticket_booth');
}
function worldToGrid(x,y){
    return {x:Math.floor(x / GRID_SIZE), y: Math.floor(y / GRID_SIZE)};
}
function setGuestTargetTile(g, t) {
    g.targetX = t.x * GRID_SIZE + GRID_SIZE / 2;
    g.targetY = t.y * GRID_SIZE + GRID_SIZE / 2;
}
function nearestWalkableAround(x,y) {
    const a = [{x,y}, {x:x+1,y}, {x:x-1,y}, {x,y:y+1}, {x,y:y-1}];
    for (const t of a) if (isWalkableTile(t.x,t.y)) {
        return t;
    }
    return null;
}
function randomPathTile() {
    const tiles = buildings.filter(b => b.type==='path' || b.type==='ticket_booth');
    if (!tiles.length) return {x:PARK_ORIGIN_X + 1, y:PARK_ORIGIN_Y + 1};
    const t = tiles[Math.floor(Math.random() * tiles.length)];
    return {x:t.x, y:t.y};
}
function addStarterBuilding(type, x, y) {
    if (buildings.some(b => b.x === x && b.y === y)) return;
    const b = {x, y, type, level: 1, storedMoney: 0, queue: [], riders: [], state: 'idle', timer: 0, capacity: 0, ticketPrice: 0, duration: 0};
    if (type === 'burger') {b.capacity = 2; b.duration = 40; b.ticketPrice = 10;}
    if (type === 'ride_swing') {b.capacity = 4; b.duration = 150; b.ticketPrice = 25;}
    buildings.push(b);
}

function seedStarterLayout() {
    const cx = PARK_ORIGIN_X + Math.floor(parkWidth / 2);
    const cy = PARK_ORIGIN_Y + Math.floor(parkHeight / 2);
    for (let x = cx - 3; x <= cx + 3; x++) addStarterBuilding('path', x, cy);
    for (let y = cy - 2; y <= cy + 2; y++) addStarterBuilding('path', cx, y);
    
    addStarterBuilding('path', cx - 2, cy);
    addStarterBuilding('path', cx + 2, cy);
    addStarterBuilding('burger', cx - 2, cy - 1);
    addStarterBuilding('ride_swing', cx + 2, cy - 1);
}
function openBuildingMenu(b) {
    selectedBuilding = b;
    const menu = document.getElementById('building-menu');
    menu.classList.remove('hidden');
    document.getElementById('upgrades-menu').classList.add('hidden');
    const name = b.type.replace('_', ' ').toUpperCase();
    document.getElementById('b-menu-title').innerText = name;
    document.getElementById('b-menu-level').innerText = `Level ${b.level}`;
    document.getElementById('b-menu-stored').innerText = b.storedMoney;

    document.getElementById('b-menu-queue').innerText = (b.queue && b.queue.length) ? b.queue.length : 0;
    document.getElementById('b-menu-riders').innerText = (b.riders && b.riders.length) ? b.riders.length : 0;
    document.getElementById('b-menu-ticket').innerText = b.ticketPrice || 0;

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
    if (!selectedBuilding) return;
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
            const nx = this.x+(dx / dist) * this.speed;
            const ny = this.y+(dy / dist) * this.speed;
            const g = worldToGrid(nx,ny);
            if(!isWalkableTile(g.x, g.y)) {this.pickNewAction(); return;}
            this.x = nx;
            this.y = ny;
        } else {
            this.handleArrival();
        }
    }

    goToBuilding(b) {
        this.targetBuilding = b;
        const t = nearestWalkableAround(b.x, b.y);
        if (!t) {this.pickNewAction(); return;}
        setGuestTargetTile(this, t);
    }

    handleArrival() {
        if (this.state === 'walking_to_ride') {
            if (this.targetBuilding && buildings.includes(this.targetBuilding)) {
                this.targetBuilding.queue.push(this);
                this.state = 'queuing';
            } else {
                this.state='wandering';
                setGuestTargetTile(this,randomPathTile());
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
function spawnFloatingText(text, x, y, color) {
    particles.push(new FloatingText(text, x, y, color));
}
function processBuildings() {
    buildings.forEach(b => {
        if (autoCollect && b.storedMoney > 0 && frameCount % 60 === 0) {
            collectMoneyFromBuilding(b);
        }
        if (b.type === 'path' || b.type === 'car_park') return;

        if (b.state === 'idle') {
            if (b.queue.length > 0) {
                while (b.riders.length < b.capacity && b.queue.length > 0) {
                    const guest = b.queue.shift();
                    guest.money -= b.ticketPrice;
                    b.storedMoney += b.ticketPrice;
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
                    g.y = b.y * GRID_SIZE + GRID_SIZE + 5;
                    g.pickNewAction();
                });
                b.riders = [];
                b.state = 'idle';
            }
        }
    });
}
canvas.addEventListener('mousedown', (e) => {
    if (document.getElementById('upgrades-menu').classList.contains('hidden') === false) return;

    const mouse = getWorldMouse(e);
    const near = isWalkableTile(gridX + 1, gridY) || isWalkableTile(gridX - 1, gridY) || isWalkableTile(gridX, gridY + 1) || isWalkableTile(gridX, gridY - 1);
    if (!near) {
        alert("Place it next to a path.");
        return;
    }
    const gridX = Math.floor(mouse.x / GRID_SIZE);
    const gridY = Math.floor(mouse.y / GRID_SIZE);

    if (selectedTool) {
        if (gridX < PARK_ORIGIN_X || gridX >= PARK_ORIGIN_X + parkWidth || gridY < PARK_ORIGIN_Y || gridY >= PARK_ORIGIN_Y + parkHeight) {
            alert("Build inside the park fence!");
            return;
        }
        const existing = buildings.find(b => b.x === gridX && b.y === gridY);
        if (existing) {
            alert("Space occupied!");
            return;
        }
        let cost = 0;
        let newB = {
            x: gridX, y: gridY, type: selectedTool, level: 1, storedMoney: 0, queue: [], riders: [], state: 'idle', timer: 0, capacity: 0, ticketPrice: 0, duration: 0
        };
        if (selectedTool === 'path') {
            cost = 10;
        } else if (selectedTool === 'car_park') {
            cost = 150; 
            newB.capacity = 5;
        } else if (selectedTool === 'burger') {
            cost = 200;
            newB.capacity = 2; 
            newB.duration = 40; 
            newB.ticketPrice = 10;
        } else if (selectedTool === 'ride_swing') {
            cost = 500; 
            newB.capacity = 4; 
            newB.duration = 150; 
            newB.ticketPrice = 25;
        }

        if (money >= cost) {
            updateMoney(-cost);
            buildings.push(newB);
            spawnFloatingText(`-$${cost}`, mouse.x, mouse.y, '#e74c3c');
            updateGuestCapacity();
            window.selectTool(null);
        } else {
            alert("Too expensive!");
        }

    } else {
        isDragging = true;
        lastMouse = {x: e.clientX, y: e.clientY};
        const entrances = ENTRANCES.find(en => en.x === gridX && en.y === gridY);
        if (entrances && !entrances.unlocked) {
            if (money >= entrances.price) {
                if (confirm(`Unlock entrance for $${entrances.price}?`)) {
                    updateMoney(-entrances.price);
                    entrances.unlocked = true;
                    spawnFloatingText("Unlocked!", mouse.x, mouse.y, '#e7bd16');
                }
            } else {
                alert(`Need $${entrances.price} to unlock :(`);
            }
            isDragging = false;
            return;
        }
        const b = buildings.find(b => b.x === gridX && b.y === gridY);
        if (b && b.type !== 'path') {
            if (b.storedMoney > 0) {
                collectMoneyFromBuilding(b);
            } else {
                openBuildingMenu(b);
            }
            isDragging = false;
        }
    }
});
canvas.addEventListener('mousemove', e => {
    if (isDragging) {
        const dx = e.clientX - lastMouse.x;
        const dy = e.clientY - lastMouse.y;
        camera.x -= dx;
        camera.y -= dy;
        lastMouse = {x: e.clientX, y: e.clientY};
        canvas.style.cursor = 'grabbing';
    }
});
canvas.addEventListener('mouseup', () => {
    isDragging = false;
    if(!selectedTool) canvas.style.cursor = 'grab';
});
function drawWorld() {
    ctx.fillStyle = '#2d3b45';
    ctx.fillRect(camera.x, camera.y, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.strokeStyle = '#2f3640';
    ctx.lineWidth = 1;
    const parkPX = PARK_ORIGIN_X * GRID_SIZE;
    const parkPY = PARK_ORIGIN_Y * GRID_SIZE;
    ctx.fillStyle = '#2bbe68';
    ctx.fillRect(parkPX, parkPY, parkWidth * GRID_SIZE, parkHeight * GRID_SIZE);
    ctx.strokeStyle = '#bdc3c7';
    ctx.lineWidth = 4;
    ctx.strokeRect(parkPX, parkPY, parkWidth * GRID_SIZE, parkHeight * GRID_SIZE);
}
function drawEntrances() {
    ENTRANCES.forEach(e => {
        const px = e.x * GRID_SIZE;
        const py = e.y * GRID_SIZE;
        ctx.fillStyle = e.unlocked ? '#2ecc71' : '#7f8c8d';
        ctx.fillRect(px, py, GRID_SIZE, GRID_SIZE);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Calibri';
        ctx.textAlign = 'center';
        ctx.fillText(e.unlocked ? 'ENTRY' : 'LOCKED', px + GRID_SIZE / 2, py + GRID_SIZE / 2 + 4);
        if (!e.unlocked) {
            ctx.font = '9px Arial';
            ctx.fillText(`$${e.price}`, px + GRID_SIZE / 2, py + GRID_SIZE - 2);
        }
    });
}
if (startButton) {
    startButton.addEventListener('click', enterPark);
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
    if (frameCount % 45 === 0) spawnGuest();
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    
    drawWorld();
    drawEntrances();
    
    buildings.forEach(drawBuilding);
    guests.forEach(g => {g.update(); g.draw();});
    particles.forEach(p => {p.update(); p.draw(); if(p.life<=0) particles.shift();});
    updateGuestDisplay();
    ctx.restore();
    requestAnimationFrame(loop);
}
loop();
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') enterPark();
});