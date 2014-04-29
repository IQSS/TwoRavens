// function to use d3 to graph density plots with preprocessed data

function density(data, node) {
    var mydiv;

    //console.log(arguments.callee.caller.name);

    if(arguments.callee.caller.name=="subset") {
        mydiv = "#tab2";
    }
    else if(arguments.callee.caller.name=="setx") {
        mydiv = "#setx";
    }
    else if(arguments.callee.caller.name=="varSummary") {
        mydiv = "#tab3";
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
    
    data2.forEach(function(d) {
                  d.x = +d.x;
                  d.y = +d.y;
                  });

    var tempWidth = d3.select(mydiv).style("width")
    var width = tempWidth.substring(0,(tempWidth.length-2));
    


    var tempHeight = d3.select(mydiv).style("height")
    var height = tempHeight.substring(0,(tempHeight.length-2));


    console.log(tempWidth);
    console.log(tempHeight);
    console.log(width);
    console.log(height);
    console.log(mydiv);


    var margin = {top: 20, right: 20, bottom: 53, left: 30};

    // Need to fix automatic width and height settings for leftpanel (#tab2, #tab3)

    if(mydiv=="#tab3"){
        width = 0.7 * (width - margin.left - margin.right),
        height = 0.3 * (height - margin.top - margin.bottom);
    }
    else if (mydiv=="#tab2"){
        width = 200;
        height = 120;
    }
    else{
        width = 0.35 * (width - margin.left - margin.right),
        height = 0.25 * (height - margin.top - margin.bottom);
    };




    console.log(width);
    console.log(height);


    var x = d3.scale.linear()
    .domain([d3.min(xVals), d3.max(xVals)])
    .range([0, width]);
    
    var invx = d3.scale.linear()
    .range([d3.min(xVals), d3.max(xVals)])
    .domain([0, width]);

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

// This is cumbersome to treat "tab3" differently, but works for now.
//  tab3, has an issue, that unless width height hardcoded, they grow with each additional graph.
if(mydiv=="#tab3"){
    var plotsvg = d3.select(mydiv)
    .selectAll("svg")
    .remove();

    var plotsvg = d3.select(mydiv)
    .append("svg")
    .attr("id", function(){
          //console.log(data.varname.toString().concat(".",mydiv.substr(1)));
          return data.varname.toString().concat(mydiv.substr(1));
          })
    .style("width", 300) //setting height to the height of #main.left
    .style("height", 200)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
}else{
    var plotsvg = d3.select(mydiv)
    .append("svg")
    .attr("id", function(){
          //console.log(data.varname.toString().concat(".",mydiv.substr(1)));
          return data.varname.toString().concat(mydiv.substr(1));
          })
    .style("width", width + margin.left + margin.right) //setting height to the height of #main.left
    .style("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
};


   
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
    if(mydiv=="#tab2") {
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

        // create tick marks at all zscores in the bounds of the data
        var lineFunction = d3.svg.line()
                            .x(function(d) { return d.x; })
                            .y(function(d) { return d.y; })
                            .interpolate("linear");
  
        var colSeq = [ "#A2CD5A","orange","red"];  // will cycle through color sequence, and then repeat last color
        var lineData = new Array;

        var zLower = -1*(d3.min(xVals)-node.mean)/node.standardDeviation;  // zscore of lower bound
        var zUpper =(d3.max(xVals)-node.mean)/node.standardDeviation;      // zscore of upper bound

        for (var i = 0; i < zUpper; i++) {
            lineData = [{ "x": x(+node.mean + i*node.standardDeviation),   "y": height*.7},  { "x": x(+node.mean+ i*node.standardDeviation),  "y": height*.9}];
            plotsvg.append("path")
            .attr("d", lineFunction([lineData[0],lineData[1]]))
            .attr("stroke", colSeq[d3.min([i,colSeq.length-1])])
            .attr("stroke-width", 1.5)
            .attr("fill", "none");
        }

        for (var i = 1; i < zLower; i++) {
            lineData = [{ "x": x(+node.mean - i*node.standardDeviation),   "y": height*.7},  { "x": x(+node.mean- i*node.standardDeviation),  "y": height*.9}];
            plotsvg.append("path")
            .attr("d", lineFunction([lineData[0],lineData[1]]))
            .attr("stroke", colSeq[d3.min([i,colSeq.length-1])])
            .attr("stroke-width", 1.5)
            .attr("fill", "none");
        }

        // initialize slider components
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

        var handle = slider.append("polygon")
        .attr("class", "handle")
        .attr("transform", "translate(0," + height*.7 + ")")
        .attr("points", function(d){
            var s=6;
            var xnm=x(node.mean);
            return (xnm-s)+","+(-s)+" "+(xnm+s)+","+(-s)+" "+xnm+","+(s*1.3);}); 

        var slider2 = plotsvg.append("g")
        .attr("class", "slider")
        .call(brush2);

        var handle2 = slider2.append("polygon")
        .attr("class", "handle")
        .attr("transform", "translate(0," + height*.9 + ")")
        .attr("points", function(d){
            var s=6;
            var xnm=x(node.mean);
            return (xnm-s)+","+s+" "+(xnm+s)+","+s+" "+xnm+","+(-s*1.3);}); 
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
            var s = 6;
            
            if (d3.event.sourceEvent) {
                value = x.invert(d3.mouse(this)[0]);
                brush.extent([value, value]);
            }
            
            // set x position of slider center                     
            var xpos = x(value);
            if(value > d3.max(xVals)) { // dragged past max
                xpos = x(d3.max(xVals));
            }
            else if(value < d3.min(xVals)) { // dragged past min
                xpos = x(d3.min(xVals));
            }
            else {
                var m = +node.mean;
                var sd = +node.standardDeviation;
                var zScore = (value - m)/sd;          // z-score
                var zRound = Math.round(zScore);      // nearest integer z-score
                if( .1 > Math.abs(zRound - zScore)) { // snap to integer z-score
                    xpos = x(m + (zRound * sd));      
                }
            }      

            // create slider symbol and text
            handle.attr("points", function(d){
                return (xpos-s)+","+(-s)+" "+(xpos+s)+","+(-s)+" "+xpos+","+(s*1.3);}); 
            plotsvg.select("text#range")
            .text(function() {
                return("x: ".concat(Math.round(invx(xpos))));});
            node.setxvals[1]=Math.round(invx(xpos));                              
        }
    }



    
    function brushed2() {   // certainly a more clever way to do this, but for now it's basically copied with brush and handle changes to brush2 and handle2 and #range to #range2 and setxvals[0] to setxvals[1]
            var value = brush2.extent()[0];
            var s = 6;                            // scaling for triangle shape
            
            if (d3.event.sourceEvent) {
                value = x.invert(d3.mouse(this)[0]);
                brush2.extent([value, value]);
            }
            
            // set x position of slider center 
            var xpos = x(value);
            if(value > d3.max(xVals)) { // dragged past max
                xpos = x(d3.max(xVals));
            }
            else if(value < d3.min(xVals)) { // dragged past min
                xpos = x(d3.min(xVals));
            }
            else {
                var m = +node.mean;
                var sd = +node.standardDeviation;
                var zScore = (value - m)/sd;          // z-score
                var zRound = Math.round(zScore);      // nearest integer z-score
                if( .1 > Math.abs(zRound - zScore)) { // snap to integer z-score
                    xpos = x(m + (zRound * sd));      
                }
            }      

            // create slider symbol and text
            handle2.attr("points", function(d){
                return (xpos-s)+","+s+" "+(xpos+s)+","+s+" "+xpos+","+(-s*1.3);}); 
            plotsvg.select("text#range2")
            .text(function() {
                return("x1: ".concat(Math.round(invx(xpos))));});
            node.setxvals[1]=Math.round(invx(xpos));                      
    }
}


function bars(data, node) {

    // Histogram spacing
    var barPadding = .02;  // Space between bars 
    var topScale =1.2;   // Multiplicative factor to assign space at top within graph

    // Data
    var keys = Object.keys(data.properties.values);
    var dataset = new Array;
    for (var i = 0; i < keys.length; i++) {
        dataset[i] = data.properties.values[keys[i]];
    }
    var yVals = dataset;           // duplicate -- remove
    console.log(yVals);
    var maxY = d3.max(yVals);
    var xVals = d3.range(0, dataset.length, 1);  // need to convert from keys

    var mydiv;
    if(arguments.callee.caller.name=="subset") {
        mydiv = "#tab2";
    }
    else if(arguments.callee.caller.name=="setx") {
        mydiv = "#setx";
    }
    else if(arguments.callee.caller.name=="varSummary") {
        mydiv = "#tab3";
    }
    else {
        return (alert("Error: incorrect div selected for plots"));
    }

    var tempWidth = d3.select(mydiv).style("width")
    var width = tempWidth.substring(0,(tempWidth.length-2));
    
    var tempHeight = d3.select(mydiv).style("height")
    var height = tempHeight.substring(0,(tempHeight.length-2));
      
    var margin = {top: 20, right: 20, bottom: 53, left: 50};

    // Need to fix automatic width and height settings for leftpanel (#tab2, #tab3)

    if(mydiv=="#tab3"){
        width = 0.7 * (width - margin.left - margin.right),
        height = 0.3 * (height - margin.top - margin.bottom);
    }
    else if (mydiv=="#tab2"){
        width = 200;
        height = 120;
    }
    else{
        width = 0.35 * (width - margin.left - margin.right),
        height = 0.25 * (height - margin.top - margin.bottom);
    };
    
    var x = d3.scale.linear()
    .domain([ 0-0.5 , dataset.length-0.5])  // Note change from density function
    .range([0, width]);

    var invx = d3.scale.linear()
    .range([ 0-0.5 , dataset.length-0.5])  
    .domain([0, width]);
    
    var y = d3.scale.linear()
    .domain([0, d3.max(yVals)])   // Note change to min from density function
    .range([0, height]);
    
    var xAxis = d3.svg.axis()
    .scale(x)
    .ticks(dataset.length)
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
/*  
    var area = d3.svg.area()
    .interpolate("monotone")
    .x(function(d) { return x(d.x); })
    .y0(height)
    .y1(function(d) { return y(d.y); });
*/    

//Create SVG element

// This is cumbersome to treat "tab3" differently, but works for now.
//  tab3, has an issue, that unless width height hardcoded, they grow with each additional graph.
if(mydiv=="#tab3"){              
    var plotsvg = d3.select(mydiv)
    .selectAll("svg")
    .remove();

    var plotsvg = d3.select(mydiv)
    .append("svg")
    .attr("id", function(){
       //   console.log(data.varname.toString().concat(".",mydiv.substr(1)));
          return data.varname.toString().concat(mydiv.substr(1));
          })
    .style("width", 300) //setting height to the height of #main.left
    .style("height", 200)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
}
else {
var plotsvg = d3.select(mydiv)
    .append("svg")
    .attr("id", function(){
       //   console.log(data.varname.toString().concat(".",mydiv.substr(1)));
          return data.varname.toString().concat(mydiv.substr(1));
          })
    .style("width", width + margin.left + margin.right) //setting height to the height of #main.left
    .style("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");    
};

plotsvg.selectAll("rect")
       .data(dataset)
       .enter()
       .append("rect")
       .attr("x", function(d, i) {
        return x(i-0.5+barPadding);// in nontransformed coordinate sapce: i * (width / dataset.length);
        })     
       .attr("y", function(d) {
        return y(maxY - d);// in nontransformed coordinate space: height - d * height/(maxY*topScale); //Height minus data value
        })
       .attr("width", x(0.5-barPadding) )   // in nontransformed coordinate space: width / dataset.length - barPadding);
       .attr("height", function(d) {
        //console.log(y(maxY));
        return y(d);// in nontransformed coordinate space: d * height/(maxY*topScale); //Just the data value
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

        // create tick marks at all zscores in the bounds of the data
        var lineFunction = d3.svg.line()
                            .x(function(d) { return d.x; })
                            .y(function(d) { return d.y; })
                            .interpolate("linear");
  
        var colSeq = [ "#A2CD5A","orange","red"];  // will cycle through color sequence, and then repeat last color
        var lineData = new Array;

        var zLower = -1*(d3.min(xVals)-node.mean)/node.standardDeviation;  // zscore of lower bound
        var zUpper =(d3.max(xVals)-node.mean)/node.standardDeviation;      // zscore of upper bound

        for (var i = 0; i < zUpper; i++) {
            lineData = [{ "x": x(+node.mean + i*node.standardDeviation),   "y": height*.7},  { "x": x(+node.mean+ i*node.standardDeviation),  "y": height*.9}];
            plotsvg.append("path")
            .attr("d", lineFunction([lineData[0],lineData[1]]))
            .attr("stroke", colSeq[d3.min([i,colSeq.length-1])])
            .attr("stroke-width", 1.5)
            .attr("fill", "none");
        }

        for (var i = 1; i < zLower; i++) {
            lineData = [{ "x": x(+node.mean - i*node.standardDeviation),   "y": height*.7},  { "x": x(+node.mean- i*node.standardDeviation),  "y": height*.9}];
            plotsvg.append("path")
            .attr("d", lineFunction([lineData[0],lineData[1]]))
            .attr("stroke", colSeq[d3.min([i,colSeq.length-1])])
            .attr("stroke-width", 1.5)
            .attr("fill", "none");
        }

        // initialize slider components
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

        var handle = slider.append("polygon")
        .attr("class", "handle")
        .attr("transform", "translate(0," + height*.7 + ")")
        .attr("points", function(d){
            var s=6;
            var xnm=x(node.mean);
            return (xnm-s)+","+(-s)+" "+(xnm+s)+","+(-s)+" "+xnm+","+(s*1.3);}); 

        var slider2 = plotsvg.append("g")
        .attr("class", "slider")
        .call(brush2);

        var handle2 = slider2.append("polygon")
        .attr("class", "handle")
        .attr("transform", "translate(0," + height*.9 + ")")
        .attr("points", function(d){
            var s=6;
            var xnm=x(node.mean);
            return (xnm-s)+","+s+" "+(xnm+s)+","+s+" "+xnm+","+(-s*1.3);}); 
    }



    function twoSF(x){
      var tsf = d3.format(".2r");                            // format to two significant figures after the decimal place
      return tsf(x).replace( /0+$/, "").replace( /\.$/, "")  // trim trailing zeros after a period, and any orphaned period
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
            var s = 6;
            
            if (d3.event.sourceEvent) {
                value = x.invert(d3.mouse(this)[0]);
                brush.extent([value, value]);
            }
            
            // set x position of slider center                     
            var xpos = x(value);
            if(value > d3.max(xVals)) { // dragged past max
                xpos = x(d3.max(xVals));
            }
            else if(value < d3.min(xVals)) { // dragged past min
                xpos = x(d3.min(xVals));
            }
            else {
                var m = +node.mean;
                var sd = +node.standardDeviation;
                var zScore = (value - m)/sd;          // z-score
                var zRound = Math.round(zScore);      // nearest integer z-score
                if (.1 > Math.abs( Math.round(value) - value)){ // snap to integer
                    xpos = x(Math.round(value));
                } else if( .1 > Math.abs(zRound - zScore)) { // snap to integer z-score
                    xpos = x(m + (zRound * sd));      
                } 
            }      

            // create slider symbol and text
            handle.attr("points", function(d){
                return (xpos-s)+","+(-s)+" "+(xpos+s)+","+(-s)+" "+xpos+","+(s*1.3);}); 
            plotsvg.select("text#range")
            .text(function() {
                return("x: ".concat(twoSF(invx(xpos))));});
            node.setxvals[1]=twoSF(invx(xpos));                              
        }
    }



    
    function brushed2() {   // certainly a more clever way to do this, but for now it's basically copied with brush and handle changes to brush2 and handle2 and #range to #range2 and setxvals[0] to setxvals[1]
            var value = brush2.extent()[0];
            var s = 6;                            // scaling for triangle shape
            
            if (d3.event.sourceEvent) {
                value = x.invert(d3.mouse(this)[0]);
                brush2.extent([value, value]);
            }
            
            // set x position of slider center 
            var xpos = x(value);
            if(value > d3.max(xVals)) { // dragged past max
                xpos = x(d3.max(xVals));
            }
            else if(value < d3.min(xVals)) { // dragged past min
                xpos = x(d3.min(xVals));
            }
            else {
                var m = +node.mean;
                var sd = +node.standardDeviation;
                var zScore = (value - m)/sd;          // z-score
                var zRound = Math.round(zScore);      // nearest integer z-score
                if (.1 > Math.abs( Math.round(value) - value)){ // snap to integer
                    xpos = x(Math.round(value));
                }else if( .1 > Math.abs(zRound - zScore)) { // snap to integer z-score
                    xpos = x(m + (zRound * sd));      
                }
            }      

            // create slider symbol and text
            handle2.attr("points", function(d){
                return (xpos-s)+","+s+" "+(xpos+s)+","+s+" "+xpos+","+(-s*1.3);}); 
            plotsvg.select("text#range2")
            .text(function() {
                return("x1: ".concat(twoSF(invx(xpos))));});
            node.setxvals[1]=twoSF(invx(xpos));                      
    }





}  