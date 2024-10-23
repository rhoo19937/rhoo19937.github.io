let fps = 60;
let step = 1 / fps;
let width = 1024; // 画面の解像度
let height = 768;
let centrifugal = 0.015;
let skySpeed = 0.001;
let hillSpeed = 0.002;
let treeSpeed = 0.003;
let roadWidth = 2000;
let segmentLength = 200;
let rumbleLength = 3;
let lanes = 3;
let fieldOfView = 100;
let cameraHeight = 1000;
let drawDistance = 300;
let fogDensity = 5;
let maxSpeed = segmentLength / step;
let accel = maxSpeed / 5;
let breaking = -maxSpeed / 5;
let decel = -maxSpeed / 5;
let offRoadDecel = -maxSpeed / 2;
let offRoadLimit = maxSpeed / 4;
let maxRotateLevel = 1;
let speedDecreaseRatio = 0.75;
let cameraDepth = 1 / Math.tan((fieldOfView / 2) * Math.PI / 180);
let playerZ = cameraHeight * cameraDepth;



let stageNum = S.length;
let defaultStage = 0;
let dummy_ctx = Dom.get('dummy').getContext('2d');



let R = {
    polygon: function (ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.lineTo(x4, y4);
        ctx.closePath();
        ctx.fill();
    },

    segment: function (ctx, width, lanes, x1, y1, w1, x2, y2, w2, fog, color) {
        let r1 = R.rumbleWidth(w1, lanes);
        let r2 = R.rumbleWidth(w2, lanes);
        let l1 = R.laneMarkerWidth(w1, lanes);
        let l2 = R.laneMarkerWidth(w2, lanes);

        ctx.fillStyle = color.grass;
        ctx.fillRect(0, y2, width, y1 - y2);

        R.polygon(ctx, x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, color.rumble);
        R.polygon(ctx, x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, color.rumble);
        R.polygon(ctx, x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, color.road);

        if (color.lane) {
            let lanew1 = w1 * 2 / lanes;
            let lanew2 = w2 * 2 / lanes;
            let lanex1 = x1 - w1 + lanew1;
            let lanex2 = x2 - w2 + lanew2;
            for (let lane=1; lane<lanes; lanex1+=lanew1, lanex2+=lanew2, lane++)
                R.polygon(ctx, lanex1 - l1 / 2, y1, lanex1 + l1 / 2, y1, lanex2 + l2 / 2, y2, lanex2 - l2 / 2, y2, color.lane);
        }

        R.fog(ctx, 0, y1, width, y2 - y1, fog);
    },

    rect: function (ctx, x, y, width, height, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width, height);
    },

    strokeRect: function (ctx, x, y, width, height, lineWidth, color) {
        ctx.lineWidth = lineWidth;
        ctx.fillStyle = color;
        ctx.strokeRect(x, y, width, height);
    },

    background: function (ctx, background, width, height, layer, rotation, offset) {
        rotation = rotation || 0;
        offset = offset || 0;

        let imageW = layer.w / 2;
        let imageH = layer.h;

        let sourceX = layer.x + Math.floor(layer.w * rotation);
        let sourceY = layer.y
        let sourceW = Math.min(imageW, layer.x + layer.w - sourceX);
        let sourceH = imageH;

        let destX = 0;
        let destY = offset;
        let destW = Math.floor(width * (sourceW / imageW));
        let destH = height;

        ctx.drawImage(background, sourceX, sourceY, sourceW, sourceH, destX, destY, destW, destH);
        if (sourceW < imageW)
            ctx.drawImage(background, layer.x, sourceY, imageW - sourceW, sourceH, destW - 1, destY, width - destW, destH);
    },

    arc: function (ctx, x, y, r, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2, false);
        ctx.closePath();
        ctx.fill();
    },

    text: function (ctx, text, x, y, color, size) {
        ctx.font = "" + size + "px 'Impact'";
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);

        ctx.lineWidth = 3;
        ctx.miterLimit = 5;
        ctx.fillStyle = "#000000";
        ctx.strokeText(text, x, y);
    },

    textItalic: function (ctx, text, x, y, color, size) {
        ctx.font = "italic " + size + "px 'Impact'";
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);

        ctx.lineWidth = 3;
        ctx.miterLimit = 5;
        ctx.fillStyle = "#000000";
        ctx.strokeText(text, x, y);
    },

    textNonStroke: function (ctx, text, x, y, color, size) {
        ctx.font = "" + size + "px 'Impact'";
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
    },

    measureText: function (text, size) {
        dummy_ctx.font = "" + size + "px 'Impact'";
        let res = dummy_ctx.measureText(text);
        return {
            height: res.actualBoundingBoxAscent + res.actualBoundingBoxDescent,
            width: res.width,
        }
    },

    measureTextItalic: function (text, size) {
        dummy_ctx.font = "italic " + size + "px 'Impact'";
        let res = dummy_ctx.measureText(text);
        return {
            height: res.actualBoundingBoxAscent + res.actualBoundingBoxDescent,
            width: res.width,
        }
    },

    sprite: function (ctx, width, roadWidth, sprites, sprite, scale, destX, destY, offsetX, offsetY, clipY) {
        let destW = (sprite.w * scale * width / 2) * (SPRITES.SCALE * roadWidth);
        let destH = (sprite.h * scale * width / 2) * (SPRITES.SCALE * roadWidth);

        destX = destX + (destW * (offsetX || 0));
        destY = destY + (destH * (offsetY || 0));

        let clipH = clipY ? Math.max(0, destY + destH - clipY) : 0;
        if (clipH < destH) {
            ctx.drawImage(sprites, sprite.x, sprite.y, sprite.w, sprite.h - (sprite.h * clipH / destH), destX, destY, destW, destH - clipH);
        }
    },

    player: function (ctx, width, roadWidth, sprites, speedPercent, scale, destX, destY, steer, updown, player, dust_left, dust_right) {
        let bounce = (1.5 * Math.random() * speedPercent * 1.6) * Util.randomChoice([-1, 1]);
        let sprite;

        if (player == 0) {
            if (steer < 0) {
                sprite = (updown > 0) ? SPRITES.PLAYER1_UPHILL_LEFT : SPRITES.PLAYER1_LEFT;
            } else if (steer > 0) {
                sprite = (updown > 0) ? SPRITES.PLAYER1_UPHILL_RIGHT : SPRITES.PLAYER1_RIGHT;
            } else {
                sprite = (updown > 0) ? SPRITES.PLAYER1_UPHILL_STRAIGHT : SPRITES.PLAYER1_STRAIGHT;
            }
        } else {
            if (steer < 0) {
                sprite = (updown > 0) ? SPRITES.PLAYER0_UPHILL_LEFT : SPRITES.PLAYER0_LEFT;
            } else if (steer > 0) {
                sprite = (updown > 0) ? SPRITES.PLAYER0_UPHILL_RIGHT : SPRITES.PLAYER0_RIGHT;
            } else {
                sprite = (updown > 0) ? SPRITES.PLAYER0_UPHILL_STRAIGHT : SPRITES.PLAYER0_STRAIGHT;
            }
        }

        R.sprite(ctx, width, roadWidth, sprites, sprite, scale, destX, destY + bounce, -0.5, -1);

        if (dust_left) {
            if (steer < 0) {
                sprite = SPRITES.DUST_RIGHT;
                R.sprite(ctx, width, roadWidth, sprites, sprite, scale, destX - 60, destY + bounce, -0.5, -1);
            } else {
                sprite = SPRITES.DUST_LEFT;
                R.sprite(ctx, width, roadWidth, sprites, sprite, scale, destX - 140, destY + bounce, -0.5, -1);
            }
        }
        if (dust_right) {
            if (steer > 0) {
                sprite = SPRITES.DUST_LEFT;
                R.sprite(ctx, width, roadWidth, sprites, sprite, scale, destX + 60, destY + bounce, -0.5, -1);
            } else {
                sprite = SPRITES.DUST_RIGHT;
                R.sprite(ctx, width, roadWidth, sprites, sprite, scale, destX + 140, destY + bounce, -0.5, -1);
            }
        }
    },

    fog: function (ctx, x, y, width, height, fog) {
        if (fog < 1) {
            ctx.globalAlpha = (1 - fog)
            ctx.fillStyle = COLORS.FOG;
            ctx.fillRect(x, y, width, height);
            ctx.globalAlpha = 1;
        }
    },

    rumbleWidth: function (projectedRoadWidth, lanes) { return projectedRoadWidth / Math.max(6, 2 * lanes); },
    laneMarkerWidth: function (projectedRoadWidth, lanes) { return projectedRoadWidth / Math.max(32, 8 * lanes); }
}



function getSegmentIndex(z) {
    return Math.floor(z / segmentLength) % g.segments.length;
}


function findSegment(z) {
    return g.segments[getSegmentIndex(z)];
}


function lastY() { return (g.segments.length == 0) ? 0 : g.segments[g.segments.length - 1].p2.world.y; }



// ゲームの車の位置とかプレイヤーで共通のもの
function makeState() {
    return {
        trackLength: null,
        segments: [],
        goal_idnex: 0,
        cars: [],
        press: false,
        countdown: 0,
        winner: -1,
    }
}


let sprite = null;
let background = null;

let countdownAudio = null;
let crashAudio = [null, null];
let offroadAudio = [null, null];

let stage = defaultStage;


let g = makeState();


function makePlayer(id) {
    let canvas = Dom.get('game' + id);
    canvas.width = 1024;
    canvas.height = 768;
    canvas.style.width = '512px';
    canvas.style.height = '384px';
    let ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    
    return {
        id: id,
        state: GAME_STATES.START,
        swap_state: GAME_STATES.STOP,
        canvas: canvas,
        ctx: ctx,
        rotateLevel: 0,
        playerX: (id == 0 ? -0.5 : 0.5),
        position: 0,
        speed: 0,
        currentLapTime: 0,
        keyLeft: false,
        keyRight: false,
        keySlower: false,
        keyFaster: false,
        displaySpeed: 0,
        callUpdate: 0,
        oldPosition: 0,
        oldPosition2: 0,
        skyOffset: 0,
        hillOffset: 0,
        treeOffset: 0,
        goalTime: 0,
        flag: false,
    }
}


let Ps = [makePlayer(0), makePlayer(1)];


function update(dt) {
    updatePlayer(dt, Ps[0]);
    updatePlayer(dt, Ps[1]);
}



function updatePlayer(dt, P) {
    let is_start = P.state == GAME_STATES.START;
    let is_gaming = P.state == GAME_STATES.GAME;
    let is_result = P.state == GAME_STATES.RESULT;
    let is_stop = P.state == GAME_STATES.STOP;

    if (is_stop) {
        return;
    }

    if (is_start && g.press) {
        g.countdown = g.countdown - dt / 2;
        if (g.countdown <= 0) {
            P.state = GAME_STATES.GAME;
        }
    }

    if (!is_gaming) {
        P.keyLeft = P.keyRight = P.keyFaster = P.keySlower = false;
    }

    if (is_result) {
        P.keyFaster = true;
    }

    let playerSegment = findSegment(P.position + playerZ);

    if (is_gaming && P.goalTime == 0 && g.goalIndex <= playerSegment.index) {
        if (g.winner == -1) {
            g.winner = P.id;
        }
        P.state = GAME_STATES.RESULT;
        P.goalTime = P.currentLapTime;
    }

    let playerW = SPRITES.PLAYER0_STRAIGHT.w * SPRITES.SCALE;
    let speedPercent = P.speed / maxSpeed;
    let dx = dt * 2 * speedPercent;
    let startPosition = P.position;

    updateCars(dt, playerSegment, playerW, P);

    let oldFraction = (P.position + playerZ) / segmentLength % 1;
    let oldIndex = getSegmentIndex(P.position + playerZ);
    P.position = Util.increase(P.position, dt * P.speed, g.trackLength);
    let newFraction = (P.position + playerZ) / segmentLength % 1;
    let newIndex = getSegmentIndex(P.position + playerZ);
    
    if (P.keyLeft) {
        P.rotateLevel -= 1;
    } else if (P.keyRight) {
        P.rotateLevel += 1;
    } else if (P.rotateLevel > 0) {
        P.rotateLevel -= 1;
    } else if (P.rotateLevel < 0) {
        P.rotateLevel += 1;
    }

    P.rotateLevel = Util.limit(P.rotateLevel, -maxRotateLevel, maxRotateLevel);
    P.playerX += dx * P.rotateLevel / maxRotateLevel;

    let nowCentrifugal = (!is_gaming ? 0 : centrifugal);

    if (P.oldPosition2 != P.position) {
        if (oldIndex == newIndex) {
            P.playerX -= g.segments[oldIndex].curve * nowCentrifugal * (newFraction - oldFraction);
        } else {
            P.playerX -= g.segments[oldIndex].curve * nowCentrifugal * (1 - oldFraction);
            for(let i = oldIndex + 1; i < newIndex; i++) {
                P.playerX -= g.segments[i].curve * nowCentrifugal;
            }
            P.playerX -= g.segments[newIndex].curve * nowCentrifugal * newFraction;
        }
    }

    P.oldPosition2 = P.position;

    if (P.keySlower) {
        P.speed = Util.accelerate(P.speed, breaking, dt);
    } else if (P.keyFaster || !is_start) {
        P.speed = Util.accelerate(P.speed, accel, dt);
    } else {
        P.speed = Util.accelerate(P.speed, decel, dt);
    }

    if (is_result) {
        P.speed = Math.min(P.speed, 40 * 100);
    }

    let any = false;

    if ((P.playerX < -1) || (P.playerX > 1)) {
        offroadAudio[P.id].play();
        if (P.speed > offRoadLimit) {
            P.speed = Util.accelerate(P.speed, offRoadDecel, dt);
        }

        for (let n = 0; n < playerSegment.sprites.length; n++) {
            let sprite = playerSegment.sprites[n];
            let spriteW = sprite.source.w * SPRITES.SCALE;
            if (Util.overlap(P.playerX, playerW, sprite.offset + spriteW / 2 * (sprite.offset > 0 ? 1 : -1), spriteW)) {
                if (!P.flag) {
                    crashAudio[P.id].currentTime = 0;
                    crashAudio[P.id].play();
                    P.flag = true;
                }
                any = true;
                
                P.speed = maxSpeed / 5;
                P.position = Util.increase(playerSegment.p1.world.z, -playerZ, g.trackLength);
                break;
            }
        }
    } else {
        offroadAudio[P.id].pause();
    }

    if (P.displaySpeed == 0) {
        offroadAudio[P.id].pause();
    }

    for (let n = 0; n < playerSegment.cars.length; n++) {
        let car = playerSegment.cars[n];
        let carW = car.sprite.w * SPRITES.SCALE;
        if (P.speed > car.speed) {
            if (Util.overlap(P.playerX, playerW, car.offset, carW, 0.8)) {
                if (!P.flag) {
                    crashAudio[P.id].currentTime = 0;
                    crashAudio[P.id].play();
                    P.flag = true;
                }
                any = true;
                
                P.speed = car.speed * (car.speed / P.speed);
                P.position = Util.increase(car.z, -playerZ, g.trackLength);
                break;
            }
        }
    }

    let otherPlayer = Ps[1 - P.id];
    if (P.speed > otherPlayer.speed
        && getSegmentIndex(P.position + playerZ) + 4 == getSegmentIndex(otherPlayer.position + playerZ)) {
        if (Util.overlap(P.playerX, playerW, otherPlayer.playerX, playerW, 0.8)) {
            if (!P.flag) {
                crashAudio[P.id].currentTime = 0;
                crashAudio[P.id].play();
                P.flag = true;
            }
            any = true;
            
            P.speed = otherPlayer.speed * (otherPlayer.speed / P.speed);
        }
    }

    if (!any) {
        P.flag = false;
    }

    P.playerX = Util.limit(P.playerX, -3, 3);
    P.speed = Util.limit(P.speed, 0, maxSpeed);

    P.skyOffset = Util.increase(P.skyOffset, skySpeed * playerSegment.curve * (P.position - startPosition) / segmentLength, 1);
    P.hillOffset = Util.increase(P.hillOffset, hillSpeed * playerSegment.curve * (P.position - startPosition) / segmentLength, 1);
    P.treeOffset = Util.increase(P.treeOffset, treeSpeed * playerSegment.curve * (P.position - startPosition) / segmentLength, 1);

    if (is_gaming) {
        P.currentLapTime += dt;
    }
}


function updateCars(dt, playerSegment, playerW, P) {
    for (let n = 0; n < g.cars.length; n++) {
        let car = g.cars[n];

        let oldSegment = findSegment(car.z);
        car.offset = car.offset + updateCarOffset(car, oldSegment, playerSegment, playerW, P);
        car.z = Util.increase(car.z, dt * car.speed, g.trackLength);
        car.percent = Util.percentRemaining(car.z, segmentLength);
        let newSegment = findSegment(car.z);
        if (oldSegment != newSegment) {
            index = oldSegment.cars.indexOf(car);
            oldSegment.cars.splice(index, 1);
            newSegment.cars.push(car);
        }
    }
}


function updateCarOffset(car, carSegment, playerSegment, playerW, P) {
    let lookahead = 20;
    let carW = car.sprite.w * SPRITES.SCALE;

    if ((carSegment.index - playerSegment.index) > drawDistance) {
        return 0;
    }

    for (let i = 1; i < lookahead; i++) {
        let segment = g.segments[(carSegment.index + i) % g.segments.length];

        if ((segment === playerSegment) && (car.speed > P.speed) && (Util.overlap(P.playerX, playerW, car.offset, carW, 1.2))) {
            let dir;
            if (P.playerX > 0.5) {
                dir = -1;
            } else if (P.playerX < -0.5) {
                dir = 1;
            } else {
                dir = (car.offset > P.playerX) ? 1 : -1;
            }
            return dir * 1 / i * (car.speed - P.speed) / maxSpeed;
        }

        for (let j = 0; j < segment.cars.length; j++) {
            let otherCar = segment.cars[j];
            let otherCarW = otherCar.sprite.w * SPRITES.SCALE;
            if ((car.speed > otherCar.speed) && Util.overlap(car.offset, carW, otherCar.offset, otherCarW, 1.2)) {
                let dir;
                if (otherCar.offset > 0.5) {
                    dir = -1;
                } else if (otherCar.offset < -0.5) {
                    dir = 1;
                } else {
                    dir = (car.offset > otherCar.offset) ? 1 : -1;
                }
                return dir * 1 / i * (car.speed - otherCar.speed) / maxSpeed;
            }
        }
    }

    if (car.offset < -0.9) {
        return 0.1;
    } else if (car.offset > 0.9) {
        return -0.1;
    } else {
        return 0;
    }
}


function render() {
    for (let i = 0; i <= 1; i++) {
        let player = Ps[i];
        let state = player.state;

        if (state == GAME_STATES.START) {
            renderGaming(player);
            if (g.press) {
                renderStart(player, '' + Math.ceil(g.countdown));
            } else {
                renderSelectStage(player);
                renderStart(player, 'START');
            }
        } else if (state == GAME_STATES.GAME) {
            renderGaming(player);
            renderHUD(player);
        } else if (state == GAME_STATES.RESULT) {
            renderGaming(player);
            renderResult(player);
        } else if (state == GAME_STATES.STOP) {
            renderGaming(player);
            renderStop(player);
        }
    }
}


function renderSelectStage(P) {
    let width = P.canvas.width;
    let height = P.canvas.height;
    
    R.rect(P.ctx, width / 5, height * 3 / 5, width * 3 / 5, height * 1.5 / 5, COLORS.GRAY);

    let res = R.measureText(S[stage].name, 50);
    let cur_height = height * 3 / 5 + 15 + res.height;
    R.textNonStroke(P.ctx, S[stage].name, (width - res.width) / 2, cur_height, '#ffffff', 50);

    let texts = S[stage].discription.split('\n');
    for(let i = 0; i < texts.length; i++) {
        let res = R.measureText(texts[i], 30);

        if (i == 0) {
            cur_height += 30;
        } else {
            cur_height += 15;
        }
        cur_height += res.height;

        R.textNonStroke(P.ctx, texts[i], (width - res.width) / 2, cur_height, '#ffffff', 30);
    }
    
    let s = width * 3 / 10;
    let t = width * 7 / 10;
    function lerp(r) {
        return s + (t - s) * r;
    }

    for(let i = 0; i < stageNum; i++) {
        let color;
        if (i == stage) {
            color = '#e73f32';
        } else {
            color = '#b3b5b3';
        }
        R.arc(P.ctx, lerp(i / (stageNum - 1)), height * 17 / 20, 7, color);
    }
}


function renderStart(P, text) {
    let width = P.canvas.width;
    let height = P.canvas.height;

    R.rect(P.ctx, 0, height / 2 - 25, width, 55, COLORS.GRAY);

    let size = R.measureTextItalic(text, 50);
    R.textItalic(P.ctx, text, (width - size.width) / 2, (height + size.height) / 2, '#ffffff', 50);
}


function renderResult(P) {
    let width = P.canvas.width;
    let height = P.canvas.height;

    R.rect(P.ctx, 0, 0, width, height, COLORS.GRAY);

    R.text(P.ctx, '', 0, 0, COLORS.TEXT, 50);

    let res = R.measureText('RESULT', 50);
    R.text(P.ctx, 'RESULT', (width - res.width) / 2, 100, COLORS.TEXT, 50);

    let text = 'TIME:  ' + getDisplayTime(P.goalTime);
    res = R.measureText(text, 50);
    R.text(P.ctx, text, (width - res.width) / 2, 200, COLORS.TEXT, 50);
    R.text(P.ctx, '', 0, 0, COLORS.TEXT, 75);
    
    if (P.id == g.winner){
        text = 'YOU WIN!';
    } else{
        text = 'YOU LOSE';
    }
    
    res = R.measureText(text, 75);
    R.text(P.ctx, text, (width - res.width) / 2, height * 2 / 3, COLORS.TEXT, 75);
}


function renderGaming(P) {
    let baseSegment = findSegment(P.position);
    let basePercent = Util.percentRemaining(P.position, segmentLength);
    let playerSegment = findSegment(P.position + playerZ);
    let playerPercent = Util.percentRemaining(P.position + playerZ, segmentLength);
    let playerY = Util.interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);
    let maxy = height;

    let x = 0;
    let dx = - (baseSegment.curve * basePercent);

    P.ctx.clearRect(0, 0, width, height);
    R.background(P.ctx, background, width, height, BACKGROUND.SKY, P.skyOffset, P.resolution * skySpeed * playerY);
    R.background(P.ctx, background, width, height, BACKGROUND.HILLS, P.hillOffset, P.resolution * hillSpeed * playerY);
    R.background(P.ctx, background, width, height, BACKGROUND.TREES, P.treeOffset, P.resolution * treeSpeed * playerY);

    for (let n = 0; n < drawDistance; n++) {
        let segment = g.segments[(baseSegment.index + n) % g.segments.length];
        segment.looped = segment.index < baseSegment.index;
        segment.fog = Util.exponentialFog(n / drawDistance, fogDensity);
        segment.clip = maxy;

        Util.project(segment.p1, (P.playerX * roadWidth) - x, playerY + cameraHeight, P.position - (segment.looped ? g.trackLength : 0), cameraDepth, width, height, roadWidth);
        Util.project(segment.p2, (P.playerX * roadWidth) - x - dx, playerY + cameraHeight, P.position - (segment.looped ? g.trackLength : 0), cameraDepth, width, height, roadWidth);

        x = x + dx;
        dx = dx + segment.curve;

        if ((segment.p1.camera.z <= cameraDepth) || (segment.p2.screen.y >= segment.p1.screen.y) || (segment.p2.screen.y >= maxy)) {
            continue;
        }

        R.segment(P.ctx, width, lanes,
            segment.p1.screen.x,
            segment.p1.screen.y,
            segment.p1.screen.w,
            segment.p2.screen.x,
            segment.p2.screen.y,
            segment.p2.screen.w,
            segment.fog,
            segment.color);

        maxy = segment.p1.screen.y;
    }

    let otherPlayer = Ps[1 - P.id];
    let otherPlayerSegment = findSegment(otherPlayer.position);

    for (let n = (drawDistance - 1); n > 0; n--) {
        let segmentIndex = (baseSegment.index + n) % g.segments.length;
        let segment = g.segments[segmentIndex];

        if (segmentIndex == otherPlayerSegment.index) {
            let steer = getPlayerSteer(otherPlayer);
            let updown = segment.p2.world.y - segment.p1.world.y;
            let sprite;

            if (P.id == 0){
                if (steer < 0) {
                    sprite = (updown > 0) ? SPRITES.PLAYER0_UPHILL_LEFT : SPRITES.PLAYER0_LEFT;
                } else if (steer > 0) {
                    sprite = (updown > 0) ? SPRITES.PLAYER0_UPHILL_RIGHT : SPRITES.PLAYER0_RIGHT;
                } else {
                    sprite = (updown > 0) ? SPRITES.PLAYER0_UPHILL_STRAIGHT : SPRITES.PLAYER0_STRAIGHT;
                }
            } else{
                if (steer < 0) {
                    sprite = (updown > 0) ? SPRITES.PLAYER1_UPHILL_LEFT : SPRITES.PLAYER1_LEFT;
                } else if (steer > 0){
                    sprite = (updown > 0) ? SPRITES.PLAYER1_UPHILL_RIGHT : SPRITES.PLAYER1_RIGHT;
                } else {
                    sprite = (updown > 0) ? SPRITES.PLAYER1_UPHILL_STRAIGHT : SPRITES.PLAYER1_STRAIGHT;
                }
            }

            let percent = Util.percentRemaining(otherPlayer.position, segmentLength)
            let spriteScale = Util.interpolate(segment.p1.screen.scale, segment.p2.screen.scale, percent);
            let spriteX = Util.interpolate(segment.p1.screen.x, segment.p2.screen.x, percent) + (spriteScale * otherPlayer.playerX * roadWidth * width / 2);
            let spriteY = Util.interpolate(segment.p1.screen.y, segment.p2.screen.y, percent);

            R.sprite(P.ctx, width, roadWidth, sprites, sprite, spriteScale, spriteX, spriteY, -0.5, -1, segment.clip);
        }

        for (let i = 0; i < segment.cars.length; i++) {
            let car = segment.cars[i];
            let spriteScale = Util.interpolate(segment.p1.screen.scale, segment.p2.screen.scale, car.percent);
            let spriteX = Util.interpolate(segment.p1.screen.x, segment.p2.screen.x, car.percent) + (spriteScale * car.offset * roadWidth * width / 2);
            let spriteY = Util.interpolate(segment.p1.screen.y, segment.p2.screen.y, car.percent);
            R.sprite(P.ctx, width, roadWidth, sprites, car.sprite, spriteScale, spriteX, spriteY, -0.5, -1, segment.clip);
        }

        for (let i = 0; i < segment.sprites.length; i++) {
            let sprite = segment.sprites[i];
            let spriteScale = segment.p1.screen.scale;
            let spriteX = segment.p1.screen.x + (spriteScale * sprite.offset * roadWidth * width / 2);
            let spriteY = segment.p1.screen.y;
            R.sprite(P.ctx, width, roadWidth, sprites, sprite.source, spriteScale, spriteX, spriteY, (sprite.offset < 0 ? -1 : 0), -1, segment.clip);
        }

        if (segment == playerSegment) {
            let dust_left = ((P.playerX < -1) || (P.playerX > 1.25)) && P.displaySpeed > 0;
            let dust_right = ((P.playerX < -1.25) || (P.playerX > 1)) && P.displaySpeed > 0;

            R.player(P.ctx, width, roadWidth, sprites, P.speed / maxSpeed,
                cameraDepth / playerZ,
                width / 2,
                (height / 2) - (cameraDepth / playerZ * Util.interpolate(playerSegment.p1.camera.y, playerSegment.p2.camera.y, playerPercent) * height / 2),
                getPlayerSteer(P),
                playerSegment.p2.world.y - playerSegment.p1.world.y,
                P.id,
                dust_left, dust_right,
            );
        }
    }
    
    P.callUpdate += 1;
    if (P.callUpdate % 4 == 0) {
        if (P.oldPosition == P.position) {
            P.displaySpeed = 0;
        } else if (P.callUpdate % 24 == 0) {
            P.displaySpeed = P.speed / 100;
        }
        P.oldPosition = P.position;
    }
}



function renderHUD(P) {
    drawSpeed(P, 350, 70);
    drawTime(P, 50, 70);
    drawMiniMap(P, 100, 140);
}



function renderStop(P) {
    let width = P.canvas.width;
    let height = P.canvas.height;

    R.rect(P.ctx, 0, 0, width, height, COLORS.GRAY);
}



function getPlayerSteer(P) {
    return P.speed * (P.keyLeft ? -1 : P.keyRight ? 1 : 0);
}


function getDisplayTime(time) {
    return '' + Math.floor(time / 60) % 10 + '\' ' + ('000' + Math.floor(time % 60)).slice(-2);
}



function drawSpeed(P, x, y) {
    let speed = P.displaySpeed;
    let max_speed = maxSpeed / 100;
    let speed_lv = Math.ceil(speed * 12 / max_speed);

    R.text(P.ctx, 'KM/H', 220 + x, y, COLORS.TEXT, 50);
    R.text(P.ctx, 'SPEED', x, y, COLORS.TEXT, 50);

    const COLOR_TABLE = ['#45ab56', '#ddd764', '#fbd824', '#fd9202', '#f83636'];
    const HEIGHT_TABLE = [20, 20, 20, 20, 22, 25, 29, 35, 40, 40, 40, 40];

    let text = '' + Math.ceil(speed);
    let color = COLOR_TABLE[Math.min(Math.floor(speed_lv / 2), 4)];
    let res = R.measureText(text, 50);
    
    R.text(P.ctx, text, 215 - res.width + x, y, color, 50);

    for (let i = 0; i < Math.min(speed_lv, 12); i++) {
        let height = HEIGHT_TABLE[i];
        R.strokeRect(P.ctx, 370 + i * 20 + x, y - height, 10, height, 5, 'rgb(0,0,0)');
        
        color = COLOR_TABLE[Math.min(Math.floor(i / 2), 4)];
        R.rect(P.ctx, 370 + i * 20 + x, y - height, 10, height, color);
    }
}



function drawTime(P, x, y) {
    let text = getDisplayTime(P.currentLapTime);
    R.text(P.ctx, 'TIME', x, y, COLORS.TEXT, 50);
    R.text(P.ctx, text, 130 + x, y, COLORS.TEXT, 50);
}



function drawMiniMap(P, x, y) {
    R.text(P.ctx, 'G', 800 + x, y, COLORS.TEXT, 50);
    let size = R.measureText('S', 50);
    let width = size.width;
    let height = size.height;

    R.rect(P.ctx, x + width / 2, y - height * 2 / 3, 800 - width / 2, height / 3, '#b2b2b2');

    R.text(P.ctx, 'S', x, y, COLORS.TEXT, 50);
    P.ctx.fillStyle = '#000000';
    P.ctx.lineWidth = 3;
    P.ctx.beginPath();
    P.ctx.moveTo(x + width, y - height * 2 / 3);
    P.ctx.lineTo(800 + x, y - height * 2 / 3);
    P.ctx.stroke();

    P.ctx.beginPath();
    P.ctx.moveTo(x + width, y - height / 3);
    P.ctx.lineTo(800 + x, y - height / 3);
    P.ctx.stroke();

    let otherPlayer = Ps[1 - P.id];
    let position = Math.min(1, findSegment(otherPlayer.position).index / g.goalIndex) * 1.01;
    let color = (otherPlayer.id == 0 ? COLORS.CAR0 : COLORS.CAR1);
    R.arc(P.ctx, (10 + x + width) * (1 - position) + (780 + x) * position, y - height / 2, 15, color);

    position = Math.min(1, findSegment(P.position).index / g.goalIndex) * 1.01;
    color = (P.id == 0 ? COLORS.CAR0 : COLORS.CAR1);
    R.arc(P.ctx, (10 + x + width) * (1 - position) + (780 + x) * position, y - height / 2, 15, color);
}


function addSegment(curve, y) {
    let n = g.segments.length;
    g.segments.push({
        index: n,
        p1: { world: { y: lastY(), z: n * segmentLength }, camera: {}, screen: {} },
        p2: { world: { y: y, z: (n + 1) * segmentLength }, camera: {}, screen: {} },
        curve: curve,
        sprites: [],
        cars: [],
        color: Math.floor(n / rumbleLength) % 2 ? COLORS.DARK : COLORS.LIGHT
    });
}



function addSprite(n, sprite, offset) {
    g.segments[n].sprites.push({ source: sprite, offset: offset });
}



function addRoad(enter, hold, leave, curve, y) {
    let startY = lastY();
    let endY = startY + (Util.toInt(y, 0) * segmentLength);
    let total = enter + hold + leave;
    for (let n = 0; n < enter; n++) {
        addSegment(Util.easeIn(0, curve, n / enter), Util.easeInOut(startY, endY, n / total));
    }
    for (let n = 0; n < hold; n++) {
        addSegment(curve, Util.easeInOut(startY, endY, (enter + n) / total));
    }
    for (let n = 0; n < leave; n++) {
        addSegment(Util.easeInOut(curve, 0, n / leave), Util.easeInOut(startY, endY, (enter + hold + n) / total));
    }
}



let ROAD = {
    LENGTH: { NONE: 0, SHORT: 25, MEDIUM: 50, LONG: 100 },
    HILL: { NONE: 0, LOW: 20, MEDIUM: 40, HIGH: 60 },
    CURVE: { NONE: 0, EASY: 2, MEDIUM: 4, HARD: 6 }
};



function addStraight(num) {
    num = num || ROAD.LENGTH.MEDIUM;
    addRoad(num, num, num, 0, 0);
}



function addHill(num, height) {
    num = num || ROAD.LENGTH.MEDIUM;
    height = height || ROAD.HILL.MEDIUM;
    addRoad(num, num, num, 0, height);
}



function addCurve(num, curve, height) {
    num = num || ROAD.LENGTH.MEDIUM;
    curve = curve || ROAD.CURVE.MEDIUM;
    height = height || ROAD.HILL.NONE;
    addRoad(num, num, num, curve, height);
}



function addLowRollingHills(num, height) {
    num = num || ROAD.LENGTH.SHORT;
    height = height || ROAD.HILL.LOW;
    addRoad(num, num, num, 0, height / 2);
    addRoad(num, num, num, 0, -height);
    addRoad(num, num, num, ROAD.CURVE.EASY, height);
    addRoad(num, num, num, 0, 0);
    addRoad(num, num, num, -ROAD.CURVE.EASY, height / 2);
    addRoad(num, num, num, 0, 0);
}



function addSCurves() {
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.EASY, ROAD.HILL.NONE);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.CURVE.MEDIUM, ROAD.HILL.MEDIUM);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.CURVE.EASY, -ROAD.HILL.LOW);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.EASY, ROAD.HILL.MEDIUM);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.MEDIUM, -ROAD.HILL.MEDIUM);
}



function addBumps() {
    addRoad(10, 10, 10, 0, 5);
    addRoad(10, 10, 10, 0, -2);
    addRoad(10, 10, 10, 0, -5);
    addRoad(10, 10, 10, 0, 8);
    addRoad(10, 10, 10, 0, 5);
    addRoad(10, 10, 10, 0, -7);
    addRoad(10, 10, 10, 0, 5);
    addRoad(10, 10, 10, 0, -2);
}



function addDownhillToEnd(num) {
    num = num || 200;
    addRoad(num, num, num, -ROAD.CURVE.EASY, -lastY() / segmentLength);
}



function constructRoad0() {
    g.segments = [];
    
    // addStraight(ROAD.LENGTH.LONG);
    addSCurves();
    g.goalIndex = g.segments.length;
    addStraight(ROAD.LENGTH.LONG * 2);
    addDownhillToEnd();

    for (let n = 0; n < g.segments.length; n += 40) {
        addSprite(n, SPRITES.AD[Math.ceil(n / 40) % 4], 2);
        addSprite(n, SPRITES.AD[Math.ceil(n / 40) % 4], -2);
    }

    resetCars();

    let index = getSegmentIndex(playerZ);
    g.segments[index + 2].color = COLORS.START;
    g.segments[index + 3].color = COLORS.START;
    for (let n = 0; n < rumbleLength ; n++) {
        g.segments[g.goalIndex - 1 - n].color = COLORS.FINISH;
    }

    g.trackLength = g.segments.length * segmentLength;
}



function constructRoad1() {
    g.segments = [];

    addStraight(ROAD.LENGTH.SHORT);
    addLowRollingHills();
    addHill(ROAD.LENGTH.LONG, -ROAD.HILL.MEDIUM);
    addSCurves();
    addStraight();
    addSCurves();
    addBumps();
    addCurve(ROAD.LENGTH.LONG * 2, ROAD.CURVE.MEDIUM, ROAD.HILL.MEDIUM);
    addBumps();
    addHill(ROAD.LENGTH.LONG, -ROAD.HILL.MEDIUM);
    addSCurves();
    addStraight();
    addBumps();
    g.goalIndex = g.segments.length;
    addStraight(ROAD.LENGTH.LONG * 2);
    addDownhillToEnd();

    for (let n = 10; n < 200; n += 4 + Math.floor(n / 100)) {
        addSprite(n, SPRITES.PALM_TREE, 0.5 + Math.random() * 0.5);
        addSprite(n, SPRITES.PALM_TREE, 1 + Math.random() * 2);
        addSprite(n, SPRITES.PALM_TREE, -1 - Math.random() * 2);
        addSprite(n, SPRITES.PALM_TREE, -1 - Math.random() * 2);
    }

    for (let n = 250; n < 1000; n += 5) {
        addSprite(n, SPRITES.COLUMN, 1.1);
        addSprite(n + Util.randomInt(0, 5), SPRITES.TREE1, -1 - (Math.random() * 2));
        addSprite(n + Util.randomInt(0, 5), SPRITES.TREE2, -1 - (Math.random() * 2));
    }

    for (let n = 200; n < g.segments.length; n += 3) {
        addSprite(n, Util.randomChoice(SPRITES.PLANTS), Util.randomChoice([1, -1]) * (2 + Math.random() * 5));
    }

    for (let n = 1000; n < (g.segments.length - 50); n += 100) {
        let side = Util.randomChoice([1, -1]);
        for (let i = 0; i < 20; i++) {
            let sprite = Util.randomChoice(SPRITES.PLANTS);
            let offset = side * (1.5 + Math.random());
            addSprite(n + Util.randomInt(0, 50), sprite, offset);
        }
    }
    
    resetCars();

    let index = getSegmentIndex(playerZ);
    g.segments[index + 2].color = COLORS.START;
    g.segments[index + 3].color = COLORS.START;
    for (let n = 0; n < rumbleLength ; n++) {
        g.segments[g.goalIndex - 1 - n].color = COLORS.FINISH;
    }

    g.trackLength = g.segments.length * segmentLength;
}



function constructRoad2() {
    g.segments = [];
    
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.EASY, ROAD.HILL.HIGH);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.CURVE.MEDIUM, -ROAD.HILL.HIGH);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.CURVE.EASY, ROAD.HILL.HIGH);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.EASY, -ROAD.HILL.HIGH);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.MEDIUM, ROAD.HILL.HIGH);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.EASY, -ROAD.HILL.HIGH);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.CURVE.MEDIUM, ROAD.HILL.HIGH);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.CURVE.EASY, -ROAD.HILL.HIGH);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.EASY, ROAD.HILL.HIGH);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.MEDIUM, -ROAD.HILL.HIGH);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.EASY, -ROAD.HILL.HIGH);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.CURVE.MEDIUM, ROAD.HILL.HIGH);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.CURVE.EASY, -ROAD.HILL.HIGH);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.EASY, ROAD.HILL.HIGH);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.MEDIUM, -ROAD.HILL.HIGH);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.EASY, -ROAD.HILL.HIGH);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.CURVE.MEDIUM, ROAD.HILL.HIGH);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.CURVE.EASY, -ROAD.HILL.HIGH);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.EASY, ROAD.HILL.HIGH);
    addRoad(ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, ROAD.LENGTH.MEDIUM, -ROAD.CURVE.MEDIUM, -ROAD.HILL.HIGH);
    g.goalIndex = g.segments.length;
    addStraight(ROAD.LENGTH.LONG * 2);

    for (let n = 0; n < g.segments.length; n += 5) {
        addSprite(n, SPRITES.COLUMN, -1.1);
        addSprite(n, SPRITES.COLUMN, 1.1);
    }

    resetCars();

    let index = getSegmentIndex(playerZ);
    g.segments[index + 2].color = COLORS.START;
    g.segments[index + 3].color = COLORS.START;
    for (let n = 0; n < rumbleLength ; n++) {
        g.segments[g.goalIndex - 1 - n].color = COLORS.FINISH;
    }

    g.trackLength = g.segments.length * segmentLength;
}



function resetRoad(stage) {
    if (stage == 0) {
        constructRoad0();
    } else if (stage == 1){
        constructRoad1();
    } else {
        constructRoad2();
    }
}



function resetCars() {
    g.cars = [];
    for (let n = 0; n < S[stage].totalCars; n++) {
        let offset = Math.random() * Util.randomChoice([-0.8, 0.8]);
        let z = Math.floor(Math.random() * g.segments.length) * segmentLength;
        let sprite = Util.randomChoice(SPRITES.CARS);
        let speed = maxSpeed / 3 + Math.random() * maxSpeed / (sprite == SPRITES.SEMI ? 4 : 2) / 2; // TODO: あまりに違う値にすると車同士が衝突するときの挙動をサボっているので困る
        let car = { offset: offset, z: z, sprite: sprite, speed: speed / 2, index: n }; // 注意: playerごとに車を更新しているので、速度が二倍になる
        let segment = findSegment(car.z);
        segment.cars.push(car);
        g.cars.push(car);
    }
}



function initGame() {
    g.press = false;
    g.countdown = 3.01;
    Ps = [makePlayer(0), makePlayer(1)];
    countdownAudio.currentTime = 0;
    g.winner = -1;
    resetRoad(stage);
}



Dom.on(document, 'mousedown', (event) => {
    if (event.button === BUTTON.LEFT) {
        Ps[1].keyLeft = true;
    } else if (event.button === BUTTON.RIGHT) {
        Ps[1].keyRight = true;
    }
});

Dom.on(document, 'mouseup', (event) => {
    if (event.button === BUTTON.LEFT) {
        Ps[1].keyLeft = false;
    } else if (event.button === BUTTON.RIGHT) {
        Ps[1].keyRight = false;
    }
});

document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});


Game.run({
    canvas: [Ps[0].canvas, Ps[1].canvas], render: render, update: update, step: step,
    images: ['background', 'sprites'],
    keys: [
        { keys: [KEY.A], mode: 'down', action: function () { Ps[0].keyLeft = true; } },
        { keys: [KEY.J], mode: 'down', action: function () { Ps[1].keyLeft = true; } },
        { keys: [KEY.A], mode: 'up', action: function () { Ps[0].keyLeft = false; } },
        { keys: [KEY.J], mode: 'up', action: function () { Ps[1].keyLeft = false; } },
        { keys: [KEY.D], mode: 'down', action: function () { Ps[0].keyRight = true; } },
        { keys: [KEY.L], mode: 'down', action: function () { Ps[1].keyRight = true; } },
        { keys: [KEY.D], mode: 'up', action: function () { Ps[0].keyRight = false; } },
        { keys: [KEY.L], mode: 'up', action: function () { Ps[1].keyRight = false; } },
        { keys: [KEY.W], mode: 'up', action: function () { Ps[0].keyFaster = false; } },
        { keys: [KEY.I], mode: 'up', action: function () { Ps[1].keyFaster = false; } },
        { keys: [KEY.W], mode: 'down', action: function () { Ps[0].keyFaster = true; } },
        { keys: [KEY.I], mode: 'down', action: function () { Ps[1].keyFaster = true; } },
        { keys: [KEY.S], mode: 'down', action: function () { Ps[0].keySlower = true; } },
        { keys: [KEY.K], mode: 'down', action: function () { Ps[1].keySlower = true; } },
        { keys: [KEY.S], mode: 'up', action: function () { Ps[0].keySlower = false; } },
        { keys: [KEY.K], mode: 'up', action: function () { Ps[1].keySlower = false; } },
        { keys: [KEY.Q], mode: 'down', action: function () {
            for(let i = 0; i <= 1; i++) {
                let t = Ps[i].swap_state;
                Ps[i].swap_state = Ps[i].state;
                Ps[i].state = t;
            }
        }},
        { keys: [KEY.N], mode: 'down', action: function () {
            stage = defaultStage;
            initGame();
        }},
        { keys: [KEY.Enter], mode: 'down', action: function () {
            if (!g.press) {
                countdownAudio.play();
            }
            g.press = true;
        }},
        { keys: [KEY.B], mode: 'down', action: function () {
            if (document.body.style.background == "white") {
                document.body.style.background = "black";
            } else {
                document.body.style.background = "white";
            }
        }},
        { keys: [KEY.G], mode: 'down', action: function () {
            const markers = document.querySelectorAll('.marker');
            if (document.documentElement.style.cursor == 'none') {
                document.documentElement.style.cursor = '';
            } else {
                document.documentElement.style.cursor = 'none';
            }
            
            markers.forEach(marker => {
                if (marker.style.display == 'none') {
                    marker.style.display = 'block';
                } else {
                    marker.style.display = 'none';
                }
            });
        }},
        { keys: [KEY.Lt], mode: 'down', action: function () {
            if (!g.press && stage != 0) {
                stage--;
                initGame();
            }
        }},
        { keys: [KEY.Gt], mode: 'down', action: function () {
            if (!g.press && stage != stageNum - 1) {
                stage++;
                initGame();
            }
        }},
    ],

    ready: function (images) {
        background = images[0];
        sprites = images[1];
        countdownAudio = new Audio('audio/countdown.mp3');

        // player0が右, player1が左
        crashAudio[0] = new Audio('audio/crash_right.mp3');
        crashAudio[1] = new Audio('audio/crash_left.mp3');

        offroadAudio[0] = new Audio('audio/offroad_right.mp3');
        offroadAudio[1] = new Audio('audio/offroad_left.mp3');

        for(let i = 0; i <= 1; i++) {
            offroadAudio[i].addEventListener('ended', function() {
                this.currentTime = 0;
                this.play();
            }, false);
        }

        initGame();
    }
});