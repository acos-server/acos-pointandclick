;(function($, window, document, undefined) {
  "use strict";
  
  var pluginName = 'acosPointAndClick';
  var defaults = {
    feedback_selector: '.pointandclick-feedback',
    points_selector: '.pointandclick-points',
    correct_clicks_selector: '.pointandclick-correct-clicks',
    wrong_clicks_selector: '.pointandclick-wrong-clicks',
    completed_selector: '.pointandclick-complete',
    clickable_selector: '.clickable',
    complete_msg_attr: 'data-msg-complete',
    complete_uploaded_msg_attr: 'data-msg-complete-uploaded',
    final_points_msg_attr: 'data-msg-final',
    clicks_left_msg_selector: '.pointandclick-clicksleftmsg',
    clicks_left_singular_msg_attr: 'data-msg-singular',
    clicks_left_plural_msg_attr: 'data-msg-plural',
  };
  
  function AcosPointAndClick(element, options) {
    this.element = $(element);
    this.settings = $.extend({}, defaults, options);
    
    this.completed = false;
    this.questionAnswered = {};
    this.feedbackDiv = this.element.find(this.settings.feedback_selector);
    this.pointsDiv = this.element.find(this.settings.points_selector);
    this.completeDiv = this.element.find(this.settings.completed_selector);
    this.correctPointsElem = this.element.find(this.settings.correct_clicks_selector);
    this.wrongPointsElem = this.element.find(this.settings.wrong_clicks_selector);
    this.clicksLeftMsgDiv = this.element.find(this.settings.clicks_left_msg_selector);
    this.correctClicks = 0;
    this.incorrectClicks = 0;
    this.maxCorrectClicks = 0; // total correct answers in the exercise, set in init()
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
        // set the id to an attribute as well so that it is available to
        // the final feedback when the exercise DOM is cloned
        $(this).attr('data-id', uniqueId);
        
        var questionLabel = $(this).data('label'); // labels are set by the teacher, they may repeat the same values
        var payload = window.pointandclick[questionLabel];
        if (payload.correct === "true") {
          self.maxCorrectClicks++;
        }
        
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
        element.addClass('neutral');
      }
      
      // Reveal correct answer
      if (payload.reveal) {
        element.text(payload.reveal);
      }
      
      // Show feedback
      if (payload.feedback) {
        this.feedbackDiv.html(payload.feedback);
      } else {
        this.feedbackDiv.html('[No feedback set]');
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
      this.updateCorrectClicksLeftCounter();
      this.checkCompletion();
    },
    
    updateCorrectClicksLeftCounter: function() {
      // show correct clicks left counter if the student has found at least 50% of the correct clicks
      if (this.correctClicks >= 0.5 * this.maxCorrectClicks) {
        var left = this.maxCorrectClicks - this.correctClicks; // how many clicks left
        var msgAttr = (left === 1) ? this.settings.clicks_left_singular_msg_attr : this.settings.clicks_left_plural_msg_attr;
        var msg = this.clicksLeftMsgDiv.attr(msgAttr);
        msg = msg.replace('{counter}', left.toString());
        this.clicksLeftMsgDiv.html(msg);
        this.clicksLeftMsgDiv.show();
      }
    },
    
    // Checks if every question has been answered and if yes, grade the submission
    checkCompletion: function() {
      if (this.correctClicks >= this.maxCorrectClicks) {
        this.completed = true;
        this.clicksLeftMsgDiv.hide();
        this.completeDiv.text(this.completeDiv.attr(this.settings.complete_msg_attr));
        this.completeDiv.show();
        this.grade();
      }
    },
    
    grade: function() {
      var self = this;
      
      var scorePercentage = Math.round(this.maxCorrectClicks / (this.correctClicks + this.incorrectClicks) * 100);
      
      // show final points
      this.addFinalPointsString(this.pointsDiv, scorePercentage);
      // feedback for the grading event that is sent to the server
      var feedback = this.buildFeedback();
      if (window.ACOS) {
        // set max points to 100 since the points are given as a percentage 0-100%
        ACOS.sendEvent('grade', { max_points: 100, points: scorePercentage, feedback: feedback }, function(content) {
          //TODO callback arguments are missing potential error message if the upload fails (from ACOS to LMS), update ACOS docs and protocol events.js ??
          // the grading result has been sent to the server
          self.completeDiv.text(self.completeDiv.attr(self.settings.complete_uploaded_msg_attr));
        });
      }
    },

    buildFeedback: function() {
      var self = this;
      // clone the exercise element and modify the clone a bit for the final feedback
      var feedbackElem = this.element.clone();
      feedbackElem.find(this.settings.completed_selector).remove();
      feedbackElem.find(this.settings.feedback_selector).empty().removeClass('correct wrong neutral');
      feedbackElem.find(this.settings.clicks_left_msg_selector).remove();
      
      var labelsUsed = [];
      // remove class clickable from elements that were not clicked in this submission
      feedbackElem.find(this.settings.clickable_selector).filter(function(idx) {
        var questionId = $(this).attr('data-id');
        if (self.questionAnswered[questionId]) {
          labelsUsed.push($(this).attr('data-label'));
          return false;
        } else {
          return true;
        }
      }).removeClass(this.settings.clickable_selector.substr(1));
      
      var copy_payload = {};
      // copy feedback and correct values from the payload for the clicked elements
      for (var i = 0; i < labelsUsed.length; i++) {
        if (!(labelsUsed[i] in copy_payload)) {
          var payload = window.pointandclick[labelsUsed[i]];
          copy_payload[labelsUsed[i]] = {
            'feedback': payload.feedback,
            'correct': payload.correct,
          };
        }
      }
      
      // store the copied payload in the feedback element
      $('<script></script>').text('window.pointandclick = ' + JSON.stringify(copy_payload) + ';').prependTo(feedbackElem);
      
      // script that enables click events in the feedback page (click to show feedback)
      $('<script></script>', {
        src: this.getWindowUrlDomain() + '/static/pointandclick/feedback.js', // URL to the ACOS server
      }).appendTo(feedbackElem);
      
      // feedback CSS is injected to the feedback HTML in the ACOS server (pointandclick handleEvent)
      
      // ensure that points are visible
      feedbackElem.find(self.settings.points_selector).removeClass('hide');
      
      // wrap hack is used to get the outer HTML (HTML string including the top element)
      return feedbackElem.wrap('<div/>').parent().html();
    },
    
    addFinalPointsString: function(pointsElem, scorePercentage) {
      // string to format, fill in score
      var finalPointsStr = pointsElem.attr(this.settings.final_points_msg_attr);
      finalPointsStr = finalPointsStr.replace('{score}', scorePercentage.toString());
      // prepend the final score HTML to the points element
      pointsElem.prepend(finalPointsStr);
    },

    updatePoints: function() {
      this.correctPointsElem.text(this.correctClicks);
      this.wrongPointsElem.text(this.incorrectClicks);
      this.pointsDiv.show();
    },
    
    getWindowUrlDomain: function() {
      return window.location.protocol + '//' + window.location.host;
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
