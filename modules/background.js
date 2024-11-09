const nasa="https://api.nasa.gov/planetary";

// example: https://api.nasa.gov/planetary/apod?api_key=gadbfwh7LYMuegeLa33CM9q9UKKxxG4c7P2krbBu
// "hdurl": "https://apod.nasa.gov/apod/image/2411/LastRingPortrait_Cassini_4472.jpg",
async function getNasaImage(){
    const reqUrl=`${nasa}/apod?api_key=${process.env.NASA_KEY}`;
    try {
        let response = await fetch(reqUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch NASA image:", error);
        return { hdurl: "/img/placeholder.jpg" };
    }
    }

module.exports={
    getNasaImage
}
