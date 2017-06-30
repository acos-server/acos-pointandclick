fs = require('fs')
path = require('path')
nunjucks = require('nunjucks')
pacutil = require('clickdragfillin-util')

# nunjucks views (templates)
njEnv = nunjucks.configure(path.join(__dirname, 'views'))

# cache parsed XML exercise definitions
exerciseCache = {}

Pointandclick =

  # Registers the content type at server startup
  register: (handlers, app, conf) ->
    handlers.contentTypes.pointandclick = Pointandclick
    fs.mkdir(conf.logDirectory + "/#{ Pointandclick.namespace }/", 0o0775, ((err) -> ))
    Pointandclick.config = conf
    Pointandclick.handlers = handlers
    
  
  # Adds a content package (at server startup)
  registerContentPackage: (contentPackagePrototype, contentPackageDir) ->
    # Autodiscover exercises: any XML file in the content package directory "exercises"
    # is assumed to be an exercise (with a corresponding JSON file). The files may be nested
    # in subdirectories.
    pacutil.registerContentPackage contentPackagePrototype, contentPackageDir


  # Initializes the exercise (called when a user starts an exercise)
  initialize: (req, params, handlers, cb) ->
    pacutil.initializeContentType(Pointandclick, njEnv, exerciseCache, req, params, handlers, cb)


  handleEvent: (event, payload, req, res, protocolPayload, responseObj, cb) ->
    if event == 'grade' and payload.feedback?
      # add <style> element for styling the final feedback
      fs.readFile path.join(__dirname, 'static', 'feedback.css'), 'utf8', (err, cssData) ->
        if (!err)
          styleTag = "<style>#{ cssData }</style>"
          # insert the <style> element inside the feedback <div> at the beginning
          styleStartIdx = payload.feedback.indexOf('>') + 1 # should be the index after the end of the first <div> start tag
          payload.feedback = payload.feedback.slice(0, styleStartIdx) + styleTag + payload.feedback.slice(styleStartIdx)
        
        cb event, payload, req, res, protocolPayload, responseObj
      
      return # cb is called in the callback in this if branch
      
    else if (event == 'log' and
        Pointandclick.handlers.contentPackages[req.params.contentPackage].meta.contents[req.params.name]?)
      # log event, checked that the exercise (req.params.name) has been registered in the content package
      pacutil.writeExerciseLogEvent(Pointandclick.config.logDirectory, Pointandclick, payload, req, protocolPayload)
    
    cb event, payload, req, res, protocolPayload, responseObj
    

  # Metadata
  namespace: 'pointandclick'
  packageType: 'content-type'
  installedContentPackages: []

  meta: {
    'name': 'pointandclick',
    'shortDescription': 'Content type for point-and-click exercises.',
    'description': 'Content type for point-and-click exercises.',
    'author': 'Tapio Auvinen',
    'license': 'MIT',
    'version': '0.1.0',
    'url': ''
  }


module.exports = Pointandclick
