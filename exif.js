import exif from "exif";
import parseDMS from "parse-dms";
import ffmpeg from './promise-ffmpeg.js'

const {ExifImage} = exif;

export async function probeVideo(video) {
    let result = await ffmpeg.ffprobe(video);
    console.log();
}

probeVideo('out4k.webm');

export async function getExif(image) {
    return new Promise((resolve, reject) => {
        new ExifImage({image}, (error, data) => {
            if (error)
                return reject(error);

            let lad = data.gps.GPSLatitude;
            let latString = `${lad[0]}°${lad.slice(1).join(`'`)}"${data.gps.GPSLatitudeRef}`;
            let lod = data.gps.GPSLongitude;
            let lonString = `${lod[0]}°${lod.slice(1).join(`'`)}"${data.gps.GPSLongitudeRef}`;
            let gps = parseDMS(`${latString} ${lonString}`);
            gps.altitude = data.gps.GPSAltitude;

            let width = data.image.ImageWidth;
            let height = data.image.ImageHeight;
            let [date, time] = data.image.ModifyDate.split(' ');
            date = date.replace(/:/gi, '/');
            let modifyDate = new Date(`${date}, ${time}`);
            let exif = {
                Make: data.image.Make,
                Model: data.image.Model,
                Orientation: data.image.Orientation,
                XResolution: data.image.XResolution,
                YResolution: data.image.YResolution,
                ResolutionUnit: data.image.ResolutionUnit,
                ...data.exif,
            }
            if (exif.ExifVersion)
                exif.ExifVersion = exif.ExifVersion.toString()
            if (exif.FlashpixVersion)
                exif.FlashpixVersion = exif.FlashpixVersion.toString()
            if (exif.ComponentsConfiguration)
                exif.ComponentsConfiguration = Array.from(exif.ComponentsConfiguration);
            let res = {width, height, modifyDate, gps, exif};
            resolve(res);
        });
    });
}
