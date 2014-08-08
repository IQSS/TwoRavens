//////////
// Globals

// set up SVG for D3

//var leftpanel = d3.select("body")
//.append('svg');

// hostname default - the app will use it to obtain the variable metadata
// (ddi) and pre-processed data info if the file id is supplied as an 
// argument (for ex., gui.html?dfId=17), but hostname isn't. 
// Edit it to suit your installation. 
// (NOTE that if the file id isn't supplied, the app will default to the 
// local files specified below!)
// Going forward, we probably shouldn't be relying on this default being
// defined here; dataverse should always supply the hostname, when 
// creating URLs for the app; like 
// .../gui.html?dfId=17&hostname=dataverse-demo.hmdc.harvard.edu
// -- L.A. 
if (!hostname) {
       hostname="localhost:8080";
}

// base URL for the R apps: 
var rappURL = "http://0.0.0.0:8000/custom/";

// space index
var myspace = 0;
var svg = d3.select("#main.left div.carousel-inner").attr('id', 'innercarousel')
.append('div').attr('class', 'item').attr('id', 'm0').append('svg').attr('id', 'whitespace');

// collapsable user log
$('#collapseLog').on('shown.bs.collapse', function () {
                     d3.select("#collapseLog div.panel-body").selectAll("p")
                     .data(logArray)
                     .enter()
                     .append("p")
                     .text(function(d){
                           return d;
                           });
                     //$("#logicon").removeClass("glyphicon-chevron-up").addClass("glyphicon-chevron-down");
                     });

$('#collapseLog').on('hidden.bs.collapse', function () {
                     d3.select("#collapseLog div.panel-body").selectAll("p")
                     .remove();
                     //$("#logicon").removeClass("glyphicon-chevron-down").addClass("glyphicon-chevron-up");
                     });
var logArray = [];

           
//.attr('width', width)
//.attr('height', height);
var tempWidth = d3.select("#main.left").style("width")
var width = tempWidth.substring(0,(tempWidth.length-2));

var tempHeight = d3.select("#main.left").style("height")
var height = tempHeight.substring(0,(tempHeight.length-2));

var forcetoggle=["true"];
var estimated=false;
var subseted=false; //use this to tell users they have subseted the data
var resultsViewer=false;
var estimateLadda = Ladda.create(document.getElementById("btnEstimate"));
var selectLadda = Ladda.create(document.getElementById("btnSelect"));
var rightClickLast = false;

// text for the about box
// note that .textContent is the new way to write text to a div
$('#about div.panel-body').text('The Norse god Odin had two talking ravens as advisors, who would fly out into the world and report back all they observed.  In the Norse, their names were "Thought" and "Memory".  In our coming release, our thought-raven automatically advises on statistical model selection, while our memory-raven accumulates previous statistical models from Dataverse, to provide cummulative guidance and meta-analysis.'); //This is the first public release of a new, interactive Web application to explore data, view descriptive statistics, and estimate statistical models.";



// this is the initial color scale that is used to establish the initial colors of the nodes.  allNodes.push() below establishes a field for the master node array allNodes called "nodeCol" and assigns a color from this scale to that field.  everything there after should refer to the nodeCol and not the color scale, this enables us to update colors and pass the variable type to R based on its coloring
var colors = d3.scale.category20();

var colorTime=false;
var timeColor = '#2d6ca2';

var colorCS=false;
var csColor = '#419641';

var depVar=false;
var dvColor = '#28a4c9';

var nomColor = '#ff6600';

var subsetdiv=false;
var setxdiv=false;


var varColor = '#f0f8ff';   //d3.rgb("aliceblue");
var selVarColor = '#fa8072';    //d3.rgb("salmon");
var taggedColor = '#f5f5f5';    //d3.rgb("whitesmoke");

var lefttab = "tab1"; //global for current tab in left panel

// Zelig models, eventually this could be a separate xml file that is imported
//var zmods = ["OLS", "Logit"];
var mods = new Object;
d3.json("data/zeligmodels2.json", function(error, json) {
        if (error) return console.warn(error);
        var jsondata = json;
        console.log("json: ", jsondata);
        jsondata.zeligmodels.forEach(function(d) {
       // mods.push(d["-name"]);
        mods[d["-name"]] = d["description"];
                                    });
        });
var zmods = mods;

var zparams = { zdata:[], zedges:[], ztime:[], znom:[], zcross:[], zmodel:"", zvars:[], zdv:[], zhostname:"", zfileid:"", zsubset:[], zsetx:[], ztransformed:[], ztransFrom:[], ztransFunc:[] };


// Pre-processed data:
var pURL = "";
if (fileid) {
    // file id supplied; read in pre-processed data from dvn
    pURL = "http://"+hostname+"/api/access/datafile/"+fileid+"?format=prep";
} else {
    // no id supplied; use one of the sample data files distributed with the 
    // app in the "data" directory:
    //pURL = "data/preprocess2429360.txt";   // This is the Strezhnev Voeten JSON data
    pURL = "data/fearonLaitin.txt";     // This is the Fearon Laitin JSON data
}

var preprocess = readPreprocess(pURL);

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
    .endAngle(2.2);

var arc3 = d3.svg.arc()
    .innerRadius(allR + 5)
    .outerRadius(allR + 20)
    .startAngle(2.3)
    .endAngle(3.3);

var arc4 = d3.svg.arc()
    .innerRadius(allR + 5)
    .outerRadius(allR + 20)
    .startAngle(4.3)
    .endAngle(5.3);



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
var transformVar = "";
var summaryHold = false;
var selInteract = false;

// transformation toolbar options
var transformList = ["log(d)", "exp(d)", "d^2", "sqrt(d)", "interact(d,e)"];

// arry of objects containing allNode, zparams, transform vars
var spaces = [];
var trans = []; //var list for each space contain variables in original data plus trans in that space


// load data from DDI just javascript
//var xmlDoc=loadXMLDoc("data/strezhnev_voeten_2013.xml"); // Path to the XML file;
//console.log(xmlDoc);

//var vars = xmlDoc.getElementsByTagName("var");
//console.log(vars); // each variable in the data
//console.log(vars.length); // 109 of them

// read DDI metadata with d3:
var metadataurl = "";
if (fileid) {
    // file id supplied; read the DDI fragment from the DVN: 
    metadataurl="http://"+hostname+"/api/meta/datafile/"+fileid;
} else {
    // no file id supplied; use one of the sample DDIs that come with 
    // the app, in the data directory: 
    metadataurl="data/fearonLaitin.xml"; // This is Fearon Laitin
    //metadataurl="data/strezhnev_voeten_2013.xml";   // This is Strezhnev Voeten
    //metadataurl="data/19.xml"; // Fearon from DVN Demo
    //metadataurl="data/76.xml"; // Collier from DVN Demo
    //metadataurl="data/79.xml"; // two vars from DVN Demo
    //metadataurl="data/000.xml"; // one var in metadata
    //metadataurl="data/0000.xml"; // zero vars in metadata
}

d3.xml(metadataurl, "application/xml", function(xml) {
      var vars = xml.documentElement.getElementsByTagName("var");
      var temp = xml.documentElement.getElementsByTagName("fileName");
      zparams.zdata = temp[0].childNodes[0].nodeValue;
  //    console.log(temp[0].childNodes[0].nodeValue);
  //    console.log(temp);
  //    console.log(zparams.zdata);


    // dataset name trimmed to 12 chars
       var dataname = zparams.zdata.replace( /\.(.*)/, "") ;  // regular expression to drop any file extension
      // Put dataset name, from meta-data, into top panel
      d3.select("#datasetName").selectAll("h4")
      .html(dataname);


      // temporary values for hold that correspond to histogram bins
      hold = [0, 0, 0, 0, 0, 0, 0];
      var myvalues = [0, 0, 0, 0, 0];

    for (i=0;i<vars.length;i++) {
       
        var sumStats = new Object;
        var varStats = [];
        valueKey[i] = vars[i].attributes.name.nodeValue;
       
       if(vars[i].getElementsByTagName("labl").length === 0) {lablArray[i]="no label";}
       else {lablArray[i] = vars[i].getElementsByTagName("labl")[0].childNodes[0].nodeValue;}
       
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
       allNodes.push({id:i, reflexive: false, "name": valueKey[i], "labl": lablArray[i], data: [5,15,20,0,5,15,20], count: hold, "nodeCol":colors(i), "baseCol":colors(i), "strokeColor":selVarColor, "strokeWidth":"1", "varLevel":vars[i].attributes.intrvl.nodeValue, "minimum":sumStats.min, "median":sumStats.medn, "standardDeviation":sumStats.stdev, "mode":sumStats.mode, "valid":sumStats.vald, "mean":sumStats.mean, "maximum":sumStats.max, "invalid":sumStats.invd, "subsetplot":false, "subsetrange":["", ""],"setxplot":false, "subsethold":["", ""], "setxvals":["", ""], "transformed":false, "transFrom":"", "transFunc":""});
       };
 
       
       d3.select("#models")
       .style('height', 2000)
       .style('overfill', 'scroll');
     
       var modellist = Object.keys(zmods);
       
       d3.select("#models").selectAll("p")
       .data(modellist)
       .enter()
       .append("p")
       .attr("id", function(d){
           return "_model_".concat(d);
           })
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
     
       scaffolding();
       layout();
       
       });

// to be called after valueKey (array of variable names) is updated or initialized
function scaffolding(v) {

    if(typeof v !== "undefined") {
        
        d3.select("#tab1")
        .data(v)
        .append("p")
        .attr("id",function(){
              return v[0].replace(/\W/g, "_");
              })
        .text(v[0])
        .style('background-color', hexToRgba(selVarColor))
        .attr("data-container", "body")
        .attr("data-toggle", "popover")
        .attr("data-trigger", "hover")
        .attr("data-placement", "right")
        .attr("data-html", "true")
        .attr("onmouseover", "$(this).popover('toggle');")
        .attr("onmouseout", "$(this).popover('toggle');")
        .attr("data-original-title", "Summary Statistics")
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
                   return hexToRgba(selVarColor);
                   }
                   else { // dropping a variable
                   if(findNode(myText).subsethold[0] !== "") {return hexToRgba(selVarColor);} //can't drop one with subsethold[0] value
                   
                   nodes.splice(findNode(myText)["index"], 1);
                   spliceLinksForNode(findNode(myText));
                   
                   if(mySC==dvColor) {
                   var dvIndex = zparams.zdv.indexOf(myText);
                   if (dvIndex > -1) { zparams.zdv.splice(dvIndex, 1); }
                   //zparams.zdv="";
                   }
                   else if(mySC==csColor) {
                   var csIndex = zparams.zcross.indexOf(myText);
                   if (csIndex > -1) { zparams.zcross.splice(csIndex, 1); }
                   }
                   else if(mySC==timeColor) {
                   var timeIndex = zparams.ztime.indexOf(myText);
                   if (timeIndex > -1) { zparams.ztime.splice(dvIndex, 1); }
                   }
                   else if(mySC==nomColor) {
                   var nomIndex = zparams.znom.indexOf(myText);
                   if (nomIndex > -1) { zparams.znom.splice(dvIndex, 1); }
                   }
                   
                   nodeReset(allNodes[findNodeIndex(myText)]);
                   borderState();
                   return varColor;
                   }
                   });
            fakeClick();
            });
        populatePopover(); // pipes in the summary stats
        
        // drop down menu for tranformation toolbar
        d3.select("#transSel")
        .data(v)
        .append("option")
        .text(function(d) {return d; });
        
        return;
    }
 
    d3.select("#transformations")
    .append("input")
    .attr("id", "tInput")
    .attr("class", "form-control")
    .attr("type", "text")
    .attr("value", "R call: func(var)");

    // the variable dropdown
    d3.select("#transformations")
    .append("ul")
    .attr("id", "transSel")
    .style("display", "none")
    .style("background-color", varColor)
    .selectAll('li')
    .data(["a", "b"]) //set to variables in model space as they're added
    .enter()
    .append("li")
    .text(function(d) {return d; });
    
    // the function dropdown
    d3.select("#transformations")
    .append("ul")
    .attr("id", "transList")
    .style("display", "none")
    .style("background-color", varColor)
    .selectAll('li')
    .data(transformList)
    .enter()
    .append("li")
    .text(function(d) {return d; });
    
    //jquery does this well
    $('#tInput').click(function() {
        var t = document.getElementById('transSel').style.display;
        if(t !== "none") { // if variable list is displayed when input is clicked...
            $('#transSel').fadeOut(100);
            return false;
        }
        var t1 = document.getElementById('transList').style.display;
        if(t1 !== "none") { // if function list is displayed when input is clicked...
            $('#transList').fadeOut(100);
            return false;
        }
        
        // highlight the text
        $(this).select();
                       
        var pos = $('#tInput').offset();
        pos.top += $('#tInput').width();
        $('#transSel').fadeIn(100);
        return false;
        });
    
    $('#tInput').keyup(function(event) {
                       var t = document.getElementById('transSel').style.display;
                       var t1 = document.getElementById('transList').style.display;
                       
                       if(t !== "none") {
                            $('#transSel').fadeOut(100);
                       } else if(t1 !== "none") {
                            $('#transList').fadeOut(100);
                       }
                       
                       if(event.keyCode == 13){ // keyup on "Enter"
                            var n = $('#tInput').val();
                            var t = transParse(n=n);
                            if(t === null) {return;}
               //        console.log(t);
                 //      console.log(t.slice(0, t.length-1));
                   //    console.log(t[t.length-1]);
                            transform(n=t.slice(0, t.length-1), t=t[t.length-1]);
                       }
                    });
    
    $('#transList li').click(function(event) {
                             var tvar =  $('#tInput').val();
                             
                             // if interact is selected, show variable list again
                             if($(this).text() === "interact(d,e)") {
                                $('#tInput').val(tvar.concat('*'));
                                selInteract = true;
                                $(this).parent().fadeOut(100);
                                $('#transSel').fadeIn(100);
                                event.stopPropagation();
                                return;
                             }
                             
                            var tfunc = $(this).text().replace("d", "_transvar0");
                             var tcall = $(this).text().replace("d", tvar);
                             $('#tInput').val(tcall);
                            $(this).parent().fadeOut(100);
                             event.stopPropagation();
                             transform(n=tvar, t=tfunc);
                             });
                            
  
    d3.select("#tab1").selectAll("p")
    .data(valueKey)
    .enter()
    .append("p")
    .attr("id",function(d){
          return d.replace(/\W/g, "_"); // replace non-alphanumerics for selection purposes
          }) // perhapse ensure this id is unique by adding '_' to the front?
    .text(function(d){return d;})
    .style('background-color',function(d) {
           if(findNodeIndex(d) > 2) {return varColor;}
           else {return hexToRgba(selVarColor);}
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
    
}


function layout(v) {
    var myValues=[];
    nodes = [];
    links = [];
    
    
    if(v === "add" | v === "move") {
        d3.select("#tab1").selectAll("p").style('background-color',varColor);
        for(var j =0; j < zparams.zvars.length; j++ ) {
            nodes.push(allNodes[findNodeIndex(zparams.zvars[j])]);
            var selectMe = zparams.zvars[j].replace(/\W/g, "_");
            selectMe = "#".concat(selectMe);
            d3.select(selectMe).style('background-color',function(){
                                      return hexToRgba(nodes[j].strokeColor);
                                      });
        }
  
        for(var j=0; j < zparams.zedges.length; j++) {
            var mysrc = nodeIndex(zparams.zedges[j][0]);
            var mytgt = nodeIndex(zparams.zedges[j][1]);
            links.push({source:nodes[mysrc], target:nodes[mytgt], left:false, right:true});
        }
    }
    else {
        if(allNodes.length > 2) {
            nodes = [allNodes[0], allNodes[1], allNodes[2]];
            links = [
                {source: nodes[1], target: nodes[0], left: false, right: true },
                {source: nodes[0], target: nodes[2], left: false, right: true }
                ];
        }
        else if(allNodes.length === 2) {
            nodes = [allNodes[0], allNodes[1]];
            links = [{source: nodes[1], target: nodes[0], left: false, right: true }];
        }
        else if(allNodes.length === 1){
            nodes = [allNodes[0]];
        }
        else {
            alert("There are zero variables in the metadata.");
            return;
        }
    }
   
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
                return hexToRgba(selVarColor);
               }
               else { // dropping a variable
                if(findNode(myText).subsethold[0] !== "") {return hexToRgba(selVarColor);} //can't drop one with subsethold[0] value
               
                    nodes.splice(findNode(myText)["index"], 1);
                    spliceLinksForNode(findNode(myText));
               
                if(mySC==dvColor) {
                    var dvIndex = zparams.zdv.indexOf(myText);
                    if (dvIndex > -1) { zparams.zdv.splice(dvIndex, 1); }
                    //zparams.zdv="";
                }
                else if(mySC==csColor) {
                    var csIndex = zparams.zcross.indexOf(myText);
                    if (csIndex > -1) { zparams.zcross.splice(csIndex, 1); }
                }
                else if(mySC==timeColor) {
                    var timeIndex = zparams.ztime.indexOf(myText);
                    if (timeIndex > -1) { zparams.ztime.splice(timeIndex, 1); }
                }
               else if(mySC==nomColor) {
                    var nomIndex = zparams.znom.indexOf(myText);
                    if (nomIndex > -1) { zparams.znom.splice(dvIndex, 1); }
               }

                nodeReset(allNodes[findNodeIndex(myText)]);
                borderState();
               legend();
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
                    return hexToRgba(selVarColor);
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
    
        circle.call(force.drag);
        if(forcetoggle[0]==="true")
        {
            force.gravity(0.1);
            force.charge(-800);
            force.linkStrength(1);
          //  force.resume();
            
          //  circle
          //  .on('mousedown.drag', null)
          //  .on('touchstart.drag', null);
        }
        else
        {
            force.gravity(0);
            force.charge(0);
            force.linkStrength(0);
            //force.stop();
          //  force.resume();
        }
        force.resume();
        
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
        .on('mousedown', function(d) { // do we ever need to select a link? make it delete..
            var obj1 = JSON.stringify(d);
            for(var j =0; j < links.length; j++) {
                if(obj1 === JSON.stringify(links[j])) {
                    links.splice(j,1);
                }
            }
        /*    if(d3.event.ctrlKey) return;
            
            // select link
            mousedown_link = d;
            if(mousedown_link === selected_link) selected_link = null;
            else selected_link = mousedown_link;
            selected_node = null;
            restart(); */
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
        .attr("id", function(d){
              return "timeArc".concat(d.id);
              })
        .style("fill", timeColor)
        .attr("fill-opacity", 0)
        .on('mouseover', function(d){
            d3.select(this).transition()  .attr("fill-opacity", .3)
            .delay(0)
            .duration(100);   //.attr('transform', 'scale(2)');
            d3.select("#timeText".concat(d.id)).transition()
            .attr("fill-opacity", .9)
            .delay(0)
            .duration(100);
            })
        .on('mouseout', function(d){
            d3.select(this).transition()
            .attr("fill-opacity", 0)
            .delay(100)
            .duration(500);
            d3.select("#timeText".concat(d.id)).transition()
            .attr("fill-opacity", 0)
            .delay(100)
            .duration(500);
            })
        .on('click', function(d){
            setColors(d, timeColor);
            legend(timeColor);
            restart();
            });
        g.append("text")
        .attr("id", function(d){
              return "timeText".concat(d.id);
              })
        .attr("x", 6)
        .attr("dy", 11.5)
        .attr("fill-opacity", 0)
        .append("textPath")
        .attr("xlink:href", function(d){
              return "#timeArc".concat(d.id);
              })
        .text("Time");
        

        
        g.append("path")
        .attr("id", function(d){
              return "csArc".concat(d.id);
              })
        .attr("d", arc2)
        .style("fill", csColor)
        .attr("fill-opacity", 0)
        .on('mouseover', function(d){
            d3.select(this).transition()
            .attr("fill-opacity", .3)
            .delay(0)
            .duration(100);
            d3.select("#csText".concat(d.id)).transition()
            .attr("fill-opacity", .9)
            .delay(0)
            .duration(100);
            })
        .on('mouseout', function(d){
            d3.select(this).transition()
            .attr("fill-opacity", 0)
            .delay(100)
            .duration(500);
            d3.select("#csText".concat(d.id)).transition()
            .attr("fill-opacity", 0)
            .delay(100)
            .duration(500);
            })
        .on('click', function(d){
            setColors(d, csColor);
            legend(csColor);
            restart();
            });
        g.append("text")
        .attr("id", function(d){
              return "csText".concat(d.id);
              })
        .attr("x", 6)
        .attr("dy", 11.5)
        .attr("fill-opacity", 0)
        .append("textPath")
        .attr("xlink:href", function(d){
              return "#csArc".concat(d.id);
              })
        .text("Cross Sec");

        
        g.append("path")
        .attr("id", function(d){
              return "dvArc".concat(d.id);
              })
        .attr("d", arc3)
        .style("fill", dvColor) //function(d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
        .attr("fill-opacity", 0)
        .on('mouseover', function(d){
            d3.select(this).transition()  .attr("fill-opacity", .3)
            .delay(0)
            .duration(100);
            d3.select("#dvText".concat(d.id)).transition()  .attr("fill-opacity", .9)
            .delay(0)
            .duration(100);
            })
        .on('mouseout', function(d){
            d3.select(this).transition()  .attr("fill-opacity", 0)
            .delay(100)
            .duration(500);
            d3.select("#dvText".concat(d.id)).transition()  .attr("fill-opacity", 0)
            .delay(100)
            .duration(500);
            })
        .on('click', function(d){
            setColors(d, dvColor);
            legend(dvColor);
            restart();
            });
        g.append("text")
        .attr("id", function(d){
              return "dvText".concat(d.id);
              })
        .attr("x", 6)
        .attr("dy", 11.5)
        .attr("fill-opacity", 0)
        .append("textPath")
        .attr("xlink:href", function(d){
              return "#dvArc".concat(d.id);
              })
        .text("Dep Var");

       g.append("path")
        .attr("id", function(d){
              return "nomArc".concat(d.id);
              })
        .attr("d", arc4)
        .style("fill", nomColor) //function(d) { return (d === selected_node) ? d3.rgb(colors(d.id)).brighter().toString() : colors(d.id); })
        .attr("fill-opacity", 0)
        .on('mouseover', function(d){
            d3.select(this).transition()  .attr("fill-opacity", .3)
            .delay(0)
            .duration(100);
            d3.select("#nomText".concat(d.id)).transition()  .attr("fill-opacity", .9)
            .delay(0)
            .duration(100);
            })
        .on('mouseout', function(d){
            d3.select(this).transition()  .attr("fill-opacity", 0)
            .delay(100)
            .duration(500);
            d3.select("#nomText".concat(d.id)).transition()  .attr("fill-opacity", 0)
            .delay(100)
            .duration(500);
            })
        .on('click', function(d){
            setColors(d, nomColor);
            legend(nomColor);
            restart();
            });
        g.append("text")
        .attr("id", function(d){
              return "nomText".concat(d.id);
              })
        .attr("x", 6)
        .attr("dy", 11.5)
        .attr("fill-opacity", 0)
        .append("textPath")
        .attr("xlink:href", function(d){
              return "#nomArc".concat(d.id);
              })
        .text("Nominal");

        
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
        .style('pointer-events', 'inherit')
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
  //      .on('mousedown', function(d) {
   //         })
        .on('dblclick', function(d){
            d3.event.stopPropagation(); // stop click from bubbling
            summaryHold = true;
//            document.getElementById('transformations').setAttribute("style", "display:block");
/*
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
 */
            })
        .on('contextmenu', function(d) { // right click on node
            d3.event.preventDefault();
            d3.event.stopPropagation(); // stop right click from bubbling
            rightClickLast=true;
            
            mousedown_node = d;
            if(mousedown_node === selected_node) selected_node = null;
            else selected_node = mousedown_node;
            selected_link = null;
            
            // reposition drag line
            drag_line
            .style('marker-end', 'url(#end-arrow)')
            .classed('hidden', false)
            .attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + mousedown_node.x + ',' + mousedown_node.y);
            
            svg.on('mousemove', mousemove);
            restart();
            })
        .on('mouseup', function(d) {
            d3.event.stopPropagation(); // stop mouseup from bubbling
            
            if(rightClickLast) {
                rightClickLast=false;
                return;
            }
           
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
            svg.on('mousemove', null);
            
            resetMouseVars();
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
            document.getElementById('transformations').setAttribute("style", "display:block");
            var select = document.getElementById("transSel");
            select.selectedIndex = d.id;
            transformVar = valueKey[d.id];
          
            d3.select("#dvArc".concat(d.id)).transition()  .attr("fill-opacity", .1)
            .delay(0)
            .duration(100);
            d3.select("#dvText".concat(d.id)).transition()  .attr("fill-opacity", .5)
            .delay(0)
            .duration(100);
            d3.select("#nomArc".concat(d.id)).transition()  .attr("fill-opacity", .1)
            .delay(0)
            .duration(100);
            d3.select("#nomText".concat(d.id)).transition()  .attr("fill-opacity", .5)
            .delay(0)
            .duration(100);
            d3.select("#csArc".concat(d.id)).transition()  .attr("fill-opacity", .1)
            .delay(0)
            .duration(100);
            d3.select("#csText".concat(d.id)).transition()  .attr("fill-opacity", .5)
            .delay(0)
            .duration(100);
            d3.select("#timeArc".concat(d.id)).transition()  .attr("fill-opacity", .1)
            .delay(0)
            .duration(100);
            d3.select("#timeText".concat(d.id)).transition()  .attr("fill-opacity", .5)
            .delay(0)
            .duration(100);
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
        .on("mouseout", function(d) {
            if(summaryHold===false) { tabLeft(lefttab); }

            d3.select("#csArc".concat(d.id)).transition()
            .attr("fill-opacity", 0)
            .delay(100)
            .duration(500);
            d3.select("#csText".concat(d.id)).transition()
            .attr("fill-opacity", 0)
            .delay(100)
            .duration(500);
            d3.select("#timeArc".concat(d.id)).transition()
            .attr("fill-opacity", 0)
            .delay(100)
            .duration(500);
            d3.select("#timeText".concat(d.id)).transition()
            .attr("fill-opacity", 0)
            .delay(100)
            .duration(500);
            d3.select("#dvArc".concat(d.id)).transition()
            .attr("fill-opacity", 0)
            .delay(100)
            .duration(500);
            d3.select("#dvText".concat(d.id)).transition()
            .attr("fill-opacity", 0)
            .delay(100)
            .duration(500);
            d3.select("#nomArc".concat(d.id)).transition()
            .attr("fill-opacity", 0)
            .delay(100)
            .duration(500);
            d3.select("#nomText".concat(d.id)).transition()
            .attr("fill-opacity", 0)
            .delay(100)
            .duration(500);


            //Remove the tooltip
          //  d3.select("#tooltip").remove();
          //  d3.select("#tooltip").style("display", "none");
            
            });
        
        // populating transformation dropdown
        var t = [];
        for(var j =0; j < nodes.length; j++ ) {
            t.push(nodes[j].name);
        }
        
        // the transformation variable list is silently updated as pebbles are added/removed
        d3.select("#transSel")
        .selectAll('li')
        .remove();
        
        d3.select("#transSel")
        .selectAll('li')
        .data(t) //set to variables in model space as they're added
        .enter()
        .append("li")
        .text(function(d) {return d; });
        
        $('#transSel li').click(function(event) {
                                
                                // if 'interaction' is the selected function, don't show the function list again
                                if(selInteract === true) {
                                    var n = $('#tInput').val().concat($(this).text());
                                    $('#tInput').val(n);
                                    event.stopPropagation();
                                    var t = transParse(n=n);
                                    if(t === null) {return;}
                                    $(this).parent().fadeOut(100);
                                    transform(n=t.slice(0, t.length-1), t=t[t.length-1]);
                                    return;
                                }

                                $('#tInput').val($(this).text());
                                $(this).parent().fadeOut(100);
                                $('#transList').fadeIn(100);
                                event.stopPropagation();
                                });

        // remove old nodes
        circle.exit().remove();
        force.start();
        
    }  //end restart function
    
    
    function mousedown(d) {
        // prevent I-bar on drag
        d3.event.preventDefault();
        
        // because :active only works in WebKit?
        svg.classed('active', true);
        
        if(d3.event.ctrlKey || mousedown_node || mousedown_link) {
            return;
        }
        
        restart();
    }
    
    function mousemove(d) {
        if(!mousedown_node) return;
        
        // update drag line
        drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);
    }
    
    // why not move all the code from pebble.on(mouseup) here?  it seems like we are doing the same thing in two places...
    function mouseup(d) {
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
    
    // app starts here
   
    svg.attr('id', function(){
             return "whitespace".concat(myspace);
             })
    .on('mousedown', function() {
           mousedown(this);
           })
    .on('mouseup', function() {
        mouseup(this);
        });
    svg.append('div').attr('id', 'fakeTarget');
    
    d3.select(window)
    .on('click',function(){  //NOTE: all clicks will bubble here unless event.stopPropagation()
        $('#transList').fadeOut(100);
        $('#transSel').fadeOut(100);
        });
    
    restart(); // this is the call the restart that initializes the force.layout()
    fakeClick();
} // end layout



var findNodeIndex = function(nodeName) {
    for (var i in allNodes) {
        if(allNodes[i]["name"] === nodeName) {return allNodes[i]["id"];}
    };
}

var nodeIndex = function(nodeName) {
    for (var i in nodes) {
        if(nodes[i]["name"] === nodeName) {return i;}
    }
}

var findNode = function(nodeName) {
    for (var i in allNodes) {if (allNodes[i]["name"] === nodeName) return allNodes[i]};
}


// function called by force button
function forceSwitch() {
    if(forcetoggle[0]==="true") { forcetoggle = ["false"];}
    else {forcetoggle = ["true"]}

    if(forcetoggle[0]==="false") {
        document.getElementById('btnForce').setAttribute("class", "btn active");
    }
    else {
        document.getElementById('btnForce').setAttribute("class", "btn btn-default");
        fakeClick();
    }
}


function spliceLinksForNode(node) {
    var toSplice = links.filter(function(l) {
                                return (l.source === node || l.target === node);
                                });
    toSplice.map(function(l) {
                 links.splice(links.indexOf(l), 1);
                 });
}

function zPop() {
    zparams.zhostname = hostname;
    zparams.zfileid = fileid;
    
    zparams.zedges = [];
    zparams.zvars = [];
    
    for(var j =0; j < nodes.length; j++ ) { //populate zvars array
        zparams.zvars.push(nodes[j].name);
        var temp = findNodeIndex(nodes[j].name);
        
        zparams.zsetx[j] = allNodes[temp].setxvals;
        zparams.zsubset[j] = allNodes[temp].subsetrange;
        zparams.ztransformed[j] = allNodes[temp].transformed;
        zparams.ztransFrom[j] = allNodes[temp].transFrom;
        zparams.ztransFunc[j] = allNodes[temp].transFunc;
    }
    
    for(var j =0; j < links.length; j++ ) { //populate zedges array
        var srctgt = [];
        //correct the source target ordering for Zelig
        if(links[j].left===false) {
            srctgt = [links[j].source.name, links[j].target.name];
        }
        else {
            srctgt = [links[j].target.name, links[j].source.name];
        }
        zparams.zedges.push(srctgt);
    }
}

function estimate(btn) {
    zPop();
    // write links to file & run R CMD

   // var property=document.getElementById(btn);
  //  property.style.backgroundColor="#66CCFF";
    
    
    //package the zparams object as JSON
    var jsonout = JSON.stringify(zparams);
    var base = rappURL+"zeligapp?solaJSON="

    //var test = "{\"x\":[1,2,4,7],\"y\":[3,5,7,9]}";
    //urlcall = base.concat(test);
    urlcall = base.concat(jsonout);
    console.log("urlcall out: ", urlcall);
    
    
    function estimateSuccess(btn,json) {
        estimateLadda.stop();  // stop spinner
        console.log("json in: ", json);
      var property=document.getElementById(btn);
      estimated=true;
      //  property.setAttribute("class", "progress progress-striped active");
      property.style.backgroundColor="#00CC33";
        
        var myparent = document.getElementById("results");
        myparent.removeChild(document.getElementById("resultsHolder"));
        
        // is this righttab necessary?  it's in the html when Results clicked...
        //righttab='results';
        //setxOff();
        //tabRight('btnResults');
     
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
        logArray.push("estimate: ".concat(rCall[0]));
        showLog();
        
         
        // write the results table
        var resultsArray = [];
        for (var key in json.sumInfo) {
            if(key=="colnames") {continue;}
            
            var obj = json.sumInfo[key];
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
        
        var table = d3.select("#results")
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
        .text(function(d){
              var myNum = Number(d);
              if(isNaN(myNum)) { return d;}
              return myNum.toPrecision(3);
              })
        .on("mouseover", function(){d3.select(this).style("background-color", "aliceblue")}) // for no discernable reason
        .on("mouseout", function(){d3.select(this).style("background-color", "#F9F9F9")}) ;  //(but maybe we'll think of one)
        

    }
    
    function estimateFail(btn) {
        estimateLadda.stop();  // stop spinner
      estimated=true;
        //var property=document.getElementById(btn);
      //property.style.backgroundColor="#CC3333";
    }

    estimateLadda.start();  // start spinner
    makeCorsRequest(urlcall,btn, estimateSuccess, estimateFail);

    
}

function transParse(n) {
    var out = [];
    var t = n;
    var k = 0;
    var subMe = "_transvar".concat(k);
    
    for(var i in valueKey) {
        var m = n.match(valueKey[i]);
        if(m !== null) {
            t = t.replace(m, subMe); //something that'll never be a variable name
            k = k+1;
            subMe = "_transvar".concat(k);
            //return [n=m[0], t=t];
            out.push(m[0]);
        }
    }
    if(out.length > 0) {
        out.push(t);
        return(out);
    }
    
    if(m===null) {
        alert("No variable name found. Perhaps check your spelling?");
        return null;
    }
}

function transform(n,t) {
    t = t.replace("+", "_plus_"); // there is a bug in R's json parse
    
    console.log(n);
    console.log(t);
    
    var btn = document.getElementById('btnEstimate');
    
    //package the output as JSON
    var transformstuff = {zhostname:hostname, zfileid:fileid, zvars:n, transform:t};
    var jsonout = JSON.stringify(transformstuff);
    var base = rappURL+"transformapp?solaJSON="
    
    urlcall = base.concat(jsonout);
    console.log("urlcall out: ", urlcall);
    
    
    function transformSuccess(btn, json) {
        estimateLadda.stop();
        console.log("json in: ", json);
        
        var rCall = [];
        rCall[0] = json.call;
        var newVar = rCall[0][0];
        trans.push(newVar);
        logArray.push("transform: ".concat(rCall[0]));
        showLog();
        
        // update the log for each space. note: if spaces is empty, this is not a problem.
        for(var i = 0; i < spaces.length; i++) {
            spaces[i].logArray.push("transform: ".concat(rCall[0]));
        }
        
        // add transformed variable to the current space
        var i = allNodes.length;
        allNodes.push({id:i, reflexive: false, "name": rCall[0][0], "labl": "transformlabel", data: [5,15,20,0,5,15,20], count: hold, "nodeCol":colors(i), "baseCol":colors(i), "strokeColor":selVarColor, "strokeWidth":"1", "varLevel":"level", "minimum":json.sumStats.min[0], "median":json.sumStats.median[0], "standardDeviation":json.sumStats.sd[0], "mode":json.sumStats.mode[0], "valid":json.sumStats.valid[0], "mean":json.sumStats.mean[0], "maximum":json.sumStats.max[0], "invalid":json.sumStats.invalid[0], "subsetplot":false, "subsetrange":["", ""],"setxplot":false, "subsethold":["", ""], "setxvals":["", ""], "transformed":true, "transFrom":json.trans[0], "transFunc":json.trans[1]});
        
        // add transformed variable to all spaces
        for(var j in spaces) {
            var i = spaces[j].allNodes.length;

            spaces[j].allNodes.push({id:i, reflexive: false, "name": rCall[0][0], "labl": "transformlabel", data: [5,15,20,0,5,15,20], count: hold, "nodeCol":colors(i), "baseCol":colors(i), "strokeColor":selVarColor, "strokeWidth":"1", "varLevel":"level", "minimum":json.sumStats.min[0], "median":json.sumStats.median[0], "standardDeviation":json.sumStats.sd[0], "mode":json.sumStats.mode[0], "valid":json.sumStats.valid[0], "mean":json.sumStats.mean[0], "maximum":json.sumStats.max[0], "invalid":json.sumStats.invalid[0], "subsetplot":false, "subsetrange":["", ""],"setxplot":false, "subsethold":["", ""], "setxvals":["", ""], "transformed":true, "transFrom":json.trans[0], "transFunc":json.trans[1]});
        }
        
        valueKey.push(newVar);
        nodes.push(findNode(newVar));
        
        scaffolding(rCall[0]);
        readPreprocess(json.url, from="transform", v=newVar);
        
        fakeClick();
    }
    
    function transformFail(btn) {
        console.log("transform fail");
        estimateLadda.stop();
    }
    
    estimateLadda.start();  // start spinner
    makeCorsRequest(urlcall,btn, transformSuccess, transformFail);
    
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
      console.log(text);
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
        console.log(xhr);
        estimateLadda.stop();
        selectLadda.stop();
      alert('Woops, there was an error making the request.');
    };
    
    xhr.send();
}


function legend(c) { // this could be made smarter
    if (zparams.ztime.length!=0 | zparams.zcross.length!=0 | zparams.zdv.length!=0 | zparams.znom.length!=0) {
        document.getElementById("legend").setAttribute("style", "display:block");
    }
    else {
        document.getElementById("legend").setAttribute("style", "display:none");
    }
    
    
    if(zparams.ztime.length==0) {
        document.getElementById("timeButton").setAttribute("class", "clearfix hide");
    }
    else {
        document.getElementById("timeButton").setAttribute("class", "clearfix show");
    }
    if(zparams.zcross.length==0) {
        document.getElementById("csButton").setAttribute("class", "clearfix hide");
    }
    else {
        document.getElementById("csButton").setAttribute("class", "clearfix show");
    }
    if(zparams.zdv.length==0) {
        document.getElementById("dvButton").setAttribute("class", "clearfix hide");
    }
    else {
        document.getElementById("dvButton").setAttribute("class", "clearfix show");
    }
    if(zparams.znom.length==0) {
        document.getElementById("nomButton").setAttribute("class", "clearfix hide");
    }
    else {
        document.getElementById("nomButton").setAttribute("class", "clearfix show");
    }
    
    borderState();
}


function reset() {
    location.reload();
}

// programmatically deselecting every selected variable...
function erase() {
    subsetOff();
    setxOff();
    document.getElementById("legend").setAttribute("style", "display:none");
    
    lefttab='tab1';
    tabLeft('tab1');
    
    jQuery.fn.d3Click = function () {
        this.children().each(function (i, e) {
                    var mycol = d3.rgb(this.style.backgroundColor);
                    if(mycol.toString()===varColor.toString()) {return;}
                  var evt = document.createEvent("MouseEvents");
                  evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                  
                  e.dispatchEvent(evt);
                  });
    };
    $("#tab1").d3Click();
}


function deselect(d) {
    console.log(d);
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
    
    if(tab != "tab3") {
        document.getElementById('btnPanel'+tabi).setAttribute("class", "btn active");
    }
    
    document.getElementById('tab1').style.display = 'none';
    document.getElementById('tab2').style.display = 'none';
    document.getElementById('tab3').style.display = 'none';

    if(tabi==1) {
        summaryHold = false;
        document.getElementById('btnPanel2').setAttribute("class", "btn btn-default");
     //   document.getElementById('btnPanel3').setAttribute("class", "btn btn-default");
    }
    else if (tabi==2) {
        summaryHold = false;
        document.getElementById('btnPanel1').setAttribute("class", "btn btn-default");
     //   document.getElementById('btnPanel3').setAttribute("class", "btn btn-default");
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

}


function varSummary(d) {
  
    // This is mirrored in popup -- should make reusable function
    function threeSF(x){
      var tsf = d3.format(".3r");                            // format to three significant figures after the decimal place
      return tsf(x).replace( /0+$/, "").replace( /\.$/, "")  // trim trailing zeros after a period, and any orphaned period
    }
    var rint = d3.format("r");

    var summarydata = [],
    tmpDataset = [], t1 = ["Mean:","Median:","Mode:","Stand.Dev:","Minimum:","Maximum:","Valid:","Invalid:"],
    t2 = [(+d.mean).toPrecision(4).toString(),(+d.median).toPrecision(4).toString(),(+d.mode).toPrecision(4).toString(),(+d.standardDeviation).toPrecision(4).toString(),(+d.minimum).toPrecision(4).toString(),(+d.maximum).toPrecision(4).toString(),rint(d.valid),rint(d.invalid)],
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

     if(typeof dataArray[0].properties === "undefined") { // .properties is undefined for some vars
        var plotsvg = d3.select("#tab3")
        .selectAll("svg")
        .remove();
    }
    else if (dataArray[0].properties.type === "continuous") {
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
}

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
    
    "<div class='form-group'><label class='col-sm-4 control-label'>Mean</label><div class='col-sm-6'><p class='form-control-static'>" + (+d.mean).toPrecision(4).toString() + "</p></div></div>" +
    
    "<div class='form-group'><label class='col-sm-4 control-label'>Median</label><div class='col-sm-6'><p class='form-control-static'>" + (+d.median).toPrecision(4).toString() + "</p></div></div>" +
    
    "<div class='form-group'><label class='col-sm-4 control-label'>Mode</label><div class='col-sm-6'><p class='form-control-static'>" + (+d.mode).toPrecision(4).toString() + "</p></div></div>" +
    
    "<div class='form-group'><label class='col-sm-4 control-label'>Stand Dev</label><div class='col-sm-6'><p class='form-control-static'>" + (+d.standardDeviation).toPrecision(4).toString() + "</p></div></div>" +
    
    "<div class='form-group'><label class='col-sm-4 control-label'>Maximum</label><div class='col-sm-6'><p class='form-control-static'>" + (+d.maximum).toPrecision(4).toString() + "</p></div></div>" +
    
    "<div class='form-group'><label class='col-sm-4 control-label'>Minimum</label><div class='col-sm-6'><p class='form-control-static'>" + (+d.minimum).toPrecision(4).toString() + "</p></div></div>" +
    
    "<div class='form-group'><label class='col-sm-4 control-label'>Invalid</label><div class='col-sm-6'><p class='form-control-static'>" + rint(d.invalid) + "</p></div></div>" +
    
    "<div class='form-group'><label class='col-sm-4 control-label'>Valid</label><div class='col-sm-6'><p class='form-control-static'>" + rint(d.valid) + "</p></div></div>" ;
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
        .attr("class", "sidepanel container clearfix");
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
        .attr("class", "sidepanel container clearfix");
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
    .attr("class", "sidepanel container clearfix expandpanel");
    
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
        .attr("class", "sidepanel container clearfix");
        
    };
};

function setx() {

    if (setxdiv==true) {
        setxdiv = false;
        d3.select("#setx")
        .style("display", "none");
        d3.select("#rightpanel")
        .attr("class", "sidepanel container clearfix");
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
    .attr("class", "sidepanel container clearfix expandpanel");
    
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

// function to convert color codes
function hexToRgba(hex) {
    var h=hex.replace('#', '');
    
    var bigint = parseInt(h, 16);
    var r = (bigint >> 16) & 255;
    var g = (bigint >> 8) & 255;
    var b = bigint & 255;
    var a = '0.5';
    
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
}

// function takes a node and a color.  sets zparams as well.
function setColors (n, c) {
    if(n.strokeWidth=='1') { // adding time, cs, dv, nom to a node with no stroke
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
        else if(nomColor==c) {
            zparams.znom = Object.prototype.toString.call(zparams.znom) == "[object Array]" ? zparams.znom : [];
            zparams.znom.push(n.name);
        }
        
        d3.select("#tab1").select("p#".concat(n.name))
        .style('background-color', hexToRgba(c));
    }
    else if (n.strokeWidth=='4') {
        if(c==n.strokeColor) { // deselecting time, cs, dv, nom
            n.strokeWidth = '1';
            n.strokeColor = selVarColor;
            n.nodeCol=colors(n.id);
            d3.select("#tab1").select("p#".concat(n.name))
            .style('background-color', hexToRgba(selVarColor));
            
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
            else if(nomColor==c) {
                var nomIndex = zparams.znom.indexOf(n.name);
                if (nomIndex > -1) { zparams.znom.splice(nomIndex, 1); }
            }
        }
        else { // deselecting time, cs, dv, nom AND changing it to time, cs, dv, nom
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
            else if(nomColor==n.strokeColor) {
                var nomIndex = zparams.znom.indexOf(n.name);
                if (nomIndex > -1) { zparams.znom.splice(nomIndex, 1); }
            }
            n.strokeColor = c;
            d3.select("#tab1").select("p#".concat(n.name))
            .style('background-color', hexToRgba(c));
            
            if(dvColor==c) {zparams.zdv.push(n.name);}
            else if(csColor==c) {zparams.zcross.push(n.name);}
            else if(timeColor==c) {zparams.ztime.push(n.name);}
            else if(nomColor==c) {zparams.znom.push(n.name);}
        }
    }
}


function borderState () {
    if(zparams.zdv.length>0) {$('#dvButton .rectColor svg circle').attr('stroke', dvColor);}
    else {$('#dvButton').css('border-color', '#ccc');}
    if(zparams.zcross.length>0) {$('#csButton .rectColor svg circle').attr('stroke', csColor);}
    else {$('#csButton').css('border-color', '#ccc');}
    if(zparams.ztime.length>0) {$('#timeButton .rectColor svg circle').attr('stroke', timeColor);}
    else {$('#timeButton').css('border-color', '#ccc');}
    if(zparams.znom.length>0) {$('#nomButton .rectColor svg circle').attr('stroke', nomColor);}
    else {$('#nomButton').css('border-color', '#ccc');}
}

// small appearance resets, but perhaps this will become a hard reset back to all original allNode values?
function nodeReset (n) {
    n.strokeColor=selVarColor;
    n.strokeWidth="1";
    n.nodeCol=n.baseCol;
}

function subsetSelect(btn) {
    
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
    
    var jsonout = JSON.stringify(subsetstuff);
    var base = rappURL+"subsetapp?solaJSON="
    
    urlcall = base.concat(jsonout);
    console.log("subset url: ",urlcall);

    function subsetSelectSuccess(btn,json) {
        
        selectLadda.stop(); // stop motion
        subseted=true;
        
        var rCall = [];
        rCall[0] = json.call;
        
        // store contents of the pre-subset space
        zPop();
        var myNodes = jQuery.extend(true, [], allNodes);
        var myParams = jQuery.extend(true, {}, zparams);
        var myTrans = jQuery.extend(true, [], trans);
        var myForce = jQuery.extend(true, [], forcetoggle);
        var myPreprocess = jQuery.extend(true, {}, preprocess);
        var myLog = jQuery.extend(true, [], logArray);
        
        spaces[myspace] = {"allNodes":myNodes, "zparams":myParams, "trans":myTrans, "force":myForce, "preprocess":myPreprocess, "logArray":myLog};
        
        // remove pre-subset svg
        var selectMe = "#whitespace".concat(myspace);
        d3.select(selectMe).remove();
        var selectMe = "#m".concat(myspace);
        d3.select(selectMe).append('span').attr('class', 'emptyItem');
        
        // selectMe = "navdot".concat(myspace);
        // var mynavdot = document.getElementById(selectMe);
        // mynavdot.removeAttribute("class");
        
        myspace = spaces.length;
        
        // selectMe = "navdot".concat(myspace-1);
        // mynavdot = document.getElementById(selectMe);
        
        // var newnavdot = document.createElement("li");
        // newnavdot.setAttribute("class", "active");
        // selectMe = "navdot".concat(myspace);
        // newnavdot.setAttribute("id", selectMe);
        // mynavdot.parentNode.insertBefore(newnavdot, mynavdot.nextSibling);
        
        
        // assign the post-subset allNodes
        for(var j=0; j<json.varnames.length; j++) {
            var temp = findNodeIndex(json.varnames[j]);
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
            allNodes[temp].setxplot=false;
            allNodes[temp].setxvals=["",""];
        }
        
        logArray.push("subset: ".concat(rCall[0]));
        showLog();
        reWriteLog();

        var owl = $('#innercarousel'), i = myspace;
        var content = "";

        content += "<div id=\"m" + i + "\" class=\"item\"><span class=\"emptyItem\"></span></div>"

        owl.data('owlCarousel').addItem(content);
        
        d3.select("#m".concat(myspace))
        .select('span').remove();
        d3.select("#m".concat(myspace))
        .append('svg')
        .attr('id', 'whitespace');
        svg = d3.select("#whitespace");

        owl.trigger('owl.goTo', myspace);
        
        layout(v="add");
        
        preprocess=readPreprocess(json.url);
        
        resetPlots();
        populatePopover();
    }
    
    
    function subsetSelectFail(btn) {
        selectLadda.stop(); //stop motion
        //document.getElementById(btn).style.background="#CC3333";
    }
    
    selectLadda.start(); //start button motion
    makeCorsRequest(urlcall,btn, subsetSelectSuccess, subsetSelectFail);
    
}

function readPreprocess(url, from, v) {
    var p = {};
    d3.json(url, function(error, json) {
            if (error) return console.warn(error);
            var jsondata = json;
            
            //copying the object
            for(var key in jsondata) {
                p[key] = jsondata[key];
            }
            if(from==="transform") {
                preprocess[v]=p[v];
                return;
            }

            });
    return p;
}


function delSpace() {
    if (spaces.length===0 | (spaces.length===1 & myspace===0)) {return;}
    var lastSpace = false;
    if(myspace >= spaces.length-1) { console.log("lastspace"); lastSpace=true; }
    spaces.splice(myspace, 1);
    
    // remove current whitespace
    var selectMe = "#m".concat(myspace);
    d3.select(selectMe).attr('class', 'item');
    selectMe = "#whitespace".concat(myspace);
    d3.select(selectMe).remove();
    
    // remove last navdot
    // selectMe = "navdot".concat(spaces.length);
    // var mynavdot = document.getElementById(selectMe);
    // mynavdot.parentElement.removeChild(mynavdot);  remove from parent to remove the pointer to the child
    
    // remove last inner carousel m
    selectMe = "m".concat(spaces.length);
    // var mynavdot = document.getElementById(selectMe);
    // mynavdot.parentElement.removeChild(mynavdot);
    
    if(lastSpace) { myspace = myspace-1; }
    
    // selectMe = "navdot".concat(myspace);
    // newnavdot = document.getElementById(selectMe);
    // newnavdot.setAttribute("class", "active");
    
    // add whitespace back in to current inner carousel m
    selectMe = "#m".concat(myspace);
    d3.select(selectMe).attr('class', 'item')
    .append('svg').attr('id', function(){
                        return "whitespace".concat(myspace);
                        });
    
    allNodes = jQuery.extend(true, [], spaces[myspace].allNodes);
    zparams = jQuery.extend(true, {}, spaces[myspace].zparams);
    trans = jQuery.extend(true, [], spaces[myspace].trans);
    forcetoggle = jQuery.extend(true, [], spaces[myspace].force);
    preprocess = jQuery.extend(true, {}, spaces[myspace].preprocess);
    
    selectMe = "#whitespace".concat(myspace);
    svg = d3.select(selectMe);
    
    layout(v="move");
}


// for the following three functions, the general idea is to store the new information for the current space, and then move myspace according (right: +1, left: -1, addSpace: spaces.length)
function addSpace() {

    zPop();
    var myNodes = jQuery.extend(true, [], allNodes); // very important. this clones the allNodes object, and may slow us down in the future.  if user hits plus 4 times, we'll have four copies of the same space in memory.  certainly a way to optimize this
    var myParams = jQuery.extend(true, {}, zparams);
    var myTrans = jQuery.extend(true, [], trans);
    var myForce = jQuery.extend(true, [], forcetoggle);
    var myPreprocess = jQuery.extend(true, {}, preprocess);
    var myLog = jQuery.extend(true, [], logArray);
  
    spaces[myspace] = {"allNodes":myNodes, "zparams":myParams, "trans":myTrans, "force":myForce, "preprocess":myPreprocess, "logArray":myLog};
    
    var selectMe = "#whitespace".concat(myspace);
    d3.select(selectMe).remove();
    var selectMe = "#m".concat(myspace);
    d3.select(selectMe).append('span').attr('class', 'emptyItem');
    
    myspace = spaces.length;
    
    var owl = $('#innercarousel');
    var content = "";

    content += "<div id=\"m" + myspace + "\" class=\"item\"><span class=\"emptyItem\"></span></div>"

    owl.data('owlCarousel').addItem(content);

    d3.select("#m".concat(myspace))
    .select('span').remove();
    d3.select("#m".concat(myspace))
    .append('svg')
    .attr('id', 'whitespace');
    svg = d3.select("#whitespace");

    owl.trigger('owl.goTo', myspace);

    layout(v="add");

}

function left() {
    
    zPop();
    
    var myNodes = jQuery.extend(true, [], allNodes); // very important. this clones the allNodes object, and may slow us down in the future.  if user hits plus 4 times, we'll have four copies of the same space in memory.  certainly a way to optimize this
    var myParams = jQuery.extend(true, {}, zparams);
    var myTrans = jQuery.extend(true, [], trans);
    var myForce = jQuery.extend(true, [], forcetoggle);
    var myPreprocess = jQuery.extend(true, {}, preprocess);
    var myLog = jQuery.extend(true, [], logArray);
    
    if(typeof spaces[myspace] === "undefined") {
        spaces.push({"allNodes":myNodes, "zparams":myParams, "trans":myTrans, "force":myForce, "preprocess":myPreprocess, "logArray":myLog});
    }
    else {
        spaces[myspace] = {"allNodes":myNodes, "zparams":myParams, "trans":myTrans, "force":myForce, "preprocess":myPreprocess, "logArray":myLog};
    }
    
    if(myspace===0) {
        myspace=spaces.length-1; // move to last when left is click at 0
    }
    else {
        myspace = myspace-1;
    }
    
    selectMe = "#m".concat(myspace);
    d3.select(selectMe)
    .select('span').remove();
    d3.select(selectMe)
    .append('svg').attr('id', function(){
        return "whitespace".concat(myspace);
    });

    allNodes = jQuery.extend(true, [], spaces[myspace].allNodes);
    zparams = jQuery.extend(true, {}, spaces[myspace].zparams);
    trans = jQuery.extend(true, [], spaces[myspace].trans);
    forcetoggle = jQuery.extend(true, [], spaces[myspace].force);
    preprocess = jQuery.extend(true, {}, spaces[myspace].preprocess);
    logArray = jQuery.extend(true, [], spaces[myspace].logArray);

    selectMe = "#whitespace".concat(myspace);
    svg = d3.select(selectMe);
    layout(v="move");
    
    // selectMe = "navdot".concat(myspace);
    // newnavdot = document.getElementById(selectMe);
    // newnavdot.setAttribute("class", "active");
  
    if(myspace===spaces.length-1) {
        myspace=0;
    }
    else {
        myspace = myspace+1;
    }

    // selectMe = "navdot".concat(myspace);
    // var mynavdot = document.getElementById(selectMe);
    // mynavdot.removeAttribute("class", "active");
    
    selectMe = "#whitespace".concat(myspace);
    d3.select(selectMe).remove();

    selectMe = "#m".concat(myspace);
    d3.select(selectMe)
    .append('span').attr('class','emptyItem');

    if(myspace===0) {
        myspace=spaces.length-1; // move to last when left is click at 0
    }
    else {
        myspace = myspace-1;
    }

    if(forcetoggle[0]==="false") {
        document.getElementById('btnForce').setAttribute("class", "btn active");
    }
    else {
        document.getElementById('btnForce').setAttribute("class", "btn btn-default");
    }

    d3.select("#models").selectAll("p").style("background-color", varColor);
    selectMe = "#_model_".concat(zparams.zmodel);
    d3.select(selectMe).style("background-color", hexToRgba(selVarColor));
    
    selectMe = "#whitespace".concat(myspace);
    svg = d3.select(selectMe);

    legend();
    showLog();
    reWriteLog();
}

function right() {
    
    zPop();
    var myNodes = jQuery.extend(true, [], allNodes);
    var myParams = jQuery.extend(true, {}, zparams);
    var myTrans = jQuery.extend(true, [], trans);
    var myForce = jQuery.extend(true, [], forcetoggle);
    var myPreprocess = jQuery.extend(true, {}, preprocess);
    var myLog = jQuery.extend(true, [], logArray);
    
    spaces[myspace] = {"allNodes":myNodes, "zparams":myParams, "trans":myTrans, "force":myForce, "preprocess":myPreprocess, "logArray":myLog};
    
  
    if(myspace===spaces.length-1) {
        myspace=0; // move to last when left is click at 0
    }
    else {
        myspace = myspace+1;
    }

    selectMe = "#m".concat(myspace);
    d3.select(selectMe)
    .select('span').remove();
    d3.select(selectMe)
    .append('svg').attr('id', function(){
        return "whitespace".concat(myspace);
    });

    allNodes = jQuery.extend(true, [], spaces[myspace].allNodes);
    zparams = jQuery.extend(true, {}, spaces[myspace].zparams);
    trans = jQuery.extend(true, [], spaces[myspace].trans);
    forcetoggle = jQuery.extend(true, [], spaces[myspace].force);
    preprocess = jQuery.extend(true, {}, spaces[myspace].preprocess);
    logArray = jQuery.extend(true, [], spaces[myspace].logArray);

    selectMe = "#whitespace".concat(myspace);
    svg = d3.select(selectMe);
    layout(v="move");

    if(myspace===0) {
        myspace=spaces.length-1;
    }
    else {
        myspace = myspace-1;
    }
    
    // selectMe = "navdot".concat(myspace);
    // var mynavdot = document.getElementById(selectMe);
    // mynavdot.removeAttribute("class", "active");
    
    selectMe = "#whitespace".concat(myspace);
    d3.select(selectMe).remove();

    selectMe = "#m".concat(myspace);
    d3.select(selectMe)
    .append('span').attr('class','emptyItem');
    
    if(myspace===spaces.length-1) {
        myspace=0; // move to last when left is click at 0
    }
    else {
        myspace = myspace+1;
    }
    
    // selectMe = "navdot".concat(myspace);
    // var newnavdot = document.getElementById(selectMe);
    // newnavdot.setAttribute("class", "active");
   
    if(forcetoggle[0]==="false") {
        document.getElementById('btnForce').setAttribute("class", "btn active");
    }
    else {
        document.getElementById('btnForce').setAttribute("class", "btn btn-default");
    }

    d3.select("#models").selectAll("p").style("background-color", varColor);
    selectMe = "#_model_".concat(zparams.zmodel);
    d3.select(selectMe).style("background-color", hexToRgba(selVarColor));
    
    selectMe = "#whitespace".concat(myspace);
    svg = d3.select(selectMe);
    
    legend();
    showLog();
    reWriteLog();
}

function resultsView() {
    if(estimated==false) {
        righttab='results';
        tabRight('btnResults');
        return;
    }
    
    if(resultsViewer==true) {
        resultsViewer=false;
        
        d3.select("#rightpanel")
        .attr("class", "sidepanel container clearfix");
        
        return;
    }
    
    righttab='results';
    tabRight('btnResults');
    
    resultsViewer=true;
    d3.select("#results")
    .style("display", "block");
    
    d3.select("#rightpanel")
    .attr("class", "sidepanel container clearfix expandpanel");
    
    return;
}


function about() {
    $('#about').show();
}

function closeabout() {
    $('#about').hide();
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
    .attr("class", "sidepanel container clearfix");
    
    d3.select("#leftpanel")
    .attr("class", "sidepanel container clearfix");
    
    d3.select("#btnSelect")
    .style("display", "none");
    
    lefttab="tab1";
    tabLeft(lefttab);
}

function showLog() {
    if(logArray.length > 0) {
        document.getElementById('logdiv').setAttribute("style", "display:block");
        d3.select("#collapseLog div.panel-body").selectAll("p")
                     .data(logArray)
                     .enter()
                     .append("p")
                     .text(function(d){
                           return d;
                           });
    }
    else {
        document.getElementById('logdiv').setAttribute("style", "display:none");
    }
}

function reWriteLog() {
    d3.select("#collapseLog div.panel-body").selectAll("p")
    .remove();
    d3.select("#collapseLog div.panel-body").selectAll("p")
    .data(logArray)
    .enter()
    .append("p")
    .text(function(d){
          return d;
          });
}


// acts as if the user clicked in whitespace. useful when restart() is outside of scope
function fakeClick() {
/*
    var fake = "#fakeTarget";

    $(fake).trigger('click');
*/
     var myws = "#whitespace".concat(myspace);
    
    // d3 and programmatic events don't mesh well, here's a SO workaround that looks good but uses jquery...
     jQuery.fn.d3Click = function () {
         this.each(function (i, e) {
                   var evt = document.createEvent("MouseEvents");
                   evt.initMouseEvent("mousedown", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                  
                   e.dispatchEvent(evt);
                   });
     };
     $(myws).d3Click();
    
     d3.select(myws)
     .classed('active', false); // remove active class
}



