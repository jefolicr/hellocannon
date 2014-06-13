//
// My library of reuseable code.
//

var DEVMODE = true;

function log(s) {
	if (DEVMODE) {
		console.log(s);
	}
}

var isfunction = _.isFunction;
var isnumber = _.isNumber;
var range = _.range;
var undef = undefined;
function isundef(obj) { return _.isUndefined(obj); };

//
// Class
//

/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
// Inspired by base2 and Prototype

(function (){
	var initializing = false, fnTest = /xyz/.test(function (){xyz;}) ? /\b_super\b/ : /.*/;
	// The base Class implementation (does nothing)
	this.Class = function (){};

	// Create a new Class that inherits from this class
	Class.extend = function (prop) {
		var _super = this.prototype;

		// Instantiate a base class (but only create the instance,
		// don't run the init constructor)
		initializing = true;
		var prototype = new this();
		initializing = false;

		// Copy the properties over onto the new prototype
		for (var name in prop) {
			// Check if we're overwriting an existing function
			prototype[name] = isfunction (prop[name]) &&
				isfunction (_super[name]) && fnTest.test(prop[name]) ?
				(function (name, fn) {
					return function () {
						var tmp = this._super;

						// Add a new ._super() method that is the same method
						// but on the super-class
						this._super = _super[name];

						// The method only need to be bound temporarily, so we
						// remove it when we're done executing
						var ret = fn.apply(this, arguments);
						this._super = tmp;

						return ret;
					};
				})(name, prop[name]) :
				prop[name];
		}

		// The dummy class constructor
		function Class() {
			// All construction is actually done in the init method
			if ( !initializing && this.init )
				this.init.apply(this, arguments);
		}

		// Populate our constructed prototype object
		Class.prototype = prototype;

		// Enforce the constructor to be what we expect
		Class.prototype.constructor = Class;

		// And make this class extendable
		Class.extend = arguments.callee;

		return Class;
	};
})();

function appendtoclass(c, prop) {
	_.extend(c.prototype, prop);
}

//
// Iteration
//

appendtoclass(Array, {
	any: function (fun, obj) {
		return _.any(this, fun, obj);
	},

	invoke: function (fun, obj) {
		return _.invoke(this, fun, obj);
	},

	each: function (fun, obj) {
		return _.each(this, fun, obj);
	},

	map: function (fun, obj) {
		return _.map(this, fun, obj);
	},

	indexOf: function (val) {
		return _.indexOf(this, val);
	},

	sortedIndex: function (val) {
		return _.sortedIndex(this, val);
	},

	stableSortBy: function (fun, obj) {
		return _.sortBy(this, fun, obj);
	},

	groupBy: function (fun) {
		return _.groupBy(this, fun);
	},

	eachr: function (fun, obj) {
		var a = this;
		var i = a.length;
		while (i-- > 0)
			fun.call(obj, a[i], i, a);
	},

	findr: function (fun, obj) {
		var a = this;
		var i = a.length;
		while (i-- > 0) {
			if (fun.call(obj, a[i], i, a))
				return a[i];
		}
		return undef;
	},

	remove: function (object) {
		var i = this.indexOf(object);
		return (~i)
			? this.splice(i, 1)[0]
			: undef;
	}
});

times = _.times;
keys = _.keys;

function table(head, data) {
	var rows = [];
	var fields = keys(head);
	return data.map(function (v) {
		var row = {};
		fields.each(function (c, i) {
			row[c] = v[i];
		});
		return row;
	});
}

function firstdef() {
	var len = arguments.length
	for (var i = 0; i < len; i++) {
		if (!isundef(arguments[i])) {
			return arguments[i];
		}
	}
	return undefined;
}

// This ain't working (it's for my lang object).
function valuestofunctions(h) {
	var newh = {};
	for (k in h) {
		var v = h[k];
		newh[k] = function () { return v; };
	}
	return newh;
}

//
// Time.
//

function time() {
	return new Date().getTime();
}

//
// String.
//

function fill(len, c) {
	len = ~~len; // Catch undefined or NaN or null or fractions.
	return len < 1
		? "" // Catch negative.
		: new Array(len + 1).join(c);
}

function lpad(s, newLength, c) {
	s = ""+s;
	return fill(newLength - s.length, c) + s;
}

function msToString(ms) {
	ms = Math.floor(ms / 1000);
	var s = (ms % 60);
	ms = Math.floor(ms / 60);
	s = (ms % 60)+":"+lpad(s, 2, "0");
	if (ms < 60)
		return s;
	ms = Math.floor(ms / 60);
	s = (ms % 60)+":"+lpad(s, 5, "0");
	if (ms < 60)
		return s;
	ms = Math.floor(ms / 60);
	s = (ms % 24)+":"+lpad(s, 8, "0");
	if (ms < 24)
		return s;
	ms = Math.floor(ms / 24);
	s = ms+" days "+s;
	return s;
}

//
// Animation.
//

(function () {
	// Courtasy of paulirish.com
	// shim layer with setTimeout fallback

	function fallbackRequestAnimationFrame(/* function */ callback, /* DOMElement */ element) {
		var targetMspfGraphics = 1000 / 60;
		window.setTimeout(callback, targetMspfGraphics);
	}

	window.requestAnimFrame = (function () {
		return  window.requestAnimationFrame		||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame	||
				window.oRequestAnimationFrame	  ||
				window.msRequestAnimationFrame	 ||
				fallbackRequestAnimationFrame;
	})();
})();

// Copied from http://andylangton.co.uk/articles/javascript/get-viewport-size-javascript/
function viewportSize() {
	var viewportwidth;
	var viewportheight;

	// the more standards compliant browsers (mozilla/netscape/opera/IE7) use window.innerWidth and window.innerHeight

	if (!isundef(window.innerWidth))
	{
		viewportwidth = window.innerWidth,
		viewportheight = window.innerHeight
	}

	// IE6 in standards compliant mode (i.e. with a valid doctype as the first line in the document)

	else if (!isundef(document.documentElement)
		&& !isundef(document.documentElement.clientWidth)
		&& document.documentElement.clientWidth != 0)
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

(function () {

	var rgbaRe = /^rgba\((\d{1,3}),(\d{1,3}),(\d{1,3}),(\d?\.?\d*)\)$/i;
	var rgbRe = /^rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)$/i;

	var Color = Class.extend({
		init: function (str) {
			str = str.replace(/ /g,'');

			// Assume hexadecimal if length is short.
			var len = str.length;
			if (len < 9) {
				if (str.charCodeAt(0) == 35 && str.charCodeAt(0) != 35)
					log("ERROR: str.charCodeAt(0) == 35" + str);
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
				if (str.charCodeAt(3) == 40 && str.charCodeAt(3) != 40)
					log("ERROR: str.charCodeAt(3) == 40" + str);
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
	});

	this.rgb = function (r, g, b, a) {
		// Very small values of a will convert to a string as "1e-7" or similar, which is not a valid alpha.
		return ["rgba(", r, ",", g, ",", b, ",", a < 0.000001 ? 0 : a, ")"].join("");
	}

	this.hue = function (h) {
		var c = new HSVColour(h * 360, 100, 100);
		return c.getCSSIntegerRGB();
	}

	appendtoclass(String, {

		shiftColor: function (that, amount) {
			var ca = new Color(that);
			var ci = new Color(this);
			var r = Math.floor(ci.r + amount * (ca.r - ci.r));
			var g = Math.floor(ci.g + amount * (ca.g - ci.g));
			var b = Math.floor(ci.b + amount * (ca.b - ci.b));
			var a = ci.a + amount * (ca.a - ci.a);
			return rgb(r, g, b, a);
		},

		alpha: function (v) {
			var o = new Color(this);
			return rgb(o.r, o.g, o.b, o.a * v);
		}
	});
})();

//
// Drawing.
//

appendtoclass(CanvasRenderingContext2D, {

	// Uniform scale.
	uscale: function (s) {
		this.scale(s, s);
	},

	setFontFace: function (face, emphasis) {
		this.defaultFontFace = face;
		this.defaultFontEmphasis = emphasis;
	},

	setFontStyle: function (f, color /* = "#000" */, align /* = "left" */) {
		this.font = isnumber(f)
			? this.defaultFontEmphasis + " " + f + "pt " + this.defaultFontFace
			: f;
		this.fillStyle = firstdef(color, "#000");
		this.textAlign = firstdef(align, "left");
	},

	setLineStyle: function (width, color /* = "#000" */, cap /* = "butt" */) {
		this.lineWidth = width;
		this.strokeStyle = firstdef(color, "#000");
		this.lineCap = firstdef(cap, "butt");
	},

	strokeAndFillText: function (text, x, y) {
		this.strokeText(text, x, y);
		this.fillText(text, x, y);
	},

	fillWithStrokeStyle: function () {
		var fsBackup = this.fillStyle;
		this.fillStyle = this.strokeStyle;
		this.fill();
		this.fillStyle = fsBackup;
	},

	circle: function (x, y, radius) {
		this.beginPath();
		this.arc(x, y, radius, 0, Math.TAU, false);
	},

	fillCircle: function (x, y, radius) {
		this.circle(x, y, radius);
		this.fill();
	},

	strokeCircle: function (x, y, radius) {
		if (this.lineWidth * 0.5 >= radius) {
			this.circle(x, y, radius + this.lineWidth * 0.5);
			this.fillWithStrokeStyle();
		}
		else {
			this.circle(x, y, radius);
			this.stroke();
		}
	},

	strokeLine: function (x, y, w, h) {
		this.beginPath();
		this.moveTo(x, y);
		this.lineTo(x + w, y + h);
		this.stroke();
	},

	roundRect: function (x, y, w, h, r) {
		this.beginPath();
		this.moveTo(x + r, y);
		this.arcTo(x + w, y, x + w, y + r, r);
		this.arcTo(x + w, y + h, x + w - r, y + h, r);
		this.arcTo(x, y + h, x, y + h - r, r);
		this.arcTo(x, y, x + r, y, r);
	},

	fillRoundRect: function (x, y, w, h, r) {
		this.roundRect(x, y, w, h, r);
		this.fill();
	},

	strokeRoundRect: function (x, y, w, h, r) {
		this.roundRect(x, y, w, h, r);
		this.stroke();
	},

	polygon: function (points) {
		if (points.length < 1)
			return;
		this.beginPath();
		var last = points[points.length - 1];
		this.moveTo(last[0], last[1]);
		points.each(function (p) {
			this.lineTo(p[0], p[1]);
		}, this);
	},

	fillPolygon: function (points) {
		this.polygon(points);
		this.fill();
	},

	strokePolygon: function (points) {
		this.polygon(points);
		this.stroke();
	},

	star: function (x, y, r1, r2, rotation, numPoints) {
		this.polygon(createStar(x, y, r1, r2, rotation, numPoints));
	},

	fillStar: function (x, y, r1, r2, rotation, numPoints) {
		this.fillPolygon(createStar(x, y, r1, r2, rotation, numPoints));
	},

	strokeStar: function (x, y, r1, r2, rotation, numPoints) {
		this.strokePolygon(createStar(x, y, r1, r2, rotation, numPoints));
	}
});

//
// Math.
//

Math.TAU = Math.PI * 2;

// TODO: Consider making this return 0 if 0 for the principle of least surprise.
function sign(x) {
	return (x < 0) ? -1 : 1;
}

function randInt(n) {
	return Math.floor(Math.random() * n);
}

function rand() {
	return Math.random();
}

// For now, assume prob < 1
var Luck = Class.extend({
	init: function (prob) {
		this.oneinwhat = 1 / prob;
		this.debt = rand() * this.oneinwhat;
		this.untilnext = 0;
		this._computenext();
	},

	isnext: function () {
		this.untilnext -= 1;
		if (this.untilnext < 0) {
			this._computenext();
			return 1;
		}
		else {
			return 0;
		}
	},

	_computenext: function () {
		this.debt += this.oneinwhat;
		var nextnext = rand() * this.debt;
		this.untilnext += nextnext;
		this.debt -= nextnext;
	}
});

function bind(x, min, max) {
	return Math.min(Math.max(x, min), max);
}

// Geometry

function translate(array, tx, ty) {
	array.each(function (v) {
		v[0] += tx;
		v[1] += ty;
	});
	return array;
}

function rotate(array, ra) {
	var p = cart(ra);
	var c = p[0], s = p[1];
	var x;
	array.each(function (v) {
		x = v[0] * c - v[1] * s;
		v[1] = v[0] * s + v[1] * c;
		v[0] = x;
	});
	return array;
}

function scale(array, sx, sy) {
	array.each(function (v) {
		v[0] *= sx;
		v[1] *= sy;
	});
	return array;
}

function minimize(fun, min, max, precision /* = 0.00001 */, initialGuess /* = near the middle */) {
	precision = firstdef(precision, 0.00001);
	initialGuess = firstdef(initialGuess, min + (max - min) * 0.41421);

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
	var points = [];
	var angle = rotation;
	var angleInc = Math.TAU * 0.5 / numPoints;
	times(numPoints, function () {
		points.push(cart(angle, r2));
		angle += angleInc;
		points.push(cart(angle, r1));
		angle += angleInc;
	});
	translate(points, x, y);
	return points;
}

var Bounds = Class.extend({
	init: function (x, y, w, h) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	}
});

function intersectLines(x1, y1, x2, y2,
                        xA, yA, xB, yB)
	{
	var yByA = yB - yA;
	var x2x1 = x2 - x1;
	var xBxA = xB - xA;
	var y2y1 = y2 - y1;
	var den = yByA * x2x1 - xBxA * y2y1;
	if (den == 0 && den != 0)
		log("ERROR: den == 0"+den);
	if (den == 0)
		return undef;

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

function normalize(dx, dy) {
	var h = mag(dx, dy);
	return [dx / h, dy / h];
}

function mag(dx, dy) {
	return Math.sqrt(dx * dx + dy * dy);
}

function cart(ang, mag /* = 1 */) {
	mag = firstdef(mag, 1);
	return [mag * Math.cos(ang), mag * Math.sin(ang)];
}

function polar(x, y) {
	return [atan2(y, x), mag(x, y)];
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
	var ysign = sign((y1 + y2) * 0.5);
	var yox = function (x) {
		return ysign * Math.sqrt(r * r - x * x);
	};
	var dox = function (x) {
		return sqrPointSeg(x, yox(x), x1, y1, x2, y2);
	};
	var ex = minimize(dox, -r, r);
	var ey = yox(ex);
	return segPointSeg(ex, ey, x1, y1, x2, y2);
}

function segEllipsePoint(a, b, x1, y1) {
	var aSqrd = 1 / (a * a);
	var bSigned = b * sign(y1);
	var yox = function (x) {
		var s = 1 - x * x * aSqrd;
		return s <= 0 ? 0 : bSigned * Math.sqrt(1 - x * x * aSqrd)
	};
	var dox = function (x) {
		return sqr(x - x1, yox(x) - y1);
	};
	var ex = minimize(dox, -a, a);
	var ey = yox(ex);
	return [[ex, ey], [x1, y1]];
}

//
// Keyboard key codes.
// Copied from http://stackoverflow.com/questions/1465374/javascript-event-keycode-varants
//

if (isundef(KeyEvent)) {
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

var Sound = (function () {

	var sounds = [];
	var soundstoplay = [];
	var soundstoload = [];
	var audioready = false;
	var debugaudio = false;

	soundManager.setup({

		url: 'lib/',

		useHTML5Audio: true,

		preferFlash: !DEVMODE,

		flashVersion: 9, // optional: shiny features (default = 8)

		useFlashBlock: DEVMODE, // optionally, enable when you're ready to dive in

		debugFlash: debugaudio,

		debugMode: debugaudio,

		consoleOnly: debugaudio,

		onready: function() {
			// Ready to use; soundManager.createSound() etc. can now be called.
			audioready = true;
			Sound.loadsounds();
		},

		ontimeout: function (status) {
			// TODO: Make this appear on webpage.
			log('SM2 failed to start. Flash missing, blocked or security error?');
			log('The status is ' + status.success + ', the error type is ' + status.error.type);
		}
	});

	var SoundSingleton = Class.extend({
		init: function () {},

		setsounds: function (soundnames) {
			soundstoload = soundnames;
			Sound.loadsounds();
		},

		loadsounds: function () {
			if (!audioready) {
				return;
			}
			soundstoload.each(function (name, i) {
				sounds[name] = soundManager.createSound({
					id: "sound" + i,
					url: "wav/" + name + ".mp3",
					onload: function () {
						// log(this.url+" is ready to play");
					}
					// other options here..
				});
			});
			soundstoload = [];
		},

		push: function (s) {
			soundstoplay.push(s);
		},

		playall: function () {
			soundstoplay.each(function (sound) {
				if (sounds[sound]) {
					sounds[sound].play();
				}
			});
			soundstoplay = [];
		}
	});

	return new SoundSingleton();
})();
