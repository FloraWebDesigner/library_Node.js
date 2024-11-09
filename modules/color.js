const color="https://www.thecolorapi.com";

//https://www.thecolorapi.com/id?hex=24B1E0&format=json
async function hexToRGB(colorCode){
    const colorCodeFormat=colorCode.substring(1);
    const reqUrl=`${color}/id?hex=${colorCodeFormat}&format=json`;
    let response = await fetch(reqUrl);
    return await response.json(); 
}

module.exports={
    hexToRGB
}

