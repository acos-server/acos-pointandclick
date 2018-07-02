module.exports = (grunt) ->
  grunt.initConfig
    coffee:
      options:
        bare: false
        join: true
        separator: "\n\n"
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
  
  # Load the plugins (tasks "coffee", "uglify")
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-uglify-es'
  
  # Default tasks
  grunt.registerTask 'default', ['coffee', 'uglify']
  grunt.registerTask 'dev', ['coffee']

