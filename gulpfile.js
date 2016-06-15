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
var jasmineBrowser = require('gulp-jasmine-browser');
var rename = require("gulp-rename");
var cors = require('cors');

/*
gulp.task('html', function (){
  gulp.src('./build/*.html')
    .pipe(connect.reload());
});
*/

// add custom browserify options here
var customOpts = {
  entries: ['./example_application.js'],
  debug: true
};
var customOpts2 = {
  entries: ['./Jasmine_testsuites_help.js'],
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
    .pipe(source('./Jasmine_testsuites_help.js'))
    .pipe(gulp.dest('./Jasmine_testsuites_build/'));
}

function bundle() {
  return b.bundle()
    // log errors if they happen
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    .pipe(source('example_application.js'))
    //.pipe(rename("example_application_temp.js")) own work
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

/* Takes to long for developement. Therefore commented out till deployment. Didn't work when commented out.
// Uglifies output of browserify
gulp.task('uglify_example_app.js', ['browserify2'], function(){
   return gulp.src('./build/example_application_temp.js')
   .pipe(uglify())
   //.on('error', errorLog)
   .pipe(rename("example_application.js"))
   .pipe(gulp.dest('./build/'));
   console.log("Uglified bundle");
});
*/

// Uglifies index.html
gulp.task('minify_example_app.html', ['browserify2'], function(){
   gulp.src('./example_application.html')
   .pipe(htmlmin({collapseWhitespace: true}))
   .on('error', errorLog)
   .pipe(rename("index.html"))
   .pipe(gulp.dest('./build/'));
   console.log("uglified example_application.html");
});


//start web server
gulp.task('connect', function(){
   connect.server({
      root: "./build",
      livereload: false,
      middleware : function(connect, opts){
         return [cors()];
      }
   });
});


function browserifySecondApplication(){   
   var b = browserify({
    entries: './secondExampleApplication/source.js',
    debug: true
   });
   
   return b.bundle()
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    .pipe(source('./secondExampleApplication/source.js'))
    .pipe(rename("index.js"))
    .pipe(gulp.dest('./secondExampleApplication/'));   
}

gulp.task('browserify3', function(cb){browserifySecondApplication(); cb();});

//start web server for second Example
gulp.task('connect2', ['browserify3'], function(){
   connect.server({
      root: "./secondExampleApplication",
      port: 8082,
      livereload: false,
      middleware : function(connect, opts){
         return [cors()];
      }
   });
});

gulp.task('example2', ['browserify3', 'connect2']);


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
  return gulp.src(['./Jasmine_testsuites_build/Jasmine_testsuites_help.js', './Jasmine_testsuites.js'])
    .pipe(jasmineBrowser.specRunner())
    .pipe(jasmineBrowser.server({port: 8888}));
});

//Watch Task
// Watches JS
gulp.task('watch', ['tests', 'connect'], function(){
   gulp.watch('./example_application.js', ['browserify']);
   gulp.watch('./Jasmine_testsuites.js', ['browserify2', 'tests']);
   gulp.watch('./index.html', ['minify_example_app.html']);
  // gulp.watch('./index.html', ['minify_index.html']);
});


gulp.task('default', ['browserify', 'connect', 'browserify2', 'minify_example_app.html', 'tests', 'watch']);