class PointAndClickBase
  @defaults:
    feedback_selector: '.pointandclick-feedback'
    info_selector: '.pointandclick-info'
    content_selector: '.pointandclick-content'
    clickable_selector: '.clickable'
    clickable_class: 'clickable'

  constructor: (element, options) ->
    @element = $(element)
    @settings = $.extend({}, @constructor.defaults, options)
    
    @feedbackDiv = @element.find(@settings.feedback_selector)
    @infoDiv = @element.find(@settings.info_selector)
    @contentDiv = @element.find(@settings.content_selector)
  
  init: ->
    # the info/feedback box switches between normal and fixed positioning so that
    # it is always easily readable
    @setInfoPosition()
    $(window).on 'resize', =>
      @setInfoPosition()

  # click event handler: show the feedback associated with the element
  showFeedback: (clickedElement) ->
    label = clickedElement.data('label')
    questionId = clickedElement.data('id')
    payload = window.pointandclick[label]
    @feedbackDiv.removeClass('correct wrong neutral')
    
    if not payload
      @feedbackDiv.text('[Error: question payload not configured (id=' + questionId + ')]')
      return
    
    # Update styles
    if payload.correct == "true"
      @feedbackDiv.addClass('correct')
    else if payload.correct == "false"
      @feedbackDiv.addClass('wrong')
    else
      @feedbackDiv.addClass('neutral')
    
    # Show feedback
    if payload.feedback
      @feedbackDiv.html(payload.feedback)
    else
      @feedbackDiv.html('[No feedback set]')

  setInfoPosition: ->
    if $(window).height() * 0.8 > @contentDiv.height()
      # exercise content fits easily in the window
      # use normal positioning for the info box
      @infoDiv.removeClass('fixed')
      @contentDiv.removeClass('fixed-info')
      @infoDiv.css('maxHeight', '') # remove css property
      @contentDiv.css('marginBottom', '')
    else
      # exercise content takes most space in the window or does not fit in:
      # use fixed positioning for the info box to keep it visible on the screen
      @infoDiv.addClass('fixed')
      @contentDiv.addClass('fixed-info')
      h = $(window).height() * 0.25
      @infoDiv.css('maxHeight', h)
      @contentDiv.css('marginBottom', h)

