const news = "https://newsapi.org/v2";
const d = new Date();
// get past week's news
d.setDate(d.getDate() - 3);
const lastThree = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// https://newsapi.org/v2/everything?q=literary&from=2024-10-30&&sortBy=popularity&apiKey=
async function getNewsByEverything(query,num){
    // const query="literary"; top-headlines?
    const reqUrl=`${news}/everything?q=${query}&from=${lastThree}&sortBy=relevancy&pageSize=${num}&apiKey=${process.env.NEWS_KEY}`;
        const response = await fetch(reqUrl);
        return await response.json(); 
}


module.exports={
    getNewsByEverything
}
