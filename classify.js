import * as tf from '@tensorflow/tfjs-node'
import fs from 'fs'
import {EOL} from "os";
import iMaxN from './iMaxN.js';

export default async function classifier(imagePath, nLabels = 3){
    let labels = await fs.promises.readFile('./classifier/labels.txt').then(f => f.toString().split(EOL));
    let imageBuffer = await fs.promises.readFile(imagePath);
    let image = tf.node.decodeImage(imageBuffer);
    const targetSize = [299, 299];
    let resizedImage = tf.image.resizeBilinear(image, targetSize);
    let reshapedImage = tf.reshape(resizedImage, [-1, ...targetSize, 3]);
    let normalizedImage = reshapedImage.div(tf.scalar(255));

    // https://tfhub.dev/google/imagenet/inception_resnet_v2/classification/5
    const model = await tf.loadGraphModel('file:///Users/Ruurd/WebstormProjects/transcoder/classifier/inceptionresnet/classifier.json');

    let result = model.predict(normalizedImage, {batchSize: 1, verbose: true});
    let predicted = await result.array().then(d => d[0]);
    let maxIndices = iMaxN(predicted, nLabels);

    let resultObj = {};
    for (let i of maxIndices)
        resultObj[labels[i]] = predicted[i];
    return resultObj;
}
