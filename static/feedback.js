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
    
    // payload sanity check
    if (!checkPayloadSanity(window.pointandclick)) {
      console.error('Feedback payload is invalid!');
      return;
    }
    
    this.feedbackDiv = this.element.find(this.settings.feedback_selector);
    this.infoDiv = this.element.find(this.settings.info_selector);
    this.contentDiv = this.element.find(this.settings.content_selector);
    this.init();
  }
  
  // return true if the payload is sane, false otherwise
  function checkPayloadSanity(payload) {
    if (!payload)
      return false;
    
    if (!payload.answers || !payload.answers.answers)
      return false;
    
    if (typeof payload.answers.answers !== 'object')
      return false;
    
    for (var t in payload.answers.answers) {
      if (!(payload.answers.answers.hasOwnProperty(t) && typeof payload.answers.answers[t] === 'boolean')) {
        return false;
      }
    }
    return true;
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
      // it is always easily readable
      this.setInfoPosition();
      $(window).on('resize', function() {
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

