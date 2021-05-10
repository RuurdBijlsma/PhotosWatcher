import classify from "./classify.js";
import {resize, transcode, videoScreenshot} from "./transcode.js";
import {getExif, probeVideo} from "./exif.js";
import fs from 'fs'
import path from "path";
import mime from "mime-types";
import config from "../config.js";

// Todo
// Database stuff
// Turn into class or something
// Handle images in folder (find out if they are burst or portrait?)
// Add process all files that aren't processed (use db for this)
// (Repeatedly) check for any files in media folder that haven't been processed yet


const bigPic = await useDir(path.join(config.thumbnails, 'bigPic'));
const smallPic = await useDir(path.join(config.thumbnails, 'smallPic'));
const streamVid = await useDir(path.join(config.thumbnails, 'streamVid'));
const vidPoster = await useDir(path.join(config.thumbnails, 'vidPoster'));
const smallVidPoster = await useDir(path.join(config.thumbnails, 'smallVidPoster'));

//test:
await processMedia('./photos/IMG_20200731_203422.jpg');
// await processMedia('./photos/home.mp4');

//When new media arrives
console.log("Watching", config.media);
fs.watch(config.media, async (eventType, filename) => {
    if (eventType === 'rename') {
        let changedFile = path.join(config.media, filename);
        if (await checkFileExists(changedFile)) {
            await waitSleep(600);
            await addMedia(changedFile);
        } else {
            let success = await removeMedia(changedFile);
            console.log("Remove file processed", filename, "success?", success);
        }
    }
});

async function addMedia(filePath) {
    let fileStat = await fs.promises.stat(filePath);
    console.log("Adding", filePath);
    if (fileStat.isDirectory()) {
        let files = await fs.promises.readdir(filePath);
        for (let file of files)
            await addMedia(path.join(filePath, file));
    } else {
        let success = await processMedia(filePath);
        console.log("New file processed", filePath, "success?", success);
    }
}

async function processMedia(filePath) {
    console.log("Processing media", filePath);
    let type = getFileType(filePath);

    if (type === 'image') {
        let labels = await classify(filePath);
        let metadata = await getExif(filePath);
        let {big, small} = getPaths(filePath);
        await resize({input: filePath, output: big, height: 1440});
        await resize({input: filePath, output: small, height: 500});
        console.log("put in db", filePath, metadata, labels, `+${bigPic} en ${smallPic}`);
    } else if (type === 'video') {
        let metadata = await probeVideo(filePath);
        let {webm, poster, smallPoster} = getPaths(filePath);
        await transcode({input: filePath, output: webm, height: 1080});
        await videoScreenshot({input: webm, output: poster, height: 1080});
        await resize({input: poster, output: smallPoster, height: 500});
        console.log("put in db", filePath, metadata, `+${webm}, ${vidPoster} en ${smallVidPoster}`);
    }
    // If some failure happens, retry after timeout, then post to telegram
    return true;
}

async function removeMedia(filePath) {
    let type = getFileType(filePath);
    try {
        if (type === 'image') {
            let {big, small} = getPaths(filePath);
            console.log("Removing media", {big, small});
            await fs.promises.unlink(big);
            await fs.promises.unlink(small);
        } else if (type === 'video') {
            let {webm, poster, smallPoster} = getPaths(filePath);
            console.log("Removing media", {webm, poster, smallPoster});
            await fs.promises.unlink(webm);
            await fs.promises.unlink(poster);
            await fs.promises.unlink(smallPoster);
        }
        return true;
    } catch (e) {
        console.warn("Remove error", e);
        return false;
    }
}

function getFileType(filePath) {
    let fileExt = path.extname(filePath);
    let mimeType = mime.lookup(fileExt);
    return mimeType.split('/')[0];
}

function getPaths(filePath) {
    let fileName = path.basename(filePath);
    let big = path.join(bigPic, fileName + '.webp');
    let small = path.join(smallPic, fileName + '.webp');
    let webm = path.join(streamVid, fileName + '.webm');
    let poster = path.join(vidPoster, fileName + '.webp');
    let smallPoster = path.join(smallVidPoster, fileName + '.webp');
    return {big, small, webm, poster, smallPoster}
}

async function checkFileExists(file) {
    return fs.promises.access(file, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);
}

async function useDir(dir) {
    if (!await checkFileExists(dir))
        await fs.promises.mkdir(dir);
    return dir;
}

async function waitSleep(ms = 1000) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
