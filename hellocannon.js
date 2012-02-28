//
// Hello Cannon
// by Jeff Hollocher
//

// Debugging.
const alwaysHaveTrajectory = false;
const alwaysHaveSink = false;
const alwaysHaveBonus = false;

// UI.
var canvas;
var g;
var stepLastTime;
var layers;
var fps;
var frameCount;
var timeElapsed;
var _dms;
const targetMspf = 25;
const canvasW = 420;
const canvasH = 420;
const fontFace = '"Trebuchet MS", Helvetica, sans-serif';

// Mechanics.
const gravity = 0.000336;
const fuelPower = 0.0064;
const goldFactor = 0.87;
const angleSteps = 85;
const fuelSteps = 20;
const noise = 0;
const shotCost = 50;
const slowFactor = 0.25;
const rescoreTime = 500;
const targetBonus = 100;
const levelsPerBonus = 20;
const levelBonus = 400;
const timeToShoot = 10000;

// Bounds.
const shotRadius = 5;
const ringWidthAvg = 5.2;
const barHeight = 40;
const cannonMinY = 25 + barHeight;
const cannonMaxY = canvasH - 36;
const targetMinX = 130;
const targetMaxX = canvasW - 10;
const targetMinY = 10 + barHeight;
const targetMaxY = canvasH - 10;

// State.
var tms; // total ms time
var dms; // change ms time for current tick
var level;
var gold;
var goldThisTurn;
var totalShotFired;
var totalFuelUsed;
var totalTargetHit;
var totalGoldWon;
var cannon;
var trajectory;
var gobs;
var isCannonFired;
var timeOfAnyHit;
var timeLevelBonusGiven;
var timeGameStart;
var timeTurnStart;
var showTrajectory;
var hitRun;
var eyeRun;
var hitsMade;
var eyesMade;
var numTargets;
var numSinks;
var timePlayAdjustSound;

// Achievements.   // My personal records.
var highestLevel;  // 156
var longestHitRun; // 22
var longestEyeRun; // 7
var mostGoldEver;  // 6810
var level10Gold;   // 2475
var level10Time;   // 32005
var level100Gold;  // 5515
var level100Time;  // 970250
var mostHitsOf3;   // 3
var mostEyesOf3;   // 2
var mostHitsOf10;  // 5
var mostEyesOf10;  // 3

function main() {
    canvas = document.getElementById('hellocannon');
    g = canvas.getContext('2d');
    fitToScreen();
    stepLastTime = undefined;
    tms = 0;
    dms = 0;
    _dms = 0;
    fps = 0;
    frameCount = 0;
    timeElapsed = 0;
    layers = [];
    layers.push(new LayerGame());
    newGame();
    animate(nextFrame, targetMspf);
    document.onkeydown = onKeyDown;
}

function fitToScreen() {
    g.fillStyle = '#000';
    g.fillRect(0, 0, canvas.width, canvas.height);
    var s, tx, ty;
    if (canvas.width < canvas.height) {
        // Tall and skinny.
        s = canvas.width / canvasW;
        tx = 0;
        ty = (canvas.height - s * canvasH) * 0.5;
    }
    else {
        // Short and fat.
        s = canvas.height / canvasH;
        tx = (canvas.width - s * canvasW) * 0.5;
        ty = 0;
    }
    g.translate(tx, ty);
    g.scale(s, s);
    
    // Clip.
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(canvasW, 0);
    g.lineTo(canvasW, canvasH);
    g.lineTo(0, canvasH);
    g.clip();
}

function changeGold(g) {
    gold += g;
    if (mostGoldEver < gold)
        mostGoldEver = gold;
}

function setFont(size) {
    g.font = 'bold '+size+'pt'+fontFace;
}

function onKeyDown(e) {
    var k = e.keyCode;
    for (var i = 0; i < layers.length; i++) {
        if (layers[i].onKeyDown(k))
            break;
    }
}

function animate(stepRoutine, targetMspf) {
    var t = time();
    stepRoutine();
    t = targetMspf - (time() - t);
    t = Math.max(0, t);
    setTimeout(function() { animate(stepRoutine, targetMspf) }, t);
}

function nextFrame() {
    if (stepLastTime == undefined) {
        stepLastTime = time();
        _dms = 0
    }
    else {
        var currTime = time();
        _dms = currTime - stepLastTime;
        stepLastTime = currTime;
        frameCount++;
        timeElapsed += _dms;
        if (timeElapsed > 1000) {
            fps = frameCount;
            frameCount = 0;
            timeElapsed = timeElapsed % 1000;
        }
        _dms = Math.min(_dms, 25);
    }
    step(_dms);
}

function step(ms) {
    dms = ms;
    if (tms - timeOfAnyHit < 50)
        dms *= slowFactor;
    tms += dms;
    for (var i = 0; i < layers.length; i++)
        layers[i].step();
    play_all_multi_sound();
}

function newGame() {
    timeLevelBonusGiven = -60000;
    level = 0;
    gold = 250;
    showTrajectory = 0;
    totalShotFired = 0;
    totalFuelUsed = 0;
    totalTargetHit = 0;
    totalGoldWon = 0;
    cannon = new Cannon();
    trajectory = new Trajectory();
    cannon.fuel = 50;
    cannon.fuelStep = Math.floor(cannon.fuel * 0.01 * fuelSteps) - 1;
    cannon.angle = 0;
    cannon.angleStep = Math.floor(angleSteps / 2);
    timeGameStart = time();
    hitRun = 0;
    eyeRun = 0;
    highestLevel = 0;
    longestHitRun = 0;
    longestEyeRun = 0;
    mostGoldEver = 0;
    level10Gold = 0;
    level10Time = 0;
    level100Gold = 0;
    level100Time = 0;
    mostHitsOf3 = 0;
    mostEyesOf3 = 0;
    mostHitsOf10 = 0;
    mostEyesOf10 = 0;
    nextLevel();
}

function nextLevel() {
    level++;
    if (level == 10) {
        level10Gold = gold;
        level10Time = time() - timeGameStart;
    }
    if (level == 100) {
        level100Gold = gold;
        level100Time = time() - timeGameStart;
    }
    if (level % levelsPerBonus == 0) {
        changeGold(levelBonus);
        timeLevelBonusGiven = tms;
        push_multi_sound('bonus');
    }
    newTurn();
}

function newTurn() {
    turnOver = false;
    isCannonFired = false;
    goldThisTurn = 0;
    gobs = [];
    cannon.dx = 0;
    cannon.dy = cannonMinY + randInt(cannonMaxY - cannonMinY);
    numTargets = 1;
    if (rand() < 0.142857)
        numTargets = (rand() < 0.142857) ? 10 : 3;
    for (var i = 0; i < numTargets; i++)
        gobs.push(newTarget());
    if (alwaysHaveTrajectory)
        showTrajectory = 1;
    if (showTrajectory) {
        showTrajectory--;
        gobs.push(trajectory);
    }
    numSinks = 0;
    if (alwaysHaveSink)
        numSinks = 1;
    if (rand() < 0.142857)
        numSinks = (rand() < 0.142857) ? 3 : 1;
    for (var i = 0; i < numSinks; i++)
        gobs.push(newSink());
    gobs.push(cannon);
    hitsMade = 0;
    eyesMade = 0;
    timeTurnStart = time();
    updateAchievements();
}

function retryLevel() {
    newTurn();
}

function newSink() {
    var x = targetMinX + randInt(targetMaxX - targetMinX);
    var y = targetMinY + randInt(targetMaxY - targetMinY);
    return new Sink(x, y);
}

function newTarget() {
    var x = targetMinX + randInt(targetMaxX - targetMinX);
    var y = targetMinY + randInt(targetMaxY - targetMinY);
    var nRings;
    var ringWidth = ringWidthAvg;
    var bonus = 0;
    if (rand() < 0.142857)
        bonus = (rand() < 0.142857) ? 2 : 1;
    if (alwaysHaveBonus)
        bonus = 1;
    if (level < 5) {        nRings = 4; ringWidth *= 4.2; }
    else if (level < 10) {  nRings = 4; ringWidth *= 3.1; }
    else if (level < 20) {  nRings = 4; ringWidth *= 2.5; }
    else if (level < 30) {  nRings = 3; ringWidth *= 2.5; }
    else if (level < 40) {  nRings = 3; ringWidth *= 2.0; }
    else if (level < 50) {  nRings = 3; ringWidth *= 1.8; }
    else if (level < 60) {  nRings = 3; ringWidth *= 1.6; }
    else if (level < 70) {  nRings = 2 + randInt(2); ringWidth *= 1.5; }
    else if (level < 80) {  nRings = 2; ringWidth *= 1.3; }
    else if (level < 90) {  nRings = 2; ringWidth *= 1.15; }
    else if (level < 100) { nRings = 1 + randInt(2); ringWidth *= 1.0; }
    else {                  nRings = 1; ringWidth *= 0.9; }
    return new Target(x, y, nRings, ringWidth, bonus);
}

var LayerGame = (function() {

    function LayerGame() {
    }
    
    LayerGame.prototype.step = function() {
        // Fire automatically on time out.
        if (!isCannonFired && time() - timeTurnStart >= timeToShoot)
            fireCannon();
    
        // Step game objects.
        for (var i = 0; i < gobs.length; i++)
            gobs[i].step();
            
        // Draw background.
        g.fillStyle = '#91c2ff';
        g.fillRect(0, 0, canvasW, canvasH);
        
        // Draw game objects.
        var x, y;
        for (var i = 0; i < gobs.length; i++) {
            g.save();
            x = gobs[i].dx;
            y = gobs[i].dy;
            // XXX Occasionally x and y are undefined for some unknown reason.
            if (false && (x == undefined || y == undefined)) {
                console.log('Found undefined x/y pair: '+x+','+y);
                console.log('All gobs: ');
                console.log(gobs);
                console.log('numTargets='+numTargets);
                console.log('Looking at '+i+' of '+gobs.length+': ');
                console.log(gobs[i]);
            }
            g.translate(x, y);
            gobs[i].draw();
            g.restore();
        }
            
        // Draw overhead display.
        g.fillStyle = 'rgba(0, 0, 0, 0.2)';
        g.fillRect(0, 0, canvasW, 40);
        setFont(13);
        g.fillStyle = '#000';
        g.lineWidth = 1.0
        g.fillText('Level '+level, 170, 16);
        g.fillText(gold+' Gold', 170, 34);
        if (gold <= 0) {
            g.fillStyle = '#f00';
            g.fillText(gold, 170, 34);
        }
        g.fillStyle = '#000';
        g.font = '8pt'+fontFace;
        g.fillText(fps+' fps', 2, 10);
        
        // Draw Levels Bonus.
        var dt = tms - timeLevelBonusGiven;
        const totalTime = 6000.0;
        const fadeTime = 2000.0;
        const opaqueTime = totalTime - fadeTime;
        if (dt < totalTime) {
            setFont(24);
            var alpha;
            if (dt > opaqueTime)
                alpha = 1.0 - ((dt - opaqueTime) * 1.0 / fadeTime);
            else
                alpha = 1.0;
            g.textAlign = 'center';
            g.lineWidth = 6;
            g.lineJoin = 'round';
            g.strokeStyle = 'rgba(0, 0, 0, '+alpha+')';
            g.strokeText(levelsPerBonus+'-Levels!', canvasW / 2, 75);
            g.strokeText('+'+levelBonus, canvasW / 2, 110);
            g.fillStyle = 'rgba(255, 255, 255, '+alpha+')';
            g.fillText(levelsPerBonus+'-Levels!', canvasW / 2, 75);
            g.fillStyle = 'rgba(0, 255, 0, '+alpha+')';
            g.fillText('+'+levelBonus, canvasW / 2, 110);
            g.textAlign = 'left';
        }
    };

    LayerGame.prototype.onKeyDown = function(k) {
        if (time() - timeTurnStart < 200)
            return false;
        if (!isCannonFired) {
            switch(k) {
            case KeyEvent.DOM_VK_UP:    changeAngle(1); return true;
            case KeyEvent.DOM_VK_DOWN:  changeAngle(-1); return true;
            case KeyEvent.DOM_VK_LEFT:  changeFuel(-1); return true;
            case KeyEvent.DOM_VK_RIGHT: changeFuel(1); return true;
            case KeyEvent.DOM_VK_SPACE: fireCannon(); return true;
            }
        }
        return false;
    };

    return LayerGame;
})();

function changeAngle(n) {
    var prev = cannon.angleStep;
    var next = prev;
    next += n;
    next = Math.min(next, angleSteps - 1);
    next = Math.max(next, 0);
    if (prev != next) {
        cannon.angleStep = next;
        cannon.angle = Math.PI * (Math.floor(angleSteps / 2) - next) / angleSteps;
        if (timePlayAdjustSound == undefined || time() - timePlayAdjustSound > 100) {
            timePlayAdjustSound = time();
            push_multi_sound('adjustangle');
        }
    }
}

function changeFuel(n) {
    var prev = cannon.fuelStep;
    var next = prev;
    next += n;
    next = Math.min(next, fuelSteps - 1);
    next = Math.max(next, 0);
    if (prev != next) {
        cannon.fuelStep = next;
        cannon.fuel = (next + 1) * 100.0 / fuelSteps;
        push_multi_sound('adjustpower');
    }
}

function fireCannon() {
    if (!alwaysHaveTrajectory)
        gobs.remove(trajectory);
    isCannonFired = true;
    var dx = cannon.dx;
    var dy = cannon.dy;
    var fuelNoise = (100.0 / fuelSteps) * noise * (rand() - 0.5);
    var power = (cannon.fuel + fuelNoise) * fuelPower;
    var angleNoise = (Math.PI / angleSteps) * noise * (rand() - 0.5);
    var angle = (cannon.angle + angleNoise);
    var vx = power * Math.cos(angle);
    var vy = power * Math.sin(angle);
    // Put shot before cannon and after targets.
    gobs[gobs.length - 1] = new Shot(dx, dy, vx, vy);
    gobs.push(cannon);
    push_multi_sound('firecannon');
}

function addAchievementHtml(s, name, value) {
    return s+name+': '+value+'<br/>';
}

function updateAchievements() {
    var ach = '';
    ach = addAchievementHtml(ach, 'highestLevel', highestLevel);
    ach = addAchievementHtml(ach, 'longestHitRun', longestHitRun);
    ach = addAchievementHtml(ach, 'longestEyeRun', longestEyeRun);
    ach = addAchievementHtml(ach, 'mostGoldEver', mostGoldEver);
    ach = addAchievementHtml(ach, 'level10Gold', level10Gold);
    ach = addAchievementHtml(ach, 'level10Time', level10Time);
    ach = addAchievementHtml(ach, 'level100Gold', level100Gold);
    ach = addAchievementHtml(ach, 'level100Time', level100Time);
    ach = addAchievementHtml(ach, 'mostHitsOf3', mostHitsOf3);
    ach = addAchievementHtml(ach, 'mostEyesOf3', mostEyesOf3);
    ach = addAchievementHtml(ach, 'mostHitsOf10', mostHitsOf10);
    ach = addAchievementHtml(ach, 'mostEyesOf10', mostEyesOf10);
    ach = '<div style="margin: 10px; padding: 10px;"><b>Statistics</b><br/><br/>'+ach+'</div>';
    document.getElementById('debug').innerHTML = ach;
}

var Cannon = (function() {

    function Cannon(dxi, dyi) {
        this.dx = dxi;
        this.dy = dyi;
    }

    Cannon.prototype.step = function() {
    };

    Cannon.prototype.draw = function() {
        
        // Draw cannon.
        g.strokeStyle = '#333';
        g.lineWidth = 4;
        g.strokeCircle(0, 0, 9.5);
        g.save();
        g.rotate(this.angle);
        g.fillStyle = '#000';
        g.fillRect(-9.5, -4, 23.5, 8);
        g.fillRoundRect(12.5, -6.5, 9, 13, 3);
        g.restore();
        g.fillStyle = '#7a1e00';
        g.fillCircle(0, 0, 2.5);
        
        // Draw fuel.
        var bars = 2 + cannon.fuel / 3;
        g.lineWidth = 0.0;
        g.fillStyle = '#ea1e00';
        g.translate(2, 23);
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(bars, 0);
        g.lineTo(bars, -bars / 3);
        g.lineTo(0, 0);
        g.closePath();
        g.fill();
        g.fillStyle = '#000';
        setFont(10);
        g.fillText(cannon.fuel, 0, 12);
    };

    Cannon.prototype.collide = function(shot) {
    };

    return Cannon;
})();

var Shot = (function() {

    function Shot(dxi, dyi, vxi, vyi, color) {
        this.dxPrev = dxi;
        this.dyPrev = dyi;
        this.dx = dxi;
        this.dy = dyi;
        this.vx = vxi;
        this.vy = vyi;
        this.color = color;
        this.dxi = dxi;
        this.dyi = dyi;
        this.sunk = false;
        this.timeStuck = undefined;
        this.timeFallenFromVision = undefined;
        this.timeCreated = tms;
    }

    Shot.prototype.step = function() {
        with(this) {
            dxPrev = dx;
            dyPrev = dy;
            var vyPrev = vy;
            vy += gravity * dms;
            dx += vx * dms;
            dy += (vy + vyPrev) * 0.5 * dms;
            
            // Check for shot out of bounds.
            const edgeLimit = shotRadius + ringWidthAvg * 20;
            if (isFallenFromVision(this, edgeLimit)) {
                if (timeFallenFromVision == undefined)
                    timeFallenFromVision = tms;
            }
            else {
                timeFallenFromVision = undefined;
            }
            
            // Check all conditions for end of turn.
            var outOfBoundsTime = numSinks ? 2000 : 500;
            var turnOver = false;
            turnOver = turnOver || (timeStuck != undefined) && (tms - timeStuck > 2500);
            turnOver = turnOver || (timeFallenFromVision != undefined) && (tms - timeFallenFromVision > outOfBoundsTime);
            turnOver = turnOver || (tms - timeCreated > 60000);
            if (turnOver) {
                gobs.remove(this);
                layers.push(new LayerScore());
            }
                    
            // Collide with all game objects.
            for (var i = 0; i < gobs.length; i++) {
                gobs[i].collide(this);
            }
        }
    };

    Shot.prototype.draw = function() {
        with(this) {
            if (tms - timeStuck > 1500) {
                if (!sunk)
                    push_multi_sound('sink');
                sunk = true;
            }
            if (sunk)
                return;
            var color = '#000';
            var radius = shotRadius;
            if (timeStuck != undefined) {
                var delta = ((tms - timeStuck) / 1750);
                var cr = Math.floor(255 * Math.sqrt(delta));
                var cg = Math.floor(delta);
                var cb = Math.floor(delta);
                color = 'rgba('+cr+', '+cg+', '+cb+', 1.0)';
                radius = shotRadius * (1 - delta * 0.2) + (shotRadius * 0.2 * (rand() - 0.5));
            }
            g.fillStyle = color;
            g.fillCircle(0, 0, radius);
            g.fillStyle = '#fff';
            g.fillCircle(-radius * 0.4, -radius * 0.4, radius * 0.2);
        }
    };

    Shot.prototype.collide = function(shot) {
    };

    return Shot;
})();

var Target = (function() {

    function Target(dxi, dyi, nRings, ringWidth, bonus) {
        this.dx = dxi;
        this.dy = dyi;
        this.dSqrd = Number.MAX_VALUE;
        this.nRings = nRings;
        this.ringWidth = ringWidth;
        this.radius = ringWidth * (nRings - 0.75);
        this.bonus = bonus;
        this.hit = false;
        var rings = [];
        for (var i = 0; i < nRings; i++)
            rings.push(new Ring());
        this.rings = rings;
        this.explosion = null;
        this.extra = bonus==2 ? new Star(this.radius) : null;
    }

    Target.prototype.step = function() {
        if (this.explosion != null) {
            this.explosion.step();
        }
        if (this.extra) {
            this.extra.step();
        }
    };

    Target.prototype.draw = function() {
        with(this) {
            var bonusColor = '#000';
            bonusColor = (bonus == 1) ? '#0f4' : '#fc0';
            
            // Draw rings.
            for (var i = 0; i < nRings; i++) {
                rings[i].draw(i, ringWidth);
            }
            
            // Draw crosshairs.
            if (nRings == 1) {
                if (explosion == null) {
                    const w = ringWidth;
                    g.strokeStyle = bonusColor;
                    g.lineWidth = w * 0.5;
                    g.strokeLine(-w, 0, 2.5 * -w, 0);
                    g.strokeLine(w, 0, 2.5 * w, 0);
                    g.strokeLine(0, -w, 0, 2.5 * -w);
                    g.strokeLine(0, w, 0, 2.5 * w);
                }
            }
            
            // Draw star or whatever extra treat.
            if (extra) {
                extra.draw();
            }
            
            // Draw bonus.
            if (bonus) {
                g.drawGlassBall(0, 0, radius, '#000', 0.2);
            }
            
            // Draw explosion.
            if (explosion != null) {
                explosion.draw();
            }
        }
    };

    Target.prototype.collide = function(shot) {
        if (!(shot instanceof Shot))
            return;
    
        var x0 = shot.dxPrev;
        var y0 = shot.dyPrev;
        var x1 = shot.dx;
        var y1 = shot.dy;
        var dx = this.dx;
        var dy = this.dy;
        var dSqrd = sqrSegPoint(x0, y0, x1, y1, dx, dy);
        if (dSqrd < this.dSqrd)
            this.dSqrd = dSqrd;
        var maxRadius = shotRadius + this.radius;
        if (dSqrd <= maxRadius*maxRadius) {
            // Slow the game for drama.
            if (!this.hit) {
                this.hit = true;
                hitsMade++;
                if (this.bonus) {
                    changeGold(targetBonus);
                    if (this.bonus == 2)
                        showTrajectory = 3;
                    this.bonus = 0;
                    push_multi_sound('bonus');
                    gobs.push(new Bonus(dx, dy));
                    this.extra = null;
                }
            }
            var d = Math.sqrt(dSqrd);
            for (var i = 0; i < this.nRings; i++) {
                if (this.rings[i].collide(i, this.ringWidth, d)) {
                    if (i == 0) {
                        eyesMade++;
                        push_multi_sound('bullseye');
                        this.explosion = new Explosion();
                    }
                }
            }
        }
    };

    return Target;
})();

var Star = (function() {

    function Star(radius) {
        this.radius = radius;
        this.ad = 0;
        this.av = 0.0005;
    }
    
    Star.prototype.step = function() {
        this.ad += this.av * dms;
    };
    
    Star.prototype.draw = function() {
        g.fillStyle = '#fc0';
        g.fillStar(0, 0, this.radius, this.ad);
    };

    return Star;
})();

var Ring = (function() {

    function Ring() {
        this.timeHit = undefined;
    }
    
    Ring.prototype.draw = function(number, ringWidth) {
        const FADE_TIME = 900;
        if (this.timeHit == undefined) {
            g.strokeStyle = '#000';
        }
        else if (tms - this.timeHit < FADE_TIME) {
            var alpha = 1.0 - ((tms - this.timeHit) / FADE_TIME);
            g.strokeStyle = 'rgba(255, 255, 255, '+alpha+')';
        }
        else {
            return; // Ring is destroyed and finished animating.
        }
        const w = ringWidth;
        g.lineWidth = w * 0.5;
        g.strokeCircle(0, 0, w * number);
    }
    
    Ring.prototype.collide = function(number, ringWidth, d) {
        if (this.timeHit == undefined) {
            if (d - shotRadius <= (number + 0.25) * ringWidth) {
                this.timeHit = tms;
                timeOfAnyHit = tms;
                goldThisTurn += computeRingGold(number, undefined);
                return true;
            }
        }
        return false;
    }

    function computeRingGold(i, nRings) {
        
        switch (i) {
            case 0: return 90;
            case 1: return 55;
            default: return 35;
        }
        
        // :)
        return i?!~-i?65:40:90;
    }

    return Ring;
})();

function isFallenFromVision(gob, safetyMargin) {
    var x = gob.dx;
    var y = gob.dy;
    if (x < -safetyMargin)
        return true;
    if (canvasW + safetyMargin < x)
        return true;
    if (canvasH + safetyMargin < y)
        return true;
    return false;
}

var Explosion = (function() {

    const lifetime = 2500;

    function Explosion() {
        this.timeStart = tms;
        this.worms = new Array();
        var angle = rand() * Math.PI * 2;
        var nWorms = 5;
        for (var i = nWorms; i-- > 0; ) {
            this.worms.push(new Worm(angle));
            angle += Math.PI * 2 / nWorms;
        }
    }
    
    Explosion.prototype.draw = function() {
        if (tms - this.timeStart > lifetime)
            return;
        for (var i = this.worms.length; i-- > 0; )
            this.worms[i].draw();
    }
    
    Explosion.prototype.step = function() {
        if (tms - this.timeStart > lifetime)
            return;
        for (var i = this.worms.length; i-- > 0; )
            this.worms[i].step();
    }

    return Explosion;
})();

var Worm = (function() {
    
    const wormLength = 10;
    
    function Worm(angle) {
        this.dx = 0;
        this.dy = 0;
        var mag = (1 + rand()) * 0.12;
        var ang = angle;
        this.vx = mag * Math.cos(ang);
        this.vy = mag * Math.sin(ang);
        this.ang1da = rand() * Math.PI * 2;
        this.ang1va = rand() * Math.PI * 0.017;
        this.ang1r = rand() * 0.4;
        var cr = randInt(256);
        var cg = randInt(256);
        var cb = randInt(256);
        this.color = 'rgb('+cr+', '+cg+', '+cb+')';
        this.points = new Array();
        this.points.push(new Point(this.dx, this.dy));
        this.sparks = new Array();
    }
    
    Worm.prototype.step = function() {
        var vyPrev = this.vy;
        this.vy += gravity * dms;
        this.dx += this.vx * dms;
        this.dy += (this.vy + vyPrev) * 0.5 * dms;
        this.ang1da += this.ang1va * dms;
        this.dx += this.ang1r * Math.cos(this.ang1da) * dms;
        this.dy += this.ang1r * Math.sin(this.ang1da) * dms;
        if (this.points.length >= wormLength)
            this.points.shift();
        this.points.push(new Point(this.dx, this.dy));
        
        // Step sparks.
        if (rand() < 0.7)
            this.sparks.push(new Spark(this.dx, this.dy, this.color));
        for (var i = this.sparks.length; i-- > 0; ) {
            this.sparks[i].step();
        }
    }
    
    Worm.prototype.draw = function() {
        var prev = this.points[0];
        var next;
        var len = this.points.length;
        const w = 4.2;
        if (len > 1) {
            g.lineWidth = w;
            var rgbHead = new RGBColor(this.color);
            var rgbTail = new RGBColor('#fff');
            var rgbNext;
            var alpha;
            for (var i = 1; i < len; i++) {
                next = this.points[i];
                alpha = 1 - ((len - i) / wormLength);
                rgbNext = rgbHead.linear(rgbTail, 1 - alpha);
                g.strokeStyle = 'rgba('+rgbNext.r+', '+rgbNext.g+', '+rgbNext.b+', '+alpha+')';
                g.strokeLine(prev.x, prev.y, next.x, next.y);
                prev = next;
            }
        }
        
        // Draw sparks.
        for (var i = this.sparks.length; i-- > 0; ) {
            this.sparks[i].draw();
        }
    }
    
    return Worm;
})();

var Spark = (function() {
    
    function Spark(x, y, color) {
        this.dx = x;
        this.dy = y;
        var mag = (1 + rand()) * 0.045;
        var ang = rand() * Math.PI * 2;
        this.vx = mag * Math.cos(ang);
        this.vy = mag * Math.sin(ang);
        this.timeCreated = tms;
        this.rgb = new RGBColor(color);
        this.alive = true;
    }
    
    Spark.prototype.step = function() {
        var vyPrev = this.vy;
        this.vy += gravity * dms;
        this.dx += this.vx * dms;
        this.dy += (this.vy + vyPrev) * 0.5 * dms;
    }
    
    Spark.prototype.draw = function() {
        var rgb = this.rgb;
        var alpha = 1 - ((tms - this.timeCreated) / 1500);
        if (alpha > 0.1) {
            g.fillStyle = 'rgba('+rgb.r+', '+rgb.g+', '+rgb.b+', '+alpha+')';
            g.fillCircle(this.dx, this.dy, 1.2);
        }
        if (alpha < 0) {
            this.alive = false;
        }
    }
    
    return Spark;
})();

var Bonus = (function() {

    function Bonus(dxi, dyi) {
        this.dx = dxi;
        this.dy = dyi;
        this.timeBonusGiven = tms;
    }

    Bonus.prototype.step = function() {
    };

    Bonus.prototype.draw = function() {
        with(this) {
            var dt = tms - timeBonusGiven
            const totalTime = 5000.0;
            const fadeTime = 2000.0;
            const opaqueTime = totalTime - fadeTime;
            if (dt < totalTime) {
                setFont(18);
                var alpha;
                if (dt > opaqueTime)
                    alpha = 1.0 - ((dt-opaqueTime) / fadeTime);
                else
                    alpha = 1.0;
                var oy;
                if (dt < 500)
                    oy = (dt / 500.0);
                else
                    oy = 1.0;
                g.textAlign = 'center';
                g.lineWidth = 6;
                g.lineJoin = 'round';
                g.fillStyle = 'rgba(0, 255, 0, '+alpha+')';
                g.strokeStyle = 'rgba(0, 0, 0, '+alpha+')';
                g.strokeText('+'+targetBonus, 0, -12 - oy * 22);
                g.fillText('+'+targetBonus, 0, -12 - oy * 22);
                g.textAlign = 'left';
            }
        }
    };

    Bonus.prototype.collide = function(shot) {
    };

    return Bonus;
})();

function trimSparks(sparks) {
    var newA = new Array();
    for (var i in sparks) {
        if (sparks[i].alive)
            newA.push(sparks[i]);
    }
    return newA;
}

var Sink = (function() {

    function Sink(dxi, dyi) {
        this.dx = dxi;
        this.dy = dyi;
        this.sparks = new Array();
        this.color = '#000';
        
        // Get the sparks flying so that it shows up right away.
        var backupDms = dms;
        dms = 35;
        var steps = 1000 / dms;
        tms -= dms * steps;
        for (var i = 0; i < steps; i++) {
            tms += dms;
            this.step();
        }
        dms = backupDms;
    }

    Sink.prototype.step = function() {
        // Step sparks.
        if (rand() < 0.7)
            this.sparks.push(new SinkSpark(0, 0, this.color));
        if (this.sparks.length > 50)
            this.sparks = trimSparks(this.sparks);
        for (var i = this.sparks.length; i-- > 0; ) {
            this.sparks[i].step();
        }
    };

    Sink.prototype.draw = function() {
        // Draw sparks.
        for (var i = this.sparks.length; i-- > 0; ) {
            this.sparks[i].draw();
        }
        
        // Draw Shadow.
        grad = g.createRadialGradient(0, 0, 0, 0, 0, 160);
        grad.addColorStop(0.0, 'rgba(0, 0, 0, 0.4)');
        grad.addColorStop(0.05, 'rgba(0, 0, 0, 0.3)');
        grad.addColorStop(0.12, 'rgba(0, 0, 0, 0.2)');
        grad.addColorStop(0.25, 'rgba(0, 0, 0, 0.1)');
        grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.05)');
        grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
        g.fillStyle = grad;
        g.fillCircle(0, 0, 160);
        g.fillStyle = 'rgba(0, 0, 0, 0.5)';
        g.fillCircle(0, 0, 1);
    };

    Sink.prototype.collide = function(shot) {
        // Check for outright collision.
        var x0 = shot.dxPrev;
        var y0 = shot.dyPrev;
        var x1 = shot.dx;
        var y1 = shot.dy;
        var dx = this.dx;
        var dy = this.dy;
        var dSqrd = sqrSegPoint(x0, y0, x1, y1, dx, dy);
        var maxRadius = shotRadius * 0.75;
        var stuck = (dSqrd <= maxRadius * maxRadius);
        if (stuck) {
            shot.dx = this.dx;
            shot.dy = this.dy;
            shot.vx = 0;
            shot.vy = 0;
            if (shot.timeStuck == undefined)
                shot.timeStuck = tms;
            return;
        }
        
        // Affect shot.
        var ox = this.dx - shot.dx;
        var oy = this.dy - shot.dy;
        var d = mag(ox, oy);
        var f = d * Math.sqrt(d);
        if (f != 0) {
            f = 2 * dms / f;
            var fx = f * ox / d;
            var fy = f * oy / d;
            shot.vx += fx;
            shot.vy += fy;
        }
    };

    return Sink;
})();

var SinkSpark = (function() {
    
    function SinkSpark(x, y, color) {
        this.isRing = rand() < 0.02;
        this.ox = x;
        this.oy = y;
        var mag = (1.0 + rand()) * 85;
        var ang = rand() * Math.PI * 2;
        this.dx = mag * Math.cos(ang);
        this.dy = mag * Math.sin(ang);
        this.timeCreated = tms;
        this.rgb = new RGBColor(color);
        this.alive = true;
        this.dxPrev = this.dx;
        this.dyPrev = this.dy;
    }
    
    SinkSpark.prototype.step = function() {
        if (!this.alive)
            return;
        var d = mag(this.dx, this.dy);
        var f = d * d;
        if (f == 0) {
            this.alive = false;
            return;
        }
        f = 5.5 * dms / f;
        this.dxPrev = this.dx;
        this.dyPrev = this.dy;
        this.dx += -this.dx * f;
        this.dy += -this.dy * f;
        if (Math.sign(this.dxPrev) != Math.sign(this.dx))
            this.dx = 0;
        if (Math.sign(this.dyPrev) != Math.sign(this.dy))
            this.dy = 0;
    }
    
    SinkSpark.prototype.draw = function() {
        if (!this.alive)
            return;
        with (this) {
            var rgb = this.rgb;
            var alpha = ((tms - this.timeCreated) / 2000);
            var x = this.dx + this.ox;
            var y = this.dy + this.oy;
            if (alpha > 0.1) {
                if (isRing) {
                    var d = mag(dx, dy);
                    alpha = ((tms - this.timeCreated) / 8000) * Math.min(1.0, d / 100);
                    g.strokeStyle = 'rgba('+rgb.r+', '+rgb.g+', '+rgb.b+', '+alpha+')';
                    g.lineWidth = mag(dxPrev - dx, dyPrev - dy);
                    g.strokeCircle(ox, oy, mag(dx, dy));
                }
                else {
                    g.lineWidth = 1.7;
                    g.strokeStyle = 'rgba('+rgb.r+', '+rgb.g+', '+rgb.b+', '+alpha+')';
                    g.strokeLine(ox + dxPrev, oy + dyPrev, ox + dx, oy + dy);
                }
            }
        }
    }
    
    return SinkSpark;
})();

var Trajectory = (function() {

    function Trajectory() {
    }

    Trajectory.prototype.step = function() {
    };

    Trajectory.prototype.draw = function() {
        this.dx = cannon.dx;
        this.dy = cannon.dy;
        var fuelNoise = (100.0 / fuelSteps) * noise * (rand() - 0.5);
        var power = (cannon.fuel + fuelNoise) * fuelPower;
        var angleNoise = (Math.PI / angleSteps) * noise * (rand() - 0.5);
        var angle = (cannon.angle + angleNoise);
        this.vx = power * Math.cos(angle);
        this.vy = power * Math.sin(angle);
        this.vyPrev = 0;
        this.timeStuck = undefined;
        with (this) {
            g.beginPath();
            g.moveTo(dx, dy);
            g.strokeStyle = '#7a1e00';
            g.lineWidth = 1;
            var backupDms = dms;
            dms = 20;
            var drawDash = true;
            var iters = 0;
            while (true) {
                vyPrev = vy;
                vy += gravity * dms;
                dx += vx * dms;
                dy += (vy + vyPrev) * 0.5 * dms;
                if (drawDash)
                    g.lineTo(dx, dy);
                else
                    g.moveTo(dx, dy);
                drawDash = !drawDash;
                
                // Check bounds - end of shot conditions.
                const edgeLimit = 20;
                if (dx < -shotRadius - edgeLimit)
                    break;
                else if (canvasW + shotRadius + edgeLimit < dx)
                    break;
                else if (canvasH + shotRadius + edgeLimit < dy)
                    break;
                        
                // Collide with all game objects.
                for (var i = 0; i < gobs.length; i++) {
                    gobs[i].collide(this);
                }
                iters ++;
            }
            g.stroke();
            dms = backupDms;
        }
        
        // To get it translated correctly as all gobs are before draw() is called:
        this.dx = 0;
        this.dy = 0;
    };

    Trajectory.prototype.collide = function(shot) {
    };

    return Trajectory;
})();

var LayerScore = (function() {

    function LayerScore() {
        this.shot = -shotCost;
        this.fuel = -cannon.fuel;
        this.gold = goldThisTurn;
        this.net  = this.shot + this.fuel + this.gold;
        this.timeCreated = time();
    }

    function showSign(n) {
        if (n < 0)
            return '-' + (-n);
        else
            return '+' + n;
    }

    LayerScore.prototype.step = function() {
        var w = 200;
        var h = 250;
        var x = (canvasW - w) / 2;
        var y = (canvasH - h) / 2;
        
        // Background.
        g.fillStyle = 'rgba(255, 255, 255, 0.7)';
        g.strokeStyle = '#fc0';
        g.lineWidth = 12;
        g.fillRect(x, y, w, h, 15);
        g.strokeRoundRect(x, y, w, h, 15);
        for (var i = 0; i < 4; i++) {
            var alpha = i * 0.1
            g.strokeStyle = 'rgba(255, 255, 255, '+alpha+')';
            g.lineWidth = 9 - i * 2.25;
            g.strokeRoundRect(x - 2, y - 2, w, h, 15);
        }
        
        // Stats.
        g.fillStyle = '#000';
        setFont(22);
        const lh = 34;
        var ox, oy;
        ox = x + 35; oy = y + 45;
        g.fillText('shot', ox, oy); oy += lh;
        g.fillText('fuel', ox, oy); oy += lh;
        if (this.gold != 0)
        g.fillText('gold', ox, oy); oy += lh;
        ox += w / 2 - 25; oy -= 3 * lh;
        g.fillText(showSign(this.shot), ox, oy); oy += lh;
        g.fillText(showSign(this.fuel), ox, oy); oy += lh;
        if (this.gold != 0)
        g.fillText(showSign(this.gold), ox, oy); oy += lh;
        
        // Bar.
        g.strokeStyle = '#000';
        g.lineWidth = 4.0;
        g.lineJoin = 'round';
        oy -= 18;
        g.strokeLine(x + 35, oy, x + w - 35, oy);
        
        // Net number.
        setFont(38);
        g.textAlign = 'center'
        ox = x + w / 2; oy = y + 208;
        g.strokeStyle = '#000';
        g.lineWidth = 12;
        g.lineJoin = 'round';
        var color = (this.net > 0) ? '#0f0' : '#f00';
        var gray = '#999';
        var colored = Math.min(Math.abs(this.net) * 0.02, 1.0);
        color = linearColor(gray, color, colored);
        g.fillStyle = color;
        g.strokeText(showSign(this.net),  ox, oy);
        g.fillText(showSign(this.net),  ox, oy - 1);
        g.textAlign = 'left';
    };

    LayerScore.prototype.onKeyDown = function(k) {
        if (time() - this.timeCreated < 200)
            return false;
        switch(k) {
        case KeyEvent.DOM_VK_SPACE: finishScore(this); return true;
        }
        return false;
    };

    return LayerScore;
})();

function finishScore(layer) {
    layers.remove(layer);
    
    changeGold(layer.net);
    
    totalShotFired++;
    totalFuelUsed += cannon.fuel;
    totalGoldWon += layer.gold;
    totalTargetHit += hitsMade;
    
    if (hitsMade)
        hitRun++;
    else
        hitRun = 0;
    if (hitRun > longestHitRun)
        longestHitRun = hitRun;
    
    if (eyesMade)
        eyeRun++;
    else
        eyeRun = 0;
    if (eyeRun > longestEyeRun)
        longestEyeRun = eyeRun;
    
    if (numTargets == 3) {
        if (hitsMade > mostHitsOf3)
            mostHitsOf3 = hitsMade;
        if (eyesMade > mostEyesOf3)
            mostEyesOf3 = eyesMade;
    }
    
    if (numTargets == 10) {
        if (hitsMade > mostHitsOf10)
            mostHitsOf10 = hitsMade;
        if (eyesMade > mostEyesOf10)
            mostEyesOf10 = eyesMade;
    }
    
    if (gold > 0) {
        if (layer.gold == 0)
            retryLevel();
        else
            nextLevel();
    }
    else {
        gameOver();
    }
}

function gameOver() {
    layers.push(new LayerGameOver());
}

var LayerGameOver = (function() {

    function LayerGameOver() {
        this.gameTime = msToString(time() - timeGameStart);
        this.timeCreated = time();
        highestLevel = level;
    }

    LayerGameOver.prototype.step = function() {
        var w = 200;
        var h = 250;
        var x = (canvasW - w) / 2;
        var y = (canvasH - h) / 2;
        
        // Background.
        g.fillStyle = 'rgba(255, 255, 255, 0.7)';
        g.strokeStyle = '#625';
        g.lineWidth = 12;
        g.fillRect(x, y, w, h, 15);
        g.strokeRoundRect(x, y, w, h, 15);
        for (var i = 0; i < 4; i++) {
            var alpha = i * 0.1
            g.strokeStyle = 'rgba(255, 255, 255, '+alpha+')';
            g.lineWidth = 9 - i * 2.25;
            g.strokeRoundRect(x - 2, y - 2, w, h, 15);
        }
        
        g.textAlign = 'center';
        
        // Stats.
        g.fillStyle = '#000';
        setFont(22);
        g.fillText('Game Over', x + w / 2, y + 37);
        setFont(12);
        g.fillText('Time Played: '+this.gameTime, x + w / 2, y + 60);
        
        // Level.
        setFont(28);
        ox = x + w / 2; oy = y + h / 2 + 5;
        g.strokeStyle = '#000';
        g.lineWidth = 5;
        g.lineJoin = 'round';
        g.fillStyle = '#07f';
        var exMarks = fill('!', level / 45);
        g.strokeText('Achieved', ox, oy);
        g.strokeText('Level '+level+exMarks, ox, oy + 50);
        g.fillText('Achieved', ox, oy);
        g.fillText('Level '+level+exMarks, ox, oy + 50);
        
        g.textAlign = 'left';
    };

    LayerGameOver.prototype.onKeyDown = function(k) {
        if (time() - this.timeCreated < 200)
            return false;
        switch(k) {
        case KeyEvent.DOM_VK_SPACE: finishGameOver(this); return true;
        }
        return false;
    };

    return LayerGameOver;
})();

function finishGameOver(layer) {
    layers.remove(layer);
    newGame();
}

