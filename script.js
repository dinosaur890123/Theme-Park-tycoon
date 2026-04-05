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
let cars = [];
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
    {id: 0, x: PARK_ORIGIN_X + 2, y: PARK_ORIGIN_Y - 2, unlocked: true, price: 0, ticketPrice: 6, queue: [], currentGuest: null, timer: 0, duration: 50},
    {id: 1, x: PARK_ORIGIN_X + 8, y: PARK_ORIGIN_Y - 2, unlocked: false, price: 500, ticketPrice: 6, queue: [], currentGuest: null, timer: 0, duration: 50},
    {id: 2, x: PARK_ORIGIN_X + 14, y: PARK_ORIGIN_Y - 2, unlocked: false, price: 700, ticketPrice: 8, queue: [], currentGuest: null, timer: 0, duration: 45}
];
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
const ENTRANCE_GRID = {x: ENTRANCES[0].x, y: ENTRANCES[0].y + 1};

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
    let cap = 3;
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
    let cap = 3;
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
function getPrimaryEntrance() {
    return ENTRANCES.find(e => e.unlocked) || ENTRANCES[0];
}
function getParkingLotRect() {
    const width = 4;
    const left = Math.max(0, PARK_ORIGIN_X - (width + 1));
    const top = PARK_ORIGIN_Y + 1;
    return {
        x: left,
        y: top,
        width,
        height: Math.max(6, parkHeight - 2)
    };
}
function worldToGrid(x,y){
    return {x:Math.floor(x / GRID_SIZE), y: Math.floor(y / GRID_SIZE)};
}
function setGuestTargetTile(g, t) {
    g.targetX = t.x * GRID_SIZE + GRID_SIZE / 2;
    g.targetY = t.y * GRID_SIZE + GRID_SIZE / 2;
}
function tileKey(t) {
    return `${t.x},${t.y}`;
}
function getPathNeighbors(tile) {
    const candidates = [
        {x: tile.x + 1, y: tile.y},
        {x: tile.x - 1, y: tile.y},
        {x: tile.x, y: tile.y + 1},
        {x: tile.x, y: tile.y - 1}
    ];
    return candidates.filter(n => isWalkableTile(n.x, n.y));
}
function findPath(start, goal, maxNodes = 600) {
    if (!start || !goal) return null;
    if (start.x === goal.x && start.y === goal.y) return [start];

    const queue = [start];
    const visited = new Set([tileKey(start)]);
    const parent = new Map();
    let explored = 0;

    while (queue.length > 0 && explored < maxNodes) {
        const current = queue.shift();
        explored++;

        if (current.x === goal.x && current.y === goal.y) {
            const path = [current];
            let currentKey = tileKey(current);
            while (parent.has(currentKey)) {
                const prev = parent.get(currentKey);
                path.push(prev);
                currentKey = tileKey(prev);
            }
            path.reverse();
            return path;
        }

        const neighbors = getPathNeighbors(current);
        for (const next of neighbors) {
            const key = tileKey(next);
            if (visited.has(key)) continue;
            visited.add(key);
            parent.set(key, current);
            queue.push(next);
        }
    }

    return null;
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
    const entrance = ENTRANCES.find(e => e.unlocked) || ENTRANCES[0];
    const cx = Math.min(PARK_ORIGIN_X + parkWidth - 3, entrance.x + 2);
    const cy = Math.max(PARK_ORIGIN_Y + 2, entrance.y + 3);

    for (let y = entrance.y; y <= cy; y++) addStarterBuilding('path', entrance.x, y);
    for (let x = Math.min(entrance.x, cx); x <= Math.max(entrance.x, cx); x++) addStarterBuilding('path', x, cy);

    for (let x = cx - 2; x <= cx + 2; x++) addStarterBuilding('path', x, cy);
    for (let y = cy - 1; y <= cy + 1; y++) addStarterBuilding('path', cx, y);

    addStarterBuilding('burger', cx - 1, cy + 1);
    addStarterBuilding('ride_swing', cx + 1, cy + 1);
}
function openBuildingMenu(b) {
    selectedBuilding = b;
    const menu = document.getElementById('building-menu');
    menu.classList.remove('hidden');
    document.getElementById('upgrades-menu').classList.add('hidden');
    const name = b.type.replace('_', ' ').toUpperCase();
    document.getElementById('b-menu-title').innerText = name;
    document.getElementById('b-menu-level').innerText = `Level ${b.level}`;

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
window.collectSelected = function() {};
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
    constructor(options = {}) {
        const available = ENTRANCES.filter(e => e.unlocked);
        const entry = options.entry || available[Math.floor(Math.random() * available.length)] || ENTRANCES[0];
        this.x = options.x ?? entry.x * GRID_SIZE + GRID_SIZE / 2;
        this.y = options.y ?? entry.y * GRID_SIZE + GRID_SIZE / 2;
        this.targetX = this.x;
        this.targetY = this.y;
        this.size = 6;
        this.color = `hsl(${Math.random() * 360}, 70%, 60%)`;
        this.speed = 0.5 + Math.random() * 0.4;
        this.state = options.fromParking ? 'from_parking' : 'wandering'; 
        this.targetBuilding = ticketBooth;
        this.money = 50 + Math.floor(Math.random() * 100);
        this.entryBooth = entry;
        this.targetBuilding = null;
        this.route = [];
        this.destinationTile = null;
        this.targetX = this.x;
        this.targetY = this.y;
        if (this.state === 'from_parking') {
            setGuestTargetTile(this, {x: entry.x, y: entry.y});
        } else {
            this.pickNewAction();
        }
    }

    getCurrentTile() {
        return worldToGrid(this.x, this.y);
    }

    setRouteTo(tile) {
        const start = this.getCurrentTile();
        const path = findPath(start, tile);
        if (!path || path.length === 0) return false;
        this.destinationTile = {x: tile.x, y: tile.y};
        this.route = path.slice(1);
        this.stepToNextRouteTile();
        return true;
    }

    stepToNextRouteTile() {
        if (!this.route.length) return false;
        const nextTile = this.route.shift();
        setGuestTargetTile(this, nextTile);
        return true;
    }

    update() {

        if (this.state === 'riding' || this.state === 'queuing' || this.state === 'queued_ticket' || this.state === 'buying_ticket') return;
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this.speed) {
            const nx = this.x+(dx / dist) * this.speed;
            const ny = this.y+(dy / dist) * this.speed;
            const g = worldToGrid(nx,ny);
            if (this.state !== 'from_parking' && !isWalkableTile(g.x, g.y)) {
                if (this.destinationTile && this.setRouteTo(this.destinationTile)) return;
                this.pickNewAction();
                return;
            }
            this.x = nx;
            this.y = ny;
        } else {
            if (this.state === 'from_parking') {
                if (this.entryBooth && this.entryBooth.unlocked) {
                    this.entryBooth.queue.push(this);
                    this.state = 'queued_ticket';
                } else {
                    this.state = 'wandering';
                    this.pickNewAction();
                }
                return;
            }
            if (!this.stepToNextRouteTile()) {
                this.handleArrival();
            }
        }
    }

    goToBuilding(b) {
        this.targetBuilding = b;
        const t = nearestWalkableAround(b.x, b.y);
        if (!t || !this.setRouteTo(t)) {
            this.pickNewAction();
        }
    }

    handleArrival() {
        if (this.state === 'walking_to_ride') {
            if (this.targetBuilding && buildings.includes(this.targetBuilding)) {
                this.targetBuilding.queue.push(this);
                this.state = 'queuing';
            } else {
                this.state='wandering';
                const tile = randomPathTile();
                if (!this.setRouteTo(tile)) this.pickNewAction();
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
        const tile = randomPathTile();
        if (!this.setRouteTo(tile)) {
            this.targetX = minX + Math.random() * (maxX - minX);
            this.targetY = minY + Math.random() * (maxY - minY);
        }
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
function processTicketBooths() {
    ENTRANCES.forEach(booth => {
        if (!booth.unlocked) return;
        if (!booth.currentGuest && booth.queue.length > 0) {
            booth.currentGuest = booth.queue.shift();
            booth.timer = booth.duration;
            booth.currentGuest.state = 'buying_ticket';
        }
        if (booth.currentGuest) {
            booth.timer--;
            if (booth.timer <= 0) {
                const g = booth.currentGuest;
                booth.currentGuest = null;
                if (g.money >= booth.ticketPrice) {
                    g.money -= booth.ticketPrice;
                    updateMoney(booth.ticketPrice);
                    spawnFloatingText(`+$${booth.ticketPrice}`, booth.x * GRID_SIZE + GRID_SIZE / 2, booth.y * GRID_SIZE, '#2ecc71');
                }
                g.state = 'wandering';
                g.pickNewAction();
            }
        }
    });
}
function spawnParkingCar() {
    const cap = getGuestCap();
    if (guests.length >= cap) return;
    if (cars.length > 5) return;

    const lot = getParkingLotRect();
    const laneCount = Math.max(2, Math.floor(lot.height / 2));
    const lane = Math.floor(Math.random() * laneCount);
    const targetY = (lot.y + 1 + lane * 2) * GRID_SIZE + GRID_SIZE / 2;
    const targetX = (lot.x + 1.7) * GRID_SIZE;

    cars.push({
        x: (lot.x - 2.5) * GRID_SIZE,
        y: targetY,
        targetX,
        speed: 1 + Math.random() * 0.5,
        state: 'arriving',
        wait: 20,
        seats: 2 + Math.floor(Math.random() * 4),
        dropped: 0,
        dropTimer: 0
    });
}
function processParkingCars() {
    const entry = getPrimaryEntrance();
    const cap = getGuestCap();

    cars.forEach(car => {
        if (car.state === 'arriving') {
            if (car.x < car.targetX) {
                car.x += car.speed;
            } else {
                car.state = 'parked';
                car.wait = 70;
            }
            return;
        }

        if (car.state === 'parked') {
            car.wait--;
            car.dropTimer--;
            if (car.dropped < car.seats && guests.length < cap && car.dropTimer <= 0) {
                const spawnX = car.x + 10 + Math.random() * 8;
                const spawnY = car.y + 9 + Math.random() * 6;
                guests.push(new Guest({x: spawnX, y: spawnY, fromParking: true, entry}));
                car.dropped++;
                car.dropTimer = 16;
            }
            if (car.wait <= 0 && car.dropped >= car.seats) {
                car.state = 'leaving';
            }
            return;
        }

        if (car.state === 'leaving') {
            car.x -= car.speed + 0.5;
        }
    });

    const lot = getParkingLotRect();
    const minX = (lot.x - 3.5) * GRID_SIZE;
    cars = cars.filter(car => car.x > minX);
}
function drawParkingLot() {
    const lot = getParkingLotRect();
    const px = lot.x * GRID_SIZE;
    const py = lot.y * GRID_SIZE;
    const w = lot.width * GRID_SIZE;
    const h = lot.height * GRID_SIZE;

    ctx.fillStyle = '#5a6470';
    ctx.fillRect(px, py, w, h);
    ctx.strokeStyle = '#8f9ba8';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, w, h);

    const slots = Math.max(4, Math.floor(getGuestCap() / 3));
    const parkedCars = Math.min(slots, Math.ceil(guests.length / 3));
    const step = h / slots;

    for (let i = 0; i < slots; i++) {
        const sy = py + i * step;
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.moveTo(px + 12, sy + step - 2);
        ctx.lineTo(px + w - 12, sy + step - 2);
        ctx.stroke();

        if (i < parkedCars) {
            ctx.fillStyle = i % 2 === 0 ? '#d9534f' : '#4f8dd9';
            ctx.fillRect(px + 18, sy + 6, 34, Math.max(10, step - 10));
            ctx.fillStyle = '#dce6ef';
            ctx.fillRect(px + 24, sy + 9, 12, 4);
        }
    }

    cars.forEach(car => {
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(car.x, car.y - 8, 30, 14);
        ctx.fillStyle = '#dce6ef';
        ctx.fillRect(car.x + 8, car.y - 6, 10, 4);
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(car.x + 6, car.y + 6, 3, 0, Math.PI * 2);
        ctx.arc(car.x + 24, car.y + 6, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = '#f3f7fa';
    ctx.font = 'bold 11px Calibri';
    ctx.textAlign = 'left';
    ctx.fillText('Parking', px + 8, py + 14);
}
function processBuildings() {
    buildings.forEach(b => {
        if (b.type === 'path' || b.type === 'car_park') return;

        if (b.state === 'idle') {
            if (b.queue.length > 0) {
                while (b.riders.length < b.capacity && b.queue.length > 0) {
                    const guest = b.queue.shift();
                    if (!guest || guest.money < b.ticketPrice) continue;
                    guest.money -= b.ticketPrice;
                    updateMoney(b.ticketPrice);
                    spawnFloatingText(`+$${b.ticketPrice}`, b.x * GRID_SIZE + GRID_SIZE / 2, b.y * GRID_SIZE, '#2ecc71');
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
    const gridX = Math.floor(mouse.x / GRID_SIZE);
    const gridY = Math.floor(mouse.y / GRID_SIZE);

    if (selectedTool && selectedTool !== 'path') {
        const near = isWalkableTile(gridX + 1, gridY) || isWalkableTile(gridX - 1, gridY) || isWalkableTile(gridX, gridY + 1) || isWalkableTile(gridX, gridY - 1);
        if (!near) {
            alert("Place it next to a path.");
            return;
        }
    }

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
                if (confirm(`Unlock ticket booth for $${entrances.price}?`)) {
                    updateMoney(-entrances.price);
                    entrances.unlocked = true;
                    spawnFloatingText("Ticket booth unlocked!", mouse.x, mouse.y, '#e7bd16');
                }
            } else {
                alert(`Need $${entrances.price} to unlock this ticket booth :(`);
            }
            isDragging = false;
            return;
        }
        const b = buildings.find(b => b.x === gridX && b.y === gridY);
        if (b && b.type !== 'path') {
            openBuildingMenu(b);
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
        ctx.fillText(e.unlocked ? 'BOOTH' : 'LOCKED', px + GRID_SIZE / 2, py + GRID_SIZE / 2 + 4);
        if (!e.unlocked) {
            ctx.font = '9px Arial';
            ctx.fillText(`$${e.price}`, px + GRID_SIZE / 2, py + GRID_SIZE - 2);
        } else {
            ctx.font = '9px Arial';
            ctx.fillText(`$${e.ticketPrice}`, px + GRID_SIZE / 2, py + GRID_SIZE - 2);
            if (e.currentGuest) {
                const ratio = Math.max(0, Math.min(1, e.timer / e.duration));
                ctx.fillStyle = '#2ecc71';
                ctx.fillRect(px + 2, py - 6, ratio * (GRID_SIZE - 4), 4);
            }
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
        ctx.font = '10px Calibri';
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

    if (b.type !== 'path' && b.type !== 'car_park') {
        const hasWork = b.state === 'running' || (b.queue && b.queue.length > 0);
        if (hasWork) {
            const ratio = b.state === 'running'
                ? Math.max(0, Math.min(1, b.timer / Math.max(1, b.duration)))
                : Math.max(0.15, Math.min(1, 0.2 + (b.queue.length * 0.08)));
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(px, py - 9, GRID_SIZE, 5);
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(px, py - 9, GRID_SIZE * ratio, 5);
        }
    }
}
function loop() {
    frameCount++;
    processTicketBooths();
    processBuildings();
    processParkingCars();
    if (frameCount % 65 === 0) spawnParkingCar();
    if (frameCount % 180 === 0 && guests.length < getGuestCap() && Math.random() < 0.3) spawnGuest();
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    
    drawWorld();
    drawParkingLot();
    drawEntrances();
    
    buildings.forEach(drawBuilding);
    guests.forEach(g => {g.update(); g.draw();});
    particles.forEach(p => {p.update(); p.draw();});
    particles = particles.filter(p => p.life > 0);
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