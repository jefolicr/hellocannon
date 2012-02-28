//
// Hello Cannon
// by Jeff Hollocher
//
// Optimizations:
// util.js:fill
// Does drawing spots using quadratic curves render faster than arcs?
// Does drawing a line to nowhere (point) draw faster than arcing a circle?
//
// TODO:
// increase screen size at higher stages
// make long shots have a chance of getting a bonus of +100
// make subtle radial gradient backgrounds for dialog boxes
//

"use strict";

// Debugging.
var xShowFps = false;
var xAlwaysTrajectory = false;
var xAlwaysSink = false;
var xBrowseLevels = false;
var xLevelRedo = true;
var xAlwaysShowPowerup = 0;
var xJumpToStage = 0;
var xFastPlay = false;
var xInvincible = false;
var xAlwaysShowBoss = false;
var xFullscreen = false;
var xDrawCanvasBoundingBox = false;
var xDontDrawParticles = false;
var xMultipleShots = false;
var xSlowPhysics = false;
var xNoScreenDelays = true;
var xPowerupsOverlayTargets = true;
var debuginfo = '';
var xShowLevelSummary = false;
var xFadeOutCashBubbles = false;
var xIndividualCashBubbles = false;
var xEyeSetScoreImmediate = true;

// UI.
var gameCanvas;
var g;
var tPrevAnimatePhysics;
var dtPrevAnimatePhysics;
var tPrevUpdatePhysics;
var fpsPhysics;
var frameCountPhysics;
var tTotalUpdatePhysics;
var tPrevUpdateGraphics;
var fpsGraphics;
var frameCountGraphics;
var tTotalUpdateGraphics;
var targetMspfGraphics = 1000 / 60;
var targetMspfPhysics = 10;
var maxMspfPhysics = 50;
var gameScreenW = 600;
var gameScreenH = 320;
var gameCanvasW = 420;
var gameCanvasH = 420;
var fontFace = "'Trebuchet MS', Helvetica, sans-serif";
var layers;
var targetcolors = ["#fff535", "#fd1b14", "#41b7c8", "#000000", "#ffffff"];
var dialogFadeTime = 250;
var targetPopTime = 400;

// Bounds.
var shotRadius = 0;
var ringWidthAvg = 5.2;
var barHeight = 40;
var cannonMinY = 25 + barHeight;
var cannonMaxY = gameCanvasH - 36;
var targetMinX = 130;
var targetMaxX = gameCanvasW - 10;
var targetMinY = 10 + barHeight;
var targetMaxY = gameCanvasH - 10;
var cashX = 10;
var cashY = 10;

// Mechanics.
var physics = (xSlowPhysics ? 0.2 : 1) * 0.5;
var gravity = 0.000336 * physics * physics;
var angleSteps = 141; // Should be odd so that cannon is able to be aligned perfectly horizontal.
var fuelMax = 100;
var fuelStepn = 5;
var fuelSteps = (fuelMax / fuelStepn);
var shotCost = 30;
var starPowerLevels = 3;
var eyePowerNumEyes = 4;
var bigPowerNumShots = 4;
var bigShotRadius = 16.0;
var greenBalls = 4;
var levelRedoMax = 10;
var shineAngle = 3.8;
var giftEggBonus = 200;
var eyeRunBonus = 25;

// State.
var tms; // total ms time
var dms; // change ms time for current physics tick
var slowAccum;
var shots;
var cash;
var cashWonThisLevel;
var cashChangeThisLevel;
var totalFuelUsed;
var totalTargetHit;
var totalCashWon;
var cannon;
var trajectory;
var fuelCost;
var gobs;
var particles;
var perms;
var isCannonFocused;
var isShotFired;
var gobsReadyToEndLevel;
var humanReadyToEndLevel;
var askIsHumanReadyToEndLevel;
var timeOfLastFire;
var timeOfAnyHit;
var timeGameStart;
var timeLevelStart;
var starPower;
var numBigShots;
var hitRun;
var eyeRun;
var hitsMade;
var eyesMade;
var eyesTotal;
var numTargets;
var numPowerups;
var numSinks;
var timePlayAdjustSound;
var progress;
var stage;
var firstLevelOfStage;
var showOverHeadDisplay;
var didOverShoot;
var singleTarget;

function initHellocannon() {
	Sound.setsounds([
		"powerup",
		"adjustangle",
		"D3",
		"G3",
		"B4",
		"D4",
		"G4",
		"adjustpower",
		"firecannon2",
		"sink",
		"targetpop",
		"hitgiftegg",
		"hitelectricegg",
		"hitmainegg"
	]);

	Math.seedrandom(0);
	gameCanvas = document.getElementById("hellocannon");
	gameCanvas.key = -1;
	g = gameCanvas.getContext("2d");
	fitToScreen();
	tPrevUpdatePhysics = undefined;
	tPrevAnimatePhysics = undefined;
	dtPrevAnimatePhysics = undefined;
	tms = 0;
	fpsPhysics = Math.round(1000 / targetMspfPhysics);
	frameCountPhysics = 0;
	tTotalUpdatePhysics = 0;
	tPrevUpdateGraphics = undefined;
	fpsGraphics = Math.round(1000 / targetMspfGraphics);
	frameCountGraphics = 0;
	tTotalUpdateGraphics = 0;
	gobs = [];
	particles = [];
	perms = [];
	layers = [];
	layers.push(new LayerGame());
	
	// Start engine.
	animatePhysics();
	animateGraphics();
	document.onkeydown = onKeyPress;
	document.onkeyup = onKeyRelease;
	
	// Start game.
	newGame();
}

function fitToScreen() {
	if (xFullscreen) {
		var vps = viewportSize();
		console.log(vps.w + "," + vps.h);
		vps.w = Math.max(0, (vps.w) - 20);
		vps.h = Math.max(0, (vps.h) - 20);
		console.log(vps.w + "," + vps.h);
		if (vps.h * 1.5 < vps.w) {
			vps.w = vps.h * 1.5;
		}
		console.log(vps.w + "," + vps.h);
		vps.w = 3 * Math.floor(vps.w / 3);
		console.log(vps.w + "," + vps.h);
		vps.h = Math.round(vps.w / 1.5);
		console.log(vps.w + "," + vps.h);
		gameCanvas.width = vps.w;
		gameCanvas.height = vps.h;
	}
	else {
		gameCanvas.width = gameScreenW;
		gameCanvas.height = gameScreenH;
	}

	g.fillStyle = "#000";
	g.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
	var s, tx, ty;
	if (gameCanvas.width < gameCanvas.height) {
		// Tall and skinny.
		s = gameCanvas.width / gameCanvasW;
		tx = 0;
		ty = (gameCanvas.height - s * gameCanvasH) * 0.5;
	}
	else {
		// Short and fat.
		s = gameCanvas.height / gameCanvasH;
		tx = (gameCanvas.width - s * gameCanvasW) * 0.5;
		ty = 0;
	}
	g.translate(tx, ty);
	g.scale(s, s);
	
	// Clip.
	g.beginPath();
	g.moveTo(0, 0);
	g.lineTo(gameCanvasW, 0);
	g.lineTo(gameCanvasW, gameCanvasH);
	g.lineTo(0, gameCanvasH);
	g.clip();
	
	// Set Renderable properties.
	Renderable.prototype.scaleOfAreaToDeviceForFocus = s;
	Renderable.prototype.drawCanvasBoundingBox = xDrawCanvasBoundingBox;
}

function changeCash(x, y, amt, special) {
	if (amt > 0) {
		cashWonThisLevel += amt;
	}
	cashChangeThisLevel += amt;
	var bubble;
	if (!xIndividualCashBubbles) {
		if (special) {
			bubble = new CashBubble(x, y - 20, amt, special);
			particles.push(bubble);
		}
		else {
			bubble = new CashBubble(x, y - 20, amt, true);
		}
	}
	else {
		bubble = new CashBubble(x, y - 20, amt, special);
		particles.push(bubble);
	}
	return bubble
}

function setFont(f /*, color, align */) {
	g.font = (typeof f === "number")
		? "bold " + f + "pt " + fontFace
		: f;
	g.fillStyle = firstdefined(arguments[1], "#000");
	g.textAlign = firstdefined(arguments[2], "left");
}

function setLine(width /*, color, cap */) {
	g.lineWidth = width;
	g.strokeStyle = firstdefined(arguments[1], "#000");
	g.lineCap = firstdefined(arguments[2], "butt");
}

function onKeyPress(e) {
	var k = e.keyCode;
	for (var i = layers.length; 0 <= --i; ) {
		if (layers[i].onKeyPress(k)) {
			e.stopPropagation();
			e.preventDefault();
			break;
		}
	}
}

function onKeyRelease(e) {
	var k = e.keyCode;
	for (var i = layers.length; 0 <= --i; ) {
		if (layers[i].onKeyRelease(k)) {
			e.stopPropagation();
			e.preventDefault();
			break;
		}
	}
}

function animatePhysics() {
	if (xFastPlay) {
		updatePhysics();
		setTimeout(animatePhysics, 0);
	}
	var t = time();
	var dt;
	if (tPrevAnimatePhysics == undefined
		|| (dtPrevAnimatePhysics <= 500 && 500 < dt)) { // Smooth out spikes of lag.
		
		dt = 0;
	}
	else {
		dt = t - tPrevAnimatePhysics;
	}
	dtPrevAnimatePhysics = dt;
	dt = Math.min(Math.max(dt, 0), maxMspfPhysics); // Smooth out extended lag.
	var numTicks = Math.floor(dt / targetMspfPhysics);
	tPrevAnimatePhysics = t - dt % targetMspfPhysics;
	forNum(numTicks, updatePhysics);
	t = Math.max(0, targetMspfPhysics - Math.max(0, (dt % targetMspfPhysics) - (time() - t)));
	setTimeout(animatePhysics, t);
}

function animateGraphics() {
	updateGraphics();
	// setTimeout(function() { animateGraphics(stepRoutine, targetMspfGraphics) });
	requestAnimFrame(animateGraphics, gameCanvas);
}

function updatePhysics() {
	var t = time();
	if (tPrevUpdatePhysics != undefined) {
		tTotalUpdatePhysics += t - tPrevUpdatePhysics;
		frameCountPhysics++;
		if (1000 < tTotalUpdatePhysics) {
			fpsPhysics = 0.5 * (fpsPhysics + frameCountPhysics);
			frameCountPhysics = 0;
			tTotalUpdatePhysics = tTotalUpdatePhysics % 1000;
		}
	}
	tPrevUpdatePhysics = t;
	stepPhysics();
}

function updateGraphics() {
	if (gameCanvas.key == tms)
		return;
	gameCanvas.key = tms;
	var t = time();
	if (tPrevUpdateGraphics != undefined) {
		tTotalUpdateGraphics += t - tPrevUpdateGraphics;
		frameCountGraphics++;
		if (1000 < tTotalUpdateGraphics) {
			fpsGraphics = 0.5 * (fpsGraphics + frameCountGraphics);
			frameCountGraphics = 0;
			tTotalUpdateGraphics = tTotalUpdateGraphics % 1000;
		}
	}
	tPrevUpdateGraphics = t;
	drawGraphics();
}

function stepPhysics() {
	// Timing / slowing.
	dms = targetMspfPhysics;
	var slowFactor = (tms - timeOfAnyHit) / 80;
	if (slowFactor < 1) {
		slowFactor = Math.max(0.05, slowFactor);
		slowAccum -= slowFactor;
		if (slowAccum <= 0) {
			slowAccum += 1;
		}
		else {
			return;
		}
	}
	tms += dms;
	
	// Step layers.
	layers.forEach(function(v) {
		v.step();
	});
}

function drawGraphics() {
	layers.forEach(function (v) {
		g.save();
		g.translate(v.dx, v.dy);
		v.draw();
		g.restore();
	});
	
	// Audio.
	Sound.playall();
}

var setStage1 = function() {
	// Do nothing.
};

var setStage2 = function() {
	var p = randXY();
	var g = new GiftEgg(p[0], p[1]);
	gobs.push(g);
	perms.push(g);
}

var setStage3 = function() {
	var p = randXY();
	var g = new ElectricEgg(p[0], p[1]);
	gobs.push(g);
	perms.push(g);
}

var setStage4 = function() {
	var p = randXY();
	var g = new MainEgg(p[0], p[1]);
	gobs.push(g);
	perms.push(g);
}

var setStage5 = function() {
	var p = randXY();
	var g = new MainEgg(p[0], p[1]);
	gobs.push(g);
	perms.push(g);
}

var setStage6 = function() {
	var p = randXY();
	var g = new MainEgg(p[0], p[1]);
	gobs.push(g);
	perms.push(g);
}

var stages = (function() {
	var stages = table([
		['level',  'medal',     'boss'],
		[0,        "",          setStage1],
		[10,       "Wooden",    setStage2],
		[30,       "Bronze",    setStage3],
		[60,       "Silver",    setStage4],
		[100,      "Gold",      setStage5],
		[150,      "Platinum",  setStage6],
	]);
	
	forNum(stages.length, function(i) {
		var s = stages[i];
		s.stage = i + 1;
		var next = stages[i + 1];
		s.numLevels = (next != undefined)
			? next.level - s.level
			: -1;
	});
	
	return stages;
})();

function newGame() {
	stage = xJumpToStage;
	perms = [];
	gobs = [];
	particles = [];
	shots = stages[xJumpToStage].level;
	cash = 200;
	isCannonFocused = false;
	totalFuelUsed = 0;
	totalTargetHit = 0;
	totalCashWon = 0;
	cannon = new Cannon();
	trajectory = new Trajectory();
	cannon.fuelStep = Math.floor(fuelSteps * 0.5);
	cannon.fuel = (cannon.fuelStep + 1) * fuelStepn;
	cannon.angleStep = Math.floor(angleSteps * 0.75);
	cannon.angle = Math.PI * (Math.floor(angleSteps / 2) - cannon.angleStep) / angleSteps;
	timeGameStart = time();
	progress = (timeGameStart & 0xffffffff);
	starPower = 0;
	numBigShots = 0;
	hitRun = 0;
	eyeRun = 0;
	eyesTotal = 0;
	slowAccum = 1;
	beginGame();
	isCannonFocused = true;
	changeAngle(4);
	changeFuel(-1);
	isCannonFocused = false;
}

function retryLevel() {
	isCannonFocused = true;
	isShotFired = false;
	shots--;
}

function nextLevel() {
	isCannonFocused = true;
	isShotFired = false;
	gobs = [];
	particles = [];
	var nextStageVal = stages.lastval(function(v) {
		return v['level'] <= shots;
	});
	var nextStage = nextStageVal['stage'];
	firstLevelOfStage = nextStage != stage;
	stage = nextStage;
	if (firstLevelOfStage)
		beginStage()
	else
		beginLevel();
}

var asdf = false;

function beginLevel() {
	// Reset level state.
	gobsReadyToEndLevel = false;
	humanReadyToEndLevel = false;
	askIsHumanReadyToEndLevel = false;
	humanReadyToEndLevel = false;
	showOverHeadDisplay = true;
	cashWonThisLevel = 0;
	cashChangeThisLevel = 0;
	hitsMade = 0;
	eyesMade = 0;
	timeLevelStart = tms;
	timeOfLastFire = undefined;
	
	// Begin new stage.
	if (firstLevelOfStage)
		stages[stage - 1]['boss']();
	
	// Random cannon position.
	cannon.dx = 0;
	if (shots < 10)
		cannon.dy = cannonMinY + 2 * 0.3333 * (cannonMaxY - cannonMinY);
	else
		cannon.dy = cannonMinY + randInt(cannonMaxY - cannonMinY);
	
	// Random gob amounts.
	numSinks = xAlwaysSink ? 1 : 0;
	numTargets = 1;
	numPowerups = xAlwaysShowPowerup ? 1 : 0;
	if (30 <= shots && rand() < 0.16)
		numSinks = (60 <= shots && rand() < 0.165) ? 2 : 1;
	if (10 <= shots && shots < 30 && rand() < 0.35)
		numTargets = 2;
	if (30 <= shots && rand() < 0.16)
		numTargets = (30 <= shots && rand() < 0.155) ? 10 : 3;
	if (10 <= shots && rand() < 0.10)
		numPowerups = 1;
	if (firstLevelOfStage)
		numTargets += stage - 1;
	if (xAlwaysTrajectory)
		starPower = 99999;
	forNum(numSinks, function(i) {
		if (rand() < 0.5)
			numTargets++;
		if (rand() < 0.09)
			numPowerups++;
	});
	if (xPowerupsOverlayTargets) {
		if (numTargets < numPowerups)
			numTargets = numPowerups;
		numTargets -= numPowerups;
	}
	
	// Initialize gobs.
	forNum(numTargets, createTarget);
	// Save single target for tracking over/under shot.
	singleTarget = (shots <= levelRedoMax && numTargets == 1)
		? gobs[gobs.length - 1]
		: null;
	forNum(numPowerups, createPowerup);
	forNum(numSinks, createSink);
	gobs.push(trajectory);
	gobs.push(cannon);
	
	// Refresh perms.
	var liveStill = [];
	perms.forEach(function(v) {
		if (!v.dead) {
			liveStill.push(v);
			gobs.push(v);
		}
	});
	perms = liveStill;
	if (xBrowseLevels) {
		perms = [];
	}
}

function createSink() {
	var p = randXY();
	gobs.push(new Sink(p[0], p[1]));
}

function createTarget() {
	var p = randXY();
	var s = targetSize();
	gobs.push(new Target(p[0], p[1], s.nRings, s.ringWidth));
}

function createPowerup() {
	var p = randXY();
	var s = targetSize();
	var powerup = 1 + randInt(3);
	var gobTar = new Target(p[0], p[1], s.nRings, s.ringWidth)
	var gobPow = new Powerup(p[0], p[1], gobTar.radius, powerup);
	gobPow.targetBuddy = gobTar;
	gobs.push(gobTar);
	gobs.push(gobPow);
}

function randXY() {
	return [
		targetMinX + randInt(targetMaxX - targetMinX),
		targetMinY + randInt(targetMaxY - targetMinY)
	];
}

function targetSize() {
	var sizes = table([
		['level', 'nRings', 'ringWidth'],
		[0,       5,        25],
		[5,       5,        21],
		[10,      4,        21],
		[20,      4,        17.5],
		[30,      3,        15],
		[40,      3,        13],
		[50,      3,        11],
		[60,      2,        11],
		[70,      2,        9.5],
		[80,      2,        8.5],
		[90,      2,        8],
		[100,     1,        8],
		[150,     1,        7.5],
	]);
	var s = sizes.lastval(function(x) {
		return x.level <= shots;
	});
	return { nRings: s.nRings * 2, ringWidth: s.ringWidth * 0.5 };
}

function computeRingCash(i, nRings) {
	return [75,40,  20,15,  10,10,  5,5,  5,5][i];
}

function eyeHitMade(x, y) {
	eyesMade++;
	eyesTotal++;
	eyeRun++;
	var bonus = (eyeRun - 1) * eyeRunBonus;
	if (0 < bonus) {
		changeCash(x, y, bonus, true);
	}
	particles.push(new Explosion(x, y, 5));
}

var Layer = Class.extend({
	step: function() {},
	draw: function() {},
	onKeyPress: function(k) { return false; },
	onKeyRelease: function(k) { return false; }
});

var Gob = Class.extend({
	step: function() { },
	draw: function() { },
	collide: function(that) { }
});

var LayerGame = Layer.extend({
	init: function() {
		this.msCleanup = 0;
		this.dx = 0;
		this.dy = 0;
		
		this.overhead = new Renderable(
			new Bounds(0, 0, gameCanvasW, 30),
			function() {
				// Draw overhead background.
				g.fillStyle = "#000".alpha(0.2);
				g.fillRect(0, 0, gameCanvasW, 30);

				// Draw total bull's eyes.
				setFont(18, "#000", "center");
				g.fillText(shots + " Shots", 100, 23);

				// Draw cash.
				setFont(18);
				g.fillText(cash + "$", 250, 23);
				if (cash <= 0) {
					g.fillStyle = "#d00";
					g.fillText(cash, 250, 23);
				}
				
				// Draw star power.
				if (starPower) {
					g.save();
					g.translate(200, 15);
					g.fillStyle = "#000";
					g.fillCircle(0, 0, 12.5);
					g.fillStyle = "#fc0";
					g.drawStar(0, 0, 12.5, 0);
					g.restore();
				}
			}, this);
		
		this.cashchange = new Renderable(
			new Bounds(0, 0, 100, 32),
			function() {
				var c = cashChangeThisLevel;
				var color = c > 0 ? "#020" : "#200";
				if (false) {
					var d = numDigits(c);
					g.fillStyle = "#000".alpha(0.2);
					g.fillRoundRect(2, 2, 18 + d * 18, 30, 3);
				}
				setFont(18, color);
				setLine(4, "#000", "round");
				g.fillText(withSign(c), 10, 23);
			}, this);
		
		this.fpsimage = new Renderable(
			new Bounds(0, 0, 38, 22),
			function() {
				var fps;
				setFont("8pt " + fontFace);
				fps = Math.round(fpsGraphics);
				g.fillText(fps + " fps", 2, 10);
				fps = Math.round(fpsPhysics);
				g.fillText(fps + " fps", 2, 20);
			}, this);
		
		this.fireagainimage = new Renderable(
			new Bounds(-200, -50, 400, 100),
			function() {
				setFont(14, "#fff", "center");
				setLine(6, "#000", "round");
				g.strokeAndFillText("Fire again", 0, -10)
				g.strokeAndFillText("to continue.", 0, 10);
			}, this);
	},
	
	step: function() {
		if (0 < this.msCleanup) {
			this.msCleanup -= 1000;
			var newParticleList = [];
			particles.forEach(function(v) {
				if (!v.dead)
					newParticleList.push(v);
			});
			particles = newParticleList;
		}
		this.msCleanup += dms;
		
		var drawables = xDontDrawParticles
			? [gobs]
			: [gobs, particles];
		drawables.forEach(function(objectlist) {
			objectlist.forEach(function(v) {
				v.step();
			});
		});
		
		if (isShotFired && !gobsReadyToEndLevel) {
			var ready = true;
			gobs.forEach(function(v) {
				if (v.shotNotEnded)
					ready = false;
			});
			gobsReadyToEndLevel = ready;
		}
		
		var longShotTimeout = 16000;
		askIsHumanReadyToEndLevel = longShotTimeout < tms - timeOfLastFire;
		
		var endLevel;
		if (xShowLevelSummary) {
			endLevel = gobsReadyToEndLevel || humanReadyToEndLevel;
		}
		else {
			askIsHumanReadyToEndLevel = askIsHumanReadyToEndLevel || gobsReadyToEndLevel;
			endLevel = humanReadyToEndLevel;
		}
		
		if (endLevel) {
			if (xLevelRedo && shots <= levelRedoMax && cashWonThisLevel == 0) {
				layers.push(new LayerRetryLevel());
			}
			else {
				totalFuelUsed += fuelCost;
				totalCashWon += cashWonThisLevel;
				if (!hitsMade)
					hitRun = 0;
				if (!eyesMade)
					eyeRun = 0;
				isCannonFocused = false;
				humanReadyToEndLevel = false;
				if (xShowLevelSummary) {
					layers.push(new LayerLevelSummary());
				}
				else {
					finishLevel();
				}
			}
		}
	},
	
	draw: function() {
		// If level is just beginning.
		if (tms - timeLevelStart < 200) {
			this.timeKeyPressLeft = undefined;
			this.timeKeyPressRight = undefined;
			this.timeKeyPressUp = undefined;
			this.timeKeyPressDown = undefined;
		}
		else {
			var pauseBefore = 150;
			if (this.timeKeyPressUp && this.timeKeyPressUp < tms - pauseBefore) {
				changeAngle(2);
				this.timeKeyPressUp += 25;
			}
			if (this.timeKeyPressDown && this.timeKeyPressDown < tms - pauseBefore) {
				changeAngle(-2); 
				this.timeKeyPressDown += 25;
			}
			if (this.timeKeyPressLeft && this.timeKeyPressLeft < tms - pauseBefore) {
				changeFuel(-1);
				this.timeKeyPressLeft += 75;
			}
			if (this.timeKeyPressRight && this.timeKeyPressRight < tms - pauseBefore) {
				changeFuel(1);
				this.timeKeyPressRight += 75;
			}
		}
			
		// Draw background.
		g.fillStyle = "#ddd";
		g.fillRect(0, 0, gameCanvasW, gameCanvasH);
		
		// Draw game objects.
		var x, y;
		[gobs, particles].forEach(function(objectlist) {
			objectlist.forEach(function(v) {
				g.save();
				g.translate(v.dx, v.dy);
				v.draw();
				g.restore();
			});
		});
		
		if (showOverHeadDisplay) {
			this.overhead.key = shots + ',' + cash + ',' + starPower;
			this.overhead.draw(0, 0);
			
			// Draw cash won this level.
			if (isShotFired) {
				this.cashchange.key = cashChangeThisLevel;
				this.cashchange.draw(250, 0);
			}
		}

		// Draw fps.
		if (xShowFps) {
			this.fpsimage.key = fpsPhysics + ',' + fpsGraphics;
			this.fpsimage.draw(0, 0);
		}
		
		// Debug Info.
		if (debuginfo) {
			setFont("20pt " + fontFace);
			g.fillText(0.001 * Math.floor(debuginfo * 1000), 2, 40);
		}
		
		if (askIsHumanReadyToEndLevel) {
			var a = 2 * Math.PI * tms / 3000;
			var radius = 4;
			var p = cart(a, radius);
			this.fireagainimage.draw(160 + p[0], 290 + p[1]);
		}
	},

	onKeyPress: function(k) {
		switch(k) {
		case KeyEvent.DOM_VK_UP:	if (!this.timeKeyPressUp)	{ changeAngle(1);  this.timeKeyPressUp = tms;	} return true;
		case KeyEvent.DOM_VK_DOWN:  if (!this.timeKeyPressDown)  { changeAngle(-1); this.timeKeyPressDown = tms;  } return true;
		case KeyEvent.DOM_VK_LEFT:  if (!this.timeKeyPressLeft)  { changeFuel(-1);  this.timeKeyPressLeft = tms;  } return true;
		case KeyEvent.DOM_VK_RIGHT: if (!this.timeKeyPressRight) { changeFuel(1);	this.timeKeyPressRight = tms; } return true;
		case KeyEvent.DOM_VK_SPACE:
			if (askIsHumanReadyToEndLevel && !humanReadyToEndLevel) {
				humanReadyToEndLevel = true;
			}
			else {
				if (xBrowseLevels) {
					shots++;
					nextLevel();
				}
				else {
					cannon.fire();
				}
			}
			return true;
		}
		return false;
	},

	onKeyRelease: function(k) {
		switch(k) {
		case KeyEvent.DOM_VK_UP:	this.timeKeyPressUp = undefined; return true;
		case KeyEvent.DOM_VK_DOWN:  this.timeKeyPressDown = undefined; return true;
		case KeyEvent.DOM_VK_LEFT:  this.timeKeyPressLeft = undefined; return true;
		case KeyEvent.DOM_VK_RIGHT: this.timeKeyPressRight = undefined; return true;
		}
		return false;
	}
});

function finishLevel() {
	cash += cashChangeThisLevel;
	if (0 < cash || xInvincible) {
		nextLevel();
	}
	else {
		gameOver();
	}
}

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
		if (timePlayAdjustSound == undefined || 100 < time() - timePlayAdjustSound) {
			timePlayAdjustSound = time();
			Sound.push("adjustangle");
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
		cannon.fuel = (next + 1) * fuelStepn;
		Sound.push("adjustpower");
	}
}

var Cannon = Gob.extend({
	init: function(dxi, dyi) {
		this.dx = dxi;
		this.dy = dyi;
		
		this.image = new Renderable(
			new Bounds(0, -25, 50, 65),
			function() {
				// Draw cannon.
				setLine(4, "#555");
				g.strokeCircle(0, 0, 9.5);
				g.save();
				g.rotate(this.angle);
				g.fillStyle = "#000";
				g.fillRect(-9.5, -4, 23.5, 8);
				g.fillRoundRect(12.5, -6.5, 9, 13, 3);
				g.restore();
				g.fillStyle = "#555";
				g.fillCircle(0, 0, 2.5);
				
				// Draw fuel.
				g.lineWidth = 1.25;
				setLine(1.25);
				g.translate(2, 23);
				forNum(fuelSteps, function(i) {
					g.strokeStyle = (i <= this.fuelStep)
						? "#000"
						: "#fff";
					var sx = 2.25
					var sy = 0.75
					g.strokeLine(i * sx, 0, 0, (i + 1) * -sy);
				}, this);
				setFont(10);
				g.fillText(this.fuel, 0, 12);
			}, this);
	},

	draw: function() {
		this.image.key = this.angle + ',' + this.fuel;
		this.image.draw(0, 0);
	},
	
	fire: function() {
		if (!xMultipleShots && isShotFired)
			return;
		isShotFired = true;
		gobsReadyToEndLevel = false;
		if (starPower)
			starPower--;
		shots++;
		fuelCost = cannon.fuel;
		var z = computeShotZeroState();
		var shotPower = numBigShots ? 1 : 0;
		var shot = new Shot(z.dx, z.dy, z.vx, z.vy, shotPower);
		if (numBigShots)
			numBigShots--;
		progress = ((progress * 485207) & 0xffffffff) ^ 385179316;
		// Put shot before cannon and after targets.
		gobs.remove(cannon);
		gobs.push(shot);
		gobs.push(cannon);
		Sound.push("firecannon2");
		timeOfLastFire = tms;
		var bx = cannon.dx + 23;
		var by = cannon.dy + 52;
		changeCash(bx, by, -fuelCost, true);
		changeCash(bx, by + 25, -shotCost, true);
	}
});

function computeShotZeroState() {
	var power = (0.06 + Math.pow(100 * cannon.fuel / fuelMax, 0.9) * 0.0084) * physics;
	var angle = cannon.angle;
	var lead = 20;
	var p = cart(angle);
	return {
		dx: cannon.dx + lead * p[0],
		dy: cannon.dy + lead * p[1],
		vx: power * p[0],
		vy: power * p[1]
	};
}

var Shot = Gob.extend({
	init: function(dxi, dyi, vxi, vyi, power) {
		this.dxPrev = dxi;
		this.dyPrev = dyi;
		this.dx = dxi;
		this.dy = dyi;
		this.vx = vxi;
		this.vy = vyi;
		this.sunk = false;
		this.timeStuck = undefined;
		this.timeFallenFromVision = undefined;
		this.timeCreated = tms;
		this.mass = 1;
		this.radius = power ? bigShotRadius: shotRadius;
		this.shotNotEnded = true;
		this.power = power;
	},

	step: function() {
		this.dxPrev = this.dx;
		this.dyPrev = this.dy;
		this.dx += this.vx * dms;
		this.dy += (this.vy + gravity * dms * 0.5) * dms;
		this.vy += gravity * dms;
		
		// Check for shot out of bounds.
		var edgeLimit = this.radius + 105;
		if (isFallenFromVision(this, edgeLimit)) {
			if (this.timeFallenFromVision == undefined)
				this.timeFallenFromVision = tms;
		}
		else {
			this.timeFallenFromVision = undefined;
		}
		
		// Check all conditions for end of level.
		var outOfBoundsTime = numSinks ? 2000 : 500;
		var stuckShotTimeout = 2500;
		var levelOver = false;
		levelOver = levelOver || (this.timeStuck != undefined) && (stuckShotTimeout < tms - this.timeStuck);
		levelOver = levelOver || (this.timeFallenFromVision != undefined) && (outOfBoundsTime < tms - this.timeFallenFromVision);
		if (levelOver) {
			gobs.remove(this);
		}
				
		// Collide with all game objects.
		var shot = this;
		gobs.forEach(function(v) {
			v.collide(shot);
		});
	},

	draw: function() {
		if (1500 < tms - this.timeStuck) {
			if (!this.sunk)
				Sound.push("sink");
			this.sunk = true;
		}
		
		if (this.sunk)
			return;
		
		var color = this.power ? "#340" : "#000";
		var radius = this.radius ? this.radius : 1.0;
		
		if (this.timeStuck != undefined) {
			var delta = ((tms - this.timeStuck) / 1750);
			color = color.shiftColor("#f00", delta);
			radius = this.radius * (1 - delta * 0.2) + (this.radius * 0.2 * (rand() - 0.5));
		}
		
		// Glow.
		var c = "#860";
		var r = radius + 20;
		var grad = g.createRadialGradient(0, 0, 0, 0, 0, r);
		grad.addColorStop(0.0, c.alpha(0.8));
		grad.addColorStop(0.05, c.alpha(0.65));
		grad.addColorStop(0.12, c.alpha(0.5));
		grad.addColorStop(0.25, c.alpha(0.35));
		grad.addColorStop(0.5, c.alpha(0.2));
		grad.addColorStop(1.0, c.alpha(0.05));
		g.fillStyle = grad;
		g.fillCircle(0, 0, r);
		
		// Ball.
		g.fillStyle = color;
		g.fillCircle(0, 0, radius);
		
		// Shine.
		g.fillStyle = "#fff";
		g.fillCircle(-radius * 0.4, -radius * 0.4, radius * 0.2);
	},
	
	scoring: function() {
		return 1;
	}
});

var Target = Gob.extend({
	init: function(dxi, dyi, nRings, ringWidth) {
		this.crosshairs = false;
		this.dx = dxi;
		this.dy = dyi;
		this.ringWidth = ringWidth;
		this.radius = ringWidth * (nRings - 0.5);
		this.hit = false;
		this.rings = [];
		forNum(nRings, function(i) {
			this.rings.push(new Ring());
		}, this);
		this.popTime = xBrowseLevels ? 0 : tms + rand() * 800;
		this.popSoundYet = false;
	},

	draw: function() {
		// Initial appearance: pop sound / scaling
		var pop = (tms - this.popTime) / targetPopTime;
		if (pop <= 0)
			return;
		if (pop < 1) {
			if (!this.popSoundYet) {
				Sound.push("targetpop");
				this.popSoundYet = true;
			}
			pop = 1 - (1 - pop) * (1 - pop);
			g.scale(pop, pop);
		}
		
		// Draw rings.
		for (var i = this.rings.length; i-- > 0; ) {
			this.rings[i].draw(i, this.ringWidth);
		}
		
		// Draw crosshairs.
		if (this.crosshairs) {
			if (this.rings[0].timeHit == undefined) {
				g.save();
				g.rotate(Math.PI * 0.25);
				var w = 2;
				var h = 20;
				g.fillStyle = "#000";
				g.fillPolygon([
					[1, 0],
					[h, w],
					[h, -w]
				]);
				g.fillPolygon([
					[0, 1],
					[w, h],
					[-w, h]
				]);
				g.fillPolygon([
					[-1, 0],
					[-h, w],
					[-h, -w]
				]);
				g.fillPolygon([
					[0, -1],
					[w, -h],
					[-w, -h]
				]);
				g.restore();
			}
		}
	},

	collide: function(shot) {
		if (!shot.scoring())
			return;
	
		var x0 = shot.dxPrev;
		var y0 = shot.dyPrev;
		var x1 = shot.dx;
		var y1 = shot.dy;
		var dx = this.dx;
		var dy = this.dy;
		var dSqrd = sqrPointSeg(dx, dy, x0, y0, x1, y1);

		var maxRadius = shot.radius + this.radius;
		if (dSqrd <= maxRadius*maxRadius) {
			if (!this.hit) {
				this.hit = true;
				hitsMade++;
				totalTargetHit++;
				hitRun++;
			}
			var d = Math.sqrt(dSqrd);
			this.rings.forEach(function(v, i) {
				if (v.collide(shot, i, this.ringWidth, d)) {
					timeOfAnyHit = tms;
					var loot = computeRingCash(i, undefined);
					var bub = changeCash(shot.dx, shot.dy, loot, false);
					if (!xIndividualCashBubbles) {
						if (this.bubble) {
							this.bubble.amount += bub.amount;
						}
						else {
							this.bubble = bub;
							particles.push(bub);
						}
					}
					
					if (i == 0) {
						eyeHitMade(this.dx, this.dy);
						Sound.push("G4");
					}
					else if (i == 2) {
						Sound.push("D4");
					}
					else if (i == 4) {
						Sound.push("B4");
					}
					else if (i == 6) {
						Sound.push("G3");
					}
					else if (i == 8) {
						Sound.push("D3");
					}
				}
			}, this);
		}
		
		if (this == singleTarget) {
			if (shot.dxPrev < this.dx && this.dx <= shot.dx) {
				didOverShoot = (shot.dy < this.dy);
			}
		}
	}
});

var Ring = Gob.extend({
	init: function() {
		this.timeHit = undefined;
	},
	
	draw: function(number, ringWidth) {
		var FADE_TIME = 900;
		var overlap = 1.5;
		var outline = ringWidth * 0.13 + 0.5;
		if (this.timeHit == undefined) {
			setLine(ringWidth + overlap - outline * 0.5, targetcolors[Math.floor(number / 2)]);
			g.strokeCircle(0, 0, ringWidth * number - overlap * 0.5 - outline * 0.25);
			setLine(outline, "#000");
			g.strokeCircle(0, 0, ringWidth * (number + 0.5) - outline * 0.5);
		}
		else if (tms - this.timeHit < FADE_TIME) {
			var alpha = 1.0 - ((tms - this.timeHit) / FADE_TIME);
			setLine(ringWidth + overlap, "#fff".alpha(alpha));
			g.strokeCircle(0, 0, ringWidth * number - overlap * 0.5);
		}
		else {
			return; // Ring is destroyed and finished animating.
		}
	},
	
	collide: function(shot, number, ringWidth, d) {
		if (this.timeHit == undefined) {
			if (d - shot.radius <= (number + 0.5) * ringWidth) {
				this.timeHit = tms;
				return true;
			}
		}
		return false;
	}
});

function boundsCheck(gob, radius) {
	return {
		dx: (gob.dx < -radius) 
			? (radius + gob.dx) 
			: ((gameCanvasW + radius < gob.dx)
				? gob.dx - gameCanvasW - radius
				: 0),
		dy: (gob.dy < -radius) 
			? (radius + gob.dy) 
			: ((gameCanvasH + radius < gob.dy)
				? gob.dy - gameCanvasH - radius
				: 0)
	};
}

function isFallenFromVision(gob, safetyMargin) {
	var outby = boundsCheck(gob, safetyMargin);
	return outby.dx != 0 || 0 < outby.dy;
}

var Powerup = Gob.extend({
	init: function(dxi, dyi, radius, power) {
		this.dx = dxi;
		this.dy = dyi;
		this.radius = radius;
		if (shots == 0) {
			power = xAlwaysShowPowerup;
		}
		this.power = power;
		this.hit = false;
		this.extra = 
			  power == 1 ? new PowerupStar(this)
			: power == 2 ? new PowerupEyeSet(this)
			: power == 3 ? new PowerupBigSet(this)
			: null;
		
		var spacing = radius * 1.25;
		this.glassball = new Renderable(
			new Bounds(-spacing, -spacing, 2 * spacing, 2 * spacing),
			function() {
				g.drawGlassBall(0, 0, this.radius, "#000".alpha(0.2));
			}, this);
	},

	step: function() {
		if (this.extra) {
			this.extra.step();
		}
	},

	draw: function() {
		if (this.hit)
			return;
	
		var pop = (tms - this.targetBuddy.popTime) / targetPopTime;
		
		if (pop <= 0)
			return;
		
		if (pop < 1) {
			pop = 1 - (1 - pop) * (1 - pop);
			g.scale(pop, pop);
		}
		
		var color = (this.power == 1) ? "#fc0" : "#0f4";

		var minRadius = 2.6;
		
		// Draw crosshairs.
		if (this.radius < minRadius) {
			var w = minRadius * 2;
			setLine(minRadius, color);
			g.strokeLine(-w, 0, 1.5 * -w, 0);
			g.strokeLine(w, 0, 1.5 * w, 0);
			g.strokeLine(0, -w, 0, 1.5 * -w);
			g.strokeLine(0, w, 0, 1.5 * w);
		}
		
		// Draw power up goodie.
		if (this.extra) {
			this.extra.draw(0, 0);
		}
		
		this.glassball.draw(0, 0);
	},

	collide: function(shot) {
		if (!shot.scoring())
			return;
	
		var x0 = shot.dxPrev;
		var y0 = shot.dyPrev;
		var x1 = shot.dx;
		var y1 = shot.dy;
		var dx = this.dx;
		var dy = this.dy;
		var dSqrd = sqrPointSeg(dx, dy, x0, y0, x1, y1);

		var maxRadius = shot.radius + this.radius;
		if (dSqrd <= maxRadius*maxRadius) {
			// Slow the game for drama.
			if (!this.hit) {
				timeOfAnyHit = tms;
				this.hit = true;
				this.extra.pickup();
				Sound.push("powerup");
				this.extra = null;
			}
		}
	}
});

var PowerupStar = Gob.extend({
	init: function(parent) {
		this.parent = parent;
		this.radius = parent.radius;
		this.ad = 0;
		this.av = 0.0005;
	},
	
	step: function() {
		this.ad += this.av * dms;
	},
	
	draw: function() {
		g.fillStyle = "#fc0";
		g.drawStar(0, 0, this.radius, this.ad);
	},
	
	pickup: function() {
		starPower += starPowerLevels;
	}
});

var PowerupEyeSet = Gob.extend({
	init: function(parent) {
		this.parent = parent;
		this.radius = parent.radius;
		this.eyes = [];
		forNum(eyePowerNumEyes, function() {
			this.eyes.push(new PowerupEye(this));
		}, this);
	},
	
	step: function() {
		this.eyes.forEach(function(v) {
			v.step();
		});
	},
	
	draw: function() {
		this.eyes.forEach(function(v) {
			v.draw();
		});
	},
	
	pickup: function() {
		this.eyes.forEach(function(v) {
			v.pickup();
		});
	}
});

var PowerupEye = Gob.extend({
	init: function(parent) {
		// new Target(p[0], p[1], s.nRings, s.ringWidth)
		this.parent = parent;
		var s = targetSize();
		this.smallR = s.ringWidth / 2;
		var radius = parent.radius;
		this.bigR = radius;
		var rs = this.bigR - this.smallR;
		var mag = radius * Math.sqrt(rand());
		var ang = rand() * Math.PI * 2;
		var p = cart(ang, mag);
		this.dx = p[0];
		this.dy = p[1];
		mag = (2 + rand()) * 0.05 * (radius / 75);
		ang = rand() * Math.PI * 2;
		p = cart(ang, mag);
		this.vx = p[0];
		this.vy = p[1];
		this.ring = new Ring();
	},
	
	step: function() {
		this.dx += this.vx * dms;
		this.dy += this.vy * dms;
		var rs = this.bigR - this.smallR;
		var d = sqr(this.dx, this.dy);
		if (rs * rs < d) {
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
	},
	
	draw: function() {
		g.save();
		g.translate(this.dx, this.dy);
		this.ring.draw(0, this.smallR);
		g.restore();
	},
	
	pickup: function() {
		var x = this.dx + this.parent.parent.dx;
		var y = this.dy + this.parent.parent.dy;
		if (xEyeSetScoreImmediate) {
			this.ring.timeHit = tms;
			eyeHitMade(x, y);
		}
	}
});

var PowerupBigSet = Gob.extend({
	init: function(parent) {
		this.parent = parent;
		this.radius = parent.radius;
		this.shots = [];
		forNum(bigPowerNumShots, function() {
			this.shots.push(new PowerupBig(this));
		}, this);
	},
	
	step: function() {
		this.shots.forEach(function(v) {
			v.step();
		});
	},
	
	draw: function() {
		this.shots.forEach(function(v) {
			v.draw();
		});
	},
	
	pickup: function() {
		this.shots.forEach(function(v) {
			v.pickup();
		});
	}
});

var PowerupBig = Gob.extend({
	init: function(parent) {
		this.parent = parent;
		this.smallR = bigShotRadius;
		var radius = parent.radius;
		this.bigR = radius;
		var rs = this.bigR - this.smallR;
		var mag = radius * Math.sqrt(rand());
		var ang = rand() * Math.PI * 2;
		var p = cart(ang, mag);
		this.dx = p[0];
		this.dy = p[1];
		mag = (1 + rand()) * 0.05 * (radius / 75);
		ang = rand() * Math.PI * 2;
		p = cart(ang, mag);
		this.vx = p[0];
		this.vy = p[1];
		this.shot = new Shot(0, 0, 0, 0, 1);
	},
	
	step: function() {
		this.dx += this.vx * dms;
		this.dy += this.vy * dms;
		var rs = this.bigR - this.smallR;
		var d = sqr(this.dx, this.dy);
		if (rs * rs < d) {
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
	},
	
	draw: function() {
		g.save();
		g.translate(this.dx, this.dy);
		this.shot.draw();
		g.restore();
	},
	
	pickup: function() {
		numBigShots++;
	}
});

var Explosion = Gob.extend({
	init: function(dx, dy, streamers) {
		this.dx = dx;
		this.dy = dy;
		this.timeStart = tms;
		var angle = rand() * Math.PI * 2;
		forNum(streamers, function(i) {
			particles.push(new Streamer(dx, dy, angle));
			angle += Math.PI * 2 / streamers;
		});
	},
	
	draw: function() {
		var age = tms - this.timeStart;

		// Draw ring of smoke.
		if (false && age) {
			var ringRadius = age * 0.13;
			var width = 30;
			if (ringRadius <= width * 0.5)
				width = ringRadius * 2;
			var start = ringRadius - width * 0.5;
			var finish = ringRadius + width * 0.5;
			var grad = g.createRadialGradient(0, 0, start, 0, 0, finish);
			var alpha = 1 / (1 + age * 0.005);
			var c = "#000".alpha(alpha);
			grad.addColorStop(0.0, c.alpha(0.0));
			grad.addColorStop(0.1, c.alpha(0.04));
			grad.addColorStop(0.3, c.alpha(0.1));
			grad.addColorStop(0.5, c.alpha(0.4));
			grad.addColorStop(0.7, c.alpha(0.1));
			grad.addColorStop(0.9, c.alpha(0.04));
			grad.addColorStop(1.0, c.alpha(0.0));
			setLine(width, grad);
			g.strokeCircle(0, 0, ringRadius);
		}
	}
});

var streamerWidth = 6;
var streamerLength = Math.floor(275 / targetMspfPhysics);

var Streamer = Gob.extend({
	init: function(dx, dy, angle) {
		this.dx = dx;
		this.dy = dy;
		var mag = (1 + rand()) * 0.12 * physics;
		var p = cart(angle, mag);
		this.vx = p[0];
		this.vy = p[1];
		this.ang1da = rand() * Math.PI * 2;
		this.ang1va = (rand() - 0.5) * Math.PI * 0.034 * physics;
		this.ang1r = rand() * 0.4 * physics;
		this.color = hue(rand());
		this.points = [];
		this.points.push([this.dx, this.dy]);
		this.dead = false;
		this.msSparks = 0;
		
		this.segmentColors = [];
		var cTail = "#fff";
		forNum(streamerLength, function(i) {
			var alpha = i / streamerLength;
			this.segmentColors[i] = this.color.shiftColor(cTail, 1 - alpha).alpha(alpha);
		}, this);
	},
	
	step: function() {
		if (this.dead)
			return;
		
		// Step streamer.
		this.dx += this.vx * dms;
		this.dy += (this.vy + gravity * dms * 0.5) * dms;
		this.vy += gravity * dms;
		this.ang1da += this.ang1va * dms;
		var p = cart(this.ang1da, dms * this.ang1r);
		this.dx += p[0];
		this.dy += p[1];
		if (streamerLength <= this.points.length)
			this.points.shift();
		this.points.push([this.dx, this.dy]);
		
		// Check bounds - death conditions.
		this.dead = isFallenFromVision(this, 30);
		
		// Step sparks.
		while (0 < this.msSparks) {
			this.msSparks -= 25;
			particles.push(new Spark(this.dx, this.dy, this.color));
		}
		this.msSparks += dms;
	},
	
	draw: function() {
		if (this.dead)
			return;
		
		// Draw streamer.
		g.save();
		g.translate(-this.dx, -this.dy);
		var prev = this.points[0];
		var len = this.points.length;
		if (1 < len) {
			setLine(streamerWidth, "#000", "round");
			this.points.forEach(function(v, i) {
				g.strokeStyle = this.segmentColors[i];
				g.strokeLine(prev[0], prev[1], v[0] - prev[0], v[1] - prev[1]);
				prev = v;
			}, this);
		}
		g.restore();
	}
});

var sparkRadius = 1.5;
var sparkLifetime = 1500;

var Spark = Gob.extend({
	init: function(x, y, color) {
		this.dx = x;
		this.dy = y;
		var mag = (1 + rand()) * 0.045 * physics;
		var ang = rand() * Math.PI * 2;
		var p = cart(ang, mag);
		this.vx = p[0];
		this.vy = p[1];
		this.timeCreated = tms;
		this.color = color;
		this.dead = false;
	},
	
	step: function() {
		this.dx += this.vx * dms;
		this.dy += (this.vy + gravity * dms * 0.5) * dms;
		this.vy += gravity * dms;
	},
	
	draw: function() {
		var alpha = 1 - ((tms - this.timeCreated) / sparkLifetime);
		if (0.1 < alpha) {
			g.fillStyle = this.color;
			g.globalAlpha = alpha;
			g.fillCircle(0, 0, sparkRadius);
		}
		else {
			this.dead = true;
		}
	}
});

var CashBubble = Gob.extend({
	init: function(dxi, dyi, amount, special) {
		this.dx = dxi;
		this.dy = dyi;
		this.timeCashGiven = tms;
		this.amount = amount;
		this.special = special;
		
		var bounds = (this.special)
			? new Bounds(-40, -20, 80, 25)
			: new Bounds(-17, -12, 34, 13);
		this.textimage = new Renderable(
			bounds,
			function() {
				if (this.special) {
					var color = this.amount > 0 ? "#0d0" : "#d00";
					setFont(18, color, "center");
					setLine(5, "#000", "round");
					g.strokeAndFillText(withSign(this.amount), 0, 0);
				}
				else {
					setFont(12, "#000", "center");
					setLine(5, "#000", "round");
					g.fillText(withSign(this.amount), 0, 0);
				}
			}, this);
	},

	draw: function() {
		var dt = tms - this.timeCashGiven;
		var totalTime = 5000.0;
		var fadeTime = 2000.0;
		var opaqueTime = totalTime - fadeTime;
		if (dt < totalTime || !xFadeOutCashBubbles) {
			var alpha = Math.min(1.0, 1.0 - (dt - opaqueTime) / fadeTime);
			var oy = Math.min(1.0, dt / 500.0);
			if (xFadeOutCashBubbles)
				g.globalAlpha = alpha;
			this.textimage.key = this.amount;
			this.textimage.draw(0, -sign(this.amount) * (12 + oy * 22));
		}
	}
});

var Sink = Gob.extend({
	init: function(dxi, dyi) {
		this.dx = dxi;
		this.dy = dyi;
		this.color = "#000";
		this.msSparks = 0;
		
		// Get the sparks flying so that it shows up right away.
		var preanimate = false;
		if (preanimate) {
			var backupDms = dms;
			dms = 35;
			var steps = 1000 / dms;
			tms -= dms * steps;
			forNum(steps, function(i) {
				tms += dms;
				this.step();
			}, this);
			dms = backupDms;
		}
	},

	step: function() {
		// Step sparks.
		while (0 < this.msSparks) {
			this.msSparks -= 25;
			particles.push(new SinkSpark(this.dx, this.dy, this.color));
		}
		this.msSparks += dms;
	},

	draw: function() {
		var c = "#000";
		var grad = g.createRadialGradient(0, 0, 0, 0, 0, 160);
		grad.addColorStop(0.0, c.alpha(0.4));
		grad.addColorStop(0.05, c.alpha(0.3));
		grad.addColorStop(0.12, c.alpha(0.2));
		grad.addColorStop(0.25, c.alpha(0.1));
		grad.addColorStop(0.5, c.alpha(0.05));
		grad.addColorStop(1.0, c.alpha(0.0));
		g.fillStyle = grad;
		g.fillCircle(0, 0, 160);
		g.fillStyle = c.alpha(0.5);
		g.fillCircle(0, 0, 1);
	},

	collide: function(shot) {
		// Check for outright collision.
		var x0 = shot.dxPrev;
		var y0 = shot.dyPrev;
		var x1 = shot.dx;
		var y1 = shot.dy;
		var dx = this.dx;
		var dy = this.dy;
		var dSqrd = sqrPointSeg(dx, dy, x0, y0, x1, y1);
		var maxRadius = shot.radius * 0.75;
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
		var den = Math.pow(d, 1.6);
		if (den != 0) {
			var force = dms * (10.0 / den) * physics * physics;
			var fx = force * ox / d;
			var fy = force * oy / d;
			shot.vx += fx;
			shot.vy += fy;
		}
	}
});

var SinkSpark = Gob.extend({
	init: function(x, y, color) {
		this.isRing = rand() < 0.02;
		this.dx = x;
		this.dy = y;
		var mag = (1.0 + rand()) * 85;
		var ang = rand() * Math.PI * 2;
		var p = cart(ang, mag);
		this.ox = p[0];
		this.oy = p[1];
		this.timeCreated = tms;
		this.color = color;
		this.dead = false;
		this.oxPrev = this.ox;
		this.oyPrev = this.oy;
	},
	
	step: function() {
		if (this.dead)
			return;
		var d = mag(this.ox, this.oy);
		var f = d * d;
		if (f == 0) {
			this.dead = true;
			return;
		}
		f = 5.5 * dms / f;
		this.oxPrev = this.ox;
		this.oyPrev = this.oy;
		this.ox += -this.ox * f;
		this.oy += -this.oy * f;
		if (sign(this.oxPrev) != sign(this.ox))
			this.ox = 0;
		if (sign(this.oyPrev) != sign(this.oy))
			this.oy = 0;
	},
	
	draw: function() {
		if (this.dead)
			return;
		var alpha = ((tms - this.timeCreated) / 2000);
		if (0.1 < alpha) {
			if (this.isRing) {
				var d = mag(this.ox, this.oy);
				alpha = ((tms - this.timeCreated) / 8000) * Math.min(1.0, d / 100);
				g.globalAlpha = alpha;
				setLine(mag(this.oxPrev - this.ox, this.oyPrev - this.oy), this.color);
				g.strokeCircle(0, 0, mag(this.ox, this.oy));
			}
			else {
				g.globalAlpha = alpha;
				setLine(1.7, this.color);
				g.strokeLine(this.oxPrev, this.oyPrev, this.ox - this.oxPrev, this.oy - this.oyPrev);
			}
		}
	}
});

var ticksPerDash = Math.floor(55 / targetMspfPhysics);

var Trajectory = Gob.extend({
	init: function() {
		// To get it translated correctly as all gobs are before draw() is called.
		this.dx = 0;
		this.dy = 0;
	},

	draw: function() {
		if (!starPower)
			return;
		
		// Initialize member variables for collision detection to work.
		var z = computeShotZeroState();
		this.dx = z.dx;
		this.dy = z.dy;
		this.vx = z.vx;
		this.vy = z.vy;
		this.timeStuck = undefined;
		
		// Draw.
		g.beginPath();
		g.moveTo(this.dx, this.dy);
		setLine(1, "#720");
		var backupDms = dms;
		dms = targetMspfPhysics;
		var drawDashPrev = true;
		var drawDash = true;
		var iters = 0;
		var distTraveled = 0;
		var ddx, ddy;
		var distLimit = 3000
		var ticksTraveled = 0;
		while (true) {
			ddx = this.vx * dms;
			ddy = (this.vy + gravity * dms * 0.5) * dms;
			this.dx += ddx;
			this.dy += ddy;
			this.vy += gravity * dms;
			if (drawDash != drawDashPrev) {
				if (drawDash)
					g.lineTo(this.dx, this.dy);
				else
					g.moveTo(this.dx, this.dy);
			}
			distTraveled += mag(ddx, ddy);
			ticksTraveled++;
			drawDashPrev = drawDash;
			if (ticksTraveled % ticksPerDash == 0) {
				drawDash = !drawDash;
			}
			
			// Check bounds - end of shot conditions.
			if (distLimit < distTraveled)
				break;
			if (isFallenFromVision(this, 20 + shotRadius))
				break;
			
			// Collide with all game objects.
			var shot = this;
			gobs.forEach(function(v) {
				v.collide(shot);
			});
			iters++;
		}
		g.stroke();
		dms = backupDms;
		
		// To get it translated correctly as all gobs are before draw() is called:
		this.dx = 0;
		this.dy = 0;
	},
	
	scoring: function() {
		return false;
	}
});

var Egg = Gob.extend({
	init: function(dxi, dyi, gob) {
		this.dx = dxi;
		this.dy = dyi;
		this.vx = 0;
		this.vy = 0;
		this.angle = 5;
		this.vangle = 0;
		this.gob = gob;
		this.ellipseA = this.gob.radius * 1.0;
		this.ellipseB = this.gob.radius * 1.4;
		this.spinability = 0.06;
		this.linearFriction = 0.015 * physics * physics;
		this.angularFriction = 0.001 * physics * physics;
		this.hit = 0;
		this.mass = 0;
		this.bounce = 10;
	},

	step: function() {
		this.moving = false;
		
		if (this.vx != 0 && this.vy != 0) {
			this.moving = true;
			var vxPrev = this.vx;
			var vyPrev = this.vy;
			var sSqrd = this.vx * this.vx + this.vy * this.vy;
			var sLimit = this.linearFriction;
			if (sSqrd > sLimit * sLimit) {
				var s = Math.sqrt(sSqrd);
				this.vx -= vxPrev * sLimit / s;
				this.vy -= vyPrev * sLimit / s;
			}
			else {
				this.vx = 0;
				this.vy = 0;
			}
			this.dx += (this.vx + vxPrev) * 0.5;
			this.dy += (this.vy + vyPrev) * 0.5;
			
			// Collide with screen bounds.
			var outby = boundsCheck(this, -this.gob.radius);
			if (outby.dx != 0) {
				this.vx = -this.vx;
				this.dx -= outby.dx;
			}
			if (outby.dy != 0) {
				this.vy = -this.vy;
				this.dy -= outby.dy;
			}
		}
		
		if (this.vangle != 0) {
			this.moving = true;
			var vaPrev = this.vangle;
			var afriction = this.angularFriction;
			if (Math.abs(this.vangle) > afriction) {
				this.vangle -= sign(this.vangle) * afriction;
			}
			else {
				this.vangle = 0;
			}
			this.angle += (this.vangle + vaPrev) * 0.5;
		}
	},

	draw: function() {
		g.drawEgg(0, 0, this.ellipseA, this.ellipseB, this.gob.color, this.angle);
		g.save();
		g.rotate(this.angle);
		if (this.drawseg != undefined) {
			var seg = this.drawseg;
			g.strokeStyle = '#f00';
			g.strokeLine(seg[0][0], seg[0][1], seg[1][0] - seg[0][0], seg[1][1] - seg[0][1]);
		}
		g.restore();
	},

	collide: function(shot) {
		if (!(shot instanceof Shot))
			return;
		
		if (shot.egglog == undefined)
			shot.egglog = [];
		if (shot.egglog[shots])
			return;
		
		var x0 = shot.dx;
		var y0 = shot.dy;
		var x1 = shot.dxPrev;
		var y1 = shot.dyPrev;
		var tx = this.dx;
		var ty = this.dy;
		var ea = this.ellipseA;
		var eb = this.ellipseB;
		
		var ps = [[x0, y0]];
		translate(ps, -tx, -ty);
		rotate(ps, -this.angle);
		x0 = ps[0][0];
		y0 = ps[0][1];
		var seg = segEllipsePoint(ea, eb, x0, y0);
		
		// Check for hit.
		var dx = seg[0][0] - seg[1][0];
		var dy = seg[0][1] - seg[1][1];
		var dsqrd = sqr(dx, dy);
		var sr = shot.radius;
		//                  dist from shot to origin  < dist from ellipse wall to origin
		var isPointInside = sqr(seg[1][0], seg[1][1]) < sqr(seg[0][0], seg[0][1]);
		if (dsqrd > sr * sr && !isPointInside) {
			return;
		}
		else {
			// Record hit.
			if (!shot.egglog[shots])
				this.hit++;
			else
				return;
			shot.egglog[shots] = true;
			Sound.push(this.gob.sound);
		}
		
		// Compute normal.
		var ex = seg[0][0];
		var ey = seg[0][1];
		var sig = sign(seg[1][1]);
		var m = -sig * eb / (ea * ea) * ex / Math.sqrt(1 - ex * ex / (ea * ea));
		var p = normal(-m, 1);
		var nx = sig * p[0];
		var ny = sig * p[1];
		
		// Move shot to no longer overlap.
		// Push back by seg mag minus shot radius.
		if (true) {
			var d = Math.sqrt(dsqrd);
			var sd = d * (isPointInside ? -1 : 1);
			var f = sr - sd + 0.001; // A bit extra to ensure no collision next tick.
			ps = [[f * nx, f * ny]];
			rotate(ps, this.angle);
			shot.dx += ps[0][0];
			shot.dy += ps[0][1];
		}
		
		// Compute momentum transfer.
		// Kudos to http://en.wikipedia.org/wiki/Momentum#Conservation_of_linear_momentum
		var ms = shot.mass;
		var me = this.mass;
		var avgm = (ms + me) * 0.5;
		
		ps = [[shot.vx, shot.vy]];
		rotate(ps, -this.angle);
		var vs = project(ps[0][0], ps[0][1], nx, ny);
		
		ps = [[this.vx, this.vy]];
		rotate(ps, -this.angle);
		var ve = project(ps[0][0], ps[0][1], nx, ny);
		
		var dvx = ve[0] - vs[0];
		var dvy = ve[1] - vs[1];
		
		var dvsx = dvx * me / avgm;
		var dvsy = dvy * me / avgm;
		ps = [[dvsx, dvsy]];
		// this.drawseg = [[ex, ey], [500 * ps[0][0] + ex, 500 * ps[0][1] + ey]];
		rotate(ps, this.angle);
		shot.vx += ps[0][0];
		shot.vy += ps[0][1];
		
		var dvex = -dvx * ms / avgm;
		var dvey = -dvy * ms / avgm;
		
		// Spin egg.
		// Note: Here I assume that eb > ea.
		var dvemag = mag(dvex, dvey);
		var vi1 = intersectLines(ex, ey, ex + nx, ey + ny, 0, 0, 0, 1);
		var amountAngular = Math.abs(vi1[1]) / eb;
		var amountLinear = 1 - amountAngular;
		this.vangle += sign(ex) * sign(ey) * mag(dvex, dvey) * amountAngular * this.spinability * this.bounce;
		
		// Apply remaining force to linear momentum.
		ps = [[dvex * amountLinear, dvey * amountLinear]];
		rotate(ps, this.angle);
		this.vx += ps[0][0] * this.bounce;
		this.vy += ps[0][1] * this.bounce;
	}
});

var GiftEgg = Egg.extend({
	init: function(dxi, dyi) {
		this.radius = 22.5;
		this.color = "#03c";
		this.sound = "hitgiftegg";
		this.hit = false;
		this.egg = new Egg(dxi, dyi, this);
		this.dead = false;
		this.eggsync();
	},
	
	eggsync: function() {
		this.dx = this.egg.dx;
		this.dy = this.egg.dy;
		this.vx = this.egg.vx;
		this.vy = this.egg.vy;
		this.shotNotEnded = this.egg.moving;
	},

	draw: function() {
		if (this.egg.hit == 1)
			return;
		
		this.egg.draw();
	},

	step: function() {
		if (this.egg.hit == 1)
			return;
		
		this.egg.step();
		this.eggsync();
	},

	collide: function(shot) {
		if (this.egg.hit == 1)
			return;
		
		this.egg.collide(shot);
		this.eggsync();
		
		if (this.egg.hit == 1) {
			changeCash(this.dy, this.dy, giftEggBonus, true);
		}
	}
});

var ElectricEgg = Egg.extend({
	init: function(dxi, dyi) {
		this.radius = 45;
		this.color = "#000";
		this.sound = "hitelectricegg";
		this.hit = false;
		this.egg = new Egg(dxi, dyi, this);
		this.eggsync();
		this.dead = false;
		this.wasMoving = false;
	},
	
	eggsync: function() {
		this.dx = this.egg.dx;
		this.dy = this.egg.dy;
		this.vx = this.egg.vx;
		this.vy = this.egg.vy;
		var isMoving = this.egg.vx || this.egg.vy || this.egg.vangle;
		if (this.wasMoving && !isMoving) {
			// Release electric shock.
			
		}
		this.wasMoving = isMoving;
	},

	draw: function() {
		if (this.egg.hit == 3)
			return;
		
		this.egg.draw();
	},

	step: function() {
		if (this.egg.hit == 3)
			return;
		
		this.egg.step();
		this.eggsync();
	},

	collide: function(shot) {
		if (this.egg.hit == 3)
			return;
		
		this.egg.collide(shot);
		this.eggsync();
		
		if (this.egg.hit == 3) {
			changeCash(this.dy, this.dy, giftEggBonus, true);
		}
	}
});

var MainEgg = Egg.extend({
	init: function(dxi, dyi) {
		this.radius = 67.5;
		this.color = "#f40";
		this.sound = "hitmainegg";
		this.hit = false;
		this.egg = new Egg(dxi, dyi, this);
		this.eggsync();
		this.dead = false;
	},
	
	eggsync: function() {
		this.dx = this.egg.dx;
		this.dy = this.egg.dy;
		this.vx = this.egg.vx;
		this.vy = this.egg.vy;
	},

	draw: function() {
		if (this.egg.hit == 3)
			return;
		
		this.egg.draw();
	},

	step: function() {
		if (this.egg.hit == 3)
			return;
		
		this.egg.step();
		this.eggsync();
	},

	collide: function(shot) {
		if (this.egg.hit == 3)
			return;
		
		this.egg.collide(shot);
		this.eggsync();
		
		if (this.egg.hit == 3) {
			changeCash(this.dx, this.dy, giftEggBonus, true);
		}
	}
});

function withSign(n) {
	return (0 < n ? "+" : "") + n
}

function numDigits(n) {
	return n == 0 ? 1 : 1 + Math.floor(Math.log(Math.abs(n)) / Math.LN10);
}

var LayerLevelSummary = Layer.extend({
	init: function() {
		this.shot = -shotCost;
		this.fuel = -fuelCost;
		this.cash = cashWonThisLevel;
		this.net  = cashChangeThisLevel;
		this.timeCreated = time();
		
		var w = 200;
		var h = 250;
		this.dx = (gameCanvasW - w) / 2;
		this.dy = (gameCanvasH - h) / 2;
		
		this.image = new Renderable(
			new Bounds(-6, -6, w + 12, h + 12),
			function() {
				g.drawDialog(0, 0, w, h, "#eb0");
				
				// Stats.
				setFont(22);
				var lh = 34;
				var ox, oy;
				ox = 35; oy = 45;
				g.fillText("shot", ox, oy); oy += lh;
				g.fillText("fuel", ox, oy); oy += lh;
				if (this.cash != 0)
					g.fillText("$", ox, oy); oy += lh;
				ox += w / 2 - 25; oy -= 3 * lh;
				g.fillText(withSign(this.shot), ox, oy); oy += lh;
				g.fillText(withSign(this.fuel), ox, oy); oy += lh;
				if (this.cash != 0)
					g.fillText(withSign(this.cash), ox, oy); oy += lh;
				
				// Bar.
				setLine(4.0, "#000", "round");
				oy -= 18;
				g.strokeLine(35, oy, w - 70, 0);
				
				// Big number.
				setFont(38, "#000", "center");
				ox = w / 2; oy = 208;
				setLine(12, "#000", "round");
				var value = this.net;
				var color = (0 < value) ? "#0c0" : "#c00";
				var amount = Math.min(Math.abs(value) * 0.02, 1.0);
				g.fillStyle = "#fff".shiftColor(color, amount);
				g.strokeAndFillText(withSign(value),  ox, oy);
			}, this);
	},

	draw: function() {
		var alpha = (time() - this.timeCreated) / dialogFadeTime;
		if (alpha < 1) {
			g.globalAlpha = alpha;
		}
		this.image.draw(0, 0);
	},

	onKeyPress: function(k) {
		if (!xNoScreenDelays && time() - this.timeCreated < 200)
			return false;
		switch(k) {
		case KeyEvent.DOM_VK_SPACE: finishLevelSummary(this); return true;
		}
		return false;
	},

	onKeyRelease: function(k) {
		return false;
	}
});

function finishLevelSummary(layer) {
	layers.remove(layer);
	finishLevel();
}

var LayerRetryLevel = Layer.extend({
	init: function() {
		this.timeCreated = time();
		isCannonFocused = false;
		
		var w = 270;
		var h = 150;
		this.dx = (gameCanvasW - w) / 2;
		this.dy = (gameCanvasH - h) / 2;
		
		this.image = new Renderable(
			new Bounds(-6, -6, w + 12, h + 12),
			function() {
				g.drawDialog(0, 0, w, h, "#444");
				
				// Try again message.
				setFont(30, "#000", "center");
				var lh = 34;
				var ox, oy;
				ox = 135; oy = 52;
				if (didOverShoot) {
					g.fillText("Over shot!", ox, oy); oy += 44;
					setFont(20, "#000", "center");
					g.fillText("Use less fuel", ox, oy); oy += lh;
					g.fillText("or aim lower", ox, oy); oy += lh;
				}
				else {
					g.fillText("Under shot!", ox, oy); oy += 44;
					setFont(20, "#000", "center");
					g.fillText("Use more fuel", ox, oy); oy += lh;
					g.fillText("or aim higher", ox, oy); oy += lh;
				}
			}, this);
	},

	draw: function() {
		var alpha = (time() - this.timeCreated) / dialogFadeTime;
		if (alpha < 1) {
			g.globalAlpha = alpha;
		}
		this.image.draw(0, 0);
	},

	onKeyPress: function(k) {
		if (!xNoScreenDelays && time() - this.timeCreated < 200)
			return false;
		switch(k) {
		case KeyEvent.DOM_VK_SPACE: finishRetryDialog(this); return true;
		}
		return false;
	}
});

function finishRetryDialog(layer) {
	layers.remove(layer);
	retryLevel();
}

var LayerEndTurnLevel = Layer.extend({
	init: function() {
		this.timeCreated = time();
		isCannonFocused = false;
		
		var w = 270;
		var h = 150;
		this.dx = (gameCanvasW - w) / 2;
		this.dy = (gameCanvasH - h) / 2;
		
		this.image = new Renderable(
			new Bounds(-6, -6, w + 12, h + 12),
			function() {
				g.drawDialog(0, 0, w, h, "#444");
				
				// Try again message.
				setFont(30, "#000", "center");
				var lh = 34;
				var ox, oy;
				ox = 135; oy = 52;
				if (didOverShoot) {
					g.fillText("Over shot!", ox, oy); oy += 44;
					setFont(20, "#000", "center");
					g.fillText("Use less fuel", ox, oy); oy += lh;
					g.fillText("or aim lower", ox, oy); oy += lh;
				}
				else {
					g.fillText("Under shot!", ox, oy); oy += 44;
					setFont(20, "#000", "center");
					g.fillText("Use more fuel", ox, oy); oy += lh;
					g.fillText("or aim higher", ox, oy); oy += lh;
				}
			}, this);
	},

	draw: function() {
		var alpha = (time() - this.timeCreated) / dialogFadeTime;
		if (alpha < 1) {
			g.globalAlpha = alpha;
		}
		this.image.draw(0, 0);
	},

	onKeyPress: function(k) {
		if (!xNoScreenDelays && time() - this.timeCreated < 200)
			return false;
		switch(k) {
		case KeyEvent.DOM_VK_SPACE: finishEndTurnDialog(this); return true;
		}
		return false;
	}
});

function finishEndTurnDialog(layer) {
	layers.remove(layer);
}

function gameOver() {
	layers.push(new LayerGameSummary());
}

var LayerGameSummary = Layer.extend({
	init: function() {
		this.gameTime = time() - timeGameStart;
		this.timeCreated = time();
		isCannonFocused = false;
		
		// Create score from game.
		var score = {};
		score.name = nameFieldValue.replace(/^\s+|\s+$/g,"");;
		score.timeFinished = time();
		score.timePlayed = score.timeFinished - timeGameStart;
		score.eyes = eyesTotal;
		score.gold = totalCashWon;
		score.shots = shots;
		score.progress = progress;
		addGameScore(score);
		
		var w = 200;
		var h = 250;
		this.dx = (gameCanvasW - w) / 2;
		this.dy = (gameCanvasH - h) / 2;
		
		this.image = new Renderable(
			new Bounds(-6, -6, w + 12, h + 12),
			function() {
				g.drawDialog(0, 0, w, h, "#625");
				
				// Stats.
				setFont(22, "#000", "center");
				g.fillText("Game Over!", w / 2, 37);
				setFont(12, "#000", "center");
				g.fillText("Time Played: " + msToString(this.gameTime), w / 2, 60);
				g.fillText("Bullseyes: " + eyesTotal, w / 2, 80);
				g.fillText("$ won: " + totalCashWon, w / 2, 100);
				
				// Eyes.
				setFont(28, "#07f", "center");
				var ox, oy;
				ox = w / 2; oy = h / 2 + 5;
				setLine(5, "#000", "round");
				var msg = shots + " Shots" + fill("!", eyesTotal / 45);
				g.strokeAndFillText("Achieved", ox, oy + 30);
				g.strokeAndFillText(msg, ox, oy + 72);
			}, this);
	},

	draw: function() {
		var alpha = (time() - this.timeCreated) / dialogFadeTime;
		if (alpha < 1) {
			g.globalAlpha = alpha;
		}
		this.image.draw(0, 0);
	},

	onKeyPress: function(k) {
		if (!xNoScreenDelays && time() - this.timeCreated < 200)
			return false;
		switch(k) {
		case KeyEvent.DOM_VK_SPACE: finishGameSummary(this); return true;
		}
		return false;
	}
});

function finishGameSummary(layer) {
	layers.remove(layer);
	newGame();
}

function beginStage() {
	showOverHeadDisplay = false;
	layers.push(new LayerStageIntro());
}

var LayerStageIntro = Layer.extend({
	init: function() {1
		this.gameTime = time() - timeGameStart;
		this.timeCreated = time();
		
		var w = 340;
		var h = 340;
		this.dx = (gameCanvasW - w) / 2;
		this.dy = (gameCanvasH - h) / 2;
		
		this.image = new Renderable(
			new Bounds(-6, -6, w + 12, h + 12),
			function() {
				g.drawDialog(0, 0, w, h, "#256");
				
				var x = w / 2;
				var y = h / 2;
				
				// Gray background glow.
				if (false) {
					var r = 150;
					var grad;
					grad = g.createRadialGradient(x, y, 0, x, y, r);
					grad.addColorStop(0.0, "#aaa");
					grad.addColorStop(1.0, "#fff");
					g.fillStyle = grad;
					g.fillCircle(x, y, r);
				}
				
				setFont(160, "#000", "center");
				g.fillText(stage, x, y + 70);
				
				setFont(26, "#000", "center");
				g.fillText("Stage", x, y - 100); // 20, 244);
			}, this);
	},

	draw: function() {
		var alpha = (time() - this.timeCreated) / dialogFadeTime;
		if (alpha < 1) {
			g.globalAlpha = alpha;
		}
		this.image.draw(0, 0);
	},

	onKeyPress: function(k) {
		var tasty = tastyKey(k);
		if ((xNoScreenDelays || 500 <= time() - this.timeCreated) && tasty)
			finishStageIntro(this);
		return tasty;
	}
});

function tastyKey(k) {
	switch(k) {
	case KeyEvent.DOM_VK_SPACE: return true;
	case KeyEvent.DOM_VK_LEFT: return true;
	case KeyEvent.DOM_VK_RIGHT: return true;
	case KeyEvent.DOM_VK_UP: return true;
	case KeyEvent.DOM_VK_DOWN: return true;
	}
	return false;
}

function finishStageIntro(layer) {
	layers.remove(layer);
	beginLevel();
}

function beginGame() {
	showOverHeadDisplay = false;
	layers.push(new LayerGameIntro());
}

var LayerGameIntro = Layer.extend({
	init: function() {
		this.gameTime = time() - timeGameStart;
		this.timeCreated = time();
		
		var w = 500;
		var h = 500;
		this.dx = (gameCanvasW - w) / 2;
		this.dy = (gameCanvasH - h) / 2;
		
		this.image = new Renderable(
			new Bounds(-6, -6, w + 12, h + 12),
			function() {
				g.drawDialog(0, 0, w, h, "#256");
				
				setFont(80);
				g.fillText("Hello", 65, 240);
				g.fillText("Cannon", 65, 330);
			}, this);
	},

	draw: function() {
		var alpha = (time() - this.timeCreated) / dialogFadeTime;
		if (alpha < 1) {
			g.globalAlpha = alpha;
		}
		this.image.draw(0, 0);
	},

	onKeyPress: function(k) {
		var tasty = tastyKey(k);
		if ((xNoScreenDelays || 500 <= time() - this.timeCreated) && tasty)
			finishGameIntro(this);
		return tasty;
	}
});

function finishGameIntro(layer) {
	layers.remove(layer);
	nextLevel();
}

appendtoclass(CanvasRenderingContext2D, {

	// Draws with total render radius of r * 1.25
	drawGlowingGlassBall: function(x, y, r, color) {
		var grad;
		
		var c = color;
		
		// Draw black edge accent and glow.
		var cedge = "#000";
		grad = this.createRadialGradient(x, y, 0, x, y, r * 1.2);
		grad.addColorStop(0.833, c);
		var ci = c.alpha(0.6); // Intensity of glow.
		grad.addColorStop(0.843, ci.alpha(1.0));
		grad.addColorStop(0.874, ci.alpha(0.5));
		grad.addColorStop(0.915, ci.alpha(0.24));
		grad.addColorStop(0.956, ci.alpha(0.1));
		grad.addColorStop(1.0, ci.alpha(0.0));
		this.fillStyle = grad;
		this.fillCircle(x, y, r * 1.2);
		this.drawGlassBall(x, y, r, color);
	},

	drawEgg: function(x, y, a, b, color, angle) {
		g.save();
		g.rotate(angle);
		g.scale(a / b, b / b);
		this.drawGlassBall(x, y, b, color, angle);
		g.restore();
	},

	// Draws with total render radius of r * 1.25
	drawGlassBall: function(x, y, r, color /*, shineAngle */) {
		var grad;
		
		var c = color;
		
		// Draw color.
		this.fillStyle = c;
		this.fillCircle(x, y, r);
		
		// Egg spots
		// ... todo...
		
		// Draw black edge accent and glow.
		var cedge = "#000";
		grad = this.createRadialGradient(x, y, 0, x, y, r * 1.2);
		grad.addColorStop(0.5, cedge.alpha(0.0));
		grad.addColorStop(0.75, cedge.alpha(0.075));
		grad.addColorStop(0.8, cedge.alpha(0.125));
		grad.addColorStop(0.833, cedge.alpha(0.225));
		var ci = c.alpha(0.6); // Intensity of glow.
		grad.addColorStop(0.843, ci.alpha(1.0));
		grad.addColorStop(0.874, ci.alpha(0.5));
		grad.addColorStop(0.915, ci.alpha(0.24));
		grad.addColorStop(0.956, ci.alpha(0.1));
		grad.addColorStop(1.0, ci.alpha(0.0));
		this.fillStyle = grad;
		this.fillCircle(x, y, r * 1.2);
		
		var light = "#fff";

		var dist = r * 0.57;
		var angl = -firstdefined(arguments[4], 0) + shineAngle;
		var p = cart(angl, dist);
		var ox = p[0];
		var oy = p[1];
		
		// Draw general shine.
		grad = this.createRadialGradient(ox * 1.1, oy * 1.1, 0, ox * 0.55, oy * 0.55, r * 0.8);
		grad.addColorStop(0.0, light.alpha(0.3)); // Brightness.
		grad.addColorStop(1.0, light.alpha(0.0));
		this.fillStyle = grad;
		this.fillCircle(ox * 0.55, oy * 0.55, r * 0.8);
		
		// Draw reflection of light source.
		var ld = light.alpha(0.9); // Brightness.
		grad = this.createRadialGradient(ox, oy, 0, ox, oy, r * 0.4);
		grad.addColorStop(0.0, ld.alpha(1.0));
		grad.addColorStop(0.05, ld.alpha(1.0));
		grad.addColorStop(0.15, ld.alpha(0.9));
		grad.addColorStop(0.4, ld.alpha(0.43));
		grad.addColorStop(0.5, ld.alpha(0.2));
		grad.addColorStop(0.6, ld.alpha(0.1));
		grad.addColorStop(1.0, ld.alpha(0.0));
		this.fillStyle = grad;
		this.fillCircle(ox, oy, r * 0.4);
	},

	drawStar: function(x, y, r, rotation) {
		this.fillStar(x, y, r * 0.382, r, rotation - Math.PI * 0.5, 5);
	},

	drawDialog: function(x, y, w, h, color) {
		var shine = "#fff";
		var roundy = 5;
		this.fillStyle = shine.alpha(0.95);
		this.strokeStyle = color;
		this.lineWidth = 12;
		this.lineCap = "butt";
		
		// Colored outline.
		if (false) {
			this.fillRect(x, y, w, h);
			this.strokeRoundRect(x, y, w, h, roundy);
		}
		else {
			this.fillRoundRect(x, y, w, h, roundy * 2);
		}
		
		// Shiny edges.
		if (false) {
			forNum(4, function(i) {
				var alpha = (3 - i) * 0.1;
				this.strokeStyle = shine.alpha(alpha);
				this.lineWidth = (i + 1) * 2.25;
				this.strokeRoundRect(x - 2, y - 2, w, h, roundy);
			}, this);
		}
	}
});
