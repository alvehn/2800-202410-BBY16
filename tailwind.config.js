/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './views/**/*.ejs',     // Include all EJS files in the views directory
    './public/**/*.html',   // Include any HTML files in the public directory
    './index.js',           // Include your main JavaScript file
    './public/css/**/*.css' // Include any custom CSS files in the public/css directory
  ],
  theme: {
    extend: {
      colors: {
        "golden-yellow": "#dbc596",
        "beige": "#ddc695",
        "ivory": "#fef4dc",
        "stone": "#d6d4c5",
        "light-sage": "#a9c0a1",
        "dark-sage": "#789d85",
        "teal": "#558c7b",
        "light-olive": "#c0bc84",
        "dark-olive": "#92a067",
        "fern-green": "#537a57",
        "evergreen": "#2b4e39",
        "lemon-grass": "##969b87",
        "orange": "#ef9b55",
        "light-coral": "#e58c8aff",
        "beige": "#ebebd3ff",
        "argentinian-blue": "#5aaff0ff",
        "celadon": "#a7e7b8ff",
        "space-cadet": "#27243bff"
      },
    },
  },
  plugins: [],
}

