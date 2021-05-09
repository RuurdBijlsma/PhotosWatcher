import classify from "./classify.js";
import {transcode, resize, videoScreenshot} from "./transcode.js";
import {getExif, probeVideo} from "./exif.js";
import fs from 'fs'
import path from "path";
import mime from "mime-types";
import config from "./config.js";

// Todo
// Database stuff
// Turn into class or something

const bigPic = await useDir(path.join(config.thumbnails, 'bigPic'));
const smallPic = await useDir(path.join(config.thumbnails, 'smallPic'));
const streamVid = await useDir(path.join(config.thumbnails, 'streamVid'));
const vidPoster = await useDir(path.join(config.thumbnails, 'vidPoster'));
const smallVidPoster = await useDir(path.join(config.thumbnails, 'smallVidPoster'));

//test:
// await processMedia('./photos/kat.jpg');
await processMedia('./photos/home.mp4');

//When new media arrives
console.log("Watching", config.mediaPath);

fs.watch(config.mediaPath, async (eventType, filename) => {
    if (eventType === 'rename') {
        if (await checkFileExists(path.join(config.mediaPath, filename))) {
            console.log("Added file", filename);
            let success = await processMedia(filename);
            console.log("New file process", filename, "success?", success);
        } else {
            console.log("Removed file", filename);
        }
    }
})

async function processMedia(filePath) {
    let fileExt = path.extname(filePath);
    let fileName = path.basename(filePath);
    let mimeType = mime.lookup(fileExt);
    let type = mimeType.split('/')[0];
    if (type === 'image') {
        let labels = await classify(filePath);
        let metadata = await getExif(filePath);
        await resize({input: filePath, output: path.join(bigPic, fileName + '.webp'), height: 1440});
        await resize({input: filePath, output: path.join(smallPic, fileName + '.webp'), height: 500});
        console.log("put in db", fileName, metadata, labels, `+${bigPic} en ${smallPic}`);
    } else if (type === 'video') {
        let metadata = await probeVideo(filePath);
        let webmFile = path.join(streamVid, fileName + '.webm');
        await transcode({input: filePath, output: webmFile, height: 1080});
        let poster = path.join(vidPoster, fileName + '.webp');
        await videoScreenshot({input: webmFile, output: poster, height: 1080});
        await resize({input: poster, output: path.join(smallVidPoster, fileName + '.webp'), height: 500});
        console.log("put in db", fileName, metadata, `+${webmFile}, ${vidPoster} en ${smallVidPoster}`);
    }
    // If some failure happens, retry after timeout, then post to telegram
    return true;
}

async function checkFileExists(file) {
    return fs.promises.access(file, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false)
}

async function useDir(dir) {
    if (!await checkFileExists(dir))
        await fs.promises.mkdir(dir);
    return dir;
}
