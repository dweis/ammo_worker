var browserify = require('browserify');
var gulp = require('gulp');
var exorcist = require('exorcist');
var source = require('vinyl-source-stream');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var connect = require('gulp-connect');
var insert = require('gulp-insert');
var JSONStream = require('JSONStream');
var through2 = require('through2');
var fs = require('fs');
var replace = require('gulp-replace');

gulp.task('serve', function() {
  connect.server({
    root: './dist',
    livereload: true
  });
});

gulp.task('browserify_worker', function() {
  return browserify({
      entries: [ './src/worker/ammo_worker_api.js' ],
      extentions: [ '.js' ]
    })
    .bundle()
    .pipe(source('worker.js'))
    .pipe(gulp.dest('./tmp'));
});

gulp.task('stringify_worker', [ 'browserify_worker' ], function() {
  gulp
    .src([ 'src/vendor/ammo.js', 'tmp/worker.js' ])
    //.pipe(replace(/\n/g, '\\n'))
    //.pipe(replace(/'/g, '\\\''))
    .pipe(concat('worker-stringified.js'))
    .pipe(replace(/["'\\\n\r\u2028\u2029]/g, function (character) {
    // Escape all characters not included in SingleStringCharacters and
    // DoubleStringCharacters on
    // http://www.ecma-international.org/ecma-262/5.1/#sec-7.8.4
    switch (character) {
      case '"':
      case "'":
      case '\\':
        return '\\' + character
      // Four possible LineTerminator characters need to be escaped:
      case '\n':
        return '\\n'
      case '\r':
        return '\\r'
      case '\u2028':
        return '\\u2028'
      case '\u2029':
        return '\\u2029'
    }
  }))
    .pipe(insert.prepend('var AmmoWorkerAPI = \''))
    .pipe(insert.append('\';'))
    //.pipe(source('worker-stringified.js'))
    .pipe(gulp.dest('./tmp'));
});

gulp.task('browserify', [/* 'browserify_worker'*/ 'stringify_worker' ], function() {
    return browserify({
        entries: [ './src/proxy/ammo_proxy.js' ],
        extentions: [ '.js' ]
      })
      .bundle()
      .pipe(source('proxy.js'))
      .pipe(gulp.dest('./tmp'));
});

gulp.task('build', [ 'browserify' ], function() {
  return gulp.src(['tmp/worker-stringified.js', 'tmp/proxy.js'])
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(concat('ammo_proxy.js'))
//    .pipe(exorcist('./tmp/ammo_proxy.js.map'))
//    .pipe(uglify())
    .pipe(sourcemaps.write('.', {addComment: true /* the default */, sourceRoot: '/src'}))
    .pipe(gulp.dest('dist'));
});

gulp.task('watch', function() {
  gulp.watch('src/**/*.js', [ 'build' ]);
});

gulp.task('default', [ 'build', 'serve', 'watch' ]);
