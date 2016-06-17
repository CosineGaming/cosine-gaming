// Random trianges for branding
// Usage: <div id="triangles"></div><script src="/resources/triangles.js"></script>


function addTriangle()
{
	var triangle = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
	triangle.style.stroke = ["#000000", "#0066a7"][Math.floor(Math.random()*2)];
	triangle.style.strokeWidth = "2";
	triangle.style.fill = "none";
	var holder = document.getElementById("triangles-loader");
	var vertices = [];
	var x = Math.floor(Math.random() * 1001);
	var y = Math.floor(Math.random() * 101);
	for (var i = 0; i < 3; ++i) {
		vertices.push(String(x), String(y));
		x += Math.floor(Math.random() * 161) - 80;
		y += Math.floor(Math.random() * 161) - 80;
	}
	triangle.setAttribute("points", vertices.join());
	holder.appendChild(triangle);
}

document.getElementById("triangles").innerHTML = '<svg id="triangles-loader" viewBox="0 0 1000 100"></svg>';
for (var i=0;i<128;++i)
{
	addTriangle();
}
