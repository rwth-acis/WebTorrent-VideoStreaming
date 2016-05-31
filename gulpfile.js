//'use strict';

var watchify = require('watchify');
var browserify = require('browserify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var gutil = require('gulp-util');
var sourcemaps = require('gulp-sourcemaps');
var assign = require('lodash.assign');
var uglify = require('gulp-uglify');
var htmlmin = require('gulp-htmlmin');
var connect = require('gulp-connect');
//var jasmine = require('gulp-jasmine');
//var reporters = require('jasmine-reporters');
var jasmineBrowser = require('gulp-jasmine-browser');
var cors = require('cors');

/*
gulp.task('html', function (){
  gulp.src('./build/*.html')
    .pipe(connect.reload());
});
*/

// add custom browserify options here
var customOpts = {
  entries: ['./index.js'],
  debug: true
};
var customOpts2 = {
  entries: ['./test-help.js'],
  debug: true
};
var opts = assign({}, watchify.args, customOpts);
var opts2 = assign({}, watchify.args, customOpts2); 
var b = watchify(browserify(opts));
var b2 = watchify(browserify(opts2));

// add transformations here
// i.e. b.transform(coffeeify);

gulp.task('browserify', function(cb){bundle(); cb()}); // so you can run `gulp js` to build the file
gulp.task('browserify2', [], function(cb){bundle2(); cb()});
b.on('update', bundle); // on any dep update, runs the bundler
b2.on('update', bundle2);
b.on('log', gutil.log); // output build logs to terminal
b2.on('log', gutil.log);

function bundle2(){
  return b2.bundle()
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    .pipe(source('./test-help.js'))
    .pipe(gulp.dest('./testsuites-build/'));
}

function bundle() {
  return b.bundle()
    // log errors if they happen
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    .pipe(source('index.js'))
    // optional, remove if you don't need to buffer file contents
    //.pipe(buffer())
    // optional, remove if you dont want sourcemaps
    //.pipe(sourcemaps.init({loadMaps: true})) // loads map from browserify file
    // Add transformation tasks to the pipeline here.
    //.pipe(sourcemaps.write('./')) // writes .map file
    .pipe(gulp.dest('./build/'));
}


function errorLog(error){
   console.error.bind(error);
   this.emit('end');
}

/* Commented out for debugging
// Uglifies output of browserify
gulp.task('uglify_bundle', function(){
   return gulp.src('./browserfied/index.js')
   .pipe(uglify())
   //.on('error', errorLog)
   .pipe(gulp.dest('./build'));
   console.log("Uglified bundle");
});
*/


/* Commented out for debugging
// Uglifies index.html
gulp.task('minify_index.html', function(){
   gulp.src('./index.html')
   .pipe(htmlmin({collapseWhitespace: true}))
   .on('error', errorLog)
   .pipe(gulp.dest('./build'));
   console.log("uglified index.html");
});
*/

//start web server
gulp.task('connect', function(){
   connect.server({
      root : "./build",
      middleware : function(connect, opts) {
         return [cors()];
      }
   });
});

/* War nicht die Jasmine-browser variante
//Run Jasmine tests
gulp.task('tests', ['browserify2'], () =>
gulp.src('./testsuites-build/test-suites.js')
// gulp-jasmine works on filepaths so you can't have any plugins before it
    .pipe(jasmine({
        reporter: new reporters.JUnitXmlReporter({
            savePath: './test-results',
            consolidateAll: false
        })
    }))
);
*/

gulp.task('tests', ['browserify2'], function() {
  return gulp.src(['./testsuites-build/test-help.js', './test-suites.js'])
    .pipe(jasmineBrowser.specRunner())
    .pipe(jasmineBrowser.server({port: 8888}));
});

//Watch Task
// Watches JS
gulp.task('watch', function(){
   gulp.watch('./index.js', ['browserify']);
   gulp.watch('./test-suites.js', ['browserify2', 'tests']);
  // gulp.watch('./index.html', ['minify_index.html']);
});


gulp.task('default', ['browserify', 'connect', 'browserify2', 'tests', 'watch']);