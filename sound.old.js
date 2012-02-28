//
// Audio
// 
// Credit due: http://www.storiesinflight.com/html5/audio.html
//

const enable_audio = true;

const channel_max = 12; // number of channels

const audiochannels = new Array();

for (var i = channel_max; i-- > 0; ) { // prepare the channels
    audiochannels[i] = new Array();
    audiochannels[i]['channel'] = new Audio(); // create a new audio object
    audiochannels[i]['finished'] = -1; // expected end time for this channel
}

function play_multi_sound(s) {
    if (enable_audio == false)
        return;
    var thistime = new Date();
    var mostchannel = null;
    for (var i = channel_max; i-- > 0; ) {
        if (!mostchannel || audiochannels[i]['finished'] < mostchannel['finished']) {
            mostchannel = audiochannels[i];
        }
    }
    mostchannel['finished'] = thistime.getTime() + document.getElementById(s).duration * 1000;
    mostchannel['channel'].src = document.getElementById(s).src;
    mostchannel['channel'].load();
    mostchannel['channel'].play();
}

audiotoplay = new Array();
function push_multi_sound(s) {
    audiotoplay.push(s);
}
function play_all_multi_sound() {
    for (var i = 0; i < audiotoplay.length; i++)
        play_multi_sound(audiotoplay[i]);
    audiotoplay = new Array();
}
