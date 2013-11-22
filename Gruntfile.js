module.exports = function(grunt) {
  grunt.initConfig({
    requirejs: {
      worker_minified: {
        options: {
          baseUrl: './src',

          name: 'vendor/almond',
          include: [ 'ammo_worker_api' ],
          out: 'src/gen/ammo_worker_api.js',

          optimize: 'uglify2',
          inlineText: true,

          paths: {
            underscore: 'vendor/underscore',
            when: 'vendor/when',
            text: 'vendor/text'
          },

          wrap: {
            startFile: 'src/start.frag',
            endFile: 'src/end_worker.frag'
          }
        }
      },
      proxy_minified: {
        options: {
          baseUrl: './src',

          name: 'vendor/almond',
          include: [ 'ammo_proxy' ],
          out: 'build/ammo_proxy.min.js',

          optimize: 'uglify2',
          inlineText: true,

          paths: {
            underscore: 'vendor/underscore',
            when: 'vendor/when',
            text: 'vendor/text'
          },

          wrap: {
            startFile: 'src/start.frag',
            endFile: 'src/end.frag'
          }
        }
      },
      worker_development: {
        options: {
          baseUrl: './src',

          name: 'vendor/almond',
          include: [ 'ammo_worker_api' ],
          out: 'src/gen/ammo_worker_api.js',

          optimize: 'none',
          inlineText: true,

          paths: {
            underscore: 'vendor/underscore',
            when: 'vendor/when',
            text: 'vendor/text'
          },

          wrap: {
            startFile: 'src/start.frag',
            endFile: 'src/end_worker.frag'
          }
        }
      },
      proxy_development: {
        options: {
          baseUrl: './src',

          name: 'vendor/almond',
          include: [ 'ammo_proxy' ],
          out: 'build/ammo_proxy.js',

          optimize: 'none',
          inlineText: true,

          paths: {
            underscore: 'vendor/underscore',
            when: 'vendor/when',
            text: 'vendor/text'
          },

          wrap: {
            startFile: 'src/start.frag',
            endFile: 'src/end.frag'
          },

          shim: {
            'vendor/ammo': {
              exports: 'Ammo.btRigidBody'
            }
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
        tasks: [ 'requirejs:worker_development', 'requirejs:proxy_development', 'jshint' ],
        options: {
          spawn: false
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-requirejs');

  grunt.registerTask('default', [ 'jshint', 'requirejs:worker_development', 'requirejs:proxy_development' ]);
};
