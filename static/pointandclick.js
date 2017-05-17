;(function($, window, document, undefined) {
  "use strict";
  
  var pluginName = 'acosPointAndClick';
  var defaults = {
    feedback_selector: '.pointandclick-feedback',
    points_selector: '.pointandclick-points',
    correct_points_selector: '.pointandclick-correct-points',
    wrong_points_selector: '.pointandclick-wrong-points',
    completed_selector: '.pointandclick-complete',
    clickable_selector: '.clickable',
    complete_msg_attr: 'data-msg-complete',
    complete_uploaded_msg_attr: 'data-msg-complete-uploaded',
    final_points_msg_attr: 'data-msg-final',
  };
  
  function AcosPointAndClick(element, options) {
    this.element = $(element);
    this.settings = $.extend({}, defaults, options);
    
    this.completed = false;
    this.questionElements = [];
    this.questionAnswered = {};
    this.allFeedback = [];
    this.feedbackDiv = this.element.find(this.settings.feedback_selector);
    this.pointsDiv = this.element.find(this.settings.points_selector);
    this.completeDiv = this.element.find(this.settings.completed_selector);
    this.correctPointsElem = this.element.find(this.settings.correct_points_selector);
    this.wrongPointsElem = this.element.find(this.settings.wrong_points_selector);
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
        if (!wasAnswered) {
          // copy the click feedback for the final, total feedback
          var clickFeedbackDiv = this.feedbackDiv.clone();
          // copy CSS style while the element is attached to the DOM
          // use inline CSS style in the final feedback (cannot link to external CSS files)
          clickFeedbackDiv.css({
            // jQuery .css does not support getting shorthand notation styles (padding)
            paddingLeft: this.feedbackDiv.css('padding-left'),
            paddingTop: this.feedbackDiv.css('padding-top'),
            paddingRight: this.feedbackDiv.css('padding-right'),
            paddingBottom: this.feedbackDiv.css('padding-bottom'),
            backgroundColor: this.feedbackDiv.css('background-color'),
          });
          this.allFeedback.push(clickFeedbackDiv);
        }
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
        this.completeDiv.text(this.completeDiv.attr(this.settings.complete_msg_attr));
        this.exerciseCompleted(maxPoints, maxPoints - penalty);
      }
    },
    
    exerciseCompleted: function(maxPoints, points) {
      var self = this;
      
      if (points < 0)
        points = 0;
      
      if (points > maxPoints)
        points = maxPoints;
      
      // show final points
      this.addFinalPointsString(this.pointsDiv, points, maxPoints);
      // feedback for the grading event that is sent to the server
      var feedback = this.buildFeedback(maxPoints, points);
      
      if (window.ACOS) {
        ACOS.sendEvent('grade', { max_points: maxPoints, points: points, feedback: feedback }, function(content) {
          //TODO callback arguments are missing potential error message if the upload fails (from ACOS to LMS), update ACOS docs and protocol events.js ??
          // the grading result has been sent to the server
          self.completeDiv.text(self.completeDiv.attr(self.settings.complete_uploaded_msg_attr));
        });
      }
    },

    buildFeedback: function(maxPoints, points) {
      var self = this;
      // clone the exercise element and modify the clone a bit for the final feedback
      var feedbackElem = this.element.clone();
      feedbackElem.find(this.settings.completed_selector).remove();
      feedbackElem.find(this.settings.feedback_selector).remove();
      
      // add inline styles to the clicked elements in the exercise
      // get the background colors used in the original clickable elements so that
      // they can be set to the corresponding elements in the feedback
      var getClickableColor = function(selector) {
        return self.element.find(self.settings.clickable_selector).filter(selector).first().css('background-color');
      };
      var clickables = feedbackElem.find(this.settings.clickable_selector);
      clickables.filter('.correct').css('background-color', getClickableColor('.correct'));
      clickables.filter('.wrong').css('background-color', getClickableColor('.wrong'));
      clickables.filter('.neutral').css('background-color', getClickableColor('.neutral'));
      
      // add feedback for each click to the final feedback
      var pointsElem = feedbackElem.find(self.settings.points_selector);
      this.allFeedback.forEach(function(oneFeedbackElem) {
        // the feedback HTML is not a complete document, hence it can not link to external CSS files
        // inline CSS was saved in these HTML elements when the feedback for each click was saved
        pointsElem.before(oneFeedbackElem);
      });
      
      // ensure that points are visible
      pointsElem.removeClass('hide');
      
      // save the font family to the HTML inline style too
      feedbackElem.css('font-family', this.element.css('font-family'));
      
      // wrap hack is used to get the outer HTML (HTML string including the top element)
      return feedbackElem.wrap('<div/>').parent().html();
    },
    
    addFinalPointsString: function(pointsElem, points, maxPoints) {
      // string to format, fill in points
      var finalPointsStr = pointsElem.attr(this.settings.final_points_msg_attr);
      finalPointsStr = finalPointsStr.replace('{points}', points.toString());
      finalPointsStr = finalPointsStr.replace('{maxPoints}', maxPoints.toString());
      // append HTML to the points element
      pointsElem.html(pointsElem.html() + finalPointsStr);
    },

    updatePoints: function() {
      this.correctPointsElem.text(this.correctClicks);
      this.wrongPointsElem.text(this.incorrectClicks);
      this.pointsDiv.show();
    },
  });
  
  // attach a method to jQuery objects that initializes point-and-click exercise
  // in the elements matched by the jQuery object
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
