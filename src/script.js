$('#leftpanel span').click(function() {
    closeLeftPanel();
});
$('#rightpanel span').click(function() {
    closeRightPanel();
});

function closeLeftPanel() {
    if ($('#leftpanel').hasClass('forceclosepanel')) {
        // do nothing
    } else {
        /*$('#leftpanel .btn-toolbar').hide();*/
        $('#leftpanel').removeClass('expandpanel');
        $('#leftpanel > div.row-fluid').toggleClass('closepanel');
        $('#leftpanel').toggleClass('closepanel');
        $('#main').toggleClass('svg-leftpanel');
        $('#btnSelect').css('display', 'none');
    }
};

function closeRightPanel() {
    if ($('#leftpanel').hasClass('forceclosepanel')) {
        // do nothing
    } else {
        /*$('#rightpanel .nav-tabs').hide();*/
        $('#rightpanel').removeClass('expandpanel');
        $('#rightpanel > div.row-fluid').toggleClass('closepanel');
        $('#rightpanel').toggleClass('closepanel');
        $('#main').toggleClass('svg-rightpanel');
    }
};

var myurl = window.location.toString();
var fileid = "";
var cindex = 0;
if (myurl.indexOf("dfId=") > 0) {
    fileid = myurl.substring(myurl.indexOf("dfId=") + 5);
    cindex = fileid.indexOf("&");
    if (cindex > 0) {
        fileid = fileid.substring(0, cindex);
    };
};
var hostname = "";
if (myurl.indexOf("host=") > 0) {
    hostname = myurl.substring(myurl.indexOf("host=") + 5);
    cindex = hostname.indexOf("&");
    if (cindex > 0) {
        hostname = hostname.substring(0, cindex);
    };
};
var apikey = "";
if (myurl.indexOf("key=") > 0) {
    apikey = myurl.substring(myurl.indexOf("key=") + 4);
    cindex = apikey.indexOf("&");
    if (cindex > 0) {
        apikey = apikey.substring(0, cindex);
    };
};
var ddiurl = "";
if (myurl.indexOf("ddiurl=") > 0) {
    ddiurl = myurl.substring(myurl.indexOf("ddiurl=") + 7);
    ddiurl = ddiurl.replace(/%25/g, "%");
    ddiurl = ddiurl.replace(/%3A/g, ":");
    ddiurl = ddiurl.replace(/%2F/g, "/");
    cindex = ddiurl.indexOf("&");
    if (cindex > 0) {
        ddiurl = ddiurl.substring(0, cindex);
    };
};
var dataurl = "";
if (myurl.indexOf("dataurl=") > 0) {
    dataurl = myurl.substring(myurl.indexOf("dataurl=") + 8);
    dataurl = dataurl.replace(/%25/g, "%");
    dataurl = dataurl.replace(/%3A/g, ":");
    dataurl = dataurl.replace(/%2F/g, "/");
    cindex = dataurl.indexOf("&");
    if (cindex > 0) {
        dataurl = dataurl.substring(0, cindex);
    };
};


console.log("fileid: " + fileid);
console.log("hostname: " + hostname);
console.log("apikey: " + apikey);
console.log("ddiurl: " + ddiurl);
console.log("dataurl: " + dataurl);
