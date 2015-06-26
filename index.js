'use strict';
var select = require('soupselect').select;
var htmlparser = require('htmlparser');
var _ = require('underscore');
var http = require('http');
var sys = require('sys');

// Fetch some HTML...
var http = require('http');

var request = http.request({
  port: 80,
  host: 'www.mytogo.ru',
  method: 'GET',
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
        // Get collection of taverns with kicker tables
        var taverns = [];
        var tavernSelector = '.container .col-lg-9.col-md-9.col-sm-8';
        var tavernRows = select(dom, tavernSelector)[0].children;
        tavernRows = _.filter(tavernRows, function(item) {
          if (item.type == 'tag')
                return item;
        });
        // Remove trash node from collection
        tavernRows.shift();

        _.each(tavernRows, function(tavernRow, tavernKey) {
          // Create item for every tavern
          taverns.push(new Tavern);

          // Get name and logo
          var tavernNode = select(tavernRow, 'img')[0];
          taverns[tavernKey]['name'] = tavernNode.attribs.alt;
          taverns[tavernKey]['logo'] = tavernNode.attribs.src;

          // Get people activity
          var usersNode = select(tavernRow, '.col-lg-6.col-md-6.col-sm-6');
          var usersInside = usersNode[0].children[1];
          var usersToPlay = usersNode[1].children[1];

          _.each(usersInside.children, function(item, i) {
            if (item.name == 'img') {
              var userInside = new User;
              var nameIndex = i + 1;
              userInside['avatar'] = usersInside.children[i].attribs.src;
              userInside['name'] = usersInside.children[nameIndex].raw;
              taverns[tavernKey]['usersInside'].push(userInside);
            }
          });

          _.each(usersToPlay.children, function(item, i) {
            if (item.attribs && item.attribs.class == 'bold') {
              var userToPlay = new User;
              var imgIndex = i + 2;
              var nameIndex = i + 3;
              userToPlay['dateOfPlan'] = item.raw;
              userToPlay['avatar'] = usersToPlay.children[imgIndex].attribs.src;
              userToPlay['name'] = usersToPlay.children[nameIndex].raw;
              taverns[tavernKey]['usersPlanToPlay'].push(userToPlay);
            }
          });
        });
        res.json {
          taverns: taverns,
          host: host,
        };
      }
    });

    var parser = new htmlparser.Parser(handler);
    parser.parseComplete(body);
  });
});
request.end();

function Tavern() {
  this.name = '';
  this.logo = '';
  this.usersInside = [];
  this.usersPlanToPlay = [];
}

function User() {
  this.name = '';
  this.avatar = '';
  this.dateOfPlan = '';
}