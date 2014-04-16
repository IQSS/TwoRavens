// function to use d3 to graph density plots with preprocessed data

function density(data, node) {
    
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
    
    var xAxis = d3.svg.axis()
    .scale(x)
    .ticks(5)
    .orient("bottom");
    
    var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");
    
    var brush = d3.svg.brush()
    .x(x)
    .on("brush", brushed);

    var brush2 = d3.svg.brush()
    .x(x)
    .on("brush", brushed2);
    
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
    
    
    // add brush if subset
    if(mydiv=="#subset") {
        
        plotsvg.append("text")
        .attr("id", "range")
        .attr("x", 25)
        .attr("y", height+40)
        .text(function() {
              return("Range: ".concat(Math.round(d3.min(xVals)), " to ", Math.round(d3.max(xVals))));
              });
        
        plotsvg.append("g")
        .attr("class", "x brush")
        .call(brush)
        .selectAll("rect")
        .attr("height", height);
    }
    
    // add z lines and sliders setx
    if(mydiv=="#setx") {
        
        plotsvg.append("text")
        .attr("id", "range")
        .attr("x", 25)
        .attr("y", height+40)
        .text(function() {
              return("x: ".concat(Math.round(node.mean)));
              });
        
        plotsvg.append("text")
        .attr("id", "range2")
        .attr("x", 25)
        .attr("y", height+50)
        .text(function() {
              return("x1: ".concat(Math.round(node.mean)));
              });

        
        var lineData = [ { "x": x(+node.mean),   "y": height*.65},  { "x": x(+node.mean),  "y": height*.95},
                         { "x": x(+node.mean + +node.standardDeviation),  "y": height*.7}, { "x": x(+node.mean + +node.standardDeviation),  "y": height*.9},
                         { "x": x(+node.mean - +node.standardDeviation),  "y": height*.7},  { "x": x(+node.mean - +node.standardDeviation), "y": height*.9}];
        
        var lineFunction = d3.svg.line()
                            .x(function(d) { return d.x; })
                            .y(function(d) { return d.y; })
                            .interpolate("linear");
  
        plotsvg.append("path")
            .attr("d", lineFunction([lineData[0],lineData[1]]))
            .attr("stroke", "red")
            .attr("stroke-width", 1.5)
            .attr("fill", "none");
        
        plotsvg.append("path")
            .attr("d", lineFunction([lineData[2],lineData[3]]))
            .attr("stroke", "orange")
            .attr("stroke-width", 1.5)
            .attr("fill", "none");
        
        plotsvg.append("path")
            .attr("d", lineFunction([lineData[4],lineData[5]]))
            .attr("stroke", "orange")
            .attr("stroke-width", 1.5)
            .attr("fill", "none");
        
        var slideBox = plotsvg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height*.8 + ")")
        .call(d3.svg.axis()
              .scale(x)
              .ticks(0)
              .orient("bottom"))
        
        var slider = plotsvg.append("g")
        .attr("class", "slider")
        .call(brush);

        var handle = slider.append("circle")
        .attr("class", "handle")
        .attr("transform", "translate(0," + height*.7 + ")")
        .attr("cx", x(node.mean))
        .attr("r", 7);
        
        var slider2 = plotsvg.append("g")
        .attr("class", "slider")
        .call(brush2);
        
        var handle2 = slider2.append("circle")
        .attr("class", "handle")
        .attr("transform", "translate(0," + height*.9 + ")")
        .attr("cx", x(node.mean))
        .attr("r", 7);
      
        
    }

    // brushing functions
    function brushed() {
        if(mydiv=="#subset") {
        plotsvg.select("text#range")
        .text(function() {
              if(brush.empty()) {return("Range: ".concat(Math.round(d3.min(xVals)), " to ", Math.round(d3.max(xVals))));}
              else {return("Range: ".concat(Math.round(brush.extent()[0]), " to ", Math.round(brush.extent()[1])));}
              });
        
            if(Math.round(brush.extent()[0]) != Math.round(brush.extent()[1])) {
                node.subsetrange=[Math.round(brush.extent()[0]), Math.round(brush.extent()[1])];
            }
            else {node.subsetrange=["", ""];}
        }
        else if(mydiv=="#setx") {
            var value = brush.extent()[0];
            
            if (d3.event.sourceEvent) {
                value = x.invert(d3.mouse(this)[0]);
                brush.extent([value, value]);
            }
                         
            if(brush.extent()[0] > d3.max(xVals)) {
                handle.attr("cx", x(d3.max(xVals)));
                plotsvg.select("text#range")
                .text(function() {
                      return("x: ".concat(Math.round(d3.max(xVals))));
                      });
                node.setxvals[0]=Math.round(d3.max(xVals));
            }
            else if(brush.extent()[0] < d3.min(xVals)) {
                handle.attr("cx", x(d3.min(xVals)));
                plotsvg.select("text#range")
                .text(function() {
                      return("x: ".concat(Math.round(d3.min(xVals))));
                      });
                node.setxvals[0]=Math.round(d3.min(xVals));
            }
            else {
                var near = .075* +node.standardDeviation;
                var m = +node.mean;
                var sd = +node.standardDeviation;
                
                if(value<(m + near) & value>(m - near)) { // snap to mean
                    handle.attr("cx", x(m));
                    plotsvg.select("text#range")
                    .text(function() {
                          return("x: ".concat(Math.round(m)));
                          });
                    node.setxvals[0]=Math.round(m);
                }
                else if(value<(m - sd + near) & value>(m - sd - near)) { // snap to mean - sd
                    handle.attr("cx", x(m - sd));
                    plotsvg.select("text#range")
                    .text(function() {
                          return("x: ".concat(Math.round(m-sd)));
                          });
                    node.setxvals[0]=Math.round(m-sd);
                }
                else if(value<(m + sd + near) & value>(m + sd - near)) { // snap to mean + sd
                    handle.attr("cx", x(m+sd));
                    plotsvg.select("text#range")
                    .text(function() {
                          return("x: ".concat(Math.round(m+sd)));
                          });
                    node.setxvals[0]=Math.round(m+sd);
                }
                else {
                    handle.attr("cx", x(value));
                    plotsvg.select("text#range")
                    .text(function() {
                          return("x: ".concat(Math.round(value)));
                          });
                    node.setxvals[0]=Math.round(value);
                }
            }
            
        }
    }
    
    function brushed2() {   // certainly a more clever way to do this, but for now it's basically copied with brush and handle changes to brush2 and handle2 and #range to #range2 and setxvals[0] to setxvals[1]
            var value = brush2.extent()[0];
            
            if (d3.event.sourceEvent) {
                value = x.invert(d3.mouse(this)[0]);
                brush2.extent([value, value]);
            }
            
            if(brush2.extent()[0] > d3.max(xVals)) { // dragged past max
                handle2.attr("cx", x(d3.max(xVals)));
                plotsvg.select("text#range2")
                .text(function() {
                      return("x1: ".concat(Math.round(d3.max(xVals))));
                      });
                node.setxvals[1]=Math.round(d3.max(xVals));
            }
            else if(brush2.extent()[0] < d3.min(xVals)) { // dragged past min
                handle2.attr("cx", x(d3.min(xVals)));
                plotsvg.select("text#range2")
                .text(function() {
                      return("x1: ".concat(Math.round(d3.min(xVals))));
                      });
                node.setxvals[1]=Math.round(d3.min(xVals));
            }
            else {
                var near = .075* +node.standardDeviation;
                var m = +node.mean;
                var sd = +node.standardDeviation;
                
                if(value<(m + near) & value>(m - near)) { // snap to mean
                    handle2.attr("cx", x(m));
                    plotsvg.select("text#range2")
                    .text(function() {
                          return("x1: ".concat(Math.round(m)));
                          });
                    node.setxvals[1]=Math.round(m);
                }
                else if(value<(m - sd + near) & value>(m - sd - near)) { // snap to mean - sd
                    handle2.attr("cx", x(m - sd));
                    plotsvg.select("text#range2")
                    .text(function() {
                          return("x1: ".concat(Math.round(m-sd)));
                          });
                    node.setxvals[1]=Math.round(m-sd);
                }
                else if(value<(m + sd + near) & value>(m + sd - near)) { // snap to mean + sd
                    handle2.attr("cx", x(m+sd));
                    plotsvg.select("text#range2")
                    .text(function() {
                          return("x1: ".concat(Math.round(m+sd)));
                          });
                    node.setxvals[1]=Math.round(m+sd);
                }
                else {
                    handle2.attr("cx", x(value));
                    plotsvg.select("text#range2")
                    .text(function() {
                          return("x1: ".concat(Math.round(value)));
                          });
                    node.setxvals[1]=Math.round(value);
                }
            }
        
    }
    
}


function bars(data, node) {

    // Histogram spacing
    var barPadding = 1;  // Space between bars 
    var topScale =1.2;   // Multiplicative factor to assign space at top within graph

    // Data
    var keys = Object.keys(data.properties.values);
    var dataset = new Array;
    for (var i = 0; i < keys.length; i++) {
        dataset[i] = data.properties.values[keys[i]];
    }
    var yVals = dataset;           // duplicate -- remove
    var maxY = d3.max(yVals);
    var xVals = d3.range(1, dataset.length, 1);  // need to convert from keys

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

    var tempWidth = d3.select(mydiv).style("width")
    var width = tempWidth.substring(0,(tempWidth.length-2));
    
    var tempHeight = d3.select(mydiv).style("height")
    var height = tempHeight.substring(0,(tempHeight.length-2));
      
    var margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = 0.4 * (width - margin.left - margin.right),
    height = 0.25 * (height - margin.top - margin.bottom);
    
    var x = d3.scale.linear()
    .domain([ 1-0.5 , dataset.length+0.5])  // Note change from density function
    .range([0, width]);
    
    var y = d3.scale.linear()
    .domain([0, d3.max(yVals)])   // Note change to min from density function
    .range([height, 0]);
    
    var xAxis = d3.svg.axis()
    .scale(x)
    .ticks(dataset.length)
    .orient("bottom");
    
    var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");
/*  
    var brush = d3.svg.brush()
    .x(x)
    .on("brush", brushed);

    var brush2 = d3.svg.brush()
    .x(x)
    .on("brush", brushed2);
  
    var area = d3.svg.area()
    .interpolate("monotone")
    .x(function(d) { return x(d.x); })
    .y0(height)
    .y1(function(d) { return y(d.y); });
*/    

//Create SVG element
var plotsvg = d3.select(mydiv) .append("svg")
    .append("svg")
    .attr("id", function(){
       //   console.log(data.varname.toString().concat(".",mydiv.substr(1)));
          return data.varname.toString().concat(mydiv.substr(1));
          })
    .attr("width", width + margin.left + margin.right) //setting height to the height of #main.left
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


plotsvg.selectAll("rect")
       .data(dataset)
       .enter()
       .append("rect")
       .attr("x", function(d, i) {
        return i * (width / dataset.length);
        })     
       .attr("y", function(d) {
        return height - d * height/(maxY*topScale); //Height minus data value
        })
       .attr("width", width / dataset.length - barPadding)
       .attr("height", function(d) {
        return d * height/(maxY*topScale); //Just the data value
        })
       .attr("fill", "#1f77b4")
       ;

    /*plotsvg.append("path")
    .datum(data2)
    .attr("class", "area")
    .attr("d", area); */

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

}  