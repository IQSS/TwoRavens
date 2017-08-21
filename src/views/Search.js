import m from 'mithril';

import * as app from '../app';
import {selVarColor} from '../plots';

export let searchIndex;

let search = val => {
    let all = app.allNodes;
    if (val === '') {
        searchIndex = null;
        return app.valueKey = all.map(n => n.name);
    }
    let [matches, others, match] = [[], [], (n, key) => n[key].toLowerCase().includes(val.toLowerCase())];
    all.forEach(n => match(n, 'name') || match(n, 'labl') ? matches.push(n) : others.push(n));
    searchIndex = matches.length;
    app.valueKey = matches
        .concat(others)
        .map(n => n.name);
};

class Search {
    view(vnode) {
        vnode.attrs.oninput = m.withAttr('value', search);
        return m('input#searchvar.form-control[style=margin-bottom: 5px; width: 100%]', vnode.attrs);
    }
}

export default Search;
