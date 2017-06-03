// hostname default - the app will use it to obtain the variable metadata
// (ddi) and pre-processed data info if the file id is supplied as an
// argument (for ex., gui.html?dfId=17), but hostname isn't.
// Edit it to suit your installation.
// (NOTE that if the file id isn't supplied, the app will default to the
// local files specified below!)
// NEW: it is also possible now to supply complete urls for the ddi and
// the tab-delimited data file; the parameters are ddiurl and dataurl.
// These new parameters are optional. If they are not supplied, the app
// will go the old route - will try to cook standard dataverse urls
// for both the data and metadata, if the file id is supplied; or the
// local files if nothing is supplied.

var production = false;

var varColor = '#f0f8ff'; //d3.rgb("aliceblue");
var selVarColor = '#fa8072'; //d3.rgb("salmon");
var dvColor = '#28a4c9';
var nomColor = '#ff6600';

var lefttab = "tab1"; // current tab in left panel
var righttab = "btnModels"; // current tab in right panel

// transformation toolbar options
var transformList = 'log(d) exp(d) d^2 sqrt(d) interact(d,e)'.split();
var transformVar = '';

// Radius of circle
var allR = 40;

// space index
var myspace = 0;

var forcetoggle = ["true"];
var priv = false;

var zparams = {
	zdata: [],
	zedges: [],
	ztime: [],
	znom: [],
	zcross: [],
	zmodel: "",
	zvars: [],
	zdv: [],
	zdataurl: "",
	zsubset: [],
	zsetx: [],
	zmodelcount: 0,
	zplot: [],
	zsessionid: "",
	zdatacite: ""
};

var modelCount = 0;
var summaryHold = false;

var valueKey = [];
var allNodes = [];
var nodes = [];
var links = [];
var mods = {};
var selInteract = false;
var callHistory = []; // unique to the space. saves transform and subset calls.

var svg, width, height, div, obj, rappURL, estimateLadda, selectLadda;
var arc3, arc4;

function byId(id) {
		return document.getElementById(id);
}

var dataurl;
export function main(fileid, hostname, ddiurl, dataurl) {
    dataurl = dataurl;
    if (production && fileid == "") {
        alert("Error: No fileid has been provided.");
        throw new Error("Error: No fileid has been provided.");
    }

    var dataverseurl = "";
    if (hostname) {
        dataverseurl = "https://" + hostname;
    } else if (production) {
        dataverseurl = "%PRODUCTION_DATAVERSE_URL%";
    } else {
        dataverseurl = "http://localhost:8080";
    }

    if (fileid && !dataurl) {
        // file id supplied; assume we are dealing with dataverse and cook a standard dataverse data access url
        // with the fileid supplied and the hostname we have supplied or configured
        dataurl = dataverseurl + "/api/access/datafile/" + fileid;
        dataurl = dataurl + "?key=" + apikey;
    }

    rappURL = (production ? 'https://beta.dataverse.org/' : 'http://0.0.0.0:8000/') + '/custom/';

    svg = d3.select("#main.left div.carousel-inner").attr('id', 'innercarousel')
        .append('div').attr('class', 'item active').attr('id', 'm0').append('svg').attr('id', 'whitespace');

    var logArray = [];

    var tempWidth = d3.select("#main.left").style("width")
    width = tempWidth.substring(0, (tempWidth.length - 2));
    height = $(window).height() - 120; // Hard coding for header and footer and bottom margin.

    var estimated = false;
    estimateLadda = Ladda.create(byId("btnEstimate"));
    selectLadda = Ladda.create(byId("btnSelect"));
    var rightClickLast = false;

    // initial color scale used to establish the initial colors of nodes
		// allNodes.push() below establishes a field for the master node array allNodes called "nodeCol" and assigns a color from this scale to that field
		// everything there after should refer to the nodeCol and not the color scale, this enables us to update colors and pass the variable type to R based on its coloring
    var colors = d3.scale.category20();

    var colorTime = false;
    var timeColor = '#2d6ca2';
    var colorCS = false;
    var csColor = '#419641';

    var depVar = false;
    var subsetdiv = false;
    var setxdiv = false;

    var taggedColor = '#f5f5f5'; //d3.rgb("whitesmoke");
    var grayColor = '#c0c0c0';

    //Width and height for histgrams
    var barwidth = 1.3 * allR;
    var barheight = 0.5 * allR;
    var barPadding = 0.35;
    var barnumber = 7;

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
    arc3 = d3.svg.arc()
        .innerRadius(allR + 5)
        .outerRadius(allR + 20)
        .startAngle(2.3)
        .endAngle(3.3);
    arc4 = d3.svg.arc()
        .innerRadius(allR + 5)
        .outerRadius(allR + 20)
        .startAngle(4.3)
        .endAngle(5.3);

    // From .csv
    var dataset2 = [];
    var lablArray = [];
    var hold = [];
    var allResults = [];
    var subsetNodes = [];
    var citetoggle = false;

    var spaces = [];
    var trans = []; // var list for each space contain variables in original data plus trans in that space

		// collapsable user log
    $('#collapseLog').on('shown.bs.collapse', () => {
        d3.select("#collapseLog div.panel-body").selectAll("p")
            .data(logArray)
            .enter()
            .append("p")
            .text(d => d);
    });
    $('#collapseLog').on('hidden.bs.collapse', () => {
        d3.select("#collapseLog div.panel-body").selectAll("p")
            .remove();
    });

    $('#about div.panel-body').text('TwoRavens v0.1 "Dallas" -- The Norse god Odin had two talking ravens as advisors, who would fly out into the world and report back all they observed.  In the Norse, their names were "Thought" and "Memory".  In our coming release, our thought-raven automatically advises on statistical model selection, while our memory-raven accumulates previous statistical models from Dataverse, to provide cummulative guidance and meta-analysis.');
    // read DDI metadata with d3
    var metadataurl = "";
    if (ddiurl) {
        metadataurl = ddiurl;
    } else if (fileid) {
        // file id supplied; we're going to cook a standard dataverse
        // metadata url, with the file id provided and the hostname
        // supplied or configured:
        metadataurl = dataverseurl + "/api/meta/datafile/" + fileid;
    } else {
        // neither a full ddi url, nor file id supplied
        // use one of the sample data files distributed with the app in the 'data' directory
        metadataurl = "data/PUMS5small-ddi.xml"; // This is California PUMS subset
    }

    // read pre-processed metadata and data:
    var pURL = "";
    if (dataurl) {
        pURL = dataurl + "&format=prep";
    } else {
        pURL = "data/preprocessPUMS5small.json"; // California PUMS subset
    }
    var preprocess = {};

		// loads all external data: metadata (DVN's ddi), preprocessed (for plotting distributions), and zeligmodels (produced by Zelig) and initiates the data download to the server
    var url, p, v, callback;
    readPreprocess(url = pURL, p = preprocess, v = null, callback = function() {
        d3.xml(metadataurl, "application/xml", xml =>  {
            var vars = xml.documentElement.getElementsByTagName("var");
            var temp = xml.documentElement.getElementsByTagName("fileName");
            zparams.zdata = temp[0].childNodes[0].nodeValue;

            // clean the citation so that the POST is valid json
            function cleanstring(s) {
                s = s.replace(/\&/g, "and");
                s = s.replace(/\;/g, ",");
                s = s.replace(/\%/g, "-");
                return s;
            }

            var cite = xml.documentElement.getElementsByTagName("biblCit");
            zparams.zdatacite = cite[0].childNodes[0].nodeValue;
            zparams.zdatacite = cleanstring(zparams.zdatacite);
            // dataset name trimmed to 12 chars
            var dataname = zparams.zdata.replace(/\.(.*)/, ""); // drop any file extension
            d3.select("#dataName")
                .html(dataname);
            $('#cite div.panel-body').text(zparams.zdatacite);

            // Put dataset name, from meta-data, into page title
            d3.select("title").html("TwoRavens " + dataname)
            // temporary values for hold that correspond to histogram bins
            hold = [.6, .2, .9, .8, .1, .3, .4];
            var myvalues = [0, 0, 0, 0, 0];
            for (var i = 0; i < vars.length; i++) {
                valueKey[i] = vars[i].attributes.name.nodeValue;
                lablArray[i] = vars[i].getElementsByTagName("labl").length == 0 ?
										"no label" :
                		vars[i].getElementsByTagName("labl")[0].childNodes[0].nodeValue;
                var datasetcount = d3.layout.histogram()
                    .bins(barnumber).frequency(false)
                    (myvalues);
                // creates an object to be pushed to allNodes
								// contains all the preprocessed data we have for the variable, as well as UI data pertinent to that variable, such as setx values (if the user has selected them) and pebble coordinates
                var obj1 = {
                    id: i,
                    reflexive: false,
                    "name": valueKey[i],
                    "labl": lablArray[i],
                    data: [5, 15, 20, 0, 5, 15, 20],
                    count: hold,
                    "nodeCol": colors(i),
                    "baseCol": colors(i),
                    "strokeColor": selVarColor,
                    "strokeWidth": "1",
                    "subsetplot": false,
                    "subsetrange": ["", ""],
                    "setxplot": false,
                    "setxvals": ["", ""],
                    "grayout": false
                };
                jQuery.extend(true, obj1, preprocess[valueKey[i]]);
                allNodes.push(obj1);
            };

            // Reading the zelig models and populating the model list in the right panel.
            d3.json("data/zelig5models.json", (err, data) => {
                if (err)
										return console.warn(err);
                console.log("zelig models json: ", data);
                for (var key in jsondata.zelig5models) {
                    if (jsondata.zelig5models.hasOwnProperty(key))
                        mods[jsondata.zelig5models[key].name[0]] = jsondata.zelig5models[key].description[0];
                }
                d3.json("data/zelig5choicemodels.json", (err, data) => {
                    if (err)
												return console.warn(err);
                    console.log("zelig choice models json: ", data);
                    for (var key in jsondata.zelig5choicemodels) {
                        if (jsondata.zelig5choicemodels.hasOwnProperty(key))
                            mods[jsondata.zelig5choicemodels[key].name[0]] = jsondata.zelig5choicemodels[key].description[0];
                    }
                    scaffolding(callback = layout);
                    dataDownload();
                });
            });
        });
    });
}

// scaffolding is called after all external data are guaranteed to have been read to completion. this populates the left panel with variable names, the right panel with model names, the transformation tool, an the associated mouseovers. its callback is layout(), which initializes the modeling space
function scaffolding(callback) {
    // establishing the transformation element
    d3.select("#transformations")
        .append("input")
        .attr("id", "tInput")
        .attr("class", "form-control")
        .attr("type", "text")
        .attr("value", "Variable transformation");

    // variable dropdown
    d3.select("#transformations")
        .append("ul")
        .attr("id", "transSel")
        .style("display", "none")
        .style("background-color", varColor)
        .selectAll('li')
        .data(["a", "b"]) //set to variables in model space as they're added
        .enter()
        .append("li")
        .text(d => d);

    // function dropdown
    d3.select("#transformations")
        .append("ul")
        .attr("id", "transList")
        .style("display", "none")
        .style("background-color", varColor)
        .selectAll('li')
        .data(transformList)
        .enter()
        .append("li")
        .text(d => d);

    $('#tInput').click(() => {
        var t = byId('transSel').style.display;
        if (t !== "none") { // if variable list is displayed when input is clicked...
            $('#transSel').fadeOut(100);
            return false;
        }
        var t1 = byId('transList').style.display;
        if (t1 !== "none") { // if function list is displayed when input is clicked...
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

    var n, typeTransform;

    $('#tInput').keyup(event => {
        var t = byId('transSel').style.display;
        var t1 = byId('transList').style.display;

        if (t !== "none") {
            $('#transSel').fadeOut(100);
        } else if (t1 !== "none") {
            $('#transList').fadeOut(100);
        }

        if (event.keyCode == 13) { // keyup on "Enter"
            n = $('#tInput').val();
            var t = transParse(n = n);
            if (t === null)
                return;
            transform(n = t.slice(0, t.length - 1), t = t[t.length - 1], typeTransform = false);
        }
    });

    var t;
    $('#transList li').click(event => {
        // if interact is selected, show variable list again
        if ($(this).text() === "interact(d,e)") {
            $('#tInput').val(tvar.concat('*'));
            selInteract = true;
            $(this).parent().fandeOut(100);
            $('#transSel').fadeIn(100);
            event.stopPropagation();
            return;
        }

        var tvar = $('#tInput').val();
        var tfunc = $(this).text().replace("d", "_transvar0");
        var tcall = $(this).text().replace("d", tvar);
        $('#tInput').val(tcall);
        $(this).parent().fadeOut(100);
        event.stopPropagation();
        transform(n = tvar, t = tfunc, typeTransform = false);
    });

    // populating the variable list in the left panel
    d3.select("#tab1").selectAll("p")
        .data(valueKey)
        .enter()
        .append("p")
				// replace non-alphanumerics for selection purposes)
				// perhaps ensure this id is unique by adding '_' to the front?
        .attr("id", d => d.replace(/\W/g, "_"))
        .text(d => d)
        .style('background-color', d => {
            if (findNodeIndex(d) > 2)
                return varColor;
            return hexToRgba(selVarColor);
        })
        .attr("data-container", "body")
        .attr("data-toggle", "popover")
        .attr("data-trigger", "hover")
        .attr("data-placement", "right")
        .attr("data-html", "true")
        .attr("onmouseover", "$(this).popover('toggle');")
        .attr("onmouseout", "$(this).popover('toggle');")
        .attr("data-original-title", "Summary Statistics");

    d3.select("#models")
        .style('height', 2000)
        .style('overfill', 'scroll');

    d3.select("#models").selectAll("p")
        .data(Object.keys(mods))
        .enter()
        .append("p")
        .attr("id", "_model_".concat)
        .text(d => d)
        .style('background-color', d => varColor)
        .attr("data-container", "body")
        .attr("data-toggle", "popover")
        .attr("data-trigger", "hover")
        .attr("data-placement", "top")
        .attr("data-html", "true")
        .attr("onmouseover", "$(this).popover('toggle');")
        .attr("onmouseout", "$(this).popover('toggle');")
        .attr("data-original-title", "Model Description")
        .attr("data-content", d => mods[d]);

 // call layout() because at this point all scaffolding is up and ready
    if (typeof callback === "function") callback();
}

function layout(v) {
    var myValues = [];
    nodes = [];
    links = [];

    if (v === "add" | v === "move") {
        d3.select("#tab1").selectAll("p").style('background-color', varColor);
        for (var j = 0; j < zparams.zvars.length; j++) {
            var ii = findNodeIndex(zparams.zvars[j]);
            if (allNodes[ii].grayout)
                continue;
            nodes.push(allNodes[ii]);
            var selectMe = zparams.zvars[j].replace(/\W/g, "_");
            selectMe = "#".concat(selectMe);
            d3.select(selectMe).style('background-color', () => hexToRgba(nodes[j].strokeColor));
        }

        for (var j = 0; j < zparams.zedges.length; j++) {
            var mysrc = nodeIndex(zparams.zedges[j][0]);
            var mytgt = nodeIndex(zparams.zedges[j][1]);
            links.push({
                source: nodes[mysrc],
                target: nodes[mytgt],
                left: false,
                right: true
            });
        }
    } else {
        if (allNodes.length > 2) {
            nodes = [allNodes[0], allNodes[1], allNodes[2]];
            links = [{
                    source: nodes[1],
                    target: nodes[0],
                    left: false,
                    right: true
                },
                {
                    source: nodes[0],
                    target: nodes[2],
                    left: false,
                    right: true
                }
            ];
        } else if (allNodes.length === 2) {
            nodes = [allNodes[0], allNodes[1]];
            links = [{
                source: nodes[1],
                target: nodes[0],
                left: false,
                right: true
            }];
        } else if (allNodes.length === 1) {
            nodes = [allNodes[0]];
        } else {
            alert("There are zero variables in the metadata.");
            return;
        }
    }

    panelPlots(); // after nodes is populated, add subset and setx panels
    populatePopover(); // pipes in the summary stats shown on mouseovers

    var force = d3.layout.force()
        .nodes(nodes)
        .links(links)
        .size([width, height])
        .linkDistance(150)
        .charge(-800)
        .on('tick', tick);

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
        path.attr('d', d => {
            var deltaX = d.target.x - d.source.x,
                deltaY = d.target.y - d.source.y,
                dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
                normX = deltaX / dist,
                normY = deltaY / dist,
                sourcePadding = d.left ? allR + 5 : allR,
                targetPadding = d.right ? allR + 5 : allR,
                sourceX = d.source.x + (sourcePadding * normX),
                sourceY = d.source.y + (sourcePadding * normY),
                targetX = d.target.x - (targetPadding * normX),
                targetY = d.target.y - (targetPadding * normY);
            return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
        });
        circle.attr('transform', d => 'translate(' + d.x + ',' + d.y + ')');
    }

    //  add listeners to leftpanel.left.  every time a variable is clicked, nodes updates and background color changes.  mouseover shows summary stats or model description.
    d3.select("#tab1").selectAll("p")
        .on("mouseover", function(d) {
            // REMOVED THIS TOOLTIP CODE AND MADE A BOOTSTRAP POPOVER COMPONENT
            $("body div.popover")
                .addClass("variables");
            $("body div.popover div.popover-content")
                .addClass("form-horizontal");
        })
        .on("click", function varClick() {
            if (allNodes[findNodeIndex(this.id)].grayout)
                return null;
            d3.select(this)
                .style('background-color', function(d) {
                    var myText = d3.select(this).text();
                    var myColor = d3.select(this).style('background-color');
                    var mySC = allNodes[findNodeIndex(myText)].strokeColor;

                    zparams.zvars = []; //empty the zvars array
                    if (d3.rgb(myColor).toString() === varColor.toString()) { // we are adding a var
                        if (nodes.length == 0) {
                            nodes.push(findNode(myText));
                            nodes[0].reflexive = true;
                        } else {
                            nodes.push(findNode(myText));
                        }
                        return hexToRgba(selVarColor);
                    } else { // dropping a variable
                        nodes.splice(findNode(myText)["index"], 1);
                        spliceLinksForNode(findNode(myText));

                        if (mySC == dvColor) {
                            var dvIndex = zparams.zdv.indexOf(myText);
                            if (dvIndex > -1) {
                                zparams.zdv.splice(dvIndex, 1);
                            }
                        } else if (mySC == csColor) {
                            var csIndex = zparams.zcross.indexOf(myText);
                            if (csIndex > -1) {
                                zparams.zcross.splice(csIndex, 1);
                            }
                        } else if (mySC == timeColor) {
                            var timeIndex = zparams.ztime.indexOf(myText);
                            if (timeIndex > -1) {
                                zparams.ztime.splice(timeIndex, 1);
                            }
                        } else if (mySC == nomColor) {
                            var nomIndex = zparams.znom.indexOf(myText);
                            if (nomIndex > -1) {
                                zparams.znom.splice(dvIndex, 1);
                            }
                        }

                        nodeReset(allNodes[findNodeIndex(myText)]);
                        borderState();
                        legend();
                        return varColor;
                    }
                });
            panelPlots();
            restart();
        });

    d3.select("#models").selectAll("p") // models tab
        //  d3.select("#Display_content")
        .on("click", () => {
            var myColor = d3.select(this).style('background-color');
            d3.select("#models").selectAll("p")
                .style('background-color', varColor);
            d3.select(this)
                .style('background-color', d =>  {
                    if (d3.rgb(myColor).toString() === varColor.toString()) {
                        zparams.zmodel = d.toString();
                        return hexToRgba(selVarColor);
                    } else {
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
        if (forcetoggle[0] === "true") {
            force.gravity(0.1);
            force.charge(-800);
            force.linkStrength(1);
        } else {
            force.gravity(0);
            force.charge(0);
            force.linkStrength(0);
        }
        force.resume();

        // path (link) group
        path = path.data(links);

        // update existing links
        // VJD: dashed links between pebbles are "selected". this is disabled for now
        path.classed('selected', function(d) {
                return;
            }) //return d === selected_link; })
            .style('marker-start', function(d) {
                return d.left ? 'url(#start-arrow)' : '';
            })
            .style('marker-end', function(d) {
                return d.right ? 'url(#end-arrow)' : '';
            });

        // add new links
        path.enter().append('svg:path')
            .attr('class', 'link')
            .classed('selected', function(d) {
                return;
            }) //return d === selected_link; })
            .style('marker-start', function(d) {
                return d.left ? 'url(#start-arrow)' : '';
            })
            .style('marker-end', function(d) {
                return d.right ? 'url(#end-arrow)' : '';
            })
            .on('mousedown', function(d) { // do we ever need to select a link? make it delete..
                var obj1 = JSON.stringify(d);
                for (var j = 0; j < links.length; j++) {
                    if (obj1 === JSON.stringify(links[j])) {
                        links.splice(j, 1);
                    }
                }
            });

        // remove old links
        path.exit().remove();

        // circle (node) group
        circle = circle.data(nodes, function(d) {
            return d.id;
        });


        // update existing nodes (reflexive & selected visual states)
        //d3.rgb is the function adjusting the color here.
        circle.selectAll('circle')
            .classed('reflexive', function(d) {
                return d.reflexive;
            })
            .style('fill', function(d) {
                return d3.rgb(d.nodeCol);
            })
            .style('stroke', function(d) {
                return (d3.rgb(d.strokeColor));
            })
            .style('stroke-width', function(d) {
                return (d.strokeWidth);
            });

        // add new nodes
        var g = circle.enter()
            .append('svg:g')
            .attr("id", function(d) {
                var myname = d.name + "biggroup";
                return (myname);
            });

        // add plot
        g.each(function(d) {
            d3.select(this);
            if (d.plottype === "continuous") {
                densityNode(d, obj = this);
            } else if (d.plottype === "bar") {
                barsNode(d, obj = this);
            }
        });

        g.append("path")
            .attr("id", function(d) {
                return "dvArc".concat(d.id);
            })
            .attr("d", arc3)
            .style("fill", dvColor)
            .attr("fill-opacity", 0)
            .on('mouseover', function(d) {
                d3.select(this).transition().attr("fill-opacity", .3)
                    .delay(0)
                    .duration(100);
                d3.select("#dvText".concat(d.id)).transition().attr("fill-opacity", .9)
                    .delay(0)
                    .duration(100);
            })
            .on('mouseout', function(d) {
                d3.select(this).transition().attr("fill-opacity", 0)
                    .delay(100)
                    .duration(500);
                d3.select("#dvText".concat(d.id)).transition().attr("fill-opacity", 0)
                    .delay(100)
                    .duration(500);
            })
            .on('click', function(d) {
                setColors(d, dvColor);
                legend(dvColor);
                restart();
            });
        g.append("text")
            .attr("id", function(d) {
                return "dvText".concat(d.id);
            })
            .attr("x", 6)
            .attr("dy", 11.5)
            .attr("fill-opacity", 0)
            .append("textPath")
            .attr("xlink:href", function(d) {
                return "#dvArc".concat(d.id);
            })
            .text("Dep Var");

        g.append("path")
            .attr("id", function(d) {
                return "nomArc".concat(d.id);
            })
            .attr("d", arc4)
            .style("fill", nomColor)
            .attr("fill-opacity", 0)
            .on('mouseover', function(d) {
                if (d.defaultNumchar == "character") {
                    return;
                }
                d3.select(this).transition().attr("fill-opacity", .3)
                    .delay(0)
                    .duration(100);
                d3.select("#nomText".concat(d.id)).transition().attr("fill-opacity", .9)
                    .delay(0)
                    .duration(100);
            })
            .on('mouseout', function(d) {
                if (d.defaultNumchar == "character") {
                    return;
                }
                d3.select(this).transition().attr("fill-opacity", 0)
                    .delay(100)
                    .duration(500);
                d3.select("#nomText".concat(d.id)).transition().attr("fill-opacity", 0)
                    .delay(100)
                    .duration(500);
            })
            .on('click', function(d) {
                if (d.defaultNumchar == "character") {
                    return;
                }
                setColors(d, nomColor);
                legend(nomColor);
                restart();
            });
        g.append("text")
            .attr("id", function(d) {
                return "nomText".concat(d.id);
            })
            .attr("x", 6)
            .attr("dy", 11.5)
            .attr("fill-opacity", 0)
            .append("textPath")
            .attr("xlink:href", function(d) {
                return "#nomArc".concat(d.id);
            })
            .text("Nominal");

        g.append('svg:circle')
            .attr('class', 'node')
            .attr('r', allR)
            .style('pointer-events', 'inherit')
            .style('fill', function(d) {
                return d.nodeCol;
            })
            .style('opacity', "0.5")
            .style('stroke', function(d) {
                return d3.rgb(d.strokeColor).toString();
            })
            .classed('reflexive', function(d) {
                return d.reflexive;
            })
            .on('dblclick', function(d) {
                d3.event.stopPropagation(); // stop click from bubbling
                summaryHold = true;
            })
            .on('contextmenu', function(d) { // right click on node
                d3.event.preventDefault();
                d3.event.stopPropagation(); // stop right click from bubbling
                rightClickLast = true;

                mousedown_node = d;
                if (mousedown_node === selected_node) selected_node = null;
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

                if (rightClickLast) {
                    rightClickLast = false;
                    return;
                }

                if (!mousedown_node) return;

                // needed by FF
                drag_line
                    .classed('hidden', true)
                    .style('marker-end', '');

                // check for drag-to-self
                mouseup_node = d;
                if (mouseup_node === mousedown_node) {
                    resetMouseVars();
                    return;
                }

                // unenlarge target node
                d3.select(this).attr('transform', '');

                // add link to graph (update if exists)
                // NB: links are strictly source < target; arrows separately specified by booleans
                var source, target, direction;
                if (mousedown_node.id < mouseup_node.id) {
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
                if (link) {
                    link[direction] = true;
                } else {
                    link = {
                        source: source,
                        target: target,
                        left: false,
                        right: false
                    };
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
            .text(d => d.name )


        // show summary stats on mouseover
        // SVG doesn't support text wrapping, use html instead
        g.selectAll("circle.node")
            .on("mouseover", function(d) {
                tabLeft("tab3");
                varSummary(d);
                byId('transformations').setAttribute("style", "display:block");
                var select = byId("transSel");
                select.selectedIndex = d.id;
                transformVar = valueKey[d.id];

                d3.select("#dvArc".concat(d.id)).transition().attr("fill-opacity", .1)
                    .delay(0)
                    .duration(100);
                d3.select("#dvText".concat(d.id)).transition().attr("fill-opacity", .5)
                    .delay(0)
                    .duration(100);
                if (d.defaultNumchar == "numeric") {
                    d3.select("#nomArc".concat(d.id)).transition().attr("fill-opacity", .1)
                        .delay(0)
                        .duration(100);
                    d3.select("#nomText".concat(d.id)).transition().attr("fill-opacity", .5)
                        .delay(0)
                        .duration(100);
                }
                d3.select("#csArc".concat(d.id)).transition().attr("fill-opacity", .1)
                    .delay(0)
                    .duration(100);
                d3.select("#csText".concat(d.id)).transition().attr("fill-opacity", .5)
                    .delay(0)
                    .duration(100);
                d3.select("#timeArc".concat(d.id)).transition().attr("fill-opacity", .1)
                    .delay(0)
                    .duration(100);
                d3.select("#timeText".concat(d.id)).transition().attr("fill-opacity", .5)
                    .delay(0)
                    .duration(100);
            })

            .on("mouseout", function(d) {
                if (summaryHold === false) {
                    tabLeft(lefttab);
                }

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
            });

        // populating transformation dropdown
        var t = [];
        for (var j = 0; j < nodes.length; j++) {
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
            .text(function(d) {
                return d;
            });

        $('#transSel li').click(function(event) {
            // if 'interaction' is the selected function, don't show the function list again
            if (selInteract === true) {
                var n = $('#tInput').val().concat($(this).text());
                $('#tInput').val(n);
                event.stopPropagation();
                var t = transParse(n = n);
                if (t === null) {
                    return;
                }
                $(this).parent().fadeOut(100);
                transform(n = t.slice(0, t.length - 1), t = t[t.length - 1], typeTransform = false);
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
    }

    function mousedown(d) {
        // prevent I-bar on drag
        d3.event.preventDefault();
        // because :active only works in WebKit?
        svg.classed('active', true);
        if (d3.event.ctrlKey || mousedown_node || mousedown_link) {
            return;
        }
        restart();
    }

    function mousemove(d) {
        if (!mousedown_node) return;

        // update drag line
        drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y + 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);
    }

    function mouseup(d) {
        if (mousedown_node) {
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
    svg.attr('id', function() {
            return "whitespace".concat(myspace);
        })
        .attr('height', height)
        .on('mousedown', function() {
            mousedown(this);
        })
        .on('mouseup', function() {
            mouseup(this);
        });

    d3.select(window)
        .on('click', function() { //NOTE: all clicks will bubble here unless event.stopPropagation()
            $('#transList').fadeOut(100);
            $('#transSel').fadeOut(100);
        });

    restart(); // this is the call the restart that initializes the force.layout()
    fakeClick();
} // end layout

// returns id
var findNodeIndex = function(nodeName) {
    for (var i in allNodes) {
        if (allNodes[i]["name"] === nodeName) {
            return allNodes[i]["id"];
        }
    };
}

var nodeIndex = function(nodeName) {
    for (var i in nodes) {
        if (nodes[i]["name"] === nodeName) {
            return i;
        }
    }
}

var findNode = function(nodeName) {
    for (var i in allNodes) {
        if (allNodes[i]["name"] === nodeName) return allNodes[i]
    };
}

// function called by force button
function forceSwitch() {
    if (forcetoggle[0] === "true") {
        forcetoggle = ["false"];
    } else {
        forcetoggle = ["true"]
    }

    if (forcetoggle[0] === "false") {
        byId('btnForce').setAttribute("class", "btn active");
    } else {
        byId('btnForce').setAttribute("class", "btn btn-default");
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
    if (dataurl) {
        zparams.zdataurl = dataurl;
    }
    zparams.zmodelcount = modelCount;
    zparams.zedges = [];
    zparams.zvars = [];

    for (var j = 0; j < nodes.length; j++) { //populate zvars array
        zparams.zvars.push(nodes[j].name);
        var temp = nodes[j].id;

        zparams.zsetx[j] = allNodes[temp].setxvals;
        zparams.zsubset[j] = allNodes[temp].subsetrange;
    }

    for (var j = 0; j < links.length; j++) { //populate zedges array
        var srctgt = [];
        //correct the source target ordering for Zelig
        if (links[j].left === false) {
            srctgt = [links[j].source.name, links[j].target.name];
        } else {
            srctgt = [links[j].target.name, links[j].source.name];
        }
        zparams.zedges.push(srctgt);
    }
}

function estimate(btn) {
    if (production && zparams.zsessionid == "") {
        alert("Warning: Data download is not complete. Try again soon.");
        return;
    }

    zPop();
    // write links to file & run R CMD

    // package the output as JSON
    // add call history and package the zparams object as JSON
    zparams.callHistory = callHistory;
    var jsonout = JSON.stringify(zparams);

    var urlcall = rappURL + "zeligapp"; //base.concat(jsonout);
    var solajsonout = "solaJSON=" + jsonout;
    console.log("urlcall out: ", urlcall);
    console.log("POST out: ", solajsonout);

    zparams.allVars = valueKey.slice(10, 25); // this is because the URL is too long...
    var jsonout = JSON.stringify(zparams);
    //var selectorBase = rappURL+"selectorapp?solaJSON=";
    var selectorurlcall = rappURL + "selectorapp"; //.concat(jsonout);

    function estimateSuccess(btn, json) {
        estimateLadda.stop(); // stop spinner
        allResults.push(json);
        console.log(allResults);
        console.log("json in: ", json);

        var myparent = byId("results");
        if (estimated == false) {
            myparent.removeChild(byId("resultsHolder"));
        }

        estimated = true;
        d3.select("#results")
            .style("display", "block");

        d3.select("#resultsView")
            .style("display", "block");

        d3.select("#modelView")
            .style("display", "block");

        // programmatic click on Results button
        $("#btnResults").trigger("click");

        modelCount = modelCount + 1;
        var model = "Model".concat(modelCount);

        function modCol() {
            d3.select("#modelView")
                .selectAll("p")
                .style('background-color', hexToRgba(varColor));
        }
        modCol();

        d3.select("#modelView")
            .insert("p", ":first-child") // top stack for results
            .attr("id", model)
            .text(model)
            .style('background-color', hexToRgba(selVarColor))
            .on("click", function() {
                var a = this.style.backgroundColor.replace(/\s*/g, "");
                var b = hexToRgba(selVarColor).replace(/\s*/g, "");
                if (a.substr(0, 17) === b.substr(0, 17)) {
                    return; // escapes the function early if the displayed model is clicked
                }
                modCol();
                d3.select(this)
                    .style('background-color', hexToRgba(selVarColor));
                viz(this.id);
            });

        var rCall = [];
        rCall[0] = json.call;
        logArray.push("estimate: ".concat(rCall[0]));
        showLog();

        viz(model);
    }

    function estimateFail(btn) {
        estimateLadda.stop(); // stop spinner
        estimated = true;
    }

    function selectorSuccess(btn, json) {
        d3.select("#ticker")
            .text("Suggested variables and percent improvement on RMSE: " + json.vars);
        console.log("selectorSuccess: ", json);
    }

    function selectorFail(btn) {
        alert("Selector Fail");
    }

    estimateLadda.start(); // start spinner
    makeCorsRequest(urlcall, btn, estimateSuccess, estimateFail, solajsonout);
}

function dataDownload() {
    zPop();
    // write links to file & run R CMD

    //package the output as JSON
    // add call history and package the zparams object as JSON
    var jsonout = JSON.stringify(zparams);
    var btn = "nobutton";

    var urlcall = rappURL + "dataapp"; //base.concat(jsonout);
    var solajsonout = "solaJSON=" + jsonout;
    console.log("urlcall out: ", urlcall);
    console.log("POST out: ", solajsonout);

    function downloadSuccess(btn, json) {
        console.log("dataDownload json in: ", json);
        zparams.zsessionid = json.sessionid[0];

        // set the link URL
        if (production) {
            var logURL = rappURL + "log_dir/log_" + zparams.zsessionid + ".txt";
            byId("logID").href = logURL;
        } else {
            var logURL = "rook/log_" + zparams.zsessionid + ".txt";
            byId("logID").href = logURL;
        }

    }

    function downloadFail(btn) {
        console.log("Data have not been downloaded");
    }

    makeCorsRequest(urlcall, btn, downloadSuccess, downloadFail, solajsonout);
}

function viz(m) {
    var mym = +m.substr(5, 5) - 1;

    function removeKids(parent) {
        while (parent.firstChild) {
            parent.removeChild(parent.firstChild);
        }
    }

    var myparent = byId("resultsView");
    removeKids(myparent);

    var json = allResults[mym];

    // pipe in figures to right panel
    var filelist = new Array;
    for (var i in json.images) {
        var zfig = document.createElement("img");
        zfig.setAttribute("src", json.images[i]);
        zfig.setAttribute('width', 200);
        zfig.setAttribute('height', 200);
        byId("resultsView").appendChild(zfig);
    }

    // write the results table
    var resultsArray = [];
    for (var key in json.sumInfo) {
        if (key == "colnames") {
            continue;
        }

        obj = json.sumInfo[key];
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

    var table = d3.select("#resultsView")
        .append("p")
        .append("table");

    var thead = table.append("thead");
    thead.append("tr")
        .selectAll("th")
        .data(json.sumInfo.colnames)
        .enter()
        .append("th")
        .text(function(d) {
            return d;
        });

    var tbody = table.append("tbody");
    tbody.selectAll("tr")
        .data(resultsArray)
        .enter().append("tr")
        .selectAll("td")
        .data(function(d) {
            return d;
        })
        .enter().append("td")
        .text(function(d) {
            var myNum = Number(d);
            if (isNaN(myNum)) {
                return d;
            }
            return myNum.toPrecision(3);
        })
        .on("mouseover", function() {
            d3.select(this).style("background-color", "aliceblue")
        }) // for no discernable reason
        .on("mouseout", function() {
            d3.select(this).style("background-color", "#F9F9F9")
        }); //(but maybe we'll think of one)

    d3.select("#resultsView")
        .append("p")
        .html(function() {
            return "<b>Formula: </b>".concat(json.call[0]);
        });
}

// parses the transformation input. variable names are often nested inside one another, e.g., ethwar, war, wars, and so this is handled
function transParse(n) {
    var out2 = [];
    var t2 = n;
    var k2 = 0;
    var subMe2 = "_transvar".concat(k2);
    var indexed = [];

    // out2 is all matched variables, indexed is an array, each element is an object that contains the matched variables starting index and finishing index.  e.g., n="wars+2", out2=[war, wars], indexed=[{0,2},{0,3}]
    for (var i in valueKey) {
        var m2 = n.match(valueKey[i]);
        if (m2 !== null) {
            out2.push(m2[0]);
        }

        var re = new RegExp(valueKey[i], "g")
        var s = n.search(re);
        if (s != -1) {
            indexed.push({
                from: s,
                to: s + valueKey[i].length
            });
        }
    }

    // nested loop not good, but indexed is not likely to be very large.
    // if a variable is nested, it is removed from out2
    // notice, loop is backwards so that index changes don't affect the splice
    console.log("indexed ", indexed);
    for (var i = indexed.length - 1; i > -1; i--) {
        for (var j = indexed.length - 1; j > -1; j--) {
            if (i === j) {
                continue;
            }
            if ((indexed[i].from >= indexed[j].from) & (indexed[i].to <= indexed[j].to)) {
                console.log(i, " is nested in ", j);
                out2.splice(i, 1);
            }
        }
    }

    for (var i in out2) {
        t2 = t2.replace(out2[i], subMe2); //something that'll never be a variable name
        k2 = k2 + 1;
        subMe2 = "_transvar".concat(k2);
    }

    if (out2.length > 0) {
        out2.push(t2);
        console.log("new out ", out2);
        return (out2);
    } else {
        alert("No variable name found. Perhaps check your spelling?");
        return null;
    }
}

function transform(n, t, typeTransform) {
    if (production && zparams.zsessionid == "") {
        alert("Warning: Data download is not complete. Try again soon.");
        return;
    }

    if (!typeTransform) {
        t = t.replace("+", "_plus_"); // can't send the plus operator
    }

    console.log(n);
    console.log(t);

    var btn = byId('btnEstimate');

    var myn = allNodes[findNodeIndex(n[0])];
    if (typeof myn === "undefined") {
        var myn = allNodes[findNodeIndex(n)];
    }

    var outtypes = {
        varnamesTypes: n,
        interval: myn.interval,
        numchar: myn.numchar,
        nature: myn.nature,
        binary: myn.binary
    };

    console.log(myn);
    // if typeTransform but we already have the metadata
    if (typeTransform) {
        if (myn.nature == "nominal" & typeof myn.plotvalues !== "undefined") {
            myn.plottype = "bar";
            barsNode(myn);
            populatePopover();
            panelPlots();
            return;
        } else if (myn.nature != "nominal" & typeof myn.plotx !== "undefined") {
            myn.plottype = "continuous";
            densityNode(myn);
            populatePopover();
            panelPlots();
            return;
        }
    }

    //package the output as JSON
    var transformstuff = {
        zdataurl: dataurl,
        zvars: n,
        zsessionid: zparams.zsessionid,
        transform: t,
        callHistory: callHistory,
        typeTransform: typeTransform,
        typeStuff: outtypes
    };
    var jsonout = JSON.stringify(transformstuff);
    var urlcall = rappURL + "transformapp";
    var solajsonout = "solaJSON=" + jsonout;
    console.log("urlcall out: ", urlcall);
    console.log("POST out: ", solajsonout);

    function transformSuccess(btn, json) {
        estimateLadda.stop();
        console.log("json in: ", json);
        if (json.typeTransform[0]) {
            d3.json(json.url, (error, json) => {
                if (error)
										return console.warn(error);
                var jsondata = json;
                for (var key in jsondata) {
                    var myIndex = findNodeIndex(key);
                    jQuery.extend(true, allNodes[myIndex], jsondata[key]);
                    if (allNodes[myIndex].plottype === "continuous") densityNode(allNodes[myIndex]);
                    else if (allNodes[myIndex].plottype === "bar") barsNode(allNodes[myIndex]);
                }
                fakeClick();
                populatePopover();
                panelPlots();
                console.log(allNodes[myIndex]);
            });
        } else {
            callHistory.push({
                func: "transform",
                zvars: n,
                transform: t
            });

            var subseted = false;
            var rCall = [];
            rCall[0] = json.call;
            var newVar = rCall[0][0];
            trans.push(newVar);

            d3.json(json.url, function(error, json) {
                if (error) return console.warn(error);
                var jsondata = json;

                for (var key in jsondata) {
                    var myIndex = findNodeIndex(key);
                    if (typeof myIndex !== "undefined") {
                        alert("Invalid transformation: this variable name already exists.");
                        return;
                    }
                    // add transformed variable to the current space
                    var i = allNodes.length;
                    var obj1 = {
                        id: i,
                        reflexive: false,
                        "name": key,
                        "labl": "transformlabel",
                        data: [5, 15, 20, 0, 5, 15, 20],
                        count: [.6, .2, .9, .8, .1, .3, .4],
                        "nodeCol": colors(i),
                        "baseCol": colors(i),
                        "strokeColor": selVarColor,
                        "strokeWidth": "1",
                        "subsetplot": false,
                        "subsetrange": ["", ""],
                        "setxplot": false,
                        "setxvals": ["", ""],
                        "grayout": false,
                        "defaultInterval": jsondata[key]["interval"],
                        "defaultNumchar": jsondata[key]["numchar"],
                        "defaultNature": jsondata[key]["nature"],
                        "defaultBinary": jsondata[key]["binary"]
                    };

                    jQuery.extend(true, obj1, jsondata[key]);
                    allNodes.push(obj1);

                    scaffoldingPush(rCall[0]);
                    valueKey.push(newVar);
                    nodes.push(allNodes[i]);
                    fakeClick();
                    panelPlots();

                    if (allNodes[i].plottype === "continuous") {
                        densityNode(allNodes[i]);
                    } else if (allNodes[i].plottype === "bar") {
                        barsNode(allNodes[i]);
                    }
                } //for


            });

            // update the log
            logArray.push("transform: ".concat(rCall[0]));
            showLog();
        }
    }

    function transformFail(btn) {
        alert("transform fail");
        estimateLadda.stop();
    }

    estimateLadda.start(); // start spinner
    makeCorsRequest(urlcall, btn, transformSuccess, transformFail, solajsonout);
}

function scaffoldingPush(v) { // adding a variable to the variable list after a transformation
    d3.select("#tab1")
        .data(v)
        .append("p")
        .attr("id", function() {
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
        .on("click", function varClick() { // we've added a new variable, so we need to add the listener
            d3.select(this)
                .style('background-color', function(d) {
                    var myText = d3.select(this).text();
                    var myColor = d3.select(this).style('background-color');
                    var mySC = allNodes[findNodeIndex(myText)].strokeColor;

                    zparams.zvars = []; //empty the zvars array
                    if (d3.rgb(myColor).toString() === varColor.toString()) { // we are adding a var
                        if (nodes.length == 0) {
                            nodes.push(findNode(myText));
                            nodes[0].reflexive = true;
                        } else {
                            nodes.push(findNode(myText));
                        }
                        return hexToRgba(selVarColor);
                    } else { // dropping a variable

                        nodes.splice(findNode(myText)["index"], 1);
                        spliceLinksForNode(findNode(myText));

                        if (mySC == dvColor) {
                            var dvIndex = zparams.zdv.indexOf(myText);
                            if (dvIndex > -1) {
                                zparams.zdv.splice(dvIndex, 1);
                            }
                        } else if (mySC == csColor) {
                            var csIndex = zparams.zcross.indexOf(myText);
                            if (csIndex > -1) {
                                zparams.zcross.splice(csIndex, 1);
                            }
                        } else if (mySC == timeColor) {
                            var timeIndex = zparams.ztime.indexOf(myText);
                            if (timeIndex > -1) {
                                zparams.ztime.splice(dvIndex, 1);
                            }
                        } else if (mySC == nomColor) {
                            var nomIndex = zparams.znom.indexOf(myText);
                            if (nomIndex > -1) {
                                zparams.znom.splice(dvIndex, 1);
                            }
                        }

                        nodeReset(allNodes[findNodeIndex(myText)]);
                        borderState();
                        return varColor;
                    }
                });
            fakeClick();
            panelPlots();
        });
    populatePopover(); // pipes in the summary stats

    // drop down menu for tranformation toolbar
    d3.select("#transSel")
        .data(v)
        .append("option")
        .text(function(d) {
            return d;
        });
}

// below from http://www.html5rocks.com/en/tutorials/cors/ for cross-origin resource sharing
// Create the XHR object.
function createCORSRequest(method, url, callback) {
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
    // xhr.setRequestHeader('Content-Type', 'text/plain');
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    return xhr;
}

// Make the actual CORS request.
function makeCorsRequest(url, btn, callback, warningcallback, jsonstring) {
    var xhr = createCORSRequest('POST', url);
    if (!xhr) {
        alert('CORS not supported');
        return;
    }
    // Response handlers for asynchronous load
    // onload or onreadystatechange?

    xhr.onload = function() {
        var text = xhr.responseText;
        console.log("text ", text);

        try {
            var json = JSON.parse(text); // should wrap in try / catch
            var names = Object.keys(json);
        } catch (err) {
            estimateLadda.stop();
            selectLadda.stop();
            console.log(err);
            alert('Error: Could not parse incoming JSON.');
        }

        if (names[0] == "warning") {
            warningcallback(btn);
            alert("Warning: " + json.warning);
        } else {
            callback(btn, json);
        }
    };
    xhr.onerror = function() {
        // note: xhr.readystate should be 4, and status should be 200.  a status of 0 occurs when the url becomes too large
        if (xhr.status == 0) {
            alert('There was an error making the request. xmlhttprequest status is 0.');
        } else if (xhr.readyState != 4) {
            alert('There was an error making the request. xmlhttprequest readystate is not 4.');
        } else {
            alert('Woops, there was an error making the request.');
        }
        console.log(xhr);
        estimateLadda.stop();
        selectLadda.stop();
    };
    xhr.send(jsonstring);
}

function legend(c) {
    if (zparams.ztime.length != 0 | zparams.zcross.length != 0 | zparams.zdv.length != 0 | zparams.znom.length != 0) {
        byId("legend").setAttribute("style", "display:block");
    } else {
        byId("legend").setAttribute("style", "display:none");
    }
    if (zparams.ztime.length == 0) {
        byId("timeButton").setAttribute("class", "clearfix hide");
    } else {
        byId("timeButton").setAttribute("class", "clearfix show");
    }
    if (zparams.zcross.length == 0) {
        byId("csButton").setAttribute("class", "clearfix hide");
    } else {
        byId("csButton").setAttribute("class", "clearfix show");
    }
    if (zparams.zdv.length == 0) {
        byId("dvButton").setAttribute("class", "clearfix hide");
    } else {
        byId("dvButton").setAttribute("class", "clearfix show");
    }
    if (zparams.znom.length == 0) {
        byId("nomButton").setAttribute("class", "clearfix hide");
    } else {
        byId("nomButton").setAttribute("class", "clearfix show");
    }
    borderState();
}

function reset() {
    location.reload();
}

// programmatically deselecting every selected variable...
function erase() {
    leftpanelMedium();
    rightpanelMedium();
    byId("legend").setAttribute("style", "display:none");
    tabLeft('tab1');
    jQuery.fn.d3Click = () => {
        this.children().each((i, e) => {
            var mycol = d3.rgb(this.style.backgroundColor);
            if (mycol.toString() === varColor.toString())
                return;
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
function loadXMLDoc(XMLname) {
    var xmlDoc;
    if (window.XMLHttpRequest) {
        xmlDoc = new window.XMLHttpRequest();
        xmlDoc.open("GET", XMLname, false);
        xmlDoc.send("");
        return xmlDoc.responseXML;
    }
    // IE 5 and IE 6
    else if (ActiveXObject("Microsoft.XMLDOM")) {
        xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
        xmlDoc.async = false;
        xmlDoc.load(XMLname);
        return xmlDoc;
    }
    alert("Error loading document!");
    return null;
}

export function tabLeft(tab) {
    if (tab != "tab3") {
        lefttab = tab;
    }
    var tabi = tab.substring(3);
    byId('tab1').style.display = 'none';
    byId('tab2').style.display = 'none';
    byId('tab3').style.display = 'none';
    if (tab === "tab1") {
        summaryHold = false;
        byId('btnSubset').setAttribute("class", "btn btn-default");
        byId('btnVariables').setAttribute("class", "btn active");
        byId("btnSelect").style.display = 'none';
        d3.select("#leftpanel")
            .attr("class", "sidepanel container clearfix");
    } else if (tab === "tab2") {
        summaryHold = false;
        byId('btnVariables').setAttribute("class", "btn btn-default");
        byId('btnSubset').setAttribute("class", "btn active");
        d3.select("#leftpanel")
            .attr("class", function(d) {
                if (this.getAttribute("class") === "sidepanel container clearfix expandpanel") {
                    byId("btnSelect").style.display = 'none';
                    return "sidepanel container clearfix";
                } else {
                    byId("btnSelect").style.display = 'block';
                    return "sidepanel container clearfix expandpanel";
                }
            });
    } else {
        byId('btnSubset').setAttribute("class", "btn btn-default");
        byId('btnVariables').setAttribute("class", "btn btn-default");
        d3.select("#leftpanel")
            .attr("class", "sidepanel container clearfix");
    }
    byId(tab).style.display = 'block';
}

function tabRight(tabid) {
    byId('models').style.display = 'none';
    byId('setx').style.display = 'none';
    byId('results').style.display = 'none';
    if (tabid == "btnModels") {
        byId('btnSetx').setAttribute("class", "btn btn-default");
        byId('btnResults').setAttribute("class", "btn btn-default");
        byId('btnModels').setAttribute("class", "btn active");
        byId('models').style.display = 'block';
        d3.select("#rightpanel")
            .attr("class", "sidepanel container clearfix");
    } else if (tabid == "btnSetx") {
        byId('btnModels').setAttribute("class", "btn btn-default");
        byId('btnResults').setAttribute("class", "btn btn-default");
        byId('btnSetx').setAttribute("class", "btn active");
        byId('setx').style.display = 'block';
        if (righttab == "btnSetx" | d3.select("#rightpanel").attr("class") == "sidepanel container clearfix") {
            toggleR()
        };
    } else if (tabid == "btnResults") {
        byId('btnModels').setAttribute("class", "btn btn-default");
        byId('btnSetx').setAttribute("class", "btn btn-default");
        byId('btnResults').setAttribute("class", "btn active");
        byId('results').style.display = 'block';
        if (estimated === false) {
            d3.select("#rightpanel")
                .attr("class", "sidepanel container clearfix");
        } else if (righttab == "btnResults" | d3.select("#rightpanel").attr("class") == "sidepanel container clearfix") {
            toggleR()
        };
    }

    righttab = tabid;
    function toggleR() {
        d3.select("#rightpanel")
            .attr("class", d => {
                if (this.getAttribute("class") === "sidepanel container clearfix expandpanel")
                    return "sidepanel container clearfix";
                return "sidepanel container clearfix expandpanel";
            });
    }
}

function varSummary(d) {
    var rint = d3.format("r");
    var summarydata = [],
        tmpDataset = [],
        t1 = ["Mean:", "Median:", "Most Freq:", "Occurrences:", "Median Freq:", "Occurrences:", "Least Freq:", "Occurrences:", "Stand.Dev:", "Minimum:", "Maximum:", "Invalid:", "Valid:", "Uniques:", "Herfindahl:"],
        t2 = [(+d.mean).toPrecision(4).toString(), (+d.median).toPrecision(4).toString(), d.mode, rint(d.freqmode), d.mid, rint(d.freqmid), d.fewest, rint(d.freqfewest), (+d.sd).toPrecision(4).toString(), (+d.min).toPrecision(4).toString(), (+d.max).toPrecision(4).toString(), rint(d.invalid), rint(d.valid), rint(d.uniques), (+d.herfindahl).toPrecision(4).toString()],
        i, j;
    if (priv) {
        if (d.meanCI) {
            t1 = ["Mean:", "Median:", "Most Freq:", "Occurrences:", "Median Freq:", "Occurrences:", "Least Freq:", "Occurrences:", "Stand.Dev:", "Minimum:", "Maximum:", "Invalid:", "Valid:", "Uniques:", "Herfindahl:"],
            t2 = [(+d.mean).toPrecision(2).toString() + " (" + (+d.meanCI.lowerBound).toPrecision(2).toString() + " - " + (+d.meanCI.upperBound).toPrecision(2).toString() + ")", (+d.median).toPrecision(4).toString(), d.mode, rint(d.freqmode), d.mid, rint(d.freqmid), d.fewest, rint(d.freqfewest), (+d.sd).toPrecision(4).toString(), (+d.min).toPrecision(4).toString(), (+d.max).toPrecision(4).toString(), rint(d.invalid), rint(d.valid), rint(d.uniques), (+d.herfindahl).toPrecision(4).toString()],
            i, j;
        }
    }

    for (i = 0; i < t1.length; i++) {
        if (t2[i].indexOf("NaN") > -1 | t2[i] == "NA" | t2[i] == "")
						continue;
        tmpDataset = [];
        tmpDataset.push(t1[i]);
        tmpDataset.push(t2[i]);
        summarydata.push(tmpDataset);
    };

    d3.select("#tab3") // tab when you mouseover a pebble
        .select("p")
        .html("<center><b>" + d.name + "</b><br><i>" + d.labl + "</i></center>")
        .append("table")
        .selectAll("tr")
        .data(summarydata)
        .enter().append("tr")
        .selectAll("td")
        .data(d => d)
        .enter().append("td")
        .text(d => d)
        .on("mouseover", () => d3.select(this).style("background-color", "aliceblue"))
        .on("mouseout", () => d3.select(this).style("background-color", "#F9F9F9"));

    var plotsvg = d3.select("#tab3")
        .selectAll("svg")
        .remove();

    if (typeof d.plottype === "undefined") // .properties is undefined for some vars
        return;
    else if (d.plottype === "continuous") density(d, div = "varSummary", priv);
    else if (d.plottype === "bar") bars(d, div = "varSummary", priv);
    else {
        var plotsvg = d3.select("#tab3") // no graph to draw, but still need to remove previous graph
            .selectAll("svg")
            .remove();
    };
}

function populatePopover() {
    d3.select("#tab1").selectAll("p")
        .attr("data-content", d => popoverContent(allNodes[findNodeIndex(d)]));
}

function popoverContent(d) {
    var rint = d3.format("r");
    var outtext = "";
    if (d.labl != "") {
        outtext = outtext + "<div class='form-group'><label class='col-sm-4 control-label'>Label</label><div class='col-sm-6'><p class='form-control-static'><i>" + d.labl + "</i></p></div></div>";
    }
    if (d.mean != "NA") {
        outtext = outtext + "<div class='form-group'><label class='col-sm-4 control-label'>Mean</label><div class='col-sm-6'><p class='form-control-static'>"
        if (priv && d.meanCI) {
            outtext += (+d.mean).toPrecision(2).toString() + " (" + (+d.meanCI.lowerBound).toPrecision(2).toString() + " - " + (+d.meanCI.upperBound).toPrecision(2).toString() + ")"
        } else {
            outtext += (+d.mean).toPrecision(4).toString()
        }
        outtext += "</p></div></div>";
    }
    if (d.median != "NA") {
        outtext = outtext + "<div class='form-group'><label class='col-sm-4 control-label'>Median</label><div class='col-sm-6'><p class='form-control-static'>" + (+d.median).toPrecision(4).toString() + "</p></div></div>";
    }
    if (d.mode != "NA") {
        outtext = outtext + "<div class='form-group'><label class='col-sm-4 control-label'>Most Freq</label><div class='col-sm-6'><p class='form-control-static'>" + d.mode + "</p></div></div>";
    }
    if (d.freqmode != "NA") {
        outtext = outtext + "<div class='form-group'><label class='col-sm-4 control-label'>Occurrences</label><div class='col-sm-6'><p class='form-control-static'>" + rint(d.freqmode) + "</p></div></div>";
    }
    if (d.mid != "NA") {
        outtext = outtext + "<div class='form-group'><label class='col-sm-4 control-label'>Median Freq</label><div class='col-sm-6'><p class='form-control-static'>" + d.mid + "</p></div></div>";
    }
    if (d.freqmid != "NA") {
        outtext = outtext + "<div class='form-group'><label class='col-sm-4 control-label'>Occurrences</label><div class='col-sm-6'><p class='form-control-static'>" + rint(d.freqmid) + "</p></div></div>";
    }
    if (d.fewest != "NA") {
        outtext = outtext + "<div class='form-group'><label class='col-sm-4 control-label'>Least Freq</label><div class='col-sm-6'><p class='form-control-static'>" + d.fewest + "</p></div></div>";
    }
    if (d.freqfewest != "NA") {
        outtext = outtext + "<div class='form-group'><label class='col-sm-4 control-label'>Occurrences</label><div class='col-sm-6'><p class='form-control-static'>" + rint(d.freqfewest) + "</p></div></div>";
    }
    if (d.sd != "NA") {
        outtext = outtext + "<div class='form-group'><label class='col-sm-4 control-label'>Stand Dev</label><div class='col-sm-6'><p class='form-control-static'>" + (+d.sd).toPrecision(4).toString() + "</p></div></div>";
    }
    if (d.max != "NA") {
        outtext = outtext + "<div class='form-group'><label class='col-sm-4 control-label'>Maximum</label><div class='col-sm-6'><p class='form-control-static'>" + (+d.max).toPrecision(4).toString() + "</p></div></div>";
    }
    if (d.min != "NA") {
        outtext = outtext + "<div class='form-group'><label class='col-sm-4 control-label'>Minimum</label><div class='col-sm-6'><p class='form-control-static'>" + (+d.min).toPrecision(4).toString() + "</p></div></div>";
    }
    if (d.invalid != "NA") {
        outtext = outtext + "<div class='form-group'><label class='col-sm-4 control-label'>Invalid</label><div class='col-sm-6'><p class='form-control-static'>" + rint(d.invalid) + "</p></div></div>";
    }
    if (d.valid != "NA") {
        outtext = outtext + "<div class='form-group'><label class='col-sm-4 control-label'>Valid</label><div class='col-sm-6'><p class='form-control-static'>" + rint(d.valid) + "</p></div></div>";
    }
    if (d.uniques != "NA") {
        outtext = outtext + "<div class='form-group'><label class='col-sm-4 control-label'>Uniques</label><div class='col-sm-6'><p class='form-control-static'>" + rint(d.uniques) + "</p></div></div>";
    }
    if (d.herfindahl != "NA") {
        outtext = outtext + "<div class='form-group'><label class='col-sm-4 control-label'>Herfindahl</label><div class='col-sm-6'><p class='form-control-static'>" + (+d.herfindahl).toPrecision(4).toString() + "</p></div></div>";
    }
    return outtext;
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
            "<div class='form-group'><label class='col-sm-4 control-label'>Mode</label><div class='col-sm-6'><p class='form-control-static'>" + d.mode + "</p></div></div>" +
            "<div class='form-group'><label class='col-sm-4 control-label'>Stand Dev</label><div class='col-sm-6'><p class='form-control-static'>" + tsf(d.sd) + "</p></div></div>" +
            "<div class='form-group'><label class='col-sm-4 control-label'>Maximum</label><div class='col-sm-6'><p class='form-control-static'>" + tsf(d.max) + "</p></div></div>" +
            "<div class='form-group'><label class='col-sm-4 control-label'>Minimum</label><div class='col-sm-6'><p class='form-control-static'>" + tsf(d.min) + "</p></div></div>" +
            "<div class='form-group'><label class='col-sm-4 control-label'>Valid</label><div class='col-sm-6'><p class='form-control-static'>" + rint(d.valid) + "</p></div></div>" +
            "<div class='form-group'><label class='col-sm-4 control-label'>Invalid</label><div class='col-sm-6'><p class='form-control-static'>" + rint(d.invalid) + "</p></div></div>"
        );
}

function panelPlots() {
    // build arrays from nodes in main
    var varArray = [];
    var idArray = [];
    for (var j = 0; j < nodes.length; j++) {
        varArray.push(nodes[j].name.replace(/\(|\)/g, ""));
        idArray.push(nodes[j].id);
    }

    //remove all plots, could be smarter here
    d3.select("#setx").selectAll("svg").remove();
    d3.select("#tab2").selectAll("svg").remove();
    for (var i = 0; i < varArray.length; i++) {
        allNodes[idArray[i]].setxplot = false;
        allNodes[idArray[i]].subsetplot = false;
        if (allNodes[idArray[i]].plottype === "continuous" & allNodes[idArray[i]].setxplot == false) {
            allNodes[idArray[i]].setxplot = true;
            console.log(priv);
            density(allNodes[idArray[i]], div = "setx", priv);
            allNodes[idArray[i]].subsetplot = true;
            density(allNodes[idArray[i]], div = "subset", priv);
        } else if (allNodes[idArray[i]].plottype === "bar" & allNodes[idArray[i]].setxplot == false) {
            allNodes[idArray[i]].setxplot = true;
            bars(allNodes[idArray[i]], div = "setx", priv);
            allNodes[idArray[i]].subsetplot = true;
            barsSubset(allNodes[idArray[i]]);
        }
    }

    d3.select("#setx").selectAll("svg")
        .each(() => {
            d3.select(this);
            var regstr = /(.+)_setx_(\d+)/;
            var myname = regstr.exec(this.id);
            var nodeid = myname[2];
            myname = myname[1];
            var j = varArray.indexOf(myname);
            if (j == -1) {
                allNodes[nodeid].setxplot = false;
                var temp = "#".concat(myname, "_setx_", nodeid);
                d3.select(temp)
                    .remove();
                allNodes[nodeid].subsetplot = false;
                var temp = "#".concat(myname, "_tab2_", nodeid);
                d3.select(temp)
                    .remove();
            }
        });
}

// easy functions to collapse panels to base
function rightpanelMedium() {
    d3.select("#rightpanel")
        .attr("class", "sidepanel container clearfix");
}

function leftpanelMedium() {
    d3.select("#leftpanel")
        .attr("class", "sidepanel container clearfix");
}

// function to convert color codes
function hexToRgba(hex) {
    var h = hex.replace('#', '');
    var bigint = parseInt(h, 16);
    var r = (bigint >> 16) & 255;
    var g = (bigint >> 8) & 255;
    var b = bigint & 255;
    var a = '0.5';
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
}

// function takes a node and a color and updates zparams
function setColors(n, c) {

    if (n.strokeWidth == '1') { // adding time, cs, dv, nom to a node with no stroke
        n.strokeWidth = '4';
        n.strokeColor = c;
        n.nodeCol = taggedColor;
        if (dvColor == c) {
            // check if array, if not, make it an array
            //  console.log(Object.prototype.toString.call(zparams.zdv));
            zparams.zdv = Object.prototype.toString.call(zparams.zdv) == "[object Array]" ? zparams.zdv : [];
            zparams.zdv.push(n.name);
        } else if (csColor == c) {
            zparams.zcross = Object.prototype.toString.call(zparams.zcross) == "[object Array]" ? zparams.zcross : [];
            zparams.zcross.push(n.name);
        } else if (timeColor == c) {
            zparams.ztime = Object.prototype.toString.call(zparams.ztime) == "[object Array]" ? zparams.ztime : [];
            zparams.ztime.push(n.name);
        } else if (nomColor == c) {
            zparams.znom = Object.prototype.toString.call(zparams.znom) == "[object Array]" ? zparams.znom : [];
            zparams.znom.push(n.name);
            allNodes[findNodeIndex(n.name)].nature = "nominal";
            transform(n.name, t = null, typeTransform = true);
        }

        d3.select("#tab1").select("p#".concat(n.name))
            .style('background-color', hexToRgba(c));
    } else if (n.strokeWidth == '4') {
        if (c == n.strokeColor) { // deselecting time, cs, dv, nom
            n.strokeWidth = '1';
            n.strokeColor = selVarColor;
            n.nodeCol = colors(n.id);
            d3.select("#tab1").select("p#".concat(n.name))
                .style('background-color', hexToRgba(selVarColor));

            if (dvColor == c) {
                var dvIndex = zparams.zdv.indexOf(n.name);
                if (dvIndex > -1) zparams.zdv.splice(dvIndex, 1);
            } else if (csColor == c) {
                var csIndex = zparams.zcross.indexOf(n.name);
                if (csIndex > -1) zparams.zcross.splice(csIndex, 1);
            } else if (timeColor == c) {
                var timeIndex = zparams.ztime.indexOf(n.name);
                if (timeIndex > -1) zparams.ztime.splice(timeIndex, 1);
            } else if (nomColor == c) {
                var nomIndex = zparams.znom.indexOf(n.name);
                if (nomIndex > -1) {
                    zparams.znom.splice(nomIndex, 1);
                    allNodes[findNodeIndex(n.name)].nature = allNodes[findNodeIndex(n.name)].defaultNature;
                    transform(n.name, t = null, typeTransform = true);
                }
            }
        } else { // deselecting time, cs, dv, nom AND changing it to time, cs, dv, nom
            if (dvColor == n.strokeColor) {
                var dvIndex = zparams.zdv.indexOf(n.name);
                if (dvIndex > -1) zparams.zdv.splice(dvIndex, 1);
            } else if (csColor == n.strokeColor) {
                var csIndex = zparams.zcross.indexOf(n.name);
                if (csIndex > -1) zparams.zcross.splice(csIndex, 1);
            } else if (timeColor == n.strokeColor) {
                var timeIndex = zparams.ztime.indexOf(n.name);
                if (timeIndex > -1) zparams.ztime.splice(timeIndex, 1);
            } else if (nomColor == n.strokeColor) {
                var nomIndex = zparams.znom.indexOf(n.name);
                if (nomIndex > -1) {
                    zparams.znom.splice(nomIndex, 1);
                    allNodes[findNodeIndex(n.name)].nature = allNodes[findNodeIndex(n.name)].defaultNature;
                    transform(n.name, t = null, typeTransform = true);
                }
            }
            n.strokeColor = c;
            d3.select("#tab1").select("p#".concat(n.name))
                .style('background-color', hexToRgba(c));

            if (dvColor == c) zparams.zdv.push(n.name);
            else if (csColor == c) zparams.zcross.push(n.name);
            else if (timeColor == c) zparams.ztime.push(n.name);
            else if (nomColor == c) {
                zparams.znom.push(n.name);
                allNodes[findNodeIndex(n.name)].nature = "nominal";
                transform(n.name, t = null, typeTransform = true);
            }
        }
    }
}

function borderState() {
    if (zparams.zdv.length > 0) {
        $('#dvButton .rectColor svg circle').attr('stroke', dvColor);
    } else {
        $('#dvButton').css('border-color', '#ccc');
    }
    if (zparams.zcross.length > 0) {
        $('#csButton .rectColor svg circle').attr('stroke', csColor);
    } else {
        $('#csButton').css('border-color', '#ccc');
    }
    if (zparams.ztime.length > 0) {
        $('#timeButton .rectColor svg circle').attr('stroke', timeColor);
    } else {
        $('#timeButton').css('border-color', '#ccc');
    }
    if (zparams.znom.length > 0) {
        $('#nomButton .rectColor svg circle').attr('stroke', nomColor);
    } else {
        $('#nomButton').css('border-color', '#ccc');
    }
}

// small appearance resets, but perhaps this will become a hard reset back to all original allNode values?
function nodeReset(n) {
    n.strokeColor = selVarColor;
    n.strokeWidth = "1";
    n.nodeCol = n.baseCol;
}

function subsetSelect(btn) {
    if (dataurl) {
        zparams.zdataurl = dataurl;
    }
    if (production && zparams.zsessionid == "") {
        alert("Warning: Data download is not complete. Try again soon.");
        return;
    }
    zparams.zvars = [];
    zparams.zplot = [];
    var subsetEmpty = true;
    // is this the same as zPop()?
    for (var j = 0; j < nodes.length; j++) { // populate zvars and zsubset arrays
        zparams.zvars.push(nodes[j].name);
        var temp = nodes[j].id;
        zparams.zsubset[j] = allNodes[temp].subsetrange;
        if (zparams.zsubset[j].length > 0) {
            if (zparams.zsubset[j][0] != "") {
                zparams.zsubset[j][0] = Number(zparams.zsubset[j][0]);
            }
            if (zparams.zsubset[j][1] != "") {
                zparams.zsubset[j][1] = Number(zparams.zsubset[j][1]);
            }
        }
        zparams.zplot.push(allNodes[temp].plottype);
        if (zparams.zsubset[j][1] != "") {
            subsetEmpty = false;
        } // only need to check one
    }

    if (subsetEmpty == true) {
        alert("Warning: No new subset selected.");
        return;
    }

    var outtypes = [];
    for (var j = 0; j < allNodes.length; j++) {
        outtypes.push({
            varnamesTypes: allNodes[j].name,
            nature: allNodes[j].nature,
            numchar: allNodes[j].numchar,
            binary: allNodes[j].binary,
            interval: allNodes[j].interval
        });
    }

    var subsetstuff = {
        zdataurl: zparams.zdataurl,
        zvars: zparams.zvars,
        zsubset: zparams.zsubset,
        zsessionid: zparams.zsessionid,
        zplot: zparams.zplot,
        callHistory: callHistory,
        typeStuff: outtypes
    };

    var jsonout = JSON.stringify(subsetstuff);
    var urlcall = rappURL + "subsetapp";
    var solajsonout = "solaJSON=" + jsonout;
    console.log("urlcall out: ", urlcall);
    console.log("POST out: ", solajsonout);

    function subsetSelectSuccess(btn, json) {
        selectLadda.stop(); // stop motion
        $("#btnVariables").trigger("click"); // programmatic clicks
        $("#btnModels").trigger("click");

        var grayOuts = [];
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
        var myHistory = jQuery.extend(true, [], callHistory);

        spaces[myspace] = {
            "allNodes": myNodes,
            "zparams": myParams,
            "trans": myTrans,
            "force": myForce,
            "preprocess": myPreprocess,
            "logArray": myLog,
            "callHistory": myHistory
        };

        // remove pre-subset svg
        var selectMe = "#m".concat(myspace);
        d3.select(selectMe).attr('class', 'item');
        selectMe = "#whitespace".concat(myspace);
        d3.select(selectMe).remove();

        myspace = spaces.length;
        callHistory.push({
            func: "subset",
            zvars: jQuery.extend(true, [], zparams.zvars),
            zsubset: jQuery.extend(true, [], zparams.zsubset),
            zplot: jQuery.extend(true, [], zparams.zplot)
        });

        // this is to be used to gray out and remove listeners for variables that have been subsetted out of the data
        function varOut(v) {
            // if in nodes, remove gray out in left panel
            // make unclickable in left panel
            for (var i = 0; i < v.length; i++) {
                var selectMe = v[i].replace(/\W/g, "_");
                byId(selectMe).style.color = hexToRgba(grayColor);
                selectMe = "p#".concat(selectMe);
                d3.select(selectMe)
                    .on("click", null);
            }
        }

        logArray.push("subset: ".concat(rCall[0]));
        showLog();
        reWriteLog();

        d3.select("#innercarousel")
            .append('div')
            .attr('class', 'item active')
            .attr('id', () => "m".concat(myspace.toString()))
            .append('svg')
            .attr('id', 'whitespace');
        svg = d3.select("#whitespace");

        d3.json(json.url, function(error, json) {
            if (error)
								return console.warn(error);
            var jsondata = json;
            for (var key in jsondata) {
                var myIndex = findNodeIndex(key);
                allNodes[myIndex].plotx = undefined;
                allNodes[myIndex].ploty = undefined;
                allNodes[myIndex].plotvalues = undefined;
                allNodes[myIndex].plottype = "";

                jQuery.extend(true, allNodes[myIndex], jsondata[key]);
                allNodes[myIndex].subsetplot = false;
                allNodes[myIndex].subsetrange = ["", ""];
                allNodes[myIndex].setxplot = false;
                allNodes[myIndex].setxvals = ["", ""];

                if (allNodes[myIndex].valid == 0) {
                    grayOuts.push(allNodes[myIndex].name);
                    allNodes[myIndex].grayout = true;
                }
            }

            rePlot();
            populatePopover();
            layout(v = "add");
        });

        varOut(grayOuts);
    }

    function subsetSelectFail(btn) {
        selectLadda.stop(); //stop motion
    }

    selectLadda.start(); //start button motion
    makeCorsRequest(urlcall, btn, subsetSelectSuccess, subsetSelectFail, solajsonout);
}

function readPreprocess(url, p, v, callback) {
    console.log(url);
    d3.json(url, function(error, json) {
        if (error) return console.warn(error);
        var jsondata = json;

        console.log("inside readPreprocess function");
        console.log(jsondata);
        console.log(jsondata["variables"]);

        if (jsondata.dataset.priv) {
            priv = jsondata["dataset"]["priv"];
        };

        //copying the object
        for (var key in jsondata["variables"]) {
            p[key] = jsondata["variables"][key];
        }

        if (typeof callback === "function") {
            callback();
        }
    });
}

function about() {
    $('#about').show();
}

function closeabout() {
    $('#about').hide();
}

function opencite() {
    $('#cite').show();
}

function closecite(toggle) {
    if (toggle == false) $('#cite').hide();
}

function clickcite(toggle) {
    if (toggle == false) {
        $('#cite').show();
        return true;
    } else {
        $('#cite').hide();
        return false;
    }
}

// removes all the children svgs inside subset and setx divs
function rePlot() {
    d3.select("#tab2")
        .selectAll("svg")
        .remove();
    d3.select("#setx")
        .selectAll("svg")
        .remove();
    for (var i = 0; i < allNodes.length; i++) {
        allNodes[i].setxplot = false;
        allNodes[i].subsetplot = false;
    }
}

function showLog() {
    if (logArray.length > 0) {
        byId('logdiv').setAttribute("style", "display:block");
        d3.select("#collapseLog div.panel-body").selectAll("p")
            .data(logArray)
            .enter()
            .append("p")
            .text(d => d);
    } else {
        byId('logdiv').setAttribute("style", "display:none");
    }
}

function reWriteLog() {
    d3.select("#collapseLog div.panel-body").selectAll("p")
        .remove();
    d3.select("#collapseLog div.panel-body").selectAll("p")
        .data(logArray)
        .enter()
        .append("p")
        .text(d => d);
}

// acts as if the user clicked in whitespace. useful when restart() is outside of scope
function fakeClick() {
    var myws = "#whitespace".concat(myspace);
    // d3 and programmatic events don't mesh well, here's a SO workaround that looks good but uses jquery...
    jQuery.fn.d3Click = () => {
        this.each((i, e) => {
            var evt = document.createEvent("MouseEvents");
            evt.initMouseEvent("mousedown", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            e.dispatchEvent(evt);
        });
    };
    $(myws).d3Click();
    d3.select(myws)
        .classed('active', false);
}
