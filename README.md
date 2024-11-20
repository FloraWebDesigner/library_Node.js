# Library CMS Project

Highlights(product): visitors can search for a book and get purchase and borrowing information associated with the price of the book on Amazon, and the worldcat site for the book in the library collection near where the user's IP address is located.

Highlights(programming):
1. login&register
2. Visitors: basic search, read book data, different views of books display.
3. Users: profile page, advanced search, tools(create bookmark, text to audio, preview ebooks), audio desc/copy ISBN on bookDetail page, add/remove FAVORITES
4. Admin: CRUD users, add/remove BOOKS
current status: not includes(not finished) Book Lending, Pagination

## Main source: Google Book API(openlibrary to get RATES)
Other APIs: news, weather, color, audio, image, quote...

## Secured settings using .env
1. mongoCluster database.
2. API keys.


NOTE: 
1. If it touches the daily limits, free to generate your own Google Book API to place mine on .env file
2. Free to change $maxresults varible to control the book number both in /modules/googleBook/api.js and index.js(I set $maxresults as the variable of some functions)
