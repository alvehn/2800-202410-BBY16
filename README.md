## 1. Project Title
StudyPals 

## 2. Project Description 
Our group, BBY-16, is developing StudyPals, a motivational study tracker to help students maintain discipline by visualizing their study habits and competing with peers, all while nurturing a virtual pet as a fun reward system.

## 3. Technologies Used
**Front-end:**
- EJS (Embedded JavaScript)
- JavaScript 
- Tailwind CSS

**Back-end:**
- Node.js

**Database:**
- MongoDB

## 4. File Contents
```bash
├────────lib
│                   index.js
│                   string-utils.js
│                   tokenize-arg-string.js
│                   yargs-parser-types.js
│                   yargs-parser.js
│
├───public
│   │   pets_background.jpg
│   │
│   ├───animation_background
│   │   ├───Clouds1
│   │   │       1.png
│   │   │       2.png
│   │   │       3.png
│   │   │       4.png
│   │   │
│   │   ├───Forest
│   │   │       Background.png
│   │   │       Layer_0000_9.png
│   │   │       Layer_0001_8.png
│   │   │       Layer_0002_7.png
│   │   │       Layer_0003_6.png
│   │   │       Layer_0004_Lights.png
│   │   │       Layer_0005_5.png
│   │   │       Layer_0006_4.png
│   │   │       Layer_0007_Lights.png
│   │   │       Layer_0008_3.png
│   │   │       Layer_0009_2.png
│   │   │       Layer_0010_1.png
│   │   │       Layer_0011_0.png
│   │   │
│   │   └───Nature
│   │           1.png
│   │           2.png
│   │           3.png
│   │           4.png
│   │           5.png
│   │           orig.png
│   │           origbig.png
│   │
│   ├───assets
│   │   │   Favicon.png
│   │   │
│   │   ├───costumes
│   │   │       luffy_hat.png
│   │   │
│   │   └───icons
│   │           add.png
│   │           bear.png
│   │           dropdown.png
│   │           dropdown_gear.png
│   │           dropdown_thick.png
│   │           edit.png
│   │           groups.png
│   │           groups_coral.png
│   │           home.png
│   │           home_coral.png
│   │           icon-bunny.png
│   │           icon-corgi.png
│   │           icon-fox.png
│   │           key_coral.png
│   │           key_white.png
│   │           logout.png
│   │           logout_coral.png
│   │           logout_white.png
│   │           notification-cap.png
│   │           notification.png
│   │           pets.png
│   │           pets_coral.png
│   │           pets_coral_filled.png
│   │           pets_white.png
│   │           profile.png
│   │           profile_coral.png
│   │           profile_outline_coral.png
│   │           profile_outline_white.png
│   │           search.png
│   │           shop.png
│   │           shop_coral.png
│   │           shop_white.png
│   │
│   ├───css
│   │       stylesheet.css
│   │       tailwind.css
│   │
│   ├───fonts
│   │       PixelifySans-Regular.ttf
│   │
│   ├───index_photos
│   │       1.png
│   │       2.png
│   │       4.png
│   │       5.png
│   │       6.png
│   │
│   ├───profile_images
│   │       profile1.png
│   │
│   └───sprite_sheets
│           bunny.png
│           bunny_luffy_hat.png
│           corgi.png
│           fox.png
│           fox_luffy_hat.png
│           MiniBear.png
│           MiniBird.png
│           MiniBoar.png
│           MiniDeer1.png
│           MiniDeer2.png
│           MiniWolf.png
│
├───src
│   │   input.css
│   │
│   └───Pixelify_Sans
│       │   OFL.txt
│       │   PixelifySans-VariableFont_wght.ttf
│       │   README.txt
│       │
│       └───static
│               PixelifySans-Bold.ttf
│               PixelifySans-Medium.ttf
│               PixelifySans-SemiBold.ttf
│
└───views
    │   404.ejs
    │   about.ejs
    │   change_password.ejs
    │   forget_password.ejs
    │   friends.ejs
    │   groups.ejs
    │   home_page.ejs
    │   index.ejs
    │   login.ejs
    │   petinv.ejs
    │   petshop.ejs
    │   profile.ejs
    │   reset_password.ejs
    │   set_new_password.ejs
    │   signup.ejs
    │   study_session.ejs
    │   update_profile.ejs
    │
    └───templates
            default.ejs
            default_footer.ejs
            default_header.ejs
            footer.ejs
            header.ejs
            navbar.ejs
```

## 5. How to run the project
1. Email **studypals2800@gmail.com** to request .env file
2. Copy and paste the .env file into the root directory
3. Run _**npm i**_ and _**npm i nodemon**_ on your local terminal
4. Run _**nodemon**_ on your local terminal
6. Open a browser (preferably **Google Chrome**) and go to **_localhost:3001_**

## 6. How to use the product
**Study Session**
1. Sign up for an account
2. Click "Start Study Session" button and study
3. Click "End Study Session" to end the study session

**Buy Pets**
1. Click the dropdown menu on the top right corner of the homepage
2. Open the Shop
3. Click "Buy" on the item you would like to purchase
4. Navigate to the Inventory from the dropdown menu
5. Select your pets and / or costumes based on the ones you own

**Adding Friends**
1. Navigate to the Friends tab from the navigation bar
2. Click on the "+" icon to add a new friend
3. Enter the friend's username (case sensitive)
4. Wait for them to accept your request

## 7. Credits, References, and Licenses
- MiniFolk Forest Animals by Lyaseek: https://lyaseek.itch.io/miniffanimals
- Nature Landscapes Free Pixel Art by Free Game Assets: https://free-game-assets.itch.io/nature-landscapes-free-pixel-art
- Free Summer Pixel Art Backgrounds by Free Game Assets: https://free-game-assets.itch.io/free-summer-pixel-art-backgrounds

## 8. How we used AI
We used AI to help us configure our tailwind CSS file and help us debug issues in our code by sending it our code snippets. We would provide the AI with an explanation of the intended functionality of the code and highlight any discrepancies between its expected behaviour and actual performance. Then, we would copy and paste our code segment into the AI prompt and use the response to give us an idea of how to fix it. While using AI, we discovered its limitations in generating complex code independently. Although AI is great at providing code snippets and function definitions, it falls short when tasked with creating entire features. To overcome this, we adopted a strategy of requesting AI to generate segments of our application code and then relied on our programming expertise to integrate these segments together. Our current application does not integrate AI, as we prioritized keeping it simple. However, this decision is not set in stone for the future.

## 9. Contact Information 
Please email us at **studypals2800@gmail.com** with any questions you may have! 
