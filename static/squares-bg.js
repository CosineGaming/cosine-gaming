// Random trianges for branding
// Usage: <div id="triangles"></div><script src="/resources/triangles.js"></script>

var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

for (var i=0;i<256;++i)
{
	var square = document.createElementNS("http://www.w3.org/2000/svg", "rect");
	square.style.fill = ["#ddd", "#cecece"][Math.floor(Math.random()*2)];
	var maxSize = 30;
	var x = Math.floor(Math.random() * (1001 - maxSize));
	var y = Math.floor(Math.random() * (1001 - maxSize));
	var size = Math.floor(Math.random() * maxSize);
	square.setAttribute("x", x);
	square.setAttribute("y", y);
	square.setAttribute("width", size);
	square.setAttribute("height", size);
	svg.appendChild(square);
}

document.body.style.backgroundImage = "url(data:image/svg+xml;base64," + btoa(new XMLSerializer().serializeToString(svg)) + ")";