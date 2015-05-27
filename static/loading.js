// Triangles appear steadily, for a cool loading icon
// Usage: <div id="loading"></div><script src="/resources/loading.js"></script>


function addTriangle()
{
	if (document.getElementById("loading").style.display != "none")
	{
		var triangle = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
		triangle.style.stroke = ["#D0E3E6", "#4D94FF"][Math.floor(Math.random() * 2)];
		triangle.style.strokeWidth = "1";
		triangle.style.fill = "none";
		var holder = document.getElementById("LoadSVG");
		var vertices = [];
		for (var i = 0; i < 3; ++i) {
			vertices.push(String(Math.floor(Math.random() * 101)), String(Math.floor(Math.random() * 101)));
		}
		triangle.setAttribute("points", vertices.join());
		holder.appendChild(triangle);
		setTimeout(addTriangle, Math.floor(Math.random() * 76));
	}
	else
	{
		document.getElementById("loading").innerHTML = "";
	}
}

document.getElementById("loading").innerHTML = '<svg width="100%" height="100%" id="LoadSVG" viewBox="0 0 100 100" style="margin:0px; padding:0px"></svg>' + document.getElementById("loading").innerHTML;
addTriangle();
