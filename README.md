# Point-and-click exercises

This content type for Acos server is especially designed for language learning.

To create your own exercises, copy the following files from the Point-and-click-english example package:
* package.json (as is)
* index.coffee (edit metadata, leave everything else untouched)
* example.xml

Any xml files in the content package are recognizes as exercises. Use example.xml as a basis for creating your own exercises. Note that ACOS server must be restarted after adding new exercises.

You can specify content (correct answers, feedback, etc.) either by providing a hand-written JSON file or by using XML.
The JSON file must be placed in the content directory of the content package and named similar to the xml file (e.g. exercise1.xml goes with content/exercise1.json).


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

Clickable areas can be defined with <clickable> tags or curly brackets:

```html
<p>Click the verbs.</p>
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
```

In JSON, the same parameters can be set as follows:
```json
{
  '1': {
    correct: true,
    feedback: 'This feedback is shown if the user clicks this.'
  }
}
```

With the bracket syntax, parameters can only be set using JSON.


## Referencing elements from JSON 

Clickable areas defined with the bracket syntax or xml tags without explicit IDs are automatically given IDs so that the first element is "1", second is "2" and so forth. Alternatively, you can set ids manually like so: <clickable id="1">. 


# Custom stylesheets

Custom CSS styles can be defined using the <style> tag. The html and head tags must be used in this case.
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

Alternatively, you can create a css file in the static folder of the content package and include like this:
```html
<head>
  <link href="/static/content-package-name/my-stylesheet.css" rel="stylesheet">
</head>
```
