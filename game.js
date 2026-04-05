const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scale: { mode: Phaser.Scale.RESIZE },
    physics: { default: 'arcade' },
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

let isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);

// ---------------- STATE ----------------
let state = "mode_select";
let mode = null;
let uiDrawn = false;

// ---------------- CHARACTER SYSTEM ----------------
let p1Choice = null;
let p2Choice = null;
let selectingPlayer = 1;
let available = ["soldier", "fire", "ninja"];

// ---------------- PLAYERS ----------------
let p1, p2, enemy;
let p1_health = 100;
let p2_health = 100;
let enemy_health = 100;

// ---------------- COOLDOWNS ----------------
let p1_cd = { attack: 0, strong: 0, heal: 0 };
let p2_cd = { attack: 0, strong: 0, heal: 0 };

// ---------------- MOBILE ----------------
let mobile = {
    attack: false,
    strong: false,
    heal: false,
    vx: 0,
    vy: 0
};

// ---------------- JOYSTICK ----------------
let joystick = {
    base: null,
    thumb: null,
    radius: 60,
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0
};

// ---------------- UI ----------------
let p1Bar, p2Bar, enemyBar;
let p1ControlsText, p2ControlsText;
let keys;

// ---------------- LOAD ----------------
function preload() {
    this.load.image("fire", "fire_king.png");
}

// ---------------- CREATE ----------------
function create() {
    keys = this.input.keyboard.addKeys({
        w: "W", a: "A", s: "S", d: "D",
        q: "Q", e: "E", r: "R",
        up: "UP", down: "DOWN", left: "LEFT", right: "RIGHT",
        u: "U", i: "I", o: "O"
    });

    this.scale.on("resize", (gameSize) => {
        this.cameras.resize(gameSize.width, gameSize.height);
    });

    showModeSelect(this);
}

// ---------------- BUTTON ----------------
function createButton(scene, x, y, text, color, callback) {
    let box = scene.add.rectangle(x, y, 220, 50, 0x222222)
        .setStrokeStyle(2, 0xffffff)
        .setInteractive();

    let label = scene.add.text(x - 70, y - 12, text, { fill: color });

    box.on("pointerover", () => box.setScale(1.1));
    box.on("pointerout", () => box.setScale(1));
    box.on("pointerdown", callback);
}

// ---------------- MODE SCREEN ----------------
function showModeSelect(scene) {
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;

    scene.add.text(cx - 80, cy - 120, "Select Mode", { fill: "#fff" });

    createButton(scene, cx, cy - 20, "Solo", "#0f0", () => {
        mode = "solo";
        state = "character_select";
        uiDrawn = false;
        scene.children.removeAll();
    });

    createButton(scene, cx, cy + 50, "Multiplayer", "#0ff", () => {
        mode = "multi";
        state = "character_select";
        uiDrawn = false;
        scene.children.removeAll();
    });
}

// ---------------- CHARACTER SCREEN ----------------
function showCharacterSelect(scene) {
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;

    scene.add.text(cx - 120, cy - 150, `Player ${selectingPlayer} Choose`, { fill: "#fff" });

    function pick(y, text, color, choice) {
        if (!available.includes(choice)) return;
        createButton(scene, cx, cy + y, text, color, () => pickCharacter(choice, scene));
    }

    pick(-40, "Soldier", "#00f", "soldier");
    pick(40, "Fire King", "#f60", "fire");
    pick(120, "Ninja", "#f0f", "ninja");
}

// ---------------- PICK CHARACTER ----------------
function pickCharacter(choice, scene) {
    available = available.filter(c => c !== choice);

    if (selectingPlayer === 1) {
        p1Choice = choice;

        if (mode === "multi") {
            selectingPlayer = 2;
            uiDrawn = false;
        } else {
            startGame(scene);
        }
    } else {
        p2Choice = choice;
        startGame(scene);
    }
}

// ---------------- CREATE PLAYERS ----------------
function createPlayers(scene) {
    function makePlayer(choice) {
        if (choice === "fire") {
            return scene.physics.add.image(0, 0, "fire").setDisplaySize(60, 60);
        } else {
            let color = choice === "soldier" ? 0x0000ff : 0x9900ff;
            let rect = scene.add.rectangle(0, 0, 50, 50, color);
            scene.physics.add.existing(rect);
            return rect;
        }
    }

    p1 = makePlayer(p1Choice);
    p1.setPosition(150, window.innerHeight / 2);

    if (mode === "multi") {
        p2 = makePlayer(p2Choice);
        p2.setPosition(window.innerWidth - 150, window.innerHeight / 2);
        enemy = null;
    } else {
        enemy = scene.add.rectangle(window.innerWidth - 150, window.innerHeight / 2, 50, 50, 0xff0000);
        scene.physics.add.existing(enemy);
        p2 = null;
    }
}

// ---------------- MOBILE CONTROLS ----------------
function createMobileControls(scene) {

    joystick.base = scene.add.circle(0, 0, joystick.radius, 0x222222, 0.4).setVisible(false);
    joystick.thumb = scene.add.circle(0, 0, 25, 0xffffff, 0.9).setVisible(false);

    scene.input.on("pointerdown", (p) => {
        if (p.x < window.innerWidth / 2) {
            joystick.active = true;
            joystick.pointerId = p.id;
            joystick.startX = p.x;
            joystick.startY = p.y;

            joystick.base.setPosition(p.x, p.y).setVisible(true);
            joystick.thumb.setPosition(p.x, p.y).setVisible(true);
        }
    });

    scene.input.on("pointermove", (p) => {
        if (!joystick.active || p.id !== joystick.pointerId) return;

        let dx = p.x - joystick.startX;
        let dy = p.y - joystick.startY;

        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > joystick.radius) {
            dx = (dx / dist) * joystick.radius;
            dy = (dy / dist) * joystick.radius;
        }

        joystick.thumb.setPosition(joystick.startX + dx, joystick.startY + dy);

        mobile.vx = dx / joystick.radius;
        mobile.vy = dy / joystick.radius;
    });

    scene.input.on("pointerup", (p) => {
        if (p.id !== joystick.pointerId) return;

        joystick.active = false;
        joystick.base.setVisible(false);
        joystick.thumb.setVisible(false);

        mobile.vx = 0;
        mobile.vy = 0;
    });

    function btn(x, y, label, press, release) {
        let b = scene.add.circle(x, y, 40, 0x444444, 0.8).setInteractive();
        scene.add.text(x - 10, y - 10, label, { fill: "#fff" });

        b.on("pointerdown", press);
        b.on("pointerup", release);
        b.on("pointerout", release);
    }

    let baseY = window.innerHeight - 120;

    btn(window.innerWidth - 140, baseY, "A", () => mobile.attack = true, () => mobile.attack = false);
    btn(window.innerWidth - 80, baseY - 80, "S", () => mobile.strong = true, () => mobile.strong = false);
    btn(window.innerWidth - 40, baseY, "H", () => mobile.heal = true, () => mobile.heal = false);
}

// ---------------- START GAME ----------------
function startGame(scene) {
    p1_health = 100;
    p2_health = 100;
    enemy_health = 100;

    p1_cd = { attack: 0, strong: 0, heal: 0 };
    p2_cd = { attack: 0, strong: 0, heal: 0 };

    mobile.vx = 0;
    mobile.vy = 0;

    state = "game";
    scene.children.removeAll();

    createPlayers(scene);

    p1Bar = scene.add.rectangle(20, 20, p1_health * 2, 12, 0x00ff00).setOrigin(0, 0);

    if (mode === "multi") {
        p2Bar = scene.add.rectangle(window.innerWidth - 20, 20, p2_health * 2, 12, 0x00ff00).setOrigin(1, 0);
    } else {
        enemyBar = scene.add.rectangle(window.innerWidth - 20, 20, enemy_health * 2, 12, 0xff0000).setOrigin(1, 0);
    }

    if (!isMobile) {
        p1ControlsText = scene.add.text(20, window.innerHeight - 60, "P1: Q Attack  E Strong  R Heal", { fill: "#fff" });
    } else {
        createMobileControls(scene);
    }
}

// ---------------- UPDATE ----------------
function update() {
    if (state !== "game") return;

    let speed = 200;

    // Movement
    let vx = isMobile ? mobile.vx * speed : (keys.d.isDown - keys.a.isDown) * speed;
    let vy = isMobile ? mobile.vy * speed : (keys.s.isDown - keys.w.isDown) * speed;

    p1.body.setVelocity(vx, vy);

    // Clamp
    p1.x = Phaser.Math.Clamp(p1.x, 25, window.innerWidth - 25);
    p1.y = Phaser.Math.Clamp(p1.y, 25, window.innerHeight - 25);

    // ATTACKS (unchanged logic)
    if ((isMobile ? mobile.attack : keys.q.isDown) && p1_cd.attack === 0) {
        if (mode === "multi") {
            if (Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y) < 80) p2_health -= 5;
        } else if (enemy) {
            if (Phaser.Math.Distance.Between(p1.x, p1.y, enemy.x, enemy.y) < 80) enemy_health -= 5;
        }
        p1_cd.attack = 20;
    }

    if ((isMobile ? mobile.strong : keys.e.isDown) && p1_cd.strong === 0) {
        if (mode === "multi") {
            if (Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y) < 100) p2_health -= 15;
        } else if (enemy) {
            if (Phaser.Math.Distance.Between(p1.x, p1.y, enemy.x, enemy.y) < 100) enemy_health -= 15;
        }
        p1_cd.strong = 60;
    }

    if ((isMobile ? mobile.heal : keys.r.isDown) && p1_cd.heal === 0) {
        p1_health = Math.min(100, p1_health + 10);
        p1_cd.heal = 100;
    }

    Object.keys(p1_cd).forEach(k => { if (p1_cd[k] > 0) p1_cd[k]--; });

    p1Bar.width = Math.max(0, p1_health * 2);

    if (mode === "multi" && p2Bar) p2Bar.width = Math.max(0, p2_health * 2);
    if (mode === "solo" && enemyBar) enemyBar.width = Math.max(0, enemy_health * 2);
}
