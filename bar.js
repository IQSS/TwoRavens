  //Width and height
var barwidth = 40; 
var barheight = 20; 
var barPadding = 0.25;  


var dataset = [ 5, 10, 13, 19, 21, 25, 22, 18, 15, 13,
                    11, 12]; //, 15, 20, 18, 17, 16, 18, 23, 25 ];

//Create SVG element
var svg = d3.select("body") .append("svg")
                .attr("width", barwidth)
                .attr("height", barheight);

svg.selectAll("rect")
       .data(dataset)
       .enter()
       .append("rect")
	   .attr("x", function(d, i) {
		return i * (barwidth / dataset.length);
		})     
	   .attr("y", function(d) {
		return barheight - d; //Height minus data value
		})
       .attr("width", barwidth / dataset.length - barPadding)
       .attr("height", function(d) {
		return d; //Just the data value
		})
       .attr("fill", "#4F4F4F")
       ;


