# Point-and-click exercises

This content type for Acos server is especially designed for language learning.

To create your own exercises, copy the following files from the Point-and-click-english example content package:
* package.json (as is)
* index.coffee (edit metadata, leave everything else untouched)

Any XML files in the `exercises` directory of the content package are recognized as exercises. 
The files may be nested in subdirectories under the `exercises` directory. 
The names of the XML files MUST NOT use any hyphens (`-`). Spaces in the filenames are not recommended. 
Use `Commas.xml` as a basis for creating your own exercises. Note that the ACOS server must be restarted after adding new exercises.

You can specify content (correct answers, feedback, etc.) either by providing a hand-written JSON file or by using XML notation (JSON is recommended).
The JSON file must be placed in the same directory as the exercise XML file and named similarly to the XML file (e.g., exercise1.xml goes with exercise1.json).


# Notation

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
    "feedback": "This feedback is shown if the user clicks this."
    "reveal": "This is revealed after clicking."
  }
}
```

With the curly bracket syntax, parameters can only be set using JSON.


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
