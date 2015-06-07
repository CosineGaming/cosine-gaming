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

var moves = null;
var score = null;

var movesText = null;
var parText = null;
var onParText = null;
var levelText = null;
var scoreText = null;

var lastLine = null;

var displayMatrix = null;
var tweenDelta = null;
var tweenHandle = null;

var startedTime = null;

var version = "0.1";

var firefoxBlurFix = 1;

function initialize()
{

    container = document.getElementById("game");
    container.setAttribute("tabindex", 0)
    container.addEventListener("mouseup", clicked);
    container.addEventListener("mousemove", hovered);
    container.addEventListener("keyup", pressed);
    container.focus();

    resize();
    window.onresize = resize;

    game = SVG("game").viewbox(0,0,100,100);
    lineGroup = game.group();
    var playerSize = 8 * firefoxBlurFix;
    player = game.image("/static/flip/assets/player.svg", playerSize, playerSize);
    answer = game.image("/static/flip/assets/target.svg", playerSize, playerSize);
    reset = game.image("/static/flip/assets/reset.svg", 6, 6).move(72, 4);

    score = 0;
    startTime = new Date();

    if (!loadLevel())
    {
        setLevel(0);
    }

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

    matrix = numeric.identity(3);
    numeric.diveq(matrix, firefoxBlurFix);
    skipTween();

    moves = 0;
    var font = ({ family: "Palatino Linotype", size: 3 });
    if (movesText == null)
    {
        movesText = game.text("");
        movesText.font(font);
        movesText.x(80);
        movesText.y(2);
    }
    if (parText == null)
    {
        parText = game.text("");
        parText.font(font);
        parText.x(80)
        parText.y(6);
    }
    if (onParText == null)
    {
        onParText = game.text("ON PAR!");
        onParText.font(font);
        onParText.x(80);
        onParText.y(10);
    }
    if (levelText == null)
    {
        levelText = game.text("");
        levelText.font(font);
        levelText.x(4);
        levelText.y(2);
    }
    if (scoreText == null)
    {
        scoreText = game.text("");
        scoreText.font(font);
        scoreText.x(4);
        scoreText.y(6);
    }
    var par = levels[level].par;
    if (!par)
    {
        par = "Unsolved"
    }
    parText.text("PAR: " + par);
    onParText.hide();
    levelText.text("LEVEL: " + (level + 1));

    var pos = levels[level].player;
    if (pos)
    {
        player.x(pos[0]*firefoxBlurFix);
        player.y(pos[1]*firefoxBlurFix);
        answer.x(pos[0]);
        answer.y(pos[1]);
    }

    if (levels[level].answer)
    {
        answer.transform("matrix", transformString(levels[level].answer));
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
        var oldLevel = parseInt(localStorage.getItem("level"));
        var parts = saveVersion.split(".");
        var thisVersionParts = version.split(".");
        if (parts[0] == thisVersionParts[0])
        {
            if (parts[1] == 0)
            {
                if (oldLevel >= 7)
                {
                    oldLevel += 2;
                }
            }
            setLevel(oldLevel);
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

function clicked(e)
{

    var x = gameX(e.clientX);
    var y = gameY(e.clientY);
    e.preventDefault();

    if (x >= 0 && x <= 100)
    {

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
            tweenDelta = numeric.div(numeric.sub(matrix, displayMatrix), 20);
            tweenHandle = requestAnimationFrame(tween);

            var center = numeric.dot(matrix, [player.x() + 4, player.y() + 4, 1]);
            if (center[0] < 0 || center[0] > 100 || center[1] < 0 || center[1] > 100)
            {
                score -= 5;
                setTimeout(setLevel, 1000, level);
            }
            if (matEq(matrix, levels[level].answer))
            {
                sendData();
                if (moves == levels[level].par)
                {
                    onParText.show();
                    score += 20;
                }
                else
                {
                    score += 10;
                }
                setTimeout(setLevel, 1000, level + 1);
            }

            redraw();

        }

    }

}

function hovered(e)
{

    var x = gameX(e.clientX);
    var y = gameY(e.clientY);

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

    if (e.keyCode == "=".charCodeAt(0))
    {
        out = "["
        for (var x=0; x<3; x++)
        {
            out += "["
            for (var y=0; y<3; y++)
            {
                out += matrix[x][y];
                if (y != 2)
                {
                    out += ","
                }
            }
            out += "]"
            if (x != 2)
            {
                out += ","
            }
        }
        out += "]"
        document.write(out)
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
        flip = [[2/m/q1 - 1, 2/q1, -2*b/q1], [2*m/q2, 2*m*m/q2 - 1, 2*b/q2], [0, 0, 1]];
    }
    else
    {
        if (m == null)
        {
            // Vertical line flip
            flip = [[-1, 0, 2 * line[0]], [0, 1, 0], [0, 0, 1]];
        }
        else
        {
            // Horizontal line flip
            flip = [[1, 0, 0], [0, -1, 2 * line[1]], [0, 0, 1]];
        }
    }
    matrix = numeric.dot(flip, matrix);

}

function redraw()
{
    player.transform("matrix", transformString(displayMatrix));
    movesText.text("MOVES: " + moves);
    scoreText.text("SCORE: " + score);
}

function tween()
{

    numeric.addeq(displayMatrix, tweenDelta);
    var done = false;
    for (var x=0; x<3 && !done; x++)
    {
        for (var y=0; y<3 && !done; y++)
        {
            if ((displayMatrix[x][y] > matrix[x][y] && tweenDelta[x][y] >= 0)
                || (displayMatrix[x][y] < matrix[x][y] && tweenDelta[x][y] <= 0))
            {
                done = true;
            }
        }
    }
    if (!done)
    {
        tweenHandle = requestAnimationFrame(tween);
    }
    else
    {
        displayMatrix = matrix;
    }
    redraw();

}

function skipTween()
{
    if (tweenHandle)
    {
        cancelAnimationFrame(tweenHandle);
        tweenHandle = null;
    }
    displayMatrix = matrix;
}

function matEq(a, b)
{
    var epsilon = 0.0001;
    for (var x=0; x<3; x++)
    {
        for (var y=0; y<3; y++)
        {
            var c = a[x][y];
            var d = b[x][y];
            if (c == d)
            {
                continue;
            }
            diff = Math.abs(c - d)
            if (c == 0 || d == 0)
            {
                if (diff < epsilon * 0.0001)
                {
                    continue;
                }
                return false;
            }
            else
            {
                if (diff / (Math.abs(c) + Math.abs(d)) < epsilon)
                {
                    continue;
                }
                return false;
            }
        }
    }
    return true;
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
    return (windowX - window.innerWidth / 2) / size * 100 + 50;
}
function gameY(windowY)
{
    return windowY / size * 100;
}

function resize()
{
    size = window.innerHeight;
    container.style.width = size + "px";
    container.style.height = size + "px";
    document.getElementById("three-column").style.height = size + "px";
}

function sendData()
{

    // Send the time it took to beat the level to CG so I can optimize difficulty
    var now = new Date();
    var time = Math.floor((now - startTime) / 1000);
    var req = new XMLHttpRequest();
    req.open("get", "/flip/data?level="+level+"&time="+time+"&moves="+moves, true);
    req.send();
    startTime = now;

}

function addLine(line)
{
    var points = lineGroup.line(line[0], line[1], line[0] + line[2], line[1] + line[3]);
    return points.stroke({ width: 1 });
}

function transformString(mat)
{
    return mat[0][0] + "," + mat[1][0] + "," + mat[0][1] + "," + mat[1][1] +
        "," + mat[0][2] + "," + mat[1][2]
}

onload = initialize;
