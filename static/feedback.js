/* Point-and-click final feedback (in A+, it is shown on a separate submission page)
 * This script enables click event handlers in the final feedback: the feedback for each
 * clickable is shown when the user clicks on the element. This final feedback page
 * is not used to make new submissions to the exercise; it only shows the state of
 * a previous submission.
 */
document.addEventListener("DOMContentLoaded", function() {

function initPointAndClickFeedback(element, options, $, window, document, undefined) {
  "use strict";
  
  var pluginName = 'acosPointAndClickFeedback';
  var defaults = {
    feedback_selector: '.pointandclick-feedback',
    info_selector: '.pointandclick-info',
    content_selector: '.pointandclick-content',
    clickable_selector: '.clickable',
    clickable_class: 'clickable',
  };
  
  function AcosPointAndClickFeedback(element, options) {
    this.element = $(element);
    this.settings = $.extend({}, defaults, options);
    
    this.feedbackDiv = this.element.find(this.settings.feedback_selector);
    this.infoDiv = this.element.find(this.settings.info_selector);
    this.contentDiv = this.element.find(this.settings.content_selector);
    this.init();
  }
  
  $.extend(AcosPointAndClickFeedback.prototype, {
  
    init: function() {
      var self = this;
      var idCounter = 0;
      this.element.find(this.settings.clickable_selector).each(function() {
        // set unique ids before removing any clickables so that the ids match the original exercise
        var uniqueId = idCounter++;
        $(this).data('id', uniqueId);
      })
      .filter(function() {
        // include the clickables that were answered
        var uniqueId = $(this).data('id');
        if (window.pointandclick.answers.answers[uniqueId]) {
          self.initClickable($(this));
          return true;
        }
        $(this).removeClass(self.settings.clickable_class);
        return false;
      })
      .click(function() {
        self.showFeedback($(this));
      });
      
      // the info/feedback box switches between normal and fixed positioning so that
      // it is always easily readable (no matter where the viewport is scrolled)
      this.setInfoPosition();
      $(window).on('scroll', function() {
        self.setInfoPosition();
      });
      this.setInfoWidth();
      $(window).on('resize', function() {
        self.setInfoWidth();
        self.setInfoPosition();
      });
    },
    
    // set style and content to a clickable according to the answers made in the submission
    initClickable: function(clickElem) {
      var label = clickElem.data('label');
      var payload = window.pointandclick[label];
      
      if (payload.correct === "true") {
        clickElem.addClass('correct');
      } else if (payload.correct === "false") {
        clickElem.addClass('wrong');
      } else {
        clickElem.addClass('neutral');
      }
      
      if (payload.reveal) {
        clickElem.html(payload.reveal);
      }
    },
    
    // click event handler: show the feedback associated with the element
    showFeedback: function(clickedElement) {
      var label = clickedElement.data('label');
      var payload = window.pointandclick[label];
      this.feedbackDiv.removeClass('correct wrong neutral');
      
      if (!payload) {
        this.feedbackDiv.text("[Error: payload not set]");
        return;
      }
      
      // Update styles
      if (payload.correct === "true") {
        this.feedbackDiv.addClass('correct');
      } else if (payload.correct === "false") {
        this.feedbackDiv.addClass('wrong');
      } else {
        this.feedbackDiv.addClass('neutral');
      }
      
      // Show feedback
      if (payload.feedback) {
        this.feedbackDiv.html(payload.feedback);
      } else {
        this.feedbackDiv.html('[No feedback set]');
      }
    },
    
    setInfoPosition: function() {
      if ($(window).scrollTop() + $(window).height() > this.contentDiv.offset().top + this.contentDiv.height() + 100) {
        // window scrolled down so that the area below the feedback content is visible
        // use normal positioning for the info box
        this.infoDiv.removeClass('fixed');
        this.contentDiv.removeClass('fixed-info');
      } else {
        // window scrolled up: use fixed positioning for the info box to keep it visible on the screen
        this.infoDiv.addClass('fixed');
        this.contentDiv.addClass('fixed-info');
      }
    },
    
    setInfoWidth: function() {
      // if the info box has fixed position, it is necessary to set an absolute width in
      // order to make it fill the whole horizontal space of the submission area in the page
      this.infoDiv.width(this.contentDiv.width());
    },
  });
  
  // initialize an instance of the class
  return new AcosPointAndClickFeedback(element, options);
}


if (typeof require === 'function') {
  // in a require.js environment, such as Moodle
  require(["jquery"], function(jQuery) {
    initPointAndClickFeedback(jQuery('.pointandclick'), {}, jQuery, window, document);
  });
} else {
  // jQuery is defined globally (like in A+)
  initPointAndClickFeedback(jQuery('.pointandclick'), {}, jQuery, window, document);
}

});

