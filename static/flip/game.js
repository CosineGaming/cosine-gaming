/* This is the entry point of the game FLIP by Cosine Gaming, written entirely by Cosine
 * Flip is a puzzle game about reflecting. 
 * When you click on a line, the blue "R" will reflect across it. You try to get the blue "R" to the green one
 * It's written in javascript with the library SVG.js (https://svgdotjs.github.io/)
 * This file is... well pretty much everything. It's all the game logic. Only levels.js (the level data) and some svgs are outside it.
 *
 * @licstart The following is the entire license notice for the Javascript code in this page.
 *
 * Copyright 2015-2017 (continuously updated on web) Cosine Gaming
 *
 * The JavaScript code in this page is free software: you can
 * redistribute it and/or modify it under the terms of the GNU
 * General Public License (GNU GPL) as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option)
 * any later version.  The code is distributed WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.
 *
 * As additional permission under GNU GPL version 3 section 7, you
 * may distribute non-source (e.g., minimized or compacted) forms of
 * that code without the copy of the GNU GPL normally required by
 * section 4, provided you include this license notice and a URL
 * through which recipients can access the Corresponding Source.
 *
 * @licend The above is the entire license notice for the JavaScript code in this page.
 *
 * TODO:
 * 	Mobile support
 * 		Don't turn grey...?
 *
 */

var container = null;
var game = null;
var size = null;

var player = null;
var matrix = null;
var ghost = null;

var answer = null;
var reset = null;

var level = null;
var levelLines = null;
var lineGroup = null;

var levelObstacles = null;
var obstacleGroup = null;

var moves = null;
var score = null;

var movesText = null;
var parText = null;
var onParText = null;
var offLevelText = null;
var levelText = null;
var scoreText = null;

var helpGroup = null;
var arrow = null;

var lastLine = null;

var displayMatrix = null;
var tweenAt = null;
var tweenStart = null;
var tweenHandle = null;

// TODO: Change font to Courier New and make it fit
var font = ({ family: "Courier New", size: 3, fill: "black" });

var version = "1.0";

var playerSize = 8;

function initialize()
{

	container = document.getElementById("game");
	container.setAttribute("tabindex", 0)
		container.addEventListener("mouseup", clicked);
	container.addEventListener("mousemove", hovered);
	container.addEventListener("keyup", pressed);
	container.focus();

	document.addEventListener("resize", resize);
	resize();

	game = SVG("game").viewbox(0,0,100,100);
	var gridStyle = { color: "#BBB", width: 0.2 };
	for (var i=0; i<100; i+=10)
	{
		game.line(i, 0, i, 100).stroke(gridStyle);
		game.line(0, i, 100, i).stroke(gridStyle);
	}
	lineGroup = game.group();
	obstacleGroup = game.group();
	helpGroup = game.group();
	answer = game.image("//cosinegaming.com/static/flip/assets/target.svg", playerSize);
	player = game.image("//cosinegaming.com/static/flip/assets/player.svg", playerSize);
	ghost  = game.image("//cosinegaming.com/static/flip/assets/ghost.svg", playerSize).opacity(0);
	reset = game.image("//cosinegaming.com/static/flip/assets/reset.svg", 6).move(72, 4);

	arrow = game.marker(8, 8, function(line) {
		var stroke = {color: "#777", width: "1"};
		line.line(0, 0, 8, 4).stroke(stroke);
		line.line(0, 8, 8, 4).stroke(stroke);
	}).ref(8, 4);

	initText();

	score = 0;

	startTime = new Date();

	if (!loadLevel())
	{
		var text = helpGroup.text("Sorry, but your save is from an unsupported version.\nHINT: Press 9 and 0 to navigate levels.").font(font).move(12, 25);
		color(text, "help");
	}

}

function color(text, textColor)
{
	if (textColor == "red")
	{
		textColor = "#7F0000";
	}
	else if (textColor == "green")
	{
		textColor = "#007F00";
	}
	else if (textColor == "help")
	{
		textColor = "#777";
	}
	else
	{
		console.log("color function given unknown color " + textColor);
	}
	text.fill({color: textColor});
}

function initText()
{


	movesText = game.text("");
	movesText.font(font).move(80, 2);

	parText = game.text("");
	parText.font(font).move(80, 6);

	onParText = game.text("");
	onParText.font(font).move(80, 10);

	offLevelText = game.text("YOU DIED. RESTARTING LEVEL.")
	offLevelText.font(font);
	color(offLevelText, "red");
	offLevelText.move(10, 90);

	levelText = game.text("");
	levelText.font(font).move(4, 2);

	scoreText = game.text("");
	scoreText.font(font).move(4, 6);

}

// Used for the arcs in help, a partial circle
// Thank thank mr skeltel http://stackoverflow.com/a/18473154
function slopeToXY(centerX, centerY, radius, slope, pos)
{
	if (slope === null)
	{
		return {x: centerX, y: centerY + radius * (pos ? 1 : -1)}
	}
	var length = Math.sqrt(slope*slope + 1);
	return { x: centerX + radius / length * (pos ? 1 : -1), y: centerY + radius * slope / length * (pos ? 1 : -1) };
}

// Thank thank see above
function describeArc(x, y, radius, startSlope, posStart, endSlope, posEnd, largeArc)
{

	var start = slopeToXY(x, y, radius, startSlope, posStart);
	var end = slopeToXY(x, y, radius, endSlope, posEnd);
	var d = [
		"M", start.x, start.y, 
		"A", radius, radius, 0, 0, +largeArc, end.x, end.y
	].join(" ");

	return d;

}

function setLevel(lvl)
{

	level = lvl;

	lineGroup.clear();
	levelLines = [];
	
	lines = levels[level].lines;
	for (var i=0; i<lines.length; i++)
	{
		levelLines.push(addLine(lines[i]));
	}
	lastLine = null;

	matrix = new SVG.Matrix;
	displayMatrix = matrix;
	player.matrix(displayMatrix);

	moves = 0;
	var par = levels[level].par;
	if (!par)
	{
		par = "Unsolved"
	}
	parText.text("NEEDED: " + par);
	onParText.hide();
	color(scoreText, "black");
	color(movesText, "black");
	offLevelText.hide();
	levelText.text("LEVEL: " + (level + 1));

	levelObstacles = [];
	obstacleGroup.clear();

	var pos = levels[level].player;
	if (pos)
	{

		player.x(pos[0]);
		player.y(pos[1]);
		answer.x(pos[0]);
		answer.y(pos[1]);
		ghost.x(pos[0]);
		ghost.y(pos[1]);

		if (typeof levels[level].obstacles != "undefined")
		{
			for (var i=0; i<levels[level].obstacles.length; i++)
			{
				levelObstacles.push(obstacleGroup.image("http://cosinegaming.com/static/flip/assets/obstacle.svg", playerSize).move(pos[0], pos[1]));
			}
		}

	}

	if (levels[level].answer)
	{
		answer.matrix(levels[level].answer);
	}
	for (var i=0; i<levelObstacles.length; i++)
	{
		levelObstacles[i].matrix(levels[level].obstacles[i]);
	}

	helpGroup.clear();
	if (typeof levels[level].help != "undefined")
	{
		var help = levels[level].help;
		if (typeof help.text != "undefined")
		{
			for (var i=0; i<help.text.length; i++)
			{
				var text = helpGroup.text(help.text[i][2]).font(font);
				color(text, "help");
				text.move(help.text[i][0], help.text[i][1]);
			}
		}
		if (typeof help.lines != "undefined")
		{
			for (var i=0; i<help.lines.length; i++)
			{
				var line = addLine(help.lines[i], helpGroup);
				line.attr("stroke-dasharray", "1, 1");
				line.stroke({ width: "0.4", color: "#777" });
				if (!help.lines[i][4]) // If list is five long and fifth is true, no arrows
				{
					line.marker("end", arrow);
				}
			}
		}
		if (typeof help.curves != "undefined")
		{
			for (var i=0; i<help.curves.length; i++)
			{
				var c = help.curves[i];
				var radius = 10;
				if (c[7])
				{
					radius = c[7];
				}
				var curve = helpGroup.path(describeArc(c[0], c[1], radius, c[2], c[3] == "+", c[4], c[5] == "+", c[6] == "cw"));
				curve.fill({ opacity: 0 });
				curve.attr("stroke-dasharray", "1, 1");
				curve.stroke({ width: "0.4", color: "#777" });
				curve.marker("end", arrow);
			}
		}
	}

	ghost.opacity(0);

	scoreText.text("SCORE: " + score);
	movesText.text("MOVES : 0");

	localStorage.setItem("version", version);
	localStorage.setItem("score", score);
	localStorage.setItem("level", level);

}

function loadLevel()
{

	var saveVersion = localStorage.getItem("version");
	if (saveVersion)
	{

		score = parseInt(localStorage.getItem("score"));
		level = parseInt(localStorage.getItem("level"));
		var parts = saveVersion.split(".");
		var thisVersionParts = version.split(".");
		// The first number indicates irreversable save file changes
		if (parts[0] == thisVersionParts[0])
		{
			// The second number are changes that are fixable
			// (eg adding two levels between 6 and 7)
			if (parts[1] == 1)
			{
				// This version was mismarked as compatible despite being incompatible
				setLevel(0);
				return false;
			}
			setLevel(level);
			return true;
		}
		else
		{
			setLevel(0);
			return false;
		}

	}
	else
	{
		setLevel(0);
		return true;
	}

}

function getLine(x, y)
{

	var margin = 64;
	var closest = null;
	var closest_ds = null;

	setup = levels[level].lines;

	for (var i=0; i<lines.length; i++)
	{

		var line = lines[i];
		var d_squared = null;

		var m = slope(line);
		if (m)
		{
			var b = line[1] - m*line[0];
			// Find perpendicular line's intersection with line (nearest point)
			var near_x = ((y + x/m) - b) / (m + 1/m);
			var near_y = m*near_x + b;
			var d_x = x - near_x;
			var d_y = y - near_y;
			d_squared = d_x*d_x + d_y*d_y;
		}
		else
		{
			var distance = null;
			if (m == null)
			{
				distance = x - line[0];
			}
			else
			{
				distance = y - line[1];
			}
			d_squared = distance*distance;
		}

		if (d_squared < margin)
		{
			if (closest == null || d_squared < closest_ds)
			{
				closest = i;
				closest_ds = d_squared;
			}
		}

	}

	return closest;

}

function lose()
{
	score -= 5;
	scoreText.text("SCORE: " + score + " (-5)");
	color(scoreText, "red");
	offLevelText.show();
	setTimeout(setLevel, 2000, level);
}

function clicked(e)
{

	var x = gameX(e.pageX - container.offsetLeft);
	var y = gameY(e.pageY - container.offsetTop);
	e.preventDefault();

	if (x >= 0 && x <= 100)
	{

		// Reset button
		if (x > reset.x() && x < reset.x() + reset.width()
			&& y > reset.y() && y < reset.y() + reset.height())
		{
			setLevel(level);
			return;
		}

		var line = getLine(x, y);

		if (line != null)
		{

			skipTween();

			reflect(levels[level].lines[line]);

			moves += 1;
			movesText.text("MOVES : " + moves);
			if (moves > levels[level].par * 1.4)
			{
				// Add help text to suggest restarting when it is much overdue
				color(movesText, "red");
				var text = helpGroup.text("Press R or click to restart").font(font).move(21, 5);
				color(text, "help");
				var line = addLine([65, 8, 8, 0], helpGroup);
				line.attr("stroke-dasharray", "1, 1");
				line.stroke({ width: "0.4", color: "#777" });
				line.marker("end", arrow);
			}

			displayMatrix.morph(matrix);
			tweenAt = 0;
			tweenHandle = requestAnimationFrame(tween);

			var center = matrix.multiply(new SVG.Matrix("0,0,0,0," + (player.x() + 4) + "," + (player.y() + 4)));
			center = [center.e, center.f];
			if (center[0] < 0 || center[0] > 100 || center[1] < 0 || center[1] > 100)
			{
				lose();
			}
			if (typeof levels[level].obstacles != "undefined")
			{
				for (var i=0; i<levels[level].obstacles.length; i++)
				{
					if (matEq(matrix, new SVG.Matrix(levels[level].obstacles[i])))
					{
						lose();
					}
				}
			}
			if (matEq(matrix, new SVG.Matrix(levels[level].answer)))
			{
				sendData();
				onParText.show();
				plus = 0;
				if (moves <= levels[level].par)
				{
					onParText.text("ON PAR!");
					plus = 20;
				}
				else
				{
					onParText.text("COMPLETED!")
					plus = 10;
				}
				score += plus;
				color(onParText, "green");
				color(scoreText, "green");
				scoreText.text("SCORE: " + score + " (+" + plus + ")");
				setTimeout(setLevel, 2500, level + 1);
			}

			hovered(e);

		}

	}

}

function hovered(e)
{

	var x = gameX(e.pageX - container.offsetLeft);
	var y = gameY(e.pageY - container.offsetTop);
	e.preventDefault();

	if (lastLine != null)
	{
		levelLines[lastLine].stroke({ color: "#000" });
		ghost.opacity(0);
	}

	if (x >= 0 && x <= 100)
	{

		var line = getLine(x, y);

		if (line != null)
		{
			levelLines[line].stroke({ color: "#888" });
			lastLine = line;
			ghost.matrix(getReflection(matrix, levels[level].lines[line]));
			ghost.opacity(0.5);
		}

	}

}

function pressed(e)
{

	e.preventDefault();

	if (e.keyCode == "B".charCodeAt(0))
	{
		var fullString = matrix.toString();
		// Strips "matrix("...")", then adds quotes
		document.write("\"" + fullString.substr(7,fullString.length-8) + "\"");
	}
	if (e.keyCode == "R".charCodeAt(0))
	{
		setLevel(level);
	}
	if (e.keyCode == "9".charCodeAt(0))
	{
		setLevel(level - 1);
	}
	if (e.keyCode == "0".charCodeAt(0))
	{
		setLevel(level + 1);
	}

}

function getReflection(original, line)
{

	var m = slope(line);
	var flip = null;
	if (m != null && m != 0)
	{
		var b = line[1] - m*line[0];
		var q1 = m + (1 / m);
		var q2 = 1 + m*m;
		// Matricized version of http://martin-thoma.com/reflecting-a-point-over-a-line/
		// 1 3 5
		// 2 4 6
		flip = new SVG.Matrix(2/m/q1 - 1, 2*m/q2, 2/q1, 2*m*m/q2 - 1, -2*b/q1, 2*b/q2);
	}
	else
	{
		if (m == null)
		{
			// Vertical line flip
			flip = new SVG.Matrix(-1, 0, 0, 1, 2 * line[0], 0);
		}
		else
		{
			// Horizontal line flip
			flip = new SVG.Matrix(1, 0, 0, -1, 0, 2 * line[1]);
		}
	}
	return flip.multiply(original);

}

function reflect(line)
{

	matrix = getReflection(matrix, line);
	return;

}

function tween(time)
{
	var tweenTime = 320;
	if (!tweenStart) tweenStart = time;
	var elapsed = time-tweenStart;
	tweenAt = elapsed / tweenTime;
	if (tweenAt >= 1)
	{
		tweenStart = null;
		tweenAt = 0;
		displayMatrix = displayMatrix.at(1);
	}
	else
	{
		tweenHandle = requestAnimationFrame(tween);
	}
	player.matrix(displayMatrix.at(tweenAt));
}

function skipTween()
{
	if (tweenHandle)
	{
		cancelAnimationFrame(tweenHandle);
		tweenHandle = null;
		tweenStart = null;
		displayMatrix = displayMatrix.at(tweenAt);
		tweenAt = 0;
	}
}

function near(a, b)
{
	var epsilon = 0.001;
	return Math.abs(a - b) < epsilon;
}

function matEq(a, b)
{
	return (near(a.a, b.a) && near(a.b, b.b) && near(a.c, b.c) &&
			near(a.d, b.d) && near(a.e, b.e) && near(a.f, b.f));
}

function slope(line)
{
	if (line[2] == 0)
	{
		return null;
	}
	else
	{
		return line[3] / line[2];
	}
}

function gameX(windowX)
{
	return windowX / size * 100;
}
function gameY(windowY)
{
	return windowY / size * 100;
}

function resize()
{
	size = Math.min(container.offsetWidth, container.offsetHeight);
}

function sendData()
{

	// Send the time it took to beat the level to CG so I can optimize difficulty
	var now = new Date();
	var time = Math.floor((now - startTime) / 1000);
	var domain = window.location.hostname;
	var req = new XMLHttpRequest();
	req.open("get", "flip/data?level="+level+"&time="+time+"&moves="+moves+"&host="+domain, true);
	req.send();
	startTime = now;

}

function addLine(line, group)
{
	if (typeof group == "undefined")
	{
		group = lineGroup;
	}
	var points = group.line(line[0], line[1], line[0] + line[2], line[1] + line[3]);
	return points.stroke({ width: 1 });
}

document.addEventListener("DOMContentLoaded", initialize);
