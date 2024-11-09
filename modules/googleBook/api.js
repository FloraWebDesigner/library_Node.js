const googleBook = "https://www.googleapis.com/books/v1";

const subject=["Fiction","History","Science","Technology","Art","Business","Economics","Philosophy","Psychology","Travel","Cooking","Health","Sports"];
const color=['#80b918','#70e000','#affc41','#ffff24','#fdc700','#fc7b28','#fa442a','#f84aa7','#e980fc','#ffb2e6','#f7dad9','#b9eee1','#4ce0d2'];
const categoryColorPair = subject.map((category, index) => ({
    category,
    color: color[index]
}));

// Search by category
// https://www.googleapis.com/books/v1/volumes?q=subject:fiction&download=epub&maxResults=40&orderBy=newest
async function getInitialBooks(results) {
    const responses = await Promise.all(
        categoryColorPair.map(async ({ category, color }) => {
            const reqUrl = `${googleBook}/volumes?q=subject:${category}&maxResults=${results}&printType=books&orderBy=relevance`;
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

async function getBooksByCat(cat) {
    const getBooks = await getInitialBooks(2);
    const getCatBooks = getBooks[cat];
    return getCatBooks;
}

// `${googleBook}/volumes?q=${input}&maxResults=40`
async function getSearch(input,maxResults){
    let reqUrl=`${googleBook}/volumes?q=${input}&maxResults=${maxResults}`;
    let response = await fetch(reqUrl);
    return await response.json(); 
}

// https://www.googleapis.com/books/v1/volumes/{volumeId}
async function getBookDetail(id){
    let reqUrl = `${googleBook}/volumes/${id}`;
    let response = await fetch(reqUrl);
    return await response.json();
}

// https://www.googleapis.com/books/v1/volumes?q=a&orderBy=newest
async function getNewArrivals(){
    let reqUrl = `${googleBook}/volumes?q=a&orderBy=newest`;
    let response = await fetch(reqUrl);
    return await response.json(); // return the JSON response
}

// Find library: 9780008267865
// https://www.worldcat.org/search?q=isbn:{ISBN}


// function googleBooksRating(volumeInfo) {
//     const rating = volumeInfo.averageRating || 0;
//     return rating;
// }

// function getISBN13(volumeInfo) {
//     const isbn13 = volumeInfo.industryIdentifiers.find(id => id.type === 'ISBN_13')?.identifier;
//     return isbn13;
// }

// function getISBN10(volumeInfo) {
//     const isbn10 = volumeInfo.industryIdentifiers.find(id => id.type === 'ISBN_10')?.identifier;
//     return isbn10;
// }


module.exports={
    getInitialBooks,
    getSearch,
    getBookDetail,
    getNewArrivals,
    getBooksByCat
    // getISBN13,
    // getISBN10,
    // googleBooksRating,
};