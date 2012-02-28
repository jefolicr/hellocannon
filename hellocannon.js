//
// Hello Cannon
// by Jeff Hollocher
//

// Debugging.
const showFps = false;
const showAchievements = false;
const alwaysHaveTrajectory = false;
const alwaysHaveSink = false;
const alwaysHaveBonus = false;
const useNewEyeScoring = false;
const qaLevels = true;

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
const floatingMspf = false;
const canvasW = 420;
const canvasH = 420;
const fontFace = '"Trebuchet MS", Helvetica, sans-serif';

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

// Mechanics.
const physics = 0.8;
const gravity = 0.000336 * physics * physics;
const angleSteps = 127;
const fuelSteps = 20;
const shotCost = 50;
const slowFactor = 0.2;
const starPowerTurns = 3;
const eyePowerAmount = 4;

// State.
var tms; // total ms time
var dms; // change ms time for current tick
var shots;
var gold;
var goldThisTurn;
var totalFuelUsed;
var totalTargetHit;
var totalGoldWon;
var cannon;
var trajectory;
var theShot;
var fuelCost;
var gobs;
var perms;
var isCannonFocused;
var isCannonFired;
var timeOfAnyHit;
var timeGameStart;
var timeTurnStart;
var starPower;
var hitRun;
var eyeRun;
var hitsMade;
var eyesMade;
var eyesTotal;
var numTargets;
var numSinks;
var timePlayAdjustSound;
var progress;

// Achievements.
var mostShots;
var longestHitRun;
var longestEyeRun;
var mostGoldEver;
var shot10Gold;
var shot10Time;
var shot100Gold;
var shot100Time;
var mostHitsOf3;
var mostEyesOf3;
var mostHitsOf10;
var mostEyesOf10;

function initHellocannon() {
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
    document.onkeydown = onKeyPress;
    document.onkeyup = onKeyRelease;
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

function onKeyPress(e) {
    var k = e.keyCode;
    for (var i = layers.length; --i >= 0; ) {
        if (layers[i].onKeyPress(k)) {
            e.stopPropagation();
            e.preventDefault();
            break;
        }
    }
}

function onKeyRelease(e) {
    var k = e.keyCode;
    for (var i = 0; i < layers.length; i++) {
        if (layers[i].onKeyRelease(k)) {
            e.stopPropagation();
            e.preventDefault();
            break;
        }
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
        _dms = 0;
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
        _dms = Math.min(_dms, targetMspf);
    }
    step(floatingMspf ? _dms : targetMspf);
}

function step(ms) {
    // Timing / slowing.
    dms = ms;
    if (tms - timeOfAnyHit < 50)
        dms *= slowFactor;
    tms += dms;
    
    // Step layers.
    for (var i = 0; i < layers.length; i++)
        layers[i].step();
    
    // Audio.
    play_all_multi_sound();
}

function newGame() {
    perms = [];
    shots = 0;
    gold = 250;
    isCannonFocused = false;
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
    progress = (timeGameStart & 0xffffffff);
    starPower = 0;
    hitRun = 0;
    eyeRun = 0;
    eyesTotal = 0;
    mostShots = 0;
    longestHitRun = 0;
    longestEyeRun = 0;
    mostGoldEver = 0;
    shot10Gold = 0;
    shot10Time = 0;
    shot100Gold = 0;
    shot100Time = 0;
    mostHitsOf3 = 0;
    mostEyesOf3 = 0;
    mostHitsOf10 = 0;
    mostEyesOf10 = 0;
    nextShot();
}

function nextShot() {
    turnOver = false;
    isCannonFocused = true;
    isCannonFired = false;
    goldThisTurn = 0;
    gobs = [];
    cannon.dx = 0;
    cannon.dy = cannonMinY + randInt(cannonMaxY - cannonMinY);
    numSinks = alwaysHaveSink ? 1 : 0;
    numTargets = 1;
    numTargetBonuses = alwaysHaveBonus ? 1 : 0;
    if (shots >= 10 && rand() < 0.166667)
        numSinks = (shots >= 30 && rand() < 0.166667) ? 2 : 1;
    if (shots >= 5 && rand() < 0.166667)
        numTargets = (shots >= 20 && rand() < 0.166667) ? 10 : 3;
    if (shots >= 10 && rand() < 0.055556)
        numTargetBonuses = 1;
    if (alwaysHaveTrajectory)
        starPower = 1;
    for (var i = 0; i < numSinks; i++) {
        numTargets++;
        if (rand() < 0.166667)
            numTargetBonuses++;
    }
    for (var i = 0; i < numTargets; i++)
        gobs.push(newTarget());
    for (var i = 0; i < numTargetBonuses; i++)
        gobs.push(newTargetBonus());
    for (var i = 0; i < numSinks; i++)
        gobs.push(newSink());
    gobs.push(trajectory);
    gobs.push(cannon);
    hitsMade = 0;
    eyesMade = 0;
    timeTurnStart = tms;
    updateAchievements();
    var livePerms = [];
    for (var i = 0; i < perms.length; i++) {
        if (!perms[i].hit) {
            livePerms.push(perms[i]);
            gobs.push(perms[i]);
        }
    }
    perms = livePerms;
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
         if (shots <  5)  { nRings = 4; ringWidth *= 7.0; }
    else if (shots < 10)  { nRings = 4; ringWidth *= 5.0; }
    else if (shots < 20)  { nRings = 4; ringWidth *= 3.0; }
    else if (shots < 30)  { nRings = 3; ringWidth *= 3.0; }
    else if (shots < 40)  { nRings = 3; ringWidth *= 2.5; }
    else if (shots < 50)  { nRings = 3; ringWidth *= 2.0; }
    else if (shots < 60)  { nRings = 3; ringWidth *= 1.75; }
    else if (shots < 70)  { nRings = 2; ringWidth *= 1.5; }
    else if (shots < 80)  { nRings = 2; ringWidth *= 1.25; }
    else if (shots < 90)  { nRings = 2; ringWidth *= 1.125; }
    else if (shots < 100) { nRings = 2; ringWidth *= 1.0; }
    else                  { nRings = 1; ringWidth *= 0.9; }
    return new Target(x, y, nRings, ringWidth);
}

function newTargetBonus() {
    var x = targetMinX + randInt(targetMaxX - targetMinX);
    var y = targetMinY + randInt(targetMaxY - targetMinY);
    var r = newTarget().radius + 4;
    var bonus = (rand() < 0.5) ? 1 : 0;
    return new TargetBonus(x, y, r, bonus);
}

function newPermBonus() {
    var x = targetMinX + randInt(targetMaxX - targetMinX);
    var y = targetMinY + randInt(targetMaxY - targetMinY);
    return new PermBonus(x, y);
}

var LayerGame = (function() {

    function LayerGame() {
    }
    
    LayerGame.prototype.step = function() {
        // If turn is just beginning.
        if (tms - timeTurnStart < 200) {
            this.timeKeyPressLeft = undefined;
            this.timeKeyPressRight = undefined;
            this.timeKeyPressUp = undefined;
            this.timeKeyPressDown = undefined;
        }
        else {
            const pauseBefore = 500;
            if (this.timeKeyPressUp && tms - this.timeKeyPressUp > pauseBefore) {
                changeAngle(2);
                this.timeKeyPressUp += 25;
            }
            if (this.timeKeyPressDown && tms - this.timeKeyPressDown > pauseBefore) {
                changeAngle(-2); 
                this.timeKeyPressDown += 25;
            }
            if (this.timeKeyPressLeft && tms - this.timeKeyPressLeft > pauseBefore) {
                changeFuel(-1);
                this.timeKeyPressLeft += 75;
            }
            if (this.timeKeyPressRight && tms - this.timeKeyPressRight > pauseBefore) {
                changeFuel(1);
                this.timeKeyPressRight += 75;
            }
        }
        
        // Step game objects.
        for (var i = 0; i < gobs.length; i++) {
            if (typeof gobs[i].step == 'function')
                gobs[i].step();
        }
            
        // Draw background.
        g.fillStyle = '#eee';
        g.fillRect(0, 0, canvasW, canvasH);
        
        // Draw game objects.
        var x, y;
        for (var i = 0; i < gobs.length; i++) {
            g.save();
            x = gobs[i].dx;
            y = gobs[i].dy;
            g.translate(x, y);
            gobs[i].draw();
            g.restore();
        }
            
        // Draw overhead background.
        g.fillStyle = 'rgba(0, 0, 0, 0.2)';
        g.fillRect(0, 0, canvasW, 30);

        // Draw total bull's eyes.
        setFont(18);
        g.textAlign = 'center';
        g.fillStyle = '#000';
        g.fillText(shots+' Shots', 100, 23);
        g.textAlign = 'left';

        // Draw gold.
        setFont(18);
        g.fillStyle = '#000';
        g.fillText(gold+' Gold', 250, 23);
        if (gold <= 0) {
            g.fillStyle = '#d00';
            g.fillText(gold, 250, 23);
        }
        
        // Draw star power.
        if (starPower) {
            g.save();
            g.translate(200, 15);
            g.fillStyle = '#000';
            g.fillCircle(0, 0, 12);
            g.fillStyle = '#fc0';
            g.fillStar(0, 0, 12, 0);
            g.restore();
        }

        // Draw fps.
        if (showFps) {
            g.fillStyle = '#000';
            g.font = '8pt'+fontFace;
            g.fillText(fps+' fps', 2, 10);
        }
        
        // Throb name form if empty.
        if (false && nameFieldValue == '') {
            var alpha = (tms/2000.0);
            alpha -= Math.floor(alpha);
            document.getElementById('namediv').style.border = '4px solid rgba(255, 0, 0, '+alpha+')';
        }
    };

    LayerGame.prototype.onKeyPress = function(k) {
        switch(k) {
        case KeyEvent.DOM_VK_UP:    if (!this.timeKeyPressUp) {    changeAngle(1);  this.timeKeyPressUp = tms; }    return true;
        case KeyEvent.DOM_VK_DOWN:  if (!this.timeKeyPressDown) {  changeAngle(-1); this.timeKeyPressDown = tms; }  return true;
        case KeyEvent.DOM_VK_LEFT:  if (!this.timeKeyPressLeft) {  changeFuel(-1);  this.timeKeyPressLeft = tms; }  return true;
        case KeyEvent.DOM_VK_RIGHT: if (!this.timeKeyPressRight) { changeFuel(1);   this.timeKeyPressRight = tms; } return true;
        case KeyEvent.DOM_VK_SPACE: fireCannon(); return true;
        }
        return false;
    };

    LayerGame.prototype.onKeyRelease = function(k) {
        switch(k) {
        case KeyEvent.DOM_VK_UP:    this.timeKeyPressUp = undefined; return true;
        case KeyEvent.DOM_VK_DOWN:  this.timeKeyPressDown = undefined; return true;
        case KeyEvent.DOM_VK_LEFT:  this.timeKeyPressLeft = undefined; return true;
        case KeyEvent.DOM_VK_RIGHT: this.timeKeyPressRight = undefined; return true;
        }
        return false;
    };

    return LayerGame;
})();

function changeAngle(n) {
    if (!isCannonFocused)
        return;
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
    if (!isCannonFocused)
        return;
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

function fuelToPower(fuel) {
    // Power ranges from 0.05 to 0.60
    return (0.05 + Math.pow(fuel, 0.9) * 0.008717) * physics;
}

function fireCannon() {
    if (qaLevels) {
        nextShot();
        shots++;
        return;
    }
    if (isCannonFired)
        return;
    isCannonFired = true;
    if (starPower)
        starPower--;
    shots++;
    var dx = cannon.dx;
    var dy = cannon.dy;
    fuelCost = cannon.fuel;
    var power = fuelToPower(cannon.fuel);
    var angle = cannon.angle;
    var vx = power * Math.cos(angle);
    var vy = power * Math.sin(angle);
    // Put shot before cannon and after targets.
    theShot = new Shot(dx, dy, vx, vy);
    gobs.remove(cannon);
    gobs.push(theShot);
    gobs.push(cannon);
    push_multi_sound('firecannon');
}

function updateAchievements() {
    if (!showAchievements)
        return;
    var ach = '';
    var append = function(name, value) {
        ach = ach+name+': '+value+'<br/>';
    }
    append('mostShots', mostShots);
    append('longestHitRun', longestHitRun);
    append('longestEyeRun', longestEyeRun);
    append('mostGoldEver', mostGoldEver);
    append('shot10Gold', shot10Gold);
    append('shot10Time', shot10Time);
    append('shot100Gold', shot100Gold);
    append('shot100Time', shot100Time);
    append('mostHitsOf3', mostHitsOf3);
    append('mostEyesOf3', mostEyesOf3);
    append('mostHitsOf10', mostHitsOf10);
    append('mostEyesOf10', mostEyesOf10);
    ach = '<div style="margin: 10px; padding: 10px;"><b>Statistics:</b><br />'+ach+'</div>';
    document.getElementById('debug').innerHTML = ach;
}

var Cannon = (function() {

    function Cannon(dxi, dyi) {
        this.dx = dxi;
        this.dy = dyi;
    }

    Cannon.prototype.draw = function() {
        
        // Draw cannon.
        g.strokeStyle = '#555';
        g.lineWidth = 4;
        g.strokeCircle(0, 0, 9.5);
        g.save();
        g.rotate(this.angle);
        g.fillStyle = '#000';
        g.fillRect(-9.5, -4, 23.5, 8);
        g.fillRoundRect(12.5, -6.5, 9, 13, 3);
        g.restore();
        g.fillStyle = '#555';
        g.fillCircle(0, 0, 2.5);
        
        // Draw fuel.
        var bars = cannon.fuel * 0.2;
        g.lineWidth = 1.25;
        g.fillStyle = '#000';
        g.translate(2, 23);
        for (var i = 0; i < bars; i++) {
            const sx = 2.25
            const sy = 0.75
            g.strokeLine(i * sx, 0, i * sx, (i + 1) * -sy);
        }
        g.fillStyle = '#000';
        setFont(10);
        g.fillText(cannon.fuel, 0, 12);
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
        progress = ((progress * 485207) & 0xffffffff) ^ 385179316;
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
                if (typeof gobs[i].collide == 'function')
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

    return Shot;
})();

var Target = (function() {

    function Target(dxi, dyi, nRings, ringWidth) {
        this.dx = dxi;
        this.dy = dyi;
        this.nRings = nRings;
        this.ringWidth = ringWidth;
        this.radius = ringWidth * (nRings - 0.75);
        this.hit = false;
        var rings = [];
        for (var i = 0; i < nRings; i++)
            rings.push(new Ring());
        this.rings = rings;
    }

    Target.prototype.draw = function() {
        with(this) {
            var color = '#000';
            
            // Draw rings.
            for (var i = 0; i < nRings; i++) {
                rings[i].draw(i, ringWidth);
            }
            
            // Draw crosshairs.
            if (nRings == 1) {
                if (this.rings[0].timeHit == undefined) {
                    const w = ringWidth;
                    g.strokeStyle = color;
                    g.lineWidth = w * 0.5;
                    g.strokeLine(-w, 0, 2.5 * -w, 0);
                    g.strokeLine(w, 0, 2.5 * w, 0);
                    g.strokeLine(0, -w, 0, 2.5 * -w);
                    g.strokeLine(0, w, 0, 2.5 * w);
                }
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

        var maxRadius = shotRadius + this.radius;
        if (dSqrd <= maxRadius*maxRadius) {
            if (!this.hit) {
                this.hit = true;
                hitsMade++;
                totalTargetHit++;
                hitRun++;
                if (hitRun > longestHitRun)
                    longestHitRun = hitRun;
            }
            var d = Math.sqrt(dSqrd);
            for (var i = 0; i < this.nRings; i++) {
                if (this.rings[i].collide(i, this.ringWidth, d)) {
                    if (i == 0) {
                        eyeHitMade(this.dx, this.dy);
                        push_multi_sound('bullseye');
                    }
                }
            }
        }
    };

    return Target;
})();

function eyeHitMade(x, y) {
    eyesMade++;
    eyesTotal++;
    eyeRun++;
    if (eyeRun > longestEyeRun)
        longestEyeRun = eyeRun;
    if (useNewEyeScoring) {
        gobs.push(new Explosion(x, y, eyeRun));
    }
    else {
        if (eyeRun > 1) {
            var eyeRunBonus = (eyeRun - 1) * 25;
            goldThisTurn += eyeRunBonus;
            gobs.push(new Bonus(x, y - 29, eyeRunBonus, true));
        }
        gobs.push(new Explosion(x, y, 5));
    }
}

var TargetBonus = (function() {

    function TargetBonus(dxi, dyi, radius, bonus) {
        this.dx = dxi;
        this.dy = dyi;
        this.radius = radius;
        this.bonus = bonus;
        this.hit = false;
        this.extra = (bonus == 1) ? new BonusStar(this) : new BonusEyeSet(this);
    }

    TargetBonus.prototype.step = function() {
        if (this.extra) {
            this.extra.step();
        }
    };

    TargetBonus.prototype.draw = function() {
        with(this) {
            if (hit)
                return;
            
            var color = (bonus == 1) ? '#fc0' : '#0f4';

            const minRadius = ringWidthAvg * 0.5;
            
            // Draw crosshairs.
            if (radius < minRadius) {
                const w = ringWidthAvg;
                g.strokeStyle = color;
                g.lineWidth = minRadius;
                g.strokeLine(-w, 0, 2.5 * -w, 0);
                g.strokeLine(w, 0, 2.5 * w, 0);
                g.strokeLine(0, -w, 0, 2.5 * -w);
                g.strokeLine(0, w, 0, 2.5 * w);
            }
            
            // Draw star or whatever extra treat.
            if (extra) {
                extra.draw();
            }
            
            // Draw bonus.
            g.drawGlassBall(0, 0, radius, '#000', 0.2);
        }
    };

    TargetBonus.prototype.collide = function(shot) {
        if (!(shot instanceof Shot))
            return;
    
        var x0 = shot.dxPrev;
        var y0 = shot.dyPrev;
        var x1 = shot.dx;
        var y1 = shot.dy;
        var dx = this.dx;
        var dy = this.dy;
        var dSqrd = sqrSegPoint(x0, y0, x1, y1, dx, dy);

        var maxRadius = shotRadius + this.radius;
        if (dSqrd <= maxRadius*maxRadius) {
            // Slow the game for drama.
            if (!this.hit) {
                timeOfAnyHit = tms;
                this.hit = true;
                this.extra.pickup();
                push_multi_sound('bonus');
                this.extra = null;
            }
        }
    };

    return TargetBonus;
})();

var BonusStar = (function() {

    function BonusStar(parent) {
        this.parent = parent;
        this.radius = parent.radius;
        this.ad = 0;
        this.av = 0.0005;
    }
    
    BonusStar.prototype.step = function() {
        this.ad += this.av * dms;
    };
    
    BonusStar.prototype.draw = function() {
        g.fillStyle = '#fc0';
        g.fillStar(0, 0, this.radius, this.ad);
    };
    
    BonusStar.prototype.pickup = function() {
        starPower += starPowerTurns;
    };

    return BonusStar;
})();

var BonusEyeSet = (function() {

    function BonusEyeSet(parent) {
        this.parent = parent;
        this.radius = parent.radius;
        this.eyes = new Array();
        for (var i = 0; i < eyePowerAmount; i++)
            this.eyes.push(new BonusEye(this));
    }
    
    BonusEyeSet.prototype.step = function() {
        for (var i = this.eyes.length; i-- > 0; )
            this.eyes[i].step();
    };
    
    BonusEyeSet.prototype.draw = function() {
        for (var i = this.eyes.length; i-- > 0; )
            this.eyes[i].draw();
    };
    
    BonusEyeSet.prototype.pickup = function() {
        for (var i = this.eyes.length; i-- > 0; )
            this.eyes[i].pickup();
    };

    return BonusEyeSet;
})();

var BonusEye = (function() {

    function BonusEye(parent) {
        this.parent = parent;
        var radius = parent.radius;
        this.smallR = radius * 0.075 + 0.5;
        this.bigR = radius;
        var rs = this.bigR - this.smallR;
        do {
            this.dx = rand() * radius * 2 - radius;
            this.dy = rand() * radius * 2 - radius;
        } while (sqr(this.dx, this.dy) >= rs * rs);
        var mag = (1 + rand()) * 0.05 * (radius / 75);
        var ang = rand() * Math.PI * 2;
        this.vx = mag * Math.cos(ang);
        this.vy = mag * Math.sin(ang);
    }
    
    BonusEye.prototype.step = function() {
        this.dx += this.vx * dms;
        this.dy += this.vy * dms;
        var rs = this.bigR - this.smallR;
        var d = sqr(this.dx, this.dy);
        if (d > rs * rs) {
            // Bounce eye.
            var h = Math.sqrt(d);
            
            // Move into circle.
            this.dx = this.dx * rs / h;
            this.dy = this.dy * rs / h;
                        
            // Reflect velocity.
            var p = project(this.vx, this.vy, this.dx, this.dy);
            this.vx -= p[0] * 2;
            this.vy -= p[1] * 2;
        }
    };
    
    BonusEye.prototype.draw = function() {
        g.fillStyle = '#000';
        g.fillCircle(this.dx, this.dy, this.smallR);
    };
    
    BonusEye.prototype.pickup = function() {
        var x = this.dx + this.parent.parent.dx;
        var y = this.dy + this.parent.parent.dy;
        eyeHitMade(x, y);
    };

    return BonusEye;
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
                var loot = computeRingGold(number, undefined);
                goldThisTurn += loot;
                gobs.push(new Bonus(theShot.dx, theShot.dy, loot, false));
                return true;
            }
        }
        return false;
    }

    function computeRingGold(i, nRings) {
        return i?~-i?25:50:75;//:)
    }

    return Ring;
})();

function isFallenFromVision(gob, safetyMargin) {
    return (gob.dx < -safetyMargin)
        || (canvasW + safetyMargin < gob.dx)
        || (canvasH + safetyMargin < gob.dy);
}

var Explosion = (function() {

    function Explosion(dx, dy, streamers) {
        this.dx = dx;
        this.dy = dy;
        this.timeStart = tms;
        var angle = rand() * Math.PI * 2;
        for (var i = streamers; i-- > 0; ) {
            gobs.push(new Streamer(dx, dy, angle));
            angle += Math.PI * 2 / streamers;
        }
        if (useNewEyeScoring) {
            for (var i = 0; i < streamers; i++) {
                var perm = newPermBonus();
                perms.push(perm);
                gobs.push(perm);
            }
        }
    }
    
    Explosion.prototype.draw = function() {
        var age = tms - this.timeStart;

        // Draw ring of smoke.
        if (false && age) {
            var ringRadius = age * 0.13;
            var width = 30;
            if (width * 0.5 >= ringRadius)
                width = ringRadius * 2;
            var start = ringRadius - width * 0.5;
            var finish = ringRadius + width * 0.5;
            var grad = g.createRadialGradient(0, 0, start, 0, 0, finish);
            var alpha = 1 / (1 + age * 0.005);
            grad.addColorStop(0.0, 'rgba(0, 0, 0, '+(alpha*0.0)+')');
            grad.addColorStop(0.1, 'rgba(0, 0, 0, '+(alpha*0.04)+')');
            grad.addColorStop(0.3, 'rgba(0, 0, 0, '+(alpha*0.1)+')');
            grad.addColorStop(0.5, 'rgba(0, 0, 0, '+(alpha*0.4)+')');
            grad.addColorStop(0.7, 'rgba(0, 0, 0, '+(alpha*0.1)+')');
            grad.addColorStop(0.9, 'rgba(0, 0, 0, '+(alpha*0.04)+')');
            grad.addColorStop(1.0, 'rgba(0, 0, 0, '+(alpha*0.0)+')');
            g.strokeStyle = grad;
            g.lineWidth = width;
            g.strokeCircle(0, 0, ringRadius);
        }
    }

    return Explosion;
})();

var Streamer = (function() {
    
    const streamerWidth = 6;
    const streamerLength = 13;
    
    function Streamer(dx, dy, angle) {
        this.dx = dx;
        this.dy = dy;
        var mag = (1 + rand()) * 0.12 * physics;
        var ang = angle;
        this.vx = mag * Math.cos(ang);
        this.vy = mag * Math.sin(ang);
        this.ang1da = rand() * Math.PI * 2;
        this.ang1va = (rand() - 0.5) * Math.PI * 0.034;
        this.ang1r = rand() * 0.4;
        this.color = randHue();
        this.points = new Array();
        this.points.push(new Point(this.dx, this.dy));
        this.dead = false;
    }
    
    Streamer.prototype.step = function() {
        if (this.dead)
            return;
        
        // Step streamer.
        var vyPrev = this.vy;
        this.vy += gravity * dms;
        this.dx += this.vx * dms;
        this.dy += (this.vy + vyPrev) * 0.5 * dms;
        this.ang1da += this.ang1va * dms;
        this.dx += this.ang1r * Math.cos(this.ang1da) * dms;
        this.dy += this.ang1r * Math.sin(this.ang1da) * dms;
        if (this.points.length >= streamerLength)
            this.points.shift();
        this.points.push(new Point(this.dx, this.dy));
        
        // Check bounds - death conditions.
        const edgeLimit = 30;
        dead = isFallenFromVision(this, 30);
        
        // Step sparks.
        if (rand() < 0.65)
            gobs.push(new Spark(this.dx, this.dy, this.color));
    }
    
    Streamer.prototype.draw = function() {
        if (this.dead)
            return;
        
        // Draw streamer.
        g.save();
        g.translate(-this.dx, -this.dy);
        var prev = this.points[0];
        var next;
        var len = this.points.length;
        if (len > 1) {
            g.lineCap = "round";
            g.lineWidth = streamerWidth;
            var rgbHead = new RGBColor(this.color);
            var rgbTail = new RGBColor('#fff');
            var rgbNext;
            var alpha;
            for (var i = 1; i < len; i++) {
                next = this.points[i];
                alpha = 1 - ((len - i) / streamerLength);
                rgbNext = rgbHead.linear(rgbTail, 1 - alpha);
                g.strokeStyle = 'rgba('+rgbNext.r+', '+rgbNext.g+', '+rgbNext.b+', '+alpha+')';
                g.strokeLine(prev.x, prev.y, next.x, next.y);
                prev = next;
            }
        }
        g.restore();
    }
    
    return Streamer;
})();

var Spark = (function() {

    const sparkRadius = 1.5;
    
    function Spark(x, y, color) {
        this.dx = x;
        this.dy = y;
        var mag = (1 + rand()) * 0.045 * physics;
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
            g.fillCircle(0, 0, sparkRadius);
        }
        if (alpha < 0) {
            this.alive = false;
        }
    }
    
    return Spark;
})();

var Bonus = (function() {

    function Bonus(dxi, dyi, amount, isSpecial) {
        this.dx = dxi;
        this.dy = dyi;
        this.timeBonusGiven = tms;
        this.amount = amount;
        this.isSpecial = isSpecial;
    }

    Bonus.prototype.draw = function() {
        with(this) {
            var dt = tms - timeBonusGiven
            const totalTime = 5000.0;
            const fadeTime = 2000.0;
            const opaqueTime = totalTime - fadeTime;
            if (dt < totalTime) {
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
                if (isSpecial) {
                    setFont(18);
                    g.lineWidth = 6;
                    g.lineJoin = 'round';
                    g.fillStyle = 'rgba(0, 255, 0, '+alpha+')';
                    g.strokeStyle = 'rgba(0, 0, 0, '+alpha+')';
                    g.strokeText('+'+this.amount, 0, -12 - oy * 22);
                    g.fillText('+'+this.amount, 0, -12 - oy * 22);
                }
                else {
                    setFont(12);
                    g.fillStyle = 'rgba(0, 0, 0, '+alpha+')';
                    g.fillText('+'+this.amount, 0, -12 - oy * 22);
                }
                g.textAlign = 'left';
            }
        }
    };

    return Bonus;
})();

function trimSparks(sparks) {
    var newA = new Array();
    for (var i = 0; i < sparks.length; i++) {
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
        this.dx = 0;
        this.dy = 0;
    }

    Trajectory.prototype.draw = function() {
        if (!starPower)
            return;
        this.dx = cannon.dx;
        this.dy = cannon.dy;
        var power = fuelToPower(cannon.fuel);
        var angle = cannon.angle;
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
            var distTraveled = 0;
            var ddx, ddy;
            var distLimit = 3000
            while (true) {
                vyPrev = vy;
                vy += gravity * dms;
                ddx = vx * dms;
                ddy = (vy + vyPrev) * 0.5 * dms;
                dx += ddx;
                dy += ddy;
                if (drawDash)
                    g.lineTo(dx, dy);
                else
                    g.moveTo(dx, dy);
                drawDash = !drawDash;
                distTraveled += mag(ddx, ddy);
                
                // Check bounds - end of shot conditions.
                if (distTraveled > distLimit)
                    break;
                var s = {'dx': dx, 'dy': dy};
                if (isFallenFromVision(s, 20 + shotRadius))
                    break;
                
                // Collide with all game objects.
                for (var i = 0; i < gobs.length; i++) {
                    if (typeof gobs[i].collide == 'function')
                        gobs[i].collide(this);
                }
                iters++;
            }
            g.stroke();
            dms = backupDms;
        }
        
        // To get it translated correctly as all gobs are before draw() is called:
        this.dx = 0;
        this.dy = 0;
    };

    return Trajectory;
})();

var PermBonus = (function() {

    function PermBonus(dxi, dyi) {
        this.dx = dxi;
        this.dy = dyi;
        this.radius = 10;
        this.hit = false;
    }

    PermBonus.prototype.step = function() {
    };

    PermBonus.prototype.draw = function() {
        if (this.hit)
            return;
        
        g.drawGlassBall(0, 0, this.radius, '#fc0', 1.0);
    };

    PermBonus.prototype.collide = function(shot) {
        if (!(shot instanceof Shot))
            return;
    
        var x0 = shot.dxPrev;
        var y0 = shot.dyPrev;
        var x1 = shot.dx;
        var y1 = shot.dy;
        var dx = this.dx;
        var dy = this.dy;
        var dSqrd = sqrSegPoint(x0, y0, x1, y1, dx, dy);

        var maxRadius = shotRadius + this.radius;
        if (dSqrd <= maxRadius*maxRadius) {
            // Slow the game for drama.
            if (!this.hit) {
                timeOfAnyHit = tms;
                this.hit = true;
                push_multi_sound('bonus');
                var eyePermBonus = 25;
                goldThisTurn += eyePermBonus;
                gobs.push(new Bonus(this.dx, this.dy - 29, eyePermBonus, true));
            }
        }
    };

    return PermBonus;
})();

var LayerScore = (function() {

    function LayerScore() {
        this.shot = -shotCost;
        this.fuel = -fuelCost;
        this.gold = goldThisTurn;
        this.net  = this.shot + this.fuel + this.gold;
        this.timeCreated = time();
        isCannonFocused = false;

        // Update shots.
        if (false && shots % shotsPerBonus == 0) {
            changeGold(shotsBonus);
            timeShotsBonusGiven = tms;
            push_multi_sound('bonus');
        }
        if (shots == 10) {
            shot10Gold = gold + this.gold;
            shot10Time = time() - timeGameStart;
        }
        if (shots == 100) {
            shot100Gold = gold + this.gold;
            shot100Time = time() - timeGameStart;
        }
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
        g.strokeStyle = '#eb0';
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
        
        // Big number.
        setFont(38);
        g.textAlign = 'center'
        ox = x + w / 2; oy = y + 208;
        g.strokeStyle = '#000';
        g.lineWidth = 12;
        g.lineJoin = 'round';
        var value = this.net;
        var color = (value > 0) ? '#0f0' : '#f00';
        var gray = '#999';
        var colored = Math.min(Math.abs(value) * 0.02, 1.0);
        color = linearColor(gray, color, colored);
        g.fillStyle = color;
        g.strokeText(showSign(value),  ox, oy);
        g.fillText(showSign(value),  ox, oy - 1);
        g.textAlign = 'left';
    };

    LayerScore.prototype.onKeyPress = function(k) {
        if (time() - this.timeCreated < 200)
            return false;
        switch(k) {
        case KeyEvent.DOM_VK_SPACE: finishScore(this); return true;
        }
        return false;
    };

    LayerScore.prototype.onKeyRelease = function(k) {
        return false;
    };

    return LayerScore;
})();

function finishScore(layer) {
    layers.remove(layer);
    
    changeGold(layer.net);
    
    totalFuelUsed += layer.fuel;
    totalGoldWon += layer.gold;
    
    if (!hitsMade)
        hitRun = 0;
    
    if (!eyesMade)
        eyeRun = 0;
    
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
        nextShot();
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
        this.gameTime = time() - timeGameStart;
        this.timeCreated = time();
        mostShots = shots;
        isCannonFocused = false;
        
        // Create score from game.
        addGameScore();
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
        g.fillText('Time Played: '+msToString(this.gameTime), x + w / 2, y + 60);
        setFont(12);
        g.fillText('Bullseyes: '+eyesTotal, x + w / 2, y + 80);
        setFont(12);
        g.fillText('Gold won: '+totalGoldWon, x + w / 2, y + 100);
        
        // Eyes.
        setFont(28);
        ox = x + w / 2; oy = y + h / 2 + 5;
        g.strokeStyle = '#000';
        g.lineWidth = 5;
        g.lineJoin = 'round';
        g.fillStyle = '#07f';
        var msg = shots+' Shots'+fill('!', eyesTotal / 45);
        g.strokeText('Achieved', ox, oy+30);
        g.fillText('Achieved', ox, oy+30);
        g.strokeText(msg, ox, oy+72);
        g.fillText(msg, ox, oy+72);
        
        g.textAlign = 'left';
    };

    LayerGameOver.prototype.onKeyPress = function(k) {
        if (time() - this.timeCreated < 200)
            return false;
        switch(k) {
        case KeyEvent.DOM_VK_SPACE: finishGameOver(this); return true;
        }
        return false;
    };

    LayerGameOver.prototype.onKeyRelease = function(k) {
        return false;
    };

    return LayerGameOver;
})();

function finishGameOver(layer) {
    layers.remove(layer);
    newGame();
}
