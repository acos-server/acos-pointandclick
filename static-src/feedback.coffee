###
Point-and-click final feedback (in A+, it is shown on a separate submission page)
This script enables click event handlers in the final feedback: the feedback for each
clickable is shown when the user clicks on the element. This final feedback page
is not used to make new submissions to the exercise; it only shows the state of
a previous submission.
###
class PointAndClickFeedback extends PointAndClickBase
  @pluginName = 'acosPointAndClickFeedback'
  
  @checkPayloadSanity: (payload) ->
    if not payload or not payload.answers or not payload.answers.answers or
    typeof payload.answers.answers != 'object'
      return false
    
    for own uniqId, answered of payload.answers.answers
      return false unless typeof answered == 'boolean'
    
    true
  
  constructor: (element, options) ->
    super(element, options)
    # payload sanity check
    if not @constructor.checkPayloadSanity window.pointandclick
      console.error 'Feedback payload is invalid!'
      return
    
    @init()

  init: ->
    self = this
    idCounter = 0
    @element.find(@settings.clickable_selector).each ->
      # set unique ids before removing any clickables so that the ids match the original exercise
      uniqueId = idCounter++
      $(this).data('id', uniqueId)
    .filter ->
      # include the clickables that were answered
      uniqueId = $(this).data('id')
      if window.pointandclick.answers.answers[uniqueId]
        self.initClickable($(this))
        return true
      $(this).removeClass(self.settings.clickable_class)
      return false
    .click ->
      self.showFeedback($(this))
    super()

  # set style and content to a clickable according to the answers made in the submission
  initClickable: (clickElem) ->
    label = clickElem.data('label')
    payload = window.pointandclick[label]
    
    if payload.correct == "true"
      clickElem.addClass('correct')
    else if payload.correct == "false"
      clickElem.addClass('wrong')
    else
      clickElem.addClass('neutral')
    
    clickElem.html(payload.reveal) if payload.reveal

# attach a method to jQuery objects that initializes point-and-click feedback
# in the elements matched by the jQuery object
$.fn[PointAndClickFeedback.pluginName] = (options) ->
  @each ->
    if not $.data(this, "plugin_" + PointAndClickFeedback.pluginName)
      $.data(this, "plugin_" + PointAndClickFeedback.pluginName, new PointAndClickFeedback(this, options))

# initialize on page load
$ ->
  $('.pointandclick').acosPointAndClickFeedback()

