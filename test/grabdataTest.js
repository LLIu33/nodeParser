'use strict';

var sinon = require('sinon');
var should = require('should');
var http = require('http');
var grabdata = require('../grabdata');

var response = {
  on: function () {},
  end: function () {},
  setEncoding: function () {}
};

describe('grabData', function () {

  describe('check requests', function () {
     beforeEach(function () {
      this.sandbox = sinon.sandbox.create();
      this.sandbox.stub(response, 'on')
        .withArgs('response').yields(response)
        .withArgs('data').yields('12')
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
    })
  });
  
});

