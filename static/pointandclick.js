$(function() {
  var questionStatus = {};
  var feedbackDiv = $('.pointandclick .feedback');
  
  var clickWord = function(event) {
    var element = $(this);
    questionId = $(this).data('question');
    
    feedbackDiv.removeClass('correct').removeClass('wrong');
    answer = window.pointandclick[questionId];
    
    if (!answer) {
      feedbackDiv.text("[Answer not set]");
      return;
    }
    questionStatus[questionId] = true;
    
    if (answer.correct) {
      feedbackDiv.addClass('correct');
      feedbackDiv.html(answer.feedback);
    } else {
      feedbackDiv.addClass('wrong');
      feedbackDiv.html(answer.feedback);
    }
    
    // Check if every question has been answered
    allQuestionsAnswered = true;
    maxPoints = 0;
    penalty = 0;
    Object.keys(questionStatus).forEach(function (questionId) { 
      required = window.pointandclick[questionId].correct;
      
      if (required)
        maxPoints += 1;
      
      if (!required && questionStatus[questionId] === true) {
        penalty += 1;
      }
      
      if (required && questionStatus[questionId] === false) {
        allQuestionsAnswered = false;
      }
    });
    
    if (allQuestionsAnswered) {
      exerciseCompleted(maxPoints, maxPoints - penalty);
    }
  };
  
  var exerciseCompleted = function(maxPoints, points) {
    if (points < 0)
      points = 0;
    
    if (points > maxPoints)
      points = maxPoints;
    
    if (window.ACOS) {
      ACOS.sendEvent('grade', { max_points: maxPoints, points: points });
    }
  };
  
  $('.pointandclick').each(function() {
    var element = $(this);
    
    $('.exercise span').each(function(e) {
      questionId = $(this).data('question');
      questionStatus[questionId] = false;
      
      $(this).addClass('clickable').click(clickWord);
    });
    
    // var id = element.attr('data-id');
    // var data = window.annotated;
    
    if (false && data[id]) {
      var counter = 0;

      $('<div></div>').appendTo(element).addClass('annotated-description').text(data[id].description);

      data[id].lines.forEach(function(line) {
        var lineDiv = $('<div></div>').appendTo(element).attr('data-line', ++counter);
        var toggleDiv = $('<div></div>').addClass('annotated-line-toggle').appendTo(lineDiv);

        if (line.comment) {
          $('<div></div>').appendTo(toggleDiv).text('?').attr('data-line', counter).click(function(e) {
            e.preventDefault();
            var button = $(this);
            element.find('.annotated-comment[data-line!="' + $(this).attr('data-line') + '"]').hide();
            element.find('.annotated-line-toggle div').text('?');
            var commentDiv = element.find('.annotated-comment[data-line="' + $(this).attr('data-line') + '"]');
            commentDiv.toggle(100, function() {
              if (commentDiv.is(':visible')) {
                button.text('-');
                if (window.ACOS) {
                  ACOS.sendEvent('line', $(this).attr('data-line'));
                  ACOS.sendEvent('log', { exampleId: id, type: 'open', line: $(this).attr('data-line') });
                }
              }

            });
          });
          lineDiv.after($('<div></div>').addClass('annotated-comment').text(line.comment).attr('data-line', counter).hide());
        }

        $('<div></div>').addClass('annotated-line-number').text(counter).appendTo(lineDiv);
        $('<div></div>').addClass('annotated-line-code').text(line.line).appendTo(lineDiv);
      });
    }
  });
});
