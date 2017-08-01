import '../bootstrap/css/bootstrap-theme.min.css';
import '../app.css';
import '../Ladda/dist/ladda-themeless.min.css';

import m from 'mithril';

import * as app from './app.js';
import Panel, {getClass} from './views/Panel';

let Model = {
    about: false,
    cite: false,
    citetoggle: false,
    toggleHistory: false,
    toggleLegend: false
};

let subpanel = function(title, buttons=[]) {
    let legend = title === 'Legend';
    let [target, toggle] = ['collapse' + title, 'toggle' + title];
    let z = app.zparams;
    return m(`#${legend ? "legend.legendary" : "logdiv.logbox"}.panel.panel-default`, {
        style: {display: legend && z.ztime.length + z.zcross.length + z.zdv.length + z.znom.length || !legend && app.logArray.length > 0 ? 'block' : 'none'}},
             m(".panel-heading",
               m("h3.panel-title",
                 title,
                 m(`span.glyphicon.glyphicon-large.glyphicon-chevron-${Model[toggle] ? 'up' : 'down'}.pull-right[data-target=#${target}][data-toggle=collapse][href=#${target}]`, {
                     style: 'cursor: pointer',
                     onclick: _ => Model[toggle] = !Model[toggle]}))),
             m(`#${target}.panel-collapse.collapse.in`,
               m(".panel-body", !legend ? app.logArray.map(x => m('p', x)) : buttons.map(x => {
                   return m(`#${x[0]}.clearfix.${z[x[1]].length === 0 ? "hide" : "show"}`,
                            m(".rectColor",
                              m("svg[style=width: 20px; height: 20px]",
                                m("circle[cx=10][cy=10][fill=white][r=9][stroke=black][stroke-width=2]"))),
                            m(".rectLabel", x[2]));}))));
};

let or = function(side, val, y='block', n='none') {
    return app[side + 'tab'] === val ? y : n;
};

let leftpanel = function() {
    return m(Panel, {side: 'left', title: 'Data Selection'},
             m(".btn-toolbar[role=toolbar][style=margin-left: .5em; margin-top: .5em]",
               m(".btn-group",
                 m(`button#btnVariables.btn.${or('left', 'tab1', 'active', 'btn-default')}[type=button]`, {
                     title: 'Click variable name to add or remove the variable pebble from the modeling space.',
                     onclick: _ => app.tabLeft('tab1')},
                   "Variables"),
                 m(`button#btnSubset.btn.${or('left', 'tab2', 'active', 'btn-default')}[type=button]`, {onclick: _ => app.tabLeft('tab2')},
                   "Subset")),
               m("button#btnSelect.btn.btn-default.ladda-button[data-spinner-color=#000000][data-style=zoom-in][type=button]", {
                   style: `display: ${app.subset ? 'block' : 'none'}; float: right; margin-right: 10px`,
                   onclick: _ => app.subsetSelect('btnSelect'),
                   title: 'Subset data by the intersection of all selected values.'},
                 m("span.ladda-label[style=pointer-events: none]", "Select"))),
             m('.row-fluid' + getClass({side: 'left'}),
               m('#leftpanelcontent',
                 m('#leftContentArea[style=height: 453px; overflow: auto]',
                   m(`#tab1[style=display: ${or('left', 'tab1')}; padding: 10px 8px; text-align: center]`,
                     m('input#searchvar.form-control[type=text][placeholder=Search variables and labels][style=width: 100%; margin-bottom: 5px]')),
                   m(`#tab2[style=display: ${or('left', 'tab2')}; margin-top: .5em]`),
                   m('#tab3',
                     m(`p[style=padding: .5em 1em; display: ${or('left', 'tab3')}]`, {
                         title: "Select a variable from within the visualization in the center panel to view its summary statistics."},
                       m('center',
                         m('b', app.summary.name),
                         m('br'),
                         m('i', app.summary.labl)),
                       m('table', app.summary.data.map(
                           tr => m('tr', tr.map(
                               td => m('td', {
                                   onmouseover: function() {this.style['background-color'] = 'aliceblue';},
                                   onmouseout: function() {this.style['background-color'] = '#f9f9f9';}},
                                       td)))))))))));
};

let rightpanel = function() {
    let button = (id, width, text) =>
        m(`button#${id}.btn.${or('right', id, 'active', 'btn-default')}[type=button][style=width: ${width}]`, {onclick: _ => app.tabRight(id)},
          text);
    return m(Panel, {side: 'right', title: 'Model Selection'},
             m(".btn-group.btn-group-justified[aria-label=...][role=group][style=margin-top: .5em]",
               button('btnModels', "33%", "Models"),
               button('btnSetx', "34%", "Set Covar."),
               button('btnResults', "33%", "Results")),
             m('.row-fluid' + getClass({side: 'right'}),
               m('#rightpanelcontent',
                 m('#rightContentArea[style=height: 453px; overflow: auto]',
                   m(`#results[style=display: ${or('right', 'btnResults')}; margin-top: .5em]`,
                     m("#resultsView.container[style=float: right; overflow: auto; width: 80%; background-color: white; white-space: nowrap]"),
                     m('#modelView[style=display: none; float: left; width: 20%; background-color: white]'),
                     m("p#resultsHolder[style=padding: .5em 1em]")),
                   m(`#setx[style=display: ${or('right', 'btnSetx')}]`),
                   m(`#models[style=display: ${or('right', 'btnModels')}; padding: 6px 12px; text-align: center]`)))));
};

class Body {
    oncreate() {
        let extract = (name, key, offset) => {
            key = key + '=';
            let loc = window.location.toString();
            let val = loc.indexOf(key) > 0 ? loc.substring(loc.indexOf(key) + offset) : '';
            let idx = val.indexOf('&');
            val = idx > 0 ? val.substring(0, idx) : val;
            console.log(name, ': ', val);
            return val;
        };
        // let apikey = extract('apikey', 'key', 4);
        app.main(
            extract('fileid', 'dfId', 5),
            extract('hostname', 'host', 5),
            extract('ddiurl', 'ddiurl', 7)
                .replace(/%25/g, '%')
                .replace(/%3A/g, ':')
                .replace(/%2F/g, '/'),
            extract('dataurl', 'dataurl', 8)
                .replace(/%25/g, '%')
                .replace(/%3A/g, ':')
                .replace(/%2F/g, '/'));
    }

    view() {
        return m('main',
                 m("nav#navbar.navbar.navbar-default.navbar-fixed-top[role=navigation]",
                   m("a.navbar-brand[style=margin-left: 0]",
                     m("img[src=images/TwoRavens.png][alt=TwoRavens][width=100][style=margin-left: 2em; margin-top: -0.5em]", {
                         onmouseover: _ => Model.about = true,
                         onmouseout: _ => Model.about = false})),
                   m('#navbarNav[style=padding: 0.5em]',
                     m('#dataField.field[style=margin-top: 0.5em; text-align: center]',
                       m('h4#dataName[style=display: inline]', {
                           onclick: _ => Model.cite = Model.citetoggle = !Model.citetoggle,
                           onmouseout: _ => Model.citetoggle || (Model.cite = false),
                           onmouseover: _ => Model.cite = true},
                         "Dataset Name"),
                       m(`#cite.panel.panel-default[style=display: ${Model.cite ? 'block' : 'none'}; position: absolute; right: 50%; width: 380px; text-align: left; z-index: 50]`,
                         m(".panel-body")),
                       m("button#btnEstimate.btn.btn-default.ladda-button.navbar-right[data-spinner-color=#000000][data-style=zoom-in][style=margin-left: 2em; margin-right: 1em]", {
                           onclick: _ => app.estimate('btnEstimate')},
                         m("span.ladda-label", "Estimate")),
                       m("button#btnReset.btn.btn-default.navbar-right[title=Reset][style=margin-left: 2.0em]", {onclick: app.reset},
                         m("span.glyphicon.glyphicon-repeat[style=color: #818181; font-size: 1em; pointer-events: none]")),
                       m('#transformations.transformTool', {
                           title: 'Construct transformations of existing variables using valid R syntax. For example, assuming a variable named d, you can enter "log(d)" or "d^2".'}))),
                   /*m('.text-center', {
                     style: {margin: '5px'}
                     }, m(".btn-group", [
                     m(`a.btn.btn-default${location.href.endsWith('model') ? '.active' : ''}[href=/model][role=button]`, {oncreate: m.route.link}, "Model"),
                     m(`a.btn.btn-default${location.href.endsWith('explore') ? '.active' : ''}[href=/explore][role=button]`, {oncreate: m.route.link}, "Explore")
                     ]))*/
                   m(`#about.panel.panel-default[style=display: ${Model.about ? 'block' : 'none'}; left: 140px; position: absolute; width: 500px; z-index: 50]`,
                     m('.panel-body',
                       'TwoRavens v0.1 "Dallas" -- The Norse god Odin had two talking ravens as advisors, who would fly out into the world and report back all they observed. In the Norse, their names were "Thought" and "Memory". In our coming release, our thought-raven automatically advises on statistical model selection, while our memory-raven accumulates previous statistical models from Dataverse, to provide cummulative guidance and meta-analysis.'))),
                 m(`#main.left.carousel.slide${Model.leftClosed ? '.svg-leftpanel' : ''}${Model.rightClosed ? '.svg-rightpanel' : ''}[style=overflow: auto]`,
                   m("#innercarousel.carousel-inner",
                     m('#m0.item.active',
                       m('svg#whitespace'))),
                   m("#spacetools.spaceTool[style=z-index: 16]",
                     m("button#btnForce.btn.btn-default[title=Pin the variable pebbles to the page.]", {onclick: app.forceSwitch},
                       m("span.glyphicon.glyphicon-pushpin")),
                     m("button#btnEraser.btn.btn-default[title=Wipe all variables from the modeling space.]", {onclick: app.erase},
                       m("span.glyphicon.glyphicon-magnet"))),
                   subpanel("Legend", [
                       ['timeButton', 'ztime', 'Time'],
                       ['csButton', 'zcross', 'Cross Sec'],
                       ['dvButton', 'zdv', 'Dep Var'],
                       ['nomButton', 'znom', 'Nom Var']]),
                   subpanel("History"),
                   m('#ticker[style=background: #F9F9F9; bottom: 0; height: 40px; position: fixed; width: 100%; border-top: 1px solid #ADADAD]',
                     m("a#logID[href=somelink][target=_blank]", "Replication")),
                   leftpanel(),
                   rightpanel()));
    }
}

m.route(document.body, '/model', {
    '/model': Body,
    '/explore': Body
});
