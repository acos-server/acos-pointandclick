xml2js = require('xml2js')
_ = require('underscore')

class ExerciseNode
    
  addChildren: (children) ->
    return unless children
    @children ||= []
    
    if children instanceof Array
      @children = @children.concat(children)
    else
      @children.push children
  
  # Renders the inner text of all child nodes recursively into a string.
  innerText: () ->
    return '' unless @children
    @children.map((child) -> child.innerText()).join(' ')


# A plain text node. This node never has children.
class ExerciseTextNode extends ExerciseNode
  constructor: (text) ->
    @text = text
  
  html: ->
    @text

  innerText: ->
    @text


# A generic HTML node, which may have children
class ExerciseHtmlNode extends ExerciseNode
  constructor: (name, attributes) ->
    @nodeName = name
    @attributes = attributes || {}
    
  # Renders the node and its children as HTML and returns a String
  # options:
  # {omitRoot: true} renders only the children without this tag itself
  html: (options = {}) ->
    # Render attributes into a string, e.g. " class='warning'"
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
  constructor: (@text, @id) ->
    @text = ' ' if !@text? || @text.length < 1
    @id = @text if !@id? || @id.length < 1  # Use text as id if no id is given
    
  html: ->
    "<span data-label='#{@id}' class='clickable'>#{@text}</span>"
    #"<span data-label='#{@id}' #{this.feedbackHtml()} class='clickable'>#{@text}</span>"
    
  jsonPayload: () ->
    {correct: @correct, feedback: @feedback, reveal: @reveal}
    

class ExerciseFillinNode extends ExerciseNode
  constructor: (@text, @id) ->
    @text = '' if !@text?
    
  html: ->
    "<input data-label='#{id}' type='text' />"

  jsonPayload: () ->
    {correct: @correct, feedback: @feedback}
    

Exercise = {
  
  # Parses an XML string and converts it into a tree of ExerciseNodes
  # Calls callback(error, tree, head) with the resulting ExerciseNode tree.
  # error: Error message in a String, or undefined
  # tree: an ExerciseNode, root of the tree
  # head: a ExerciseHtmlNode with nodeType='head', contains stylesheets and javascript to include
  # xml: A String containing XML markup
  parseXml: (xml, callback) ->
    # Initialize XML parser
    parser = new xml2js.Parser(
        normalizeTags: true
        explicitChildren: true
        preserveChildrenOrder: true
        charsAsChildren: true
      )
    
    # Parse string into an XML DOM
    parser.parseString xml, (err, dom) ->
      if err
        callback(err)
      else 
        Exercise.parseDom(dom, callback)


  # Parses the XML DOM into a tree of Exercise Nodes
  # Calls callback(error, tree, head) with the resulting ExerciseNode tree
  parseDom: (dom, callback) ->
    # A function that gives uniqued IDs for elements
    idCounter = (->
      current = 0
      return -> current++
    )()

    
    # If root is <html>
    if dom['html']
      head = dom['html']['head']
      if head
        head = Exercise.parseDomNode(head[0], idCounter, {disableMarkup: true})
    
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
  parseDomNode: (xmlNode, idCounter, options = {}) ->
    nodeName = xmlNode['#name']
    attributes = xmlNode['$']

    if nodeName == '__text__'
      return Exercise.parseTextNode(xmlNode, options)
    
    else if nodeName == 'clickable' || nodeName == 'fillin'
      return Exercise.parseInteractiveNode(xmlNode, idCounter)
      
    else
      exerciseNode = new ExerciseHtmlNode(nodeName, attributes)
    
      childNodes = xmlNode['$$']
      if childNodes
        exerciseNode.addChildren _.flatten childNodes.map (child) ->
          Exercise.parseDomNode(child, idCounter, options)
  
    return exerciseNode
  
  
  # Parses a text node of the XML DOM
  # If the text node contains markup (e.g. {}), an array of various ExerciseNodes is returned.
  # Otherwise, a plain ExerciseTextNode is returned.
  parseTextNode: (xmlNode, options) ->
    nodes = []
    
    # Get original text
    remainingText = xmlNode['_']
    
    while remainingText.length > 0 && !options['disableMarkup']?
      # Find curly brackets { }
      match = remainingText.match(/(\{[^\}]*\})/)
      break if !match?
      
      # Text before brackets is treated as normal text
      before = remainingText.substring(0, match.index)
      nodes.push new ExerciseTextNode(before) if before.length > 0
      
      # Text inside brackets is treated as a 'clickable'. Remove brackets.
      innerText = match[0].substring(1, match[0].length - 1)
      
      # Separate id (id:text)
      parts = innerText.split(':')
      if parts.length > 1
        id = parts[0]
        text = parts[1]
      else
        id = innerText
        text = innerText
      
      clickableNode = new ExerciseClickableNode(text, id)
      nodes.push clickableNode
      
      # Continue searching after the closing bracket
      remainingText = remainingText.substring(match.index + innerText.length + 2, remainingText.length)
      
    # Store any remaining text after no more matches are found
    nodes.push new ExerciseTextNode(remainingText) if remainingText.length > 0
    
    return nodes

  
  parseInteractiveNode: (xmlNode, idCounter) ->
    nodeName = xmlNode['#name']
    attributes = xmlNode['$'] || {}
    manualId = attributes['id']
    
    if nodeName == 'clickable'
      exerciseNode = new ExerciseClickableNode(xmlNode['_'], manualId || idCounter())
      exerciseNode.correct = attributes['correct']
    
    else if nodeName == 'fillin'
      exerciseNode = new ExerciseFillinNode(xmlNode['_'], manualId || idCounter())

    # Parse attributes

    # Parse <feedback> child nodes
    if xmlNode['feedback']
      for child in xmlNode['feedback']
        exerciseNode.feedback = child['_']
#         feedbackAttributes = child['$']
#         if feedbackAttributes? && feedbackAttributes['correct'] == 'true'
#           exerciseNode.correctFeedback = child['_']
#         else
#           exerciseNode.incorrectFeedback = child['_']

    # Parse <reveal> child nodes
    if xmlNode['reveal']
      exerciseNode.reveal = xmlNode['reveal'][0]['_']
          
    return exerciseNode


  # Collects JSON payload recursively from the given tree of ExerciseNodes.
  # The result is something like {'id1': {payload...}, 'id2': {payload...}}
  # hash: existing payload on which to build
  # tree: the root ExerciseNode
  jsonPayload: (hash, tree) ->
  
    # Collect payload recursively
    dfs = (node) ->
      payload = hash[node.id]
      
      # Add autogenerated payload to existing
      if node.id? && node.jsonPayload?
        payload = Object.assign(node.jsonPayload(), payload || {})  # User-provided properties have precedence
      
      hash[node.id] = payload
      
      return unless node.children?
      for child in node.children
        dfs(child)
    
    dfs(tree)
    
    hash
  
}

module.exports = Exercise
