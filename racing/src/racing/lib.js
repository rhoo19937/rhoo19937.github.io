let Dom = {
    get: function (id) { return ((id instanceof HTMLElement) || (id === document)) ? id : document.getElementById(id); },
    set: function (id, html) { Dom.get(id).innerHTML = html; },
    on: function (ele, type, fn, capture) { Dom.get(ele).addEventListener(type, fn, capture); },
    un: function (ele, type, fn, capture) { Dom.get(ele).removeEventListener(type, fn, capture); },
    show: function (ele, type) { Dom.get(ele).style.display = (type || 'block'); },
    blur: function (ev) { ev.target.blur(); },

    addClassName: function (ele, name) { Dom.toggleClassName(ele, name, true); },
    removeClassName: function (ele, name) { Dom.toggleClassName(ele, name, false); },
    toggleClassName: function (ele, name, on) {
        ele = Dom.get(ele);
        let classes = ele.className.split(' ');
        let n = classes.indexOf(name);
        on = (typeof on == 'undefined') ? (n < 0) : on;
        if (on && (n < 0))
            classes.push(name);
        else if (!on && (n >= 0))
            classes.splice(n, 1);
        ele.className = classes.join(' ');
    },
}


let Util = {
    timestamp: function () { return new Date().getTime(); },
    toInt: function (obj, def) { if (obj !== null) { let x = parseInt(obj, 10); if (!isNaN(x)) return x; } return Util.toInt(def, 0); },
    toFloat: function (obj, def) { if (obj !== null) { let x = parseFloat(obj); if (!isNaN(x)) return x; } return Util.toFloat(def, 0.0); },
    limit: function (value, min, max) { return Math.max(min, Math.min(value, max)); },
    randomRange: function (min, max) { return Math.floor(Util.interpolate(min, max, Math.random())); },
    randomInt: function (min, max) { return Util.randomRange(min, max + 1); },
    randomChoice: function (options) { return options[Util.randomRange(0, options.length)]; },
    percentRemaining: function (n, total) { return (n % total) / total; },
    accelerate: function (v, accel, dt) { return v + (accel * dt); },
    interpolate: function (a, b, percent) { return a + (b - a) * percent },
    easeIn: function (a, b, percent) { return a + (b - a) * Math.pow(percent, 2); },
    easeOut: function (a, b, percent) { return a + (b - a) * (1 - Math.pow(1 - percent, 2)); },
    easeInOut: function (a, b, percent) { return a + (b - a) * ((-Math.cos(percent * Math.PI) / 2) + 0.5); },
    exponentialFog: function (distance, density) { return 1 / (Math.pow(Math.E, (distance * distance * density))); },

    increase: function (start, increment, max) {
        let result = start + increment;
        while (result >= max)
            result -= max;
        while (result < 0)
            result += max;
        return result;
    },

    project: function (p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
        p.camera.x = (p.world.x || 0) - cameraX;
        p.camera.y = (p.world.y || 0) - cameraY;
        p.camera.z = (p.world.z || 0) - cameraZ;
        p.screen.scale = cameraDepth / p.camera.z;
        p.screen.x = Math.round((width / 2) + (p.screen.scale * p.camera.x * width / 2));
        p.screen.y = Math.round((height / 2) - (p.screen.scale * p.camera.y * height / 2));
        p.screen.w = Math.round((p.screen.scale * roadWidth * width / 2));
    },

    overlap: function (x1, w1, x2, w2, percent) {
        let half = (percent || 1) / 2;
        let min1 = x1 - (w1 * half);
        let max1 = x1 + (w1 * half);
        let min2 = x2 - (w2 * half);
        let max2 = x2 + (w2 * half);
        return !((max1 < min2) || (min1 > max2));
    }
}


// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback, element) {
            window.setTimeout(callback, 1000 / 60);
        }
}


let Game = {
    run: function (options) {
        Game.loadImages(options.images, function (images) {
            options.ready(images);

            Game.setKeyListener(options.keys);

            let update = options.update;
            let render = options.render;
            let step = options.step;
            let now = null;
            let last = Util.timestamp();
            let dt = 0;
            let gdt = 0;

            function frame(canvas) {
                now = Util.timestamp();
                dt = Math.min(1, (now - last) / 1000);
                gdt = gdt + dt;
                while (gdt > step) {
                    gdt = gdt - step;
                    update(step);
                }
                render();
                last = now;
                requestAnimationFrame(frame, canvas);
            }

            frame(options.canvas[0]);
            frame(options.canvas[1]);
        });
    },

    loadImages: function (names, callback) {
        let result = [];
        let count = names.length;

        let onload = function () {
            if (--count == 0)
                callback(result);
        };

        for (let n=0; n<names.length; n++) {
            let name = names[n];
            result[n] = document.createElement('img');
            Dom.on(result[n], 'load', onload);
            result[n].src = "images/" + name + ".png";
        }
    },

    setKeyListener: function (keys) {
        let onkey = function (keyCode, mode) {
            for (let n=0; n<keys.length; n++) {
                let k = keys[n];
                k.mode = k.mode || 'up';
                if ((k.key == keyCode) || (k.keys && (k.keys.indexOf(keyCode) >= 0))) {
                    if (k.mode == mode) {
                        k.action.call();
                    }
                }
            }
        };
        Dom.on(document, 'keydown', function (ev) { onkey(ev.keyCode, 'down'); });
        Dom.on(document, 'keyup', function (ev) { onkey(ev.keyCode, 'up'); });
    },
}


let KEY = {
    Enter: 13,
    Left: 37,
    Up: 38,
    Right: 39,
    Down: 40,
    Lt: 188, // <
    Gt: 190, // >
    A: 65,
    B: 66,
    C: 67,
    D: 68,
    E: 69,
    F: 70,
    G: 71,
    H: 72,
    I: 73,
    J: 74,
    K: 75,
    L: 76,
    M: 77,
    N: 78,
    O: 79,
    P: 80,
    Q: 81,
    R: 82,
    S: 83,
    T: 84,
    U: 85,
    V: 86,
    W: 87,
    X: 88,
    Y: 89,
    Z: 90,
};


let BUTTON = {
    LEFT: 0,
    RIGHT: 2,
};


let COLORS = {
    SKY: '#72D7EE',
    TREE: '#005108',
    FOG: '#005108',
    LIGHT: { road: '#6B6B6B', grass: '#10AA10', rumble: '#555555', lane: '#CCCCCC' },
    DARK: { road: '#696969', grass: '#009A00', rumble: '#BBBBBB' },
    START: { road: 'white', grass: 'white', rumble: 'white' },
    FINISH: { road: 'black', grass: 'black', rumble: 'black' },
    CAR0: '#3f3fff',
    CAR1: '#a50000',
    GRAY: 'rgb(0,0,0,0.5)',
    TEXT: '#e3e430',
};


let BACKGROUND = {
    HILLS: { x: 5, y: 5, w: 1280, h: 480 },
    SKY: { x: 5, y: 495, w: 1280, h: 480 },
    TREES: { x: 5, y: 985, w: 1280, h: 480 }
};


let SPRITES = {
    PALM_TREE: { x: 5, y: 5, w: 215, h: 540 },
    TREE1: { x: 625, y: 5, w: 360, h: 360 },
    DEAD_TREE1: { x: 5, y: 555, w: 135, h: 332 },
    BOULDER3: { x: 230, y: 280, w: 320, h: 220 },
    COLUMN: { x: 995, y: 5, w: 200, h: 315 },
    BOULDER2: { x: 621, y: 897, w: 298, h: 140 },
    TREE2: { x: 1205, y: 5, w: 282, h: 295 },
    DEAD_TREE2: { x: 1205, y: 490, w: 150, h: 260 },
    BOULDER1: { x: 1205, y: 760, w: 168, h: 248 },
    BUSH1: { x: 5, y: 1097, w: 240, h: 155 },
    CACTUS: { x: 929, y: 897, w: 235, h: 118 },
    BUSH2: { x: 255, y: 1097, w: 232, h: 152 },
    STUMP: { x: 995, y: 330, w: 195, h: 140 },
    SEMI: { x: 1365, y: 490, w: 122, h: 144 },
    TRUCK: { x: 1365, y: 644, w: 100, h: 78 },
    CAR03: { x: 1383, y: 760, w: 88, h: 55 },
    CAR02: { x: 1383, y: 825, w: 80, h: 59 },
    CAR04: { x: 1383, y: 894, w: 80, h: 57 },
    CAR01: { x: 1205, y: 1018, w: 80, h: 56 },

    AD1: { x:185, y:550, w:323, h:281},
    AD2: { x:521, y:549, w:284, h:190},
    AD3: { x:319, y:891, w:282, h:190},
    AD4: { x:11, y:891, w:284, h:190},

    DUST_LEFT: { x: 908, y: 527, w: 24, h: 19},
    DUST_RIGHT: { x: 958, y: 527, w: 24, h: 19},

    PLAYER0_RIGHT: { x: 1610, y: 108, w: 83, h: 42 },
    PLAYER0_LEFT: { x: 1719, y: 107, w: 83, h: 42 },
    PLAYER0_STRAIGHT: { x: 1829, y: 107, w: 70, h: 44 },
    PLAYER0_UPHILL_RIGHT: { x: 1614, y: 174, w: 77, h: 46 },
    PLAYER0_UPHILL_LEFT: { x: 1724, y: 174, w: 77, h: 46 },
    PLAYER0_UPHILL_STRAIGHT: { x: 1831, y: 174, w: 70, h: 45 },

    PLAYER1_RIGHT: { x: 1605, y: 262, w: 83, h: 42 },
    PLAYER1_LEFT: { x: 1720, y: 263, w: 83, h: 42 },
    PLAYER1_STRAIGHT: { x: 1830, y: 260, w: 70, h: 44 },
    PLAYER1_UPHILL_RIGHT: { x: 1609, y: 336, w: 77, h: 46 },
    PLAYER1_UPHILL_LEFT: { x: 1724, y: 335, w: 77, h: 46 },
    PLAYER1_UPHILL_STRAIGHT: { x: 1833, y: 335, w: 70, h: 45 },
};

SPRITES.SCALE = 0.3 * (1 / SPRITES.PLAYER0_STRAIGHT.w);

SPRITES.PLANTS = [SPRITES.TREE1, SPRITES.TREE2, SPRITES.DEAD_TREE1, SPRITES.DEAD_TREE2, SPRITES.PALM_TREE, SPRITES.BUSH1, SPRITES.BUSH2, SPRITES.CACTUS, SPRITES.STUMP, SPRITES.BOULDER1, SPRITES.BOULDER2, SPRITES.BOULDER3];
SPRITES.CARS = [SPRITES.CAR01, SPRITES.CAR02, SPRITES.CAR03, SPRITES.CAR04, SPRITES.SEMI, SPRITES.TRUCK];
SPRITES.AD = [SPRITES.AD1, SPRITES.AD2, SPRITES.AD3, SPRITES.AD4];


let GAME_STATES = {
    START: 0,
    GAME: 1,
    RESULT: 2,
    STOP: 3,
}