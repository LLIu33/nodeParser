'use strict';

var sinon = require('sinon');
var should = require('should');
var http = require('http');
var htmlparser = require('htmlparser');
var sys = require('sys');
var grabdata = require('../grabdata');

var fs = require('fs');

require.extensions['.html'] = function (module, filename) {
  module.exports = fs.readFileSync(filename, 'utf8');
};

var correct = require('./fixtures/correct.html');
var emptyHTML = require('./fixtures/empty.html');
var withoutActivity = require('./fixtures/silent.html');

var response = {
  on: function () {},
  end: function () {},
  setEncoding: function () {}
};

var fakeHandler = {
    reset: function(){},
    done: function(){},
    writeTag: function(){},
    writeText: function(){},
    writeComment: function(){},
    writeDirective: function(){}
  }

describe('grabData', function () {

  describe('check requests', function () {
    beforeEach(function () {
      this.sandbox = sinon.sandbox.create();
      this.sandbox.stub(response, 'on')
        .withArgs('response').yields(response)
        .withArgs('data').yields(correct)
        .withArgs('end').yields()
      this.sandbox.stub(http, 'request', function () {
        return response;
      });

      this.req = {
        body: {
          city: 'tagan'
        }
      };

      this.res = {
        json: function(data) {
          return data;
        }
      };

    });

    afterEach(function () {
      this.sandbox.restore()
    });

    it('should call http request', function (done) {
      grabdata.get(this.req, this.res);
      http.request.called.should.be.true();
      done();
    });

    it('should call http request with correct data', function () {
      grabdata.get(this.req, this.res);
      var args = http.request.args[0];
      args[0].should.be.Object().and.eql({
        'port': "80",
        'host': 'mytogo.ru',
        'path': '/?tmpl=kikertagan',
        'method': 'GET'
      });
    });

  });

  describe('check parser', function () {
    beforeEach(function () {
      this.sandbox = sinon.sandbox.create();
      this.sandbox.stub(response, 'on')
        .withArgs('response').yields(response)
        .withArgs('data').yields(correct)
        .withArgs('end').yields()
      this.sandbox.stub(http, 'request', function () {
        return response;
      });

      this.req = {
        body: {
          city: 'tagan'
        }
      };

      this.res = {
        json: function(data) {
          return data;
        }
      };
      this.sandbox.spy(this.res, 'json');
      this.sandbox.stub(sys, 'debug');
    });

    afterEach(function () {
      this.sandbox.restore();
    });

    it('should return correct data if users active', function () {
      grabdata.get(this.req, this.res);
      var args = this.res.json.args[0];
      var time = new Date().toLocaleString();

      this.res.json.args[0].should.be.Array().and.eql([{
        taverns: [
          {
            name: 'Cow',
            logo: 'http://mytogo.ru/images/mtg/korova.png',
            usersInside: [],
            usersPlanToPlay: [
              {
                name: 'Artem',
                avatar: 'http://mytogo.ru/templates/mytogotmp/ava/Shizzmini.jpg',
                date: '08-10-2015',
                time: '12:30'
              }
            ]
          },
          {
            name: 'Harats',
            logo: 'http://mytogo.ru/images/mtg/harats.png',
            usersInside: [
              {
                name: 'AnDou',
                avatar: 'http://mytogo.ru/templates/mytogotmp/ava/AnDoumini.jpg',
                date: '<b>NOW</b>',
                time: ''
              }
            ],
            usersPlanToPlay: [
              {
                name: 'AnDou',
                avatar: 'http://mytogo.ru/templates/mytogotmp/ava/AnDoumini.jpg',
                date: '25-07-2015',
                time: '13:00'
              }
            ]
          }
        ],
        time: time
      }]);
      this.res.json.called.should.be.true();
    });

    it('should return correct data if users don\'t active', function () {
      response.on.withArgs('data').yields(withoutActivity);
      grabdata.get(this.req, this.res);
      var args = this.res.json.args[0];
      var time = new Date().toLocaleString();
      this.res.json.called.should.be.true();
      this.res.json.args[0].should.be.Array().and.eql([
        {
          taverns: [
            {
              name: 'Ceshka',
              logo: 'http://mytogo.ru/images/mtg/ceshka.png',
              usersInside: [],
              usersPlanToPlay: []
            }
          ],
          time: time
        }
      ]);
    });

    it('should return empty data if body empty', function () {
      response.on.withArgs('data').yields(emptyHTML);
      grabdata.get(this.req, this.res);
      var args = this.res.json.args[0];
      var time = new Date().toLocaleString();
      this.res.json.called.should.be.true();
      this.res.json.args[0].should.be.Array().and.eql([
        {
          taverns: [],
          time: time
        }
      ]);
    });

    it('should call htmlparser with correct body', function () {
      var parser = {
        parseComplete: function (parameters) {}
      }
      this.sandbox.stub(htmlparser, 'Parser').returns(parser);
      this.sandbox.spy(parser, 'parseComplete');
      grabdata.get(this.req, this.res);
      parser.parseComplete.args[0].should.be.eql([correct]);
    });

    it('should don\'t send response and show error if htmlparser.DefaultHandler throw error', function () {
      this.sandbox.stub(htmlparser, 'DefaultHandler').returns(fakeHandler).yields('Achtung!', undefined);
      grabdata.get(this.req, this.res);
      this.res.json.called.should.be.false();
      sys.debug.called.should.be.true();
      sys.debug.args[0].should.be.eql(['Error: Achtung!']);
    });

  });
  
});

