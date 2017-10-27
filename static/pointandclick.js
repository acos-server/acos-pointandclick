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
    content_selector: '.pointandclick-content',
    info_selector: '.pointandclick-info',
    complete_msg_attr: 'data-msg-complete',
    complete_uploading_msg_attr: 'data-msg-complete-uploading',
    complete_uploaded_msg_attr: 'data-msg-complete-uploaded',
    complete_error_msg_attr: 'data-msg-complete-error',
    completed_msg_selector: '.pointandclick-complete-msg',
    final_comment_selector: '.pointandclick-finalcomment',
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
    this.idToLabel = {}; // map from question ids to their labels
    this.feedbackDiv = this.element.find(this.settings.feedback_selector);
    this.pointsDiv = this.element.find(this.settings.points_selector);
    this.completeDiv = this.element.find(this.settings.completed_selector);
    this.completeMsg = this.element.find(this.settings.completed_msg_selector);
    this.finalComment = this.element.find(this.settings.final_comment_selector);
    this.correctPointsElem = this.element.find(this.settings.correct_clicks_selector);
    this.wrongPointsElem = this.element.find(this.settings.wrong_clicks_selector);
    this.clicksLeftMsgDiv = this.element.find(this.settings.clicks_left_msg_selector);
    this.contentDiv = this.element.find(this.settings.content_selector);
    this.infoDiv = this.element.find(this.settings.info_selector);
    this.correctClicks = 0;
    this.incorrectClicks = 0;
    this.maxCorrectClicks = 0; // total correct answers in the exercise, set in init()
    this.clickLog = []; // all answers (clicks) for logging
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
        
        var questionLabel = $(this).data('label'); // labels are set by the teacher, they may repeat the same values
        var payload = window.pointandclick[questionLabel];
        if (payload.correct === "true") {
          self.maxCorrectClicks++;
        }
        
        self.questionAnswered[uniqueId] = false;
        self.idToLabel[uniqueId] = questionLabel;
      })
      .click(function(ev) {
        self.clickWord(ev, $(this));
      });
      
      this.setInfoPosition();
      $(window).on('resize', function() {
        self.setInfoPosition();
      });
    },
    
    clickWord: function(event, element) { // element is the clickable
      var questionId = element.data('id');
      var questionLabel = element.data('label');
      var payload = window.pointandclick[questionLabel];
      // payload: teacher has defined correct/wrong elements and their feedback etc.
      var wasAnswered = this.questionAnswered[questionId];
      
      if (this.completed && !wasAnswered) {
        // Exercise has been completed and the user clicked on something that
        // had not been clicked previously. Ignore it as only feedback for
        // answered questions should be shown at this stage.
        event.preventDefault();
        return false;
      }
      
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
      if (payload.reveal && !wasAnswered) {
        element.html(payload.reveal);
      }
      
      // Show feedback
      if (payload.feedback) {
        this.feedbackDiv.html(payload.feedback);
      } else {
        this.feedbackDiv.html('[No feedback set]');
      }
      
      if (this.completed) {
        // Exercise has been completed and the user is clicking on previously
        // answered questions to see their feedback again. Stop the event handler
        // here after the feedback has been shown.
        return;
      }
      
      // save the answer for logging (include also clicks on already answered questions
      // since they indicate that the learner is carefully studying the feedback)
      // the full log is uploaded to the ACOS server at the end
      // log that an element was clicked, with the label a log analyzer can check if it was correct or not (exercise JSON has the same labels)
      // IDs are unique, labels may be reused
      // the aplus protocol adds a user id to the payload
      var logPayload = {
        qid: questionId,
        qlabel: questionLabel,
        time: new Date().toISOString(), // current time
      };
      if (wasAnswered) {
        // the clickable had already been clicked previously, so this click only showed the feedback again
        logPayload.rerun = true;
      }
      this.clickLog.push(logPayload);
      
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
        this.clicksLeftMsgDiv.removeClass('hide').show();
      }
    },
    
    // Checks if every question has been answered and if yes, grade the submission
    checkCompletion: function() {
      if (this.correctClicks >= this.maxCorrectClicks) {
        this.completed = true;
        this.clicksLeftMsgDiv.hide();
        this.completeMsg.text(this.completeDiv.attr(this.settings.complete_msg_attr));
        this.completeDiv.removeClass('hide').show();
        this.grade();
        this.sendLog();
      }
    },
    
    grade: function() {
      var self = this;
      
      if (window.location.pathname.substring(0, 6) !== '/html/') {
        // hide this uploading message when acos html protocol is used since it does not store any grading
        this.completeMsg.text(this.completeDiv.attr(this.settings.complete_uploading_msg_attr));
      }
      
      var scorePercentage = Math.round(this.maxCorrectClicks / (this.correctClicks + this.incorrectClicks) * 100);
      
      // show final points
      this.addFinalPointsString(this.pointsDiv, scorePercentage);
      // final comment may be defined in the exercise payload and depends on the final points
      this.showFinalComment(scorePercentage);
      // feedback for the grading event that is sent to the server
      var feedback = this.buildFinalFeedback();
      if (window.ACOS) {
        // set max points to 100 since the points are given as a percentage 0-100%
        ACOS.sendEvent('grade', { max_points: 100, points: scorePercentage, feedback: feedback }, function(content, error) {
          if (error) {
            // error in uploading the grading result to the server, show a message to the user
            self.completeMsg.text(self.completeDiv.attr(self.settings.complete_error_msg_attr) + error.error);
            return;
          }
          // the grading result has been sent to the server
          if (window.location.pathname.substring(0, 6) !== '/html/') {
            // hide this uploading message when acos html protocol is used since it does not store any grading
            self.completeMsg.text(self.completeDiv.attr(self.settings.complete_uploaded_msg_attr));
          }
        });
      }
    },

    buildFinalFeedback: function() {
      var labelsUsed = [];
      // gather labels of the answered questions (no duplicates)
      for (var uniqueId in this.questionAnswered) {
        if (this.questionAnswered.hasOwnProperty(uniqueId)) {
          if (this.questionAnswered[uniqueId]) {
            // question was answered
            var label = this.idToLabel[uniqueId];
            if (labelsUsed.indexOf(label) === -1) {
              labelsUsed.push(label);
            }
          }
        }
      }
      
      return {
        answers: {
          answers: this.questionAnswered,
          labelsUsed: labelsUsed,
        },
        correctAnswers: this.correctClicks,
        incorrectAnswers: this.incorrectClicks,
      };
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
      this.pointsDiv.removeClass('hide').show();
    },
    
    showFinalComment: function(score) {
      var payload = window.pointandclick.finalcomment;
      if (!payload) {
        return;
      }
      var html = '';
      if (payload.common) {
        // always show this comment
        html += payload.common + '<br>';
      }
      
      var limits = [];
      // convert limits to numbers so that they may be compared
      for (var key in payload) {
        if (payload.hasOwnProperty(key)) {
          var limit = parseInt(key, 10);
          if (!isNaN(limit)) {
            limits.push([limit, key]);
          }
        }
      }
      
      limits.sort(function(a, b) {
        if (a[0] < b[0])
          return -1;
        else if (a[0] > b[0])
          return 1;
        else
          return 0;
      });
      
      var feedbackIdx = limits.findIndex(function(elem) {
        return score <= elem[0];
      });
      if (feedbackIdx !== -1) {
        html += payload[limits[feedbackIdx][1]];
      }
      
      this.finalComment.html(html);
    },
    
    setInfoPosition: function() {
      if ($(window).height() * 0.8 > this.contentDiv.height()) {
        // exercise content fits easily in the window
        // use normal positioning for the info box
        this.infoDiv.removeClass('fixed');
        this.contentDiv.removeClass('fixed-info');
        this.infoDiv.css('maxHeight', ''); // remove css property
        this.contentDiv.css('marginBottom', '');
      } else {
        // exercise content takes most space in the window or does not fit in:
        // use fixed positioning for the info box to keep it visible on the screen
        this.infoDiv.addClass('fixed');
        this.contentDiv.addClass('fixed-info');
        var h = $(window).height() * 0.25;
        this.infoDiv.css('maxHeight', h);
        this.contentDiv.css('marginBottom', h);
      }
    },
    
    sendLog: function() {
      if (window.ACOS) {
        window.ACOS.sendEvent('log', this.clickLog);
      }
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
