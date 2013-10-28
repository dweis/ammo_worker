module.exports = function(grunt) {
  grunt.initConfig({
    requirejs: {
      minified: {
        options: {
          baseUrl: './src',

          name: 'vendor/almond',
          include: [ 'ammo_proxy' ],
          out: 'build/ammo_proxy.min.js',

          optimize: 'uglify2',
          inlineText: true,

          paths: {
            underscore: 'vendor/underscore',
            when: 'vendor/when'
          },

          wrap: {
            startFile: 'src/start.frag',
            endFile: 'src/end.frag'
          }
        }
      },
      development: {
        options: {
          baseUrl: './src',

          name: 'vendor/almond',
          include: [ 'ammo_proxy' ],
          out: 'build/ammo_proxy.js',

          optimize: 'none',
          inlineText: true,

          paths: {
            underscore: 'vendor/underscore',
            when: 'vendor/when'
          },

          wrap: {
            startFile: 'src/start.frag',
            endFile: 'src/end.frag'
          }
        }
      }
    },

    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      source: [ 'src/**/*.js', '!src/vendor/**/*.js' ]
    },

    watch: {
      js: {
        files: [ 'src/**/*.js' ],
        tasks: [ 'requirejs', 'jshint' ],
        options: {
          spawn: false
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-requirejs');

  grunt.registerTask('default', [ 'jshint', 'requirejs' ]);
};
