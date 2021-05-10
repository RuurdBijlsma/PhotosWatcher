import exif from "exif";
import parseDMS from "parse-dms";
import ffmpeg from './promise-ffmpeg.js'
import fs from "fs";
import geocode from "./reverse-geocode.js";

const {ExifImage} = exif;

export async function probeVideo(videoPath) {
    let {streams, format} = await ffmpeg.ffprobe(videoPath);
    let video = streams.find(s => s.codec_type === 'video');
    let audio = streams.find(s => s.codec_type === 'audio');
    let width = video.width;
    let height = video.height;
    let duration = format.duration;
    let createDate = new Date(format.tags.creation_time);
    let gps = null;
    if (format.tags.location !== undefined) {
        let [[lat], [lon]] = format.tags.location.matchAll(/[+-]\d+\.\d+/g)
        lat = +lat;
        lon = +lon;
        gps = {lat, lon, altitude: null};
        let geocodeData = await geocode({
            latitude: gps.lat,
            longitude: gps.lon
        });
        gps = {...gps, ...geocodeData};
    }
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

// probeVideo('./photos/home.mp4');
// getExif('./photos/img.jpg')

export async function getExif(image) {
    return new Promise((resolve, reject) => {
        new ExifImage({image}, async (error, data) => {
            if (error)
                return reject(error);

            let gps = null;
            if (data.gps.GPSLatitude && data.gps.GPSLongitude) {
                let lad = data.gps.GPSLatitude;
                let latString = `${lad[0]}°${lad.slice(1).join(`'`)}"${data.gps.GPSLatitudeRef}`;
                let lod = data.gps.GPSLongitude;
                let lonString = `${lod[0]}°${lod.slice(1).join(`'`)}"${data.gps.GPSLongitudeRef}`;
                gps = parseDMS(`${latString} ${lonString}`);
                gps.altitude = data.gps.GPSAltitude;
                let geocodeData = await geocode({
                    latitude: gps.lat,
                    longitude: gps.lon
                });
                gps = {...gps, ...geocodeData};
            }

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
            if (exifData.UserComment)
                exifData.UserComment = exifData.UserComment.toString()
            if (exifData.MakerNote)
                exifData.MakerNote = exifData.MakerNote.toString()

            resolve({type: 'image', width, height, size, createDate, gps, exif: exifData});
        });
    });
}
