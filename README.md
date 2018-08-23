# Point-and-click exercises

This content type for the [ACOS server](https://github.com/acos-server/acos-server) is especially designed for language learning.

To create your own exercises (in a new content package), copy the following files from the [pointandclick-example](https://github.com/acos-server/acos-pointandclick-example) example content package ([NPM package](https://www.npmjs.com/package/acos-pointandclick-example)):
* package.json (modify the name and description fields)
* index.coffee (edit metadata, leave everything else untouched)

Any XML files in the `exercises` directory of the content package are recognized as exercises. 
The files may be nested in subdirectories under the `exercises` directory. 
The names of the XML files MUST NOT use any hyphens (`-`). Spaces in the filenames are not recommended. 
For example, you may use `Commas.xml` in the example content package as a basis for creating your own exercises.
Note that the ACOS server must be restarted after adding new exercises.

You can specify content (correct answers, feedback, etc.) either by providing a hand-written JSON file or by using XML notation (JSON is recommended).
The JSON file must be placed in the same directory as the exercise XML file and named similarly to the XML file (e.g., exercise1.xml goes with exercise1.json).

# Notation

The content of the XML file is either an HTML fragment or a complete HTML document.
It is parsed with an XML parser, hence it should be syntactically correct XML as well.
The content must be wrapped in a single element. The following structure is valid:
```html
<html>
  <head>
    Head is optional.
  </head>
  <body>
    content...
  </body>
</html>
```

You can also omit the html and body tags and wrap the content in a div (or any other element).
```html
<div>
  content...
</div>
```

The following is INVALID because the entire content is not wrapped in a single element:
```html
<p>Some content</p>
<p>Some more content</p>
```


## Clickable areas

Clickable areas can be defined with `<clickable>` tags or curly brackets (`{click me}`) (curly brackets are recommended when writing exercises by hand 
and usually they include a label to the JSON data (`{1: click me}`)):

```html
<p>Identify verbs.</p>
<p>
This <clickable>is</clickable> an example.
This {is} an example.
</p>
```

The following parameters can be set:
```html
<clickable correct="true">
  The correct answer is to click this.
  <feedback>This feedback is shown if the user clicks this.</feedback>
</clickable>

<clickable correct="false">
  Clicking this is the wrong answer.
  <feedback>This feedback is shown if the user clicks this.</feedback>
</clickable>

<clickable correct="true">
  <reveal>This content is added after a correct click. Use this for example for an "add missing commas" exercise.</reveal>
</clickable>
```

In JSON, the same parameters can be set as follows:
```json
{
  "1": {
    "correct": "true",
    "feedback": "This feedback is shown if the user clicks this.",
    "reveal": "This is revealed after clicking."
  }
}
```

With the curly bracket syntax, parameters can only be set using JSON.
Note: the labels `answers` or `finalcomment` may not be used in JSON, as they have been reserved for internal use.

Note: when using the curly bracket syntax and if the clickable content should consist
of HTML code, for example an `<img>` element in order to use clickable images,
then the curly brackets must be defined inside a CDATA section so that the XML parser
does not separate the nested HTML elements from the curly brackets. The curly brackets
with their whole contents must be first processed as text content so that the
clickable element HTML structure is outputted.
For example:
```
<p>surrounding normal HTML
<![CDATA[{mylabel:<img src="/static/pointandclick-package/example-image.png" alt="example">}]]>
other text continues</p>
```


## Referencing elements from JSON 

When using the curly bracket syntax, IDs must be set explicitly like this: `{someId:content}`. The matching JSON would look like this:
```json
{
  "someId": {
    "correct": "true",
  }
}
```

The same ID can be used many times in the XML which is useful if there are lots of similar answers (for example, "a comma cannot be added here.")

```html
<p>Add missing commas.</p>
<p>
This{w:}is{w:}an{w:}example. However{c:}it{w:}is{w:}not{w:}too{w:}long.
</p>
```

In the example above, the content in the clickable areas is empty. The content type parser transforms empty content into white space (one space character),
i.e., the student may click on empty spaces between the words in this exercise. The JSON data for the example is shown below.

```json
{
  "w": {
    "correct": "false",
    "feedback": "Don't put a comma here."
  },
  "c": {
    "correct": "true",
    "feedback": "Comma is needed after however",
    "reveal": ", "
  }
}
```


## Final comment (extra feedback after completing the exercise)

It is possible to show extra feedback to the student after the exercise has been completed.
The extra feedback or final comment may depend on the student's final score, in addition
to a common feedback phrase that is shown to everyone. The final comments and their
score limits are defined in the JSON payload under a top-level key `finalcomment`.
Final comments could be, for example, used to emphasize the important topics
studied in the exercise, to provide pointers to suitable extra reading materials,
or to just praise the student. Using final comments is optional.

Example JSON:
```
{
  "finalcomment": {
    "common": "This phrase is shown to everyone after completing the exercise.",
    "50": "You got only 50% or less of the available points. You can do better!",
    "75": "Good job!",
    "99": "Excellent work!",
    "100": "Great, you got everything correct!"
  }
}
```

`finalcomment` must be an object (if it is used at all) and it may contain the
key `common` to define feedback that is shown to everyone. Other keys should be
score limits that define the feedback at the final score less than or equal to
the limit. At most one of the score-based feedback phrases is selected at a time,
thus the limits form brackets between each other. In the example JSON above,
the feedback for key `50` is active if the student gains 0-50% score, while
the feedback `75` is active for scores between 51 and 75%. The highest defined
limit should be `100` or else there is no score-based feedback for perfect solutions.


# Custom stylesheets

Custom CSS styles can be defined using the `<style>` tag. The `<html>` and `<head>` tags must be used in this case.
```html
<html>
  <head>
    <style>
      [custom styles]
    </style>
  </head>
  <body>
    ...
  </body>
</html>
```

Alternatively, you can create a CSS file in the static folder of the content package and include it like this:
```html
<head>
  <link href="/static/content-package-name/my-stylesheet.css" rel="stylesheet">
</head>
```


# Logging the learner's activity

This content type uses the logging functionality of the ACOS server in order to
record the learner's interactions with the exercise. The log event is sent to
the server once at the end when the learner completes the exercise. Therefore,
there is no record of activity if the learner uses the exercise without
submitting a solution nor is there a record of how much the learner studies the
feedback after completing the exercise. If the learner submits multiple solutions,
there is a record of each submission. One log event contains the activity of one
submission.

The log events are written to the log file in the following format. There are
three space-sepated fields: date, exercise data in JSON format, and protocol data
in JSON format. The date in the beginning describes the time when the event was
written to the log file and it is given in the ISO format `YYYY-MM-DDTHH:mm:ss.sssZ`.
The structure of the protocol data depends on the protocol used to connect to
the ACOS server. The exercise data is a JSON array of objects. Each object
describes one answer (one click on a clickable) or a click on an existing answer
to see its feedback again. The objects have the following fields:

* `qid`: clickable ID (IDs start from zero and increment sequentially)
* `qlabel`: clickable label
* `time`: time of the action given as a date in the ISO format
* `rerun`: if this field exists and has the boolean true value, this answer
  had already been made previously. Repeating the same wrong answer does not
  affect the grade, but it shows the feedback again.


# To developers

This content type is implemented in CoffeeScript. The Grunt task runner is used to
compile the code to JavaScript (see the file `Gruntfile.coffee`). The package
released to NPM must include the compiled JS code.

