
function createHtml5Pane() {
	var s = '';
	var append = function(name, flag) {
		s = s+name+': '+(flag ? '<font style="color: #009900;"><b>Supported</b></font>' : '<font style="color: #990000;"><b>NOT supported :(</b></font>')+'<br />';
	};
	append('HTML5 Canvas', Modernizr.canvas);
	append('HTML5 Canvas Text', Modernizr.canvastext);
	append('HTML5 Audio', Modernizr.audio);
	append('HTML5 Audio \'mp3\' format', Modernizr.audio.mp3);
	append('HTML5 Local Storage', Modernizr.localstorage);
	s = '<div style="margin: 10px; padding: 10px;"><b>Browser Compatability:</b><br />'+s+'</div>';
	document.getElementById('html5').innerHTML = s;
}
