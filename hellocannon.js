//
// Hello Cannon
// by Jeff Hollocher
//

// UI.
var canvas;
var g;
var stepLastTime;
var layers;
var fps;
var frameCount;
var timeElapsed;
const targetMspf = 30;
const canvasW = 420;
const canvasH = 420;
const fontFace = '"Trebuchet MS", Helvetica, sans-serif';

// Mechanics.
const gravity = 0.21;
const fuelPower = 0.16;
const goldFactor = 0.87;
const angleSteps = 75;
const fuelSteps = 20;
const noise = 0;
const shotCost = 50;
const slowFactor = 0.1;
const timeFactor = 0.05
const rescoreTime = 500;
const targetBonus = 250;
const levelBonus = 250;

// Bounds.
const shotRadius = 5;
const ringW = 2.25;
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
var settingCannon;
var timeOfAnyHit;
var timeLevelBonusGiven;
var timeGameStart;
var showTrajectory;
var hitRun;
var eyeRun;
var hitsMade;
var eyesMade;
var numTargets;

// Achievements.
var highestLevel;
var longestHitRun;
var longestEyeRun;
var mostGoldEver;
var level10Gold;
var level10Time;
var level100Gold;
var level100Time;
var mostHitsOf3;
var mostEyesOf3;
var mostHitsOf10;
var mostEyesOf10;

function main() {
    canvas = document.getElementById('hellocannon');
    g = canvas.getContext('2d');
    fitToScreen();
    stepLastTime = undefined;
    tms = 0;
    dms = 0;
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
        dms = 0
    }
    else {
        var currTime = time();
        dms = currTime - stepLastTime;
        stepLastTime = currTime;
        frameCount++;
        timeElapsed += dms;
        if (timeElapsed > 1000) {
            fps = frameCount;
            frameCount = 0;
            timeElapsed = timeElapsed % 1000;
        }
        dms = Math.min(dms, 25);
    }
    tms += dms;
    step();
}

function step() {
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
    settingCannon = false;
    nextLevel();
    timeGameStart = time();
    longestHitRun = 0;
    longestEyeRun = 0;
}

function nextLevel() {
    level++;
    if (level % 10 == 0) {
        gold += levelBonus;
        timeLevelBonusGiven = tms;
        push_multi_sound('bonus');
    }
    newTurn();
}

function newTurn() {
    settingCannon = true;
    goldThisTurn = 0;
    gobs = [];
    cannon.dx = 0;
    cannon.dy = cannonMinY + randInt(cannonMaxY - cannonMinY);
    var numTargets = 1;
    if (rand() < 0.142857)
        numTargets = (rand() < 0.142857) ? 10 : 3;
    for (var i = 0; i < numTargets; i++)
        gobs.push(newTarget());
    if (showTrajectory) {
        showTrajectory--;
        gobs.push(trajectory);
    }
    gobs.push(cannon);
}

function retryTurn() {
    newTurn();
}

function newTarget() {
    var x = targetMinX + randInt(targetMaxX - targetMinX);
    var y = targetMinY + randInt(targetMaxY - targetMinY);
    var nRings;
    var bonus = 0;
    if (rand() < 0.142857)
        bonus = (rand() < 0.142857) ? 2 : 1;
    if (level < 5)          nRings = 10;
    else if (level < 10)    nRings = 8;
    else if (level < 20)    nRings = 6;
    else if (level < 30)    nRings = 5;
    else if (level < 40)    nRings = 4 + randInt(2);
    else if (level < 50)    nRings = 4;
    else if (level < 60)    nRings = 3 + randInt(2);
    else if (level < 70)    nRings = 3;
    else if (level < 80)    nRings = 2 + randInt(2);
    else if (level < 90)    nRings = 2;
    else if (level < 100)   nRings = 1 + randInt(2);
    else                    nRings = 1;
    return new Target(x, y, nRings, bonus);
}

var LayerGame = (function() {

    function LayerGame() {
    }
    
    LayerGame.prototype.step = function() {
        // Step game objects.
        for (var i = 0; i < gobs.length; i++)
            gobs[i].step();
            
        // Draw background.
        g.fillStyle = '#b5d5f1';
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
            g.strokeText('10-Levels!', canvasW / 2, 75);
            g.strokeText('+'+levelBonus, canvasW / 2, 110);
            g.fillStyle = 'rgba(255, 255, 255, '+alpha+')';
            g.fillText('10-Levels!', canvasW / 2, 75);
            g.fillStyle = 'rgba(0, 255, 0, '+alpha+')';
            g.fillText('+'+levelBonus, canvasW / 2, 110);
            g.textAlign = 'left';
        }
    };

    LayerGame.prototype.onKeyDown = function(k) {
        if (settingCannon) {
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
        push_multi_sound('adjustangle');
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
    gobs.remove(trajectory);
    settingCannon = false;
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
        g.fillRoundRect(13, -6, 8, 12, 3);
        g.restore();
        g.fillStyle = '#7a1e00';
        g.fillCircle(0, 0, 2.5);
        
        // Draw fuel.
        var bars = 2 + cannon.fuel / 3;
        g.lineWidth = 1.0;
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
        g.fillText(cannon.fuel, 0, 11);
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
        this.timeTotal = 0;
    }

    Shot.prototype.step = function() {
        with(this) {
            var factor;
            if (tms - timeOfAnyHit < 400) {
                factor = dms * timeFactor * slowFactor;
            }
            else {
                factor = dms * timeFactor;
            }
            timeTotal += factor;
            dxPrev = dx;
            dyPrev = dy;
            dx = dxi + vx * timeTotal;
            dy = dyi + vy * timeTotal + gravity * timeTotal * timeTotal * 0.5;
            
            // Check bounds - end of shot conditions.
            const edgeLimit = 20;
            if (dx < -shotRadius - edgeLimit)
                endLevel(this);
            else if (canvasW + shotRadius + edgeLimit < dx)
                endLevel(this);
            else if (canvasH + shotRadius + edgeLimit < dy)
                endLevel(this);
        }
        
        for (var i = 0; i < gobs.length; i++) {
            gobs[i].collide(this);
        }
    };

    Shot.prototype.draw = function() {
        with(this) {
            g.fillStyle = '#000';
            g.fillCircle(0, 0, 5);
            g.fillStyle = '#fff';
            g.fillCircle(-2, -2, 1);
        }
    };

    Shot.prototype.collide = function(shot) {
    };

    return Shot;
})();

function endLevel(shotCausingEnd) {
    gobs.remove(shotCausingEnd);
    layers.push(new LayerScore());
}

var Target = (function() {

    function Target(dxi, dyi, nRings, bonus) {
        this.dx = dxi;
        this.dy = dyi;
        this.dSqrd = Number.MAX_VALUE;
        this.nRings = nRings;
        this.radius = 4*nRings - 3;
        this.bonus = bonus;
        this.hit = false;
        var rings = [];
        for (var i = 0; i < nRings; i++)
            rings.push(new Ring());
        this.rings = rings;
    }

    Target.prototype.step = function() {
    };

    Target.prototype.draw = function() {
        with(this) {
            var bonusColor = '#000';
            
            // Draw bonus.
            if (bonus) {
                bonusColor = (bonus == 1) ? '#0f0' : '#f6c500';
                g.fillStyle = bonusColor;
                g.fillCircle(0, 0, ringW * (nRings - 1) * 2);
            }
            
            // Draw rings.
            for (var i = 0; i < nRings; i++) {
                rings[i].draw(i);
            }
            
            // Draw crosshairs.
            if (nRings == 1) {
                var notDestroyed = (rings[0].timeHit == undefined);
                if (notDestroyed) {
                    const w = ringW;
                    g.strokeStyle = bonusColor;
                    g.lineWidth = w;
                    g.strokeLine(-2 * w, 0, -5 * w, 0);
                    g.strokeLine(2 * w, 0, 5 * w, 0);
                    g.strokeLine(0, -2 * w, 0, -5 * w);
                    g.strokeLine(0, 2 * w, 0, 5 * w);
                }
            }
        }
    };

    Target.prototype.collide = function(shot) {
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
            if (!this.hit && this.bonus) {
                this.hit = true;
                hitsMade++;
                gold += targetBonus;
                if (this.bonus == 2)
                    showTrajectory = 3;
                this.bonus = 0;
                push_multi_sound('bonus');
                gobs.push(new Bonus(dx, dy));
            }
            var d = Math.sqrt(dSqrd);
            for (var i = 0; i < this.nRings; i++) {
                this.rings[i].collide(i, d);
            }
        }
    };

    return Target;
})();

var Ring = (function() {

    function Ring() {
        this.timeHit = undefined;
    }
    
    Ring.prototype.draw = function(number) {
        const FADE_TIME = 900;
        if (this.timeHit == undefined) {
            g.fillStyle = '#000';
        }
        else if (tms - this.timeHit < FADE_TIME) {
            var alpha = 1.0 - (tms - this.timeHit) / FADE_TIME;
            g.fillStyle = 'rgba(255, 255, 255, '+alpha+')';
        }
        else {
            return; // Ring is destroyed and finished animating.
        }
        const w = ringW;
        g.lineWidth = w;
        g.strokeStyle = g.fillStyle;
        if (number == 0)
            g.fillCircle(0, 0, w * 0.5);
        else
            g.strokeCircle(0, 0, w * number * 2);
    }
    
    Ring.prototype.collide = function(number, d) {
        if (this.timeHit == undefined) {
            if (d - shotRadius <= (number * 2 + 0.5) * ringW) {
                this.timeHit = tms;
                timeOfAnyHit = tms;
                goldThisTurn += computeRingGold(number, undefined);
                if (number == 0) {
                    eyesMade++;
                    push_multi_sound('bullseye');
                }
            }
        }
    }

    function computeRingGold(i, nRings) {
        return Math.max(5, 5*Math.floor(29/(i+1.9)));
    }

    return Ring;
})();

var TargetOld = (function() {

    function TargetOld(dxi, dyi, nRings, bonus) {
        this.dx = dxi;
        this.dy = dyi;
        this.dSqrd = Number.MAX_VALUE;
        this.nRings = nRings;
        this.radius = 4*nRings - 3;
        this.bonus = bonus;
        var rings = [];
        for (var i = 0; i < nRings; i++)
            rings.push(new Ring());
        this.rings = rings;
    }

    TargetOld.prototype.step = function() {
        for (var i = 0; i < this.nRings; i++)
            this.rings[i].timeSinceHit += dms;
    };

    TargetOld.prototype.draw = function() {
        with(this) {
            const w = ringW;
            if (bonus) {
                g.fillStyle = (bonus == 1) ? '#0f0' : '#f6c500';
                g.fillCircle(0, 0, w * (nRings - 1) * 2);
            }
            g.lineWidth = w;
            var f;
            var ring
            for (var i = 0; i < nRings; i++) {
                ring = rings[i];
                f = 0;
                const FADE_TIME = 900;
                if (ring.timeSinceHit < FADE_TIME)
                    f = 1.0 - ring.timeSinceHit / FADE_TIME;
                var cr = Math.floor(f * 255);
                var cg = Math.floor(f * 255);
                var cb = Math.floor(f * 255);
                g.fillStyle = 'rgb('+cr+', '+cg+', '+cb+')';
                g.strokeStyle = g.fillStyle;
                if (i == 0)
                    g.fillCircle(0, 0, w * 0.5);
                else
                    g.strokeCircle(0, 0, w * i * 2);
                if (nRings == 1) {
                    // Draw crosshairs.
                    if (bonus)
                        g.strokeStyle = (bonus == 1) ? '#0f0' : '#f6c500';
                    g.lineWidth = w;
                    g.strokeLine(-2 * w, 0, -5 * w, 0);
                    g.strokeLine(2 * w, 0, 5 * w, 0);
                    g.strokeLine(0, -2 * w, 0, -5 * w);
                    g.strokeLine(0, 2 * w, 0, 5 * w);
                }
            }
        }
    };

    function computeRingScore(i, nRings) {
        if (i > 7)
            return 5;
        if (i > 5)
            return 10;
        if (i > 3)
            return 15;
        if (i > 1)
            return 20;
        if (i == 1)
            return 30;
        // (i == 0)
            return 75;
    }

    TargetOld.prototype.collide = function(shot) {
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
            timelapse = true;
            if (this.bonus) {
                gold += targetBonus;
                if (this.bonus == 2)
                    showTrajectory = 3;
                this.bonus = 0;
                push_multi_sound('bonus');
                gobs.push(new Bonus(dx, dy));
            }
            const w = ringW;
            var inR;
            var outR;
            var isHit;
            var d = Math.sqrt(dSqrd);
            for (var i = 0; i < this.nRings; i++) {
                if (this.rings[i].timeSinceHit > rescoreTime) {
                    if (i == 0) {
                        outR = w / 2;
                        isHit = (d - shotRadius <= outR);
                    }
                    else {
                        inR = (i*2 - 0.5)*w;
                        outR = (i*2 + 0.5)*w;
                        isHit = ((d - shotRadius <= outR) && (inR <= d + shotRadius));
                    }
                    if (isHit) {
                        this.rings[i].timeSinceHit = 0;
                        goldThisTurn += computeRingScore(i, this.nRings);
                        if (i == 0) {
                            push_multi_sound('bullseye');
                        }
                    }
                }
            }
        }
    };

    return TargetOld;
})();

var RingOld = (function() {

    function RingOld() {
        this.timeSinceHit = 60000;
    }

    return RingOld;
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

var Trajectory = (function() {

    function Trajectory() {
    }

    Trajectory.prototype.step = function() {
    };

    Trajectory.prototype.draw = function() {
        var dx = cannon.dx;
        var dy = cannon.dy;
        var fuelNoise = (100.0 / fuelSteps) * noise * (rand() - 0.5);
        var power = (cannon.fuel + fuelNoise) * fuelPower;
        var angleNoise = (Math.PI / angleSteps) * noise * (rand() - 0.5);
        var angle = (cannon.angle + angleNoise);
        var vx = power * Math.cos(angle);
        var vy = power * Math.sin(angle);
        var dxPrev = dx;
        var dyPrev = dy;
        var x, y;
        
        g.beginPath();
        g.moveTo(dx, dy);
        g.strokeStyle = '#7a1e00';
        g.lineWidth = 1;
        var timeTotal = 0;
        var drawDash = true;
        while (true) {
            var factor = targetMspf * timeFactor;
            timeTotal += factor;
            dxPrev = x;
            dyPrev = y;
            x = dx + vx * timeTotal;
            y = dy + vy * timeTotal + gravity * timeTotal * timeTotal * 0.5;
            if (drawDash)
                g.lineTo(x, y);
            else
                g.moveTo(x, y);
            drawDash = !drawDash;
            
            // Check bounds - end of shot conditions.
            const edgeLimit = 20;
            if (x < -shotRadius - edgeLimit)
                break;
            else if (canvasW + shotRadius + edgeLimit < x)
                break;
            else if (canvasH + shotRadius + edgeLimit < y)
                break;
        }
        g.stroke();
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
        g.fillStyle = '#fff';
        g.strokeStyle = '#f6c500';
        g.lineWidth = 12;
        g.fillRect(x, y, w, h, 15);
        g.strokeRoundRect(x, y, w, h, 15);
        
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
        if (time() - this.timeCreated < 250)
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
    
    gold += layer.net;
    
    totalShotFired++;
    totalFuelUsed += cannon.fuel;
    totalGoldWon += layer.gold;
    totalTargetHit += numTargetsHit();
    
    var anyHitMade = false;
    if (anyHitMade)
        hitRun++;
    else
        hitRun = 0;
    if (hitRun > longestHitRun)
        longestHitRun = hitRun;
    
    var anyEyeMade = false;
    if (anyEyeMade)
        eyeRun++;
    else
        eyeRun = 0;
    if (eyeRun > longestEyeRun)
        longestEyeRun = eyeRun;
    
    if (gold > 0) {
        if (layer.gold == 0)
            retryTurn();
        else
            nextLevel();
    }
    else {
        gameOver();
    }
}

function numTargetsHit() {
    var total = 0;
    for (var i = 0; i < gobs.length; i++) {
        // To do.
    }
    return total;
}

function gameOver() {
    layers.push(new LayerGameOver());
}

var LayerGameOver = (function() {

    function LayerGameOver() {
        this.gameTime = msToString(time() - timeGameStart);
        this.timeCreated = time();
        highestLevel = level;
        
        // Print statistics to console!
    }

    LayerGameOver.prototype.step = function() {
        var w = 200;
        var h = 250;
        var x = (canvasW - w) / 2;
        var y = (canvasH - h) / 2;
        
        // Background.
        g.fillStyle = '#fff';
        g.strokeStyle = '#691c53';
        g.lineWidth = 12;
        g.fillRect(x, y, w, h, 15);
        g.strokeRoundRect(x, y, w, h, 15);
        
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
        g.fillStyle = '#0072fc';
        var exMarks = fill('!', level / 50);
        g.strokeText('Achieved', ox, oy);
        g.strokeText('Level '+level+exMarks, ox, oy + 50);
        g.fillText('Achieved', ox, oy);
        g.fillText('Level '+level+exMarks, ox, oy + 50);
        
        g.textAlign = 'left';
    };

    LayerGameOver.prototype.onKeyDown = function(k) {
        if (time() - this.timeCreated < 2500)
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

