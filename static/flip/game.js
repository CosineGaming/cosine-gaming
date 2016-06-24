var container = null;
var game = null;
var size = null;

var player = null;
var matrix = null;

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

var lastLine = null;

var displayMatrix = null;
var tweenAt = null;
var tweenStart = null;
var tweenHandle = null;

var version = "0.2";

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
    answer = game.image("http://cosinegaming.com/static/flip/assets/target.svg", playerSize);
    player = game.image("http://cosinegaming.com/static/flip/assets/player.svg", playerSize);
    reset = game.image("http://cosinegaming.com/static/flip/assets/reset.svg", 6).move(72, 4);

	initText();

    score = 0;

    startTime = new Date();

    if (!loadLevel())
    {
        setLevel(0);
    }

}

function initText()
{

    var font = ({ family: "Palatino Linotype", size: 3 });

    movesText = game.text("");
    movesText.font(font);
    movesText.move(80, 2);

    parText = game.text("");
    parText.font(font);
    parText.move(80, 6);

    onParText = game.text("");
    onParText.font(font);
    onParText.move(80, 10);

    offLevelText = game.text("YOU DIED. RESTARTING LEVEL.")
    offLevelText.font(font);
    offLevelText.style("fill", "#000");
    offLevelText.style("stroke", "#FFF");
    offLevelText.style("stroke-width", "0.05");
    offLevelText.style("font-size", "15");
    offLevelText.move(10, 90);

    levelText = game.text("");
    levelText.font(font);
    levelText.move(4, 2);

    scoreText = game.text("");
    scoreText.font(font);
    scoreText.move(4, 6);

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

    moves = 0;
    var par = levels[level].par;
    if (!par)
    {
        par = "Unsolved"
    }
    parText.text("TARGET: " + par);
    onParText.hide();
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

    redraw();

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
            if (parts[1] == 0)
            {
                if (level >= 7)
                {
                    level += 2;
                }
            }
            if (parts[1] == 1)
            {
                level = 0;
                if (score < 0)
                {
                    score = 0;
                }
            }
            setLevel(level);
            return true;
        }
        else
        {
            alert("Sorry, your save game was from an unsupported version.");
            return false;
        }

    }
    else
    {
        return false;
    }

}

function getLine(x, y)
{

    var margin = 12;
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
                if (moves <= levels[level].par)
                {
					onParText.text("ON PAR!")
                    score += 20;
                }
                else
                {
					onParText.text("COMPLETED!")
                    score += 10;
                }
                setTimeout(setLevel, 2500, level + 1);
            }

            redraw();

        }

    }

}

function hovered(e)
{

    var x = gameX(e.pageX - container.offsetLeft);
    var y = gameY(e.pageY - container.offsetTop);

    if (lastLine != null)
    {
        levelLines[lastLine].stroke({ color: "#000" });
    }

    if (x >= 0 && x <= 100)
    {

        var line = getLine(x, y);

        if (line != null)
        {
            levelLines[line].stroke({ color: "#888" });
            lastLine = line;
        }

    }

}

function pressed(e)
{

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

function reflect(line)
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
    matrix = flip.multiply(matrix);

}

function redraw()
{
	player.matrix(displayMatrix.at(tweenAt));
    movesText.text("MOVES: " + moves);
    scoreText.text("SCORE: " + score);
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
    redraw();
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
    var req = new XMLHttpRequest();
    req.open("get", "http://cosinegaming.com/flip/data?level="+level+"&time="+time+"&moves="+moves, true);
    req.send();
    startTime = now;

}

function addLine(line)
{
    var points = lineGroup.line(line[0], line[1], line[0] + line[2], line[1] + line[3]);
    return points.stroke({ width: 1 });
}

document.addEventListener("DOMContentLoaded", initialize);
