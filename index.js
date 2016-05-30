var fs = require('fs');
// var htmlencode = require('htmlencode').htmlEncode;

var Pointandclick = function() {};

Pointandclick.addToHead = function(params) {
  return '<link href="/static/pointandclick/style.css" rel="stylesheet">\n' +
    '<script src="/static/pointandclick/jquery.min.js" type="text/javascript"></script>\n' +
    '<script src="/static/pointandclick/pointandclick.js" type="text/javascript"></script>\n';
};

Pointandclick.addToBody = function(params) {
  return '';
};

Pointandclick.initialize = function(req, params, handlers, cb) {

  // Initialize the content type
  params.headContent += Pointandclick.addToHead(params);
  params.bodyContent += Pointandclick.addToBody(params);

  // Initialize the content package
  handlers.contentPackages[req.params.contentPackage].initialize(req, params, handlers, function() {
    cb();
  });
};

Pointandclick.handleEvent = function(event, payload, req, res, protocolPayload) {
  var dir = Pointandclick.config.logDirectory + '/pointandclick/' + req.params.contentPackage;
  if (event == 'log') {
    fs.mkdir(dir, 0775, function(err) {
      var name = payload.exampleId.replace(/\.|\/|\\|~/g, "-") + '.log';
      var data = new Date().toISOString() + ' ' + JSON.stringify(payload) + ' ' + JSON.stringify(protocolPayload || {}) + '\n';
      fs.writeFile(dir + '/' + name, data, { flag: 'a' }, function(err) {});
    });
  }
};

Pointandclick.register = function(handlers, app, conf) {
  handlers.contentTypes.pointandclick = Pointandclick;
  fs.mkdir(conf.logDirectory + '/pointandclick', 0775, function(err) {});
  Pointandclick.config = conf;
};

Pointandclick.namespace = 'pointandclick';
Pointandclick.installedContentPackages = [];
Pointandclick.packageType = 'content-type';

Pointandclick.meta = {
  'name': 'pointandclick',
  'shortDescription': 'Content type for point-and-click exercises.',
  'description': '',
  'author': 'Tapio Auvinen',
  'license': 'MIT',
  'version': '0.0.1',
  'url': ''
};

module.exports = Pointandclick;
