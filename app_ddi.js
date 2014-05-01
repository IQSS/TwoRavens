//////////
// Globals

// set up SVG for D3

//var leftpanel = d3.select("body")
//.append('svg');

var svg = d3.select("#main.left")
.append('svg');

//.attr('width', width)
//.attr('height', height);
var tempWidth = d3.select("#main.left").style("width")
var width = tempWidth.substring(0,(tempWidth.length-2));

var tempHeight = d3.select("#main.left").style("height")
var height = tempHeight.substring(0,(tempHeight.length-2));

//var resultspanel = d3.select("#rightpanel.left")
//.append('svg');

//      .attr('y',-1800)
//.attr('width', 200)
//.attr('height', 200);

//var varpanel = d3.select("#leftpanel.left")
//.append('svg')
//.attr('height', 2000);

// location of Summary Statistics popup window
//var xPos = 250;
//var yPos = 50;

// position the subset and setx divs
//d3.select("#subset")
//.style("right", xPos + "px")
//.style("top", yPos + "px")

//d3.select("#setx")
//.style("right", xPos + "px")
//.style("top", yPos + "px")


var forcetoggle=true;
var estimated=false;
var subseted=false; //use this to tell users they have subseted the data
var resultsViewer=false;

// this is the initial color scale that is used to establish the initial colors of the nodes.  allNodes.push() below establishes a field for the master node array allNodes called "nodeCol" and assigns a color from this scale to that field.  everything there after should refer to the nodeCol and not the color scale, this enables us to update colors and pass the variable type to R based on its coloring
var colors = d3.scale.category20();

var colorTime=false;
var timeColor = '#2d6ca2';

var colorCS=false;
var csColor = '#419641';

var depVar=false;
var dvColor = '#28A4C9';

var subsetdiv=false;
var setxdiv=false;

var varColor = d3.rgb("aliceblue");
var selVarColor = d3.rgb("salmon");
var taggedColor = d3.rgb("whitesmoke");

var lefttab = "tab1"; //global for current tab in left panel

// Zelig models, eventually this could be a separate xml file that is imported
//var zmods = ["OLS", "Logit"];
var mods = new Object;
d3.json("data/zeligmodels2.json", function(error, json) {
        if (error) return console.warn(error);
        var jsondata = json;
        console.log(jsondata);
        jsondata.zeligmodels.forEach(function(d) {
       // mods.push(d["-name"]);
        mods[d["-name"]] = d["description"];
                                    });
        });
var zmods = mods;

var zparams = { zdata:[], zedges:[], ztime:[], zcross:[], zmodel:"", zvars:[], zdv:[], zhostname:"", zfileid:"", zsubset:[], zsetx:[] };


// read in pre-processed data from dvn
//var pURL = "data/preprocess2429360.txt";   // This is the Strezhnev Voeten JSON data
var pURL = "data/fearonLaitin.txt";     // This is the Fearon Laitin JSON data



var originalPreprocess = readPreprocess(pURL);
var preprocess = originalPreprocess; // preprocess is always a reference to either original or subset
var subsetPreprocess = new Object;

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
var lablArray = [];
var hold = [];
var allNodes = [];
var originalNodes = []; // this will be used when toggling between subset and original
var subsetNodes = [];
var links = [];
var nodes = [];

// load data from DDI just javascript
//var xmlDoc=loadXMLDoc("data/strezhnev_voeten_2013.xml"); // Path to the XML file;
//console.log(xmlDoc);

//var vars = xmlDoc.getElementsByTagName("var");
//console.log(vars); // each variable in the data
//console.log(vars.length); // 109 of them

// load data from DDI with d3
//d3.xml("data/strezhnev_voeten_2013.xml", "application/xml", function(xml) {   // This is Strezhnev Voeten
d3.xml("data/fearonLaitin.xml", "application/xml", function(xml) {              // This is Fearon Laitin

// pass the entire link bc the id might not be unique

// temporary defaults for the fileid and hostname, pointing to 
// the sample data set on dvn-build, until more "real" data become
// available:
if (!hostname) {
        hostname="dvn-build.hmdc.harvard.edu";
}
var metadataurl="http://"+hostname+"/api/meta/datafile/";
if (!fileid) {
        fileid=22;
}
metadataurl=metadataurl+fileid;
console.log("metadata url: "+metadataurl);
//d3.xml("http://dvn-build.hmdc.harvard.edu/api/meta/datafile/2429360", "application/xml", function(xml) {
//d3.xml("http://dvn-build.hmdc.harvard.edu/api/meta/datafile/25", "application/xml", function(xml) {
//d3.xml(metadataurl, "application/xml", function(xml) {


      var vars = xml.documentElement.getElementsByTagName("var");
      var temp = xml.documentElement.getElementsByTagName("fileName");
      zparams.zdata = temp[0].childNodes[0].nodeValue;
  //    console.log(temp[0].childNodes[0].nodeValue);
  //    console.log(temp);
  //    console.log(zparams.zdata);


      // Put dataset name, from meta-data, into left panel
      d3.select("#datasetName").selectAll("p")
      .html( zparams.zdata.replace( /\.(.*)/, "") );  // regular expression to drop any file extension


      // temporary values for hold that correspond to histogram bins
      hold = [0, 0, 0, 0, 0, 0, 0];
      var myvalues = [0, 0, 0, 0, 0];

      for (i=0;i<vars.length;i++) { 
        var sumStats = new Object;
        var varStats = [];
        valueKey[i] = vars[i].attributes.name.nodeValue;
        lablArray[i] = vars[i].getElementsByTagName("labl")[0].childNodes[0].nodeValue;

       
        var datasetcount = d3.layout.histogram()
        .bins(barnumber).frequency(false)
        (myvalues);
       
       varStats = vars[i].getElementsByTagName("sumStat");
       for (j=0; j<varStats.length; j++) {
            var myType = "";
            myType = varStats[j].getAttribute("type");
            if(myType==null) continue;
            sumStats[myType] = varStats[j].childNodes[0].nodeValue;
       //console.log(varStats[j]);
       }
       
       // console.log(vars[i].childNodes[4].attributes.type.ownerElement.firstChild.data);
       allNodes.push({id:i, reflexive: false, "name": valueKey[i], "labl": lablArray[i], data: [5,15,20,0,5,15,20], count: hold, "nodeCol":colors(i), "baseCol":colors(i), "strokeColor":selVarColor, "strokeWidth":"1", "varLevel":vars[i].attributes.intrvl.nodeValue, "minimum":sumStats.min, "median":sumStats.medn, "standardDeviation":sumStats.stdev, "mode":sumStats.mode, "valid":sumStats.vald, "mean":sumStats.mean, "maximum":sumStats.max, "invalid":sumStats.invd, "subsetplot":false, "subsetrange":["", ""],"setxplot":false, "subsethold":["", ""], "setxvals":["", ""]});
       };
 
       
       d3.select("#tab1").selectAll("p")
       .data(valueKey)
       .enter()
       .append("p")
       .attr("id",function(d){return d;})
       .text(function(d){return d;})
       .style('background-color',function(d) {
              if(findNodeIndex(d) > 2) {return varColor;}
              else {return selVarColor;}
              })
       .attr("data-container", "body")
       .attr("data-toggle", "popover")
       .attr("data-trigger", "hover")
       .attr("data-placement", "right")
       .attr("data-html", "true")
       .attr("onmouseover", "$(this).popover('toggle');")
       .attr("onmouseout", "$(this).popover('toggle');")
       .attr("data-original-title", "Summary Statistics");
       
       populatePopover(); // pipes in the summary stats
       
       
       d3.select("#models")
       .style('height', 2000)
       .style('overfill', 'scroll');
     
       var modellist = Object.keys(zmods);
       
       d3.select("#models").selectAll("p")
       .data(modellist)
       .enter()
       .append("p")
       .text(function(d){return d;})
       .style('background-color',function(d) {
              return varColor;
              })
       .attr("data-container", "body")
       .attr("data-toggle", "popover")
       .attr("data-trigger", "hover")
       .attr("data-placement", "top")
       .attr("data-html", "true")
       .attr("onmouseover", "$(this).popover('toggle');")
       .attr("onmouseout", "$(this).popover('toggle');")
       .attr("data-original-title", "Model Description")
       .attr("data-content", function(d){
              return zmods[d];
             });
     
       layout();
       
       });

function populatePopover () {
    
    d3.select("#tab1").selectAll("p")
    .attr("data-content", function(d) {
          var onNode = findNodeIndex(d);
          return popoverContent(allNodes[onNode]);
          });
}

function popoverContent(d) {

    function threeSF(x){
      var tsf = d3.format(".3r");                            // format to three significant figures after the decimal place
      return tsf(x).replace( /0+$/, "").replace( /\.$/, "")  // trim trailing zeros after a period, and any orphaned period
    }
    var rint = d3.format("r");
    return "<div class='form-group'><label class='col-sm-4 control-label'>Label</label><div class='col-sm-6'><p class='form-control-static'><i>" + d.labl + "</i></p></div></div>" +

    "<div class='form-group'><label class='col-sm-4 control-label'>Mean</label><div class='col-sm-6'><p class='form-control-static'>" + threeSF(d.mean) + "</p></div></div>" +
 
    "<div class='form-group'><label class='col-sm-4 control-label'>Median</label><div class='col-sm-6'><p class='form-control-static'>" + threeSF(d.median) + "</p></div></div>" +
 
    "<div class='form-group'><label class='col-sm-4 control-label'>Mode</label><div class='col-sm-6'><p class='form-control-static'>" + threeSF(d.mode) + "</p></div></div>" +
    
    "<div class='form-group'><label class='col-sm-4 control-label'>Stand Dev</label><div class='col-sm-6'><p class='form-control-static'>" + threeSF(d.standardDeviation) + "</p></div></div>" +

    "<div class='form-group'><label class='col-sm-4 control-label'>Maximum</label><div class='col-sm-6'><p class='form-control-static'>" + threeSF(d.maximum) + "</p></div></div>" +
    
    "<div class='form-group'><label class='col-sm-4 control-label'>Minimum</label><div class='col-sm-6'><p class='form-control-static'>" + threeSF(d.minimum) + "</p></div></div>" +
        
    "<div class='form-group'><label class='col-sm-4 control-label'>Invalid</label><div class='col-sm-6'><p class='form-control-static'>" + rint(d.invalid) + "</p></div></div>" +
    
    "<div class='form-group'><label class='col-sm-4 control-label'>Valid</label><div class='col-sm-6'><p class='form-control-static'>" + rint(d.valid) + "</p></div></div>" ;
}


function layout() {
    var myValues=[];
    
    nodes = [allNodes[0], allNodes[1], allNodes[2]];
    
  //  var update = function () {
  //      console.log(nodes);
  //      if(nodes.length < 3) {return;}
        
        // these are the initial links (arrows drawn) among the nodes
    links = [
                {source: nodes[1], target: nodes[0], left: false, right: true },
                {source: nodes[0], target: nodes[2], left: false, right: true }
                ];
    
        // init D3 force layout
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
        .style('fill', '#000');
        
        svg.append('svg:defs').append('svg:marker')
        .attr('id', 'start-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 4)
        .attr('markerWidth', 3)
        .attr('markerHeight', 3)
        .attr('orient', 'auto')
        .append('svg:path')
        .attr('d', 'M10,-5L0,0L10,5')
        .style('fill', '#000');

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
    
    
    //  add listerners to leftpanel.left.  every time a variable is clicked, nodes updates and background color changes.  mouseover shows summary stats or model description.
    d3.select("#tab1").selectAll("p")
    .on("mouseover", function(d) {
        // REMOVED THIS TOOLTIP CODE AND MADE A BOOTSTRAP POPOVER COMPONENT
        $("body div.popover")
        .addClass("variables");
        $("body div.popover div.popover-content")
        .addClass("form-horizontal");
         })
    .on("mouseout", function() {
        //Remove the tooltip
        //d3.select("#tooltip").style("display", "none");
        })
    .on("click", function(){
        d3.select(this)
        .style('background-color',function(d) {
               var myText = d3.select(this).text();
               var myColor = d3.select(this).style('background-color');
               var mySC = allNodes[findNodeIndex(myText)].strokeColor;
               
               zparams.zvars = []; //empty the zvars array
               if(d3.rgb(myColor).toString() === varColor.toString()) { // we are adding a var
                if(nodes.length==0) {
                    nodes.push(findNode(myText));
                    nodes[0].reflexive=true;
                }
                else {nodes.push(findNode(myText));}
                return selVarColor;
               }
               else { // dropping a variable
                    nodes.splice(findNode(myText)["index"], 1);
                    spliceLinksForNode(findNode(myText));
               
                if(mySC==dvColor) {
                    var dvIndex = zparams.zdv.indexOf(myText);
                    if (dvIndex > -1) { zparams.zdv.splice(dvIndex, 1); }
                    //zparams.zdv="";
                }
                else if(mySC==csColor) {
                    var dvIndex = zparams.zcross.indexOf(myText);
                    if (dvIndex > -1) { zparams.zcross.splice(dvIndex, 1); }
                }
                else if(mySC==timeColor) {
                    var dvIndex = zparams.ztime.indexOf(myText);
                    if (dvIndex > -1) { zparams.ztime.splice(dvIndex, 1); }
                }

                nodeReset(allNodes[findNodeIndex(myText)]);
                borderState();
                return varColor;
               }
               });
        
        restart();
        });
        
    d3.select("#models").selectAll("p") // models tab
    .on("mouseover", function(d) {
        // REMOVED THIS TOOLTIP CODE AND MADE A BOOTSTRAP POPOVER COMPONENT
        })
    .on("mouseout", function() {
        //Remove the tooltip
        //d3.select("#tooltip").style("display", "none");
        })
        //  d3.select("#Display_content")
        .on("click", function(){
            var myColor = d3.select(this).style('background-color');
            d3.select("#models").selectAll("p")
            .style('background-color',varColor);
            d3.select(this)
            .style('background-color',function(d) {
                   if(d3.rgb(myColor).toString() === varColor.toString()) {
                    zparams.zmodel = d.toString();
                    return selVarColor;
                   }
                   else {
                    zparams.zmodel = "";
                    return varColor;
                   }
                   });
            restart();
            });

            

    
    // update graph (called when needed)
    function restart() {
        // nodes.id is pegged to allNodes, i.e. the order in which variables are read in
        // nodes.index is floating and depends on updates to nodes.  a variables index changes when new variables are added.
        // many changes have been made below from nodes.id to nodes.index.
     //   console.log(nodes);
        

     /*
        if(!forcetoggle) {
            console.log(circle);
            console.log(d);
            circle.call(force.drag);
            
            return;
        }

       */
        
        if(forcetoggle)
        {
            force.gravity(0.1);
            force.charge(-800)
            force.resume();
            
            circle
            .on('mousedown.drag', null)
            .on('touchstart.drag', null);
        }
        else
        {
            force.gravity(0);
            force.charge(0)
            force.stop();
            
            circle.call(force.drag);
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
        // VJD: these nodes are known by index, an attribute of each object in the array.  it's confusing, but the id, as an attribute, is pegged to allNodes.
       circle = circle.data(nodes, function(d) {return d.id; });
     
        // update existing nodes (reflexive & selected visual states)
        //d3.rgb is the function adjusting the color here.
        circle.selectAll('circle')
        .classed('reflexive', function(d) { return d.reflexive; })
        .style('fill', function(d){
               var myIndex = findNodeIndex(d.name);
                return (d === selected_node) ? d3.rgb(d.nodeCol).brighter() : d3.rgb(d.nodeCol); // IF d is equal to selected_node return brighter color ELSE return normal color
               })
        .style('stroke', function(d){
               var myIndex = findNodeIndex(d.name);
               return (d3.rgb(d.strokeColor)); // IF d is equal to selected_node return brighter color ELSE return normal color
               })
        .style('stroke-width', function(d){
               var myIndex = findNodeIndex(d.name);
               return (d.strokeWidth)
               })
        .on('click',function() {
            d3.select(this)
            .style('stroke-width', function(d) {
                   if(!depVar & !colorTime & !colorCS) {
                        return(d.strokeWidth);
                   }
                   else if(depVar){
                    depVar=false;
                    $('#dvButton').removeClass('btn btn-info active').addClass('btn btn-default');
                    setColors(d,dvColor);
                   }
                   else if(colorCS){
                    colorCS=false;
                    $('#csButton').removeClass('btn btn-success active').addClass('btn btn-default');
                    setColors(d,csColor);
                   }
                   else if(colorTime){
                    colorTime=false;
                    $('#timeButton').removeClass('btn btn-primary active').addClass('btn btn-default');
                    setColors(d,timeColor);
                   }
                   return(d.strokeWidth);
                   })
            .style('stroke', function(d) {
                   return(d.strokeColor);
                   })
            .style('fill', function(d) {
                   if(!depVar & !colorTime & !colorCS) {
                    var myIndex = findNodeIndex(d.name);
                    return (d === selected_node) ? d3.rgb(d.nodeCol).brighter() : d3.rgb(d.nodeCol);
                   }
                   else {return(d.nodeCol);}
            });
            borderState();
            });
        
     /*
        var tooltip = d3.select("#main.left").selectAll("svg")
        .append("stats")
        .attr("width", 200)
        .attr("height", 200)
        .style("visibility", "hidden")
        .text("a simple tooltip");
        
        var sampleSVG = d3.select("#main.left")
         .append("svg:svg")
         .attr("class", "sample")
         .attr("width", 300)
         .attr("height", 300);
         */

        
        
       /*
        
        // circle (node) group
        // NB: the function arg is crucial here! nodes are known by id, not by index!
        circle = circle.data(nodes, function(d) { return d.id; });
        // update existing nodes (reflexive & selected visual states)
        circle.selectAll('circle')
        .style('fill', function(d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); }) // IF d is equal to selected_node return brighter color ELSE return normal color
        .classed('reflexive', function(d) { return d.reflexive; });   */
        
        
        
        // add new nodes
        
        var g = circle.enter().append('svg:g');
        
        g.selectAll("rect")
        .data(function(d){return allNodes[d.id].count;}) // notice the change to allNodes to maintain consistent indexing
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
        
        
// VJD: this is where the hardcoded images were initially piped into the rightpanel.  the mousedown portions have been commented out, but those blue arcs can probably be used for something so they have been left as is.
        g.append("path")
        .attr("d", arc1)
        .style("fill", "steelblue")
        .attr("fill-opacity", 0)
        .on('mouseover', function(d){
            if(estimated){
            if(nodes[d.index].reflexive){
            d3.select(this).transition()  .attr("fill-opacity", .9)
            .delay(0)
            .duration(100);   //.attr('transform', 'scale(2)');
            }
            }
            })
    /*    .on('mousedown',function(d){
            var test=0;
            resultspanel.selectAll("image").data([0])
            .enter()
            .append("svg:image")
            .attr("xlink:href", "data/gr1.jpeg")
            .attr("width", 200)
            .attr("height", 200);
            })   */
        .on('mouseout', function(d){
            if(nodes[d.index].reflexive){
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
            if(nodes[d.index].reflexive){
            d3.select(this).transition()
            .attr("fill-opacity", .9)
            .delay(0)
            .duration(100);   //.attr('transform', 'scale(2)');
            }
            }
            })
     /*   .on('mousedown',function(d){
            var test=0;
            resultspanel.selectAll("image").data([0])
            .enter()
            .append("svg:image")
            .attr("xlink:href", "data/gr7.jpeg")
            .attr("width", 200)
            .attr("height", 200);
            })   */
        .on('mouseout', function(d){
            if(nodes[d.index].reflexive){
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
            if(nodes[d.index].reflexive){
            d3.select(this).transition()  .attr("fill-opacity", .9)
            .delay(0)
            .duration(100);
            }
            }
            })
    /*    .on('mousedown',function(d){
            var test=0;
            resultspanel.selectAll("image").data([0])
            .enter()
            .append("svg:image")
            .attr("xlink:href", "data/gr8.jpeg")
            .attr("width", 200)
            .attr("height", 200);
            }) */
        .on('mouseout', function(d){
            if(nodes[d.index].reflexive){
            d3.select(this).transition()  .attr("fill-opacity", 0)
            .delay(100)
            .duration(500);   //.attr('transform', 'scale(2)');
            }
            });
        
        // allowing graphics to adjust for size
             d3.select("#rightpanel.left").selectAll("image")
        .on("mouseover", function() {
            
            d3.select("#rightpanel.left").style("width", "600px");
            
            myWidth = d3.select("#rightpanel.left").style("width");
            myWidth = myWidth.substring(0,(myWidth.length-2));

            myHeight = d3.select("#rightpanel.left").style("height");
            myHeight = myHeight.substring(0,(myHeight.length-2));

        //      console.log(d3.select(this).attr("width"));
              d3.select(this)
            .attr("width", myWidth)
            .attr("height", myHeight);
                  })
        .on("mouseout", function() {
            d3.select("#rightpanel.left").style("width", "200px");
            
            d3.select(this)
            .attr("width", 200)
            .attr("height", 200);
            });
        
        
        
        g.append('svg:circle')
        .attr('class', 'node')
        .attr('r', allR)
        .style('fill', function(d) {
  //             console.log(d);
               var myIndex = findNodeIndex(d.name);
               return (d === selected_node) ? d3.rgb(d.nodeCol).brighter().toString() : d.nodeCol; })
        .style('opacity', "0.5")
        //    .style(  fill: url(#fade); )
        .style('stroke', function(d) {
               var myIndex = findNodeIndex(d.name);
               return d3.rgb(d.strokeColor).toString(); })
        .classed('reflexive', function(d) { return d.reflexive; })
        .on('mouseover', function(d) {
            //console.log("this is where to add summary stats");
            if(!mousedown_node || d === mousedown_node) return;
            // the above if and the same one on mouseout have been commented out...
            // enlarge target node
           // tooltip.style("visibility", "visible");
            d3.select(this).attr('transform', 'scale(1.1)');
            })
        .on('mouseout', function(d) {
            if(!mousedown_node || d === mousedown_node) return;
            // unenlarge target node
            //tooltip.style("visibility", "hidden");
            d3.select(this).attr('transform', '');
            })
        .on('mousedown', function(d) {
            if(d3.event.ctrlKey) return;
            if(forcetoggle==false) return;
            
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
        
        
        // show summary stats on mouseover
        // SVG doesn't support text wrapping, use html instead
        g.selectAll("circle.node")
        .on("mouseover", function(d) {
                tabLeft("tab3");
                varSummary(d);
                })
            // popup(d, xPos, yPos);
            /*
            //Create the tooltip label
            d3.select("#tooltip")
            .style("left", xPos + "px")
            .style("top", yPos + "px")
            .select("#value")
            .html("median: " + d.median + "<br> mode: " + d.mode + "<br> maximum: " + d.maximum + "<br> minimum: " + d.minimum + "<br> mean: " + d.mean + "<br> invalid: " + d.invalid + "<br> valid: " + d.valid + "<br> stand dev: " + d.standardDeviation);
            
            d3.select("#tooltip").style("display", "inline");
*/
        .on("mouseout", function() {
            tabLeft(lefttab);
            //Remove the tooltip
          //  d3.select("#tooltip").remove();
          //  d3.select("#tooltip").style("display", "none");
            
            })
        
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
        
        /* ctrl
        if(d3.event.keyCode === 17) {
            if(forcetoggle){
                console.log(circle);
                circle.call(force.drag);
            }
            svg.classed('ctrl', true);
        }  */
        
        if(!selected_node && !selected_link) return;
        switch(d3.event.keyCode) {
            case 8: // backspace
            case 46: // delete
               /*  can no longer delete nodes, only links.  node deletion is handled in #leftpanel
                if(selected_node) {
                    nodes.splice(nodes.indexOf(selected_node), 1);
                    spliceLinksForNode(selected_node);
                } else if(selected_link) {   */
                    links.splice(links.indexOf(selected_link), 1);
                //}
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
        
        /* ctrl
        if(d3.event.keyCode === 17) {
            console.log(circle);
            circle
            .on('mousedown.drag', null)
            .on('touchstart.drag', null);
            svg.classed('ctrl', false);
        }   */
    }
    
    // app starts here
    
    svg.on('mousedown', mousedown)
    .on('mousemove', mousemove)
    .on('mouseup', mouseup);
    d3.select(window)
    .on('keydown', keydown)
    .on('keyup', keyup);
    restart(); // this is the call the restart that initializes the force.layout()
    
   // } // end update

} // end layout



var findNodeIndex = function(nodeName) {
    for (var i in allNodes) {
        if(allNodes[i]["name"] === nodeName) {return allNodes[i]["id"];}
    };
}

var findNode = function(nodeName) {
    for (var i in allNodes) {if (allNodes[i]["name"] === nodeName) return allNodes[i]};
}


// functions called by buttons
function forceSwitch() {
    forcetoggle = !forcetoggle;
    if(forcetoggle==false) {
        document.getElementById('btnForce').setAttribute("class", "btn active");
    }
    else {
        document.getElementById('btnForce').setAttribute("class", "btn btn-default");
    }
}

function estimate(btn) {
    // write links to file & run R CMD

    var property=document.getElementById(btn);
    property.style.backgroundColor="#66CCFF";
    
    zparams.zhostname = hostname;
    zparams.zfileid = fileid;
    
    zparams.zedges = [];
    zparams.zvars = [];
    
    for(var j =0; j < nodes.length; j++ ) { //populate zvars array
        zparams.zvars.push(nodes[j].name);
        var temp = findNodeIndex(nodes[j].name);
        zparams.zsetx[j] = allNodes[temp].setxvals;
        zparams.zsubset[j] = allNodes[temp].subsetrange;
    }

    for(var j =0; j < links.length; j++ ) { //populate zedges array
        var srctgt = [links[j].source.name, links[j].target.name]
        zparams.zedges.push(srctgt);
    }
    console.log(zparams);
    
    //package the zparams object as JSON
    var jsonout = JSON.stringify(zparams);
    var base = "http://0.0.0.0:8000/custom/zeligapp?solaJSON="

    //var test = "{\"x\":[1,2,4,7],\"y\":[3,5,7,9]}";
    //urlcall = base.concat(test);
    urlcall = base.concat(jsonout);
    console.log(urlcall);
    
    
    function estimateSuccess(btn,json) {
        console.log(json);
      var property=document.getElementById(btn);
      estimated=true;
      property.style.backgroundColor="#00CC33";
        
        var myparent = document.getElementById("results");
        myparent.removeChild(document.getElementById("resultsHolder"));
        
        // is this righttab necessary?  it's in the html when Results clicked...
        //righttab='results';
        setxOff();
        tabRight('btnResults');
     
        // pipe in figures to right panel
        var filelist = new Array;
        for(var i in json.images) {
            var zfig = document.createElement("img");
            zfig.setAttribute("src", json.images[i]);
            zfig.setAttribute('width', 200);
            zfig.setAttribute('height', 200);
            myparent.appendChild(zfig);
            //            filelist.push(json[i]);
        }
        
        var rCall = [];
        rCall[0] = json.call;
        console.log(rCall[0]);
        d3.select("#main.left").selectAll("p")
        .data(rCall)
        .enter()
        .append("p")
        .text(function(d){ return d; }); // !! BROKEN RESULTS OUTPUT TEXT <-------------------------- FIX THIS !!
        
        // write the results table
        
        console.log(json.sumInfo);
        var resultsArray = [];
        for (var key in json.sumInfo) {
            if(key=="colnames") {continue;}
            
            var obj = json.sumInfo[key];
            console.log(obj);
            console.log(key);
            resultsArray.push(obj);
            /* SO says this is important check, but I don't see how it helps here...
            for (var prop in obj) {
                // important check that this is objects own property
                // not from prototype prop inherited
                if(obj.hasOwnProperty(prop)){
                    alert(prop + " = " + obj[prop]);
                }
            }  */
        }
        
        console.log(resultsArray);
        
        var table = d3.select("#resultsView")
        .append("p")
        .html("<center><b>Results</b></center>")
        .append("table");
        
        var thead = table.append("thead");
        thead.append("tr")
        .selectAll("th")
        .data(json.sumInfo.colnames)
        .enter()
        .append("th")
        .text(function(d) { return d;});
        
        var tbody = table.append("tbody");
        tbody.selectAll("tr")
        .data(resultsArray)
        .enter().append("tr")
        .selectAll("td")
        .data(function(d){return d;})
        .enter().append("td")
        .text(function(d){return d;})
        .on("mouseover", function(){d3.select(this).style("background-color", "aliceblue")}) // for no discernable reason
        .on("mouseout", function(){d3.select(this).style("background-color", "#F9F9F9")}) ;  //(but maybe we'll think of one)

    }
    
    function estimateFail(btn) {
      var property=document.getElementById(btn);
      estimated=true;
      property.style.backgroundColor="#CC3333";
    }


    makeCorsRequest(urlcall,btn, estimateSuccess, estimateFail);

    
}

// below from http://www.html5rocks.com/en/tutorials/cors/ for cross-origin resource sharing (an issue when moving from port to port)
// Create the XHR object.
function createCORSRequest(method, url) {
    var xhr = new XMLHttpRequest();
    if ("withCredentials" in xhr) {
        // XHR for Chrome/Firefox/Opera/Safari.
        xhr.open(method, url, true);
    } else if (typeof XDomainRequest != "undefined") {
        // XDomainRequest for IE.
        xhr = new XDomainRequest();
        xhr.open(method, url);
    } else {
        // CORS not supported.
        xhr = null;
    }
    return xhr;
}

// Helper method to parse the title tag from the response.
//function getTitle(text) {
//    return text.match('<title>(.*)?</title>')[1];
//}

// Make the actual CORS request.
function makeCorsRequest(url,btn,callback, warningcallback) {
    // All HTML5 Rocks properties support CORS.
    // var url = 'http://updates.html5rocks.com';
    var xhr = createCORSRequest('GET', url);
    if (!xhr) {
        alert('CORS not supported');
        return;
    }
    
    // Response handlers for asynchronous load.  disabled for now
    xhr.onload = function() {
      var text = xhr.responseText;
   //   console.log(text);
   //   console.log(typeof text);
      var json = JSON.parse(text);   // should wrap in try / catch
      //var json = eval('(' + text + ')'); 
    //  console.log(json);
   //   console.log(typeof json);
      
      var names = Object.keys(json);

      if (names[0] == "warning"){
        warningcallback(btn);
        alert("Warning: " + json.warning);
      }else{
        callback(btn, json);
      }
    };
     
    xhr.onerror = function() {
      alert('Woops, there was an error making the request.');
    };
    
    xhr.send();
}




function time() {
    if(colorTime==true) {
        colorTime=false;
        $('#timeButton').removeClass('btn btn-primary active').addClass('btn btn-default');
    }
    else {
        colorTime = true;
        $('#timeButton').removeClass('btn-default').addClass('btn btn-primary active');
    }
    colorCS = false;
    depVar = false;
    $('#csButton').removeClass('btn btn-success active').addClass('btn btn-default');
    $('#dvButton').removeClass('btn btn-info active').addClass('btn btn-default');
}

function cs() {
    if(colorCS==true) {
        colorCS=false;
        $('#csButton').removeClass('btn btn-success active').addClass('btn btn-default');
    }
    else {
        colorCS=true;
        $('#csButton').removeClass('btn-default').addClass('btn btn-success active');
    }
    colorTime = false;
    depVar = false;
    $('#dvButton').removeClass('btn btn-info active').addClass('btn btn-default');
    $('#timeButton').removeClass('btn btn-primary active').addClass('btn btn-default');
}

function dv() {
    if(depVar==true) {
        depVar=false;
        $('#dvButton').removeClass('btn btn-info active').addClass('btn btn-default');
    }
    else {
        depVar=true;
        $('#dvButton').removeClass('btn-default').addClass('btn btn-info active');
    }
    colorCS = false;
    colorTime = false;
    $('#csButton').removeClass('btn btn-success active').addClass('btn btn-default');
    $('#timeButton').removeClass('btn btn-primary active').addClass('btn btn-default');
}

function reset() {
    location.reload();
}

// http://www.tutorials2learn.com/tutorials/scripts/javascript/xml-parser-javascript.html
function loadXMLDoc(XMLname)
{
    var xmlDoc;
    if (window.XMLHttpRequest)
    {
        xmlDoc=new window.XMLHttpRequest();
        xmlDoc.open("GET",XMLname,false);
        xmlDoc.send("");
        return xmlDoc.responseXML;
    }
    // IE 5 and IE 6
    else if (ActiveXObject("Microsoft.XMLDOM"))
    {
        xmlDoc=new ActiveXObject("Microsoft.XMLDOM");
        xmlDoc.async=false;
        xmlDoc.load(XMLname);
        return xmlDoc;
    }
    alert("Error loading document!");
    return null;
}


function tabLeft(tab) {
    tabi = tab.substring(3);
    //myattr = document.getElementById('btnPanel'+tabi).getAttribute("class");   // what does this do?
    document.getElementById('btnPanel'+tabi).setAttribute("class", "btn active");

    document.getElementById('tab1').style.display = 'none';
    document.getElementById('tab2').style.display = 'none';
    document.getElementById('tab3').style.display = 'none';

    if(tabi==1) {
        document.getElementById('btnPanel2').setAttribute("class", "btn btn-default");
        document.getElementById('btnPanel3').setAttribute("class", "btn btn-default");
    }
    else if (tabi==2) {
        document.getElementById('btnPanel1').setAttribute("class", "btn btn-default");
        document.getElementById('btnPanel3').setAttribute("class", "btn btn-default");
    }
    else {
        document.getElementById('btnPanel2').setAttribute("class", "btn btn-default");
        document.getElementById('btnPanel1').setAttribute("class", "btn btn-default");
    } 
    document.getElementById(tab).style.display = 'block';
}

function tabRight(tabid) {

    document.getElementById('models').style.display = 'none';
    document.getElementById('setx').style.display = 'none';
    document.getElementById('results').style.display = 'none';
    
    if(tabid=="btnModels") {
      document.getElementById('btnSetx').setAttribute("class", "btn btn-default");
      document.getElementById('btnResults').setAttribute("class", "btn btn-default");
      document.getElementById('btnModels').setAttribute("class", "btn active");
      document.getElementById('models').style.display = 'block';     
    }
    else if (tabid=="btnSetx") {
      document.getElementById('btnModels').setAttribute("class", "btn btn-default");
      document.getElementById('btnResults').setAttribute("class", "btn btn-default");
      document.getElementById('btnSetx').setAttribute("class", "btn active");
      document.getElementById('setx').style.display = 'block';     
    }
    else {
      document.getElementById('btnModels').setAttribute("class", "btn btn-default");
      document.getElementById('btnSetx').setAttribute("class", "btn btn-default");
      document.getElementById('btnResults').setAttribute("class", "btn active");
      document.getElementById('results').style.display = 'block';     
    }
    

/*

    if(document.getElementById(tabid).getAttribute('class')=="btn active" & tabid!="btnResults") {
        document.getElementById(tabid).setAttribute("class", "btn btn-default");
        document.getElementById('btnResults').setAttribute("class", "btn active");
   //     document.getElementById('btnSelect').setAttribute("style", "display:none");
        d3.select("#rightpanelcontent")
        .style("display", "inline");
        return;
    }
    
    if(tabid=="btnResults") {
    //    document.getElementById('btnSelect').setAttribute("style", "display:none");
    //    d3.select("#subset")
     //   .style("display", "none")
        d3.select("#setx")
        .style("display", "none")
        d3.select("#rightpanel")
        .attr("class", "container");
        d3.select("#rightpanelcontent")
        .style("display","inline");
    }
    
    document.getElementById(tabid).setAttribute("class", "btn active");
    
    if(tabid=="btnModels") {
//        document.getElementById('btnSelect').setAttribute("style", "display:inline");
//        document.getElementById('btnSelect').setAttribute("style", "float:right");
        document.getElementById('btnSetx').setAttribute("class", "btn btn-default");
        document.getElementById('btnResults').setAttribute("class", "btn btn-default");
        
        d3.select("#rightpanelcontent").style("display", "none");
    }
    else if (tabid=="btnSetx") {
        document.getElementById('btnModels').setAttribute("class", "btn btn-default");
        document.getElementById('btnResults').setAttribute("class", "btn btn-default");
 //       document.getElementById('btnSelect').setAttribute("style", "display:none");
        
        d3.select("#rightpanelcontent").style("display", "none");
    }
    else {  //Results
        document.getElementById('btnSetx').setAttribute("class", "btn btn-default");
        document.getElementById('btnModels').setAttribute("class", "btn btn-default");
 //       document.getElementById('btnSelect').setAttribute("style", "display:none");
        
        d3.select("#rightpanelcontent").style("display", "inline");
    }


*/

}


function varSummary(d) {
    //Create the tooltip label

    // This is mirrored in popup -- should make reusable function
    function threeSF(x){
      var tsf = d3.format(".3r");                            // format to three significant figures after the decimal place
      return tsf(x).replace( /0+$/, "").replace( /\.$/, "")  // trim trailing zeros after a period, and any orphaned period
    }
    var rint = d3.format("r");

    var summarydata = [],
    tmpDataset = [], t1 = ["Mean:","Median:","Mode:","Stand.Dev:","Minimum:","Maximum:","Valid:","Invalid:"],
    t2 = [threeSF(d.mean),threeSF(d.median),threeSF(d.mode),threeSF(d.standardDeviation),threeSF(d.minimum),threeSF(d.maximum),rint(d.valid),rint(d.invalid)],
    i, j;

    for (i = 0; i < t1.length; i++) {
        tmpDataset=[];
        tmpDataset.push(t1[i]);
        tmpDataset.push(t2[i]);
        summarydata.push(tmpDataset);
    };

  //  console.log(summarydata);
    d3.select("#tab3")
    .select("p")
    .html("<center><b>" +d.name+ "</b><br><i>" +d.labl+ "</i></center>")
    .append("table")
    .selectAll("tr")
    .data(summarydata)
    .enter().append("tr")
    .selectAll("td")
    .data(function(d){return d;})
    .enter().append("td")
    .text(function(d){return d;})
    .on("mouseover", function(){d3.select(this).style("background-color", "aliceblue")}) // for no discernable reason
    .on("mouseout", function(){d3.select(this).style("background-color", "#F9F9F9")}) ;  //(but maybe we'll think of one)
//    .style("font-size", "12px");

 
    var dataArray = [];
    dataArray.push({varname: d.name, properties: preprocess[d.name]});

    var nameList = new Array;
    for (var i = 0; i < allNodes.length; i++) {
      nameList[i] = allNodes[i].name;
    }
    var i = nameList.indexOf(d.name);

    if (dataArray[0].properties.type === "continuous") {
      density(dataArray[0], allNodes[i]);
    }
    else if (dataArray[0].properties.type === "bar") {
      bars(dataArray[0], allNodes[i]);
    }
    else {
      var plotsvg = d3.select("#tab3")      // no graph to draw, but still need to remove previous graph
      .selectAll("svg")                     
      .remove();
    };


    /*
    .html("<div class='form-group'><label class='col-sm-4 control-label'>Median</label><div class='col-sm-6'><p class='form-control-static'>" + d.median + "</p></div></div>" +
          
          "<div class='form-group'><label class='col-sm-4 control-label'>Mode</label><div class='col-sm-6'><p class='form-control-static'>" + d.mode + "</p></div></div>" +
          
          "<div class='form-group'><label class='col-sm-4 control-label'>Maximum</label><div class='col-sm-6'><p class='form-control-static'>" + d.maximum + "</p></div></div>" +
          
          "<div class='form-group'><label class='col-sm-4 control-label'>Minimum</label><div class='col-sm-6'><p class='form-control-static'>" + d.minimum + "</p></div></div>" +
          
          "<div class='form-group'><label class='col-sm-4 control-label'>Mean</label><div class='col-sm-6'><p class='form-control-static'>" + d.mean + "</p></div></div>" +
          
          "<div class='form-group'><label class='col-sm-4 control-label'>Invalid</label><div class='col-sm-6'><p class='form-control-static'>" + d.invalid + "</p></div></div>" +
          
          "<div class='form-group'><label class='col-sm-4 control-label'>Valid</label><div class='col-sm-6'><p class='form-control-static'>" + d.valid + "</p></div></div>" +
          
          "<div class='form-group'><label class='col-sm-4 control-label'>Stand Dev</label><div class='col-sm-6'><p class='form-control-static'>" + d.standardDeviation + "</p></div></div>"
          );
    */
}

function popupX(d) {

    var tsf = d3.format(".4r");
    var rint = d3.format("r");

    //Create the tooltip label
    d3.select("#tooltip")
    .style("left", tempX + "px")
    .style("top", tempY + "px")
    .select("#tooltiptext")
    .html("<div class='form-group'><label class='col-sm-4 control-label'>Mean</label><div class='col-sm-6'><p class='form-control-static'>" + tsf(d.mean) + "</p></div></div>" +
          
          "<div class='form-group'><label class='col-sm-4 control-label'>Median</label><div class='col-sm-6'><p class='form-control-static'>" + tsf(d.median) + "</p></div></div>" +
          
          "<div class='form-group'><label class='col-sm-4 control-label'>Mode</label><div class='col-sm-6'><p class='form-control-static'>" + tsf(d.mode) + "</p></div></div>" +
                  
          "<div class='form-group'><label class='col-sm-4 control-label'>Stand Dev</label><div class='col-sm-6'><p class='form-control-static'>" + tsf(d.standardDeviation) + "</p></div></div>" +
  
          "<div class='form-group'><label class='col-sm-4 control-label'>Maximum</label><div class='col-sm-6'><p class='form-control-static'>" + tsf(d.maximum) + "</p></div></div>" +
          
          "<div class='form-group'><label class='col-sm-4 control-label'>Minimum</label><div class='col-sm-6'><p class='form-control-static'>" + tsf(d.minimum) + "</p></div></div>" +
          
          "<div class='form-group'><label class='col-sm-4 control-label'>Valid</label><div class='col-sm-6'><p class='form-control-static'>" + rint(d.valid) + "</p></div></div>" +

          "<div class='form-group'><label class='col-sm-4 control-label'>Invalid</label><div class='col-sm-6'><p class='form-control-static'>" + rint(d.invalid) + "</p></div></div>" 
          );
    
    /*.html("Median: " + d.median + "<br>Mode: " + d.mode + "<br>Maximum: " + d.maximum + "<br>Minimum: " + d.minimum + "<br>Mean: " + d.mean + "<br>Invalid: " + d.invalid + "<br>Valid: " + d.valid + "<br>Stand Dev: " + d.standardDeviation);*/
    
    //d3.select("#tooltip")
    //.style("display", "inline")
    //.select("#tooltip h3.popover-title")
    //.html("Summary Statistics");

}


function subsetOff() {
    if (subsetdiv==true) {
        subsetdiv = false;
        d3.select("#tab2")
        .style("display", "none");
        d3.select("#leftpanel")
        .attr("class", "container");
        d3.select("#btnSelect")
        .style("display", "none");
    };
  };


function subset() {
    
    if (subsetdiv==true) {
        subsetdiv = false;
        d3.select("#subset")
        .style("display", "none");
        d3.select("#leftpanel")
        .attr("class", "container");
        d3.select("#btnSelect")
        .style("display", "none");
      //subsetOff();
        return;
    }
    
/*  if (setxdiv==true) {
        setxdiv = false;
        d3.select("#setx")
        .style("display", "none");
    } */

    subsetdiv = true;

    d3.select("#tab2")
    .style("display", "inline");
    
    d3.select("#leftpanel")
    .attr("class", "container expandpanel");
    
    d3.select("#btnSelect")
    .style("display", "inline");

    
    // build arrays from nodes in main
    var dataArray = [];
    var varArray = [];
    for(var j=0; j < nodes.length; j++ ) {
        dataArray.push({varname: nodes[j].name, properties: preprocess[nodes[j].name]});
        varArray.push(nodes[j].name);
    }
    
    for (var i = 0; i < allNodes.length; i++) {
        var j = varArray.indexOf(allNodes[i].name);
        if (j > -1) {
            if (dataArray[j].properties.type === "continuous" & allNodes[i].subsetplot==false) {
                allNodes[i].subsetplot=true;
                density(dataArray[j], allNodes[i]);
            }
            else if (dataArray[j].properties.type === "bar" & allNodes[i].subsetplot==false) {
                allNodes[i].subsetplot=true;
                bars(dataArray[j], allNodes[i]);
            }
        }
        
        else {
            allNodes[i].subsetplot=false;
            var temp = "svg#".concat(allNodes[i].name,"subset");
            d3.select(temp)
            .remove();     //// copy logic for histograms.
        }
        
      // Panels
      //subsetPanel();
        
    }
    
}


function setxOff() {
    
    if (setxdiv==true) {
        setxdiv = false;
        d3.select("#setx")
        .style("display", "none");
        d3.select("#rightpanel")
        .attr("class", "container");
        
    };
};

function setx() {

    if (setxdiv==true) {
        setxdiv = false;
        d3.select("#setx")
        .style("display", "none");
        d3.select("#rightpanel")
        .attr("class", "container");
        return;
    }
    
  /*if (subsetdiv==true) {
        subsetdiv = false;
        d3.select("#subset")
        .style("display", "none");
    }  */
    setxdiv = true;  
    
    d3.select("#setx")
    .style("display", "inline");
    
    d3.select("#rightpanel")
    .attr("class", "container expandpanel");
    
    // build arrays from nodes in main
    var dataArray = [];
    var varArray = [];
    for(var j=0; j < nodes.length; j++ ) {
        dataArray.push({varname: nodes[j].name, properties: preprocess[nodes[j].name]});
        varArray.push(nodes[j].name);
    }
    
    for (var i = 0; i < allNodes.length; i++) {
        var j = varArray.indexOf(allNodes[i].name);
        if (j > -1) {
            if (dataArray[j].properties.type === "continuous" & allNodes[i].setxplot==false) {
                allNodes[i].setxplot=true;
                density(dataArray[j], allNodes[i]);
            }
            else if (dataArray[j].properties.type === "bar" & allNodes[i].setxplot==false) {
                allNodes[i].setxplot=true;
                bars(dataArray[j], allNodes[i]);
            }
        }
        
        else {
            allNodes[i].setxplot=false;
            var temp = "svg#".concat(allNodes[i].name,"setx");
            d3.select(temp)
            .remove();
        }        
    }
}


// function takes a node name, and a color.  a little confusing but the logic is correct #ccc
function setColors (n, c) {
    if(n.strokeWidth=='1') { // adding time, cs, dv to a node with no stroke
        n.strokeWidth = '4';
        n.strokeColor = c;
        n.nodeCol = taggedColor;
        if(dvColor==c) {
            // check if array, if not, make it an array
          //  console.log(Object.prototype.toString.call(zparams.zdv));
            zparams.zdv = Object.prototype.toString.call(zparams.zdv) == "[object Array]" ? zparams.zdv : [];
            zparams.zdv.push(n.name);
        }
        else if(csColor==c) {
            zparams.zcross = Object.prototype.toString.call(zparams.zcross) == "[object Array]" ? zparams.zcross : [];
            zparams.zcross.push(n.name);
        }
        else if(timeColor==c) {
            zparams.ztime = Object.prototype.toString.call(zparams.ztime) == "[object Array]" ? zparams.ztime : [];
            zparams.ztime.push(n.name);
        }
        
        d3.select("#tab1").select("p#".concat(n.name))
        .style('background-color', c);
    }
    else if (n.strokeWidth=='4') {
        if(c==n.strokeColor) { // deselecting time, cs, dv
            n.strokeWidth = '1';
            n.strokeColor = selVarColor;
            n.nodeCol=colors(n.id);
            d3.select("#tab1").select("p#".concat(n.name))
            .style('background-color', selVarColor);
            
            if(dvColor==c) {
                var dvIndex = zparams.zdv.indexOf(n.name);
                if (dvIndex > -1) { zparams.zdv.splice(dvIndex, 1); }
            }
            else if(csColor==c) {
                var csIndex = zparams.zcross.indexOf(n.name);
                if (csIndex > -1) { zparams.zcross.splice(csIndex, 1); }
            }
            else if(timeColor==c) {
                var timeIndex = zparams.ztime.indexOf(n.name);
                if (timeIndex > -1) { zparams.ztime.splice(timeIndex, 1); }
            }
        }
        else { // deselecting time, cs, dv AND changing it to time, cs, dv
            if(dvColor==n.strokeColor) {
                var dvIndex = zparams.zdv.indexOf(n.name);
                if (dvIndex > -1) { zparams.zdv.splice(dvIndex, 1); }
            }
            else if(csColor==n.strokeColor) {
                var csIndex = zparams.zcross.indexOf(n.name);
                if (csIndex > -1) { zparams.zcross.splice(csIndex, 1); }
            }
            else if(timeColor==n.strokeColor) {
                var timeIndex = zparams.ztime.indexOf(n.name);
                if (timeIndex > -1) { zparams.ztime.splice(timeIndex, 1); }
            }
            n.strokeColor = c;
            d3.select("#tab1").select("p#".concat(n.name))
            .style('background-color', c);
            
            if(dvColor==c) {zparams.zdv.push(n.name);}
            else if(csColor==c) {zparams.zcross.push(n.name);}
            else if(timeColor==c) {zparams.ztime.push(n.name);}
        }
    }
}


function borderState () {
    if(zparams.zdv.length>0) {$('#dvButton').css('border-color', dvColor);}
    else {$('#dvButton').css('border-color', '#ccc');}
    if(zparams.zcross.length>0) {$('#csButton').css('border-color', csColor);}
    else {$('#csButton').css('border-color', '#ccc');}
    if(zparams.ztime.length>0) {$('#timeButton').css('border-color', timeColor);}
    else {$('#timeButton').css('border-color', '#ccc');}
}

// small appearance resets, but perhaps this will become a hard reset back to all original allNode values?
function nodeReset (n) {
    n.strokeColor=selVarColor;
    n.strokeWidth="1";
    n.nodeCol=n.baseCol;
}

function subsetSelect(btn) {
    if(document.getElementById('btnD1').getAttribute('class')=="btn active") { // deep clone if Original Data button is active with this sweet hack from SO
        originalNodes=JSON.parse(JSON.stringify(allNodes));
    }
    
    zparams.zhostname = hostname;
    zparams.zfileid = fileid;
    
    zparams.zvars = [];
    
    var subsetEmpty = true;
    
    for(var j =0; j < nodes.length; j++ ) { //populate zvars and zsubset arrays
        zparams.zvars.push(nodes[j].name);
        var temp = findNodeIndex(nodes[j].name);
        zparams.zsubset[j] = allNodes[temp].subsetrange;
        if(zparams.zsubset[j][1] != "") {subsetEmpty=false;} //only need to check one
    }
    
    if(subsetEmpty==true) {
        alert("Warning: No new subset selected.");
        return;
    }
    
    //package the output as JSON
    var subsetstuff = {zhostname:zparams.zhostname, zfileid:zparams.zfileid, zvars:zparams.zvars, zsubset:zparams.zsubset};
    console.log(subsetstuff);
  
    var jsonout = JSON.stringify(subsetstuff);
    var base = "http://0.0.0.0:8000/custom/subsetapp?solaJSON="
    
    urlcall = base.concat(jsonout);
    console.log(urlcall);

    function subsetSelectSuccess(btn,json) {
        console.log(btn);
        subseted=true;
        document.getElementById(btn).style.background="#00CC33";
        document.getElementById('btnD2').setAttribute("class", "btn active");
        document.getElementById('btnD1').setAttribute("class", "btn btn-default");
        
        for(var j=0; j<json.varnames.length; j++) { //eventually these loops might catch up with us
            var temp = findNodeIndex(json.varnames[j]);
            //allNodes[temp].labl=json.labl[j];  vjd: i don't think this changes between full and setset
            allNodes[temp].minimum=json.min[j];
            allNodes[temp].median=json.median[j];
            allNodes[temp].mode=json.mode[j];
            allNodes[temp].mean=json.mean[j];
            allNodes[temp].invalid=json.invalid[j];
            allNodes[temp].valid=json.valid[j];
            allNodes[temp].standardDeviation=json.sd[j];
            allNodes[temp].maximum=json.max[j];
            allNodes[temp].subsetplot=false;
            allNodes[temp].subsethold=allNodes[temp].subsetrange;
            //allNodes[temp].subsetrange=["",""]; subsetrange stays as it was prior to subsetting
            allNodes[temp].setxplot=false;
            allNodes[temp].setxvals=["",""];
        }

        subsetPreprocess=readPreprocess(json.url);
        preprocess=subsetPreprocess;
        
        subsetNodes=JSON.parse(JSON.stringify(allNodes));
        
        resetPlots();
        populatePopover();
    }
    
    
    function subsetSelectFail(btn) {
        document.getElementById(btn).style.background="#CC3333";
    }
    
    makeCorsRequest(urlcall,btn, subsetSelectSuccess, subsetSelectFail);
    
}

function makeTable(){

}


function readPreprocess(url) {

    var p = new Object;
    d3.json(url, function(error, json) {
            if (error) return console.warn(error);
            var jsondata = json;
            
            //copying the object
            for(var key in jsondata) {
            p[key] = jsondata[key];
            }
            });
    return p;
}

function toggleData(btnid) {
    if(!subseted | document.getElementById(btnid).getAttribute('class')=="btn active") {return;}
    
    if(btnid=="btnD1") { //full data
       // allNodes=JSON.parse(JSON.stringify(originalNodes)); //cloning doesn't work, so doing this instead...
        for(var j=0; j<allNodes.length; j++) { //eventually these loops might catch up with us
           // allNodes[j].labl=originalNodes[j].labl;
            allNodes[j].minimum=originalNodes[j].minimum;
            allNodes[j].median=originalNodes[j].median;
            allNodes[j].mode=originalNodes[j].mode;
            allNodes[j].mean=originalNodes[j].mean;
            allNodes[j].invalid=originalNodes[j].invalid;
            allNodes[j].valid=originalNodes[j].valid;
            allNodes[j].standardDeviation=originalNodes[j].standardDeviation;
            allNodes[j].maximum=originalNodes[j].maximum;
            allNodes[j].subsetplot=false;
            allNodes[j].subsetrange=["",""];
            allNodes[j].setxplot=false;
            allNodes[j].setxvals=["",""];
        }
        preprocess=originalPreprocess;
        
        document.getElementById('btnD1').setAttribute("class", "btn active");
        document.getElementById('btnD2').setAttribute("class", "btn btn-default");
    }

    else {  //subset data
     //   allNodes=JSON.parse(JSON.stringify(subsetNodes));
        for(var j=0; j<allNodes.length; j++) { //eventually these loops might catch up with us
           // allNodes[j].labl=subsetNodes[j].labl;
            allNodes[j].minimum=subsetNodes[j].minimum;
            allNodes[j].median=subsetNodes[j].median;
            allNodes[j].mode=subsetNodes[j].mode;
            allNodes[j].mean=subsetNodes[j].mean;
            allNodes[j].invalid=subsetNodes[j].invalid;
            allNodes[j].valid=subsetNodes[j].valid;
            allNodes[j].standardDeviation=subsetNodes[j].standardDeviation;
            allNodes[j].maximum=subsetNodes[j].maximum;
            allNodes[j].subsetplot=false;
            allNodes[j].subsetrange=allNodes[j].subsethold;
            allNodes[j].setxplot=false;
            allNodes[j].setxvals=["",""];
        }
        
        preprocess=subsetPreprocess;
        
        document.getElementById('btnD2').setAttribute("class", "btn active");
        document.getElementById('btnD1').setAttribute("class", "btn btn-default");
    }
    
    resetPlots();
    populatePopover();
}


function resultsTable() {
    //  if(estimated==false) {console.log("not estimated yet"); return;}
    if(resultsViewer==true) {
        resultsViewer=false;
        
        d3.select("#resultsView")
        .style("display", "none");
        
        return;
    }
    
   // console.log($('#btnResultsTable').position().left);
    
    resultsViewer=true;
    d3.select("#resultsView")
    .style("display", "inline");
    
    console.log("here");
    return;
}




function resetPlots() {
    // collapse subset or setx divs and reset all plots
    d3.select("#tab2")
    .style("display", "none")
    .selectAll("svg")
    .remove();
    
    d3.select("#setx")
    .style("display", "none")
    .selectAll("svg")
    .remove();
    
    d3.select("#rightpanel")
    .attr("class", "container");
    
    d3.select("#leftpanel")
    .attr("class", "container");
    
    d3.select("#btnSelect")
    .style("display", "none");
    
    lefttab="tab1";
    tabLeft(lefttab);
}
