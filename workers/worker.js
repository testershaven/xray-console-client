const fs = require("fs");
const JSZip = require("jszip");

class Worker {
    async zipFiles(folder) {
        console.log('Zipping files');
        const fileNames = fs.readdirSync(folder);
        let zip = new JSZip();

        for (const fileName of fileNames) {
            let feature = fs.readFileSync(`${folder}/${fileName}`).toString();
            zip.file(fileName, feature);
        }
        
        return await zip.generateAsync({type:"blob"});
    }

    async splitArray(arr, chunkSize) {
        let result = [];

        for (let i = 0; i < arr.length; i += chunkSize) {
            let chunk = arr.slice(i, i + chunkSize);
            result.push(chunk);
        }

        return result;
    }
}

module.exports = {Worker}