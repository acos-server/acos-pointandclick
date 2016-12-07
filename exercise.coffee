xml2js = require('xml2js')
_ = require('underscore')

class ExerciseNode
    
  addChildren: (children) ->
    @children ||= []
    
    if children instanceof Array
      @children = @children.concat(children)
    else
      @children.push children
  
  
    
  
  # Renders the inner text of all child nodes recursively into a string.
  innerText: () ->
    return '' unless @children
    @children.map((child) -> child.innerText()).join(' ')

  # Renders the inner text of only direct child nodes into a string.
  innerTextShallow: () ->
    return '' unless @children
    _.filter(@children.map((child) -> child.text), (item) -> !!item).join(' ')
    

  # renders <feedback> child nodes into attributes (data-feedback=...)
  feedbackHtml: () ->
    return '' unless @children
  
    for child in @children
      if child.nodeName == 'feedback'
        if child.attributes['correct'] == 'true'
          correctFeedback = child.innerText()
        else
          incorrectFeedback = child.innerText()

    attributes = []
    attributes.push "data-correct-feedback='#{correctFeedback}'" if correctFeedback
    attributes.push "data-incorrect-feedback='#{incorrectFeedback}'" if incorrectFeedback
    attributes.join (' ')

# A plain text node
class ExerciseTextNode extends ExerciseNode
  constructor: (text) ->
    @text = text
  
  html: ->
    @text

  innerText: ->
    @text


# A generic HTML node, which may have children
class ExerciseHtmlNode extends ExerciseNode
  # node: xml2js dom node
  constructor: (name, attributes) ->
    @nodeName = name
    @attributes = attributes || {}
    
  # Renders the node and its children as HTML
  # Returns a string
  # options:
  # {omitRoot: true} renders only the children
  html: (options = {}) ->
    # Render attributes into a string, e.g. "class='highlight'"
    attributesHtml = if @attributes
      ' ' + (Object.keys(@attributes).map (attribute) =>
        # The only characters that must be escaped within attributes are amp and quot
        "#{attribute}='#{@attributes[attribute].replace(/[&]/g, '&amp;').replace(/["]/g, '&quot;')}'").join(' ')
    else
      ''

    if options['omitRoot'] || !@nodeName
      @children.map((child) -> child.html()).join('')
    else
      if @children
        html = "\n<#{@nodeName}" +
              attributesHtml +
              ">" +
              @children.map((child) -> child.html()).join('') +
              "</#{@nodeName}>"
      else
        html = "<#{@nodeName}"+ 
              attributesHtml +
              " />"


class ExerciseClickableNode extends ExerciseNode
  constructor: (@id) ->
    
  html: ->
    feedback = this.feedbackHtml()
    text = this.innerTextShallow()
  
    "<span id='#{@id}' #{feedback} class='clickable'>#{text}</span>"
    

class ExerciseFillinNode extends ExerciseNode
  constructor: (@id) ->
    #@attributes = node['$']
    
  html: ->
    feedback = this.feedbackHtml()
    text = this.innerTextShallow()
  
    "<input id='#{id}' type='text' #{feedback} />"



Exercise = {
  
  # Parses an XML string and converts it into a tree of ExerciseNodes
  # Calls callback(error, tree, head) with the resulting ExerciseNode tree
  parseXml: (xml, callback) ->
    # Initialize XML parser
    parser = new xml2js.Parser(
        normalizeTags: true
        explicitChildren: true
        preserveChildrenOrder: true
        charsAsChildren: true
      )
    
    # Parse string into an XML DOM
    parser.parseString xml, (err, result) ->
      if err
        callback(err)
      else 
        Exercise.parseDom(result, callback)


  # Parses the XML DOM into a tree of Exercise Nodes
  # Calls callback(error, tree, head) with the resulting ExerciseNode tree
  parseDom: (dom, callback) ->
    idCounter = (->
      current = 0
      return -> current++
    )()

    
    # If root is <html>
    if dom['html']
      head = dom['html']['head']
      if head
        head = Exercise.parseDomNode(head[0], idCounter)
    
      body = dom['html']['body']
      if body && body.length > 0
        tree = Exercise.parseDomNode(body[0], idCounter)
      else
        callback("&lt;html&gt; tag must contain a &lt;body&gt; tag")
        return
    
    # If root is not <html>
    else
      # Content is not wrapped in <html>, dom looks like { div: {...} }
      tree = Exercise.parseDomNode(dom[Object.keys(dom)[0]], idCounter)
      
    callback(null, tree, head)
  
  
  # Parses a node of the XML DOM
  # returns: ExerciseNode or array of ExerciseNodes
  parseDomNode: (xmlNode, idCounter) ->
    nodeName = xmlNode['#name']

    if nodeName == '__text__'
      return Exercise.parseTextNode(xmlNode, idCounter)
    
    else if nodeName == 'clickable'
      exerciseNode = new ExerciseClickableNode(idCounter())
    
    else if nodeName == 'fillin'
      exerciseNode = new ExerciseFillinNode(idCounter())
    
    else
      console.log "creating #{xmlNode['#name']}"
      exerciseNode = new ExerciseHtmlNode(xmlNode['#name'], xmlNode['$'])
    
    # Add children
    childNodes = xmlNode['$$']
    
    if childNodes
      exerciseNode.addChildren _.flatten childNodes.map (child) ->
        Exercise.parseDomNode(child, idCounter)
  
    return exerciseNode
  
  
  # Parses a text node of the XML DOM
  # If the text node contains markup, an array of various ExerciseNodes is returned.
  # Otherwise, a plain ExerciseTextNode is returned.
  parseTextNode: (xmlNode, idCounter) ->
    nodes = []
    
    # Get original text
    remainingText = xmlNode['_']
    
    while remainingText.length > 0
      # Find curly brackets { }
      match = remainingText.match(/(\{[^\}]\})/)
      break unless match
      
      # Text before brackets is treated as normal text
      before = remainingText.substring(0, match.index)
      nodes.push new ExerciseTextNode(before) if before.length > 0
      
      # Text inside brackets is treated as a 'clickable'
      matched = match[0]
      clickableNode = new ExerciseClickableNode(idCounter())
      clickableNode.addChildren(new ExerciseTextNode(matched.substring(1, matched.length - 1)))
      nodes.push clickableNode
      
      # Continue searching after the closing bracket
      remainingText = remainingText.substring(match.index + matched.length, remainingText.length)
      
    # Store any remaining text after no more matches are found
    nodes.push new ExerciseTextNode(remainingText) if remainingText.length > 0
    
    return nodes

}

module.exports = Exercise
