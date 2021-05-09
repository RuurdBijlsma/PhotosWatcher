import geocoder from "local-reverse-geocoder";

async function init() {
    return new Promise(resolve => {
        geocoder.init(
            {
                load: {
                    admin1: true,
                    admin2: true,
                    admin3And4: true,
                    alternateNames: false,
                },
            }, resolve);
    })
}

let ready = init();

export default async function geocode(points = [{latitude: 53, longitude: 5}]) {
    await ready;

    return new Promise((resolve, reject) => {
        const maxResults = 1;
        geocoder.lookUp(points, maxResults, (err, res) => {
            if (err)
                return reject();
            resolve(res);
        });
    })
}
