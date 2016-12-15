var Pointandclick = (function() {
  function Pointandclick() {
    var self = this;
    var idCounter = 0;
    this.questionElements = [];
    this.questionAnswered = {};
    this.feedbackDiv = $('#pointandclick-feedback');
    this.pointsDiv = $('#pointandclick-points');
    this.correctClicks = 0;
    this.incorrectClicks = 0;
    
    $('.clickable').each(function(e) {
      uniqueId = idCounter++;
      $(this).data('id', uniqueId);
      questionLabel = $(this).data('label');
      self.questionElements.push($(this));
      self.questionAnswered[uniqueId] = false;
      $(this).click($.proxy(clickWord, self));
    });
    
    this.checkCompletion = checkCompletion;
    this.exerciseCompleted = exerciseCompleted;
    this.updatePoints = updatePoints;
  }
  
  function clickWord(event) {
    var element = $(event.target);
    var questionId = element.data('id');
    var questionLabel = element.data('label');
    var payload = window.pointandclick[questionLabel];
    var wasAnswered = this.questionAnswered[questionId];
    
    this.feedbackDiv.removeClass('correct').removeClass('wrong');
    
    if (!payload) {
      this.feedbackDiv.text("[Error: Question not configured (id="+questionId+")]");
      return;
    }
    
    element.data('answered', true);
    this.questionAnswered[questionId] = true;
    
    // Update styles
    if (payload.correct === "true") {
      this.feedbackDiv.addClass('correct');
      element.addClass('correct');
      
      if (!wasAnswered) {
        this.correctClicks += 1;
      }
    } else if (payload.correct === "false") {
      this.feedbackDiv.addClass('wrong');
      element.addClass('wrong');
      
      if (!wasAnswered) {
        this.incorrectClicks += 1;
      }
    } else {
      this.feedbackDiv.addClass('neutral');
    }
    
    // Reveal correct answer
    if (payload.reveal) {
      element.text(payload.reveal);
    }
    
    // Show feedback
    if (payload.feedback) {
      this.feedbackDiv.html(payload.feedback);
    }
    
    console.log("Calling updatePoints");
    this.updatePoints();
    this.checkCompletion();
  };
  
  // Checks if every question has been answered
  function checkCompletion() {
    var self = this;
    var allQuestionsAnswered = true;
    var maxPoints = 0;
    var penalty = 0;
    
    // Object.keys(this.questionElements).forEach(function (questionElement) {
    this.questionElements.forEach(function (questionElement) { 
      var questionLabel = questionElement.data('label');
      var questionId = questionElement.data('id');
      console.log("Checking " + questionLabel + " (" + questionId + ")");
      
      var required = window.pointandclick[questionLabel].correct === "true";
      var prohibited = window.pointandclick[questionLabel].correct === "false";
      
      if (required)
        maxPoints += 1;
      
      if (prohibited && self.questionAnswered[questionId] === true) {
        penalty += 1;
      }
      
      if (required && !self.questionAnswered[questionId]) {
        allQuestionsAnswered = false;
      }
    });
    
    if (allQuestionsAnswered) {
      this.exerciseCompleted(maxPoints, maxPoints - penalty);
    }
  }
    
  function exerciseCompleted(maxPoints, points) {
    console.log("Completed");
    
    if (points < 0)
      points = 0;
    
    if (points > maxPoints)
      points = maxPoints;
    
    if (window.ACOS) {
      ACOS.sendEvent('grade', { max_points: maxPoints, points: points });
    }
  }

  function updatePoints() {
    console.log("Update points")
    this.pointsDiv.html("Correct: " + this.correctClicks + "<br />Wrong: " + this.incorrectClicks)
  }
  
  return Pointandclick;
})();

jQuery(function() {
  exercise = new Pointandclick();
});
