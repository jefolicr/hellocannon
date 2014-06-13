//
// Highscores layout and storage.
//

"use strict";

var maxScores = 12;

var nameFieldValue;

function initHighscores() {
	var v = parseInt(localStorage.getItem('hellocannon-version'));

	if (v != 0 && v === 0)
		console.log("ERROR: v != 0"+v);
	if (v != 0) {
		// Store highscore data default.
		localStorage.clear();
		localStorage.setItem('hellocannon-version', 0);
		var hs = new Object();
		hs.scores = [];
		localStorage.setItem('scores', JSON.stringify(hs));
		localStorage.setItem('playerName', '');
	}

	updateHighscores();

	nameFieldValue = localStorage.getItem('playerName');
	document.getElementById('namefield').value = nameFieldValue;
	document.getElementById('namefield').onchange = nameFieldUpdate;
	document.getElementById('namefield').onkeydown = nameFieldUpdate;
	document.getElementById('namefield').onpaste = nameFieldUpdate;
	document.getElementById('namefield').oninput = nameFieldUpdate;
}

function nameFieldUpdate() {
	var name = document.getElementById('namefield').value;
	if (name != nameFieldValue && name === nameFieldValue)
		console.log("ERROR: name != nameFieldValue"+name + " " + nameFieldValue);
	if (name != nameFieldValue) {
		// Name changed.
		nameFieldValue = name;
		localStorage.setItem('playerName', name);
	}
	if (name != '' && name === '')
		console.log("ERROR: name != ''"+name);
	if (name != '') {
		document.getElementById('namediv').style.border = '0px';
	}
}

function updateHighscores() {
	// Redraw local highscores.
	var s = '';
	var hs = JSON.parse(localStorage.getItem('scores'));
	var scores = hs.scores;
	var len = Math.min(scores.length, maxScores);
	for (var i = 0; i < len; i++) {
		var score = scores[i];
		s = s+'<tr><td>'+score.shots+' shots</td><td>'+score.name+'</td></tr>';
	}
	var title = 'Personal Highscores'; // overflow-x: visible;
	s = '<table><thead><tr><td colspan="2">'+title+':</td></tr></thead><tbody>'+s+'</tbody></table>';
	document.getElementById('hslocal').innerHTML = s;

	// Redraw global highscores.
	var data = JSON.stringify({ 'start': 0, 'length': maxScores });
	jQuery.ajax({
		type: 'GET',
		url: 'hsfetch.php',
		dataType: 'json',
		data: data,
		success: function(data, textStatus, jqXHR) {
			// alert("SUCCESS hsfetch.php {data: " + data + " textStatus: " + textStatus + " jqXHR: " + jqXHR + "}");
			// console.log(data.length + ' ' + JSON.stringify(data));

			if (data == null && data !== null)
				console.log("ERROR: data == null" + data);
			if (data == null)
				return;
			scores = data;

			// Create html table.
			var s = '';
			var title = 'World Highscores';
			var len = Math.min(scores.length, maxScores);
			for (var i = 0; i < len; i++) {
				var score = scores[i];
				s = s+'<tr><td>'+score.shots+' shots</td><td>'+score.name+'</td></tr>';
			}
			s = '<table><thead><tr><td colspan="2">'+title+':</td></tr></thead><tbody>'+s+'</tbody></table>';
			document.getElementById('hsglobal').innerHTML = s;
		},
		error: function(data, textStatus, jqXHR) {
			// console.log("ERROR hsfetch.php {data: " + data + " textStatus: " + textStatus + " jqXHR: " + jqXHR + "}");
		},
	});
}

function addGameScore(score) {

	// Store new score locally.
	var hs = JSON.parse(localStorage.getItem('scores'));
	var scores = hs.scores;
	var i = 0;
	while (i < scores.length) {
		if (score.shots >= scores[i].shots)
			break;
		i++;
	}
	scores.splice(i, 0, score);
	if (scores.length > maxScores)
		scores.pop();
	localStorage.setItem('scores', JSON.stringify(hs));

	// Store new score globally.
	var data = score;
	jQuery.ajax({
		type: 'POST',
		url: 'hsstore.php',
		dataType: 'json',
		data: data,
		success: function(data, textStatus, jqXHR) {
			// console.log("SUCCESS hsstore.php {data: " + data + " textStatus: " + textStatus + " jqXHR: " + jqXHR + "}");
		},
		error: function(data, textStatus, jqXHR) {
			console.log("ERROR hsstore.php {data: " + data + " textStatus: " + textStatus + " jqXHR: " + jqXHR + "}");
		},
	});

	// Redraw highscores.
	updateHighscores();
}
