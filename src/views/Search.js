import m from 'mithril';

import * as app from '../app';
import {selVarColor} from '../plots';

class Search {
    view(vnode) {
        return m('input#searchvar.form-control[type=text][placeholder=Search variables and labels][style=width: 100%; margin-bottom: 5px]', vnode.attrs);
    }

}

export default Search;

export let search = val => {
    $('#tab1').children().popover('hide');
    let all = app.allNodes;
    if (val === '')
        return updatedata(all.map(n => n.name), [], 0);
    val = val.toLowerCase();
    let matches = all.filter(n => n.name.toLowerCase().includes(val) ||
                                  n.labl.toLowerCase().includes(val));
    let names = matches
        .concat(all.filter(n => !matches.includes(n)))
        .map(n => n.name);
	  updatedata(names, matches, 1);
};

function addlistener(nodes){
	  d3.select("#tab1").selectAll("p")
        .on("mouseover", function(d) {
            $("body div.popover")
                .addClass("variables");
            $("body div.popover div.popover-content")
                .addClass("form-horizontal");
        })
        .on("click", function varClick(){
            if (app.allNodes[app.findNodeIndex(this.id)].grayout)
                return;

            d3.select(this)
                .style('background-color',function(d) {
                    var myText = d3.select(this).text();
                    var myColor = d3.select(this).style('background-color');
                    var mySC = app.allNodes[app.findNodeIndex(myText)].strokeColor;
                    var myNode = app.allNodes[app.findNodeIndex(this.id)];

                    app.zparams.zvars = []; //empty the zvars array
                    if(d3.rgb(myColor).toString() === app.varColor.toString()) {	// we are adding a var
                        if(nodes.length==0) {
                            nodes.push(app.findNode(myText));
                            nodes[0].reflexive=true;
                        }
                        else {nodes.push(app.findNode(myText));}
                        if(myNode.time==="yes") {
                            tagColors(myNode, app.timeColor);
                            return hexToRgba(app.timeColor);
                        }
                        else if(myNode.nature==="nominal") {
                            tagColors(myNode, app.nomColor);
                            return hexToRgba(app.nomColor);
                        }
                        else return hexToRgba(selVarColor);
                    } else { // dropping a variable
                        nodes.splice(app.findNode(myText)["index"], 1);
                        app.spliceLinksForNode(app.findNode(myText));
                        if(mySC==app.dvColor) {
                            var dvIndex = app.zparams.zdv.indexOf(myText);
                            if (dvIndex > -1) { app.zparams.zdv.splice(dvIndex, 1); }
                        }
                        else if(mySC==app.csColor) {
                            var csIndex = app.zparams.zcross.indexOf(myText);
                            if (csIndex > -1) { app.zparams.zcross.splice(csIndex, 1); }
                        }
                        else if(mySC==app.timeColor) {
                            var timeIndex = app.zparams.ztime.indexOf(myText);
                            if (timeIndex > -1) { app.zparams.ztime.splice(timeIndex, 1); }
                        }
                        else if(mySC==app.nomColor) {
                            var nomIndex = app.zparams.znom.indexOf(myText);
                            if (nomIndex > -1) { app.zparams.znom.splice(dvIndex, 1); }
                        }
                        app.borderState();
                        app.legend();
                        return app.varColor;
                    }
                });
            app.panelPlots();
            app.restart();
        });
}

function updatedata(all, matches, flag) {
	  d3.select("#tab1").selectAll("p")
        .data(app.allNodes.map(n => n.name))
        .remove();
	  d3.select("#tab1").selectAll("p")
		    .data(all)
		    .enter()
		    .append("p")
		    .attr("id", d => d.replace(/\W/g, "_")) // replace non-alphanumerics for selection purposes, perhaps ensure this id is unique by adding '_' to the front?
		    .text(d => d)
		    .style('background-color', d => app.hexToRgba(app.nodes.includes(app.findNode(d)) ? selVarColor : app.varColor))
        .style('border-style', d => matches.includes(app.findNode(d)) && flag == 1 && 'solid')
			  .style('border-color', d => matches.includes(app.findNode(d)) && flag == 1 && '#000000')
        .attr("data-container", "body")
        .attr("data-toggle", "popover")
        .attr("data-trigger", "hover")
        .attr("data-placement", "right")
        .attr("data-html", "true")
        .attr("onmouseover", "$(this).popover('toggle');")
        .attr("onmouseout", "$(this).popover('toggle');")
        .attr("data-original-title", "Summary Statistics");
	  app.fakeClick();
	  $("#tab1").children().popover('hide');
	  app.populatePopover();
	  addlistener(app.nodes);
}
