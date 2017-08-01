import m from 'mithril';

import * as app from '../app';

export let getClass = function(panel) {
    if (panel.closed) return '.closepanel';
    return (panel.side === 'left' && app.lefttab === 'tab2') ? '.expandpanel' : '';
};

export class Panel {
    oninit(vnode) {
        this.side = vnode.attrs.side;
        this.title = vnode.attrs.title;
        this.closed = false;
    }

    view(vnode) {
        let dot = [m.trust('&#9679;'), m('br')];
        return m(`#${this.side}panel.sidepanel.container.clearfix${getClass(this)}`, [
            m(`#toggle${this.side === 'left' ? 'L' : 'R'}panelicon.panelbar[style=height: calc(100% - 60px)]`,
              m('span', {onclick: _ => this.closed = !this.closed},
                [].concat([dot, dot, dot, dot]))),
            m(`#${this.side}paneltitle.panel-heading.text-center`,
              m("h3.panel-title", this.title))
        ].concat(vnode.children));
    }
}

export default Panel;
