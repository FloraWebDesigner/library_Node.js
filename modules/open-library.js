const openLibrary="https://openlibrary.org";

// https://openlibrary.org/isbn/{isbn}.json
async function getKeyByISBN(isbn) {
    const reqUrl = `${openLibrary}/isbn/${isbn}.json`;
    let response = await fetch(reqUrl);

    if (!response.ok) {
        throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }
    return await response.json(); 
}

// https://openlibrary.org/search.json?title=the+lord+of+the+rings
// https://openlibrary.org/search.json?author=tolkien&sort=new

// NOT ACCURATE
// async function getKeyByTITLE(title,author) {
//     const reqUrl=`${openLibrary}//search.json?title=${title}&author=${author}`;
//     let response = await fetch(reqUrl);
//     return await response.json(); 
// }

//https://openlibrary.org/works/OL18020194W/ratings.json
// "key": "/works/OL123456W"
async function getRating(isbn) {
    const key = await getKeyByISBN(isbn);
    const reqUrl=`${openLibrary}${key.works[0].key}/ratings.json`;
    let response = await fetch(reqUrl);
    return await response.json(); 
}


module.exports={
    getKeyByISBN,
    getRating
}


// {
//     "summary": {
//       "average": 4.22540983606557,
//       "count": 976,
//       "sortable": 4.14989380422114
//     },
//     "counts": {
//       "1": 99,
//       "2": 33,
//       "3": 62,
//       "4": 137,
//       "5": 645
//     }
//   }
