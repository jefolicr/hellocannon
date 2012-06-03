//
// Hello Cannon
// by Jeff Hollocher
//
// TODO:
// Does drawing a line to nowhere (point) draw faster than arcing a circle? (at the very least, it's less calculations on my side)
// Make sure progress magic number works still with shot redo.
// Allow only one shot redo, particularly because the user may be out of fuel.
// End game when user has 30 or less cash.
//

// Debugging.
var xShowFps = true;
var xInfiniteStarPower = true;
var xInfiniteBigPower = true;
var xAlwaysSink = false;
var xBrowseLevels = false;
var xNoLevelRedo = false;
var xAlwaysShowPowerup = 2;
var xJumpToStage = 0;
var xFastPlay = false;
var xInvincible = false;
var xAlwaysShowBoss = false;
var xFullscreen = false;
var xDrawCanvasBoundingBox = false;
var xDontDrawParticles = false;
var xMultipleShots = false;
var xSlowPhysics = false;
var xScreenDelays = false;
var xPowerupsSeparateFromTargets = false;
var xShowLevelSummary = false;
var xFadeOutCashBubbles = false;
var xIndividualCashBubbles = false;
var xEyeSetScoreNormal = false;
var xExplodeBigSink = false;
var xShowStageIntro = false;
var xNonRandomSeed = false;
var xScaleBubbles = false;
var xStages = false;
var xCountShotsMade = false;

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
var targetMspfPhysics = 1000 / 120;
var maxMspfPhysics = 50;
// total > screen > window > viewport > canvas > game > cam
var canvasw = 600; // in device space
var canvash = 320; // in device space
var gamew = 787.5; // in world space
var gameh = 420;   // in world space
var camw;
var camh;
var defaultFontFace = "'Trebuchet MS', Helvetica, sans-serif";
var layers;
var black = "#000";
var white = "#fff";
var targetcolors = ["#fff535", "#fd1b14", "#41b7c8", black, white];
var dialogFadeTime = 250;
var targetPopTime = 400;
var backgroundColor = "#ddd";

// Mechanics.
var physics = (xSlowPhysics ? 0.2 : 1);
var gravity = 0.000336;
var angleSteps = 141; // Should be odd so that cannon is able to be aligned perfectly horizontal.
var fuelMax = 100;
var fuelStepn = 5;
var fuelSteps = (fuelMax / fuelStepn);
var shotCost = 30;
var starPowerNumShots = 3;
var eyePowerNumEyes = 5;
var bigPowerNumShots = 4;
var bigShotRadius = 27;
var greenBalls = 4;
var levelRedoMax = 10;
var shineAngleOffset = 3.8;
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
var numStarShots;
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
var endLevelCompleted;
var debuginfo;

function initHellocannon() {
	Sound.setsounds([
		"powerup",
		"adjustangle",
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

	if (xNonRandomSeed)
		Math.seedrandom(0);
	gameCanvas = document.getElementById("hellocannon");
	gameCanvas.key = -1;
	g = gameCanvas.getContext("2d");
	g.setFontFace(defaultFontFace, "bold");
	fitToScreen();
	Renderable.prototype.drawCanvasBoundingBox = xDrawCanvasBoundingBox;
	tPrevUpdatePhysics = undef;
	tPrevAnimatePhysics = undef;
	dtPrevAnimatePhysics = undef;
	tms = 0;
	fpsPhysics = Math.round(1000 / targetMspfPhysics);
	frameCountPhysics = 0;
	tTotalUpdatePhysics = 0;
	tPrevUpdateGraphics = undef;
	fpsGraphics = Math.round(1000 / targetMspfGraphics);
	frameCountGraphics = 0;
	tTotalUpdateGraphics = 0;
	gobs = [];
	particles = [];
	perms = [];
	layers = [];
	layers.push(new LayerCamera());
	
	// Start engine.
	animatePhysics();
	animateGraphics();

	document.onkeydown = function(e) { onKey(e, true); };
	document.onkeyup = function(e) { onKey(e, false); };
	
	// Start game.
	newGame();
}

function fitToScreen() {
	if (xFullscreen) {
		var vps = viewportSize();
		vps.w = Math.max(0, (vps.w) - 20);
		vps.h = Math.max(0, (vps.h) - 20);
		if (vps.h * 1.5 < vps.w) {
			vps.w = vps.h * 1.5;
		}
		canvasw = 3 * Math.floor(vps.w / 3);
		canvash = Math.round(vps.w / 1.5);
	}
	gameCanvas.width = canvasw;
	gameCanvas.height = canvash;
	
	// Non game area background.
	g.fillStyle = "#111";
	g.fillRect(0, 0, canvasw, canvash);

	var s, tx, ty;
	if (canvasw < canvash) {
		// Tall and skinny.
		s = canvasw / gamew;
		tx = 0;
		ty = (canvash - s * gameh) * 0.5;
	}
	else {
		// Short and fat.
		s = canvash / gameh;
		tx = (canvasw - s * gamew) * 0.5;
		ty = 0;
	}
	g.translate(tx, ty);
	g.scale(s, s);
	
	// Set Renderable scale.
	Renderable.prototype.scaleOfAreaToDeviceForFocus = s;
	
	// Clip.
	g.beginPath();
	g.moveTo(0, 0);
	g.lineTo(gamew, 0);
	g.lineTo(gamew, gameh);
	g.lineTo(0, gameh);
	g.clip();
}

function changeCash(x, y, amt, special) {
	if (0 < amt) {
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

function onKey(e, press) {
	var k = e.keyCode;
	var i = layers.length;
	while (0 < i--) {
		if (layers[i].onKey(k, press)) {
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
	if (isundef(tPrevAnimatePhysics)
		|| (dtPrevAnimatePhysics <= 500 && 500 < dt)) { // Smooth out spikes of lag.
		
		dt = 0;
	}
	else {
		dt = t - tPrevAnimatePhysics;
	}
	dtPrevAnimatePhysics = dt;
	dt = bind(dt, 0, maxMspfPhysics); // Smooth out extended lag.
	var numTicks = Math.floor(dt / targetMspfPhysics);
	tPrevAnimatePhysics = t - dt % targetMspfPhysics;
	times(numTicks, updatePhysics);
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
	if (!isundef(tPrevUpdatePhysics)) {
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
	if (!isundef(tPrevUpdateGraphics)) {
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
	var slowForDramaticEffect = !isundef(timeOfAnyHit)
		? bind((tms - timeOfAnyHit) / 80, 0.05, 1)
		: 1;
	slowAccum += physics * slowForDramaticEffect;
	while (1 <= slowAccum) {
		slowAccum -= 1;
		
		// Step physics.
		tms += dms;
		layers.invoke('step');
	}
}

function drawGraphics() {
	layers.each(function (v) {
		g.save();
		g.translate(v.dx, v.dy);
		v.draw();
		g.restore();
	});
	
	// Audio.
	Sound.playall();
}

function setStage1() {
	// Do nothing.
};

function setStage2() {
	var p = randXY();
	var g = new GiftEgg(p[0], p[1]);
	gobs.push(g);
	perms.push(g);
}

function setStage3() {
	var p = randXY();
	var g = new ElectricEgg(p[0], p[1]);
	gobs.push(g);
	perms.push(g);
}

function setStage4() {
	var p = randXY();
	var g = new MainEgg(p[0], p[1]);
	gobs.push(g);
	perms.push(g);
}

function setStage5() {
	var p = randXY();
	var g = new MainEgg(p[0], p[1]);
	gobs.push(g);
	perms.push(g);
};

function setStage6() {
	var p = randXY();
	var g = new MainEgg(p[0], p[1]);
	gobs.push(g);
	perms.push(g);
}

var stages = table([
	{stage:0,  level:0,  medal:0,     boss:0},
	[1,        0,        "",          setStage1],
	[2,        10,       "Wooden",    setStage2],
	[3,        30,       "Bronze",    setStage3],
	[4,        60,       "Silver",    setStage4],
	[5,        100,      "Gold",      setStage5],
	[6,        150,      "Platinum",  setStage6]
]);

function newGame() {
	stage = xJumpToStage;
	perms = [];
	gobs = [];
	particles = [];
	shots = stages[xJumpToStage].level;
	cash = 230;
	isCannonFocused = false;
	totalFuelUsed = 0;
	totalTargetHit = 0;
	totalCashWon = 0;
	cannon = new Cannon();
	trajectory = new Trajectory();
	cannon.fuelStep = Math.floor(fuelSteps * 0.5);
	cannon.fuel = (cannon.fuelStep + 1) * fuelStepn;
	cannon.angleStep = Math.floor(angleSteps * 0.75);
	cannon.angle = Math.TAU * 0.5 * (Math.floor(angleSteps / 2) - cannon.angleStep) / angleSteps;
	timeGameStart = time();
	progress = (timeGameStart & 0xffffffff);
	numStarShots = xInfiniteStarPower ? starPowerNumShots : 0;
	numBigShots = xInfiniteBigPower ? bigPowerNumShots : 0;
	hitRun = 0;
	eyeRun = 0;
	eyesTotal = 0;
	slowAccum = 0;
	beginGame();
	isCannonFocused = true;
	changeAngle(4);
	changeFuel(-1);
	isCannonFocused = false;
}

function nextShot() {
	isCannonFocused = true;
	isShotFired = false;
	gobsReadyToEndLevel = false;
	humanReadyToEndLevel = false;
	askIsHumanReadyToEndLevel = false;
	humanReadyToEndLevel = false;
	timeLevelStart = tms;
	timeOfLastFire = undef;
	endLevelCompleted = false;
}

function retryLevel() {
	nextShot();
	shots--;
}

function nextLevel() {
	nextShot();
	gobs = [];
	particles = [];
	var nextStageVal = stages.findr(function(v) {
		return v.level <= shots;
	});
	var nextStage = nextStageVal.stage;
	var prevStage = stage;
	stage = nextStage;
	camw = gameh + (gamew - gameh) * Math.min(stage - 1, 5) / 5;
	camh = gameh;
	if (nextStage != prevStage && xStages) {
		stages[stage - 1].boss();
		if (xShowStageIntro)
			beginStage();
		else
			beginLevel();
	}
	else {
		beginLevel();
	}
}

function beginLevel() {
	// Initialize level state.
	cashWonThisLevel = 0;
	cashChangeThisLevel = 0;
	hitsMade = 0;
	eyesMade = 0;
	showOverHeadDisplay = true;
	progress = ((progress * 485207) & 0xffffffff) ^ 385179316;
	
	// Random cannon position.
	var cannonMinY = 65;
	var cannonMaxY = camh - 36;
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
	if (30 <= shots && rand() < 0.16) {
		numTargets = (30 <= shots && rand() < 0.155) 
			? Math.floor(camw * camh / 17400)
			: 3;
	}
	if (10 <= shots && rand() < 0.10)
		numPowerups = 1;
	times(numSinks, function(i) {
		if (rand() < 0.5)
			numTargets++;
		if (rand() < 0.09)
			numPowerups++;
	});
	if (!xPowerupsSeparateFromTargets) {
		if (numTargets < numPowerups)
			numTargets = numPowerups;
		numTargets -= numPowerups;
	}
	
	// Initialize gobs.
	times(numTargets, createTarget);
	// Save one target for tracking over/under shot.
	singleTarget = (shots <= levelRedoMax && numTargets == 1)
		? gobs[gobs.length - 1]
		: undef;
	times(numPowerups, createPowerup);
	times(numSinks, createSink);
	gobs.push(trajectory);
	gobs.push(cannon);
	
	// Refresh perms.
	var liveStill = [];
	perms.each(function(v) {
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
	var s = targetSize(0);
	gobs.push(new Target(p[0], p[1], s.nRings, s.ringWidth, 0));
}

function createPowerup() {
	var p = randXY();
	var s = targetSize(0);
	var powerup = 1 + randInt(3);
	var gobTar = new Target(p[0], p[1], s.nRings, s.ringWidth, 0)
	var gobPow = new Powerup(p[0], p[1], gobTar.radius, powerup);
	gobPow.targetBuddy = gobTar;
	gobs.push(gobTar);
	gobs.push(gobPow);
}

function randXY() {
	var targetMinX = 130;
	var targetMaxX = camw - 10;
	var targetMinY = 50;
	var targetMaxY = camh - 10;
	return [
		targetMinX + randInt(targetMaxX - targetMinX),
		targetMinY + randInt(targetMaxY - targetMinY)
	];
}

function targetSize(type) {
	var sizes = table([
		{level:0, nRings:0, ringWidth:0},
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
		[150,     1,        7.5]
	]);
	var s = sizes.findr(function(x) {
		return x.level <= shots;
	});
	return type == 2
		? { nRings: s.nRings * 2, ringWidth: s.ringWidth * 0.5 }
		: { nRings: s.nRings,     ringWidth: s.ringWidth       };
}

function computeRingCash(i, nRings, type) {
	return type == 2
		? [75,     30,     20,     10,   10 ][i]
		: [75,40,  20,15,  10,10,  5,5,  5,5][i];
}

var Layer = Class.extend({
	step: function() {},
	draw: function() {},
	onKey: function(k) { return false; }
});

var Gob = Class.extend({
	step: function() { },
	draw: function() { },
	collide: function(that) { }
});

var LayerCamera = Layer.extend({
	init: function() {
		this.msCleanup = 0;
		this.dx = 0;
		this.dy = 0;
		this.keymap = {};
		this.keyconsumption = {};
		
		this.overhead = new Renderable(
			new Bounds(0, 0, gamew, 30),
			function() {
				var BAR_HEIGHT = 30;
				
				// Draw overhead background.
				g.fillStyle = black.alpha(0.2);
				g.fillRect(0, 0, camw, BAR_HEIGHT);

				// Draw score.
				if (xCountShotsMade) {
					g.setFontStyle(18, black, "center");
					g.fillText(shots + " Shots", 100, 23);
				}
				else {
					g.setFontStyle(18, black, "center");
					g.fillText(totalTargetHit + " Hits", 100, 23);
				}

				// Draw money.
				g.setFontStyle(18);
				g.fillText(cash + " $", 250, 23);
				if (cash <= 0) {
					g.fillStyle = "#d00";
					g.fillText(cash, 250, 23);
				}
				
				var SYMBOL_RADIUS = BAR_HEIGHT * 0.42;
				
				// Draw star power.
				if (numStarShots) {
					g.save();
					g.translate(200, BAR_HEIGHT * 0.5);
					if (numBigShots)
						g.translate(-SYMBOL_RADIUS - 1, 0);
					g.fillStyle = black;
					g.fillCircle(0, 0, SYMBOL_RADIUS);
					g.drawStar(0, 0, SYMBOL_RADIUS, 0);
					g.restore();
				}
				
				// Draw big power.
				if (numBigShots) {
					g.save();
					g.translate(200, BAR_HEIGHT * 0.5);
					if (numStarShots)
						g.translate(SYMBOL_RADIUS + 1, 0);
					var shot = new Shot(0, 0, 0, 0, SYMBOL_RADIUS);
					shot.draw();
					g.restore();
				}
				
				// Draw stage trophies.
				times(stage - 1, function() {
					console.log("Drawing trophy " + stage);
				});
			}, this);
		
		this.cashchange = new Renderable(
			new Bounds(0, 0, 100, 32),
			function() {
				var c = cashChangeThisLevel;
				var color = 0 < c ? "#020" : "#200";
				if (false) {
					var d = numDigits(c);
					g.fillStyle = black.alpha(0.2);
					g.fillRoundRect(2, 2, 18 + d * 18, 30, 3);
				}
				g.setFontStyle(18, color);
				g.setLineStyle(4, black, "round");
				g.fillText(withSign(c), 10, 23);
			}, this);
		
		this.fpsimage = new Renderable(
			new Bounds(0, 0, 38, 22),
			function() {
				var fps;
				g.setFontStyle("8pt " + defaultFontFace);
				fps = Math.round(fpsGraphics);
				g.fillText(fps + " fps", 2, 10);
				fps = Math.round(fpsPhysics);
				g.fillText(fps + " fps", 2, 20);
			}, this);
		
		this.fireagainimage = new Renderable(
			new Bounds(-50, -30, 100, 60),
			function() {
				g.setFontStyle(14, white, "center");
				g.setLineStyle(6, black, "round");
				g.strokeAndFillText("Fire to", 0, -10)
				g.strokeAndFillText("continue.", 0, 10);
			}, this);
	},
	
	step: function() {
		if (0 < this.msCleanup) {
			this.msCleanup -= 1000;
			particles = particles.filter(function(v) {
				return !v.dead;
			});
		}
		this.msCleanup += dms;
		
		var drawables = xDontDrawParticles
			? [gobs]
			: [gobs, particles];
		drawables.each(function(objectlist) {
			objectlist.invoke('step');
		});
		
		if (isShotFired && !gobsReadyToEndLevel) {
			gobsReadyToEndLevel = !gobs.any(function(v) {
				return v.shotNotEnded;
			});
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
		
		if (endLevel && !endLevelCompleted) {
			endLevelCompleted = true;
			if (!xNoLevelRedo && shots <= levelRedoMax && cashWonThisLevel == 0) {
				layers.push(new LayerRetryLevel());
				// TODO Check here that layer is not already added.
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
		
		this.checkKeys();
	},
	
	checkKeys: function() {
		if (this.keymap[KeyEvent.DOM_VK_UP]) {
			var t = time();
			var dt = t - this.keymap[KeyEvent.DOM_VK_UP];
			var newdt = dt - this.keyconsumption[KeyEvent.DOM_VK_UP];
			this.keyconsumption[KeyEvent.DOM_VK_UP] = dt;
			changeAngle(newdt * (dt < 200 ? 0.015 : 0.09));
		}
		if (this.keymap[KeyEvent.DOM_VK_DOWN]) {
			var t = time();
			var dt = t - this.keymap[KeyEvent.DOM_VK_DOWN];
			var newdt = dt - this.keyconsumption[KeyEvent.DOM_VK_DOWN];
			this.keyconsumption[KeyEvent.DOM_VK_DOWN] = dt;
			changeAngle(-newdt * (dt < 200 ? 0.015 : 0.09));
		}
		if (this.keymap[KeyEvent.DOM_VK_LEFT]) {
			var t = time();
			var dt = t - this.keymap[KeyEvent.DOM_VK_LEFT];
			var newdt = dt - this.keyconsumption[KeyEvent.DOM_VK_LEFT];
			if (dt < 200) {
				this.keyconsumption[KeyEvent.DOM_VK_LEFT] = dt;
			}
			else {
				if (newdt >= 80) {
					this.keyconsumption[KeyEvent.DOM_VK_LEFT] += 80;
					changeFuel(-1);
				}
			}
		}
		if (this.keymap[KeyEvent.DOM_VK_RIGHT]) {
			var t = time();
			var dt = t - this.keymap[KeyEvent.DOM_VK_RIGHT];
			var newdt = dt - this.keyconsumption[KeyEvent.DOM_VK_RIGHT];
			if (dt < 200) {
				this.keyconsumption[KeyEvent.DOM_VK_RIGHT] = dt;
			}
			else {
				if (newdt >= 80) {
					this.keyconsumption[KeyEvent.DOM_VK_RIGHT] += 80;
					changeFuel(1);
				}
			}
		}
	},
	
	draw: function() {
		this.checkKeys();
		
		g.save();
		
		g.fillStyle = black;
		g.fillRect(0, 0, gamew, gameh);
		g.translate((gamew - camw) / 2, 0);
		
		// Clip from game bounds to camera peering into world.
		g.beginPath();
		g.moveTo(0, 0);
		g.lineTo(camw, 0);
		g.lineTo(camw, camh);
		g.lineTo(0, camh);
		g.clip();
		
		// Draw background.
		g.fillStyle = backgroundColor;
		g.fillRect(0, 0, camw, camh);
		
		// Draw game objects.
		var x, y;
		[gobs, particles].each(function(objectlist) {
			objectlist.each(function(v) {
				g.save();
				g.translate(v.dx, v.dy);
				v.draw();
				g.restore();
			});
		});
		
		if (showOverHeadDisplay) {
			this.overhead.key = [shots, cash, numStarShots, stage, totalTargetHit].join(",");
			this.overhead.draw(0, 0);
			
			// Draw cash won this level.
			if (isShotFired) {
				this.cashchange.key = cashChangeThisLevel;
				this.cashchange.draw(333, 0);
			}
		}

		// Draw fps.
		if (xShowFps) {
			this.fpsimage.key = fpsPhysics + ',' + fpsGraphics;
			this.fpsimage.draw(0, 0);
		}
		
		// Debug Info.
		if (debuginfo) {
			g.setFontStyle("20pt " + defaultFontFace);
			g.fillText(0.001 * Math.floor(debuginfo * 1000), 2, 40);
		}
		
		// Ready to end level text.
		if (askIsHumanReadyToEndLevel) {
			var a = Math.TAU * tms / 3000;
			var radius = 4;
			var p = cart(a, radius);
			this.fireagainimage.draw(camw * 0.5 + p[0], camh * 0.9 + p[1]);
		}

		// Restore clip to game bounds.
		g.restore();
	},
	
	onKey: function(k, press) {
		if (!press)
			this.checkKeys();
		if (k == KeyEvent.DOM_VK_UP || k == KeyEvent.DOM_VK_DOWN || k == KeyEvent.DOM_VK_LEFT || k == KeyEvent.DOM_VK_RIGHT) {
			if (press) {
				if (!this.keymap[k]) {
					this.keymap[k] = time();
					this.keyconsumption[k] = 0;
					
					if (k == KeyEvent.DOM_VK_LEFT)
						changeFuel(-1);
					if (k == KeyEvent.DOM_VK_RIGHT)
						changeFuel(1);
				}
			}
			else {
				this.keymap[k] = 0;
			}
			return true;
		}
		if (k == KeyEvent.DOM_VK_SPACE && press) {
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
	}
});

function finishLevel() {
	cash += cashChangeThisLevel;
	changeFuel(0);
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
	var next = bind(prev + n, 0, angleSteps - 1);
	if (prev != next) {
		cannon.angleStep = next;
		cannon.angle = Math.TAU * 0.5 * (Math.floor(angleSteps / 2) - next) / angleSteps;
		if (isundef(timePlayAdjustSound) || 100 < time() - timePlayAdjustSound) {
			timePlayAdjustSound = time();
			Sound.push("adjustangle");
		}
	}
}

function changeFuel(n) {
	if (!isCannonFocused)
		return;
	var prev = cannon.fuelStep;
	var maxsteps = Math.floor(cash / fuelStepn) - 1;
	var next = bind(prev + n, 0, Math.min(fuelSteps - 1, maxsteps));
	if (prev != next && n != 0) {
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
				g.setLineStyle(4, "#555");
				g.strokeCircle(0, 0, 9.5);
				g.save();
				g.rotate(this.angle);
				g.fillStyle = black;
				g.fillRect(-9.5, -4, 23.5, 8);
				g.fillRoundRect(12.5, -6.5, 9, 13, 3);
				g.restore();
				g.fillStyle = "#555";
				g.fillCircle(0, 0, 2.5);
				
				// Draw fuel.
				g.lineWidth = 1.25;
				g.setLineStyle(1.25);
				g.translate(2, 23);
				times(fuelSteps, function(i) {
					g.strokeStyle = (i <= this.fuelStep)
						? black
						: white;
					var sx = 2.25
					var sy = 0.75
					g.strokeLine(i * sx, 0, 0, (i + 1) * -sy);
				}, this);
				g.setFontStyle(10);
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
		if (numStarShots && !xInfiniteStarPower)
			numStarShots--;
		shots++;
		fuelCost = cannon.fuel;
		var z = computeShotZeroState();
		var radius = numBigShots ? bigShotRadius : 0;
		var shot = new Shot(z.dx, z.dy, z.vx, z.vy, radius);
		if (numBigShots && !xInfiniteBigPower)
			numBigShots--;
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
	var power = (0.06 + Math.pow(100 * cannon.fuel / fuelMax, 0.9) * 0.0084);
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
	init: function(dxi, dyi, vxi, vyi, radius) {
		this.dxPrev = dxi;
		this.dyPrev = dyi;
		this.dx = dxi;
		this.dy = dyi;
		this.vx = vxi;
		this.vy = vyi;
		this.sunk = false;
		this.timeStuck = undef;
		this.timeFallenFromVision = undef;
		this.timeCreated = tms;
		this.mass = 1;
		this.radius = radius;
		this.shotNotEnded = true;
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
			if (isundef(this.timeFallenFromVision))
				this.timeFallenFromVision = tms;
		}
		else {
			this.timeFallenFromVision = undef;
		}
		
		// Check all conditions for end of level.
		var outOfBoundsTime = numSinks ? 2000 : 500;
		var sunkShotTimeout = 2500;
		var levelOver = false;
		levelOver = levelOver || !isundef(this.timeStuck) && (sunkShotTimeout < tms - this.timeStuck);
		levelOver = levelOver || !isundef(this.timeFallenFromVision) && (outOfBoundsTime < tms - this.timeFallenFromVision);
		if (levelOver) {
			gobs.remove(this);
		}
				
		// Collide with all game objects.
		var shot = this;
		gobs.invoke('collide', shot);
	},

	draw: function() {
		var f = (tms - this.timeStuck) / 1700;
		
		if (!isundef(this.timeStuck)
			&& 1 < f) {
			
			if (!this.sunk) {
				Sound.push("sink");
				if (this.radius && xExplodeBigSink) {
					// Explode into pieces.
					times(2, function(i) {
						var mag = (3 + rand()) * 0.45;
						var ang = rand() * Math.TAU;
						var p = cart(ang);
						var nradius = Math.max(0, this.radius * 0.4 - 2);
						var dist = 10;
						var ndx = this.dx + p[0] * dist;
						var ndy = this.dy + p[1] * dist;
						var nvx = p[0] * mag;
						var nvy = p[1] * mag;
						var shot = new Shot(ndx, ndy, nvx, nvy, nradius);
						gobs.push(shot);
					}, this);
				}
			}
			this.sunk = true;
		}
		
		if (this.sunk)
			return;
		
		var color = this.radius ? "#340" : black;
		var radius = this.radius ? this.radius : 1;
		
		if (!isundef(this.timeStuck)) {
			color = color.shiftColor("#f00", f);
			radius = this.radius * ((1 - f * 0.3) + 0.2 * (f * rand() - 0.5));
		}
		
		// Glow.
		var c = this.radius ? "#860" : "#777";
		var r = radius + 20;
		var grad = g.createRadialGradient(0, 0, 0, 0, 0, r);
		grad.addColorStop(0, c.alpha(0.8));
		grad.addColorStop(0.05, c.alpha(0.65));
		grad.addColorStop(0.12, c.alpha(0.5));
		grad.addColorStop(0.25, c.alpha(0.35));
		grad.addColorStop(0.5, c.alpha(0.2));
		grad.addColorStop(1, c.alpha(0.05));
		g.fillStyle = grad;
		g.fillCircle(0, 0, r);
		
		// Ball.
		g.fillStyle = color;
		g.fillCircle(0, 0, radius);
		
		// Shine.
		g.fillStyle = white;
		g.fillCircle(-radius * 0.4, -radius * 0.4, radius * 0.2);
	},
	
	scoring: function() {
		return 1;
	}
});

var Target = Gob.extend({
	init: function(dxi, dyi, nRings, ringWidth, type) {
		this.dx = dxi;
		this.dy = dyi;
		this.ringWidth = ringWidth;
		this.radius = ringWidth * (nRings - 0.5);
		this.hit = false;
		this.hue = rand();
		this.rings = range(nRings).map(function() {
			return new Ring(this);
		}, this);
		this.popTime = xBrowseLevels ? 0 : tms + rand() * 800;
		this.popSoundYet = false;
		this.type = type; // 0 = regular, 1 = powerup eye, 2 = archery
	},

	step: function() {
		if (this.type == 1) {
			var friction = 0.00004;
			var vxPrev = this.vx;
			var vyPrev = this.vy;
			var sSqrd = this.vx * this.vx + this.vy * this.vy;
			var sLimit = friction * dms;
			if (sLimit * sLimit < sSqrd) {
				var s = Math.sqrt(sSqrd);
				this.vx -= vxPrev * sLimit / s;
				this.vy -= vyPrev * sLimit / s;
			}
			else {
				this.vx = 0;
				this.vy = 0;
			}
			this.dx += (this.vx + vxPrev) * dms * 0.5;
			this.dy += (this.vy + vyPrev) * dms * 0.5;

			// Collide with screen bounds.
			var outby = boundsCheck(this, -this.radius);
			if (outby.dx != 0) {
				this.vx = -this.vx;
				this.dx -= outby.dx;
			}
			if (outby.dy != 0) {
				this.vy = -this.vy;
				this.dy -= outby.dy;
			}
		}
	},

	draw: function() {
		// Initial appearance: pop sound / scaling
		var pop = (tms - this.popTime) / targetPopTime;
		if (pop <= 0)
			return;
		if (pop < 1) {
			if (!this.popSoundYet) {
				if (this.type != 1)
					Sound.push("targetpop");
				this.popSoundYet = true;
			}
			pop = 1 - (1 - pop) * (1 - pop);
			g.scale(pop, pop);
		}
		
		// Draw rings, beginning with outside ring (why?).
		this.rings.eachr(function(v, i) {
			v.draw(i, this.ringWidth);
		}, this);
		
		// Draw crosshairs.
		if (this.type != 2 && this.rings.length == 1 && this.ringWidth ) {
			if (isundef(this.rings[0].timeHit)) {
				if (isundef(this.crossangle)) {
					this.crossangle = rand() * Math.TAU;
				}
				g.save();
				g.rotate(Math.TAU * 0.125);
				var scale = (1 + 0.05 * this.ringWidth);
				var w = 2.25 * scale;
				var d = 3 * scale * (1 + 1 * (1 + Math.sin(this.crossangle + Math.TAU * 0.125 + tms * 0.003)));
				var h = 18 * scale + d;
				g.fillStyle = black;
				g.fillPolygon([ [ d,  0], [ h,  w], [ h, -w] ]);
				g.fillPolygon([ [ 0,  d], [ w,  h], [-w,  h] ]);
				g.fillPolygon([ [-d,  0], [-h,  w], [-h, -w] ]);
				g.fillPolygon([ [ 0, -d], [ w, -h], [-w, -h] ]);
				g.restore();
			}
		}
	},

	collide: function(shot) {
		if (!shot.scoring())
			return;
			
		if (this.type == 1 && (this.vx || this.vy))
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
				if (this.type != 1)
					totalTargetHit++;
				hitRun++;
			}
			var d = Math.sqrt(dSqrd);
			this.rings.each(function(v, i) {
				if (v.collide(shot, i, this.ringWidth, d)) {
					timeOfAnyHit = tms;
					if (this.type != 1) {
						var loot = computeRingCash(i, undef, 0);
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
					}
					if (i == 0) {
						eyesMade++;
						eyesTotal++;
						eyeRun++;
						var bonus = eyeRun * eyeRunBonus;
						changeCash(this.dx, this.dy, bonus, true);
						particles.push(new Explosion(this.dx, this.dy, 5, this));
					}
					var z = this.type == 2 ? 1 : 2;
					var tones = "G4 D4 B4 G3 D3".split(" ");
					if ((i * z) % 2 == 0)
						Sound.push(tones[i * z / 2]);
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
	init: function(parent) {
		this.type = parent.type;
		this.timeHit = undef;
		var h = parent.hue + 0.20 * (rand() * 2 - 1);
		this.hitColor = this.type == 2
			? hue(h).shiftColor(white, rand() * 0.5)
			: hue(h);
	},
	
	draw: function(number, ringWidth) {
		var fade = (tms - this.timeHit) / 1200;
		var overlap = this.type == 2 ? 1.5 : -3;
		var outline = this.type == 2 ? ringWidth * 0.13 + 0.5 : 0;
		var width = this.type == 2 ? ringWidth + overlap - outline * 0.5 : ringWidth * 0.5;
		var radius = this.type == 2 ? ringWidth * (number + 0.5) - outline * 0.5 : ringWidth * (number + 0.25);
		if (isundef(this.timeHit)) {
			var color = this.type == 2 ? targetcolors[Math.floor(number / 2)] : black;
			g.setLineStyle(width, color);
			g.strokeCircle(0, 0, radius);
			// Draw outline.
			if (this.type == 2) {
				g.setLineStyle(outline, white);
				g.strokeCircle(0, 0, ringWidth * (number + 0.5) - outline * 0.5);
			}
		}
		else if (fade < 1) {
			var color = this.type == 2 ? white : this.hitColor.shiftColor(white, fade);
			g.setLineStyle(width, color.alpha(1 - fade));
			g.strokeCircle(0, 0, radius);
		}
		else {
			return; // Ring is destroyed and finished animating.
		}
	},
	
	collide: function(shot, number, ringWidth, d) {
		if (isundef(this.timeHit)) {
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
			: ((camw + radius < gob.dx)
				? gob.dx - camw - radius
				: 0),
		dy: (gob.dy < -radius) 
			? (radius + gob.dy) 
			: ((camh + radius < gob.dy)
				? gob.dy - camh - radius
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
		if (shots == 0 && xAlwaysShowPowerup) {
			power = xAlwaysShowPowerup;
		}
		this.power = power;
		this.hit = false;
		this.extra = 
			  power == 1 ? new PowerupStar(this)
			: power == 2 ? new PowerupEyeSet(this)
			: power == 3 ? new PowerupBigSet(this)
			: undef;
		
		var spacing = radius * 1.25;
		this.glassball = new Renderable(
			new Bounds(-spacing, -spacing, 2 * spacing, 2 * spacing),
			function() {
				g.drawGlassBall(0, 0, this.radius, black.alpha(0.2));
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
			g.setLineStyle(minRadius, color);
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
				this.extra = undef;
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
		g.drawStar(0, 0, this.radius, this.ad);
	},
	
	pickup: function() {
		numStarShots = starPowerNumShots;
	}
});

var PowerupEyeSet = Gob.extend({
	init: function(parent) {
		this.parent = parent;
		this.radius = parent.radius;
		this.eyes = [];
		times(eyePowerNumEyes, function() {
			this.eyes.push(new PowerupEye(this));
		}, this);
	},
	
	step: function() {
		this.eyes.invoke('step');
	},
	
	draw: function() {
		this.eyes.invoke('draw');
	},
	
	pickup: function() {
		this.eyes.invoke('pickup');
	}
});

var PowerupEye = Gob.extend({
	init: function(parent) {
		this.parent = parent;
		var s = targetSize(1);
		this.smallR = s.ringWidth;
		var radius = parent.radius;
		this.bigR = radius;
		var rs = this.bigR - this.smallR;
		var mag = radius * Math.sqrt(rand());
		var ang = rand() * Math.TAU;
		var p = cart(ang, mag);
		this.dx = p[0];
		this.dy = p[1];
		mag = (2 + rand()) * 0.062;
		ang = rand() * Math.TAU;
		p = cart(ang, mag);
		this.vx = p[0];
		this.vy = p[1];
		var s = targetSize(1);
		this.target = new Target(0, 0, 1, s.ringWidth, 1);
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
		this.target.draw();
		g.restore();
	},
	
	pickup: function() {
		var x = this.dx + this.parent.parent.dx;
		var y = this.dy + this.parent.parent.dy;
		if (!xEyeSetScoreNormal) {
			this.target.dx = x;
			this.target.dy = y;
			this.target.vx = this.vx;
			this.target.vy = this.vy;
			gobs.push(this.target);
			perms.push(this.target);
		}
	}
});

var PowerupBigSet = Gob.extend({
	init: function(parent) {
		this.parent = parent;
		this.radius = parent.radius;
		this.shots = [];
		times(bigPowerNumShots, function() {
			this.shots.push(new PowerupBig(this));
		}, this);
	},
	
	step: function() {
		this.shots.invoke('step');
	},
	
	draw: function() {
		this.shots.invoke('draw');
	},
	
	pickup: function() {
		numBigShots = bigPowerNumShots;
	}
});

var PowerupBig = Gob.extend({
	init: function(parent) {
		this.parent = parent;
		this.smallR = parent.radius * 0.25;
		var radius = parent.radius;
		this.bigR = radius;
		var rs = this.bigR - this.smallR;
		var mag = radius * Math.sqrt(rand());
		var ang = rand() * Math.TAU;
		var p = cart(ang, mag);
		this.dx = p[0];
		this.dy = p[1];
		mag = (1 + rand()) * 0.05 * (radius * 0.0133);
		ang = rand() * Math.TAU;
		p = cart(ang, mag);
		this.vx = p[0];
		this.vy = p[1];
		this.shot = new Shot(0, 0, 0, 0, this.smallR);
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
});

var Explosion = Gob.extend({
	init: function(dx, dy, streamers, parent) {
		this.dx = dx;
		this.dy = dy;
		this.timeStart = tms;
		var angle = rand() * Math.TAU;
		times(streamers, function(i) {
			particles.push(new Streamer(dx, dy, angle, parent));
			angle += Math.TAU / streamers;
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
			var c = black.alpha(alpha);
			grad.addColorStop(0, c.alpha(0));
			grad.addColorStop(0.1, c.alpha(0.04));
			grad.addColorStop(0.3, c.alpha(0.1));
			grad.addColorStop(0.5, c.alpha(0.4));
			grad.addColorStop(0.7, c.alpha(0.1));
			grad.addColorStop(0.9, c.alpha(0.04));
			grad.addColorStop(1, c.alpha(0));
			g.setLineStyle(width, grad);
			g.strokeCircle(0, 0, ringRadius);
		}
	}
});

var streamerWidth = 6;
var streamerLength = Math.floor(275 / targetMspfPhysics);

var Streamer = Gob.extend({
	init: function(dx, dy, angle, parent) {
		this.dx = dx;
		this.dy = dy;
		var mag = (1 + rand()) * 0.12;
		var p = cart(angle, mag);
		this.vx = p[0];
		this.vy = p[1];
		this.ang1da = rand() * Math.TAU;
		this.ang1va = (rand() - 0.5) * Math.TAU * 0.019;
		this.ang1r = rand() * 0.4;
		var h = parent.hue + 0.15 * (rand() * 2 - 1);
		this.color = hue(h);
		this.points = [];
		this.points.push([this.dx, this.dy]);
		this.dead = false;
		this.msSparks = 0;
		
		this.segmentColors = [];
		var cTail = white;
		times(streamerLength, function(i) {
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
			g.setLineStyle(streamerWidth, black, "round");
			this.points.each(function(v, i) {
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
		var mag = (1 + rand()) * 0.045;
		var ang = rand() * Math.TAU;
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
		
		var f = this.special ? 2 : 1;
		
		if (xScaleBubbles)
			f *= 3; // maxscale
		var maxcash = 160;
		var cashtoscale = function(cash) {
			return 0.8 + sign(cash) * cash / maxcash * 2.2;
		};
		
		this.textimage = new Renderable(
			new Bounds(-20 * f, -12 * f, 42 * f, 12.5 * f),
			function() {
				if (xScaleBubbles) {
					var s = cashtoscale(this.amount);
					g.scale(s, s);
				}
				if (this.special) {
					var color = 0 < this.amount ? "#15d015" : "#d01515";
					g.setFontStyle(18, color, "center");
					g.setLineStyle(5, black, "round");
					g.strokeAndFillText(withSign(this.amount), 0, 0);
				}
				else {
					g.setFontStyle(12, black, "center");
					g.setLineStyle(5, black, "round");
					g.fillText(withSign(this.amount), 0, 0);
				}
			}, this);
	},

	draw: function() {
		var dt = tms - this.timeCashGiven;
		var totalTime = 5000;
		var fadeTime = 2000;
		var opaqueTime = totalTime - fadeTime;
		if (dt < totalTime || !xFadeOutCashBubbles) {
			var alpha = Math.min(1, 1 - (dt - opaqueTime) / fadeTime);
			var oy = Math.min(1, dt / 500);
			if (xFadeOutCashBubbles)
				g.globalAlpha = alpha;
			this.textimage.key = this.amount;
			this.textimage.draw(0, -sign(this.amount) * (16 + oy * 29));
		}
	}
});

var Sink = Gob.extend({
	init: function(dxi, dyi) {
		this.dx = dxi;
		this.dy = dyi;
		this.color = black;
		this.msSparks = 0;
		this.power = 1;
		
		// Get the sparks flying so that it shows up right away.
		var preanimate = false;
		if (preanimate) {
			var backupDms = dms;
			dms = targetMspfPhysics;
			var steps = 1000 / dms;
			tms -= dms * steps;
			times(steps, function(i) {
				tms += dms;
				this.step();
			}, this);
			dms = backupDms;
		}
	},

	step: function() {
		// Generate some sparks.
		while (0 < this.msSparks) {
			this.msSparks -= 25;
			particles.push(new SinkSpark(this.dx, this.dy, this.color, this));
		}
		this.msSparks += dms;
	},

	draw: function() {
		var c = black;
		var r = 200;
		var grad = g.createRadialGradient(0, 0, 0, 0, 0, r);
		grad.addColorStop(0, c.alpha(0.4));
		grad.addColorStop(0.05, c.alpha(0.3));
		grad.addColorStop(0.12, c.alpha(0.2));
		grad.addColorStop(0.25, c.alpha(0.1));
		grad.addColorStop(0.5, c.alpha(0.05));
		grad.addColorStop(0.7, c.alpha(0.02));
		grad.addColorStop(0.9, c.alpha(0.01));
		grad.addColorStop(1, c.alpha(0));
		g.fillStyle = grad;
		g.fillCircle(0, 0, r);
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
		var sunk = (dSqrd <= maxRadius * maxRadius);
		
		// Affect shot.
		if (!sunk) {
			// TODO: Consider fixing to use dSqrd.
			// Twould be more accurate, and faster.
			// But, ox and oy are still needed somehow.
			var ox = this.dx - shot.dx;
			var oy = this.dy - shot.dy;
			var d = mag(ox, oy);
			// var den = Math.pow(d, 1.6) * 0.1;
			var den = Math.pow(d * 0.03, 2) * 10;
			if (den == 0) {
				sunk = true;
			}
			else {
				var force = dms / den;
				if (d - shot.radius * 0.5 < force) {
					sunk = true;
				}
				else {
					var fx = force * ox / d;
					var fy = force * oy / d;
					shot.vx += fx;
					shot.vy += fy;
				}
			}
		}
		
		if (sunk) {
			shot.dx = this.dx;
			shot.dy = this.dy;
			shot.vx = 0;
			shot.vy = 0;
			if (isundef(shot.timeStuck))
				shot.timeStuck = tms;
		}
		
		this.power = sunk ? 0.2 : 1;
	}
});

var SinkSpark = Gob.extend({
	init: function(x, y, color, parent) {
		this.parent = parent;
		this.isRing = rand() < 0.02;
		this.dx = x;
		this.dy = y;
		var mag = (1 + rand()) * 85;
		var ang = rand() * Math.TAU;
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
		var f = d * d * 0.182;
		if (f == 0) {
			this.dead = true;
			return;
		}
		f = dms * this.parent.power / f;
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
		var dx = this.oxPrev - this.ox;
		var dy = this.oyPrev - this.oy;
		if (this.isRing) {
			var d = mag(this.ox, this.oy);
			alpha = ((tms - this.timeCreated) / 8000) * Math.min(1, d / 100);
			g.globalAlpha = alpha;
			g.setLineStyle(mag(dx, dy), this.color);
			g.strokeCircle(0, 0, mag(this.ox, this.oy));
		}
		else {
			g.globalAlpha = alpha;
			g.setLineStyle(1.7, this.color);
			var lengthFactor = 3;
			g.strokeLine(this.oxPrev, this.oyPrev, lengthFactor * dx, lengthFactor * dy);
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
		if (!numStarShots)
			return;
		
		// Initialize member variables for collision detection to work.
		var z = computeShotZeroState();
		this.dx = z.dx;
		this.dy = z.dy;
		this.vx = z.vx;
		this.vy = z.vy;
		this.timeStuck = undef;
		
		// Draw.
		g.beginPath();
		g.moveTo(this.dx, this.dy);
		g.setLineStyle(1, "#720");
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
			// TODO add to 20 the predicted radius of the shot.
			if (isFallenFromVision(this, 20))
				break;
			
			// Collide with all game objects.
			var shot = this;
			gobs.invoke('collide', shot);
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
		this.ellipseA = this.gob.radius * 1;
		this.ellipseB = this.gob.radius * 1.4;
		this.spinability = 0.06;
		this.linearFriction = 0.015;
		this.angularFriction = 0.001;
		this.hit = 0;
		this.mass = 0;
		this.bounce = 10;
		this.cracks = [];
		this.sync();
	},

	sync: function() {
		this.gob.dx = this.dx;
		this.gob.dy = this.dy;
		this.gob.shotNotEnded = this.vx || this.vy || this.vangle;
	},

	step: function() {
		if (this.hit == this.gob.hitsToDie)
			return;

		this.moving = false;
		
		if (this.vx != 0 && this.vy != 0) {
			this.moving = true;
			var vxPrev = this.vx;
			var vyPrev = this.vy;
			var sSqrd = this.vx * this.vx + this.vy * this.vy;
			var sLimit = this.linearFriction * dms;
			if (sLimit * sLimit < sSqrd) {
				var s = Math.sqrt(sSqrd);
				this.vx -= vxPrev * sLimit / s;
				this.vy -= vyPrev * sLimit / s;
			}
			else {
				this.vx = 0;
				this.vy = 0;
			}
			this.dx += (this.vx + vxPrev) * dms * 0.5;
			this.dy += (this.vy + vyPrev) * dms * 0.5;
			
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
			if (afriction < Math.abs(this.vangle)) {
				this.vangle -= sign(this.vangle) * afriction;
			}
			else {
				this.vangle = 0;
			}
			this.angle += (this.vangle + vaPrev) * 0.5;
		}
		this.sync();
	},

	draw: function() {
		g.drawEgg(0, 0, this.ellipseA, this.ellipseB, this.gob.color, this.angle);
		g.save();
		g.rotate(this.angle);
		this.cracks.each(function(v) {
			g.save();
			g.translate(v.dx, v.dy);
			v.draw();
			g.restore();
		});
		if (!isundef(this.drawseg)) {
			var seg = this.drawseg;
			g.strokeStyle = '#f00';
			g.strokeLine(seg[0][0], seg[0][1], seg[1][0] - seg[0][0], seg[1][1] - seg[0][1]);
		}
		g.restore();
	},

	collide: function(shot) {
		if (!(shot instanceof Shot))
			return this.sync();
		
		if (isundef(shot.egglog))
			shot.egglog = [];
		if (shot.egglog[shots])
			return this.sync();
		
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
		//this.drawseg = [[x0, y0],[0, 0]];
		var seg = segEllipsePoint(ea, eb, x0, y0);
		
		// Check for hit.
		var dx = seg[0][0] - seg[1][0];
		var dy = seg[0][1] - seg[1][1];
		var dsqrd = sqr(dx, dy);
		var sr = shot.radius;
		//                  dist from shot to origin  < dist from ellipse wall to origin
		var isPointInside = sqr(seg[1][0], seg[1][1]) < sqr(seg[0][0], seg[0][1]);

		// If no hit, return.
		if (sr * sr < dsqrd && !isPointInside)
			return this.sync();

		// If this shot hit already, return.
		if (shot.egglog[shots])
			return this.sync();
		
		// Record hit.
		this.hit++;
		shot.egglog[shots] = true;
		Sound.push(this.gob.sound);
		
		// Compute normal.
		var ex = seg[0][0];
		var ey = seg[0][1];
		var sig = sign(seg[1][1]);
		var m = -sig * eb / (ea * ea) * ex / Math.sqrt(1 - ex * ex / (ea * ea));
		var p = normal(-m, 1);
		var nx = sig * p[0];
		var ny = sig * p[1];

		// Create crack in egg.
		this.cracks.push(new EggCrack(ex, ey, nx, ny, ea * 0.8));
		
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
		// Note: Here I assume that ea <= eb.
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

		this.sync();
	}
});

var EggCrack = Gob.extend({
	init: function(dx, dy, nx, ny, radiusOfArea) {
		this.dx = dx;
		this.dy = dy;
		this.nx = nx;
		this.ny = ny;
		this.radiusOfArea = radiusOfArea;
		this.mag = rand() * radiusOfArea * 2;
		var nextRadiusOfArea = radiusOfArea < this.mag
			? 2 * radiusOfArea - this.mag
			: this.mag;
		if (nextRadiusOfArea < 1) {
			this.children = [];
			return;
		}
		this.children = range(randInt(4)).map(function() {
			var nextn = cart(rand() * Math.TAU);
			return new EggCrack(0, 0, nextn[0], nextn[1], nextRadiusOfArea);
		}, this)
	},

	draw: function(width) {
		width = firstdef(width, this.mag * 0.05);
		this.children.each(function(v) {
			g.save();
			g.translate(this.mag * -this.nx, this.mag * -this.ny);
			v.draw(width * 0.75);
			g.restore();
		}, this);
		g.setLineStyle(width, "#ddd", "round");
		g.strokeLine(0, 0, this.mag * -this.nx, this.mag * -this.ny);
	}
});

var GiftEgg = Gob.extend({
	init: function(dxi, dyi) {
		this.radius = 22.5 * 4;
		this.color = "#06627a";
		this.sound = "hitgiftegg";
		this.hitsToDie = 3;
		var winfunction = function() {
			changeCash(this.dy, this.dy, giftEggBonus, true);
		};
		this.egg = new Egg(dxi, dyi, this, winfunction);
	},

	draw: function() {
		this.egg.draw();
	},

	step: function() {
		this.egg.step();
	},

	collide: function(shot) {
		this.egg.collide(shot);
	}
});

var ElectricEgg = Egg.extend({
	init: function(dxi, dyi) {
		this.radius = 45;
		this.color = black;
		this.sound = "hitelectricegg";
		this.hitsToDie = 3;
		var winfunction = function() {
			changeCash(this.dy, this.dy, giftEggBonus, true);
		};
		this.egg = new Egg(dxi, dyi, this, winfunction);
	},

	draw: function() {
		this.egg.draw();
	},

	step: function() {
		this.egg.step();
	},

	collide: function(shot) {
		this.egg.collide(shot);
	}
});

var MainEgg = Egg.extend({
	init: function(dxi, dyi) {
		this.radius = 67.5;
		this.color = "#f40";
		this.sound = "hitmainegg";
		this.hitsToDie = 3;
		var winfunction = function() {
			changeCash(this.dy, this.dy, giftEggBonus, true);
		};
		this.egg = new Egg(dxi, dyi, this, winfunction);
	},

	draw: function() {
		this.egg.draw();
	},

	step: function() {
		this.egg.step();
	},

	collide: function(shot) {
		this.egg.collide(shot);
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
		this.dx = (gamew - w) / 2;
		this.dy = (gameh - h) / 2;
		
		this.image = new Renderable(
			new Bounds(-6, -6, w + 12, h + 12),
			function() {
				g.drawDialog(0, 0, w, h, "#eb0");
				
				// Stats.
				g.setFontStyle(22);
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
				g.setLineStyle(4, black, "round");
				oy -= 18;
				g.strokeLine(35, oy, w - 70, 0);
				
				// Big number.
				g.setFontStyle(38, black, "center");
				ox = w / 2; oy = 208;
				g.setLineStyle(12, black, "round");
				var value = this.net;
				var color = (0 < value) ? "#0c0" : "#c00";
				var amount = Math.min(Math.abs(value) * 0.02, 1);
				g.fillStyle = white.shiftColor(color, amount);
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

	onKey: function(k, press) {
		if (xScreenDelays && time() - this.timeCreated < 200)
			return false;
		if (k == KeyEvent.DOM_VK_SPACE && press) {
			finishLevelSummary(this);
			return true;
		}
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
		this.dx = (gamew - w) / 2;
		this.dy = (gameh - h) / 2;
		
		this.image = new Renderable(
			new Bounds(-6, -6, w + 12, h + 12),
			function() {
				g.drawDialog(0, 0, w, h, "#444");
				
				// Try again message.
				g.setFontStyle(30, black, "center");
				var lh = 34;
				var ox, oy;
				ox = 135; oy = 52;
				if (didOverShoot) {
					g.fillText("Over shot!", ox, oy); oy += 44;
					g.setFontStyle(20, black, "center");
					g.fillText("Use less fuel", ox, oy); oy += lh;
					g.fillText("or aim lower", ox, oy); oy += lh;
				}
				else {
					g.fillText("Under shot!", ox, oy); oy += 44;
					g.setFontStyle(20, black, "center");
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

	onKey: function(k, press) {
		if (xScreenDelays && time() - this.timeCreated < 200)
			return false;
		if (k == KeyEvent.DOM_VK_SPACE && press) {
			finishRetryDialog(this);
			return true;
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
		this.dx = (gamew - w) / 2;
		this.dy = (gameh - h) / 2;
		
		this.image = new Renderable(
			new Bounds(-6, -6, w + 12, h + 12),
			function() {
				g.drawDialog(0, 0, w, h, "#444");
				
				// Try again message.
				g.setFontStyle(30, black, "center");
				var lh = 34;
				var ox, oy;
				ox = 135; oy = 52;
				if (didOverShoot) {
					g.fillText("Over shot!", ox, oy); oy += 44;
					g.setFontStyle(20, black, "center");
					g.fillText("Use less fuel", ox, oy); oy += lh;
					g.fillText("or aim lower", ox, oy); oy += lh;
				}
				else {
					g.fillText("Under shot!", ox, oy); oy += 44;
					g.setFontStyle(20, black, "center");
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

	onKey: function(k, press) {
		if (xScreenDelays && time() - this.timeCreated < 200)
			return false;
		if (k == KeyEvent.DOM_VK_SPACE && press) {
			finishEndTurnDialog(this);
			return true;
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
		this.dx = (gamew - w) / 2;
		this.dy = (gameh - h) / 2;
		
		this.image = new Renderable(
			new Bounds(-6, -6, w + 12, h + 12),
			function() {
				g.drawDialog(0, 0, w, h, "#625");
				
				// Score.
				g.setFontStyle(28, "#07f", "center");
				g.setLineStyle(5, black, "round");
				var msg = totalTargetHit + " Hits" + fill(eyesTotal / 45, "!");
				g.strokeAndFillText("Achieved", w / 2, 67);
				g.strokeAndFillText(msg, w / 2, 110);
				
				// Stats.
				g.setFontStyle(12, black, "center");
				g.fillText("Time Played: " + msToString(this.gameTime), w / 2, 175);
				g.fillText("Shots: " + shots, w / 2, 197);
				g.fillText("$ won: " + totalCashWon, w / 2, 219);
			}, this);
	},

	draw: function() {
		var alpha = (time() - this.timeCreated) / dialogFadeTime;
		if (alpha < 1) {
			g.globalAlpha = alpha;
		}
		this.image.draw(0, 0);
	},

	onKey: function(k, press) {
		if (xScreenDelays && time() - this.timeCreated < 200)
			return false;
		if (k == KeyEvent.DOM_VK_SPACE && press) {
			finishGameSummary(this);
			return true;
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
		this.dx = (gamew - w) / 2;
		this.dy = (gameh - h) / 2;
		
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
					grad.addColorStop(0, "#aaa");
					grad.addColorStop(1, white);
					g.fillStyle = grad;
					g.fillCircle(x, y, r);
				}
				
				g.setFontStyle(160, black, "center");
				g.fillText(stage, x, y + 70);
				
				g.setFontStyle(26, black, "center");
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

	onKey: function(k, press) {
		var tasty = press && tastyKey(k);
		if ((!xScreenDelays || 500 <= time() - this.timeCreated) && tasty)
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
		
		var w = gamew;
		var h = gameh;
		this.dx = (gamew - w) / 2;
		this.dy = (gameh - h) / 2;
		
		this.image = new Renderable(
			new Bounds(-6, -6, w + 12, h + 12),
			function() {
				g.fillStyle = black;
				g.fillRect(0, 0, w, h);
				g.setFontStyle(80, backgroundColor);
				g.fillText("Hello", gamew / 2 - 185, gameh / 2 + -10);
				g.fillText("Cannon", gamew / 2 - 185, gameh / 2 + 90 );
			}, this);
	},

	draw: function() {
		var alpha = (time() - this.timeCreated) / dialogFadeTime;
		if (alpha < 1) {
			g.globalAlpha = alpha;
		}
		this.image.draw(0, 0);
	},

	onKey: function(k, press) {
		var tasty = press && tastyKey(k);
		if ((!xScreenDelays || 500 <= time() - this.timeCreated) && tasty)
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
		var cedge = black;
		grad = this.createRadialGradient(x, y, 0, x, y, r * 1.2);
		grad.addColorStop(0.833, c);
		var ci = c.alpha(0.6); // Intensity of glow.
		grad.addColorStop(0.843, ci.alpha(1));
		grad.addColorStop(0.874, ci.alpha(0.5));
		grad.addColorStop(0.915, ci.alpha(0.24));
		grad.addColorStop(0.956, ci.alpha(0.1));
		grad.addColorStop(1, ci.alpha(0));
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
	drawGlassBall: function(x, y, r, color, shineAngle /* = 0 */) {
		var grad;
		
		var c = color;
		
		// Draw color.
		this.fillStyle = c;
		this.fillCircle(x, y, r);
		
		// Egg spots
		// ... todo...
		
		// Draw black edge accent and glow.
		var cedge = black;
		grad = this.createRadialGradient(x, y, 0, x, y, r * 1.2);
		grad.addColorStop(0.5, cedge.alpha(0));
		grad.addColorStop(0.75, cedge.alpha(0.075));
		grad.addColorStop(0.8, cedge.alpha(0.125));
		grad.addColorStop(0.833, cedge.alpha(0.225));
		var ci = c.alpha(0.6); // Intensity of glow.
		grad.addColorStop(0.843, ci.alpha(1));
		grad.addColorStop(0.874, ci.alpha(0.5));
		grad.addColorStop(0.915, ci.alpha(0.24));
		grad.addColorStop(0.956, ci.alpha(0.1));
		grad.addColorStop(1, ci.alpha(0));
		this.fillStyle = grad;
		this.fillCircle(x, y, r * 1.2);
		
		var light = white;

		var dist = r * 0.57;
		var angl = -firstdef(shineAngle, 0) + shineAngleOffset;
		var p = cart(angl, dist);
		var ox = p[0];
		var oy = p[1];
		
		// Draw general shine.
		grad = this.createRadialGradient(ox * 1.1, oy * 1.1, 0, ox * 0.55, oy * 0.55, r * 0.8);
		grad.addColorStop(0, light.alpha(0.3)); // Brightness.
		grad.addColorStop(1, light.alpha(0));
		this.fillStyle = grad;
		this.fillCircle(ox * 0.55, oy * 0.55, r * 0.8);
		
		// Draw reflection of light source.
		var ld = light.alpha(0.9); // Brightness.
		grad = this.createRadialGradient(ox, oy, 0, ox, oy, r * 0.4);
		grad.addColorStop(0, ld.alpha(1));
		grad.addColorStop(0.05, ld.alpha(1));
		grad.addColorStop(0.15, ld.alpha(0.9));
		grad.addColorStop(0.4, ld.alpha(0.43));
		grad.addColorStop(0.5, ld.alpha(0.2));
		grad.addColorStop(0.6, ld.alpha(0.1));
		grad.addColorStop(1, ld.alpha(0));
		this.fillStyle = grad;
		this.fillCircle(ox, oy, r * 0.4);
	},

	drawStar: function(x, y, r, rotation) {
		g.fillStyle = "#fc0".alpha(0.25);
		this.fillStar(x, y, r * 0.382 * 2, r * 2, 0.5 * rotation - Math.TAU * 0.25, 5);
		g.fillStyle = "#fc1";
		this.fillStar(x, y, r * 0.382, r, rotation - Math.TAU * 0.25, 5);
	},

	drawDialog: function(x, y, w, h, color) {
		var shine = white;
		var roundy = 5;
		this.fillStyle = shine.alpha(0.95);
		this.setLineStyle(12, color);
		
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
			times(4, function(i) {
				var alpha = (3 - i) * 0.1;
				this.strokeStyle = shine.alpha(alpha);
				this.lineWidth = (i + 1) * 2.25;
				this.strokeRoundRect(x - 2, y - 2, w, h, roundy);
			}, this);
		}
	}
});
