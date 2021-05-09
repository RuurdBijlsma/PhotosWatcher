import exif from "exif";
import parseDMS from "parse-dms";
import ffmpeg from './promise-ffmpeg.js'
import fs from "fs";

const {ExifImage} = exif;

export async function probeVideo(videoPath) {
    let {streams, format} = await ffmpeg.ffprobe(videoPath);
    let video = streams.find(s => s.codec_type === 'video');
    let audio = streams.find(s => s.codec_type === 'audio');
    let width = video.width;
    let height = video.height;
    let duration = format.duration;
    let createDate = new Date(format.tags.creation_time);
    let [lat, lon] = format.tags.location.split('-').map(n => +(n.replace(/\//g, '')));
    let gps = {lat, lon, altitude: null};
    let size = format.size;
    let exifData = {
        ...format.tags,
        video,
        audio,
        ...format,
    };
    delete exifData.audio.disposition;
    delete exifData.audio.tags;
    delete exifData.video.disposition;
    delete exifData.video.tags;
    delete exifData.filename;
    delete exifData.tags;
    return {type: 'video', width, height, duration, size, createDate, gps, exif: exifData};
}

// probeVideo('./photos/vid.mp4');
// getExif('./photos/img.jpg')

export async function getExif(image) {
    return new Promise((resolve, reject) => {
        new ExifImage({image}, async (error, data) => {
            if (error)
                return reject(error);

            let lad = data.gps.GPSLatitude;
            let latString = `${lad[0]}°${lad.slice(1).join(`'`)}"${data.gps.GPSLatitudeRef}`;
            let lod = data.gps.GPSLongitude;
            let lonString = `${lod[0]}°${lod.slice(1).join(`'`)}"${data.gps.GPSLongitudeRef}`;
            let gps = parseDMS(`${latString} ${lonString}`);
            gps.altitude = data.gps.GPSAltitude;

            let {size} = await fs.promises.stat(image);

            let width = data.image.ImageWidth;
            let height = data.image.ImageHeight;
            let [date, time] = data.exif.CreateDate.split(' ');
            date = date.replace(/:/gi, '/');
            let createDate = new Date(`${date}, ${time}`);
            let exifData = {
                Make: data.image.Make,
                Model: data.image.Model,
                Orientation: data.image.Orientation,
                XResolution: data.image.XResolution,
                YResolution: data.image.YResolution,
                ResolutionUnit: data.image.ResolutionUnit,
                ...data.exif,
            }
            if (exifData.ExifVersion)
                exifData.ExifVersion = exifData.ExifVersion.toString()
            if (exifData.FlashpixVersion)
                exifData.FlashpixVersion = exifData.FlashpixVersion.toString()
            if (exifData.ComponentsConfiguration)
                exifData.ComponentsConfiguration = Array.from(exifData.ComponentsConfiguration);
            let res = {type: 'image', width, height, size, createDate, gps, exif: exifData};
            resolve(res);
        });
    });
}
