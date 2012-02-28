//
// My library of simple reuseable code.
//

"use strict";

//
// Iteration
//

// Copied from https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/forEach

if (!Array.prototype.forEach) {
	Array.prototype.forEach = function(fun /*, thisArg */) {
		"use strict";
	 
		if (this == null)
			throw new TypeError('can not convert ' + this + ' to object');
	 
		var t = Object(this);
		var len = t.length >>> 0;
		if (typeof fun != 'function')
			throw new TypeError(fun + ' is not callable');
	 
		var thisArg = arguments[1];
		for (var i = 0; i < len; i++) {
			if (i in t)
				fun.call(thisArg, t[i], i, t);
		}
	};
}

function forNum(num, fun /*, thisArg */) {
	var thisArg = arguments[2];
	while (--num >= 0)
		fun.call(thisArg, num);
}

function table(tab) {
	var rows = [];
	var header = tab.shift();
	tab.forEach(function(v) {
		var row = {};
		header.forEach(function(c, i) {
			row[c] = v[i];
		});
		rows.push(row);
	});
	return rows;
}

Array.prototype.lastval = function(fun /*, thisArg */) {
	var t = this;
	var thisArg = arguments[1];
	for (var i = t.length; i-- > 0; ) {
		if (fun.call(thisArg, t[i], i, t))
			return t[i];
	}
	return null;
};

//
// Misc.
//

Function.prototype.extend = function(parent) {
	this.prototype.__super__ = parent;
	this.prototype.draw = parent.prototype.draw;
	this.prototype.onKeyPress = parent.prototype.onKeyPress;
	this.prototype.onKeyRelease = parent.prototype.onKeyRelease;
	this.prototype.step = parent.prototype.step;
	this.prototype.collide = parent.prototype.collide;
}

Math.sign = function(x) {
	return (x < 0) ? -1 : 1;
}

function randInt(n) {
	return Math.floor(Math.random() * n);
}

function rand() {
	return Math.random();
}

function time() {
	return new Date().getTime();
}

function fill(c, len) {
	// Catch undefined or NaN or negative or zero or fraction less than 1.
	if (len >= 1) {
		var fill = new Array(len);
		while (--len >= 0)
			fill[len] = c;
		return fill.join("");
	}
	return "";
}

function padl(s, c, newLength) {
	return fill(c, newLength - s.length) + s;
}

function msToString(ms) {
	ms = Math.floor(ms / 1000);
	var s = ""+(ms % 60);
	ms = Math.floor(ms / 60);
	s = (ms % 60)+":"+padl(s, "0", 2);
	if (ms < 60)
		return s;
	ms = Math.floor(ms / 60);
	s = (ms % 60)+":"+padl(s, "0", 5);
	if (ms < 60)
		return s;
	ms = Math.floor(ms / 60);
	s = (ms % 24)+":"+padl(s, "0", 8);
	if (ms < 24)
		return s;
	ms = Math.floor(ms / 24);
	s = ms+" days "+s;
	return s;
}

function isFunction(o) {
	return jQuery.isFunction(o);
}

//
// Viewport dimensions.
//

// Copied from http://andylangton.co.uk/articles/javascript/get-viewport-size-javascript/
function viewportSize() {
	var viewportwidth;
	var viewportheight;

	// the more standards compliant browsers (mozilla/netscape/opera/IE7) use window.innerWidth and window.innerHeight

	if (typeof window.innerWidth != 'undefined')
	{
		viewportwidth = window.innerWidth,
		viewportheight = window.innerHeight
	}

	// IE6 in standards compliant mode (i.e. with a valid doctype as the first line in the document)

	else if (typeof document.documentElement != 'undefined'
		&& typeof document.documentElement.clientWidth !=
		'undefined' && document.documentElement.clientWidth != 0)
	{
		viewportwidth = document.documentElement.clientWidth,
		viewportheight = document.documentElement.clientHeight
	}

	// older versions of IE

	else
	{
		viewportwidth = document.getElementsByTagName('body')[0].clientWidth,
		viewportheight = document.getElementsByTagName('body')[0].clientHeight
	}
	return {
		w: viewportwidth,
		h: viewportheight
	};
}


//
// Color.
//

var Color = (function() {
	
	function Color(str) {
		str = str.replace(/ /g,'');
		
		// Assume hexadecimal if length is short.
		var len = str.length;
		if (len < 9) {
			if (str.charCodeAt(0) == 35) // '#' char code
				str = str.substr(1, 6);
			var n = parseInt(str, 16);
			if (len < 5) {
				this.b = 17 * (n & 15);
				this.g = 17 * ((n >> 4) & 15);
				this.r = 17 * (n >> 8);
			}
			else {
				this.b = n & 255;
				this.g = (n >> 8) & 255;
				this.r = n >> 16;
			}
			this.a = 1;
		}
		else {
			var parts;
			if (str.charCodeAt(3) == 40) { // '(' char code
				parts = rgbRe.exec(str);
				this.a = 1;
			}
			else {
				parts = rgbaRe.exec(str);
				this.a = parseFloat(parts[4]);
			}
			this.r = parseInt(parts[1], 10);
			
			this.g = parseInt(parts[2], 10);
			this.b = parseInt(parts[3], 10);
		}
	}
	
	var rgbaRe = /^rgba\((\d{1,3}),(\d{1,3}),(\d{1,3}),(\d?\.?\d*)\)$/i;
	var rgbRe = /^rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)$/i;
	
	return Color;
})();

function rgb(r, g, b, a) {
	var x = "rgba("+r+","+g+","+b+","+a+")";
	return x;
}

function hue(h) {
	var ou = new HSVColour(h * 360, 100, 100);
	return ou.getCSSIntegerRGB();
}

String.prototype.shiftColor = function(that, amount) {
	var ca = new Color(that);
	var ci = new Color(this);
	var r = Math.floor(ci.r + amount * (ca.r - ci.r));
	var g = Math.floor(ci.g + amount * (ca.g - ci.g));
	var b = Math.floor(ci.b + amount * (ca.b - ci.b));
	var a = ci.a + amount * (ca.a - ci.a);
	return rgb(r, g, b, a);
}

String.prototype.alpha = function(v) {
	var o = new Color(this);
	return rgb(o.r, o.g, o.b, o.a * v);
}

//
// Array.
//

Array.prototype.indexOf = function(object) {
	var i = this.length;
	while (i--) {
		if (this[i] === object)
			break;
	}
	return i;
}

Array.prototype.remove = function(object) {
	var i = this.indexOf(object);
	return (~i)
		? this.splice(i, 1)[0]
		: undefined;
}

//
// Drawing.
//

CanvasRenderingContext2D.prototype.strokeAndFillText = function(text, x, y) {
	this.strokeText(text, x, y);
	this.fillText(text, x, y);
}

CanvasRenderingContext2D.prototype.fillWithStrokeStyle = function() {
	var fsBackup = this.fillStyle;
	this.fillStyle = this.strokeStyle;
	this.fill();
	this.fillStyle = fsBackup;
}

CanvasRenderingContext2D.prototype.ellipse = function(x, y, r1, r2) {
	this.beginPath();
	this.arc(x, y, radius, 0, Math.PI*2, false);
}

CanvasRenderingContext2D.prototype.circle = function(x, y, radius) {
	this.beginPath();
	this.arc(x, y, radius, 0, Math.PI*2, false);
}

CanvasRenderingContext2D.prototype.fillCircle = function(x, y, radius) {
	this.circle(x, y, radius);
	this.fill();
}

CanvasRenderingContext2D.prototype.strokeCircle = function(x, y, radius) {
	if (this.lineWidth * 0.5 >= radius) {
		this.circle(x, y, radius + this.lineWidth * 0.5);
		this.fillWithStrokeStyle();
	}
	else {
		this.circle(x, y, radius);
		this.stroke();
	}
}

CanvasRenderingContext2D.prototype.strokeLine = function(x, y, w, h) {
	this.beginPath();
	this.moveTo(x, y);
	this.lineTo(x + w, y + h);
	this.stroke();
}

CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
	this.beginPath();
	this.moveTo(x + r, y);
	this.arcTo(x + w, y, x + w, y + r, r);
	this.arcTo(x + w, y + h, x + w - r, y + h, r);
	this.arcTo(x, y + h, x, y + h - r, r);
	this.arcTo(x, y, x + r, y, r);
}

CanvasRenderingContext2D.prototype.fillRoundRect = function(x, y, w, h, r) {
	this.roundRect(x, y, w, h, r);
	this.fill();
}

CanvasRenderingContext2D.prototype.strokeRoundRect = function(x, y, w, h, r) {
	this.roundRect(x, y, w, h, r);
	this.stroke();
}

CanvasRenderingContext2D.prototype.polygon = function(points) {
	if (points.length < 1)
		return;
	this.beginPath();
	this.moveTo(points[0][0], points[0][1]);
	points.forEach(function(p) {
		this.lineTo(p[0], p[1]);
	}, this);
}

CanvasRenderingContext2D.prototype.fillPolygon = function(points) {
	this.polygon(points);
	this.fill();
}

CanvasRenderingContext2D.prototype.strokePolygon = function(points) {
	this.polygon(points);
	this.stroke();
}

CanvasRenderingContext2D.prototype.star = function(x, y, r1, r2, rotation, numPoints) {
	this.polygon(createStar(x, y, r1, r2, rotation, numPoints));
}

CanvasRenderingContext2D.prototype.fillStar = function(x, y, r1, r2, rotation, numPoints) {
	this.fillPolygon(createStar(x, y, r1, r2, rotation, numPoints));
}

CanvasRenderingContext2D.prototype.strokeStar = function(x, y, r1, r2, rotation, numPoints) {
	this.fillPolygon(createStar(x, y, r1, r2, rotation, numPoints));
}

var Renderable = (function () {

	function Renderable(bounds, render, layer) {
		this.bounds = bounds;
		this.render = render;
		this.layer = layer;
		this.key = "";
		this.useCanvas = true;
		this.keyRendered = undefined;
	}
	
	Renderable.prototype.draw = function() {
		if (!this.useCanvas) {
			this.render.call(this.layer);
			return;
		}
		
		// Renderables appear blurry unless they are cached on 
		// canvases which are scaled by the same amount as the
		// window so that the cache image is not up or down 
		// sampled when drawn.
		var scale = Renderable.prototype.scale || 1.0;
		
		var bounds = this.bounds;
		var canvas = this.canvas;
		var gBackup = g;
		var spacing = 1.0
		var ox = bounds.x - spacing;
		var oy = bounds.y - spacing;
		if (canvas == undefined) {
			canvas = document.createElement("canvas");
			this.canvas = canvas;
			canvas.width = Math.ceil(scale * bounds.w + 2 * spacing);
			canvas.height = Math.ceil(scale * bounds.h + 2 * spacing);
		}
		if (this.keyRendered != this.key) {
			g = canvas.getContext("2d");
			if (this.keyRendered != undefined) {
				g.clearRect(0, 0, canvas.width, canvas.height);
			}
			if (Renderable.prototype.showCanvasEdges) {
				g.strokeStyle = "#f00";
				g.strokeRect(0, 0, canvas.width, canvas.height);
			}
			g.save();
			g.scale(scale, scale);
			g.translate(-ox, -oy);
			this.render.call(this.layer);
			this.keyRendered = this.key;
			g.restore();
			g = gBackup;
		}
		g.save();
		var elacs = 1.0 / scale;
		g.translate(ox, oy);
		g.scale(elacs, elacs);
		g.drawImage(canvas, 0, 0);
		g.restore();
	}
	
	return Renderable;
})();

//
// Math.
//

function translate(array, tx, ty) {
	var i = array.length;
	var v;
	while (i-- > 0) {
		v = array[i];
		v[0] += tx;
		v[1] += ty;
	}
}

function rotate(array, ra) {
	var c = Math.cos(ra);
	var s = Math.sin(ra);
	var x, y;
	var i = array.length;
	var v;
	while (i-- > 0) {
		v = array[i];
		x = v[0];
		y = v[1];
		v[0] = x * c - y * s;
		v[1] = x * s + y * c;
	}
}

function scale(array, sx, sy) {
	var i = array.length;
	var v;
	while (i-- > 0) {
		v = array[i];
		v[0] *= sx;
		v[1] *= sy;
	}
}

function minimize(fun, min, max /*, precision, initialGuess */) {
	var precision = arguments[3] || 0.00001;
	var initialGuess = arguments[4] || min + (max - min) * 0.41421;
	
	if (min > initialGuess || initialGuess > max) {
		throw "Failed assertion: min < initialGuess < max: "+min+" < "+initialGuess+" < "+max;
	}
	
	if (precision <= 0) {
		throw "Failed assertion: precision > 0: "+precision+" > 0";
	}
	
	var gprev, fungprev;
	var gnext, fungnext;
	
	gprev = initialGuess;
	fungprev = fun(gprev);

	precision *= 2;
	while (max - min > precision) {
		if (gprev - min < max - gprev) {
			gnext = (gprev + max) * 0.5;
			fungnext = fun(gnext);
		
			if (fungnext < fungprev) {
				min = gprev;
				gprev = gnext;
				fungprev = fungnext;
			}
			else {
				max = gnext;
			}
		}
		else {
			gnext = (gprev + min) * 0.5;
			fungnext = fun(gnext);
		
			if (fungnext < fungprev) {
				max = gprev;
				gprev = gnext;
				fungprev = fungnext;
			}
			else {
				min = gnext;
			}
		}
	}
	
	return (max + min) * 0.5;
}

function createStar(x, y, r1, r2, rotation, numPoints) {
	var npoints = numPoints * 2;
	var points = [];
	
	var angle = rotation;
	var angleInc = Math.PI / numPoints;
	var i = 0;
	var dx, dy;
	while (i < npoints) {
		dx = x + Math.cos(angle) * r2;
		dy = y + Math.sin(angle) * r2;
		points.push([dx, dy]);
		angle += angleInc;
		i++;

		dx = x + Math.cos(angle) * r1;
		dy = y + Math.sin(angle) * r1;
		points.push([dx, dy]);
		angle += angleInc;
		i++;
	}
	
	return points;
}

var Bounds = (function() {
	
	function Bounds(x, y, w, h) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	}
	
	return Bounds;
})();
    
function intersectLines(x1, y1, x2, y2,
                        xA, yA, xB, yB)
	{
	var yByA = yB - yA;
	var x2x1 = x2 - x1;
	var xBxA = xB - xA;
	var y2y1 = y2 - y1;
	var den = yByA * x2x1 - xBxA * y2y1;
	if (den == 0)
		return null;

	var y1yA = y1 - yA;
	var x1xA = x1 - xA;
	var num = xBxA * y1yA - yByA * x1xA;

	var x = x1 + x2x1 * num / den;
	var y = y1 + y2y1 * num / den;
	return [x, y];
}

function project(x1, y1, x2, y2) {
	var p = [];
	var r = (x1 * x2 +  y1 * y2) / (x2 * x2 + y2 * y2);
	p[0] = r * x2;
	p[1] = r * y2;
	return p;
}

function normal(dx, dy) {
	var h = mag(dx, dy);
	return [dx / h, dy / h];
}

function mag(dx, dy) {
	return Math.sqrt(dx * dx + dy * dy);
}

function sqr(dx, dy) {
	return dx * dx + dy * dy;
}

// return p0p1 x p0p2
function cross(x1, y1, x2, y2, x0, y0) {
	var a = (y1 - y0) * (x2 - x0);
	var b = (y2 - y0) * (x1 - x0);
	return a - b;
}

// return p1p2 . p2p3
function dot(x1, y1, x2, y2, x3, y3) {
	var a = (x2 - x1) * (x3 - x2);
	var b = (y2 - y1) * (y3 - y2);
	return a + b;
}

// return distance squared between xp,yp and line-segment(x1,y1,x2,y2)
function sqrPointSeg(xp, yp, x1, y1, x2, y2) {
	// If point lies beyond line segment endpoint (x2, y2),
	// then return distance to that endpoint.
	if (dot(x1, y1, x2, y2, xp, yp) > 0)
		return sqr(x2 - xp, y2 - yp);
	
	// If point lies beyond line segment endpoint (x1, y1),
	// then return distance to that endpoint.
	if (dot(x2, y2, x1, y1, xp, yp) > 0)
		return sqr(x1 - xp, y1 - yp);
	
	// Otherwise, return distance to line.
	var d = cross(xp, yp, x2, y2, x1, y1) / mag(x2 - x1, y2 - y1);
	return d * d;
}

// return distance squared between xp,yp and line-segment(x1,y1,x2,y2)
function segPointSeg(xp, yp, x1, y1, x2, y2) {
	// If point lies beyond line segment endpoint (x2, y2),
	// then return segment to that endpoint.
	if (dot(x1, y1, x2, y2, xp, yp) > 0)
		return [[xp, yp], [x2, y2]];
	
	// If point lies beyond line segment endpoint (x1, y1),
	// then return segment to that endpoint.
	if (dot(x2, y2, x1, y1, xp, yp) > 0)
		return [[xp, yp], [x1, y1]];
	
	// Otherwise, return shortest segment to line.
	var dx = x2 - x1;
	var dy = y2 - y1;
	var m = mag(dx, dy);
	var f = Math.abs(cross(xp, yp, x2, y2, x1, y1) / (m * m));
	return [[xp, yp], [xp - dy * f, yp + dx * f]];
}

function segEllipseSeg(a, b, x1, y1, x2, y2) {
	var r = (a + b) * 0.5;
	var ysign = Math.sign((y1 + y2) * 0.5);
	var yox = function(x) {
		return ysign * Math.sqrt(r * r - x * x);
	};
	var dox = function(x) {
		return sqrPointSeg(x, yox(x), x1, y1, x2, y2);
	};
	var ex = minimize(dox, -r, r);
	var ey = yox(ex);
	return segPointSeg(ex, ey, x1, y1, x2, y2);
}

function segEllipsePoint(a, b, x1, y1) {
	var aSqrd = 1 / (a * a);
	var bSigned = b * Math.sign(y1);
	var yox = function(x) {
		return bSigned * Math.sqrt(1 - x * x * aSqrd)
	};
	var dox = function(x) {
		return sqr(x - x1, yox(x) - y1);
	};
	var ex = minimize(dox, -b, b);
	var ey = yox(ex);
	return [[ex, ey], [x1, y1]];
}

//
// Keyboard key codes.
// Copied from http://stackoverflow.com/questions/1465374/javascript-event-keycode-varants
//

if (typeof KeyEvent == "undefined") {
	var KeyEvent = {
		DOM_VK_CANCEL: 3,
		DOM_VK_HELP: 6,
		DOM_VK_BACK_SPACE: 8,
		DOM_VK_TAB: 9,
		DOM_VK_CLEAR: 12,
		DOM_VK_RETURN: 13,
		DOM_VK_ENTER: 14,
		DOM_VK_SHIFT: 16,
		DOM_VK_CONTROL: 17,
		DOM_VK_ALT: 18,
		DOM_VK_PAUSE: 19,
		DOM_VK_CAPS_LOCK: 20,
		DOM_VK_ESCAPE: 27,
		DOM_VK_SPACE: 32,
		DOM_VK_PAGE_UP: 33,
		DOM_VK_PAGE_DOWN: 34,
		DOM_VK_END: 35,
		DOM_VK_HOME: 36,
		DOM_VK_LEFT: 37,
		DOM_VK_UP: 38,
		DOM_VK_RIGHT: 39,
		DOM_VK_DOWN: 40,
		DOM_VK_PRINTSCREEN: 44,
		DOM_VK_INSERT: 45,
		DOM_VK_DELETE: 46,
		DOM_VK_0: 48,
		DOM_VK_1: 49,
		DOM_VK_2: 50,
		DOM_VK_3: 51,
		DOM_VK_4: 52,
		DOM_VK_5: 53,
		DOM_VK_6: 54,
		DOM_VK_7: 55,
		DOM_VK_8: 56,
		DOM_VK_9: 57,
		DOM_VK_SEMICOLON: 59,
		DOM_VK_EQUALS: 61,
		DOM_VK_A: 65,
		DOM_VK_B: 66,
		DOM_VK_C: 67,
		DOM_VK_D: 68,
		DOM_VK_E: 69,
		DOM_VK_F: 70,
		DOM_VK_G: 71,
		DOM_VK_H: 72,
		DOM_VK_I: 73,
		DOM_VK_J: 74,
		DOM_VK_K: 75,
		DOM_VK_L: 76,
		DOM_VK_M: 77,
		DOM_VK_N: 78,
		DOM_VK_O: 79,
		DOM_VK_P: 80,
		DOM_VK_Q: 81,
		DOM_VK_R: 82,
		DOM_VK_S: 83,
		DOM_VK_T: 84,
		DOM_VK_U: 85,
		DOM_VK_V: 86,
		DOM_VK_W: 87,
		DOM_VK_X: 88,
		DOM_VK_Y: 89,
		DOM_VK_Z: 90,
		DOM_VK_CONTEXT_MENU: 93,
		DOM_VK_NUMPAD0: 96,
		DOM_VK_NUMPAD1: 97,
		DOM_VK_NUMPAD2: 98,
		DOM_VK_NUMPAD3: 99,
		DOM_VK_NUMPAD4: 100,
		DOM_VK_NUMPAD5: 101,
		DOM_VK_NUMPAD6: 102,
		DOM_VK_NUMPAD7: 103,
		DOM_VK_NUMPAD8: 104,
		DOM_VK_NUMPAD9: 105,
		DOM_VK_MULTIPLY: 106,
		DOM_VK_ADD: 107,
		DOM_VK_SEPARATOR: 108,
		DOM_VK_SUBTRACT: 109,
		DOM_VK_DECIMAL: 110,
		DOM_VK_DIVIDE: 111,
		DOM_VK_F1: 112,
		DOM_VK_F2: 113,
		DOM_VK_F3: 114,
		DOM_VK_F4: 115,
		DOM_VK_F5: 116,
		DOM_VK_F6: 117,
		DOM_VK_F7: 118,
		DOM_VK_F8: 119,
		DOM_VK_F9: 120,
		DOM_VK_F10: 121,
		DOM_VK_F11: 122,
		DOM_VK_F12: 123,
		DOM_VK_F13: 124,
		DOM_VK_F14: 125,
		DOM_VK_F15: 126,
		DOM_VK_F16: 127,
		DOM_VK_F17: 128,
		DOM_VK_F18: 129,
		DOM_VK_F19: 130,
		DOM_VK_F20: 131,
		DOM_VK_F21: 132,
		DOM_VK_F22: 133,
		DOM_VK_F23: 134,
		DOM_VK_F24: 135,
		DOM_VK_NUM_LOCK: 144,
		DOM_VK_SCROLL_LOCK: 145,
		DOM_VK_COMMA: 188,
		DOM_VK_PERIOD: 190,
		DOM_VK_SLASH: 191,
		DOM_VK_BACK_QUOTE: 192,
		DOM_VK_OPEN_BRACKET: 219,
		DOM_VK_BACK_SLASH: 220,
		DOM_VK_CLOSE_BRACKET: 221,
		DOM_VK_QUOTE: 222,
		DOM_VK_META: 224
	};
}

//
// Sound.
// 

soundManager.url = "lib/sm2/";
soundManager.useFlashBlock = false;
soundManager.debugMode = false;

var sounds = [];
var soundstoplay = [];
var audioready = false;

soundManager.onready(function() {
	var soundnames = [
		"bonus",
		"adjustangle",
		"bullseye",
		"adjustpower",
		"firecannon",
		"sink",
		"targetpop"
	];
	soundnames.forEach(function(name, i) {
		sounds[name] = soundManager.createSound({
			id: "sound"+i,
			url: "wav/"+name+".mp3",
			onload: function() {
				// console.log(this.url+" is ready to play");
			}
			// other options here..
		});
	});
	audioready = true;
});

soundManager.ontimeout(function() {
	console.log("Hrmm, loading SM2 timed out.");
});

function push_multi_sound(s) {
	if (!audioready)
		return;
	soundstoplay.push(s);
}

function play_all_multi_sound() {
	soundstoplay.forEach(function(sound) {
		sounds[sound].play();
	});
	soundstoplay = [];
}
