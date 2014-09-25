var browserify = require('browserify'),
    gulp = require('gulp'),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    connect = require('gulp-connect'),
    insert = require('gulp-insert'),
    replace = require('gulp-replace'),
    plato = require('gulp-plato');

gulp.task('default', [ 'build', 'serve', 'watch' ]);

gulp.task('build', [ 'browserify' ], function() {
  return gulp.src(['tmp/worker-stringified.js', 'tmp/proxy.js'])
    .pipe(concat('ammo_proxy.js'))
    .pipe(gulp.dest('dist'));
});

gulp.task('browserify', [ 'stringify_worker' ], function() {
    return browserify({
        /*debug: true,*/
        entries: [ './src/proxy/ammo_proxy.js' ],
        extentions: [ '.js' ]
      })
      .bundle()
      .pipe(source('proxy.js'))
      .pipe(buffer())
      .pipe(uglify())
      .pipe(gulp.dest('./tmp'));
});

gulp.task('stringify_worker', [ 'browserify_worker' ], function() {
  gulp
    .src([ 'src/vendor/ammo.js', 'tmp/worker.js' ])
    .pipe(concat('worker-stringified.js'))
    .pipe(replace(/["'\\\n\r\u2028\u2029]/g, function (character) {
      switch (character) {
        case '"': case "'": case '\\':
          return '\\' + character;
        case '\n':
          return '\\n';
        case '\r':
          return '\\r';
        case '\u2028':
          return '\\u2028';
        case '\u2029':
          return '\\u2029';
      }
    }))
    .pipe(insert.prepend('var AmmoWorkerAPI = \''))
    .pipe(insert.append('\';'))
    .pipe(gulp.dest('./tmp'));
});

gulp.task('browserify_worker', function() {
  return browserify({
      entries: [ './src/worker/ammo_worker_api.js' ],
      extentions: [ '.js' ]
    })
    .bundle()
    .pipe(source('worker.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest('./tmp'));
});

gulp.task('serve', function() {
  return connect.server({
    root: './dist',
    livereload: true
  });
});

gulp.task('watch', function() {
  return gulp
    .watch('src/**/*.js', [ 'build' ]);
});

gulp.task('report', function() {
  return gulp
    .src(['src/proxy/**/*.js', 'src/worker/**/*.js'])
    .pipe(plato('report', {
      jshint: {
        options: {
          strict: true
        }
      },
      complexity: {
        trycatch: true
      }
    }));
});
