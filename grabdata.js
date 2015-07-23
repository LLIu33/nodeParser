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
  var tavernRows = select(dom, tavernSelector)[0].children;

  tavernRows = _.each(tavernRows, function(tavernRow) {
    var tavernNode = select(tavernRow, 'img')[0];
    // check empty and trash elements
    if ((tavernRow.type !== 'tag') || (typeof tavernNode === 'undefined')) { return; }
    // Create item for every tavern
    var tavern = new Tavern();
    // Get name and logo
    tavern.name = tavernNode.attribs.alt;
    tavern.logo = 'http://' + host + tavernNode.attribs.src;

    // Get people activity
    var usersNode = select(tavernRow, '.col-lg-6.col-md-6.col-sm-6');
    var usersInside = usersNode[0].children[1];
    var usersToPlay = usersNode[1].children[1];

    _.each(usersInside.children, function(item, i) {
      if (item.name === 'img') {
        var userInside = new User();
        var nameIndex = i + 1;
        userInside.avatar = 'http://' + host + usersInside.children[i].attribs.src;
        userInside.name = usersInside.children[nameIndex].raw;
        userInside.date = '<b>NOW</b>';
        tavern.usersInside.push(userInside);
      }
    });

    var dateBlocks = [];
    var j = 0;
    _.each(usersToPlay.children, function(item, i) {
      if (item.attribs && item.attribs.class === 'bold') {
        ++j;
      }
      dateBlocks[j] = (dateBlocks[j]) ? dateBlocks[j] : [];
      dateBlocks[j].push(item);
    });
    dateBlocks.shift();
    if (dateBlocks.length > 0) {
      _.each(dateBlocks, function(block) {
        var dateToPlay = '';
        _.each(block, function(item, i) {
          if (item.attribs && item.attribs.class === 'bold') {
            var dateTmp = item.children[0].raw.split('-');
            dateToPlay = dateTmp[0] + '-' + dateTmp[1] + '-' +  dateTmp[2];
          }
          if (item.attribs && item.attribs.src) {
            var userToPlay = new User();
            userToPlay.avatar = 'http://' + host + item.attribs.src;
            var nameArr = block[i+1].raw.split(' в ');
            userToPlay.name = nameArr[0];
            userToPlay.time = nameArr[1];
            userToPlay.date = dateToPlay;
            tavern.usersPlanToPlay.push(userToPlay);
          }
        });
      });
    }
    taverns.push(tavern);
  });


  return {
    taverns: taverns, 
    time: new Date().toLocaleString()
  };
}

exports.get = function(req, res) {
  var city = (typeof req.body.city !== 'undefined') ? req.body.city : 'rostov';
  var path = nconf.get(city).path;

  console.log(host + path);

  var request = http.request({
    port: nconf.get('target').port,
    host: host,
    path: path,
    method: nconf.get('target').method
  });

  request.on('response', function(response) {
    response.setEncoding('utf8');

    var body = '';
    response.on('data', function(chunk) {
      body = body + chunk;
    });

    response.on('end', function() {

      // Now we have the whole body, parse it and select the nodes we want...
      var handler = new htmlparser.DefaultHandler(function(err, dom) {
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