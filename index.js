import classify from "./classify.js";
import geocode from "./reverse-geocode.js";
import {transcode, resize} from "./transcode.js";
import {getExif, probeVideo} from "./exif";
import fs from 'fs'
import path from "path";
import mime from "mime-types";

// Todo
// Ffprobe part (video exif / gps)
// Database stuff
// Implement flow in this file

async function checkFileExists(file) {
    return fs.promises.access(file, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false)
}

async function processMedia(filePath) {
    let fileExt = path.extname(filePath);
    let mimeType = mime.lookup(fileExt);
    let type = mimeType.split('/')[0];
    if (type === 'image') {
        let metadata = await getExif(filePath);
        // Resize 1080p version and some thumbnails to some path
        // Put in database
    } else if (type === 'video') {
        let metadata = await probeVideo(filePath);
        // Transcode to some path
        // Generate some thumbnails
        // Put in database
    }
    // If some failure happens, retry after timeout, then post to telegram
    return true;
}

//test:
await processMedia('./photos/kat.jpg');

//When new media arrives
const watchPath = './photos';
console.log("Watching", watchPath);

fs.watch(watchPath, async (eventType, filename) => {
    if (eventType === 'rename') {
        if (await checkFileExists(path.join(watchPath, filename))) {
            console.log("Added file", filename);
            let success = await processMedia(filename);
            console.log("New file process", filename, "success?", success);
        } else {
            console.log("Removed file", filename);
        }
    }
})
