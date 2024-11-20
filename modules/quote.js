const quote="https://zenquotes.io/api/random";

async function getQuote(){
    let response = await fetch(quote);
    return await response.json(); 
}

module.exports={
    getQuote
}
