// monthly usage limit has been reached
const ipStack = "http://api.ipstack.com/";
const ipinfo="https://ipinfo.io/";
const weather="https://api.openweathermap.org/data/2.5/weather";
const options = {
    method: "GET",
};

async function getIP(){
    const reqUrl="https://api.ipify.org/?format=json";
    let response = await fetch(reqUrl);
    return await response.json(); 
}

async function getLocationA(address){
    // monthly usage limit has been reached
    let reqUrl = `${ipStack}${address}?access_key=${process.env.IPSTACK_KEY}`;
        let response = await fetch(reqUrl);
        return await response.json();
}

async function getLocationB(address){
    let reqUrl=`${ipinfo}${address}?token=${process.env.IPINFO_KEY}`;
    let response = await fetch(reqUrl);
    return await response.json();
} 

async function getWeather(lat,lon){
    const reqUrl=`${weather}?lat=${lat}&lon=${lon}&appid=${process.env.WEATHER_KEY}`;
    let response = await fetch(reqUrl,options);
    return await response.json(); 
}


module.exports={
    getIP,
    getLocationA,
    getLocationB,
    getWeather
}
