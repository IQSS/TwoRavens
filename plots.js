// function to use d3 to graph density plots with preprocessed data

function density(data) {
    
    var mydiv;
    if(arguments.callee.caller.name=="subset") {
        mydiv = "#subset";
    }
    else if(arguments.callee.caller.name=="setx") {
        mydiv = "#subset";
    }
    else {
        return (alert("Error: incorrect div selected for plots"));
    }
    
    var yVals = data.properties.y;
    var xVals = data.properties.x;
    
    // an array of objects
    var data2 = [];
    for(var i = 0; i < data.properties.x.length; i++) {
        data2.push({x:data.properties.x[i], y:data.properties.y[i]});
    }
   // console.log(data2);

    data2.forEach(function(d) {
                  d.x = +d.x;
                  d.y = +d.y;
                  });

    var tempWidth = d3.select(mydiv).style("width")
    var width = tempWidth.substring(0,(tempWidth.length-2));
    
    var tempHeight = d3.select(mydiv).style("height")
    var height = tempHeight.substring(0,(tempHeight.length-2));
    
    
    var margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = 0.4 * (width - margin.left - margin.right),
    height = 0.25 * (height - margin.top - margin.bottom);
    
    var x = d3.scale.linear()
    .domain([d3.min(xVals), d3.max(xVals)])
    .range([0, width]);
    
    var y = d3.scale.linear()
    .domain([d3.min(yVals), d3.max(yVals)])
    .range([height, 0]);
    
    var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");
    
    var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");
    
    var area = d3.svg.area()
    .interpolate("monotone")
    .x(function(d) { return x(d.x); })
    .y0(height)
    .y1(function(d) { return y(d.y); });
    
    var plotsvg = d3.select(mydiv).append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    plotsvg.append("path")
    .datum(data2)
    .attr("class", "area")
    .attr("d", area);
    
    plotsvg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);
    
    plotsvg.append("g")
    .attr("class", "y axis")
    .call(yAxis);

    return [x, y, plotsvg, width, height];
}

function bars() {
    //...
}