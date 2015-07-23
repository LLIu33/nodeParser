'use strict';
var http = require('http');
var sys = require('sys');
var express = require('express');
var fs = require('fs');
var nconf = require('nconf');

var app = express();
var bodyParser = require('body-parser');
var multer = require('multer'); 

nconf.argv()
     .env()
     .file({ file: 'config.json' });

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(multer()); // for parsing multipart/form-data
app.set('port', (process.env.PORT || nconf.get('server').port));

app.use('/', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, ' +
           'Content-Type, Accept');
  next();
});

app.all('/', function(req, res) {
  res.send('Site for parsing mytogo.ru');
});

app.all('/grabData', require('./grabdata').get);

var server = app.listen(app.get('port'), function() {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});