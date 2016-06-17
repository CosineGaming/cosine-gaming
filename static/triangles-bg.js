// Random trianges for branding
// Usage: <div id="triangles"></div><script src="/resources/triangles.js"></script>

var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

for (var i=0;i<256;++i)
{
	var triangle = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
	triangle.style.stroke = ["#ddd", "#cecece"][Math.floor(Math.random()*2)];
	triangle.style.strokeWidth = "1";
	triangle.style.fill = "none";
	var vertices = [];
	var x = Math.floor(Math.random() * 1001);
	var y = Math.floor(Math.random() * 1001);
	for (var j = 0; j < 3; ++j) {
		vertices.push(String(x), String(y));
		x += Math.floor(Math.random() * 161) - 80;
		y += Math.floor(Math.random() * 161) - 80;
	}
	triangle.setAttribute("points", vertices.join());
	svg.appendChild(triangle);
}

document.body.style.backgroundImage = "url(data:image/svg+xml;base64," + btoa(new XMLSerializer().serializeToString(svg)) + ")";