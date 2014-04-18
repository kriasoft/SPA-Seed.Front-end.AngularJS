// For more information on how to configure Gulp.js build system, please visit:
// https://github.com/gulpjs/gulp/blob/master/docs/API.md

'use strict';

var gulp = require('gulp');
var changed = require('gulp-changed');
var jshint = require('gulp-jshint');
var less = require('gulp-less');
var gutil = require('gulp-util');
var rimraf = require('rimraf');
var es = require('event-stream');

// A cache for Gulp tasks. It is used as a workaround for Gulp's dependency resolution
// limitations. It won't be needed anymore starting with Gulp 4.
var task = {};

// Clean up
gulp.task('clean', function (cb) {
    rimraf('./build', cb);
});

// Copy public/static files
gulp.task('public', task.public = function () {
    return gulp.src('./public/**')
        .pipe(gulp.dest('./build'));
});
gulp.task('public-clean', ['clean'], task.public);

// Copy vendor specific files
gulp.task('vendor', task.vendor = function () {
    // TODO: Copy vendor specific files
});
gulp.task('vendor-clean', ['clean'], task.vendor);

// CSS stylesheets
gulp.task('styles', task.styles = function () {
    return gulp.src('./src/app.less')
        .pipe(less())
        .pipe(gulp.dest('./build'));
});
gulp.task('styles-clean', ['clean'], task.styles);

// HTML views
gulp.task('views', task.views = function () {
    return gulp.src('./src/**/*.html')
        .pipe(changed('./build'))
        .pipe(gulp.dest('./build'));
});
gulp.task('views-clean', ['clean'], task.views);

// JavaScript code
gulp.task('scripts', task.scripts = function () {
    var source = require('vinyl-source-stream');
    return es.concat(
        gulp.src(['./src/**/*.js', './gulpfile.js'])
            .pipe(jshint())
            .pipe(jshint.reporter('jshint-stylish')),
        require('browserify')({entries: ['./src/app.js'], debug: !gutil.env.production})
            .bundle()
            .pipe(source('app.js'))
            .pipe(gulp.dest('./build'))
    );
});
gulp.task('scripts-clean', ['clean'], task.scripts);

// Build the app from source code
gulp.task('build', ['public-clean', 'vendor-clean', 'views-clean', 'styles-clean', 'scripts-clean']);

// Launch a lightweight HTTP Server
gulp.task('run', ['build'], function (next) {
    var url = require('url'),
        fileServer = require('ecstatic')({root: './build', cache: 'no-cache', showDir: true}),
        port = 8000;
    require('http').createServer()
        .on('request', function (req, res) {
            // For non-existent files output the contents of /index.html page in order to make HTML5 routing work
            var urlPath = url.parse(req.url);
            if (urlPath.length > 3 &&
                ['css', 'html', 'ico', 'js', 'png', 'txt', 'xml'].indexOf(urlPath.split('.').pop()) == -1 &&
                ['fonts', 'images', 'vendor', 'views'].indexOf(urlPath.split('/')[1]) == -1) {
                req.url = '/index.html';
            }
            fileServer(req, res);
        })
        .listen(port, function () {
            gutil.log('Server is listening on ' +
                gutil.colors.magenta('http://localhost:' + port + '/'));
            next();
        });
});

// Watch for changes in source files
gulp.task('watch', ['run'], function () {
    var path = require('path'),
        livereload = require('gulp-livereload')();
    gulp.watch('./build/**', function (file) {
        var relPath = './build/' + path.relative('./build', file.path);
        gutil.log('File changed: ' + gutil.colors.magenta(relPath));
        livereload.changed(file.path);
    });
    gulp.watch('./public/**', ['public']);
    gulp.watch('./src/**/*.html', ['views']);
    gulp.watch('./src/**/*.less', ['styles']);
    gulp.watch('./src/**/*.js', ['scripts']);
});

// The default task
gulp.task('default', ['watch']);