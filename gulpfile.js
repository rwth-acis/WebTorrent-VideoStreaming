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
var pump = require('pump');
var babelify = require("babelify");
var combiner = require('stream-combiner2');



/*
gulp.task('html', function (){
  gulp.src('./web/*.html')
    .pipe(connect.reload());
});
*/

// add custom browserify options here
var customOpts = {
  entries: ['./example_application.js'],
  extensions: [".js", ".json", ".es6", ".es", ".jsx"],
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



gulp.task('test', function() {
  var combined = combiner.obj([
    gulp.src('bootstrap/js/*.js'),
    uglify(),
    gulp.dest('public/bootstrap')
  ]);

  // any errors in the above streams will get caught
  // by this listener, instead of being thrown:
  combined.on('error', console.error.bind(console));

  return combined;
});



function bundle() {
  return b.transform("babelify", {presets: ["es2015"]}) //   , "react"   , "es2016"
   .bundle()
   //.on('error', errorLog)
    // log errors if they happen
    //.on('error', gutil.log.bind(gutil, 'Browserify Error'))
    .pipe(source('example_application.js'))
    //.pipe(rename("example_application_temp.js")) own work
    // optional, remove if you don't need to buffer file contents
    .pipe(buffer())

    // optional, remove if you dont want sourcemaps
    .pipe(sourcemaps.init({loadMaps: true})) // loads map from browserify file
    // Add transformation tasks to the pipeline here.
   // .pipe(uglify().on('error', gutil.log))   //Das mit uglify lass ich jetzt da Kevin der Yjs Entwickler da auch nicht weiter weiß       {outSourceMap: true, inSourceMap: "example_application.js.map"}
   // writes .map file
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./web/'));
}


function errorLog(error){
   console.error.bind(error);
   this.emit('end');
}

// Takes to long for developement. Therefore commented out till deployment. Didn't work when commented out.
/* Uglifies output of browserify
gulp.task('uglify_example_app.js', ['browserify2'], function(){
   return gulp.src('./web/example_application.js')
   .pipe(uglify())
   .on('error', errorLog)
   //.pipe(rename("example_application.js"))
   .pipe(gulp.dest('./web/'));
   console.log("Uglified bundle");
});
*/

gulp.task('uglify_example_app.js', ['browserify'],  function (cb) {
  pump([
        gulp.src('./web/example_application.js'),
        uglify(),
        gulp.dest('./web/')
    ],
    cb
  );
});



// Uglifies index.html
gulp.task('minify_example_app.html', function(){  // ['browserify2']
   gulp.src('./example_application.html')
   .pipe(htmlmin({collapseWhitespace: true}))
   .on('error', errorLog)
   .pipe(rename("index.html"))
   .pipe(gulp.dest('./web/'));
   console.log("uglified example_application.html");
});


//start web server
gulp.task('connect', function(){
   connect.server({
      root: "./web",
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


gulp.task('watch_production', ['connect'], function(){
   gulp.watch('./example_application.js', ['browserify', 'uglify_example_app.js']);
   gulp.watch('./index.html', ['minify_example_app.html']);
});


// 'uglify_example_app.js',   schien zu funktionieren bis auf "Unexpected token: name (YArray)"
gulp.task('default', ['browserify', 'connect', 'browserify2', 'minify_example_app.html', 'tests', 'watch']);
//'uglify_example_app.js',
gulp.task('production', ['browserify', 'connect',  'minify_example_app.html', 'watch_production']);