// function to use d3 to graph density plots with preprocessed data

function density(data) {
    
    var mydiv;
    if(arguments.callee.caller.name=="subset") {
        mydiv = "#subset";
    }
    else if(arguments.callee.caller.name=="setx") {
        mydiv = "#setx";
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
    
    var brush = d3.svg.brush()
    .x(x)
    .on("brush", brushed);
    
    var xAxis = d3.svg.axis()
    .scale(x)
    .ticks(5)
    .orient("bottom");
    
    var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");
    
    var area = d3.svg.area()
    .interpolate("monotone")
    .x(function(d) { return x(d.x); })
    .y0(height)
    .y1(function(d) { return y(d.y); });
    
  //  var plotsvg = d3.select(mydiv)
    var plotsvg = d3.select(mydiv)
    .append("svg")
    .attr("id", function(){
       //   console.log(data.varname.toString().concat(".",mydiv.substr(1)));
          return data.varname.toString().concat(mydiv.substr(1));
          })
    .attr("width", width + margin.left + margin.right) //setting height to the height of #main.left
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
 
    plotsvg.append("text")
    .attr("x", (width / 2))
    .attr("y", 0-(margin.top / 2))
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text(data.varname);
    
    plotsvg.append("text")
    .attr("id", "range")
    .attr("x", 25)
    .attr("y", height+40)
    .text(function() {
          return("Range: ".concat(Math.round(d3.min(xVals)), " to ", Math.round(d3.max(xVals))));
          });
    
    // add brush if subset
    if(mydiv=="#subset") {
        plotsvg.append("g")
        .attr("class", "x brush")
        .call(brush)
        .selectAll("rect")
        .attr("height", height);
    }
    
    function brushed() {
     //   x.domain(brush.empty() ? x.domain() : brush.extent()); idiot, Vito, idiot. this is changing the domain for the focus plot.  that's why you don't just copy examples from the Web. moron.
        plotsvg.select("text#range")
        .text(function() {
              if(brush.empty()) {return("Range: ".concat(Math.round(d3.min(xVals)), " to ", Math.round(d3.max(xVals))));}
              else {return("Range: ".concat(Math.round(brush.extent()[0]), " to ", Math.round(brush.extent()[1])));}
              });
        console.log(brush.extent());
    }
    
    function writebrush() {
       
        console.log(brush.extent());
        /*d3.select("#subset").select("svg").append("text")
        .attr("x", 25)
        .attr("y", h+55)
        //.text(function(){
        //         return("From ".concat(h, " to ", h));
        //       });
        .text(brush.extent());
        //        console.log(brush.extent());   */
    }

}



function bars() {
    //...
}