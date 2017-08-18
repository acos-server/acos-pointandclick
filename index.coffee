fs = require('fs')
path = require('path')
nunjucks = require('nunjucks')
pacutil = require('clickdragfillin-util')

# nunjucks views (templates)
njEnv = nunjucks.configure(path.join(__dirname, 'views'))

# cache parsed XML exercise definitions
exerciseCache = {}


finalFeedbackPayloadTransformer = (payload, serverAddress) ->
  # payload.answers has the feedback object sent from the frontend
  # do not include payload for questions that were not answered in the submission
  # JSON parsing may convert numbers to number types but we need strings
  if typeof payload.answers != 'object' or not Array.isArray payload.answers.labelsUsed
    # payload is malformed, delete everything
    for own label, obj of payload
      delete payload[label]
    return
  else
    labelsUsed = (x.toString() for x in payload.answers.labelsUsed)
  
  for own label, obj of payload
    if label == 'answers'
      continue # special value used for the final feedback
    if not (label in labelsUsed)
      delete payload[label]
    else
      obj.feedback = pacutil.convertRelativeUrlsInHtml obj.feedback, serverAddress
  delete payload.answers.labelsUsed
  null


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
      pacutil.buildFinalFeedback(Pointandclick, Pointandclick.handlers.contentPackages[req.params.contentPackage],
        __dirname, Pointandclick.config.serverAddress, njEnv, exerciseCache, payload, req,
        finalFeedbackPayloadTransformer,
        () -> cb(event, payload, req, res, protocolPayload, responseObj))
      
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
    'version': '0.2.0',
    'url': ''
  }


module.exports = Pointandclick
