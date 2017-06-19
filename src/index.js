import '../bootstrap/css/bootstrap-theme.min.css';
import '../app.css';
import '../Ladda/dist/ladda-themeless.min.css';

import m from 'mithril';

import * as app from './app.js';

let Model = {
    about: false,
    cite: false,
    citetoggle: false,
    leftClosed: false,
    rightClosed: false,
    toggleHistory: false,
    toggleLegend: false
};

function panel(id, title, target, buttons={}) {
    let toggle = 'toggle' + title;
    return m(`#${id}.panel.panel-default`, {
        style: {display: "none"}
    }, [
        m(".panel-heading",
          m("h3.panel-title", [
              title,
              m(`span.glyphicon.glyphicon-large.glyphicon-chevron-${Model[toggle] ? 'up' : 'down'}.pull-right[data-target=#${target}][data-toggle=collapse][href=#${target}]`, {
                  onclick: _ => Model[toggle] = !Model[toggle],
                  style: {
                      cursor: "hand",
                      cursor: "pointer"
                  }
              })
          ])
         ),
        m(`#${target}.panel-collapse.collapse.in`,
          m(".panel-body", Object.entries(buttons).map(x => {
              return m(`#${x[0]}.clearfix.hide`, [
                  m(".rectColor",
                    m("svg", {
                        style: {
                            width: "20px",
                            height: "20px"
                        }
                    }, m("circle[cx=10][cy=10][fill=white][r=9][stroke=black][stroke-width=2]"))
                   ),
                  m(".rectLabel", x[1])
              ]);
          })))
    ]);
}

let closepanel = side => Model[side + 'Closed'] ? '.closepanel' : '';

function top(side, title, ...args) {
    let id = `#${side}panel`;
    let dot = m.trust('&#9679;');
    return m(`#${side}panel.sidepanel.container.clearfix${closepanel(side)}`, [
        m(`#toggle${side == 'left' ? 'L' : 'R'}panelicon.panelbar`,
          m('span', {
              onclick: _ => {
                  let key = side + 'Closed';
                  if (!Model[key]) {
                      $(id).removeClass('expandpanel');
                      if (side == 'left')
                          $('#btnSelect').css('display', 'none');
                  }
                  Model[key] = !Model[key];
              }
          }, [dot, m('br'), dot, m('br'), dot, m('br'), dot])
        ),
        m(`#${side}paneltitle.panel-heading.text-center`,
          m("h3.panel-title", title)
        )
    ].concat(args));
}

function leftpanel() {
    return top(
        'left', 'Data Selection',
        m(".btn-toolbar[role=toolbar]", {
            style: {
                "margin-left": ".5em",
                "margin-top": ".5em"
            }
        }, [
            m(".btn-group", {
                style: {"margin-left": "0"}
            }, [
                m("button#btnVariables.btn.active[type=button]", {
                    title: 'Click variable name to add or remove the variable pebble from the modeling space.',
                    onclick: _ => app.tabLeft('tab1')
                }, "Variables"),
                m("button#btnSubset.btn.btn-default[type=button]", {
                    onclick: _ => app.tabLeft('tab2')
                }, "Subset")
            ]),
            m("button#btnSelect.btn.btn-default.ladda-button[data-spinner-color=#000000][data-style=zoom-in][type=button]", {
                title: 'Subset data by the intersection of all selected values.',
                onclick: _ => app.subsetSelect('btnSelect'),
                style: {
                    display: "none",
                    float: "right",
                    "margin-right": "10px"
                }
            }, m("span.ladda-label", {
                style: {"pointer-events": "none"}
            }, "Select"))
        ]),
        m('.row-fluid' + closepanel('left'),
            m('#leftpanelcontent',
                m('#leftContentArea', {
                    style: {
                        height: "488px",
                        overflow: "scroll"
                    }
                }, [
                    m('#tab1', {
                        style: {
                            display: app.lefttab == 'tab1' ? 'block' : 'none',
                            padding: "6px 12px",
                            "text-align": "center"
                        }
                    }),
                    m('#tab2', {
                        style: {
                            display: app.lefttab == 'tab2' ? 'block' : 'none',
                            "margin-top": ".5em"
                        }
                    }),
                    m('#tab3',
                        m("p", {
                            style: {padding: ".5em 1em"}
                        }, "Select a variable from within the visualization in the center panel to view its summary statistics.")
                    )
                ])
            )
        )
    );
}

function rightpanel() {
    return top(
        'right', 'Model Selection',
        m(".btn-group.btn-group-justified[aria-label=...][role=group]", {
            style: {"margin-top": ".5em"}
        }, [
            m('button#btnModels.btn.active[type=button]', {
                onclick: _ => app.tabRight('btnModels'),
                style: {width: "33%"}
            }, "Models"),
            m('button#btnSetx.btn.btn-default[type=button]', {
                onclick: _ => app.tabRight('btnSetx'),
                style: {width: "34%"}
            }, "Set Covar."),
            m('button#btnResults.btn.btn-default[type=button]', {
                onclick: _ => app.tabRight('btnResults'),
                style: {width: "33%"}
            }, "Results")
        ]),
        m('.row-fluid' + closepanel('right'),
          m('#rightpanelcontent',
            m('#rightContentArea', {
                style: {
                    height: "488px",
                    overflow: "scroll"
                }
            }, [
                m('#results', {
                    style: {"margin-top": ".5em"}
                }, [
                    m("#resultsView.container", {
                        style: {
                            float: "right",
                            display: "none",
                            overflow: "auto",
                            width: "80%",
                            "background-color": "white",
                            "white-space": "nowrap"
                        }
                    }),
                    m('#modelView', {
                        style: {
                            display: "none",
                            float: "left",
                            width: "20%",
                            "background-color": "white"
                        }
                    }),
                    m("p#resultsHolder", {
                        style: {padding: ".5em 1em"}
                    })
                ]),
                m('#setx', {
                    style: {display: "none"}
                }),
                m('#models', {
                    style: {
                        display: "block",
                        padding: "6px 12px",
                        "text-align": "center"
                    }
                })
            ])
           )
        )
    );
}

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
        let fileid = extract('fileid', 'dfId', 5);
        let hostname = extract('hostname', 'host', 5);
        let apikey = extract('apikey', 'key', 4);
        let ddiurl = extract('ddiurl', 'ddiurl', 7)
            .replace(/%25/g, '%')
            .replace(/%3A/g, ':')
            .replace(/%2F/g, '/');
        let dataurl = extract('dataurl', 'dataurl', 8)
            .replace(/%25/g, '%')
            .replace(/%3A/g, ':')
            .replace(/%2F/g, '/');

        app.main(fileid, hostname, ddiurl, dataurl);
    }

    view() {
        return m('main',
            m("nav#option.navbar.navbar-default[role=navigation]",
                m("div", [
                    m("#navbarheader.navbar-header", [
                        m("img[alt=TwoRavens][src=images/TwoRavens.png][width=100]", {
                            onmouseover: _ => Model.about = true,
                            onmouseout: _ => Model.about = false,
                            style: {
                                "margin-left": "2em",
                                "margin-top": "-0.5em"
                            }
                        }),
                        m('#about.panel.panel-default', {
                            style: {
                                display: Model.about ? 'block' : 'none',
                                left: "140px",
                                position: "absolute",
                                width: "380px",
                                "z-index": "50"
                            }
                        }, m('.panel-body',
                             'TwoRavens v0.1 "Dallas" -- The Norse god Odin had two talking ravens as advisors, who would fly out into the world and report back all they observed. In the Norse, their names were "Thought" and "Memory". In our coming release, our thought-raven automatically advises on statistical model selection, while our memory-raven accumulates previous statistical models from Dataverse, to provide cummulative guidance and meta-analysis.'
                            ))
                    ]),
                    m('#dataField.field', {
                        style: {
                            "margin-top": "0.5em",
                            "text-align": "center"
                        }
                    }, [
                        m('h4#dataName', {
                            onclick: _ => Model.cite = Model.citetoggle = !Model.citetoggle,
                            onmouseout: _ => Model.citetoggle || (Model.cite = false),
                            onmouseover: _ => Model.cite = true,
                            style: {display: "inline"}
                        }, "Dataset Name"),
                        m("#cite.panel.panel-default", {
                            style: {
                                display: Model.cite ? 'block' : 'none',
                                position: "absolute",
                                right: "50%",
                                width: "380px",
                                "text-align": "left",
                                "z-index": "50"
                            }
                        }, m(".panel-body")),
                        m("button#btnEstimate.btn.btn-default.ladda-button.navbar-right[data-spinner-color=#000000][data-style=zoom-in]", {
                            onclick: _ => app.estimate('btnEstimate'),
                            style: {
                                "margin-left": "2em",
                                "margin-right": "1em"
                            }
                        }, m("span.ladda-label", "Estimate")),
                        m("button#btnReset.btn.btn-default.navbar-right[title=Reset]", {
                            onclick: app.reset,
                            style: {"margin-left": "2.0em"}
                        }, m("span.glyphicon.glyphicon-repeat", {
                            style: {
                                color: "#818181",
                                "font-size": "1em",
                                "pointer-events": "none"
                            }
                        })),
                        m('#transformations.transformTool', {
                            title: 'Construct transformations of existing variables using valid R syntax. For example, assuming a variable named d, you can enter "log(d)" or "d^2".'
                        })
                    ])
                ])
            ),
            m(`#main.left.carousel.slide${Model.leftClosed ? '.svg-leftpanel' : ''}${Model.rightClosed ? '.svg-rightpanel' : ''}`,
              m(".carousel-inner"),
              m("#spacetools.spaceTool", {
                  style: {"z-index": "16"}
              }, [
                  m("button#btnForce.btn.btn-default[title=Pin the variable pebbles to the page.]", {
                      onclick: app.forceSwitch
                  }, m("span.glyphicon.glyphicon-pushpin")),
                  m("button#btnEraser.btn.btn-default[title=Wipe all variables from the modeling space.]", {
                      onclick: app.erase
                  }, m("span.glyphicon.glyphicon-magnet"))
              ]),
              panel("legend.legendary", "Legend", "collapseLegend", {
                  timeButton: 'Time',
                  csButton: 'Cross Sec',
                  dvButton: 'Dep Var',
                  nomButton: 'Nom Var'
              }),
              panel("logdiv.logbox", "History", 'collapseLog'),
              m('#ticker', {
                       style: {
                           background: "#F9F9F9",
                           bottom: "0",
                           height: "50px",
                           position: "fixed",
                           width: "100%"
                       }
              }, m("a#logID[href=somelink][target=_blank]", "Replication")),
              leftpanel(),
              rightpanel()
            )
        );
    }
}

m.mount(document.body, Body);
