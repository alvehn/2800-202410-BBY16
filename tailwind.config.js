/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './views/**/*.ejs',     // Include all EJS files in the views directory
    './public/**/*.html',   // Include any HTML files in the public directory
    './index.js',           // Include your main JavaScript file
    './public/css/**/*.css' // Include any custom CSS files in the public/css directory
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

