fs = require('fs')
Exercise = require('./exercise')
#htmlencode = require('htmlencode').htmlEncode
#querystring = require('querystring')

Pointandclick =

  # Registers the content type at server startup
  register: (handlers, app, conf) ->
    handlers.contentTypes.pointandclick = Pointandclick
    fs.mkdir(conf.logDirectory + '/pointandclick', 0o0775, ((err) -> ))
    Pointandclick.config = conf
    
  
  # Adds a content package (at server startup)
  registerContentPackage: (contentPackagePrototype, contentPackageDir) ->
    # Autodiscover exercises
    fs.readdir(contentPackageDir, (err, files) ->
      order = 0
      for filename in files
        if (/\.xml$/.test(filename) && !fs.statSync(contentPackageDir + '/' + filename).isDirectory())
          # Get the filename without the extension
          exerciseName = filename.substring(0, filename.length - 4)
          
          contentPackagePrototype.meta.contents[exerciseName] = {
            'title': exerciseName,
            'description': '',
            'order': order++
          }
          
          contentPackagePrototype.meta.teaserContent.push(exerciseName)
    )

    
  # Initializes the exercise (called when a user starts an exercise)
  initialize: (req, params, handlers, cb) ->
    contentPackage = handlers.contentPackages[req.params.contentPackage]
    xml = fs.readFileSync(contentPackage.getDir() + '/' + params['name'] + '.xml', 'utf8')
    
    Exercise.parseXml xml, (err, tree, head) ->
      if err
        handlers.contentTypes.pointandclick.renderError(err, params)
      else
        userDefinedJsonFilename = contentPackage.getDir() + '/content/' + params['name'] + '.json'
        
        params.headContent += head.html(omitRoot: true) if head?
        params.headContent += '\n<link href="/static/pointandclick/style.css" rel="stylesheet">' +
          '\n<script src="/static/pointandclick/pointandclick.js" type="text/javascript"></script>'
        
        # Load user-provided JSON payload
        payload = if fs.existsSync(userDefinedJsonFilename)
            JSON.parse(fs.readFileSync(userDefinedJsonFilename, 'utf8'))
          else
            {}
        
        # Add autogenerated payload
        payload = Exercise.jsonPayload(payload, tree)
        
        params.headContent += '\n<script type="text/javascript">\nwindow.pointandclick = ' + JSON.stringify(payload) + ';\n</script>\n'
    
        params.bodyContent += '<div class="pointandclick">\n' +
          tree.html(omitRoot: true) +
          '\n\n<div id="pointandclick-feedback"></div><div id="pointandclick-points"></div>\n</div>'

      cb()
    
  
  renderError: (error, params) ->
    params.bodyContent = "<div class='alert-danger'>\n" + error.toString() + "\n</div>"


  handleEvent: (event, payload, req, res, protocolPayload, responseObj, cb) ->
    dir = Pointandclick.config.logDirectory + '/pointandclick/' + req.params.contentPackage
    
    if (event == 'log')
      fs.mkdir(dir, 0o0775, (err) ->
        name = payload.exampleId.replace(/\.|\/|\\|~/g, "-") + '.log'
        data = new Date().toISOString() + ' ' + JSON.stringify(payload) + ' ' + JSON.stringify(protocolPayload || {}) + '\n'
        fs.writeFile(dir + '/' + name, data, { flag: 'a' }, ((err) -> ))
      )
    
    cb event, payload, req, res, protocolPayload, responseObj
    

  # Metadata
  namespace: 'pointandclick'
  packageType: 'content-type'
  installedContentPackages: []

  meta: {
    'name': 'pointandclick',
    'shortDescription': 'Content type for point-and-click exercises.',
    'description': '',
    'author': 'Tapio Auvinen',
    'license': 'MIT',
    'version': '0.0.1',
    'url': ''
  }


module.exports = Pointandclick
