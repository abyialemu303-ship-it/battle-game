const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scale: {
        mode: Phaser.Scale.RESIZE
    },
    physics: { default: 'arcade' },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
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
    up: false,
    down: false,
    left: false,
    right: false,
    attack: false,
    strong: false,
    heal: false
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

    return { box, label };
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
        enemy = scene.add.rectangle(
            window.innerWidth - 150,
            window.innerHeight / 2,
            50,
            50,
            0xff0000
        );
        scene.physics.add.existing(enemy);
        p2 = null;
    }
}

// ---------------- MOBILE CONTROLS ----------------
function createMobileControls(scene) {
    function btn(x, y, label, press, release) {
        let b = scene.add.rectangle(x, y, 60, 60, 0x444444).setInteractive();
        scene.add.text(x - 10, y - 10, label, { fill: "#fff" });

        b.on("pointerdown", press);
        b.on("pointerup", release);
        b.on("pointerout", release);
    }

    btn(80, window.innerHeight - 100, "↑", () => mobile.up = true, () => mobile.up = false);
    btn(80, window.innerHeight - 20, "↓", () => mobile.down = true, () => mobile.down = false);
    btn(20, window.innerHeight - 60, "←", () => mobile.left = true, () => mobile.left = false);
    btn(140, window.innerHeight - 60, "→", () => mobile.right = true, () => mobile.right = false);

    btn(window.innerWidth - 140, window.innerHeight - 60, "A", () => mobile.attack = true, () => mobile.attack = false);
    btn(window.innerWidth - 80, window.innerHeight - 120, "S", () => mobile.strong = true, () => mobile.strong = false);
    btn(window.innerWidth - 40, window.innerHeight - 60, "H", () => mobile.heal = true, () => mobile.heal = false);
}

// ---------------- START GAME ----------------
function startGame(scene) {
    p1_health = 100;
    p2_health = 100;
    enemy_health = 100;

    p1_cd = { attack: 0, strong: 0, heal: 0 };
    p2_cd = { attack: 0, strong: 0, heal: 0 };

    mobile.up = false;
    mobile.down = false;
    mobile.left = false;
    mobile.right = false;
    mobile.attack = false;
    mobile.strong = false;
    mobile.heal = false;

    state = "game";
    uiDrawn = false;
    scene.children.removeAll();

    createPlayers(scene);

    // P1 health bar
    p1Bar = scene.add.rectangle(20, 20, p1_health * 2, 12, 0x00ff00).setOrigin(0, 0);

    // P2 or enemy health bar
    if (mode === "multi") {
        p2Bar = scene.add.rectangle(window.innerWidth - 20, 20, p2_health * 2, 12, 0x00ff00).setOrigin(1, 0);
        enemyBar = null;
    } else {
        enemyBar = scene.add.rectangle(window.innerWidth - 20, 20, enemy_health * 2, 12, 0xff0000).setOrigin(1, 0);
        p2Bar = null;
    }

    // Controls text should still show on PC
    if (!isMobile) {
        p1ControlsText = scene.add.text(20, window.innerHeight - 60, "P1: Q Attack  E Strong  R Heal", { fill: "#fff" });

        if (mode === "multi") {
            p2ControlsText = scene.add.text(20, window.innerHeight - 30, "P2: U Attack  I Strong  O Heal", { fill: "#fff" });
        } else {
            p2ControlsText = null;
        }
    } else {
        p1ControlsText = null;
        p2ControlsText = null;
        createMobileControls(scene);
    }
}

// ---------------- END GAME ----------------
function endGame(scene, message) {
    state = "game_over";
    scene.children.removeAll();

    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;

    scene.add.text(cx - 100, cy - 50, message, { fill: "#fff" });

    createButton(scene, cx, cy + 20, "Play Again", "#0f0", () => resetGame(scene));
    createButton(scene, cx, cy + 90, "Main Menu", "#fff", () => resetAll(scene));
}

// ---------------- RESET ----------------
function resetGame(scene) {
    startGame(scene);
}

function resetAll(scene) {
    p1Choice = null;
    p2Choice = null;
    selectingPlayer = 1;
    available = ["soldier", "fire", "ninja"];

    mobile.up = false;
    mobile.down = false;
    mobile.left = false;
    mobile.right = false;
    mobile.attack = false;
    mobile.strong = false;
    mobile.heal = false;

    uiDrawn = false;
    state = "mode_select";
    scene.children.removeAll();
    showModeSelect(scene);
}

// ---------------- BOUNDARY ----------------
function clampPlayer(player) {
    player.x = Phaser.Math.Clamp(player.x, 25, window.innerWidth - 25);
    player.y = Phaser.Math.Clamp(player.y, 25, window.innerHeight - 25);
}

// ---------------- UPDATE ----------------
function update() {
    if (state === "character_select") {
        if (!uiDrawn) {
            this.children.removeAll();
            showCharacterSelect(this);
            uiDrawn = true;
        }
        return;
    }

    if (state !== "game") return;

    // P1 input
    let moveLeft = isMobile ? mobile.left : keys.a.isDown;
    let moveRight = isMobile ? mobile.right : keys.d.isDown;
    let moveUp = isMobile ? mobile.up : keys.w.isDown;
    let moveDown = isMobile ? mobile.down : keys.s.isDown;

    let attack = isMobile ? mobile.attack : keys.q.isDown;
    let strong = isMobile ? mobile.strong : keys.e.isDown;
    let heal = isMobile ? mobile.heal : keys.r.isDown;

    // P1 move
    p1.body.setVelocity(0);

    if (moveLeft) p1.body.setVelocityX(-200);
    if (moveRight) p1.body.setVelocityX(200);
    if (moveUp) p1.body.setVelocityY(-200);
    if (moveDown) p1.body.setVelocityY(200);

    clampPlayer(p1);

    // P1 attacks
    if (attack && p1_cd.attack === 0) {
        if (mode === "multi") {
            if (Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y) < 80) {
                p2_health -= 5;
            }
        } else if (enemy) {
            if (Phaser.Math.Distance.Between(p1.x, p1.y, enemy.x, enemy.y) < 80) {
                enemy_health -= 5;
            }
        }
        p1_cd.attack = 20;
    }

    if (strong && p1_cd.strong === 0) {
        if (mode === "multi") {
            if (Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y) < 100) {
                p2_health -= 15;
            }
        } else if (enemy) {
            if (Phaser.Math.Distance.Between(p1.x, p1.y, enemy.x, enemy.y) < 100) {
                enemy_health -= 15;
            }
        }
        p1_cd.strong = 60;
    }

    if (heal && p1_cd.heal === 0) {
        p1_health = Math.min(100, p1_health + 10);
        p1_cd.heal = 100;
    }

    // P2 move + attacks in multiplayer
    if (mode === "multi" && p2) {
        p2.body.setVelocity(0);

        if (keys.left.isDown) p2.body.setVelocityX(-200);
        if (keys.right.isDown) p2.body.setVelocityX(200);
        if (keys.up.isDown) p2.body.setVelocityY(-200);
        if (keys.down.isDown) p2.body.setVelocityY(200);

        clampPlayer(p2);

        if (keys.u.isDown && p2_cd.attack === 0) {
            if (Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y) < 80) {
                p1_health -= 5;
            }
            p2_cd.attack = 20;
        }

        if (keys.i.isDown && p2_cd.strong === 0) {
            if (Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y) < 100) {
                p1_health -= 15;
            }
            p2_cd.strong = 60;
        }

        if (keys.o.isDown && p2_cd.heal === 0) {
            p2_health = Math.min(100, p2_health + 10);
            p2_cd.heal = 100;
        }
    }

    // Solo enemy AI
    if (mode === "solo" && enemy) {
        this.physics.moveToObject(enemy, p1, 100);
        clampPlayer(enemy);

        if (Phaser.Math.Distance.Between(p1.x, p1.y, enemy.x, enemy.y) < 40) {
            p1_health -= 0.3;
        }
    }

    // Cooldowns
    Object.keys(p1_cd).forEach(k => {
        if (p1_cd[k] > 0) p1_cd[k]--;
    });

    Object.keys(p2_cd).forEach(k => {
        if (p2_cd[k] > 0) p2_cd[k]--;
    });

    // Health bars
    p1Bar.width = Math.max(0, p1_health * 2);

    if (mode === "multi" && p2Bar) {
        p2Bar.width = Math.max(0, p2_health * 2);
    }

    if (mode === "solo" && enemyBar) {
        enemyBar.width = Math.max(0, enemy_health * 2);
    }

    // Win check
    if (p1_health <= 0) {
        endGame(this, mode === "multi" ? "Player 2 Wins!" : "You Lost!");
        return;
    }

    if (mode === "multi" && p2_health <= 0) {
        endGame(this, "Player 1 Wins!");
        return;
    }

    if (mode === "solo" && enemy && enemy_health <= 0) {
        endGame(this, "You Win!");
        return;
    }
}