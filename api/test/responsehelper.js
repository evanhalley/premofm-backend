var should = require("should");
var winston = require('winston');

GLOBAL.config = require('../conf/unit-tst.config.js');

/* Logger configuration */
var logger = new (winston.Logger)({
	transports: [
		new (winston.transports.Console)({ json: false, timestamp: true, colorize: true, level: config.logger.level }),
		new winston.transports.File({ filename: config.logger.path + config.logger.file, json: false, colorize: true, level: config.logger.level })
	],
	exceptionHandlers: [
		new (winston.transports.Console)({ json: false, timestamp: true, colorize: true, level: config.logger.level }),
		new winston.transports.File({ filename: config.logger.path + config.logger.file, json: false, colorize: true, level: config.logger.level })
	],
	exitOnError: true
});
GLOBAL.logger = logger;

var responseHelper = require("../helpers/responsehelper.js");

describe('ResponseHelper', function() {

	describe('Send Get Response, 200', function() {

		it('should send GET response, 200', function(done) {
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				code.should.eql(200);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					result.test.should.eql("test");
					done();
				};
				return obj;
			};
			responseHelper.sendGetResponse(response, 200, {"test":"test"});
		});
	});

	describe('Send Get Response, 500, Null object', function() {

		it('should send GET response, 500, receive null object', function(done) {
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				code.should.eql(500);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					done();
				};
				return obj;
			};
			responseHelper.sendGetResponse(response, 500, {"test": null});
		});
	});

	describe('Send Post Response, 200, Success = true', function() {

		it('should send POST response, 200, Success = true', function(done) {
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				code.should.eql(200);
				var obj = Object.create(Object.prototype);
				
				obj.send = function(result) {
					result.success.should.be.true;
					done();
				};
				return obj;
			};
			responseHelper.sendPostResponse(response, 200, true);
		});
	});

	describe('Send Post Response, 200, Success = false, w/ Message', function() {

		it('should send POST response, 500, Success = true, w/ Message', function(done) {
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				code.should.eql(500);
				var obj = Object.create(Object.prototype);

				obj.send = function(result) {
					result.success.should.be.false;
					result.message.should.eql("error");
					done();
				};
				return obj;
				
			};
			responseHelper.sendPostResponse(response, 500, false, "error");
		});
	});

	describe('Send Error Response, 500, w/ Message', function() {

		it('should send error response, 500, w/ Message', function(done) {
			var response = Object.create(Object.prototype);
			response.status = function(code) {
				code.should.eql(500);

				var obj = Object.create(Object.prototype);
				obj.send = function(result) {
					result.should.eql("error");
					done();
				};
				return obj;
			};
			responseHelper.sendHttpError(response, 500, "error");
		});
	});

});