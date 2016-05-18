'use strict';

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
var gulp = require('gulp');
var connect = require('gulp-connect');
 
 
gulp.task('connect', function(){
  connect.server({
    root: './build',
    livereload: false
  });
});

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
var opts = assign({}, watchify.args, customOpts);
var b = watchify(browserify(opts)); 

// add transformations here
// i.e. b.transform(coffeeify);

gulp.task('browserify', bundle); // so you can run `gulp js` to build the file
b.on('update', bundle); // on any dep update, runs the bundler
b.on('log', gutil.log); // output build logs to terminal

function bundle() {
  return b.bundle()
    // log errors if they happen
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    .pipe(source('index.js'))
    // optional, remove if you don't need to buffer file contents
    .pipe(buffer())
    // optional, remove if you dont want sourcemaps
    .pipe(sourcemaps.init({loadMaps: true})) // loads map from browserify file
       // Add transformation tasks to the pipeline here.
    .pipe(sourcemaps.write('./')) // writes .map file 
    .pipe(gulp.dest('./browserfied/'));
}

   
function errorLog(error){
   console.error.bind(error);
   this.emit('end');
}


// Uglifies output of browserify
gulp.task('uglify_bundle', function(){
   gulp.src('./browserfied/index.js')
   .pipe(uglify())
   .on('error', errorLog)
   .pipe(gulp.dest('./build'));
   console.log("Uglified bundle");
});

// Uglifies index.html
gulp.task('minify_index.html', function(){
   gulp.src('./index.html')
   .pipe(htmlmin({collapseWhitespace: true}))
   .on('error', errorLog)
   .pipe(gulp.dest('./build'));
   console.log("uglified index.html");
});


//Watch Task
// Watches JS
gulp.task('watch', function(){
   gulp.watch('./index.js', ['browserify', 'uglify_bundle']);
   gulp.watch('./index.html', ['minify_index.html']);
   //gulp.watch(['./build/*.*'], ['html']);
});

gulp.task('default', ['browserify', 'uglify_bundle', 'minify_index.html', 'connect', 'watch']);