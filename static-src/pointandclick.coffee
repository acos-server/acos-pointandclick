class PointAndClick extends PointAndClickBase
  @pluginName = 'acosPointAndClick'
  
  @defaults: $.extend {}, PointAndClickBase.defaults,
    points_selector: '.pointandclick-points'
    correct_clicks_selector: '.pointandclick-correct-clicks'
    wrong_clicks_selector: '.pointandclick-wrong-clicks'
    completed_selector: '.pointandclick-complete'
    complete_msg_attr: 'data-msg-complete'
    complete_uploading_msg_attr: 'data-msg-complete-uploading'
    complete_uploaded_msg_attr: 'data-msg-complete-uploaded'
    complete_error_msg_attr: 'data-msg-complete-error'
    completed_msg_selector: '.pointandclick-complete-msg'
    final_comment_selector: '.pointandclick-finalcomment'
    final_points_msg_attr: 'data-msg-final'
    clicks_left_msg_selector: '.pointandclick-clicksleftmsg'
    clicks_left_singular_msg_attr: 'data-msg-singular'
    clicks_left_plural_msg_attr: 'data-msg-plural'
  
  constructor: (element, options) ->
    super(element, options)
    @completed = false
    @questionAnswered = {}
    @idToLabel = {} # map from question ids to their labels
    @pointsDiv = @element.find(@settings.points_selector)
    @completeDiv = @element.find(@settings.completed_selector)
    @completeMsg = @element.find(@settings.completed_msg_selector)
    @finalComment = @element.find(@settings.final_comment_selector)
    @correctPointsElem = @element.find(@settings.correct_clicks_selector)
    @wrongPointsElem = @element.find(@settings.wrong_clicks_selector)
    @clicksLeftMsgDiv = @element.find(@settings.clicks_left_msg_selector)
    @contentDiv = @element.find(@settings.content_selector)
    @infoDiv = @element.find(@settings.info_selector)
    @correctClicks = 0
    @incorrectClicks = 0
    @maxCorrectClicks = 0 # total correct answers in the exercise, set in init()
    @clickLog = [] # all answers (clicks) for logging
    @init()
  
  init: ->
    self = this
    idCounter = 0
    # attach event handlers to the clickable elements in the exercise as well as
    # generate and add unique IDs to the elements
    @element.find(@settings.clickable_selector).each ->
      uniqueId = idCounter++
      $(this).data('id', uniqueId)
      
      questionLabel = $(this).data('label') # labels are set by the teacher, they may repeat the same values
      payload = window.pointandclick[questionLabel]
      if payload.correct == "true"
        self.maxCorrectClicks++
      
      self.questionAnswered[uniqueId] = false
      self.idToLabel[uniqueId] = questionLabel
    .click (ev) ->
      self.clickWord ev, $(this)
    super()

  clickWord: (event, element) -> # element is the clickable
    questionId = element.data('id')
    questionLabel = element.data('label')
    payload = window.pointandclick[questionLabel]
    # payload: teacher has defined correct/wrong elements and their feedback etc.
    wasAnswered = @questionAnswered[questionId]
    
    if @completed and not wasAnswered
      # Exercise has been completed and the user clicked on something that
      # had not been clicked previously. Ignore it as only feedback for
      # answered questions should be shown at this stage.
      event.preventDefault()
      return false
    
    @questionAnswered[questionId] = true
    @showFeedback(element)
    return unless payload
    
    # Update styles
    if payload.correct == "true"
      element.addClass('correct')
      if not wasAnswered
        @correctClicks += 1
    else if payload.correct == "false"
      element.addClass('wrong')
      if not wasAnswered
        @incorrectClicks += 1
    else
      element.addClass('neutral')
    
    # Reveal correct answer
    if payload.reveal and not wasAnswered
      element.html(payload.reveal)
    
    if @completed
      # Exercise has been completed and the user is clicking on previously
      # answered questions to see their feedback again. Stop the event handler
      # here after the feedback has been shown.
      return
    
    # save the answer for logging (include also clicks on already answered questions
    # since they indicate that the learner is carefully studying the feedback)
    # the full log is uploaded to the ACOS server at the end
    # log that an element was clicked, with the label a log analyzer can check if it was correct or not (exercise JSON has the same labels)
    # IDs are unique, labels may be reused
    # the aplus protocol adds a user id to the payload
    logPayload =
      qid: questionId
      qlabel: questionLabel
      time: new Date().toISOString() # current time
    if wasAnswered
      # the clickable had already been clicked previously, so this click only showed the feedback again
      logPayload.rerun = true
    @clickLog.push(logPayload)
    
    @updatePoints()
    @updateCorrectClicksLeftCounter()
    @checkCompletion()

  updateCorrectClicksLeftCounter: ->
    # show correct clicks left counter if the student has found at least 50% of the correct clicks
    if @correctClicks >= 0.5 * @maxCorrectClicks
      left = @maxCorrectClicks - @correctClicks # how many clicks left
      msgAttr = if left == 1 then @settings.clicks_left_singular_msg_attr else @settings.clicks_left_plural_msg_attr
      msg = @clicksLeftMsgDiv.attr(msgAttr)
      msg = msg.replace('{counter}', left.toString())
      @clicksLeftMsgDiv.html(msg)
      @clicksLeftMsgDiv.removeClass('hide').show()

  # Check if every question has been answered and if yes, grade the submission
  checkCompletion: ->
    if @correctClicks >= @maxCorrectClicks
      @completed = true
      @clicksLeftMsgDiv.hide()
      @completeMsg.text(@completeDiv.attr(@settings.complete_msg_attr))
      @completeDiv.removeClass('hide').show()
      @grade()
      @sendLog()

  grade: ->
    if window.location.pathname.substring(0, 6) != '/html/'
      # hide this uploading message when acos html protocol is used since it does not store any grading
      @completeMsg.text(@completeDiv.attr(@settings.complete_uploading_msg_attr))
    
    scorePercentage = Math.round(@maxCorrectClicks / (@correctClicks + @incorrectClicks) * 100)
    
    # show final points
    @addFinalPointsString(@pointsDiv, scorePercentage)
    # final comment may be defined in the exercise payload and depends on the final points
    @showFinalComment(scorePercentage)
    # feedback for the grading event that is sent to the server
    feedback = @buildFinalFeedback()
    if window.ACOS
      # set max points to 100 since the points are given as a percentage 0-100%
      window.ACOS.sendEvent 'grade', { max_points: 100, points: scorePercentage, feedback: feedback }, (content, error) =>
        if error
          # error in uploading the grading result to the server, show a message to the user
          @completeMsg.text(@completeDiv.attr(@settings.complete_error_msg_attr) + error.error)
          return
        # the grading result has been sent to the server
        if window.location.pathname.substring(0, 6) != '/html/'
          # hide this uploading message when acos html protocol is used since it does not store any grading
          @completeMsg.text(@completeDiv.attr(@settings.complete_uploaded_msg_attr))

  buildFinalFeedback: ->
    labelsUsed = []
    # gather labels of the answered questions (no duplicates)
    for own uniqueId, answered of @questionAnswered
      if answered
        # question was answered
        label = @idToLabel[uniqueId]
        if labelsUsed.indexOf(label) == -1
          labelsUsed.push(label)
    
    return
      answers:
        answers: @questionAnswered
        labelsUsed: labelsUsed
      correctAnswers: @correctClicks
      incorrectAnswers: @incorrectClicks

  addFinalPointsString: (pointsElem, scorePercentage) ->
    # string to format, fill in score
    finalPointsStr = pointsElem.attr(@settings.final_points_msg_attr)
    finalPointsStr = finalPointsStr.replace('{score}', scorePercentage.toString())
    # prepend the final score HTML to the points element
    pointsElem.prepend(finalPointsStr)

  updatePoints: ->
    @correctPointsElem.text(@correctClicks)
    @wrongPointsElem.text(@incorrectClicks)
    @pointsDiv.removeClass('hide').show()

  showFinalComment: (score) ->
    payload = window.pointandclick.finalcomment
    return unless payload
    html = ''
    if payload.common
      # always show this comment
      html += payload.common + '<br>'
    
    limits = []
    # convert limits to numbers so that they may be compared
    for own key, val of payload
      limit = parseInt(key, 10)
      if not isNaN(limit)
        limits.push [limit, key]
    
    limits.sort (a, b) ->
      if a[0] < b[0]
        -1
      else if a[0] > b[0]
        1
      else
        0
    
    feedbackIdx = limits.findIndex (elem) ->
      score <= elem[0]
    
    if feedbackIdx != -1
      html += payload[limits[feedbackIdx][1]]
    
    @finalComment.html(html)
    @finalComment.removeClass('hide').show()

  sendLog: ->
    if window.ACOS
      window.ACOS.sendEvent 'log', @clickLog


# attach a method to jQuery objects that initializes point-and-click exercise
# in the elements matched by the jQuery object
$.fn[PointAndClick.pluginName] = (options) ->
  @each ->
    if not $.data(this, "plugin_" + PointAndClick.pluginName)
      $.data(this, "plugin_" + PointAndClick.pluginName, new PointAndClick(this, options))

# initialize on page load
$ ->
  $('.pointandclick').acosPointAndClick()

