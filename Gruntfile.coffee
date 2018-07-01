coffeescript = require 'coffeescript'

module.exports = (grunt) ->
  grunt.initConfig
    compilecoffee:
      static:
        # the coffee source files must be concatenated before compiling to JS
        files:
          'static/pointandclick.js': ['static-src/pointandclick-base.coffee', 'static-src/pointandclick.coffee']
          'static/feedback.js': ['static-src/pointandclick-base.coffee', 'static-src/feedback.coffee']
      backend:
        files:
          'index.js': ['index.coffee']
    uglify:
      production:
        options:
          output:
            comments: false
        files:
          # override the original compiled JS file
          'static/pointandclick.js': ['static/pointandclick.js']
          'static/feedback.js': ['static/feedback.js']
  
  # Load the plugins (tasks "uglify")
  grunt.loadNpmTasks 'grunt-contrib-uglify-es'
  
  grunt.registerMultiTask 'compilecoffee', 'Compile CoffeeScript files to JavaScript', ->
    # Compile coffee files defined in the configuration. Concatenate multiple source files before compiling.
    @files.forEach (f) ->
      contents = f.src.filter (filepath) ->
        # Remove nonexistent files
        if not grunt.file.exists filepath
          grunt.log.warn('Source file "' + filepath + '" not found.')
          false
        else
          true
      .map (filepath) ->
        # Read and return the file's source.
        grunt.file.read filepath
      .join("\n\n") # concatenate multiple source files
      
      js_code = coffeescript.compile contents
      
      # Write joined and compiled contents to destination filepath.
      grunt.file.write f.dest, js_code
      # Print a success message.
      grunt.log.writeln 'File "' + f.dest + '" created.'


  # Default tasks
  grunt.registerTask 'default', ['compilecoffee', 'uglify']
  grunt.registerTask 'dev', ['compilecoffee']

