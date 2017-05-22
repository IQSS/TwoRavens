import '../bootstrap/css/bootstrap-theme.min.css';
import '../app.css';
import '../Ladda/dist/ladda-themeless.min.css';

import m from 'mithril';

function leftpanel() {
    return m(".sidepanel.container.clearfix[id='leftpanel']", [
        m(".panelbar[id='toggleLpanelicon']",
            m("span", [
                m.trust("&#9679;"),
                m("br"),
                m.trust("&#9679;"),
                m("br"),
                m.trust("&#9679;"),
                m("br"),
                m.trust("&#9679;")
            ])
        ),
        m(".panel-heading.text-center[id='leftpaneltitle']",
            m("h3.panel-title",
                "Data Selection"
            )
        ),
        m(".btn-toolbar[role='toolbar']", {
            style: {
                "margin-left": ".5em",
                "margin-top": ".5em"
            }
        }, [
            m(".btn-group", {
                style: {
                    "margin-left": "0"
                }
            }, [
                m("button.btn.active[id='btnVariables'][onclick='tabLeft(\'tab1\');'][title='Click variable name to add or remove the variable pebble from the modeling space.'][type='button']",
                    "Variables"
                ),
                m("button.btn.btn-default[id='btnSubset'][onclick='tabLeft(\'tab2\');'][type='button']",
                    "Subset"
                )
            ]),
            m("button.btn.btn-default.ladda-button[data-spinner-color='#000000'][data-style='zoom-in'][id='btnSelect'][onclick='subsetSelect(\'btnSelect\');'][title='Subset data by the intersection of all selected values.'][type='button']", {
                    style: {
                        "display": "none",
                        "float": "right",
                        "margin-right": "10px"
                    }
                },
                m("span.ladda-label", {
                        style: {
                            "pointer-events": "none"
                        }
                    },
                    "Select"
                )
            )
        ]),
        m(".row-fluid",
            m("[id='leftpanelcontent']",
                m("[id='leftContentArea']", {
                    style: {
                        "overflow": "scroll",
                        "height": "488px"
                    }
                }, [
                    m("[id='tab1']", {
                        style: {
                            "display": "block",
                            "padding": "6px 12px",
                            "text-align": "center"
                        }
                    }),
                    m("[id='tab2']", {
                        style: {
                            "display": "none",
                            "margin-top": ".5em"
                        }
                    }, ),
                    m("[id='tab3']",
                        m("p", {
                                style: {
                                    "padding": ".5em 1em"
                                }
                            },
                            "Select a variable from within the visualization in the center panel to view its summary statistics."
                        )
                    )
                ])
            )
        )
    ]);
}

function rightpanel() {
    return m(".sidepanel.container.clearfix[id='rightpanel']", [
        m(".panelbar[id='toggleRpanelicon']",
            m("span", [
                m.trust("&#9679;"),
                m("br"),
                m.trust("&#9679;"),
                m("br"),
                m.trust("&#9679;"),
                m("br"),
                m.trust("&#9679;")
            ])
        ),
        m(".panel-heading.text-center[id='rightpaneltitle']",
            m("h3.panel-title",
                "Model Selection"
            )
        ),
        m(".btn-group.btn-group-justified[aria-label='...'][role='group']", {
            style: {
                "margin-top": ".5em"
            }
        }, [
            m("button.btn.active[id='btnModels'][onclick='tabRight(\'btnModels\');'][type='button']", {
                    style: {
                        "width": "33%"
                    }
                },
                "Models"
            ),
            m("button.btn.btn-default[id='btnSetx'][onclick='tabRight(\'btnSetx\');'][type='button']", {
                    style: {
                        "width": "34%"
                    }
                },
                "Set Covar."
            ),
            m("button.btn.btn-default[id='btnResults'][onclick='tabRight(\'btnResults\');'][type='button']", {
                    style: {
                        "width": "33%"
                    }
                },
                "Results"
            )
        ]),
        m(".row-fluid",
            m("[id='rightpanelcontent']",
                m("[id='rightContentArea']", {
                    style: {
                        "overflow": "scroll",
                        "height": "488px"
                    }
                }, [
                    m("[id='results']", {
                        style: {
                            "margin-top": ".5em"
                        }
                    }, [
                        m(".container[;=''][id='resultsView']", {
                            style: {
                                "width": "80%",
                                "background-color": "white",
                                "display": "none",
                                "float": "right",
                                "overflow": "auto",
                                "white-space": "nowrap"
                            }
                        }),
                        m("[id='modelView']", {
                            style: {
                                "width": "20%",
                                "background-color": "white",
                                "display": "none",
                                "float": "left"
                            }
                        }),
                        m("p[id='resultsHolder']", {
                            style: {
                                "padding": ".5em 1em"
                            }
                        })
                    ]),
                    m("[id='setx']", {
                        style: {
                            "display": "none"
                        }
                    }),
                    m("[id='models']", {
                        style: {
                            "display": "block",
                            "padding": "6px 12px",
                            "text-align": "center"
                        }
                    })
                ])
            )
        )
    ]);
}

class Body {
    view() {
        return m('main',
            m("nav.navbar.navbar-default[id='option'][role='navigation']",
                m("div", [
                    m(".navbar-header[id='navbarheader']", [
                        m("img[alt='TwoRavens'][onmouseout='closeabout();'][onmouseover='about();'][src='images/TwoRavens.png'][width='100']", {
                            style: {
                                "margin-left": "2em",
                                "margin-top": "-0.5em"
                            }
                        }),
                        m(".panel.panel-default[id='about']", {
                                style: {
                                    "position": "absolute",
                                    "left": "140px",
                                    "width": "380px",
                                    "display": "none",
                                    "z-index": "50"
                                }
                            },
                            m(".panel-body", )
                        )
                    ]),
                    m(".field[id='dataField']", {
                        style: {
                            "text-align": "center",
                            "margin-top": "0.5em"
                        }
                    }, [
                        m("h4[id='dataName'][onclick='citetoggle=clickcite(citetoggle);'][onmouseout='closecite(citetoggle);'][onmouseover='opencite();']", {
                                style: {
                                    "display": "inline"
                                }
                            },
                            "Dataset Name"
                        ),
                        m(".panel.panel-default[id='cite']", {
                                style: {
                                    "position": "absolute",
                                    "right": "50%",
                                    "width": "380px",
                                    "display": "none",
                                    "z-index": "50",
                                    "text-align": "left"
                                }
                            },
                            m(".panel-body", )
                        ),
                        m("button.btn.btn-default.ladda-button.navbar-right[data-spinner-color='#000000'][data-style='zoom-in'][id='btnEstimate'][onclick='estimate(\'btnEstimate\')']", {
                                style: {
                                    "margin-left": "2em",
                                    "margin-right": "1em"
                                }
                            },
                            m("span.ladda-label",
                                "Estimate"
                            )
                        ),
                        m("button.btn.btn-default.navbar-right[id='btnReset'][onclick='reset()'][title='Reset']", {
                                style: {
                                    "margin-left": "2.0em"
                                }
                            },
                            m("span.glyphicon.glyphicon-repeat", {
                                style: {
                                    "font-size": "1em",
                                    "color": "#818181",
                                    "pointer-events": "none"
                                }
                            })
                        ),
                        m(".transformTool[id='transformations'][title='Construct transformations of existing variables using valid R syntax. For example, assuming a variable named d, you could enter \'log(d)\' or \'d^2\'.']", )
                    ])
                ])
            ),
            m(".left.svg-leftpanel.svg-rightpanel.carousel.slide[id='main']", [
                m(".carousel-inner", ),
                m(".spaceTool[id='spacetools']", {
                    style: {
                        "z-index": "16"
                    }
                }, [
                    m("button.btn.btn-default[id='btnForce'][onclick='forceSwitch()'][title='Pin the variable pebbles to the page.']",
                        m("span.glyphicon.glyphicon-pushpin")
                    ),
                    m("button.btn.btn-default[id='btnEraser'][onclick='erase()'][title='Wipe all variables from the modeling space.']",
                        m("span.glyphicon.glyphicon-magnet")
                    )
                ]),
                m(".legendary.panel.panel-default[id='legend']", {
                    style: {
                        "display": "none"
                    }
                }, [
                    m(".panel-heading",
                        m("h3.panel-title", [
                            "Legend  ",
                            m("span.glyphicon.glyphicon-large.glyphicon-chevron-down.pull-right[data-target='#collapseLegend'][data-toggle='collapse'][href='#collapseLegend'][onclick='$(this).toggleClass(\'glyphicon-chevron-up\').toggleClass(\'glyphicon-chevron-down\');']", {
                                style: {
                                    "cursor": "pointer",
                                    "cursor": "hand"
                                }
                            })
                        ])
                    ),
                    m(".panel-collapse.collapse.in[id='collapseLegend']",
                        m(".panel-body", [
                            m(".clearfix.hide[id='timeButton']", [
                                m(".rectColor",
                                    m("svg", {
                                            style: {
                                                "width": "20px",
                                                "height": "20px"
                                            }
                                        },
                                        m("circle[cx='10'][cy='10'][fill='white'][r='9'][stroke='black'][stroke-width='2']")
                                    )
                                ),
                                m(".rectLabel",
                                    "Time"
                                )
                            ]),
                            m(".clearfix.hide[id='csButton']", [
                                m(".rectColor",
                                    m("svg", {
                                            style: {
                                                "width": "20px",
                                                "height": "20px"
                                            }
                                        },
                                        m("circle[cx='10'][cy='10'][fill='white'][r='9'][stroke='black'][stroke-width='2']")
                                    )
                                ),
                                m(".rectLabel",
                                    "Cross Sec"
                                )
                            ]),
                            m(".clearfix.hide[id='dvButton']", [
                                m(".rectColor",
                                    m("svg", {
                                            style: {
                                                "width": "20px",
                                                "height": "20px"
                                            }
                                        },
                                        m("circle[cx='10'][cy='10'][fill='white'][r='9'][stroke='black'][stroke-width='2']")
                                    )
                                ),
                                m(".rectLabel",
                                    "Dep Var"
                                )
                            ]),
                            m(".clearfix.hide[id='nomButton']", [
                                m(".rectColor",
                                    m("svg", {
                                            style: {
                                                "width": "20px",
                                                "height": "20px"
                                            }
                                        },
                                        m("circle[cx='10'][cy='10'][fill='white'][r='9'][stroke='black'][stroke-width='2']")
                                    )
                                ),
                                m(".rectLabel",
                                    "Nom Var"
                                )
                            ])
                        ])
                    )
                ]),
                m(".logbox.panel.panel-default[id='logdiv']", {
                    style: {
                        "display": "none"
                    }
                }, [
                    m(".panel-heading",
                        m("h3.panel-title", [
                            "History ",
                            m("span.glyphicon.glyphicon-large.glyphicon-chevron-down.pull-right[data-target='#collapseLog'][data-toggle='collapse'][href='#collapseLog'][id='logicon'][onclick='$(this).toggleClass(\'glyphicon-chevron-down\').toggleClass(\'glyphicon-chevron-up\');']", {
                                style: {
                                    "cursor": "pointer",
                                    "cursor": "hand"
                                }
                            })
                        ])
                    ),
                    m(".panel-collapse.collapse.in[id='collapseLog']",
                        m(".panel-body", )
                    )
                ]),
                m("[id='ticker']", {
                        style: {
                            "position": "fixed",
                            "height": "50px",
                            "width": "100%",
                            "background": "#F9F9F9",
                            "bottom": "0"
                        }
                    },
                    m("a[href='somelink'][id='logID'][target='_blank']",
                        "Replication"
                    )
                ),
                leftpanel(),
                rightpanel(),
                m(".clearfix")
            ]),
            m("script", ),
            m("script[src='app_ddi.js']")
        );
    }
}

m.mount(document.body, Body);
