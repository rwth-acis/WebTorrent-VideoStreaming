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


// Add custom browserify options here.
var customOpts = {
  entries: ['./example-application.js'],
  extensions: [".js", ".json", ".es6", ".es", ".jsx"],
  debug: true
};
var customOpts2 = {
  entries: ['./jasmine-testsuites-help.js'],
  debug: true
};
var opts = assign({}, watchify.args, customOpts);
var opts2 = assign({}, watchify.args, customOpts2); 
var b = watchify(browserify(opts));
var b2 = watchify(browserify(opts2));

gulp.task('browserify', function(cb){bundle(); cb()});
gulp.task('browserify2', [], function(cb){bundle2(); cb()});
gulp.task('browserify3', function(cb){browserifySecondApplication(); cb();});

b.on('update', bundle); // On any dep update, run the bundler.
b2.on('update', bundle2);
b.on('log', gutil.log); // Output build logs to terminal.
b2.on('log', gutil.log);

function bundle() {
  return b.transform("babelify", {presets: ["es2015"]})
    .bundle()
    .pipe(source('example-application.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    
    // Add transformation tasks to the pipeline here.
    
    // Writes .map file
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./web/'));
}

function bundle2(){
  return b2.bundle()
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    .pipe(source('./jasmine-testsuites-help.js'))
    .pipe(gulp.dest('./jasmine-testsuites-build/'));
}

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


gulp.task('test', function() {
  var combined = combiner.obj([
    gulp.src('bootstrap/js/*.js'),
    uglify(),
    gulp.dest('public/bootstrap')
  ]);

  // Any errors in the above streams will get caught
  // by this listener, instead of being thrown:
  combined.on('error', console.error.bind(console));

  return combined;
});


function errorLog(error){
  console.error.bind(error);
  this.emit('end');
}


gulp.task('uglify_example_app.js', ['browserify'],  function (cb) {
  pump([
      gulp.src('./web/example-application.js'),
      uglify(),
      gulp.dest('./web/')
    ],
    cb
  );
});


// Uglifies index.html
gulp.task('minify_example_app.html', function(){
  gulp.src('./example-application.html')
  .pipe(htmlmin({collapseWhitespace: true}))
  .on('error', errorLog)
  .pipe(rename("index.html"))
  .pipe(gulp.dest('./web/'));
  console.log("Uglified and renamed example-application.html");
});


// Start Web server on localhost:8080
gulp.task('connect', function(){
  connect.server({
    root: "./web",
    //debug: true,
    livereload: false,
    middleware : function(connect, opts){
      return [cors()];
    }
  });
});


// Start Web server for second Example
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


gulp.task('tests', ['browserify2'], function() {
  return gulp.src(['./jasmine-testsuites-build/jasmine-testsuites-help.js', './jasmine-testsuites.js'])
    .pipe(jasmineBrowser.specRunner())
    .pipe(jasmineBrowser.server({port: 8888}));
});


gulp.task('watch', ['tests', 'connect'], function(){
  gulp.watch('./example-application.js', ['browserify']);
  gulp.watch('./jasmine-testsuites.js', ['browserify2', 'tests']);
  gulp.watch('./index.html', ['minify_example_app.html']);
});

gulp.task('watch_production', ['connect'], function(){
  gulp.watch('./example-application.js', ['browserify', 'uglify_example_app.js']);
  gulp.watch('./index.html', ['minify_example_app.html']);
});


gulp.task('example2', ['browserify3', 'connect2']);

// The inclusion of 'uglify_example_app.js' to the task array seems to had worked expect that it could not 
// handle Yjs and therefore had thrown a "Unexpected token: name (YArray)" error.
gulp.task('default', ['browserify', 'connect', 'browserify2', 'minify_example_app.html', 'tests', 'watch']);
gulp.task('production', ['browserify', 'connect',  'minify_example_app.html', 'watch_production']);