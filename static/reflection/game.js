var container = null;
var game = null;
var size = null;

var player = null;
var matrix = null;

var answer = null;

var levels = null;
var level = null;
var levelLines = null;
var lineGroup = null;

var moves = null;
var movesText = null;
var levelText = null;

var lastLine = null;

var tweenTo = null;
var tweenDelta = null;
var tweenHandle = null;

function initialize()
{

    // x, y, width, height
    levels = [
        {
            // One vertical line
            lines :
            [
                [50, 0, 0, 100]
            ],
            answer :
                [[-1,0,100],[0,1,0],[0,0,1]]
            , player :
                [4, 46]
        },
        {
            // Three vertical lines
            lines :
            [
                [40, 0, 0, 100],
                [50, 0, 0, 100],
                [60, 0, 0, 100]
            ],
            answer :
                [[1,0,60],[0,1,0],[0,0,1]]
            , player :
                [4, 46]
        },
        {
            // 3 lines, H+V
            lines :
            [
                [0, 60, 100, 0],
                [40, 0, 0, 100],
                [50, 0, 0, 100]
            ],
            answer :
                [[1,0,40],[0,-1,120],[0,0,1]]
            , player :
                [4, 46]
        },
        {
            // Vertical, diagonal
            lines :
            [
                [30, 0, 20, 100],
                [60, 0, 0, 100]
            ],
            answer :
                [[-0.7041420118343197,0.7100591715976331,-4.2603550295857815],[0.7100591715976332,0.7041420118343197,1.7751479289940804],[0,0,1]]
            , player :
                [4, 46]
        },
        {
            // Easy diagonals
            lines :
            [
                [10, 0, 10, 100],
                [50, 0, 0, 100],
                [0, 20, 100, 40]
            ],
            answer :
                [[0.14999823406835316,0.9886862645836523,6.597520631968052],[0.988686264583652,-0.14999823406835328,68.11551547544767],[0,0,1]]
            , player :
                [4, 46]
        },
        {
            // Cross with one diagonal
            lines :
            [
                [20, 0, 30, 100],
                [30, 0, 0, 100],
                [0, 70, 100, 0]
            ],
            answer :
                [[-0.8348623853211009,0.5504587155963303,-3.6697247706422047],[-0.5504587155963302,-0.834862385321101,138.89908256880736],[0,0,1]]
            , player :
                [4, 46]
        },
        {
            // 2-V-1-H-1-D
            lines :
            [
                [30, 0, 0, 100],
                [50, 0, 0, 100],
                [0, 70, 100, -30],
                [0, 70, 100, 0]
            ],
            answer :
                [[-0.834862385321101,-0.5504587155963304,105.13761467889911],[-0.5504587155963301,0.8348623853211009,-10.45871559633028],[0,0,1]]
            , player :
                [4, 46]
        },
        {
            // Cross with two diagonals
            lines :
            [
                [0, 20, 100, 40],
                [0, 60, 100, -10],
                [40, 0, 0, 100],
                [0, 80, 100, 0]
            ],
            answer :
                [[-0.7241379310344828,0.689655172413793,42.11676340047798],[0.6896551724137929,0.7241379310344827,-5.995220211676354],[0,0,1]]
            , player :
                [4, 46]
        },
        {
            // Cross with two diagonals, containing a V shape
            lines :
            [
                [0, 10, 50, 90],
                [50, 0, 0, 100],
                [0, 60, 100, 0],
                [0, 40, 100, -10]
            ],
            answer :
                [[0.6106926463383254,-0.7918677236182143,102.80083691920044],[0.7918677236182146,0.6106926463383255,46.69157747803904],[0,0,1]]
            , player :
                [4, 46]
        }
    ];

    size = window.innerHeight;

    container = document.getElementById("game");
    container.setAttribute("tabindex", 0)
    container.addEventListener("mouseup", clicked);
    container.addEventListener("mousemove", hovered);
    container.addEventListener("keyup", pressed);
    container.focus();

    game = SVG("game").size(size,size).viewbox(0,0,100,100);
    lineGroup = game.group();
    player = game.image("assets/player.svg", 8, 8);
    answer = game.image("assets/target.svg", 8, 8)

    setLevel(0);//levels.length - 1);

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
    tweenTo = null;
    skipTween();

    var pos = levels[level].player;
    player.x(pos[0]);
    player.y(pos[1]);
    answer.x(pos[0]);
    answer.y(pos[1]);

    moves = 0;
    if (movesText == null)
    {
        movesText = game.text("");
        movesText.x(4);
        movesText.y(2);
        movesText.font({ family: "Palatino Linotype", size: 3 })
    }
    if (levelText == null)
    {
        levelText = movesText.clone();
        levelText.x(80)
    }

    redraw();
    answer.transform("matrix", transformString(levels[level].answer));

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

    var x = e.clientX / size * 100;
    var y = e.clientY / size * 100;

    var line = getLine(x, y);

    if (line != null)
    {
        reflect(levels[level].lines[line]);
    }

}

function hovered(e)
{

    var x = e.clientX / size * 100;
    var y = e.clientY / size * 100;

    if (lastLine != null)
    {
        levelLines[lastLine].stroke({ color: "#000" });
    }

    var line = getLine(x, y);

    if (line != null)
    {
        levelLines[line].stroke({ color: "#888" });
        lastLine = line;
    }

}

function pressed(e)
{

    if (e.keyCode == "A".charCodeAt(0))
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
        flip = [[2/m/q1 - 1, 2/q1, -2*b/q1], [2*m/q2, 2*m*m/q2 - 1, 2*b/q2], [0, 0 , 1]];
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

    skipTween();
    tweenTo = numeric.dot(flip, matrix);
    tweenDelta = numeric.div(numeric.sub(tweenTo, matrix), 20);
    tweenHandle = window.requestAnimationFrame(tween);

    moves += 1;

    redraw();

}

function redraw()
{
    player.transform("matrix", transformString(matrix));
    movesText.text("MOVES: " + moves);
    levelText.text("LEVEL: " + (level + 1));
}

function tween()
{

    numeric.addeq(matrix, tweenDelta);
    var done = false;
    for (var x=0; x<3 && !done; x++)
    {
        for (var y=0; y<3 && !done; y++)
        {
            if ((matrix[x][y] > tweenTo[x][y] && tweenDelta[x][y] >= 0)
                || (matrix[x][y] < tweenTo[x][y] && tweenDelta[x][y] <= 0))
            {
                done = true;
                matrix = tweenTo;
                var center = numeric.dot(matrix, [player.x() + 4, player.y() + 4, 1]);
                if (center[0] < 0 || center[0] > 100 || center[1] < 0 || center[1] > 100)
                {
                    setLevel(level);
                }
                if (matEq(matrix, levels[level].answer))
                {
                    setTimeout(setLevel, 750, level + 1);
                }
            }
        }
    }
    if (!done)
    {
        tweenHandle = window.requestAnimationFrame(tween);
    }
    redraw();

}

function skipTween()
{
    if (tweenHandle)
    {
        window.cancelAnimationFrame(tweenHandle);
        tweenHandle = null;
        if (tweenTo)
        {
            matrix = tweenTo;
        }
    }
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

window.onload = initialize;
