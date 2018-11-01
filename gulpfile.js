"use strict";

var gulp = require("gulp");
var less = require("gulp-less");
var plumber = require("gulp-plumber");
var rename = require("gulp-rename");
var postcss = require("gulp-postcss");
var autoprefixer = require("autoprefixer");
var csso = require("gulp-csso");
var include = require("posthtml-include");
var webp = require("gulp-webp")
var imagemin = require('gulp-imagemin');
var svgstore = require("gulp-svgstore");
var server = require("browser-sync").create();

gulp.task("css", function () {
  return gulp.src("source/less/style.less")
    .pipe(plumber())
    .pipe(less())
    .pipe(postcss([
      autoprefixer()
    ]))
    .pipe(gulp.dest("source/css"))
    .pipe(server.stream());
});

gulp.task("js", function () {
  return gulp.src("source/js/*")
    .pipe(gulp.dest("build/js"))
})

gulp.task("fonts", function () {
  return gulp.src("source/fonts/*")
    .pipe(gulp.dest("build/fonts"))
})

gulp.task("cssprod", function () {
  return gulp.src("source/less/style.less")
    .pipe(plumber())
    .pipe(less())
    .pipe(postcss([
      autoprefixer()
    ]))
    .pipe(gulp.dest("build/css"))
    .pipe(csso())
    .pipe(rename("style.min.css"))
    .pipe(gulp.dest("build/css"));
});

gulp.task("webp", function () {
  return gulp.src("source/img/*.{jpg,png}")
    .pipe(webp({quality: 90}))
    .pipe(gulp.dest("build/img"))
})

gulp.task("images", function () {
  return gulp.src("source/img/*")
    .pipe(imagemin([
      imagemin.jpegtran({progressive: true}),
      imagemin.optipng({optimizationLevel: 3}),
      imagemin.svgo({
        plugins: [
          {cleanupIDs: false}
        ]
      })
    ]))
    .pipe(gulp.dest("build/img"));
});

gulp.task("htmlprod", function () {
  return gulp.src("source/*.html")
    .pipe(gulp.dest("build/"));
});

gulp.task("server", function () {
  server.init({
    server: "source/",
    notify: false,
    open: true,
    cors: true,
    ui: false
  });

  gulp.watch("source/less/**/*.less", gulp.series("css"));
  gulp.watch("source/*.html").on("change", server.reload);
});

gulp.task("start", gulp.series("css", "server"));
gulp.task("build", gulp.series("js", "fonts", "cssprod", "webp", "images", "htmlprod"));
