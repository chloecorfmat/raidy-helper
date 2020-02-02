const gulp = require('gulp');
const sass = require('gulp-sass');
const uglify = require('gulp-uglify');
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const autoprefixer = require('gulp-autoprefixer');
const sassLint = require('gulp-sass-lint');
const esLint = require('gulp-eslint');
const cleanCSS = require('gulp-clean-css');

// Linter.
gulp.task('lint', async function() {

    gulp.src('./www/scss/**/*.scss')
        .pipe(sassLint())
        .pipe(sassLint.format())
        .pipe(sassLint.failOnError());
    return null;
});

gulp.task('styles', async function() {
    // place code for your default task here
    return gulp.src('./www/scss/**/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer({
            browsers: ['last 2 versions'],
            cascade: false,
        }))
        .pipe(gulp.dest('./www/dist/css'))
        .pipe(rename('styles.css'))
        .pipe(gulp.dest('./www/dist/css'))
        // Comment the line below to have unminify files.
        .pipe(cleanCSS({compatibility: 'ie8'}))
        .pipe(rename('styles.min.css'))
        .pipe(gulp.dest('./www/dist/css'));
});

gulp.task('default', gulp.series('lint', 'styles'), async function() {
    // place code for your default task here
    return null;
});

gulp.task('watch', async function () {
    gulp.watch('./www/scss/**/*.scss', ['lint']);
    gulp.watch('./www/scss/**/*.scss', ['styles']);
});
