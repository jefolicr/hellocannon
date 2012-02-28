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
// bosses
// double radius of bullseyes
// give colors of archery, for kix, only slightly (#fff535, #fd1b14, #41b7c8, #000000, #ffffff)
// increase screen size at higher stages
// make dialog boxes not shiny cuz it looks lame
// make dialog boxes fade on/off (fast)
// make bonuses always on top of targets (yay!)
// make long shots have a change of getting a 'plain' bonus of +100
// make subtle radial gradient backgrounds for dialog boxes
//

"use strict";

// Debugging.
var xShowFps = false;
var xAlwaysTrajectory = false;
var xAlwaysSink = false;
var xAlwaysBonus = false;
var xScoreNewStyle = false;
var xPracticeShots = false;
var xBrowseLevels = false;
var xLevelRedo = false;
var xJumpToStage = 1;
var xFastPlay = false;
var xInvincible = false;
var xAlwaysShowBoss = false;
var xFullscreen = false;
var xShowCanvasEdges = false;
var xDontDrawParticles = true;
var xMultipleShots = false;
var xSlowPhysics = false;
var xNoScreenDelays = true;

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
var showdebuginfo = '';

// Bounds.
var shotRadius = 5;
var ringWidthAvg = 5.2;
var barHeight = 40;
var cannonMinY = 25 + barHeight;
var cannonMaxY = gameCanvasH - 36;
var targetMinX = 130;
var targetMaxX = gameCanvasW - 10;
var targetMinY = 10 + barHeight;
var targetMaxY = gameCanvasH - 10;

// Mechanics.
var physics = xSlowPhysics ? 0.2 : 0.6;
var gravity = 0.000336 * physics * physics;
var angleSteps = 141; // Must be odd.
var fuelMax = 100;
var fuelStepn = 5;
var fuelSteps = (fuelMax / fuelStepn);
var shotCost = 25;
var starPowerTurns = 3;
var eyePowerAmount = 4;
var greenBalls = 4;
var longShotTimeout = 15000;
var levelRedoMax = 10;
var shineAngle = 3.8;

// State.
var tms; // total ms time
var dms; // change ms time for current physics tick
var slowAccum;
var shots;
var gold;
var goldThisTurn;
var totalFuelUsed;
var totalTargetHit;
var totalGoldWon;
var cannon;
var shotStartTime;
var trajectory;
var fuelCost;
var gobs;
var particles;
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
var numTargetBonuses;
var numSinks;
var timePlayAdjustSound;
var progress;
var practiceShot;
var stage;
var firstLevelOfStage;
var showOverHeadDisplay;
var endingLongShot;
var didOverShoot;
var singleTarget;
var turnOver;

function initHellocannon() {
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
	layers = [];
	gobs = [];
	particles = [];
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
	
	// Renderable scale equalization.
	Renderable.prototype.scale = s;
	
	// Set other Renderable properties.
	Renderable.prototype.showCanvasEdges = xShowCanvasEdges;
}

function changeGold(g) {
	gold += g;
}

function setFont(f /*, color, align */) {
	g.font = (typeof f === "number")
		? "bold " + f + "pt " + fontFace
		: f;
	g.fillStyle = arguments[1] || "#000";
	g.textAlign = arguments[2] || "left";
}

function setLine(width /*, color, cap */) {
	g.lineWidth = width;
	g.strokeStyle = arguments[1] || "#000";
	g.lineCap = arguments[2] || "butt";
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

(function () {
	// Courtasy of paulirish.com
	// shim layer with setTimeout fallback

	function fallbackRequestAnimationFrame(/* function */ callback, /* DOMElement */ element) {
		window.setTimeout(callback, targetMspfGraphics);
	}

	window.requestAnimFrame = (function() {
		return  window.requestAnimationFrame		|| 
				window.webkitRequestAnimationFrame || 
				window.mozRequestAnimationFrame	|| 
				window.oRequestAnimationFrame	  || 
				window.msRequestAnimationFrame	 || 
				fallbackRequestAnimationFrame;
	})();
})();

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
	var slowFactor = (tms - timeOfAnyHit) / 120;
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
	play_all_multi_sound();
}

var blankStage = function() {
	// Do nothing.
};

var setStage2 = function() {
	var p = randXY();
	var g = new BossEgg(p[0], p[1]);
	gobs.push(g);
	perms.push(g);
}

var stages = (function() {
	var stages = table([
		['level', 'medal',     'boss'],
		[0,       "Wooden",    blankStage],
		[10,      "Bronze",    setStage2],
		[30,      "Silver",    blankStage],
		[60,      "Gold",      blankStage],
		[100,     "Platinum",  blankStage],
		[130,     null,        blankStage],
		[200,     null,        blankStage],
		[300,     null,        blankStage],
		[500,     null,        blankStage],
		[1000,    null,        blankStage],
	]);
	
	forNum(stages.length, function(i) {
		var s = stages[i];
		s['stage'] = i + 1;
		var next = stages[i + 1];
		s['numlevels'] = (next != undefined)
			? next['level'] - s['level']
			: -1;
	});
	
	return stages;
})();

function newGame() {
	stage = xJumpToStage;
	perms = [];
	gobs = [];
	particles = [];
	shots = stages[xJumpToStage]['level'];
	gold = 200;
	isCannonFocused = false;
	totalFuelUsed = 0;
	totalTargetHit = 0;
	totalGoldWon = 0;
	cannon = new Cannon();
	trajectory = new Trajectory();
	cannon.fuelStep = Math.floor(fuelSteps * 0.5);
	cannon.fuel = (cannon.fuelStep + 1) * fuelStepn;
	cannon.angleStep = Math.floor(angleSteps * 0.75);
	cannon.angle = Math.PI * (Math.floor(angleSteps / 2) - cannon.angleStep) / angleSteps;
	timeGameStart = time();
	progress = (timeGameStart & 0xffffffff);
	starPower = 0;
	hitRun = 0;
	eyeRun = 0;
	eyesTotal = 0;
	slowAccum = 1;
	beginGame();
	isCannonFocused = true;
	changeAngle(1);
	changeAngle(1);
	changeAngle(1);
	changeAngle(1);
	changeAngle(1);
	changeAngle(1);
	changeAngle(1);
	changeAngle(1);
	changeAngle(1);
	// changeFuel(1);
	// changeFuel(1);
	// changeFuel(1);
	// changeFuel(1);
	// changeFuel(1);
	// changeFuel(1);
	// changeFuel(1);
	// changeFuel(1);
	// changeFuel(1);
	isCannonFocused = false;
}

function retryShot() {
	turnOver = false;
	isCannonFocused = true;
	isCannonFired = false;
	shots--;
}

function nextShot() {
	turnOver = false;
	isCannonFocused = true;
	isCannonFired = false;
	goldThisTurn = 0;
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
		beginShot();
}

function beginShot() {
	var boss;
	if (firstLevelOfStage)
		stages[stage - 1]['boss']();
	endingLongShot = false;
	showOverHeadDisplay = true;
	cannon.dx = 0;
	practiceShot = (shots < 4) & xPracticeShots;
	if (practiceShot)
		declarePracticeShot();
	if (shots < 10)
		cannon.dy = cannonMinY + 2 * 0.3333 * (cannonMaxY - cannonMinY);
	else
		cannon.dy = cannonMinY + randInt(cannonMaxY - cannonMinY);
	numSinks = xAlwaysSink ? 1 : 0;
	numTargets = 1;
	numTargetBonuses = xAlwaysBonus ? 1 : 0;
	if (30 <= shots && rand() < 0.16)
		numSinks = (60 <= shots && rand() < 0.165) ? 2 : 1;
	if (10 <= shots && shots < 30 && rand() < 0.35)
		numTargets = 2;
	if (30 <= shots && rand() < 0.16)
		numTargets = (30 <= shots && rand() < 0.155) ? 10 : 3;
	if (10 <= shots && rand() < 0.09)
		numTargetBonuses = 1;
	if (firstLevelOfStage)
		numTargets += stage - 1;
	if (xAlwaysTrajectory)
		starPower = 99999;
	forNum(numSinks, function(i) {
		if (rand() < 0.5)
			numTargets++;
		if (rand() < 0.09)
			numTargetBonuses++;
	});
	forNum(numTargets, createTarget);
	// Save single target for tracking over/under shot.
	singleTarget = (shots <= levelRedoMax && numTargets == 1)
		? gobs[gobs.length - 1]
		: null;
	forNum(numTargetBonuses, createTargetBonus);
	forNum(numSinks, createSink);
	gobs.push(trajectory);
	gobs.push(cannon);
	hitsMade = 0;
	eyesMade = 0;
	timeTurnStart = tms;
	var livePerms = [];
	perms.forEach(function(v) {
		if (!v.dead) {
			livePerms.push(v);
			gobs.push(v);
		}
	});
	perms = livePerms;
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
		[0,       4,        36.4],
		[5,       4,        26.0],
		[10,      3,        26.0],
		[20,      3,        15.6],
		[30,      3,        13.0],
		[40,      3,        10.4],
		[50,      3,        9.1],
		[60,      2,        7.8],
		[70,      2,        6.5],
		[80,      2,        5.85],
		[90,      2,        5.2],
		[100,     1,        4.68],
	]);
	return sizes.lastval(function(x) {
		return x['level'] <= shots;
	});
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

function createTargetBonus() {
	var p = randXY();
	var s = targetSize();
	var radius = 4 + s.ringWidth * (s.nRings - 0.75);
	var bonus = (rand() < 0.5) ? 1 : 0;
	gobs.push(new TargetBonus(p[0], p[1], radius, bonus));
}

function createPermBonus() {
	var p = randXY();
	var pb = new PermBonus(p[0], p[1]);
	perms.push(pb);
	gobs.push(pb);
}

var Layer = (function() {
	
	function Layer() { }
	
	Layer.prototype.step = function() { }
	Layer.prototype.draw = function() { }
	Layer.prototype.onKeyPress = function(k) { return false; }
	Layer.prototype.onKeyRelease = function(k) { return false; }
	
	return Layer;
})();

var Gob = (function() {
	
	function Gob() { }
	
	Gob.prototype.step = function() { }
	Gob.prototype.draw = function() { }
	Gob.prototype.collide = function(that) { }
	
	return Gob;
})();

var LayerGame = (function() {
	
	LayerGame.extend(Layer);
	
	var msCleanup;

	function LayerGame() {
		msCleanup = 0;
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

				// Draw gold.
				setFont(18);
				g.fillText(gold + " Gold", 250, 23);
				if (gold <= 0) {
					g.fillStyle = "#d00";
					g.fillText(gold, 250, 23);
				}
				
				// Draw star power.
				if (starPower) {
					g.save();
					g.translate(200, 15);
					g.fillStyle = "#000";
					g.fillCircle(0, 0, 12);
					g.fillStyle = "#fc0";
					g.drawStar(0, 0, 12, 0);
					g.restore();
				}
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
			new Bounds(-150, -40, 300, 80),
			function() {
				setFont(18, "#000", "center");
				g.fillText("Fire again to continue.", 0, 0);
			}, this);
	}
	
	LayerGame.prototype.step = function() {
		if (0 < msCleanup) {
			msCleanup -= 1000;
			var newParticleList = [];
			particles.forEach(function(v) {
				if (!v.dead)
					newParticleList.push(v);
			});
			particles = newParticleList;
		}
		msCleanup += dms;
		if (xDontDrawParticles)
			particles = [];
		[gobs, particles].forEach(function(objectlist) {
			objectlist.forEach(function(v) {
				v.step();
			});
		});
	};
	
	LayerGame.prototype.draw = function() {
		// If turn is just beginning.
		if (tms - timeTurnStart < 200) {
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
			this.overhead.key = shots + ',' + gold + ',' + starPower;
			this.overhead.draw();
		}

		// Draw fps.
		if (xShowFps) {
			this.fpsimage.key = fpsPhysics + ',' + fpsGraphics;
			this.fpsimage.draw();
		}
		
		// Debug Info.
		if (showdebuginfo) {
			setFont("20pt " + fontFace);
			g.fillText(0.001 * Math.floor(showdebuginfo * 1000), 2, 40);
		}
		
		if (isCannonFired && isCannonFocused && !xMultipleShots
			&& (longShotTimeout < tms - shotStartTime)) {
			
			g.save();
			var a = 2 * Math.PI * tms / 3000;
			var radius = 4;
			var ox = 200 + radius * Math.cos(a);
			var oy = 100 + radius * Math.sin(a);
			g.translate(ox, oy);
			this.fireagainimage.draw();
			g.restore();
		}
	};

	LayerGame.prototype.onKeyPress = function(k) {
		switch(k) {
		case KeyEvent.DOM_VK_UP:	if (!this.timeKeyPressUp)	{ changeAngle(1);  this.timeKeyPressUp = tms;	} return true;
		case KeyEvent.DOM_VK_DOWN:  if (!this.timeKeyPressDown)  { changeAngle(-1); this.timeKeyPressDown = tms;  } return true;
		case KeyEvent.DOM_VK_LEFT:  if (!this.timeKeyPressLeft)  { changeFuel(-1);  this.timeKeyPressLeft = tms;  } return true;
		case KeyEvent.DOM_VK_RIGHT: if (!this.timeKeyPressRight) { changeFuel(1);	this.timeKeyPressRight = tms; } return true;
		case KeyEvent.DOM_VK_SPACE:
			if (xBrowseLevels) {
				shots++;
				nextShot();
				return;
			}
			if (isCannonFired && !xMultipleShots) {
				if (longShotTimeout < tms - shotStartTime) {
					endingLongShot = true;
				}
			}
			else {
				cannon.fire();
			}
			return true;
		}
		return false;
	};

	LayerGame.prototype.onKeyRelease = function(k) {
		switch(k) {
		case KeyEvent.DOM_VK_UP:	this.timeKeyPressUp = undefined; return true;
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
		if (timePlayAdjustSound == undefined || 100 < time() - timePlayAdjustSound) {
			timePlayAdjustSound = time();
			push_multi_sound("adjustangle");
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
		push_multi_sound("adjustpower");
	}
}

var Cannon = (function() {
	
	Cannon.extend(Gob);

	function Cannon(dxi, dyi) {
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
	}

	Cannon.prototype.draw = function() {
		this.image.key = this.angle + ',' + this.fuel;
		this.image.draw();
	};
	
	Cannon.prototype.fire = function() {
		if (practiceShot) {
			declareNonPracticeShot();
		}
		else {
			isCannonFired = true;
			if (starPower)
				starPower--;
			shots++;
			fuelCost = cannon.fuel;
		}
		var z = computeShotZeroState();
		var shot = new Shot(practiceShot, z.dx, z.dy, z.vx, z.vy);
		shotStartTime = tms;
		// Put shot before cannon and after targets.
		gobs.remove(cannon);
		gobs.push(shot);
		gobs.push(cannon);
		push_multi_sound("firecannon");
		practiceShot = false;
	}

	return Cannon;
})();

function computeShotZeroState() {
	var power = (0.06 + Math.pow(100 * cannon.fuel / fuelMax, 0.9) * 0.0084) * physics;
	var angle = cannon.angle;
	var lead = 20;
	var ca = Math.cos(angle);
	var sa = Math.sin(angle);
	return {
		dx: cannon.dx + lead * ca,
		dy: cannon.dy + lead * sa,
		vx: power * ca,
		vy: power * sa
	};
}

var Shot = (function() {
	
	Shot.extend(Gob);

	function Shot(shotType, dxi, dyi, vxi, vyi) {
		this.shotType = shotType;
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
		if (shotType == 0)
			progress = ((progress * 485207) & 0xffffffff) ^ 385179316;
		this.mass = 1;
		this.radius = shotRadius;
	}

	Shot.prototype.step = function() {
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
		
		// Check all conditions for end of turn.
		var outOfBoundsTime = numSinks ? 2000 : 500;
		var stuckShotTimeout = 2500;
		turnOver = turnOver || (this.timeStuck != undefined) && (stuckShotTimeout < tms - this.timeStuck);
		turnOver = turnOver || (this.timeFallenFromVision != undefined) && (outOfBoundsTime < tms - this.timeFallenFromVision);
		turnOver = turnOver || endingLongShot;
		if (turnOver && !xMultipleShots) {
			gobs.remove(this);
			if (this.shotType == 0) {
				if (xLevelRedo && shots <= levelRedoMax && goldThisTurn == 0)
					layers.push(new LayerRetryShot());
				else
					layers.push(new LayerScore());
			}
		}
				
		// Collide with all game objects.
		var shot = this;
		gobs.forEach(function(v) {
			v.collide(shot);
		});
	};

	Shot.prototype.draw = function() {
		if (1500 < tms - this.timeStuck) {
			if (!this.sunk)
				push_multi_sound("sink");
			this.sunk = true;
		}
		if (this.sunk)
			return;
		var color = this.shotType == 0 ? "#000" : "#0a0";
		var radius = this.radius;
		if (this.timeStuck != undefined) {
			var delta = ((tms - this.timeStuck) / 1750);
			color = color.shiftColor("#f00", delta);
			radius = this.radius * (1 - delta * 0.2) + (this.radius * 0.2 * (rand() - 0.5));
		}
		
		g.fillStyle = color;
		g.fillCircle(0, 0, radius);
		g.fillStyle = "#fff";
		g.fillCircle(-radius * 0.4, -radius * 0.4, radius * 0.2);
	};
	
	Shot.prototype.scoring = function() {
		return this.shotType == 0;
	}

	return Shot;
})();

var Target = (function() {
	
	Target.extend(Gob);

	function Target(dxi, dyi, nRings, ringWidth) {
		if (nRings == 1)
			ringWidth = 0;
		this.dx = dxi;
		this.dy = dyi;
		this.ringWidth = ringWidth;
		this.radius = ringWidth * (nRings - 0.75);
		this.hit = false;
		this.rings = [];
		forNum(nRings, function(i) {
			this.rings.push(new Ring());
		}, this);
		this.popTime = xBrowseLevels ? 0 : tms + rand() * 800;
		this.popSoundYet = false;
	}

	Target.prototype.draw = function() {
		
		var pop = (tms - this.popTime) / 400;
		
		if (pop <= 0)
			return;
		
		if (pop < 1) {
			if (!this.popSoundYet) {
				push_multi_sound("targetpop");
				this.popSoundYet = true;
			}
			pop = 1 - (1 - pop) * (1 - pop);
			g.scale(pop, pop);
		}
		
		// Draw rings.
		this.rings.forEach(function(v, i) {
			v.draw(i, this.ringWidth);
		}, this);
		
		// Draw crosshairs.
		if (this.rings.length == 1) {
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
//				var w = this.ringWidth;
//				setLine(w * 0.5);
//				g.strokeLine(-w, 0, 1.5 * -w, 0);
//				g.strokeLine(w, 0, 1.5 * w, 0);
//				g.strokeLine(0, -w, 0, 1.5 * -w);
//				g.strokeLine(0, w, 0, 1.5 * w);
			}
		}
	};

	Target.prototype.collide = function(shot) {
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
					if (i == 0) {
						eyeHitMade(this.dx, this.dy);
						push_multi_sound("bullseye");
					}
				}
			}, this);
		}
		
		if (this == singleTarget) {
			if (shot.dxPrev < this.dx && this.dx <= shot.dx) {
				didOverShoot = (shot.dy < this.dy);
			}
		}
	};

	return Target;
})();

function eyeHitMade(x, y) {
	eyesMade++;
	eyesTotal++;
	eyeRun++;
	if (xScoreNewStyle) {
		particles.push(new Explosion(x, y, eyeRun));
	}
	else {
		if (1 < eyeRun) {
			var eyeRunBonus = (eyeRun - 1) * 10;
			goldThisTurn += eyeRunBonus;
			particles.push(new Bonus(x, y - 29, eyeRunBonus, true));
		}
		particles.push(new Explosion(x, y, 5));
	}
}

var TargetBonus = (function() {
	
	TargetBonus.extend(Gob);

	function TargetBonus(dxi, dyi, radius, bonusType) {
		this.dx = dxi;
		this.dy = dyi;
		this.radius = radius;
		this.bonusType = bonusType;
		this.hit = false;
		this.extra = (bonusType == 1) ? new BonusStar(this) : new BonusEyeSet(this);
		
		var spacing = radius * 1.25;
		this.glassball = new Renderable(
			new Bounds(-spacing, -spacing, 2 * spacing, 2 * spacing),
			function() {
				g.drawGlassBall(0, 0, this.radius, "#000".alpha(0.2));
			}, this);
	}

	TargetBonus.prototype.step = function() {
		if (this.extra) {
			this.extra.step();
		}
	};

	TargetBonus.prototype.draw = function() {
		if (this.hit)
			return;
		
		var color = (this.bonusType == 1) ? "#fc0" : "#0f4";

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
		
		// Draw star or whatever extra treat.
		if (this.extra) {
			this.extra.draw();
		}
		
		// Draw bonus.
		this.glassball.draw();
	};

	TargetBonus.prototype.collide = function(shot) {
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
				push_multi_sound("bonus");
				this.extra = null;
			}
		}
	};

	return TargetBonus;
})();

var BonusStar = (function() {
	
	BonusStar.extend(Gob);

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
		g.fillStyle = "#fc0";
		g.drawStar(0, 0, this.radius, this.ad);
	};
	
	BonusStar.prototype.pickup = function() {
		starPower += starPowerTurns;
	};

	return BonusStar;
})();

var BonusEyeSet = (function() {
	
	BonusEyeSet.extend(Gob);

	function BonusEyeSet(parent) {
		this.parent = parent;
		this.radius = parent.radius;
		this.eyes = new Array();
		forNum(eyePowerAmount, function() {
			this.eyes.push(new BonusEye(this));
		}, this);
	}
	
	BonusEyeSet.prototype.step = function() {
		this.eyes.forEach(function(v) {
			v.step();
		});
	};
	
	BonusEyeSet.prototype.draw = function() {
		this.eyes.forEach(function(v) {
			v.draw();
		});
	};
	
	BonusEyeSet.prototype.pickup = function() {
		this.eyes.forEach(function(v) {
			v.pickup();
		});
	};

	return BonusEyeSet;
})();

var BonusEye = (function() {
	
	BonusEye.extend(Gob);

	function BonusEye(parent) {
		this.parent = parent;
		var radius = parent.radius;
		this.smallR = radius * 0.075 + 0.5;
		this.bigR = radius;
		var rs = this.bigR - this.smallR;
		do {
			this.dx = rand() * radius * 2 - radius;
			this.dy = rand() * radius * 2 - radius;
		} while (rs * rs <= sqr(this.dx, this.dy));
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
	};
	
	BonusEye.prototype.draw = function() {
		g.fillStyle = "#000";
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
	
	Ring.extend(Gob);

	function Ring() {
		this.timeHit = undefined;
	}
	
	Ring.prototype.draw = function(number, ringWidth) {
		var FADE_TIME = 900;
		if (this.timeHit == undefined) {
			setLine(ringWidth * 0.5, "#000");
		}
		else if (tms - this.timeHit < FADE_TIME) {
			var alpha = 1.0 - ((tms - this.timeHit) / FADE_TIME);
			setLine(ringWidth * 0.5, "#fff".alpha(alpha));
		}
		else {
			return; // Ring is destroyed and finished animating.
		}
		g.strokeCircle(0, 0, ringWidth * number);
	}
	
	Ring.prototype.collide = function(shot, number, ringWidth, d) {
		if (this.timeHit == undefined) {
			if (d - shot.radius <= (number + 0.25) * ringWidth) {
				this.timeHit = tms;
				timeOfAnyHit = tms;
				var loot = computeRingGold(number, undefined);
				goldThisTurn += loot;
				particles.push(new Bonus(shot.dx, shot.dy, loot, false));
				return true;
			}
		}
		return false;
	}

	function computeRingGold(i, nRings) {
		return i?~-i?15:30:60;//:)
	}

	return Ring;
})();

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

var Explosion = (function() {
	
	Explosion.extend(Gob);

	function Explosion(dx, dy, streamers) {
		this.dx = dx;
		this.dy = dy;
		this.timeStart = tms;
		var angle = rand() * Math.PI * 2;
		forNum(streamers, function(i) {
			particles.push(new Streamer(dx, dy, angle));
			angle += Math.PI * 2 / streamers;
		});
		if (xScoreNewStyle) {
			forNum(streamers, function(i) {
				createPermBonus();
			});
		}
	}
	
	Explosion.prototype.draw = function() {
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

	return Explosion;
})();

var Streamer = (function() {
	
	Streamer.extend(Gob);
	
	var streamerWidth = 6;
	var streamerLength = Math.floor(275 / targetMspfPhysics);
	
	function Streamer(dx, dy, angle) {
		this.dx = dx;
		this.dy = dy;
		var mag = (1 + rand()) * 0.12 * physics;
		var ang = angle;
		this.vx = mag * Math.cos(ang);
		this.vy = mag * Math.sin(ang);
		this.ang1da = rand() * Math.PI * 2;
		this.ang1va = (rand() - 0.5) * Math.PI * 0.034 * physics;
		this.ang1r = rand() * 0.4 * physics;
		this.color = hue(rand());
		this.points = new Array();
		this.points.push([this.dx, this.dy]);
		this.dead = false;
		this.msSparks = 0;
		
		this.segmentColors = new Array(streamerLength);
		var cTail = "#fff";
		forNum(streamerLength, function(i) {
			var alpha = i / streamerLength;
			this.segmentColors[i] = this.color.shiftColor(cTail, 1 - alpha).alpha(alpha);
		}, this);
	}
	
	Streamer.prototype.step = function() {
		if (this.dead)
			return;
		
		// Step streamer.
		this.dx += this.vx * dms;
		this.dy += (this.vy + gravity * dms * 0.5) * dms;
		this.vy += gravity * dms;
		this.ang1da += this.ang1va * dms;
		this.dx += this.ang1r * Math.cos(this.ang1da) * dms;
		this.dy += this.ang1r * Math.sin(this.ang1da) * dms;
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
	}
	
	Streamer.prototype.draw = function() {
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
	
	return Streamer;
})();

var Spark = (function() {
	
	Spark.extend(Gob);

	var sparkRadius = 1.5;
	
	var sparkLifetime = 1500;
	
	function Spark(x, y, color) {
		this.dx = x;
		this.dy = y;
		var mag = (1 + rand()) * 0.045 * physics;
		var ang = rand() * Math.PI * 2;
		this.vx = mag * Math.cos(ang);
		this.vy = mag * Math.sin(ang);
		this.timeCreated = tms;
		this.color = color;
		this.dead = false;
	}
	
	Spark.prototype.step = function() {
		this.dx += this.vx * dms;
		this.dy += (this.vy + gravity * dms * 0.5) * dms;
		this.vy += gravity * dms;
	}
	
	Spark.prototype.draw = function() {
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
	
	return Spark;
})();

var Bonus = (function() {
	
	Bonus.extend(Gob);

	function Bonus(dxi, dyi, amount, isSpecial) {
		this.dx = dxi;
		this.dy = dyi;
		this.timeBonusGiven = tms;
		this.amount = amount;
		this.isSpecial = isSpecial;
		
		var bounds = isSpecial
			? new Bounds(-40, -20, 80, 25)
			: new Bounds(-17, -12, 34, 13);
		this.textimage = new Renderable(
			bounds,
			function() {
				if (this.isSpecial) {
					setFont(18, "#0c0", "center");
					setLine(6, "#000", "round");
					g.strokeAndFillText("+" + this.amount, 0, 0);
				}
				else {
					setFont(12, "#000", "center");
					g.fillText("+" + this.amount, 0, 0);
				}
			}, this);
	}

	Bonus.prototype.draw = function() {
		var dt = tms - this.timeBonusGiven;
		var totalTime = 5000.0;
		var fadeTime = 2000.0;
		var opaqueTime = totalTime - fadeTime;
		if (dt < totalTime) {
			var alpha = Math.min(1.0, 1.0 - (dt - opaqueTime) / fadeTime);
			var oy = Math.min(1.0, dt / 500.0);
			g.globalAlpha = alpha;
			g.translate(0, -12 - oy * 22);
			this.textimage.draw();
		}
	};

	return Bonus;
})();

var Sink = (function() {
	
	Sink.extend(Gob);

	function Sink(dxi, dyi) {
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
	}

	Sink.prototype.step = function() {
		// Step sparks.
		while (0 < this.msSparks) {
			this.msSparks -= 25;
			particles.push(new SinkSpark(this.dx, this.dy, this.color));
		}
		this.msSparks += dms;
	};

	Sink.prototype.draw = function() {
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
	};

	Sink.prototype.collide = function(shot) {
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
	};

	return Sink;
})();

var SinkSpark = (function() {
	
	SinkSpark.extend(Gob);
	
	function SinkSpark(x, y, color) {
		this.isRing = rand() < 0.02;
		this.dx = x;
		this.dy = y;
		var mag = (1.0 + rand()) * 85;
		var ang = rand() * Math.PI * 2;
		this.ox = mag * Math.cos(ang);
		this.oy = mag * Math.sin(ang);
		this.timeCreated = tms;
		this.color = color;
		this.dead = false;
		this.oxPrev = this.ox;
		this.oyPrev = this.oy;
	}
	
	SinkSpark.prototype.step = function() {
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
		if (Math.sign(this.oxPrev) != Math.sign(this.ox))
			this.ox = 0;
		if (Math.sign(this.oyPrev) != Math.sign(this.oy))
			this.oy = 0;
	}
	
	SinkSpark.prototype.draw = function() {
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
	
	return SinkSpark;
})();

var Trajectory = (function() {
	
	Trajectory.extend(Gob);
	
	var ticksPerDash = Math.floor(55 / targetMspfPhysics);

	function Trajectory() {
		// To get it translated correctly as all gobs are before draw() is called.
		this.dx = 0;
		this.dy = 0;
	}

	Trajectory.prototype.draw = function() {
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
	};
	
	Trajectory.prototype.scoring = function() {
		return false;
	}

	return Trajectory;
})();

var PermBonus = (function() {
	
	PermBonus.extend(Gob);

	function PermBonus(dxi, dyi) {
		this.dx = dxi;
		this.dy = dyi;
		this.radius = 10;
		this.dead = false;
	}

	PermBonus.prototype.draw = function() {
		if (this.dead)
			return;
		
		g.drawGlassBall(0, 0, this.radius, "#fc0");
	};

	PermBonus.prototype.collide = function(shot) {
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
			if (!this.dead) {
				timeOfAnyHit = tms;
				this.dead = true;
				push_multi_sound("bonus");
				var eyePermBonus = 10;
				goldThisTurn += eyePermBonus;
				particles.push(new Bonus(this.dx, this.dy - 29, eyePermBonus, true));
			}
		}
	};

	return PermBonus;
})();

var Egg = (function() {

	function Egg(dxi, dyi, radius, color, mass) {
		this.dx = dxi;
		this.dy = dyi;
		this.vx = 0;
		this.vy = 0;
		this.angle = 5;
		this.vangle = 0;
		this.radius = radius;
		this.color = color;
		this.ellipseA = radius * 1.0;
		this.ellipseB = radius * 1.4;
		this.spinability = 0.04;
		this.linearFriction = 0.02 * physics * physics;
		this.angularFriction = 0.002 * physics * physics;
		this.hit = 0;
		this.mass = 0.5;
		this.bounce = 10;
	}

	Egg.prototype.step = function() {
		if (this.vx != 0 && this.vy != 0) {
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
		}
		
		if (this.vangle != 0) {
			var vaPrev = this.vangle;
			var afriction = this.angularFriction;
			if (Math.abs(this.vangle) > afriction) {
				this.vangle -= Math.sign(this.vangle) * afriction;
			}
			else {
				this.vangle = 0;
			}
			this.angle += (this.vangle + vaPrev) * 0.5;
		}
		
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
	};

	Egg.prototype.draw = function() {
		g.drawEgg(0, 0, this.ellipseA, this.ellipseB, this.color, this.angle);
		g.save();
		g.rotate(this.angle);
		if (this.drawseg != undefined) {
			var seg = this.drawseg;
			g.strokeStyle = '#f00';
			g.strokeLine(seg[0][0], seg[0][1], seg[1][0] - seg[0][0], seg[1][1] - seg[0][1]);
		}
		g.restore();
	};

	Egg.prototype.collide = function(shot) {
		if (!(shot instanceof Shot))
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
		//this.hit++;
		
		// Compute normal.
		var ex = seg[0][0];
		var ey = seg[0][1];
		var sign = Math.sign(seg[1][1]);
		var m = -sign * eb / (ea * ea) * ex / Math.sqrt(1 - ex * ex / (ea * ea));
		var p = normal(-m, 1);
		var nx = sign * p[0];
		var ny = sign * p[1];
		
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
		this.vangle += Math.sign(ex) * Math.sign(ey) * mag(dvex, dvey) * amountAngular * this.spinability * this.bounce;
		
		// Apply remaining force to linear momentum.
		ps = [[dvex * amountLinear, dvey * amountLinear]];
		rotate(ps, this.angle);
		this.vx += ps[0][0] * this.bounce;
		this.vy += ps[0][1] * this.bounce;
	};

	return Egg;
})();

var BossEgg = (function() {
	
	BossEgg.extend(Gob);

	function BossEgg(dxi, dyi) {
		this.radius = 50;
		this.hit = false;
		this.egg = new Egg(dxi, dyi, this.radius, "#000");
		this.eggsync();
		this.dead = false;
	}
	
	BossEgg.prototype.eggsync = function() {
		this.dx = this.egg.dx;
		this.dy = this.egg.dy;
		this.vx = this.egg.vx;
		this.vy = this.egg.vy;
	}

	BossEgg.prototype.draw = function() {
		if (this.egg.hit == 3)
			return;
		
		this.egg.draw();
	};

	BossEgg.prototype.step = function() {
		if (this.egg.hit == 3)
			return;
		
		this.egg.step();
		this.eggsync();
	};

	BossEgg.prototype.collide = function(shot) {
		if (this.egg.hit == 3)
			return;
		
		this.egg.collide(shot);
		this.eggsync();
	};

	return BossEgg;
})();

function declarePracticeShot() {
	layers.push(new LayerPracticeMessage(1));
}

function declareNonPracticeShot() {
	layers.push(new LayerPracticeMessage(0));
}

var LayerPracticeMessage = (function() {
	
	LayerPracticeMessage.extend(Layer);

	function LayerPracticeMessage(isPracticeShot) {
		this.timeCreated = time();
		if (isPracticeShot) {
			this.message1 = "First Fire A";
			this.message2 = "Practice Shot!";
		}
		else {
			this.message1 = "Now Fire A";
			this.message2 = "Real Shot!";
		}
		
		var w = 200;
		var h = 250;
		this.dx = (gameCanvasW - w) / 2;
		this.dy = (gameCanvasH - h) / 2;
		
		this.image = new Renderable(
			new Bounds(-6, -6, w + 12, h + 12),
			function() {
				g.drawDialog(0, 0, w, h, "#000");
				
				setFont(24, "#0a0", "center");
				g.fillText(this.message1, w / 2, 38);
				g.fillText(this.message2, w / 2, 76);
			}, this);
	}

	LayerPracticeMessage.prototype.step = function() {
		if (2000 <= time() - this.timeCreated)
			finishPracticeShot(this);
	};

	LayerPracticeMessage.prototype.draw = function() {
		this.image.draw();
	};

	return LayerPracticeMessage;
})();

function finishPracticeShot(layer) {
	layers.remove(layer);
}

var LayerScore = (function() {
	
	LayerScore.extend(Layer);

	function LayerScore() {
		this.shot = -shotCost;
		this.fuel = -fuelCost;
		this.gold = goldThisTurn;
		this.net  = this.shot + this.fuel + this.gold;
		this.timeCreated = time();
		isCannonFocused = false;
		
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
				if (this.gold != 0)
					g.fillText("gold", ox, oy); oy += lh;
				ox += w / 2 - 25; oy -= 3 * lh;
				g.fillText(withSign(this.shot), ox, oy); oy += lh;
				g.fillText(withSign(this.fuel), ox, oy); oy += lh;
				if (this.gold != 0)
					g.fillText(withSign(this.gold), ox, oy); oy += lh;
				
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
	}

	function withSign(n) {
		return (0 < n ? "+" : "") + n
	}

	LayerScore.prototype.draw = function() {
		this.image.draw();
	};

	LayerScore.prototype.onKeyPress = function(k) {
		if (!xNoScreenDelays && time() - this.timeCreated < 200)
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
	
	if (0 < gold || xInvincible) {
		nextShot();
	}
	else {
		gameOver();
	}
}

var LayerRetryShot = (function() {
	
	LayerRetryShot.extend(Layer);

	function LayerRetryShot() {
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
	}

	LayerRetryShot.prototype.draw = function() {
		this.image.draw();
	};

	LayerRetryShot.prototype.onKeyPress = function(k) {
		if (!xNoScreenDelays && time() - this.timeCreated < 200)
			return false;
		switch(k) {
		case KeyEvent.DOM_VK_SPACE: finishRetryDialog(this); return true;
		}
		return false;
	};

	return LayerRetryShot;
})();

function finishRetryDialog(layer) {
	layers.remove(layer);
	
	retryShot();
}

function gameOver() {
	layers.push(new LayerGameOver());
}

var LayerGameOver = (function() {
	
	LayerGameOver.extend(Layer);

	function LayerGameOver() {
		this.gameTime = time() - timeGameStart;
		this.timeCreated = time();
		isCannonFocused = false;
		
		// Create score from game.
		addGameScore();
		
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
				g.fillText("Game Over", w / 2, 37);
				setFont(12, "#000", "center");
				g.fillText("Time Played: " + msToString(this.gameTime), w / 2, 60);
				g.fillText("Bullseyes: " + eyesTotal, w / 2, 80);
				g.fillText("Gold won: " + totalGoldWon, w / 2, 100);
				
				// Eyes.
				setFont(28, "#07f", "center");
				var ox, oy;
				ox = w / 2; oy = h / 2 + 5;
				setLine(5, "#000", "round");
				var msg = shots + " Shots" + fill("!", eyesTotal / 45);
				g.strokeAndFillText("Achieved", ox, oy + 30);
				g.strokeAndFillText(msg, ox, oy + 72);
			}, this);
	}

	LayerGameOver.prototype.draw = function() {
		this.image.draw();
	};

	LayerGameOver.prototype.onKeyPress = function(k) {
		if (!xNoScreenDelays && time() - this.timeCreated < 200)
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

function beginStage() {
	showOverHeadDisplay = false;
	layers.push(new LayerStageIntro());
}

var LayerStageIntro = (function() {
	
	LayerStageIntro.extend(Layer);

	function LayerStageIntro() {
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
				
				var r = 150;
				var grad;
				grad = g.createRadialGradient(x, y, 0, x, y, r);
				grad.addColorStop(0.0, "#aaa");
				grad.addColorStop(1.0, "#fff");
				g.fillStyle = grad;
				g.fillCircle(x, y, r);
				
				setFont(160, "#000", "center");
				g.fillText(stage, x, y + 70);
				
				setFont(26, "#000", "center");
				g.fillText("Stage", x, y - 100); // 20, 244);
			}, this);
	}

	LayerStageIntro.prototype.draw = function() {
		this.image.draw();
	};
	
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

	LayerStageIntro.prototype.onKeyPress = function(k) {
		var tasty = tastyKey(k);
		if ((xNoScreenDelays || 500 <= time() - this.timeCreated) && tasty)
			finishStageIntro(this);
		return tasty;
	};

	return LayerStageIntro;
})();

function finishStageIntro(layer) {
	layers.remove(layer);
	beginShot();
}

function beginGame() {
	showOverHeadDisplay = false;
	layers.push(new LayerGameIntro());
}

var LayerGameIntro = (function() {
	
	LayerGameIntro.extend(Layer);

	function LayerGameIntro() {
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
	}

	LayerGameIntro.prototype.draw = function() {
		this.image.draw();
	};
	
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

	LayerGameIntro.prototype.onKeyPress = function(k) {
		var tasty = tastyKey(k);
		if ((xNoScreenDelays || 500 <= time() - this.timeCreated) && tasty)
			finishGameIntro(this);
		return tasty;
	};

	return LayerGameIntro;
})();

function finishGameIntro(layer) {
	layers.remove(layer);
	nextShot();
}

// Draws with total render radius of r * 1.25
CanvasRenderingContext2D.prototype.drawGlowingGlassBall = function(x, y, r, color) {
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
}

CanvasRenderingContext2D.prototype.drawEgg = function(x, y, a, b, color, angle) {
	g.save();
	g.rotate(angle);
	g.scale(a / b, b / b);
	this.drawGlassBall(x, y, b, color, angle);
	g.restore();
}

// Draws with total render radius of r * 1.25
CanvasRenderingContext2D.prototype.drawGlassBall = function(x, y, r, color /*, shineAngle */) {
	var grad;
	
	var c = color;
	
	// Draw black edge accent and glow.
	var cedge = "#000";
	grad = this.createRadialGradient(x, y, 0, x, y, r * 1.2);
	grad.addColorStop(0.5, c.shiftColor(cedge, 0.0));
	grad.addColorStop(0.75, c.shiftColor(cedge, 0.075));
	grad.addColorStop(0.8, c.shiftColor(cedge, 0.125));
	grad.addColorStop(0.833, c.shiftColor(cedge, 0.225));
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
	var angl = (-arguments[4] || 0) + shineAngle;
	var ox = dist * Math.cos(angl);
	var oy = dist * Math.sin(angl);
	
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
}

CanvasRenderingContext2D.prototype.drawStar = function(x, y, r, rotation) {
	this.fillStar(x, y, r * 0.382, r, rotation - Math.PI * 0.5, 5);
}

CanvasRenderingContext2D.prototype.drawDialog = function(x, y, w, h, color) {
	var shine = "#fff";
	var roundy = 15;
	this.fillStyle = shine.alpha(0.95);
	this.strokeStyle = color;
	this.lineWidth = 12;
	this.lineCap = "butt";
	this.fillRect(x, y, w, h);
	this.strokeRoundRect(x, y, w, h, roundy);
	forNum(4, function(i) {
		var alpha = (3 - i) * 0.1;
		this.strokeStyle = shine.alpha(alpha);
		this.lineWidth = (i + 1) * 2.25;
		this.strokeRoundRect(x - 2, y - 2, w, h, roundy);
	}, this);
}
