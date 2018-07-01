(function() {
  var Pointandclick, exerciseCache, finalFeedbackPayloadTransformer, fs, njEnv, nunjucks, pacutil, path,
    hasProp = {}.hasOwnProperty,
    indexOf = [].indexOf;

  fs = require('fs');

  path = require('path');

  nunjucks = require('nunjucks');

  pacutil = require('acos-clickdragfillin-util');

  // nunjucks views (templates)
  njEnv = nunjucks.configure(path.join(__dirname, 'views'));

  // cache parsed XML exercise definitions
  exerciseCache = {};

  finalFeedbackPayloadTransformer = function(payload, serverAddress) {
    var label, labelsUsed, obj, x;
    // payload.answers has the feedback object sent from the frontend
    // do not include payload for questions that were not answered in the submission
    // JSON parsing may convert numbers to number types but we need strings
    if (typeof payload.answers !== 'object' || !Array.isArray(payload.answers.labelsUsed)) {
      for (label in payload) {
        if (!hasProp.call(payload, label)) continue;
        obj = payload[label];
        delete payload[label];
      }
      return;
    } else {
      labelsUsed = (function() {
        var i, len, ref, results;
        ref = payload.answers.labelsUsed;
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          x = ref[i];
          results.push(x.toString());
        }
        return results;
      })();
    }
    for (label in payload) {
      if (!hasProp.call(payload, label)) continue;
      obj = payload[label];
      if (label === 'answers') {
        continue; // special value used for the final feedback
      }
      if (!(indexOf.call(labelsUsed, label) >= 0)) {
        delete payload[label];
      }
    }
    delete payload.answers.labelsUsed;
    delete payload.finalcomment;
    return null;
  };

  Pointandclick = {
    // Registers the content type at server startup
    register: function(handlers, app, conf) {
      handlers.contentTypes.pointandclick = Pointandclick;
      fs.mkdir(conf.logDirectory + `/${Pointandclick.namespace}/`, 0o0775, (function(err) {}));
      Pointandclick.config = conf;
      return Pointandclick.handlers = handlers;
    },
    
    // Adds a content package (at server startup)
    registerContentPackage: function(contentPackagePrototype, contentPackageDir) {
      // Autodiscover exercises: any XML file in the content package directory "exercises"
      // is assumed to be an exercise (with a corresponding JSON file). The files may be nested
      // in subdirectories.
      return pacutil.registerContentPackage(contentPackagePrototype, contentPackageDir);
    },
    // Initializes the exercise (called when a user starts an exercise)
    initialize: function(req, params, handlers, cb) {
      return pacutil.initializeContentType(Pointandclick, njEnv, exerciseCache, req, params, handlers, cb);
    },
    handleEvent: function(event, payload, req, res, protocolPayload, responseObj, cb) {
      if (event === 'grade' && (payload.feedback != null)) {
        pacutil.buildFinalFeedback(Pointandclick, Pointandclick.handlers.contentPackages[req.params.contentPackage], __dirname, Pointandclick.config.serverAddress, njEnv, exerciseCache, payload, req, finalFeedbackPayloadTransformer, function() {
          return cb(event, payload, req, res, protocolPayload, responseObj); // cb is called in the callback in this if branch
        });
        return;
      } else if (event === 'log' && (Pointandclick.handlers.contentPackages[req.params.contentPackage].meta.contents[req.params.name] != null)) {
        // log event, checked that the exercise (req.params.name) has been registered in the content package
        pacutil.writeExerciseLogEvent(Pointandclick.config.logDirectory, Pointandclick, payload, req, protocolPayload);
      }
      return cb(event, payload, req, res, protocolPayload, responseObj);
    },
    
    // Metadata
    namespace: 'pointandclick',
    packageType: 'content-type',
    installedContentPackages: [],
    meta: {
      'name': 'pointandclick',
      'shortDescription': 'Content type for point-and-click exercises.',
      'description': 'Content type for point-and-click exercises.',
      'author': 'Tapio Auvinen, Markku Riekkinen',
      'license': 'MIT',
      'version': '0.3.0',
      'url': ''
    }
  };

  module.exports = Pointandclick;

}).call(this);
