import m from 'mithril';

import * as app from '../app';

class Subpanel {
    oninit(vnode) {
        this.hide = false;
    }

    view(vnode) {
        let title = vnode.attrs.title;
        let legend = title === 'Legend';
        let target = 'collapse' + title;
        let z = app.zparams;
        return m(`#${legend ? "legend.legendary" : "logdiv.logbox"}.panel.panel-default`, {
            style: {display: legend && z.ztime.length + z.zcross.length + z.zdv.length + z.znom.length || !legend && app.logArray.length > 0 ? 'block' : 'none'}},
                 m(".panel-heading",
                   m("h3.panel-title",
                     title,
                     m(`span.glyphicon.glyphicon-large.glyphicon-chevron-${this.hide ? 'up': 'down'}.pull-right[data-target=#${target}][data-toggle=collapse][href=#${target}]`, {
                         style: 'cursor: pointer',
                         onclick: _ => this.hide = !this.hide}))),
                 m(`#${target}.panel-collapse.collapse.in`,
                   m(".panel-body", !legend ? app.logArray.map(x => m('p', x)) : vnode.attrs.buttons.map(x => {
                       return m(`#${x[0]}.clearfix.${z[x[1]].length === 0 ? "hide" : "show"}`,
                                m(".rectColor",
                                  m("svg[style=width: 20px; height: 20px]",
                                    m("circle[cx=10][cy=10][fill=white][r=9][stroke=black][stroke-width=2]"))),
                                m(".rectLabel", x[2]));}))));
    }
}

export default Subpanel;
