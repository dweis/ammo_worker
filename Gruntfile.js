var path = require('path');

module.exports = function(grunt) {
  grunt.initConfig({
    plato: {
      your_task: {
        files: {
          'report': ['src/proxy/**/*.js', 'src/worker/**/*.js'],
        }
      },
    },
    requirejs: {
      proxy_minified: {
        options: {
          baseUrl: './src',

          name: 'vendor/almond',
          include: [ 'proxy/ammo_proxy' ],
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
      proxy_development: {
        options: {
          baseUrl: './src',

          name: 'vendor/almond',
          include: [ 'proxy/ammo_proxy' ],
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
      },
      /*
      worker_minified: {
        options: {
          baseUrl: './src',

          name: 'vendor/almond',
          include: [ 'worker/ammo_worker_api' ],
          out: 'src/gen/ammo_worker_api.js',

          optimize: 'uglify2',
          inlineText: true,

          paths: {
            underscore: 'vendor/underscore',
            when: 'vendor/when',
            text: 'vendor/text'
          },

          wrap: {
            startFile: [ 'src/start.frag', 'src/vendor/ammo.js' ],
            endFile: 'src/end_worker.frag'
          }
        }
      },
      */
      worker_development: {
        options: {
          baseUrl: './src',

          name: 'vendor/almond',
          include: [ 'worker/ammo_worker_api' ],
          out: 'src/gen/ammo_worker_api.js',

          optimize: 'none',
          inlineText: true,

          paths: {
            underscore: 'vendor/underscore',
            when: 'vendor/when',
            text: 'vendor/text'
          },

          wrap: {
            startFile: [ 'src/vendor/ammo.js', 'src/start.frag' ],
            endFile: 'src/end_worker.frag'
          }
        }
      }
    },

    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      source: [ 'src/**/*.js', '!src/vendor/**/*.js', '!src/gen/**' ]
    },

    watch: {
      worker: {
        files: [ 'src/worker/**/*.js' ],
        tasks: [ 'requirejs:worker_development', 'requirejs:proxy_development', 'jshint' ],
        options: {
          spawn: false
        }
      },
      proxy: {
        files: [ 'src/proxy/**/*.js' ],
        tasks: [ 'requirejs:proxy_development', 'jshint' ],
        options: {
          spawn: false
        }
      }
    },

    s3: {
      options: {
        endpoint: 'storage.googleapis.com'
      },
      runtime: {
        options: {
          bucket: 'assets.verold.com',
          headers: {
            'Cache-Control': 'public, max-age=3600'
          }
        },
        upload: [
          {
            src: path.join('build', 'ammo_proxy.min.js'),
            dest: 'verold_api/lib/ammo_proxy.min.js',
            options: {
              gzip: true,
              access: 'public-read'
            }
          },
          {
            src: path.join('build', 'ammo_proxy.js'),
            dest: 'verold_api/lib/ammo_proxy.js',
            options: {
              gzip: true,
              access: 'public-read'
            }
          }
        ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-s3');
  grunt.loadNpmTasks('grunt-plato');

  grunt.registerTask('default', [ 'jshint', 'requirejs:worker_development', 'requirejs:proxy_development' ]);
  grunt.registerTask('deploy', [ 'default', 's3' ]);
};
