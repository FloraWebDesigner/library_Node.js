const googleBook = "https://www.googleapis.com/books/v1";
const openLibrary = require("../open-library");
const subject=["Fiction","History","Science","Technology","Art","Business","Economics","Philosophy","Psychology","Travel","Cooking","Health","Sports"];
const color=['#80b918','#70e000','#affc41','#ffff24','#fdc700','#fc7b28','#fa442a','#f84aa7','#e980fc','#ffb2e6','#f7dad9','#b9eee1','#4ce0d2'];
const categoryColorPair = subject.map((category, index) => ({
    category,
    color: color[index]
}));

const users = require("../mongoDB/db-user");

// Search by category
// https://www.googleapis.com/books/v1/volumes?q=subject:fiction&download=epub&maxResults=40&orderBy=newest
async function getInitialBooks(results) {
    const responses = await Promise.all(
        categoryColorPair.map(async ({ category, color }) => {
          let reqUrl = `${googleBook}/volumes?q=subject:${category}&maxResults=${results}&printType=books&orderBy=relevance&key=${process.env.GOOGLE_BOOK_API_KEY}`; 
            reqUrl = `${googleBook}/volumes?q=subject:${category}&maxResults=${results}&printType=books&orderBy=relevance&key=${process.env.GOOGLE_BOOK_API_KEY}`;    
            const response = await fetch(reqUrl);
            const data = await response.json();
            return { category, data, color };
        })
    );
    const orderedResponses = responses.reduce((acc, { category, data, color }) => {
        acc[category] = { data, color };
        return acc;
    }, {});
    return orderedResponses;
}

async function getBooksByCat(cat,maxResults) {
    const getBooks = await getInitialBooks(maxResults);
    const getCatBooks = getBooks[cat];
    return getCatBooks;
}

// `${googleBook}/volumes?q=${input}&maxResults=40`
async function getSearch(input,maxResults){
    let reqUrl=`${googleBook}/volumes?q=${input}&maxResults=${maxResults}&key=${process.env.GOOGLE_BOOK_API_KEY}`;
    let response = await fetch(reqUrl);
    return await response.json(); 
}

// `${googleBook}/volumes?q=${input}&maxResults=40`
// async function getAdvancedSearch(searchCriteria,maxResults){
//   let reqUrl=`${googleBook}/volumes?q=${searchCriteria}&maxResults=${maxResults}&key=${process.env.GOOGLE_BOOK_API_KEY}`;
//   let response = await fetch(reqUrl);
//   return await response.json(); 
// }

// https://www.googleapis.com/books/v1/volumes/{volumeId}
async function getBookDetail(id){
    let reqUrl = `${googleBook}/volumes/${id}?key=${process.env.GOOGLE_BOOK_API_KEY}`;
    let response = await fetch(reqUrl);
    return await response.json();
}

// https://www.googleapis.com/books/v1/volumes?q=a&orderBy=newest
async function getNewArrivals(maxResults){
    let reqUrl = `${googleBook}/volumes?q=a&orderBy=newest&maxResults=${maxResults}&key=${process.env.GOOGLE_BOOK_API_KEY}`;
    let response = await fetch(reqUrl);
    return await response.json(); // return the JSON response
}

async function eBookNewArrivals(maxResults){
  let reqUrl = `${googleBook}/volumes?q=a&orderBy=newest&maxResults=${maxResults}&filter=ebooks&key=${process.env.GOOGLE_BOOK_API_KEY}`;
  let response = await fetch(reqUrl);
  return await response.json(); // return the JSON response
}

// --------------------to do-------------------------------
// https://www.googleapis.com/books/v1/volumes?q=yourSearchTerm&startIndex=0&maxResults=10&key=yourAPIKey
async function getPagination(input,start,num){
  let reqPaginationUrl=`${googleBook}/volumes?q=${input}&startIndex=${start}&maxResults=${num}&key=${process.env.GOOGLE_BOOK_API_KEY}`;
  let response = await fetch(reqPaginationUrl);
  return await response.json(); 
}
// --------------------to do-------------------------------
async function getNewArrivalPagination(start,num){
  let reqPaginationUrl=`${googleBook}/volumes?q=a&orderBy=newest&startIndex=${start}&maxResults=${num}&key=${process.env.GOOGLE_BOOK_API_KEY}`;
  let response = await fetch(reqPaginationUrl);
  return await response.json(); 
}

//https://www.googleapis.com/books/v1/volumes?q=inauthor:{author}&maxResults=40
async function getBooksByAuthor(author){
    let reqUrl = `${googleBook}/volumes?q=inauthor:${author}&maxResults=5&key=${process.env.GOOGLE_BOOK_API_KEY}`;
    let response = await fetch(reqUrl);
    return await response.json();
}


function formatDesc(text) { 
    if (typeof text !== 'string') { 
        text = String(text);  
    } 
    return text.replace(/<\/?[^>]+(>|$)/g, 
        function (match) { 
            return match.toLowerCase() === '<br>' ? '\n' : ''; 
        });
  }

async function formattingBooks(bookList,userID){
    for (let book of bookList) {
    const bookID = book.id;
    let isFavorite = false;
    if(userID){
      isFavorite = await users.isBookInFavorites(userID,bookID);
      console.log("api isFavorite: ",isFavorite);
    }
    book.isUserFavorite = isFavorite;
    console.log("book.isFavorite:",book.isUserFavorite);

    const imageLinks = book.volumeInfo.imageLinks || {};
    book.volumeInfo.imageUrl =
      imageLinks.smallThumbnail ||
      imageLinks.thumbnail ||
      "/img/cover-placeholder.svg";
    let desc = book.volumeInfo.description|| {};
    book.volumeInfo.description=formatDesc(desc);

    let rating = book.volumeInfo?.averageRating || 0;
    let identifiers = book.volumeInfo?.industryIdentifiers || [];
    let isbn13 = null;
    let isbn10 = null;
    if (identifiers.length>0) {
      isbn13 = identifiers.find((id) => id.type === "ISBN_13")?.identifier;
      isbn10 = identifiers.find((id) => id.type === "ISBN_10")?.identifier;
    }
    // console.log("rating:",rating);
    // console.log("isbn13:",isbn13);
    // console.log("isbn10:",isbn10);
    if (rating === 0 && isbn13) {
      let tempRate = await openLibrary.getRating(isbn13);
      rating = tempRate.summary.average;
      // console.log("tempRate",tempRate);
      // console.log("rating1:",rating);
    }
    if (rating === 0 && isbn10) {
      let tempRate = await openLibrary.getRating(isbn10);
      rating = tempRate.summary.average;
      // console.log("tempRate",tempRate);
      // console.log("rating2:",rating);
    }
    book.volumeInfo.rating = rating;
    book.volumeInfo.isbn13 = isbn13 || "NA"; 
    book.volumeInfo.isbn10 = isbn10 || "NA";
  }
  return bookList;
}

// bookID in param, not check isFavorite here
async function formattingOneBook(book){
  console.log("running formatiingOneBook");
  console.log(book.volumeInfo);
    const imageLinks = book.volumeInfo.imageLinks || {};
    // console.log(imageLinks);
    book.volumeInfo.imageUrl =
      imageLinks.smallThumbnail ||
      imageLinks.thumbnail ||
      "/img/cover-placeholder.svg";
    let desc = book.volumeInfo.description|| {};
    book.volumeInfo.description=formatDesc(desc);
    let rating = book.volumeInfo?.averageRating || 0;
    let identifiers = book.volumeInfo?.industryIdentifiers || [];
    let isbn13 = null;
    let isbn10 = null;
    if (identifiers.length>0) {
      isbn13 = identifiers.find((id) => id.type === "ISBN_13")?.identifier;
      isbn10 = identifiers.find((id) => id.type === "ISBN_10")?.identifier;
    }
    // console.log("rating:",rating);
    // console.log("isbn13:",isbn13);
    // console.log("isbn10:",isbn10);
    if (rating === 0 && isbn13) {
      let tempRate = await openLibrary.getRating(isbn13);
      rating = tempRate.summary.average;
      // console.log("tempRate",tempRate);
      // console.log("rating1:",rating);
    }
    if (rating === 0 && isbn10) {
      let tempRate = await openLibrary.getRating(isbn10);
      rating = tempRate.summary.average;
      // console.log("tempRate",tempRate);
      // console.log("rating2:",rating);
    }
    book.volumeInfo.rating = rating;
    book.volumeInfo.isbn13 = isbn13 || "NA"; 
    book.volumeInfo.isbn10 = isbn10 || "NA";
  
  return book;
}




module.exports={
    getInitialBooks,
    getSearch,
    // getAdvancedSearch,
    getBookDetail,
    getNewArrivals,
    getBooksByCat,
    formattingBooks,
    formattingOneBook,
    getBooksByAuthor,
    subject,
    eBookNewArrivals
    // getISBN13,
    // getISBN10,
    // googleBooksRating,
};