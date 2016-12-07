# Point-and-click exercises

This content type for Acos server is especially designed for language learning.

To create your own exercises, copy the following files from the Point-and-click-english example package:
* package.json (as is)
* index.coffee (edit metadata, leave everything else untouched)
* example.xml

Any xml files in the content package are recognizes as exercises. Use example.xml as a basis for creating your own exercises. Note that ACOS server must be restarted after adding new exercises.



# Notation

The content must be wrapped in a single element. The following structures is valid:
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


# Custom stylesheets

All CSS files in the content packages are automatically included.

If you want to add custom CSS styles to individual exercises, you can use the <style> tag. The html and head tags must be ued in this case.
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
