;(function($, window, document, undefined) {
  "use strict";
  
  var pluginName = 'acosPointAndClick';
  var defaults = {
    feedback_selector: '#pointandclick-feedback',
    points_selector: '#pointandclick-points',
    completed_selector: '#pointandclick-complete',
    clickable_selector: '.clickable',
  };
  
  function AcosPointAndClick(element, options) {
    this.element = $(element);
    this.settings = $.extend({}, defaults, options);
    
    this.completed = false;
    this.questionElements = [];
    this.questionAnswered = {};
    this.feedbackDiv = this.element.find(this.settings.feedback_selector);
    this.pointsDiv = this.element.find(this.settings.points_selector);
    this.completeDiv = this.element.find(this.settings.completed_selector);
    this.correctClicks = 0;
    this.incorrectClicks = 0;
    this.init();
  }
  
  $.extend(AcosPointAndClick.prototype, {
  
    init: function() {
      var self = this;
      var idCounter = 0;
      // attach event handlers to the clickable elements in the exercise as well as
      // generate and add unique IDs to the elements
      this.element.find(this.settings.clickable_selector).each(function() {
        var uniqueId = idCounter++;
        $(this).data('id', uniqueId);
        //var questionLabel = $(this).data('label'); // labels are set by the teacher, they may repeat the same values
        self.questionElements.push($(this));
        self.questionAnswered[uniqueId] = false;
        $(this).click(function(ev) {
          self.clickWord(ev);
        });
      });
    },
    
    clickWord: function(event) {
      if (this.completed) {
        // Exercise has been completed. Ignore further clicks.
        event.preventDefault();
        return false;
      }

      var element = $(event.target); // clicked element
      var questionId = element.data('id');
      var questionLabel = element.data('label');
      var payload = window.pointandclick[questionLabel];
      // payload: teacher has defined correct/wrong elements and their feedback etc.
      var wasAnswered = this.questionAnswered[questionId];
      
      this.feedbackDiv.removeClass('correct wrong neutral');
      
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
      
      // send logging event to ACOS (only once for each clickable element)
      if (!wasAnswered && window.ACOS) {
        // log that an element was clicked, with the label a log analyzer can check if it was correct or not (exercise JSON has the same labels)
        // IDs are unique, labels may be reused
        // no user ID is used here
        // if this content type wants to log multiple things, we should add some type key to the payload (type: "click")
        var logPayload = {
          qid: questionId,
          qlabel: questionLabel,
        };
        window.ACOS.sendEvent('log', logPayload);
      }
      
      this.updatePoints();
      this.checkCompletion();
    },
    
    // Checks if every question has been answered
    checkCompletion: function() {
      var self = this;
      var allQuestionsAnswered = true;
      var maxPoints = 0;
      var penalty = 0;
      
      this.questionElements.forEach(function(questionElement) { 
        var questionLabel = questionElement.data('label');
        var questionId = questionElement.data('id');
        
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
        this.completed = true;
        this.completeDiv.text('Exercise finished. Uploading your submission to the server...');
        this.exerciseCompleted(maxPoints, maxPoints - penalty);
      }
    },
    
    exerciseCompleted: function(maxPoints, points) {
      var self = this;
    
      if (points < 0)
        points = 0;
    
      if (points > maxPoints)
        points = maxPoints;
    
      var feedback = '<div id="feedback">You received '+ points + '/'+ maxPoints +' points.<br/>' +
          'Correct answers: ' + this.correctClicks + '<br/>Wrong answers: ' + this.incorrectClicks + '</div>';
    
      if (window.ACOS) {
        ACOS.sendEvent('grade', { max_points: maxPoints, points: points, feedback: feedback }, function(content) {
          // the grading result has been sent to the server
          self.completeDiv.text('Exercise finished. Your submission has been uploaded to the server.');
        });
      }
    },

    updatePoints: function() {
      this.pointsDiv.html("Correct: " + this.correctClicks + "<br />Wrong: " + this.incorrectClicks)
    },
  });
  
  $.fn[pluginName] = function(options) {
    return this.each(function() {
      if (!$.data(this, "plugin_" + pluginName)) {
        $.data(this, "plugin_" + pluginName, new AcosPointAndClick(this, options));
      }
    });
  };
})(jQuery, window, document);

jQuery(function() {
  jQuery('.pointandclick').acosPointAndClick();
});
