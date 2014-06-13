// Hello Cannon
// by Jeff Hollocher
//
// Big to do:
// star power should tally expected winnings
// new special field event: targets in a row
// fix fields to only ever have one of the following at a time: [1-2]sink, tonsoftargets, [2-5]targetsinarow
// Menus
// Victory
// Sound and artistic
// Username / Password
// Highscores in game
// Graphs
//
// To do:
// make eggs spill background color
// make target bullseyes grow background prettiness
// Add picture for death.
// Does drawing a line to nowhere (point) draw faster than arcing a circle? (at the very least, it's less calculations on my side)
// make fields smarter about ending: if ball is below, then check that it's accelerating down or at least moving linearly down. if ball is out of bounds left or right, likewise. linear movement defined as three movements in a row of equal length. acceleration defined as one movement followed by a larger one. (don't do my idea to finish as soon as no more scoring is possible. that just seems excessive and calls into question the idea of waiting at all before making the PressToContinue appear.)
// add pause feature
// Make splitting boss more likely to split toward center of screen.
// make all the sounds better
// if there are sinks, then make shot dust suck in instead of it's normal drift
// make final star shot trail off into transparency to lessen it's awesomeness and to make it clear it's the last one
// add highscores to game instead of in html outside the canvas page
//

var hellocannon = (function () {
"use strict";

// Debugging
var xShowFps = DEVMODE;
var xInfiniteStarPower = false;
var xInfiniteBigPower = false;
var xAlwaysSink = false;
var xBrowseFields = false;
var xAlwaysShowPowerup = 0;
var xJumpToField = 0;
var xFastPlay = false;
var xInvincible = false;
var xFullscreen = false;
var xDrawCanvasBoundingBox = false;
var xDontDrawParticles = false;
var xMultipleShots = false;
var xNonRandomSeed = false;
var xVariableFPS = false;
var xToggleSpriteCaching = false;
var xFloatyDust = true;
var xShininess = false;
var xBrowseDelay = true;

// General Setup
var gameCanvas;
var g;
var tPrevAnimatePhysics;
var dtPrevAnimatePhysics;
var tPrevUpdatePhysics;
var fpsPhysics;
var fPhysics;
var tTotalUpdatePhysics;
var tPrevUpdateGraphics;
var fpsGraphics;
var fGraphics;
var tTotalUpdateGraphics;
var targetMspfGraphics = 1000 / 60;
var targetMspfPhysics = xVariableFPS ? 0.1 : 1000 / 120;
var maxMspfPhysics = 50;
// total > screen > window > viewport > canvas > game > cam
var canvasw = 600; // in device space
var canvash = 320; // in device space
var gamew = 680; // in world space
var gameh = 420; // in world space
var camw;
var camh;
var defaultFontFace = "'Trebuchet MS', Helvetica, sans-serif";
var layers;
var black = "#000";
var white = "#fff";
var targetcolors = ["#fff535", "#fd1b14", "#41b7c8", black, white];
var dialogFadeTime = 250;
var targetPopTime = 400;
var backColor = "#ddd";
var events;
var cannonLength = 18;
var cannonThickness = 6;

// Tweaks / Mechanics
var worldspeed = 0.6;
var gravity = 0.000336;
var angleSteps = 141; // Should be odd so that cannon is able to be aligned perfectly horizontal.
var fuelMax = 100;
var fuelMin = 10;
var fuelStepSize = 5;
var fuelStepMax = (fuelMax / fuelStepSize);
var fuelStepMin = (fuelMin / fuelStepSize) - 1;
var shotCost = 25;
var starPowerInitCount = 3;
var eyePowerInitCount = 5;
var bigPowerInitCount = 4;
var bigShotRadius = 26;
var normalShotRadius = 1;
var redoMaxField = 5;
var sheenAngleOffset = 3.8;
var eggCash = 100;
var eyeRunBonus = 10;
var startCash = xJumpToField ? 2000 : 200;
var largestEggRadius = 32;

// State
var tms;
var dms;
var slowAccum;
var field;
var shots;
var cash;
var cashWonThisShot;
var cashChangeThisShot;
var fuelUsed;
var hits;
var cashWon;
var cannon;
var trajectory;
var fuelCost;
var gobs;
var particles;
var perms;
var isCannonFocused;
var isShotFired;
var gobsReadyToEndShot;
var humanReadyToEndShot;
var askIsHumanReadyToEndShot;
var timeOfLastFire;
var timeOfAnyHit;
var timeGameStart;
var timeFieldStart;
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
var lastTimePlayAdjustSound;
var scorehash;
var scorehashcount = undef;
var showOverHeadDisplay;
var didOverShoot;
var singleTarget;
var endFieldCompleted;
var debuginfo;
var fieldRedoneAlready;
var madeFinalGobsReadyCall;
var lastPowerup;
var stage;
var numfireeggs;

var lang = {
	level: function () { return "Level"; },
	cash: function () { return "Gold"; },
	fireto: function () { return "Fire to"; },
	tocontinue: function () { return "continue."; },
	overshot: function () { return "Over shot!"; },
	uselessfuel: function () { return "Use less fuel"; },
	aimlower: function () { return "or aim lower"; },
	undershot: function () { return "Under shot!"; },
	usemorefuel: function () { return "Use more fuel"; },
	aimhigher: function () { return "or aim higher"; },
	achieved: function () { return "Achieved"; },
	timeplayed: function () { return "Time Played"; },
	bullseyes: function () { return "Bullseyes"; },
	totalgoldwon: function () { return "Total Gold Won"; },
	hello: function () { return "Hello"; },
	cannon: function () { return "Cannon"; }
};

function init(elementId) {
	Sound.setsounds([
		"powerup adjustangle adjustpower firecannon",
		"D3 G3 B4 D4 G4",
		"sink targetpop newstage",
		"hitgiftegg hitelectricegg hitmainegg evilegg maineggsplit"
	].join(" ").split(" "));
	if (xNonRandomSeed) {
		Math.seedrandom(0);
	}
	gameCanvas = document.getElementById(elementId);
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
	fPhysics = 0;
	tTotalUpdatePhysics = 0;
	tPrevUpdateGraphics = undef;
	fpsGraphics = Math.round(1000 / targetMspfGraphics);
	fGraphics = 0;
	tTotalUpdateGraphics = 0;
	gobs = [];
	particles = [];
	perms = [];
	layers = [];
	layers.push(new LayerCamera());
	events = [];

	// Start engine.
	animatePhysics();
	animateGraphics();

	document.onkeydown = function (e) { onKey(e, true); };
	document.onkeyup = function (e) { onKey(e, false); };

	// Start game.
	newGame();
}

function pushEvent(foo, ms, thisArg, fooArgs) {
	events.push({
		fireTime: tms + ms,
		fun: foo,
		funArgs: fooArgs,
		thisArg: thisArg
	});
}

function stepEvents() {
	var groups = events.groupBy(function (v) {
		return v.fireTime <= tms ? "now" : "later";
	})
	events = !isundef(groups["later"])
		? groups["later"]
		: [];
	if (!isundef(groups["now"])) {
		groups["now"].each(function (v) {
			v.fun.apply(v.thisArg, v.fooArgs);
		});
	}
}

var Renderable = Class.extend({
	init: function (bounds, render, layer) {
		this.bounds = bounds;
		this.render = render;
		this.layer = layer;
		this.key = undef;
		this.useCanvas = true;
		this.keyRendered = undef;

		// Renderables appear blurry unless their cached images are scaled by
		// the same amount as the window so that the cached image is not up
		// or down sampled when drawn.
		this.focusScale = (1 / Renderable.prototype.scaleOfAreaToDeviceForFocus) || 1;
	},

	draw: function (x, y) {
		if (Renderable.prototype.dontUseSpriteCaching
			|| !this.useCanvas) {

			g.save();
			g.translate(x, y);
			this.render.call(this.layer, g);
			g.restore();
			return;
		}

		var PADDING = 1;
		var fs = this.focusScale;
		var ox = this.bounds.x - PADDING;
		var oy = this.bounds.y - PADDING;
		var isnewcanvas = isundef(this.canvas);

		if (this.keyRendered != this.key || isnewcanvas) {
			if (isnewcanvas) {
				this.canvas = document.createElement("canvas");
				this.canvas.width = Math.ceil(this.bounds.w / fs + 2 * PADDING);
				this.canvas.height = Math.ceil(this.bounds.h / fs + 2 * PADDING);
			}
			var gBackup = g;
			g = this.canvas.getContext("2d");
			if (!isnewcanvas) {
				g.clearRect(0, 0, this.canvas.width, this.canvas.height);
			}
			if (Renderable.prototype.drawCanvasBoundingBox) {
				g.strokeStyle = "#f00";
				g.strokeRect(0, 0, this.canvas.width, this.canvas.height);
			}
			g.setFontFace(gBackup.defaultFontFace, gBackup.defaultFontEmphasis);
			g.save();
			g.uscale(1 / fs);
			g.translate(-ox, -oy);
			this.render.call(this.layer);
			g.restore();
			g = gBackup;
			this.keyRendered = this.key;
		}

		g.save();
		g.uscale(fs);
		x = Math.round((ox + x) / fs);
		y = Math.round((oy + y) / fs);
		g.translate(x, y);
		g.drawImage(this.canvas, 0, 0);
		g.restore();
	}
});

function fitToScreen() {
	if (xFullscreen) {
		var vps = viewportSize();
		canvasw = vps.w;
		canvash = vps.h;
	}
	gameCanvas.width = canvasw;
	gameCanvas.height = canvash;

	// Non game area background.
	g.fillStyle = "#111";
	g.fillRect(0, 0, canvasw, canvash);

	var s, tx, ty;
	if (canvasw * gameh < canvash * gamew) {
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
	tx = Math.round(tx);
	ty = Math.round(ty);
	g.translate(tx, ty);
	g.uscale(s);

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

function changeCash(x, y, amt, isbonus) {
	if (0 < amt) {
		cashWonThisShot += amt;
	}
	cashChangeThisShot += amt;
	var bubble;
	if (isbonus) {
		bubble = new CashBubble(x, y - 20, amt, isbonus);
		particles.push(bubble);
	}
	else {
		bubble = new CashBubble(x, y, amt, isbonus);
		// Caller will add to particles.
	}
	return bubble;
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
	if (isundef(tPrevAnimatePhysics)) {
		dt = 0;
	}
	else {
		dt = t - tPrevAnimatePhysics;

		// Smooth out spikes of lag.
		if (dtPrevAnimatePhysics <= 500 && 500 < dt) {
			dt = 0;
		}
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
	requestAnimFrame(animateGraphics, gameCanvas);
}

function updatePhysics() {
	var t = time();
	if (!isundef(tPrevUpdatePhysics)) {
		tTotalUpdatePhysics += t - tPrevUpdatePhysics;
		fPhysics++;
		if (1000 < tTotalUpdatePhysics) {
			fpsPhysics = 0.5 * (fpsPhysics + fPhysics);
			fPhysics = 0;
			tTotalUpdatePhysics = tTotalUpdatePhysics % 1000;
		}
	}
	tPrevUpdatePhysics = t;
	stepPhysics();
}

function updateGraphics() {
	// Do nothing if world has not changed.
	if (gameCanvas.key === tms) {
		return;
	}
	gameCanvas.key = tms;

	var t = time();
	if (!isundef(tPrevUpdateGraphics)) {
		tTotalUpdateGraphics += t - tPrevUpdateGraphics;
		fGraphics++;
		if (1000 < tTotalUpdateGraphics) {
			fpsGraphics = 0.5 * (fpsGraphics + fGraphics);
			fGraphics = 0;
			tTotalUpdateGraphics = tTotalUpdateGraphics % 1000;
		}
	}
	tPrevUpdateGraphics = t;
	drawGraphics();

	// Toggle sprite caching.
	if (xToggleSpriteCaching) {
		Renderable.prototype.dontUseSpriteCaching = (Math.round(tms / 4000) % 2 == 0);
	}
}

function stepPhysics() {
	// Timing / slowing.
	dms = targetMspfPhysics;
	var slowForDramaticEffect = !isundef(timeOfAnyHit)
		? bind((tms - timeOfAnyHit) / 80, 0.05, 1)
		: 1;
	slowAccum += worldspeed * slowForDramaticEffect;
	while (1 <= slowAccum) {
		slowAccum -= 1;
		tms += dms;             // Clock
		stepEvents();           // Events
		layers.invoke("step");  // Layers
	}
}

function drawGraphics() {
	layers.invoke("tdraw");
	Sound.playall();
}

function newGame() {
	perms = [];
	gobs = [];
	particles = [];
	field = xJumpToField - 1;
	shots = field + 1;
	stage = 0;
	cash = startCash;
	isCannonFocused = false;
	fuelUsed = 0;
	hits = 0;
	cashWon = 0;
	cannon = new Cannon();
	trajectory = new Trajectory();
	cannon.fuelStep = Math.floor(fuelStepMax * 0.5);
	cannon.fuel = (cannon.fuelStep + 1) * fuelStepSize;
	cannon.angleStep = Math.floor(angleSteps * 0.75);
	cannon.angle = Math.TAU * 0.5 * (Math.floor(angleSteps / 2) - cannon.angleStep) / angleSteps;
	timeGameStart = time();
	scorehash = (timeGameStart & 0xffffffff);
	if (DEVMODE) {
		scorehashcount = 0;
	}
	numStarShots = xInfiniteStarPower ? starPowerInitCount : 0;
	numBigShots = xInfiniteBigPower ? bigPowerInitCount : 0;
	hitRun = 0;
	eyeRun = 0;
	eyesTotal = 0;
	slowAccum = 0;
	beginGame();
	isCannonFocused = true;
	changeAngle(4);
	changeFuel(-1);
	isCannonFocused = false;
	numfireeggs = {};
}

function initShot() {
	isCannonFocused = true;
	isShotFired = false;
	gobsReadyToEndShot = false;
	humanReadyToEndShot = false;
	askIsHumanReadyToEndShot = false;
	humanReadyToEndShot = false;
	timeFieldStart = tms;
	timeOfLastFire = undef;
	endFieldCompleted = false;
	madeFinalGobsReadyCall = false;
}

function redoField() {
	initShot();
	shots--;
	cashChangeThisShot = 0;
	particles = [];
}

function nextField() {
	field++;
	initShot();
	fieldRedoneAlready = false;
	gobs = [];
	particles = [];
	var prevStage = fieldToStage(field - 1);
	var nextStage = fieldToStage(field);
	camw = gameh + (gamew - gameh) * Math.min(nextStage, victoryStage) / victoryStage;
	camh = gameh;
	if (nextStage !== prevStage) {
		if (0 < nextStage) {
			Sound.push("newstage");
			stage = nextStage;
		}
	}
	beginField();
}

function beginField() {
	// Initialize field state.
	cashWonThisShot = 0;
	cashChangeThisShot = 0;
	hitsMade = 0;
	eyesMade = 0;
	showOverHeadDisplay = true;
	scorehash = ((scorehash * 485207) & 0xffffffff) ^ 385179316;
	if (DEVMODE) {
		scorehashcount++;
	}

	// Random cannon position.
	var cannonMinY = 65;
	var cannonMaxY = camh - 36;
	cannon.dx = 0;
	cannon.dy = cannonMinY + (field < stages[1].field
		? Math.floor(0.67 * (cannonMaxY - cannonMinY))
		: randInt(cannonMaxY - cannonMinY));

	// Random gob amounts.
	numSinks = xAlwaysSink ? 1 : 0;
	numTargets = 1;
	numPowerups = xAlwaysShowPowerup !== 0 ? 1 : 0;
	if (stages[2].field <= field && rand() < 0.14) {
		numSinks = (60 <= field && rand() < 0.17)
			? 2
			: 1;
	}
	if (stages[1].field <= field && rand() < 0.15) {
		numTargets = rand() < 0.15
			? Math.floor(camw * camh / 15500)
			: 3;
	}
	if (stages[1].field <= field && rand() < 0.10) {
		numPowerups = 1;
	}
	times(numSinks, function (i) {
		if (rand() < 0.30) {
			numTargets++;
		}
		if (rand() < 0.09) {
			numPowerups++;
		}
	});
	if (numTargets < numPowerups) {
		numTargets = numPowerups;
	}
	numTargets -= numPowerups;

	// Initialize gobs.
	times(numTargets, function () {
		var p = randXY();
		var s = targetSize();
		var goldeneye = 0.43 * sqr(cannon.dx - p[0], cannon.dy - p[1]) / sqr(camw, camh);
		goldeneye = 1 <= field && rand() < goldeneye;
		gobs.push(new Target(p[0], p[1], s.nRings, s.ringWidth, goldeneye));
	});

	// Save one target for tracking over/under shot.
	singleTarget = (field <= redoMaxField && numTargets === 1)
		? gobs[gobs.length - 1]
		: undef;

	times(numPowerups, function () {
		var p = randXY();
		var s = targetSize();
		var gobTar = new Target(p[0], p[1], s.nRings, s.ringWidth, false);
		var gobPow = new Powerup(p[0], p[1], gobTar.radius);
		gobPow.targetBuddy = gobTar;
		gobs.push(gobTar);
		gobs.push(gobPow);
	});
	times(numSinks, function () {
		var p = randXY();
		gobs.push(new Sink(p[0], p[1]));
	});
	gobs.push(trajectory);
	gobs.push(cannon);

	// Create bosses.
	if (field == stages[stage].field) {
		stages[stage].setup();
	}

	// Refresh perms.
	perms = perms.filter(function (v) {
		return !v.dead;
	});
	perms.each(function (v) {
		gobs.push(v);
	})
	if (xBrowseFields) {
		perms = [];
	}
}

function randXY() {
	var b = new Bounds(130, 50, camw - 140, camh - 60);
	return [
		b.x + randInt(b.w),
		b.y + randInt(b.h)
	];
}

function targetSize() {
	var sizes = table(
		{field:0, nRings:0, ringWidth:0}, [
		[0,       5,        25],
		[5,       5,        20],
		[10,      5,        15],
		[17,      4,        10],
		[50,      3,        7],
		[100,     2,        5],
		[167,     1,        5],
		[250,     1,        4]]
	);
	var s = sizes.findr(function (x) {
		return x.field <= field;
	});
	return s;
}

var Stage0 = Class.extend({
	init: function () {
		this.field = 0;
		this.completed = false;
	},

	setup: function () {}
});

var Stage1 = Class.extend({
	init: function () {
		this.field = 17;
		this.completed = false;
	},

	setup: function () {
		times(1, function () {
			var p = randXY();
			var egg = new SuicideEgg(p[0], p[1]);
			egg.stage = 1;
			perms.push(egg);
		});
	}
});

var Stage2 = Class.extend({
	init: function () {
		this.field = 50;
		this.completed = false;
	},

	setup: function () {
		times(1, function () {
			var p = randXY();
			var egg = new FireEgg(p[0], p[1]);
			perms.push(egg);
			egg.stage = 2;
			numfireeggs[2]++;
		});
	}
});

var Stage4 = Class.extend({
	init: function () {
		this.field = 100;
		this.completed = false;
	},

	setup: function () {
		times(1, function () {
			var p = randXY();
			var egg = new SpawnEgg(p[0], p[1]);
			perms.push(egg);
			egg.stage = 3;
		});
	}
});

var StageFinal = Class.extend({
	init: function () {
		this.field = 167;
		this.completed = false;
	},

	setup: function () {}
});

var stages = [new Stage0(), new Stage1(), new Stage2(), new Stage4(), new StageFinal()];
var victoryStage = 3;

function fieldToStage(n) {
	var fieldNums = stages.map(function (v) {
		return v.field;
	});
	var i = fieldNums.indexOf(n);
	return ~i ? i : fieldNums.sortedIndex(n) - 1;
}

function stageToField(n) {
	var fieldNums = stages.map(function (v) {
		return v.field;
	});
	return fieldNums[Math.min(n, fieldNums.length - 1)];
}

function computeRingCash(i) {
	return [40, 30, 20, 10, 10][i];
}

function computeShotZeroState() {
	var power = 0.11 + cannon.fuel * 0.0063;

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

var Drawable = Class.extend({
	step: function () {},
	draw: function () {},
	tdraw: function () {
		g.save();
		g.translate(this.dx, this.dy);
		this.draw();
		g.restore();
	}
});

var Layer = Drawable.extend({
	onKey: function (k) { return false; }
});

var Gob = Drawable.extend({
	collide: function (that) {},
	shotEndingSoon: function() {}
});

var LayerCamera = Layer.extend({
	init: function () {
		this.msCleanup = 0;
		this.dx = 0;
		this.dy = 0;
		this.keymap = {};
		this.keyconsumption = {};
		var BAR_HEIGHT = 30;

		this.overhead = new Renderable(
			new Bounds(0, 0, gamew, 20 + BAR_HEIGHT),
			function () {

				var proga = (gamew - (gamew - gameh) * 0.25) / 101;

				// Draw overhead background.
				g.fillStyle = black.alpha(0.2);
				g.fillRect(0, 0, camw, BAR_HEIGHT + proga);

				// Centerize the stats.
				g.save();
				g.translate(0.5 * (gamew - gameh) * Math.min(stage, victoryStage) / victoryStage, 0);

				// Draw score.
				g.setFontStyle(18, black, "center");
				g.fillText(lang.level() + " " + shots, 110, 8 + BAR_HEIGHT * 0.5);

				// Draw money.
				g.setFontStyle(18);
				g.fillText(cash + " " + lang.cash(), 240, 8 + BAR_HEIGHT * 0.5);
				if (cash <= 0) {
					g.fillStyle = "#d00";
					g.fillText(cash, 240, 8 + BAR_HEIGHT * 0.5);
				}

				// Done centering.
				g.restore();

				// Draw progress.
				g.save();
				if (stage > victoryStage) {
					g.translate(0.5 * (gamew - gameh) / victoryStage, 0);
				}
				times(101, function (i) {
					var firstfield = stages.any(function (v) {
						return v.field === i;
					});
					var bossfield = firstfield && i !== 0;
					var completed = i < field;
					var active = i === field;
					var w = proga;
					var h = w;
					var color = bossfield ? black : white;
					if (!active && (!bossfield || (completed && stages[stage].completed))) {
						color = bossfield
							? color.shiftColor(white, 0.5)
							: color.shiftColor(black, 0.1);
					}
					var a = 1;
					if (completed || active) {
						g.fillStyle = color;
						g.fillRect(a + i * w, BAR_HEIGHT, w - a * 2, h - a * 2);
					}
					g.setLineStyle(1, color, "round");
					g.strokeRect(a + i * w, BAR_HEIGHT, w - a * 2, h - a * 2);
					if (active) {
						g.fillStyle = "#fc0".alpha(0.55);
						g.fillRect(i * w - a, BAR_HEIGHT - 2 * a, w + a * 2, h + a * 2);
					}
				});
				g.restore();
			}, this);

		this.cashchange = new Renderable(
			new Bounds(0, 0, 100, 32),
			function () {
				var c = cashChangeThisShot;
				var color = 0 < c ? "#030" : "#300";
				if (false) {
					var d = numDigits(c);
					g.fillStyle = black.alpha(0.2);
					g.fillRoundRect(2, 2, 18 + d * 18, 30, 3);
				}
				g.setFontStyle(14, color);
				g.setLineStyle(4, black, "round");
				g.fillText(withSign(c), 10, 8 + BAR_HEIGHT * 0.5);
			}, this);

		this.fpsimage = new Renderable(
			new Bounds(0, 0, 38, 22),
			function () {
				var fps;
				g.setFontStyle("8pt " + defaultFontFace);
				fps = Math.round(fpsGraphics);
				g.fillText(fps + " fps", 2, 10);
				fps = Math.round(fpsPhysics);
				g.fillText(fps + " fps", 2, 20);
				if (xToggleSpriteCaching) {
					g.fillText("no cache", 2, 32);
				}
			}, this);

		this.fireagainimage = new Renderable(
			new Bounds(-50, -30, 100, 60),
			function () {
				g.setFontStyle(14, white, "center");
				g.setLineStyle(6, black, "round");
				g.strokeAndFillText(lang.fireto(), 0, -10)
				g.strokeAndFillText(lang.tocontinue(), 0, 10);
			}, this);
	},

	step: function () {
		if (0 < this.msCleanup) {
			this.msCleanup -= 1000;
			particles = particles.filter(function (v) {
				return !v.dead;
			});
		}
		this.msCleanup += dms;

		gobs.invoke("step");
		if (!xDontDrawParticles) {
			particles.invoke("step");
		}

		if (isShotFired && !gobsReadyToEndShot) {
			gobsReadyToEndShot = !gobs.any(function (v) {
				return v.shotNotEnded;
			});
			// Some gobs do something at the end of the shot.
			if (gobsReadyToEndShot && !madeFinalGobsReadyCall) {
				gobsReadyToEndShot = false;
				madeFinalGobsReadyCall = true;
				gobs.invoke("shotEndingSoon");
			}
		}

		var LONG_SHOT_TIMEOUT = 16000;
		askIsHumanReadyToEndShot = LONG_SHOT_TIMEOUT < tms - timeOfLastFire
			|| gobsReadyToEndShot;

		if (humanReadyToEndShot && !endFieldCompleted) {
			endFieldCompleted = true;
			if (field <= redoMaxField && cashWonThisShot === 0 && !fieldRedoneAlready) {
				// fieldRedoneAlready prevents two redos and also prevents two constructions of this layer.
				layers.push(new LayerRedoField());
			}
			else {
				fuelUsed += fuelCost;
				cashWon += cashWonThisShot;
				if (hitsMade === 0) {
					hitRun = 0;
				}
				if (eyesMade === 0) {
					eyeRun = 0;
				}
				isCannonFocused = false;
				humanReadyToEndShot = false;
				finishField();
			}
		}

		this.checkKeys();
	},

	checkKeys: function () {
		var delayfaster = 225;
		var delayfuel = 80;
		if (!isundef(this.keymap[KeyEvent.DOM_VK_UP])) {
			var t = time();
			var dt = t - this.keymap[KeyEvent.DOM_VK_UP];
			var newdt = dt - this.keyconsumption[KeyEvent.DOM_VK_UP];
			this.keyconsumption[KeyEvent.DOM_VK_UP] = dt;
			changeAngle(newdt * (dt < delayfaster ? 0.015 : 0.09));
		}
		if (!isundef(this.keymap[KeyEvent.DOM_VK_DOWN])) {
			var t = time();
			var dt = t - this.keymap[KeyEvent.DOM_VK_DOWN];
			var newdt = dt - this.keyconsumption[KeyEvent.DOM_VK_DOWN];
			this.keyconsumption[KeyEvent.DOM_VK_DOWN] = dt;
			changeAngle(-newdt * (dt < delayfaster ? 0.015 : 0.09));
		}
		if (!isundef(this.keymap[KeyEvent.DOM_VK_LEFT])) {
			var t = time();
			var dt = t - this.keymap[KeyEvent.DOM_VK_LEFT];
			var newdt = dt - this.keyconsumption[KeyEvent.DOM_VK_LEFT];
			if (dt < delayfaster) {
				this.keyconsumption[KeyEvent.DOM_VK_LEFT] = dt;
			}
			else {
				if (delayfuel <= newdt) {
					this.keyconsumption[KeyEvent.DOM_VK_LEFT] += delayfuel;
					changeFuel(-1);
				}
			}
		}
		if (!isundef(this.keymap[KeyEvent.DOM_VK_RIGHT])) {
			var t = time();
			var dt = t - this.keymap[KeyEvent.DOM_VK_RIGHT];
			var newdt = dt - this.keyconsumption[KeyEvent.DOM_VK_RIGHT];
			if (dt < delayfaster) {
				this.keyconsumption[KeyEvent.DOM_VK_RIGHT] = dt;
			}
			else {
				if (delayfuel <= newdt) {
					this.keyconsumption[KeyEvent.DOM_VK_RIGHT] += delayfuel;
					changeFuel(1);
				}
			}
		}
	},

	draw: function () {
		this.checkKeys();

		g.save();

		g.fillStyle = black;
		g.fillRect(0, 0, gamew, gameh);
		g.translate(Math.round((gamew - camw) * 0.5), 0);

		// Clip from game bounds to current bounds of field / world.
		g.beginPath();
		g.moveTo(0, 0);
		g.lineTo(camw, 0);
		g.lineTo(camw, camh);
		g.lineTo(0, camh);
		g.clip();

		// Draw background.
		g.fillStyle = backColor;
		g.fillRect(0, 0, camw, camh);

		// Draw game objects.
		var alldrawable = gobs.concat(particles);
		alldrawable.stableSortBy(function (a, b) { return a.z > b.z; });
		alldrawable.invoke("tdraw");

		if (showOverHeadDisplay) {
			this.overhead.key = [shots, cash, numStarShots, hits].join(",");
			this.overhead.draw(0, 0);

			// Draw cash won this field.
			if (isShotFired) {
				this.cashchange.key = cashChangeThisShot;
				var ox = 0.5 * (gamew - gameh) * Math.min(stage, victoryStage) / victoryStage;
				this.cashchange.draw(352 + ox, -2);
			}
		}

		// Draw fps.
		if (xShowFps) {
			this.fpsimage.key = fpsPhysics;
			this.fpsimage.draw(0, 0);
		}

		// Debug Info.
		if (!isundef(debuginfo)) {
			g.setFontStyle("20pt " + defaultFontFace);
			g.fillText(0.001 * Math.floor(debuginfo * 1000), 2, 40);
		}

		// Ready to end field text.
		if (askIsHumanReadyToEndShot) {
			var a = Math.TAU * tms / 3000;
			var radius = 5;
			var p = cart(a, radius);
			this.fireagainimage.draw(camw * 0.5 + p[0], camh * 0.9 + p[1]);
		}

		// Restore clip to game bounds.
		g.restore();
	},

	onKey: function (k, press) {
		if (!press) {
			this.checkKeys();
		}
		if (k === KeyEvent.DOM_VK_UP || k === KeyEvent.DOM_VK_DOWN || k === KeyEvent.DOM_VK_LEFT || k === KeyEvent.DOM_VK_RIGHT) {
			if (press) {
				if (isundef(this.keymap[k])) {
					this.keymap[k] = time();
					this.keyconsumption[k] = 0;

					if (k === KeyEvent.DOM_VK_LEFT) {
						changeFuel(-1);
					}
					if (k === KeyEvent.DOM_VK_RIGHT) {
						changeFuel(1);
					}
				}
			}
			else {
				this.keymap[k] = undef;
			}
			return true;
		}
		if (k === KeyEvent.DOM_VK_SPACE && press) {
			if (askIsHumanReadyToEndShot && !humanReadyToEndShot) {
				humanReadyToEndShot = true;
			}
			else {
				if (xBrowseFields) {
					if (!xBrowseDelay || tms - timeFieldStart > 40) {
						shots++;
						nextField();
					}
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

function finishField() {
	cash += cashChangeThisShot;
	cashChangeThisShot = 0;
	isCannonFocused = true;
	changeFuel(0);
	isCannonFocused = false;
	if (0 < cash || xInvincible) {
		nextField();
	}
	else {
		gameOver();
	}
}

function changeAngle(n) {
	if (!isCannonFocused) {
		return;
	}
	var prev = cannon.angleStep;
	var next = bind(prev + n, 0, angleSteps - 1);
	if (prev !== next) {
		cannon.angleStep = next;
		cannon.angle = Math.TAU * 0.5 * (Math.floor(angleSteps / 2) - next) / angleSteps;
		if (isundef(lastTimePlayAdjustSound) || 200 < time() - lastTimePlayAdjustSound) {
			lastTimePlayAdjustSound = time();
			if (n !== 0) {
				Sound.push("adjustangle");
			}
		}
	}
}

function changeFuel(n) {
	if (!isCannonFocused) {
		return;
	}
	var prev = cannon.fuelStep;
	var next = bind(prev + n, fuelStepMin, fuelStepMax - 1);
	if (prev !== next) {
		cannon.fuelStep = next;
		cannon.fuel = (next + 1) * fuelStepSize;
		if (n !== 0) {
			Sound.push("adjustpower");
		}
	}
}

var Cannon = Gob.extend({
	init: function (dxi, dyi) {
		this.z = 70;
		this.dx = dxi;
		this.dy = dyi;

		this.image = new Renderable(
			new Bounds(0, -45, 50, 90),
			function () {
				// Draw cannon barrel.
				g.save();
				g.rotate(this.angle);
				g.fillStyle = black;
				var thickness = numBigShots
					? bigShotRadius * 2
					: cannonThickness;
				g.fillRect(-9.5, -0.5 * thickness, 11 + cannonLength, thickness);
				g.fillRoundRect(cannonLength, -0.5 * (thickness + 5), 9, thickness + 5, 3);
				g.fillCircle(-9.5, 0, thickness * 0.5);
				g.restore();

				// Draw cannon base.
				g.setLineStyle(4, "#555");
				g.strokeCircle(0, 0, 9.5);
				g.fillStyle = "#555";
				g.fillCircle(0, 0, 2.5);

				// Draw fuel.
				g.setLineStyle(1.25);
				g.translate(2, numBigShots ? 27 : 23);
				times(fuelStepMax, function (i) {
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

	draw: function () {
		this.image.key = [this.angle, this.fuel, numBigShots].join(",");
		this.image.draw(0, 0);
	},

	fire: function () {
		if (!xMultipleShots && isShotFired) {
			return;
		}
		isShotFired = true;
		gobsReadyToEndShot = false;
		madeFinalGobsReadyCall = false;
		if (0 < numStarShots && !xInfiniteStarPower) {
			numStarShots--;
		}
		shots++;
		fuelCost = cannon.fuel;
		var z = computeShotZeroState();
		var radius = numBigShots ? bigShotRadius : normalShotRadius;
		var shot = new Shot(z.dx, z.dy, z.vx, z.vy, radius);
		if (0 < numBigShots && !xInfiniteBigPower) {
			numBigShots--;
		}
		// Put shot before cannon and after targets.
		gobs.remove(cannon);
		gobs.push(shot);
		gobs.push(cannon);
		Sound.push("firecannon");
		timeOfLastFire = tms;
		var bx = cannon.dx + 23;
		var by = cannon.dy + 52;
		changeCash(bx, by, -(fuelCost + shotCost), true);
	}
});

var Shot = Gob.extend({
	init: function (dxi, dyi, vxi, vyi, radius) {
		this.z = 60;
		this.dxPrevPrev = dxi;
		this.dyPrevPrev = dyi;
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
		this.msSparks = 0;
	},

	step: function () {
		this.dxPrevPrev = this.dxPrev;
		this.dyPrevPrev = this.dyPrev;
		this.dxPrev = this.dx;
		this.dyPrev = this.dy;
		this.dx += this.vx * dms;
		this.dy += (this.vy + gravity * dms * 0.5) * dms;
		this.vy += gravity * dms;

		// Step sparks.
		while (0 > this.msSparks && xFloatyDust) {
			this.msSparks += 45 * rand();
			var color = (this.radius === normalShotRadius ? black : "#340").alpha(0.55);
			particles.push(new ShotDust(this.dx, this.dy, color, this.radius));
		}
		this.msSparks -= dms;
		if (!xFloatyDust) {
			var color = (this.radius === normalShotRadius ? black : "#340").alpha(0.55);
			particles.push(new ShotDust(this.dx, this.dy, color, this.radius));
		}

		// Check for shot out of bounds.
		var edgeLimit = this.radius + 105;
		if (isFallenFromVision(this, edgeLimit)) {
			if (isundef(this.timeFallenFromVision)) {
				this.timeFallenFromVision = tms;
			}
		}
		else {
			this.timeFallenFromVision = undef;
		}

		// Check all conditions for end of field.
		var outOfBoundsTime = numSinks ? 2000 : 500;
		var sunkShotTimeout = 2500;
		var fieldOver = false;
		fieldOver = fieldOver || !isundef(this.timeStuck) && (sunkShotTimeout < tms - this.timeStuck);
		fieldOver = fieldOver || !isundef(this.timeFallenFromVision) && (outOfBoundsTime < tms - this.timeFallenFromVision);
		if (fieldOver) {
			gobs.remove(this);
		}

		// Collide with all game objects.
		var shot = this;
		gobs.invoke("collide", shot);
	},

	draw: function () {
		var f = (tms - this.timeStuck) / 1700;

		if (!isundef(this.timeStuck)
			&& 1 < f) {

			if (!this.sunk) {
				Sound.push("sink");
			}
			this.sunk = true;
		}

		if (this.sunk) {
			return;
		}

		var color = this.radius === normalShotRadius ? black : "#340";
		var srad = this.radius;

		if (!isundef(this.timeStuck)) {
			color = color.shiftColor("#f00", f);
			srad = this.radius * ((1 - f * 0.3) + 0.2 * (f * rand() - 0.5));
		}

		// Glow.
		var c = this.radius === normalShotRadius ? "#777" : "#860";
		var r = srad + 20;
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
		g.fillCircle(0, 0, srad);

		// Shine.
		g.fillStyle = white;
		g.fillCircle(-srad * 0.4, -srad * 0.4, srad * 0.2);
	},

	scoring: function () {
		return 1;
	}
});

function eyeHitMade(dx, dy, parent) {
	eyesMade++;
	eyesTotal++;
	eyeRun++;
	if (1 < eyeRun) {
		var bonus = (eyeRun - 1) * eyeRunBonus;
		changeCash(dx, dy, bonus, true);
		particles.push(new Explosion(dx, dy, parent, eyeRun - 1));
	}
}

var ShotDust = Gob.extend({
	init: function (x, y, color, radius) {
		this.z = 40;
		if (xFloatyDust) {
			var mag = rand() * radius;
			var ang = rand() * Math.TAU;
			var p = cart(ang, mag);
			this.dx = x + p[0];
			this.dy = y + p[1];
			mag = rand() * 0.0035;
			ang = rand() * Math.TAU;
			p = cart(ang, mag);
			this.vx = p[0];
			this.vy = p[1];
		}
		else {
			this.dx = x;
			this.dy = y;
		}
		this.timeCreated = tms;
		this.color = color;
		this.dead = false;
		this.radius = 2 * rand();
		this.lifetime = 7000 * (rand() + 0.4);
		if (!xFloatyDust) {
			this.radius = radius;
			this.lifetime = radius === normalShotRadius
				? 4000
				: 2000;
		}
	},

	step: function () {
		if (xFloatyDust) {
			this.dx += this.vx * dms;
			this.dy += this.vy * dms;
		}
	},

	draw: function () {
		var alpha = 1 - ((tms - this.timeCreated) / this.lifetime);
		if (0.1 < alpha) {
			g.fillStyle = this.color;
			g.globalAlpha = alpha;
			g.fillCircle(0, 0, this.radius);
		}
		else {
			this.dead = true;
		}
	}
});

var Target = Gob.extend({
	init: function (dxi, dyi, nRings, ringWidth, powerupeye) {
		this.z = 10;
		this.dx = dxi;
		this.dy = dyi;
		this.ringWidth = ringWidth;
		this.radius = ringWidth * (nRings - 0.5);
		this.hit = false;
		this.hue = rand();
		this.rings = range(nRings).map(function () {
			return new Ring(this);
		}, this);
		this.popTime = tms + (xBrowseFields ? -targetPopTime : rand() * 800);
		this.popSoundYet = false;
		this.powerupeye = powerupeye;
	},

	step: function () {
	},

	draw: function () {
		// Draw rings, beginning with outside ring (why?).
		this.rings.eachr(function (v, i) {
			var pow = this.powerupeye && i === 0;
			v.draw(i, this.ringWidth, pow);
		}, this);
	},

	collide: function (shot) {
		if (!shot.scoring()) {
			return;
		}

		var x0 = shot.dxPrev;
		var y0 = shot.dyPrev;
		var x1 = shot.dx;
		var y1 = shot.dy;
		var dx = this.dx;
		var dy = this.dy;
		var dSqrd = sqrPointSeg(dx, dy, x0, y0, x1, y1);

		var maxRadius = shot.radius + this.radius;
		if (dSqrd <= maxRadius * maxRadius) {
			if (!this.hit) {
				this.hit = true;
				hitsMade++;
				hits++;
				hitRun++;
			}
			var d = Math.sqrt(dSqrd);
			this.rings.each(function (v, i) {
				if (v.collide(shot, i, this.ringWidth, d)) {
					timeOfAnyHit = tms;
					var loot = computeRingCash(i);
					var bub = changeCash(shot.dx, shot.dy, loot, false);
					if (!isundef(this.bubble)) {
						this.bubble.amount += bub.amount;
					}
					else {
						this.bubble = bub;
						particles.push(bub);
					}
					if (i === 0) {
						if (this.powerupeye) {
							eyesMade += eyePowerInitCount - 1;
							eyesTotal += eyePowerInitCount - 1;
							eyeRun += eyePowerInitCount - 1;
						}
						eyeHitMade(this.dx, this.dy, this);
					}
					var tones = "G4 D4 B4 G3 D3".split(" ");
					Sound.push(tones[i]);
				}
			}, this);
		}

		if (this === singleTarget) {
			if (shot.dxPrev < this.dx && this.dx <= shot.dx) {
				didOverShoot = (shot.dy < this.dy);
			}
		}
	}
});

var Ring = Gob.extend({
	init: function (parent) {
		this.timeHit = undef;
	},

	draw: function (number, ringWidth, powerupeye) {
		var fade = (tms - this.timeHit) / 1200;
		var width = ringWidth * 0.5;
		var radius = ringWidth * (number + 0.25);
		if (isundef(this.timeHit)) {
			var color = powerupeye
				? "#f0c000"
				: black;
			g.setLineStyle(width, color);
			g.strokeCircle(0, 0, radius);
		}
		else if (fade < 1) {
			var color = white.alpha(1 - fade);
			g.setLineStyle(width, color.alpha(1 - fade));
			g.strokeCircle(0, 0, radius);
		}
		else {
			return; // Ring is destroyed and finished animating.
		}
	},

	collide: function (shot, number, ringWidth, d) {
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
	return outby.dx !== 0 || 0 < outby.dy;
}

var Powerup = Gob.extend({
	init: function (dxi, dyi, radius) {
		var NUMPOWERUPTYPES = 2;
		var power = 1 + randInt(NUMPOWERUPTYPES);
		while (power === lastPowerup && NUMPOWERUPTYPES > 1) {
			// Reroll, making two in a row of the same less likely.
			power = 1 + randInt(NUMPOWERUPTYPES);
		}
		lastPowerup = power;

		this.z = 20;
		this.dx = dxi;
		this.dy = dyi;
		this.radius = radius;
		if (field === 0 && xAlwaysShowPowerup !== 0) {
			power = xAlwaysShowPowerup;
		}
		this.power = power;
		this.hit = false;
		this.extra =
			  power === 1 ? new PowerupStar(this)
			: power === 2 ? new PowerupBigSet(this)
			: undef;

		var spacing = radius * 1.25;
		this.glassball = new Renderable(
			new Bounds(-spacing, -spacing, 2 * spacing, 2 * spacing),
			function () {
				g.drawGlassBall(0, 0, this.radius, black.alpha(0.2));
			}, this);
	},

	step: function () {
		if (!isundef(this.extra)) {
			this.extra.step();
		}
	},

	draw: function () {
		if (this.hit) {
			return;
		}

		var pop = (tms - this.targetBuddy.popTime) / targetPopTime;

		if (pop <= 0) {
			return;
		}

		if (pop < 1) {
			g.uscale(1 - (1 - pop) * (1 - pop));
		}

		var color = (this.power === 1) ? "#fc0" : "#0f4";

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
		if (!isundef(this.extra)) {
			this.extra.draw(0, 0);
		}

		if (xShininess) {
			this.glassball.draw(0, 0);
		}
	},

	collide: function (shot) {
		if (!shot.scoring()) {
			return;
		}

		var x0 = shot.dxPrev;
		var y0 = shot.dyPrev;
		var x1 = shot.dx;
		var y1 = shot.dy;
		var dx = this.dx;
		var dy = this.dy;
		var dSqrd = sqrPointSeg(dx, dy, x0, y0, x1, y1);

		var maxRadius = shot.radius + this.radius;
		if (dSqrd <= maxRadius * maxRadius) {
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
	init: function (parent) {
		this.parent = parent;
		this.radius = parent.radius;
		this.ad = 0;
		this.av = 0.0005;
	},

	step: function () {
		this.ad += this.av * dms;
	},

	draw: function () {
		g.drawStarPower(0, 0, this.radius, this.ad);
	},

	pickup: function () {
		numStarShots = starPowerInitCount;
	}
});

var PowerupBigSet = Gob.extend({
	init: function (parent) {
		this.parent = parent;
		this.radius = parent.radius;
		this.shots = [];
		times(bigPowerInitCount, function () {
			this.shots.push(new PowerupBig(this));
		}, this);
	},

	step: function () {
		this.shots.invoke("step");
	},

	draw: function () {
		this.shots.invoke("draw");
	},

	pickup: function () {
		numBigShots = bigPowerInitCount;
	}
});

var PowerupBig = Gob.extend({
	init: function (parent) {
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

	step: function () {
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

	draw: function () {
		g.save();
		g.translate(this.dx, this.dy);
		this.shot.draw();
		g.restore();
	}
});

var PowerupBigSet = Gob.extend({
	init: function (parent) {
		this.parent = parent;
		this.radius = parent.radius;
		this.shots = [];
		times(bigPowerInitCount, function () {
			this.shots.push(new PowerupBig(this));
		}, this);
	},

	step: function () {
		this.shots.invoke("step");
	},

	draw: function () {
		this.shots.invoke("draw");
	},

	pickup: function () {
		numBigShots = bigPowerInitCount;
	}
});

var Explosion = Gob.extend({
	init: function (dx, dy, parent, nstreamers) {
		this.z = 30;
		this.dx = dx;
		this.dy = dy;
		this.timeStart = tms;
		this.type = 0;
		var angle = rand() * Math.TAU;
		times(nstreamers, function (i) {
			var color = hue(parent.hue + 0.2 * (rand() * 2 - 1));
			particles.push(new Streamer(dx, dy, angle, color, this.type));
			angle += Math.TAU / nstreamers;
		}, this);
	},

	draw: function () {
		var age = tms - this.timeStart;

		// Draw ring of smoke.
		if (false && 0 < age) {
			var ringRadius = age * 0.13;
			var width = 30;
			if (ringRadius <= width * 0.5) {
				width = ringRadius * 2;
			}
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
	init: function (dx, dy, angle, color, type) {
		this.dx = dx;
		this.dy = dy;
		var mag = (1 + rand()) * 0.12;
		var p = cart(angle, mag);
		this.vx = p[0];
		this.vy = p[1];
		this.ang1da = rand() * Math.TAU;
		this.ang1va = (rand() - 0.5) * Math.TAU * 0.019;
		this.ang1r = rand() * 0.4;
		this.type = type;
		this.color = color;
		this.points = [];
		this.points.push([this.dx, this.dy]);
		this.dead = false;
		this.msSparks = 0;

		// Cache shades of color.
		this.segmentColors = [];
		var cTail = white;
		times(streamerLength, function (i) {
			var alpha = i / streamerLength;
			this.segmentColors[i] = this.color.shiftColor(cTail, 1 - alpha).alpha(alpha);
		}, this);
	},

	step: function () {
		if (this.dead) {
			return;
		}

		// Step streamer.
		this.dx += this.vx * dms;
		this.dy += (this.vy + gravity * dms * 0.5) * dms;
		this.vy += gravity * dms;
		this.ang1da += this.ang1va * dms;
		var p = cart(this.ang1da, dms * this.ang1r);
		this.dx += p[0];
		this.dy += p[1];
		if (streamerLength <= this.points.length) {
			this.points.shift();
		}
		this.points.push([this.dx, this.dy]);

		// Check bounds - death conditions.
		this.dead = isFallenFromVision(this, 30);

		// Step sparks.
		while (0 > this.msSparks && this.type === 0) {
			this.msSparks += 20;
			particles.push(new StreamerSpark(this.dx, this.dy, this.color));
		}
		this.msSparks -= dms;
	},

	draw: function () {
		if (this.dead) {
			return;
		}

		// Draw streamer.
		g.save();
		g.translate(-this.dx, -this.dy);
		var prev = this.points[0];
		var len = this.points.length;
		if (1 < len) {
			g.setLineStyle(streamerWidth, black, "round");
			this.points.each(function (v, i) {
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

var StreamerSpark = Gob.extend({
	init: function (x, y, color) {
		this.dx = x;
		this.dy = y;
		var mag = (1 + rand()) * 0.05;
		var ang = rand() * Math.TAU;
		var p = cart(ang, mag);
		this.vx = p[0];
		this.vy = p[1];
		this.timeCreated = tms;
		this.color = color;
		this.dead = false;
	},

	step: function () {
		this.dx += this.vx * dms;
		this.dy += (this.vy + gravity * dms * 0.5) * dms;
		this.vy += gravity * dms;
	},

	draw: function () {
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
	init: function (dxi, dyi, amount, isbonus) {
		this.z = 80;
		this.dx = dxi;
		this.dy = dyi;
		this.amount = amount;
		this.isbonus = isbonus;
		this.tbirth = tms;

		var f = 2;

		var maxcash = 160;
		var cashtoscale = function (cash) {
			return 0.8 + sign(cash) * cash / maxcash * 2.2;
		};

		this.textimage = new Renderable(
			new Bounds(-20 * f, -11 * f, 42 * f, 13 * f),
			function () {
				var text = this.isbonus
					? withSign(this.amount)
					: this.amount;
				var color = 0 < this.amount ? "#15d015" : "#d01515";
				g.setFontStyle(18, color, "center");
				g.setLineStyle(5, black, "round");
				g.strokeAndFillText(text, 0, 0);
			}, this);
	},

	draw: function () {
		var dt = tms - this.tbirth;
		var oy = Math.min(1, dt / 500);
		this.textimage.key = this.amount;
		this.textimage.draw(0, -sign(this.amount) * (16 + oy * 29));
	}
});

var Sink = Gob.extend({
	init: function (dxi, dyi) {
		this.z = 0;
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
			times(steps, function (i) {
				tms += dms;
				this.step();
			}, this);
			dms = backupDms;
		}
	},

	step: function () {
		// Generate some sparks.
		while (0 > this.msSparks) {
			this.msSparks += 25;
			particles.push(new SinkSpark(this.dx, this.dy, this.color, this));
		}
		this.msSparks -= dms;
	},

	draw: function () {
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

	collide: function (shot) {
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
			if (den === 0) {
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
			if (isundef(shot.timeStuck)) {
				shot.timeStuck = tms;
			}
		}

		this.power = sunk && isundef(shot.timeStuck) ? 0.2 : 1;
	}
});

var SinkSpark = Gob.extend({
	init: function (x, y, color, parent) {
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

	step: function () {
		if (this.dead) {
			return;
		}
		var d = mag(this.ox, this.oy);
		var f = d * d * 0.182;
		if (f === 0) {
			this.dead = true;
			return;
		}
		f = dms * this.parent.power / f;
		this.oxPrev = this.ox;
		this.oyPrev = this.oy;
		this.ox += -this.ox * f;
		this.oy += -this.oy * f;
		if (sign(this.oxPrev) !== sign(this.ox)) {
			this.ox = 0;
		}
		if (sign(this.oyPrev) !== sign(this.oy)) {
			this.oy = 0;
		}
	},

	draw: function () {
		if (this.dead) {
			return;
		}
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

var Trajectory = Gob.extend({
	init: function () {
		this.z = 50;
		// To get it translated correctly as all gobs are before draw() is called.
		this.dx = 0;
		this.dy = 0;
		this.radius = numBigShots > 0 ? bigShotRadius : normalShotRadius;
	},

	draw: function () {
		if (numStarShots === 0) {
			return;
		}

		var ticksPerDash = Math.floor(45 / targetMspfPhysics);

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
			if (drawDash !== drawDashPrev) {
				if (drawDash) {
					g.lineTo(this.dx, this.dy);
				}
				else {
					g.moveTo(this.dx, this.dy);
				}
			}
			distTraveled += mag(ddx, ddy);
			ticksTraveled++;
			drawDashPrev = drawDash;
			if (ticksTraveled % ticksPerDash === 0) {
				drawDash = !drawDash;
			}

			// Check end of shot conditions.
			if (distLimit < distTraveled) {
				break;
			}
			var edgeLimit = this.radius + 105;
			if (isFallenFromVision(this, edgeLimit)) {
				break;
			}

			// Collide with all game objects.
			var shot = this;
			gobs.invoke("collide", shot);
			iters++;
		}
		g.stroke();
		dms = backupDms;

		// To get it translated correctly as all gobs are before draw() is called:
		this.dx = 0;
		this.dy = 0;
	},

	scoring: function () {
		return false;
	}
});

var Egg = Gob.extend({
	init: function (dxi, dyi, gob) {
		gob.z = 25;
		gob.eyeStyle = 0;
		this.dx = dxi;
		this.dy = dyi;
		this.vx = 0;
		this.vy = 0;
		this.angle = 0;
		this.vangle = 0;
		this.gob = gob;
		this.ellipseA = this.gob.radius * 1;
		this.ellipseB = this.gob.radius * 1.4;
		this.spinability = 0.06;
		this.linearFriction = 0.015;
		this.angularFriction = 0.001;
		this.mass = 0;
		this.bounce = 10;
		this.sync();
		var rbound = -this.ellipseB * 1.35;
		this.eggimage = new Renderable(
			new Bounds(-rbound, -rbound, 2 * rbound, 2 * rbound),
			function() {
				g.save();
				var color = this.gob.color;
				if (!isundef(this.gob.tdeath)) {
					color = white;
				}
				g.drawEggBoss(0, 0, this.ellipseA, this.ellipseB, color, this.angle, this, this.gob.eyeStyle, this.gob.eyeColor);

				// Health bar.
				if (0 < this.gob.health && this.gob.health < this.gob.healthStart ) {
					var y = 15;
					var w = 36;
					var h = 8;
					g.fillStyle = white;
					g.fillRect(-w * 0.5, y, w, h);
					g.fillStyle = "#700";
					var f = this.gob.health / this.gob.healthStart;
					g.fillRect(-w * 0.5, y, w * f, h);
					g.setLineStyle(1.75, "#333");
					g.strokeRect(-w * 0.5, y, w, h);
				}
				g.restore();
			}, this);
	},

	draw: function () {
		g.save();
		var color = this.gob.color;
		if (!isundef(this.gob.tdeath)) {
			color = white;
			g.globalAlpha = Math.max(0, 1 - (tms - this.gob.tdeath) / 5000);
		}

		this.eggimage.useCanvas = !isundef(this.gob.tdeath);
		this.eggimage.key = [color, this.angle, this.gob.health].join(",");
		this.eggimage.draw(0, 0);

		g.save();
		g.rotate(this.angle);
		if (!isundef(this.drawseg)) {
			var seg = this.drawseg;
			g.setLineStyle(1, "#f00");
			g.strokeLine(seg[0][0], seg[0][1], seg[1][0] - seg[0][0], seg[1][1] - seg[0][1]);
		}
		g.restore();

		g.restore();
	},

	sync: function () {
		this.gob.dx = this.dx;
		this.gob.dy = this.dy;
		this.gob.shotNotEnded = isundef(this.gob.tdeath)
			&& (this.vx || this.vy || this.vangle || this.gob.eyeStyle !== 0);
	},

	step: function () {
		if (!isundef(this.gob.tdeath)) {
			return;
		}

		if (this.vx !== 0 && this.vy !== 0) {
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
			if (outby.dx !== 0) {
				this.vx = -this.vx;
				this.dx -= outby.dx;
			}
			if (outby.dy !== 0) {
				this.vy = -this.vy;
				this.dy -= outby.dy;
			}
		}

		if (this.vangle !== 0) {
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

	collide: function (shot) {
		if (!isundef(this.gob.tdeath)) {
			this.sync();
			return;
		}

		if (!(shot instanceof Shot)) {
			this.sync();
			return;
		}

		var minTimeBetweenHits = 1000;
		if (tms - this.thit < minTimeBetweenHits) {
			this.sync();
			return;
		}

		// TODO: First check bounding circles.

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

		var ex = seg[0][0];
		var ey = seg[0][1];

		// Compute normal.
		var p = normalize(dx, dy);
		var nx = -p[0];
		var ny = -p[1];

		// If no hit, return.
		if (sr * sr < dsqrd && !isPointInside) {
			this.sync();
			return;
		}

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

		// Sync mechanics of egg.
		this.sync();

		// Record hit.
		this.thit = tms;
		var damage = mag(ps[0][0], ps[0][1]);
		damage = 0.9 + Math.min(damage, 1.8);
		this.gob.onhit(damage);
	}
});

var paindelay = 2000;

var SuicideEgg = Gob.extend({
	init: function (dxi, dyi) {
		this.radius = largestEggRadius * 0.5;
		this.color = "#f0f";
		this.eyeColor = black;
		this.health = 5;
		this.healthStart = this.health;
		this.cash = 90;
		this.egg = new Egg(dxi, dyi, this);
		this.tbirth = tms;
	},

	draw: function () {
		this.egg.draw();
	},

	step: function () {
		this.egg.step();
	},

	collide: function (shot) {
		this.egg.collide(shot);
	},

	onhit: function (damage) {
		Sound.push("hitgiftegg");
		this.health -= damage;
		changeCash(this.dx, this.dy, this.cash, true);
		if (this.health <= 0) {
			this.tdeath = tms;
			this.dead = true;
			stages[this.stage].completed = true;
		}
		else {
			this.eyeStyle = 1;
			pushEvent(function () {
				this.eyeStyle = 0;
			}, paindelay, this);
		}
	},

	shotEndingSoon: function() {
		if (isundef(this.egg.thit) || this.egg.thit < timeFieldStart) {
			this.eyeStyle = 2;
			pushEvent(function () {
				this.health -= 1.25;
				if (this.health <= 0) {
					this.tdeath = tms;
					this.dead = true;
					stages[this.stage].completed = true;
				}
				else {
					this.eyeStyle = 1;
					pushEvent(function () {
						this.eyeStyle = 0;
					}, 500, this);
				}
			}, 700, this);
		}
	}
});

var FireEgg = Egg.extend({
	init: function (dxi, dyi) {
		this.radius = largestEggRadius * 0.75;
		this.color = "#f40";
		this.eyeColor = black;
		this.health = 5;
		this.healthStart = this.health;
		this.cash = 250;
		this.damage = -90;
		this.egg = new Egg(dxi, dyi, this);
		this.tbirth = tms;
	},

	draw: function () {
		this.egg.draw();
	},

	step: function () {
		this.egg.step();
	},

	collide: function (shot) {
		this.egg.collide(shot);
	},

	onhit: function (damage) {
		Sound.push("hitelectricegg");
		this.health -= damage;
		if (this.health <= 0) {
			changeCash(this.dx, this.dy, this.cash, true);
			this.tdeath = tms;
			this.dead = true;
			if (this.stage !== 4) {
				numfireeggs[this.stage]--;
				if (numfireeggs[this.stage] === 0) {
					stages[this.stage].completed = true;
				}
			}
		}
		else {
			this.eyeStyle = 1;
			pushEvent(function () {
				this.eyeStyle = 0;
			}, paindelay, this);
		}
	},

	shotEndingSoon: function() {
		if ((isundef(this.egg.thit) || this.egg.thit < timeFieldStart)
			&& this.tbirth <= timeFieldStart) {

			Sound.push("evilegg");
			var dx = this.dx;
			var dy = this.dy;
			this.egg.vangle = 0.45;
			this.egg.sync();
			var amt = this.damage;
			this.eyeStyle = 2;
			pushEvent(function () {
				changeCash(dx, dy, this.damage, true);
			}, 1000, this);
			pushEvent(function () {
				this.eyeStyle = 0;
			}, 4000, this);
		}
	}
});

var SpawnEgg = Egg.extend({
	init: function (dxi, dyi) {
		this.radius = largestEggRadius;
		this.color = black;
		this.eyeColor = white;
		this.health = 15;
		this.healthStart = this.health;
		this.cash = 250;
		this.egg = new Egg(dxi, dyi, this);
	},

	draw: function () {
		this.egg.draw();
	},

	step: function () {
		this.egg.step();
	},

	collide: function (shot) {
		this.egg.collide(shot);
	},

	onhit: function (damage) {
		Sound.push("hitmainegg");
		this.health -= damage;
		if (this.health <= 0) {
			if (this.cash !== 0) {
				changeCash(this.dx, this.dy, this.cash, true);
				stages[4].completed = true;
			}
			this.tdeath = tms;
			this.dead = true;
		}
		else {
			this.eyeStyle = 1;
			pushEvent(function () {
				this.eyeStyle = 0;
			}, paindelay, this);
		}
	},

	shotEndingSoon: function() {
		if (isundef(this.egg.thit) || this.egg.thit < timeFieldStart) {
			Sound.push("maineggsplit");
			var eg = new FireEgg(this.dx, this.dy);
			var mag = 0.055;
			var ang = rand() * Math.TAU;
			var p = cart(ang, mag);
			var realFriction = eg.egg.linearFriction;
			eg.egg.linearFriction = 0;
			eg.egg.angle = this.egg.angle;
			eg.egg.vx = p[0];
			eg.egg.vy = p[1];
			eg.egg.sync();
			perms.remove(this);
			var me = gobs.remove(this);
			perms.push(eg);
			gobs.push(eg);
			perms.push(me);
			gobs.push(me);
			this.eyeStyle = 2;
			pushEvent(function () {
				eg.egg.vx = 0;
				eg.egg.vy = 0;
				eg.egg.linearFriction = realFriction;
				eg.egg.sync();
				this.eyeStyle = 0;
			}, 3000, this);
		}
	}
});

function withSign(n) {
	return (0 < n ? "+" : "") + n
}

function numDigits(n) {
	return n === 0 ? 1 : 1 + Math.floor(Math.log(Math.abs(n)) / Math.LN10);
}

var LayerRedoField = Layer.extend({
	init: function () {
		this.timeCreated = time();
		isCannonFocused = false;
		fieldRedoneAlready = true;

		var w = 270;
		var h = 150;
		this.dx = (gamew - w) / 2;
		this.dy = (gameh - h) / 2;

		this.image = new Renderable(
			new Bounds(-6, -6, w + 12, h + 12),
			function () {
				g.drawDialog(0, 0, w, h, "#444");

				// Try again message.
				g.setFontStyle(30, black, "center");
				var lh = 34;
				var ox, oy;
				ox = 135; oy = 52;
				if (didOverShoot) {
					g.fillText(lang.overshot(), ox, oy); oy += 44;
					g.setFontStyle(20, black, "center");
					g.fillText(lang.uselessfuel(), ox, oy); oy += lh;
					g.fillText(lang.aimlower(), ox, oy); oy += lh;
				}
				else {
					g.fillText(lang.undershot(), ox, oy); oy += 44;
					g.setFontStyle(20, black, "center");
					g.fillText(lang.usemorefuel(), ox, oy); oy += lh;
					g.fillText(lang.aimhigher(), ox, oy); oy += lh;
				}
			}, this);
	},

	draw: function () {
		var alpha = (time() - this.timeCreated) / dialogFadeTime;
		if (alpha < 1) {
			g.globalAlpha = alpha;
		}
		this.image.draw(0, 0);
	},

	onKey: function (k, press) {
		if (k === KeyEvent.DOM_VK_SPACE && press) {
			finishRedoDialog(this);
			return true;
		}
		return false;
	}
});

function finishRedoDialog(layer) {
	layers.remove(layer);
	redoField();
}

function gameOver() {
	layers.push(new LayerGameSummary());
}

var LayerGameSummary = Layer.extend({
	init: function () {
		this.gameTime = time() - timeGameStart;
		this.timeCreated = time();
		isCannonFocused = false;

		// Create score from game.
		var score = {};
		score.name = nameFieldValue.replace(/^\s+|\s+$/g,"");;
		score.timeFinished = time();
		score.timePlayed = score.timeFinished - timeGameStart;
		score.eyes = eyesTotal;
		score.gold = cashWon;
		score.shots = shots;
		score.scorehash = scorehash;
		if (DEVMODE) {
			if (scorehashcount != shots && !xJumpToField) {
				alert("ERROR: scorehash out of sync " + scorehashcount + " " + shots);
			}
		}
		addGameScore(score);

		var w = 200;
		var h = 250;
		this.dx = (gamew - w) / 2;
		this.dy = (gameh - h) / 2;

		this.image = new Renderable(
			new Bounds(-6, -6, w + 12, h + 12),
			function () {
				g.drawDialog(0, 0, w, h, "#625");

				// Score.
				g.setFontStyle(28, "#07f", "center");
				g.setLineStyle(5, black, "round");
				var msg = lang.level() + " " + shots + "" + fill(shots / 45, "!");
				g.strokeAndFillText(lang.achieved(), w / 2, 67);
				g.strokeAndFillText(msg, w / 2, 110);

				// Stats.
				g.setFontStyle(12, black, "center");
				g.fillText(lang.timeplayed() + ": " + msToString(this.gameTime), w / 2, 175);
				g.fillText(lang.bullseyes() + ": " + eyesTotal, w / 2, 197);
				g.fillText(lang.totalgoldwon() + ": " + cashWon, w / 2, 219);
			}, this);
	},

	draw: function () {
		var alpha = (time() - this.timeCreated) / dialogFadeTime;
		if (alpha < 1) {
			g.globalAlpha = alpha;
		}
		this.image.draw(0, 0);
	},

	onKey: function (k, press) {
		if (k === KeyEvent.DOM_VK_SPACE && press) {
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
	beginField();
}

function beginGame() {
	showOverHeadDisplay = false;
	layers.push(new LayerGameIntro());
}

var LayerGameIntro = Layer.extend({
	init: function () {
		this.gameTime = time() - timeGameStart;
		this.timeCreated = time();

		var w = gamew;
		var h = gameh;
		this.dx = (gamew - w) / 2;
		this.dy = (gameh - h) / 2;

		this.image = new Renderable(
			new Bounds(-6, -6, w + 12, h + 12),
			function () {
				g.fillStyle = black;
				g.fillRect(0, 0, w, h);

				// Draw egg.
				var a = 175;
				var b = a * 1.5;
				g.fillStyle = "#222";
				g.save();
				g.translate(gamew / 2, gameh / 2);
				g.rotate(Math.TAU / 4);
				g.fillEgg(a, b);
				g.restore();

				g.setFontStyle(80, backColor);
				g.fillText(lang.hello(), gamew / 2 - 185, gameh / 2 + -10);
				g.fillText(lang.cannon(), gamew / 2 - 185, gameh / 2 + 90);
			}, this);
	},

	draw: function () {
		var alpha = (time() - this.timeCreated) / dialogFadeTime;
		if (alpha < 1) {
			g.globalAlpha = alpha;
		}
		this.image.draw(0, 0);
	},

	onKey: function (k, press) {
		var tasty = press && tastyKey(k);
		if (tasty) {
			finishGameIntro(this);
		}
		return tasty;
	}
});

function finishGameIntro(layer) {
	layers.remove(layer);
	nextField();
}

appendtoclass(CanvasRenderingContext2D, {

	// Draws with total render radius of r * 1.25
	drawGlowingGlassBall: function (x, y, r, color) {
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

	drawEggBoss: function (x, y, a, b, color, angle, spotcacheobj, eyeStyle, eyeColor) {
		var SPOT_KEY = "__CanvasRenderingContext2D.drawEggBoss_spotcache";
		var spots = spotcacheobj[SPOT_KEY];
		if (isundef(spots)) {
			spots = [];
			spotcacheobj[SPOT_KEY] = spots;
		}

		if (!(a > 0 && b > 0)) {
			return;
		}

		this.save();
		this.translate(x, y);
		this.rotate(angle);

		this.fillStyle = black.alpha(0.1);
		[0, 0.1, 0.2, 0.3].each(function (v) {
			var f = a * v;
			this.fillEgg(a + f, b + f);
		}, this);

		this.fillStyle = black;
		this.fillEgg(a, b);

		this.fillStyle = color.alpha(0.5);
		[0, 0.03125, 0.0625, 0.125, 0.25, 0.5].each(function (v) {
			var f = a * v;
			this.fillEgg(a - f, b - f);
		}, this);

		var eyey = 0.2 * b;
		g.setLineStyle(0.09 * a, eyeColor, "round");
		this.fillStyle = eyeColor;
		[-1, 1].each(function (s) {
			if (eyeStyle === 0) {
				this.fillCircle(s * 0.34 * a, eyey, 0.14 * a);
			}
			else if (eyeStyle === 1) {
				var ex = 0.15 * a * s;
				var el1 = 0.16 * a * s;
				var ey = eyey;
				var el2 = 0.18 * a * s;
				var eh = 0.1 * a;
				g.strokeLine(ex, ey, el1, 0);
				g.strokeLine(ex + el1, ey, el2, eh);
				g.strokeLine(ex + el1, ey, el2, -eh);
			}
			else if (eyeStyle === 2) {
				var ex = 0.19 * a * s;
				var ey = eyey + 0.05 * a;
				var el = 0.34 * a * s;
				var eh = 0.3 * a;
				g.strokeLine(ex, ey, el, -eh);
				this.fillCircle(s * 0.34 * a, eyey, 0.11 * a);
			}
		}, this);

		this.restore();
	},

	fillEgg: function (a, b) {
		var f = 1.55; // fat end control point distance
		var p = 0.90; // pointy end control point distance
		this.beginPath();
		this.moveTo(0, b);
		this.bezierCurveTo(-f * a,  b, -p * a, -b, 0, -b);
		this.bezierCurveTo( p * a, -b,  f * a,  b, 0,  b);
		this.closePath();
		this.fill();
	},

	// Draws with total render radius of r * 1.25
	drawGlassBall: function (x, y, r, color, shineAngle /* = 0 */) {
		var grad;

		if (r < 0) {
			return;
		}

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
		var angl = -firstdef(shineAngle, 0) + sheenAngleOffset;
		var p = cart(angl, dist);
		var ox = p[0];
		var oy = p[1];

		// Draw general shine.
		try {
			grad = this.createRadialGradient(ox * 1.1, oy * 1.1, 0, ox * 0.55, oy * 0.55, r * 0.8);
		}
		catch (err) {
			log(err);
			log("ERROR!: r="+r+" ox="+ox+" oy="+oy);
		}
		grad.addColorStop(0, light.alpha(0.3)); // Brightness.
		grad.addColorStop(1, light.alpha(0));
		this.fillStyle = grad;
		this.fillCircle(ox * 0.55, oy * 0.55, r * 0.8);

		// Draw reflection of light source.
		if (xShininess) {
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
		}
	},

	drawStarPower: function (x, y, r, rotation) {
		this.fillStyle = "#fc0".alpha(0.25);
		this.fillStar(x, y, r * 0.382 * 2, r * 2, 0.5 * rotation - Math.TAU * 0.25, 5);
		this.fillStyle = "#fc1";
		this.fillStar(x, y, r * 0.382, r, rotation - Math.TAU * 0.25, 5);
		// this.setLineStyle(0.5 + r / 40);
		// this.strokeStar(x, y, r * 0.382, r, rotation - Math.TAU * 0.25, 5);
	},

	drawDialog: function (x, y, w, h, color) {
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
			times(4, function (i) {
				var alpha = (3 - i) * 0.1;
				this.strokeStyle = shine.alpha(alpha);
				this.lineWidth = (i + 1) * 2.25;
				this.strokeRoundRect(x - 2, y - 2, w, h, roundy);
			}, this);
		}
	}
});

return {
	init: init
};

})();
