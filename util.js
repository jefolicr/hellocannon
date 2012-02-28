
//
// Misc.
//

Math.round = function(x, m) {
    if (x < 0)
        x -= (m - 1) / 2;
    else
        x += (m - 1) / 2;
    return x - (x % m);
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
    var fill = '';
    if (!(len > 0))
        return fill;
    for (var i = Math.floor(len); i-- != 0; )
        fill += c;
    return fill;
}

function padl(s, c, newLength) {
    return fill(c, newLength - s.length) + s;
}

function msToString(ms) {
    ms = Math.floor(ms / 1000);
    var s = ''+(ms % 60);
    if (ms < 60)
        return s;
    ms = Math.floor(ms / 60);
    s = (ms % 60)+':'+padl(s, '0', 2);
    if (ms < 60)
        return s;
    ms = Math.floor(ms / 60);
    s = (ms % 60)+':'+padl(s, '0', 5);
    if (ms < 60)
        return s;
    ms = Math.floor(ms / 60);
    s = (ms % 24)+':'+padl(s, '0', 8);
    if (ms < 24)
        return s;
    ms = Math.floor(ms / 24);
    s = ms+' days '+s;
    return s;
}

// that - another color, amount - 0 to 1.0, return new RGBColor.
// TODO: Make this work with alpha.
RGBColor.prototype.linear = function(that, amount) {
    var tnuoma = 1.0 - amount;
    var r = Math.floor(this.r * tnuoma + that.r * amount);
    var g = Math.floor(this.g * tnuoma + that.g * amount);
    var b = Math.floor(this.b * tnuoma + that.b * amount);
    return new RGBColor('rgb('+r+','+g+','+b+')');
}

function linearColor(c1, c2, amount) {
    rgb1 = new RGBColor(c1);
    rgb2 = new RGBColor(c2);
    rgbResult = rgb1.linear(rgb2, amount);
    return rgbResult.toHex();
}

//
// Array.
//

Array.prototype.indexOf = function(object) {
    for (var i = this.length; i-- != 0;) {
        if (this[i] === object)
            return i;
    }
    return -1;
}

Array.prototype.remove = function(object) {
    var i = this.indexOf(object);
    if (i == -1)
        return null;
    else {
        object = this[i]; // I don't know javascript very well. I just did this just to ensure that a reference to the original object in the array is returned - like if it's numbers or something? I dunno. Whatever. Doesn't matter, but I'll leave it.
        this.splice(i, 1);
        return object;
    }
}

//
// Drawing.
//

CanvasRenderingContext2D.prototype.strokeCircle = function(x, y, radius) {
    this.beginPath();
    this.arc(x, y, radius, 0, Math.PI*2, false);
    this.closePath();
    this.stroke();
}

CanvasRenderingContext2D.prototype.fillCircle = function(x, y, radius) {
    this.beginPath();
    this.arc(x, y, radius, 0, Math.PI*2, false);
    this.closePath();
    this.fill();
}

CanvasRenderingContext2D.prototype.strokeLine = function(x0, y0, x1, y1) {
    this.beginPath();
    this.moveTo(x0, y0);
    this.lineTo(x1, y1);
    this.closePath();
    this.stroke();
}

CanvasRenderingContext2D.prototype.fillRoundRect = function(x, y, w, h, r) {
    with (this) {
        beginPath();
        moveTo(x + r, y);
        arcTo(x + w, y, x + w, y + r, r);
        arcTo(x + w, y + h, x + w - r, y + h, r);
        arcTo(x, y + h, x, y + h - r, r);
        arcTo(x, y, x + r, y, r);
        closePath();
        fill();
    }
}

CanvasRenderingContext2D.prototype.strokeRoundRect = function(x, y, w, h, r) {
    with (this) {
        beginPath();
        moveTo(x + r, y);
        arcTo(x + w, y, x + w, y + r, r);
        arcTo(x + w, y + h, x + w - r, y + h, r);
        arcTo(x, y + h, x, y + h - r, r);
        arcTo(x, y, x + r, y, r);
        closePath();
        stroke();
    }
}

//
// Geometry.
//

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

// return distance squared between x0,y0 and line-segment(x1,y1,x2,y2)
function sqrSegPoint(x1, y1, x2, y2, x0, y0) {
    // If point lies beyond line segment endpoint (x1,y1),
    // then return distance to that endpoint.
    if (dot(x1, y1, x2, y2, x0, y0) > 0)
        return sqr(x2 - x0, y2 - y0);
    
    // If point lies beyond line segment endpoint (x2,y2),
    // then return distance to that endpoint.
    if (dot(x2, y2, x1, y1, x0, y0) > 0)
        return sqr(x1 - x0, y1 - y0);
    
    // Otherwise, return distance to line.
    var d = cross(x0, y0, x2, y2, x1, y1) / mag(x2 - x1, y2 - y1);
    return d * d;
}

//
// Keyboard key codes.
// Copied from http://stackoverflow.com/questions/1465374/javascript-event-keycode-constants
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
// Audio
// Copied from http://www.storiesinflight.com/html5/audio.html
//

const enable_audio = true;

var channel_max = 10; // number of channels
audiochannels = new Array();
for (a=0;a<channel_max;a++) { // prepare the channels
    audiochannels[a] = new Array();
    audiochannels[a]['channel'] = new Audio(); // create a new audio object
    audiochannels[a]['finished'] = -1; // expected end time for this channel
}
function play_multi_sound(s) {
    if (enable_audio == false)
        return;
    for (a=0;a<audiochannels.length;a++) {
        thistime = new Date();
        if (audiochannels[a]['finished'] < thistime.getTime()) { // is this channel finished?
            audiochannels[a]['finished'] = thistime.getTime() + document.getElementById(s).duration*1000;
            audiochannels[a]['channel'].src = document.getElementById(s).src;
            audiochannels[a]['channel'].load();
            audiochannels[a]['channel'].play();
            break;
        }
    }
}

//
// My addition to above, for use with animated game to eliminate
// multiple of the same audio played at exactly the same time.
//

audiotoplay = new Array();
function push_multi_sound(s) {
    for (var i = 0; i < audiotoplay.length; i++)
        if (audiotoplay[i] == s)
            return;
    audiotoplay.push(s);
}
function play_all_multi_sound() {
    for (var i = 0; i < audiotoplay.length; i++)
        play_multi_sound(audiotoplay[i]);
    audiotoplay = new Array();
}

