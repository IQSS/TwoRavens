
//////////
// Globals

// set up SVG for D3
// this is the initial color scale that is used to establish the initial colors of the nodes.  nodes.push() below establishes a field for the nodes called "nodeCol" and assigns a color from this scale to that field.  everything there after should refer to the nodeCol and not the color scale, this enables us to update colors and pass the variable type to R based on its coloring
var colors = d3.scale.category10();

//var leftpanel = d3.select("body")
//.append('svg');


var svg = d3.select("#main.left")
.append('svg')
//.attr('width', width)
//.attr('height', height);
var tempWidth = d3.select("#main.left").style("width")
var width = tempWidth.substring(0,(tempWidth.length-2));

var tempHeight = d3.select("#main.left").style("height")
var height = tempHeight.substring(0,(tempHeight.length-2));

//console.log(width)
//console.log(height)

var placeholder = d3.select("#rightpanel.left")
.append('svg')

//      .attr('y',-1800)
//.attr('width', 200)
//.attr('height', 200);

//var varpanel = d3.select("#leftpanel.left")
//.append('svg')



var forcetoggle=true;
var estimated=false;

var colorTime=false;
var timeColor = d3.rgb("black");

var colorCS=false;
var csColor = d3.rgb("white");

var varColor = d3.rgb("aliceblue");

  // Radius of circle 
var allR = 40;

  //Width and height for histgrams
var barwidth = 1.3*allR; 
var barheight = 0.5*allR; 
var barPadding = 0.35;  
var barnumber =7;


var arc0 = d3.svg.arc()
    .innerRadius(allR + 5)
    .outerRadius(allR + 20)
    .startAngle(0)
    .endAngle(3.2);

var arc1 = d3.svg.arc()
    .innerRadius(allR + 5)
    .outerRadius(allR + 20)
    .startAngle(0)
    .endAngle(1);

var arc2 = d3.svg.arc()
    .innerRadius(allR + 5)
    .outerRadius(allR + 20)
    .startAngle(1.1)
    .endAngle(2.1);

var arc3 = d3.svg.arc()
    .innerRadius(allR + 5)
    .outerRadius(allR + 20)
    .startAngle(2.2)
    .endAngle(3.2);



  // From .csv
var lastNodeId = 0;  
var dataset2 = [];
var valueKey = [];
var hold = [];
d3.tsv("data/use_ex1_short.tsv", function(data) {
    dataset2=data;
    valueKey = d3.keys(data[0]); // the variables names
       nodes = [];
       // give the data a stack layout in the leftpanel
       //Set up stack method
       var colorKey = new Object();
       for (var i = 0, l = valueKey.length; i < l; i++) {
            colorKey[valueKey[i]] = false;
       }
       
       d3.select("#leftpanel.left").selectAll("p")
       .data(valueKey)
       .enter()
       .append("p")
       .text(function(d){return d;})
       .style('background-color',"aliceblue");
       
   //    console.log(d3.select("p").text());
       d3.select("#leftpanel.left").selectAll("p")
       .on("click", function(){
           d3.select(this)
           .style('background-color',function(d) {
                  var myText = d3.select(this).text();
                  var myColor = d3.select(this).style('background-color');
                  if(d3.rgb(myColor).toString() === varColor.toString()) {return "salmon"}
                  else {return varColor}
                  });
           });
       
       

       
       });  // end data load

// when the layout button is clicked, layout() is called.  layout() draws the initial force.layout() and probably has to return some objects...

function layout() {
    var initialize = [];
    var nodes = [];
    var myValues=[];
    d3.select("#leftpanel.left").selectAll("p")
    .each(function(d){ // this isn't efficient but it works, and the number of variables should be small so we won't lose much in efficiency, for now at least
          var myText = d3.select(this).text();
          var myColor = d3.select(this).style('background-color');
          if(d3.rgb(myColor).toString() === d3.rgb("salmon").toString()) {initialize.push(myText);}
          });
  //  console.log(initialize);
    

    for (var i = 0; i < initialize.length; i++) { //for each variable
        
        for (var k =0; k<dataset2.length; k++){ //.  for each row. the length of the dataset is nrow()
            myValues.push(dataset2[k][initialize[i]]);
        }
        
        // establishing histogram?
        var datasetcount = d3.layout.histogram()
        .bins(barnumber).frequency(false)
        (myValues);
      //  console.log(datasetcount);
        //record the histogram lengths and then normalize to max=1
        
        hold= [datasetcount[0].y];
        var maxhold = datasetcount[0].y
        var value = 0;
        for (var j =1; j < datasetcount.length; j++ ){
            value = datasetcount[j].y;
            hold.push(datasetcount[j].y);
            if (maxhold < value){
                maxhold = value;
            }
        }
        
        for (var j =0; j < datasetcount.length; j++ ){
            hold[j]=hold[j]/maxhold;
        }
        
        // establishing the nodes, one for each variable
        nodes.push({id:i, reflexive: false, "name": initialize[i], data: [5,15,20,0,5,15,20], count: hold, "nodeCol":colors(i)}); //, "nodeCol":colors(i)
        console.log(nodes);
        
        if(i==0){
            nodes[0].reflexive=true;
        }
        
        lastNodeId=i;
    };  //end loop establishing nodes and histograms
    
    // these are the initial links (arrows drawn) among the nodes
    var links = [
                 {source: nodes[1], target: nodes[0], left: false, right: true },
                 {source: nodes[0], target: nodes[2], left: false, right: true }
                 ];
//    console.log(nodes);
    
    // init D3 force layout, that is, drawing the nodes in the browser
    var force = d3.layout.force()
    .nodes(nodes)
    .links(links)
    .size([width, height])
    .linkDistance(150)
    .charge(-800)
    .on('tick',tick);  // .start() is important to initialize the layout
    
    // define arrow markers for graph links
    svg.append('svg:defs').append('svg:marker')
    .attr('id', 'end-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 6)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
    .append('svg:path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#000');
    
    svg.append('svg:defs').append('svg:marker')
    .attr('id', 'start-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 4)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
    .append('svg:path')
    .attr('d', 'M10,-5L0,0L10,5')
    .attr('fill', '#000');
    
    
    
    // line displayed when dragging new nodes
    var drag_line = svg.append('svg:path')
    .attr('class', 'link dragline hidden')
    .attr('d', 'M0,0L0,0');
    
    // handles to link and node element groups
    var path = svg.append('svg:g').selectAll('path'),
    circle = svg.append('svg:g').selectAll('g');
    
    // mouse event vars
    var selected_node = null,
    selected_link = null,
    mousedown_link = null,
    mousedown_node = null,
    mouseup_node = null;
    
    function resetMouseVars() {
        mousedown_node = null;
        mouseup_node = null;
        mousedown_link = null;
    }
    
    // update force layout (called automatically each iteration)
    function tick() {
        // draw directed edges with proper padding from node centers
        path.attr('d', function(d) {
                  var deltaX = d.target.x - d.source.x,
                  deltaY = d.target.y - d.source.y,
                  dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
                  normX = deltaX / dist,
                  normY = deltaY / dist,
                  sourcePadding = d.left ? allR+5 : allR,
                  targetPadding = d.right ? allR+5 : allR,
                  sourceX = d.source.x + (sourcePadding * normX),
                  sourceY = d.source.y + (sourcePadding * normY),
                  targetX = d.target.x - (targetPadding * normX),
                  targetY = d.target.y - (targetPadding * normY);
                  return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
                  });
        
        //  if(forcetoggle){
        circle.attr('transform', function(d) {
                    return 'translate(' + d.x + ',' + d.y + ')';
                    });
        //  };
        
    }
    
    // update graph (called when needed)
    function restart() {
        
        if(forcetoggle)
        {
            force.gravity(0.1);
            force.charge(-800)
            force.resume();
        }
        else
        {
            force.gravity(0);
            force.charge(0)
            force.stop();
        }
        
        // path (link) group
        path = path.data(links);
        
        // update existing links
        path.classed('selected', function(d) { return d === selected_link; })
        .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
        .style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; });
        
        
        // add new links
        path.enter().append('svg:path')
        .attr('class', 'link')
        .classed('selected', function(d) { return d === selected_link; })
        .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
        .style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; })
        .on('mousedown', function(d) {
            if(d3.event.ctrlKey) return;
            
            // select link
            mousedown_link = d;
            if(mousedown_link === selected_link) selected_link = null;
            else selected_link = mousedown_link;
            selected_node = null;
            restart();
            });
        
        // remove old links
        path.exit().remove();
        
        
        
        
        
        // circle (node) group
        // NB: the function arg is crucial here! nodes are known by id, not by index!
       circle = circle.data(nodes, function(d) { return d.id; });
        
        // update existing nodes (reflexive & selected visual states)
        //d3.rgb is the function adjusting the color here.  it is saying take the color of d.id, make it brighter, then convert that addition of brightness to a string that d3.rgb understands
      //  console.log(circle);
        circle.selectAll('circle')
        .classed('reflexive', function(d) { return d.reflexive; })
        .style('fill', function(d){
          //     console.log(d.nodeCol); //#f17lksjflkdsj as it should
                return (d === selected_node) ? d3.rgb(d.nodeCol).brighter() : d.nodeCol; // IF d is equal to selected_node return brighter color ELSE return normal color
               })
        .on('click',function() {
            d3.select(this)
            .style('fill', function(d) {
                   if(colorCS) {
                    colorCS=false;
                   d.nodeCol = d3.rgb(csColor);
             //      console.log(d.id);  d.id is literally the id number  colors() is literally a scale declared at the top
                   return (d3.rgb(csColor));
                   // here you want to do: colors(d.id) = csColor
                   }
                   else if(colorTime){
                    colorTime=false;
                    d.nodeCol = d3.rgb(timeColor);
                    return (d3.rgb(timeColor));
                   }
                   else if(d === selected_node){
                    return (d3.rgb(d.nodeCol).brighter());
                   }
                   else {
                    return(d3.rgb(d.nodeCol));
                   }
        
                   });
            });

        
       /*
        
        // circle (node) group
        // NB: the function arg is crucial here! nodes are known by id, not by index!
        circle = circle.data(nodes, function(d) { return d.id; });
        console.log(circle);
        // update existing nodes (reflexive & selected visual states)
        circle.selectAll('circle')
        .style('fill', function(d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); }) // IF d is equal to selected_node return brighter color ELSE return normal color
        .classed('reflexive', function(d) { return d.reflexive; });   */
        
        
        
        // add new nodes
        
        var g = circle.enter().append('svg:g');
        
        g.selectAll("rect")
        .data(function(d){return nodes[d.id].count;})
        .enter()
        .append("rect")
        .attr("x", function(d, i) {
              return i * (barwidth / barnumber) - 0.5 * barwidth;  //barnumber should become local to each variable
              })
        .attr("y", function(d) {
              return - d * barheight; //Height minus data value
              })
        .attr("width", barwidth / barnumber - barPadding)  //barnumber should become local to each variable
        .attr("height", function(d) {
              return d * barheight; //data is scaled [0,1]
              })
        .attr("fill", "#4F4F4F")
        //      .call(xAxis)
        ;
        
        
        
        
        g.append("path")
        .attr("d", arc1)
        .style("fill", "steelblue")
        .attr("fill-opacity", 0)
        .on('mouseover', function(d){
            if(estimated){
            if(nodes[d.id].reflexive){
            d3.select(this).transition()  .attr("fill-opacity", .9)
            .delay(0)
            .duration(100);   //.attr('transform', 'scale(2)');
            }
            }
            })
        .on('mousedown',function(d){
            var test=0;
            placeholder.selectAll("image").data([0])
            .enter()
            .append("svg:image")
            .attr("xlink:href", "data/gr1.jpeg")
            .attr("width", 200)
            .attr("height", 200);
            })
        .on('mouseout', function(d){
            if(nodes[d.id].reflexive){
            d3.select(this).transition()
            .attr("fill-opacity", 0)
            .delay(100)
            .duration(500);   //.attr('transform', 'scale(2)');
            }
            });
        
        g.append("path")
        .attr("d", arc2)
        .style("fill", "steelblue")
        .attr("fill-opacity", 0)
        .on('mouseover', function(d){
            if(estimated){
            if(nodes[d.id].reflexive){
            d3.select(this).transition()
            .attr("fill-opacity", .9)
            .delay(0)
            .duration(100);   //.attr('transform', 'scale(2)');
            }
            }
            })
        .on('mousedown',function(d){
            var test=0;
            placeholder.selectAll("image").data([0])
            .enter()
            .append("svg:image")
            .attr("xlink:href", "data/gr7.jpeg")
            .attr("width", 200)
            .attr("height", 200);
            })
        .on('mouseout', function(d){
            if(nodes[d.id].reflexive){
            d3.select(this).transition()
            .attr("fill-opacity", 0)
            .delay(100)
            .duration(500);   //.attr('transform', 'scale(2)');
            }
            });
        
        g.append("path")
        .attr("d", arc3)
        .style("fill", "steelblue") //function(d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
        .attr("fill-opacity", 0)
        .on('mouseover', function(d){
            if(estimated){
            if(nodes[d.id].reflexive){
            d3.select(this).transition()  .attr("fill-opacity", .9)
            .delay(0)
            .duration(100);
            }
            }
            })
        .on('mousedown',function(d){
            var test=0;
            placeholder.selectAll("image").data([0])
            .enter()
            .append("svg:image")
            .attr("xlink:href", "data/gr8.jpeg")
            .attr("width", 200)
            .attr("height", 200);
            })
        .on('mouseout', function(d){
            if(nodes[d.id].reflexive){
            d3.select(this).transition()  .attr("fill-opacity", 0)
            .delay(100)
            .duration(500);   //.attr('transform', 'scale(2)');
            }
            });
        
        
        
        g.append('svg:circle')
        .attr('class', 'node')
        .attr('r', allR)
        .style('fill', function(d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
        .style('opacity', "0.5")
        //    .style(  fill: url(#fade); )
        .style('stroke', function(d) { return d3.rgb(colors(d.id)).darker().toString(); })
        .classed('reflexive', function(d) { return d.reflexive; })
        .on('mouseover', function(d) {
            if(!mousedown_node || d === mousedown_node) return;
            // enlarge target node
            d3.select(this).attr('transform', 'scale(1.1)');
            })
        .on('mouseout', function(d) {
            if(!mousedown_node || d === mousedown_node) return;
            // unenlarge target node
            d3.select(this).attr('transform', '');
            })
        .on('mousedown', function(d) {
            if(d3.event.ctrlKey) return;
            
            // select node
            mousedown_node = d;
            if(mousedown_node === selected_node) selected_node = null;
            else selected_node = mousedown_node;
            selected_link = null;
            
            // reposition drag line
            drag_line
            .style('marker-end', 'url(#end-arrow)')
            .classed('hidden', false)
            .attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y);
            
            restart();
            })
        .on('mouseup', function(d) {
            if(!mousedown_node) return;
            
            // needed by FF
            drag_line
            .classed('hidden', true)
            .style('marker-end', '');
            
            // check for drag-to-self
            mouseup_node = d;
            if(mouseup_node === mousedown_node) { resetMouseVars(); return; }
            
            // unenlarge target node
            d3.select(this).attr('transform', '');
            
            // add link to graph (update if exists)
            // NB: links are strictly source < target; arrows separately specified by booleans
            var source, target, direction;
            if(mousedown_node.id < mouseup_node.id) {
            source = mousedown_node;
            target = mouseup_node;
            direction = 'right';
            } else {
            source = mouseup_node;
            target = mousedown_node;
            direction = 'left';
            }
            
            
            
            var link;
            link = links.filter(function(l) {
                                return (l.source === source && l.target === target);
                                })[0];
            
            if(link) {
            link[direction] = true;
            } else {
            link = {source: source, target: target, left: false, right: false};
            link[direction] = true;
            links.push(link);
            }
            
            // select new link
            selected_link = link;
            selected_node = null;
            restart();
            });
        
        // show node Names
        g.append('svg:text')
        .attr('x', 0)
        .attr('y', 15)
        .attr('class', 'id')
        .text(function(d) { return d.name; });
        
        // remove old nodes
        circle.exit().remove();
        
        // set the graph in motion
        if(forcetoggle){
            force.start();
        }
        
        if(forcetoggle)
        {
            force.gravity(0.1);
            force.charge(-800)
            force.resume();
        }
        else
        {
            force.gravity(0);
            force.charge(0)
            force.stop();
        }
    }  //end restart function
    
    
    function mousedown() {
        // prevent I-bar on drag
        d3.event.preventDefault();
        
        // because :active only works in WebKit?
        svg.classed('active', true);
        
        if(d3.event.ctrlKey || mousedown_node || mousedown_link) return;
        
        //  insert new node at point
        //  var point = d3.mouse(this),
        //      node = {id: ++lastNodeId, reflexive: false};
        //  node.x = point[0];
        //  node.y = point[1];
        //  nodes.push(node);
        
        restart();
    }
    
    function mousemove() {
        if(!mousedown_node) return;
        
        // update drag line
        drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);
        
        restart();
    }
    
    function mouseup() {
        if(mousedown_node) {
            // hide drag line
            drag_line
            .classed('hidden', true)
            .style('marker-end', '');
        }
        
        // because :active only works in WebKit?
        svg.classed('active', false);
        
        // clear mouse event vars
        resetMouseVars();
    }
    
    function spliceLinksForNode(node) {
        var toSplice = links.filter(function(l) {
                                    return (l.source === node || l.target === node);
                                    });
        toSplice.map(function(l) {
                     links.splice(links.indexOf(l), 1);
                     });
    }
    
    // only respond once per keydown
    var lastKeyDown = -1;
    
    function keydown() {
        d3.event.preventDefault();
        
        if(lastKeyDown !== -1) return;
        lastKeyDown = d3.event.keyCode;
        
        // ctrl
        if(d3.event.keyCode === 17) {
            if(forcetoggle){
                circle.call(force.drag);
            }
            svg.classed('ctrl', true);
        }
        
        if(!selected_node && !selected_link) return;
        switch(d3.event.keyCode) {
            case 8: // backspace
            case 46: // delete
                if(selected_node) {
                    nodes.splice(nodes.indexOf(selected_node), 1);
                    spliceLinksForNode(selected_node);
                } else if(selected_link) {
                    links.splice(links.indexOf(selected_link), 1);
                }
                selected_link = null;
                selected_node = null;
                restart();
                break;
            case 66: // B
                if(selected_link) {
                    // set link direction to both left and right
                    selected_link.left = true;
                    selected_link.right = true;
                }
                restart();
                break;
            case 76: // L
                if(selected_link) {
                    // set link direction to left only
                    selected_link.left = true;
                    selected_link.right = false;
                }
                restart();
                break;
            case 82: // R
                if(selected_node) {
                    // toggle node reflexivity
                    selected_node.reflexive = !selected_node.reflexive;
                } else if(selected_link) {
                    // set link direction to right only
                    selected_link.left = false;
                    selected_link.right = true;
                }
                restart();
                break;
        }
    }
    
    function keyup() {
        lastKeyDown = -1;
        
        // ctrl
        if(d3.event.keyCode === 17) {  
            circle
            .on('mousedown.drag', null)
            .on('touchstart.drag', null);
            svg.classed('ctrl', false);
        }
    }
    
    // app starts here
    
    svg.on('mousedown', mousedown)
    .on('mousemove', mousemove)
    .on('mouseup', mouseup);
    d3.select(window)
    .on('keydown', keydown)
    .on('keyup', keyup); 
    restart(); // this is the call the restart that initializes the force.layout()

}

// functions called by buttons
function forceSwitch() {
    forcetoggle = !forcetoggle;
}

function estimate() {
    // write links to file & run R CMD
    estimated=true;
}

function time() {
    colorTime = true;
}

function cs() {
    colorCS = true;
}

throw "stop execution";
/*
    nodes = [];
 
    var myvalues = [];
       // inside the below loop establishes the nodes and histograms
       // iterates once for each variable
    for (var i = 0; i < valueKey.length; i++) {

       // an individual variable
    myvalues=[];
    for (var k =0; k<dataset2.length; k++){
      myvalues.push(dataset2[k][valueKey[i]]);
    }

       // establishing histogram?
    var datasetcount = d3.layout.histogram()
        .bins(barnumber).frequency(false)
        (myvalues);

    //record the histogram lengths and then normalize to max=1

    hold= [datasetcount[0].y];
    var maxhold = datasetcount[0].y
    var value = 0;
    for (var j =1; j < datasetcount.length; j++ ){
      value = datasetcount[j].y;
      hold.push(datasetcount[j].y);
      if (maxhold < value){
        maxhold = value;
      }
    }

    for (var j =0; j < datasetcount.length; j++ ){
      hold[j]=hold[j]/maxhold;
    }

       // establishing the nodes, one for each variable
      nodes.push({id:i, reflexive: false, "name": valueKey[i], data: [5,15,20,0,5,15,20], count: hold});
 
 
      if(i==0){
        nodes[0].reflexive=true;
      }

      lastNodeId=i;
    };  //end loop establishing nodes and histograms
       

       // these are the initial links (arrows drawn) among the nodes
 var links = [
    {source: nodes[1], target: nodes[0], left: false, right: true },
    {source: nodes[0], target: nodes[2], left: false, right: true }
  ];
     //  console.log(links);

// init D3 force layout, that is, drawing the nodes in the browser
var force = d3.layout.force()
    .nodes(nodes)
    .links(links)
    .size([width, height])
    .linkDistance(150)
    .charge(-800)
       .on('tick', tick);  // on 'tick' do tick

// define arrow markers for graph links
svg.append('svg:defs').append('svg:marker')
    .attr('id', 'end-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 6)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
  .append('svg:path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#000');

svg.append('svg:defs').append('svg:marker')
    .attr('id', 'start-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 4)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
  .append('svg:path')
    .attr('d', 'M10,-5L0,0L10,5')
    .attr('fill', '#000');

// line displayed when dragging new nodes
var drag_line = svg.append('svg:path')
  .attr('class', 'link dragline hidden')
  .attr('d', 'M0,0L0,0');

// handles to link and node element groups
var path = svg.append('svg:g').selectAll('path'),
    circle = svg.append('svg:g').selectAll('g');


// mouse event vars
var selected_node = null,
    selected_link = null,
    mousedown_link = null,
    mousedown_node = null,
    mouseup_node = null;

function resetMouseVars() {
  mousedown_node = null;
  mouseup_node = null;
  mousedown_link = null;
}

// update force layout (called automatically each iteration)
function tick() {
  // draw directed edges with proper padding from node centers
  path.attr('d', function(d) {
    var deltaX = d.target.x - d.source.x,
        deltaY = d.target.y - d.source.y,
        dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
        normX = deltaX / dist,
        normY = deltaY / dist,
        sourcePadding = d.left ? allR+5 : allR,
        targetPadding = d.right ? allR+5 : allR,
        sourceX = d.source.x + (sourcePadding * normX),
        sourceY = d.source.y + (sourcePadding * normY),
        targetX = d.target.x - (targetPadding * normX),
        targetY = d.target.y - (targetPadding * normY);
    return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
  });

//  if(forcetoggle){
  circle.attr('transform', function(d) {
    return 'translate(' + d.x + ',' + d.y + ')';
  });
//  };

}

// update graph (called when needed)
function restart() {

   if(forcetoggle)
  {
    force.gravity(0.1);
       force.charge(-800);
    force.resume();
  }
  else
  {
    force.gravity(0);
       force.charge(0);
    force.stop();
  }

  // path (link) group
  path = path.data(links);
  //     console.log(path);
  // update existing links
  path.classed('selected', function(d) { return d === selected_link; })
    .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
    .style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; });


  // add new links
  path.enter().append('svg:path')
    .attr('class', 'link')
    .classed('selected', function(d) { return d === selected_link; })
    .style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
    .style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; })
    .on('mousedown', function(d) {
      if(d3.event.ctrlKey) return;

      // select link
      mousedown_link = d;
      if(mousedown_link === selected_link) selected_link = null;
      else selected_link = mousedown_link;
      selected_node = null;
      restart();
    });

  // remove old links
  path.exit().remove();

  // circle (node) group
  // NB: the function arg is crucial here! nodes are known by id, not by index!
  circle = circle.data(nodes, function(d) { return d.id; });

  // update existing nodes (reflexive & selected visual states)
       //d3.rgb is the function adjusting the color here.  it is saying take the color of d.id, make it brighter, then convert that addition of brightness to a string that d3.rgb understands
 
       if(reflexNow==true) {
       circle.selectAll('circle')
                .style('fill', function(d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
                .classed('reflexive', function(d) { return d.reflexive; });
       }
       
       else {

       // update existing nodes for the time or cross section component
       circle.selectAll('circle')
       .on('mousedown',
           function() {
            if(colorCS) {
                d3.select(this)
                .style('fill', d3.rgb(csColor));
                colorCS=false;
               // reflexNow=true;
      //     restart();
            }
            else if(colorTime) {
                d3.select(this)
                .style('fill', d3.rgb(timeColor));
                colorTime=false;
              //  reflexNow=true;
     //      restart();
            }
           reflexNow=true;
           });
       
       }
    

  
       
  // add new nodes

// assign g to the array of circle nodes on the screen
  var g = circle.enter().append('svg:g');
     //  console.log(g);
  g.selectAll("rect")
      .data(function(d){return nodes[d.id].count;})
      .enter()
      .append("rect")
      .attr("x", function(d, i) {
      return i * (barwidth / barnumber) - 0.5 * barwidth;  //barnumber should become local to each variable
      })     
      .attr("y", function(d) {
      return - d * barheight; //Height minus data value
      })
      .attr("width", barwidth / barnumber - barPadding)  //barnumber should become local to each variable
      .attr("height", function(d) {
      return d * barheight; //data is scaled [0,1]
      })
      .attr("fill", "#4F4F4F")
      ;  // end selctAll("rect") what is rect?

       //appending path arc1
   g.append("path")
   .attr("d", arc1)
   .style("fill", "steelblue")
   .attr("fill-opacity", 0)
   .on('mouseover', function(d){
      if(estimated){
       if(nodes[d.id].reflexive){ //notice that the attribute fill-opacity is adjusted here
           d3.select(this).transition()  .attr("fill-opacity", .9)
        .delay(0)
        .duration(100);
          }
        }
    })
    .on('mousedown',function(d){
    var test=0;
    placeholder.selectAll("image").data([0])
      .enter()
      .append("svg:image")
      .attr("xlink:href", "data/gr1.jpeg")
      .attr("width", 200)
      .attr("height", 200);
    })
      .on('mouseout', function(d){
       if(nodes[d.id].reflexive){
         d3.select(this).transition()  
           .attr("fill-opacity", 0)
           .delay(100)
           .duration(500);   //.attr('transform', 'scale(2)');
          }
    });
    
       //appending path arc2
    g.append("path")
    .attr("d", arc2)
    .style("fill", "steelblue")
    .attr("fill-opacity", 0)
    .on('mouseover', function(d){
    if(estimated){
       if(nodes[d.id].reflexive){
         d3.select(this).transition()  
           .attr("fill-opacity", .9)
           .delay(0)
           .duration(100);   //.attr('transform', 'scale(2)');
          }
        }
    })
      .on('mousedown',function(d){
    var test=0;
    placeholder.selectAll("image").data([0])
      .enter()
      .append("svg:image")
      .attr("xlink:href", "data/gr7.jpeg")
      .attr("width", 200)
      .attr("height", 200);
    })
      .on('mouseout', function(d){
       if(nodes[d.id].reflexive){
         d3.select(this).transition()  
           .attr("fill-opacity", 0)
           .delay(100)
           .duration(500);   //.attr('transform', 'scale(2)');
          }
    });

       //appending path arc3
   g.append("path")
   .attr("d", arc3)
   .style("fill", "steelblue") //function(d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
   .attr("fill-opacity", 0)
   .on('mouseover', function(d){
    if(estimated){
       if(nodes[d.id].reflexive){
           d3.select(this).transition()  .attr("fill-opacity", .9)
        .delay(0)
        .duration(100);
          }
        }
    })
   .on('mousedown',function(d){
    var test=0;
    placeholder.selectAll("image").data([0])
      .enter()
      .append("svg:image")
      .attr("xlink:href", "data/gr8.jpeg")
      .attr("width", 200)
      .attr("height", 200);
    })
      .on('mouseout', function(d){
       if(nodes[d.id].reflexive){
           d3.select(this).transition()  .attr("fill-opacity", 0)
        .delay(100)
        .duration(500);   //.attr('transform', 'scale(2)');
          }
    });

    //   console.log(circle);
       //append circle
       // code below has .on for mouse over, out, down, and up
       // commenting out from the first .attr below until the first .on literally removes the nodes and their coloring.  Why?
  g.append('svg:circle')
    .attr('class', 'node')
    .attr('r', allR)
    .style('fill', function(d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
    .style('opacity', "0.5")
    .style('stroke', function(d) { return d3.rgb(colors(d.id)).darker().toString(); })
    .classed('reflexive', function(d) { return d.reflexive; })
    .on('mouseover', function(d) {
      if(!mousedown_node || d === mousedown_node) return;
      // enlarge target node
      d3.select(this).attr('transform', 'scale(1.1)');
    })
    .on('mouseout', function(d) {
      if(!mousedown_node || d === mousedown_node) return;
      // unenlarge target node
      d3.select(this).attr('transform', '');
    })
    .on('mousedown', function(d) {
      if(d3.event.ctrlKey) return;

      // select node
      mousedown_node = d;
      if(mousedown_node === selected_node) selected_node = null;
      else selected_node = mousedown_node;
      selected_link = null;

      // reposition drag line
      drag_line
        .style('marker-end', 'url(#end-arrow)')
        .classed('hidden', false)
        .attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y);

      restart(); //why the restart here?  function is calling itself
    })
    .on('mouseup', function(d) {
      if(!mousedown_node) return;

      // needed by FF
      drag_line
        .classed('hidden', true)
        .style('marker-end', '');

      // check for drag-to-self
      mouseup_node = d;
      if(mouseup_node === mousedown_node) { resetMouseVars(); return; }

      // unenlarge target node
      d3.select(this).attr('transform', '');

      // add link to graph (update if exists)
      // NB: links are strictly source < target; arrows separately specified by booleans
      var source, target, direction;
      if(mousedown_node.id < mouseup_node.id) {
        source = mousedown_node;
        target = mouseup_node;
        direction = 'right';
      } else {
        source = mouseup_node;
        target = mousedown_node;
        direction = 'left';
      }



      var link;
      link = links.filter(function(l) {
        return (l.source === source && l.target === target);
      })[0];

      if(link) {
        link[direction] = true;
      } else {
        link = {source: source, target: target, left: false, right: false};
        link[direction] = true;
        links.push(link);
      }

      // select new link
      selected_link = link;
      selected_node = null;
      restart();  // again, a restart()
    }); // end the g.append('svg:circle')

  // show node Names
  g.append('svg:text')
      .attr('x', 0)
      .attr('y', 15)
      .attr('class', 'id')
      .text(function(d) { return d.name; });

  // remove old nodes
  circle.exit().remove();

  // set the graph in motion
  if(forcetoggle){
    force.start();
    force.gravity(0.1);
    force.charge(-800)
    force.resume();
  }
  else
  {
    force.gravity(0);
    force.charge(0)
    force.stop();
  }
}  //end restart()

    //   console.log(nodes);
    //   console.log(circle);

       
/* adding in the color coding for time and cross-section
       circle.on("mousedown", function(d) {
               if(colorTime) {
                d3.select(this).transition()
                .attr("fill","black");
               }
                });
*/
 /*
function mousedown() {
  // prevent I-bar on drag
  d3.event.preventDefault();
  
  // because :active only works in WebKit?
  svg.classed('active', true);

  if(d3.event.ctrlKey || mousedown_node || mousedown_link) return;

//  insert new node at point
//  var point = d3.mouse(this),
//      node = {id: ++lastNodeId, reflexive: false};
//  node.x = point[0];
//  node.y = point[1];
//  nodes.push(node);

  restart();
}

function mousemove() {
  if(!mousedown_node) return;

  // update drag line
  drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);

  restart();
}

function mouseup() {
  if(mousedown_node) {
    // hide drag line
    drag_line
      .classed('hidden', true)
      .style('marker-end', '');
  }

  // because :active only works in WebKit?
  svg.classed('active', false);

  // clear mouse event vars
  resetMouseVars();
}

function spliceLinksForNode(node) {
  var toSplice = links.filter(function(l) {
    return (l.source === node || l.target === node);
  });
  toSplice.map(function(l) {
    links.splice(links.indexOf(l), 1);
  });
}

// only respond once per keydown
var lastKeyDown = -1;

function keydown() {
  d3.event.preventDefault();

  if(lastKeyDown !== -1) return;
  lastKeyDown = d3.event.keyCode;

  // ctrl
  if(d3.event.keyCode === 17) {  
    if(forcetoggle){
    circle.call(force.drag);
  }
    svg.classed('ctrl', true);
  }

  if(!selected_node && !selected_link) return;
  switch(d3.event.keyCode) {
    case 8: // backspace
    case 46: // delete
      if(selected_node) {
        nodes.splice(nodes.indexOf(selected_node), 1);
        spliceLinksForNode(selected_node);
      } else if(selected_link) {
        links.splice(links.indexOf(selected_link), 1);
      }
      selected_link = null;
      selected_node = null;
      restart();
      break;
    case 66: // B
      if(selected_link) {
        // set link direction to both left and right
        selected_link.left = true;
        selected_link.right = true;
      }
      restart();
      break;
    case 76: // L
      if(selected_link) {
        // set link direction to left only
        selected_link.left = true;
        selected_link.right = false;
      }
      restart();
      break;
    case 82: // R
      if(selected_node) {
        // toggle node reflexivity
        selected_node.reflexive = !selected_node.reflexive;
      } else if(selected_link) {
        // set link direction to right only
        selected_link.left = false;
        selected_link.right = true;
      }
      restart();
      break;
  }
}

function keyup() {
  lastKeyDown = -1;

  // ctrl
  if(d3.event.keyCode === 17) {  
    circle
      .on('mousedown.drag', null)
      .on('touchstart.drag', null);
    svg.classed('ctrl', false);
  }
}

// app starts here

svg.on('mousedown', mousedown)
  .on('mousemove', mousemove)
  .on('mouseup', mouseup);
d3.select(window)
  .on('keydown', keydown)
  .on('keyup', keyup);
restart();


// adding the variables to the leftpanel DOM
    d3.select("#leftpanel.left").selectAll("p")
       .data(valueKey)
       .enter()
       .append("p")
       .text(function(d){return d;});
       
       
});  //This is ending the asynchronous loading of the .csv file

// functions called by buttons
function forceSwitch() {
  forcetoggle = !forcetoggle;
}

function estimate() {
  // write links to file & run R CMD
  estimated=true;
}

function time() {
    colorTime = true;
    reflexNow=false;
}

function cs() {
    colorCS = true;
    reflexNow=false;
}

function reflex() {
    reflexNow = true;
}

/*
function tick(myPath, myCircle) {
    // draw directed edges with proper padding from node centers
    myPath.attr('d', function(d) {
              var deltaX = d.target.x - d.source.x,
              deltaY = d.target.y - d.source.y,
              dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
              normX = deltaX / dist,
              normY = deltaY / dist,
              sourcePadding = d.left ? allR+5 : allR,
              targetPadding = d.right ? allR+5 : allR,
              sourceX = d.source.x + (sourcePadding * normX),
              sourceY = d.source.y + (sourcePadding * normY),
              targetX = d.target.x - (targetPadding * normX),
              targetY = d.target.y - (targetPadding * normY);
              return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
              });
    
    //  if(forcetoggle){
    myCircle.attr('transform', function(d) {
                return 'translate(' + d.x + ',' + d.y + ')';
                });
    //  };
    
} */


