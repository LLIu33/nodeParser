'use strict';

var select = require('soupselect').select;
var htmlparser = require('htmlparser');
var http = require('http');
var sys = require('sys');
var nconf = require('nconf');
var _ = require('underscore');

nconf.argv()
     .env()
     .file({ file: 'config.json' });

var host = nconf.get('target').url;

function Tavern() {
  this.name = '';
  this.logo = '';
  this.usersInside = [];
  this.usersPlanToPlay = [];
}

function User() {
  this.name = '';
  this.avatar = '';
  this.date = '';
  this.time = '';
}

function parseHTML(dom) {
  // Get collection of taverns with kicker tables
  var taverns = [];
  var tavernSelector = '.container .col-lg-9.col-md-9.col-sm-8';
  var rowTaverns = select(dom, tavernSelector)[0];
  // Check existence of element with taverns data
  if (!rowTaverns) {
    return {
      taverns: [],
      time: new Date().toLocaleString()
    };
  }

  var tavernRows = rowTaverns.children;
  tavernRows = _.each(tavernRows, function (tavernRow) {
    var tavernNode = select(tavernRow, 'img')[0];
    // check empty and trash elements
    if ((tavernRow.type !== 'tag') || !tavernNode) {
      return;
    }
    // Create item for every tavern
    var tavern = new Tavern();
    // Get name and logo
    tavern.name = tavernNode.attribs.alt;
    tavern.logo = 'http://' + host + tavernNode.attribs.src;

    // Get people activity
    var usersNode = select(tavernRow, '.col-lg-6.col-md-6.col-sm-6');
    var usersInside = usersNode[0].children[1];
    var usersToPlay = usersNode[1].children[1];

    _.each(usersInside.children, function (item, i) {
      if (item.name === 'img') {
        var userInside = new User();
        var nameIndex = i + 1;
        userInside.avatar = 'http://' + host + usersInside.children[i].attribs.src;
        userInside.name = usersInside.children[nameIndex].raw;
        userInside.date = '<b>NOW</b>';
        tavern.usersInside.push(userInside);
      }
    });

    var user, Time;
    _.each(usersToPlay.children, function (element) {
      if (element.attribs && element.attribs.class === 'bold') {
        Time = element.children[0].data;
      }
      if (element.attribs && element.attribs.src) {
        user = new User();
        user.avatar = 'http://' + host + element.attribs.src;
        user.date = Time;
        tavern.usersPlanToPlay.push(user);
      }
      if (element.type === 'text' && element.data.indexOf(' в ') !== -1) {
        var last = tavern.usersPlanToPlay.length - 1;
        user = tavern.usersPlanToPlay[last];
        var tmp = element.data.split(' в ');
        user.name = tmp[0].trim();
        user.time = tmp[1].trim();
        tavern.usersPlanToPlay[last] = user;
      }
    });

    taverns.push(tavern);
  });


  return {
    taverns: taverns,
    time: new Date().toLocaleString()
  };
}

exports.get = function (req, res) {
  var city = req.body.city || 'rostov';
  var path = nconf.get(city).path;
  var body = '';

  console.log(host + path);

  var request = http.request({
    port: nconf.get('target').port,
    host: host,
    path: path,
    method: nconf.get('target').method
  });

  request.on('response', function (response) {
    response.setEncoding('utf8');

    response.on('data', function (chunk) {
      body += chunk;
    });

    response.on('end', function () {
      // Now we have the whole body, parse it and select the nodes we want...
      var handler = new htmlparser.DefaultHandler(function (err, dom) {
        if (err) {
          sys.debug('Error: ' + err);
        } else {
          res.json(parseHTML(dom));
        }
      });

      var parser = new htmlparser.Parser(handler);
      parser.parseComplete(body);
    });
  });
  request.end();
};