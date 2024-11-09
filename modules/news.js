const news = "https://newsapi.org/v2";
const d = new Date();
// get past week's news
d.setDate(d.getDate() - 7);
const yesterday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// https://newsapi.org/v2/everything?q=literary&from=2024-10-30&&sortBy=popularity&apiKey=
async function getNewsByEverything(){
    const query="literary";
    const reqUrl=`${news}/everything?q=${query}&from=${yesterday}&sortBy=popularity&apiKey=${process.env.NEWS_KEY}`;
    console.log(reqUrl);
    let response = await fetch(reqUrl);
    return await response.json(); 
}


// module.exports={
//     getNewsByEverything
// }
