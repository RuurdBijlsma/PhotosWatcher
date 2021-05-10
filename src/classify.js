import * as tf from '@tensorflow/tfjs-node'
import fs from 'fs'
import {EOL} from "os";
import iMaxN from './iMaxN.js';
import WordNet from 'node-wordnet'
import path from "path";

const wordnet = new WordNet();
let model, labels, syns;

async function initClassifier() {
    labels = await fs.promises.readFile('./classifier/labels.txt').then(f => f.toString().split(EOL));
    syns = await fs.promises.readFile('./classifier/syns.txt').then(f => f.toString().split(EOL));

    // https://tfhub.dev/google/imagenet/inception_resnet_v2/classification/5
    let modelPath = path.resolve('./classifier/inceptionresnet/model.json');
    if (process.platform === 'win32')
        modelPath = modelPath.substr(3);
    model = await tf.loadGraphModel(`file:///${modelPath}`);
}

const ready = initClassifier();

export default async function classify(imagePath, nLabels = 3) {
    await ready;

    let imageBuffer = await fs.promises.readFile(imagePath);
    let image = tf.node.decodeImage(imageBuffer);
    const targetSize = [299, 299];
    let resizedImage = tf.image.resizeBilinear(image, targetSize);
    let reshapedImage = tf.reshape(resizedImage, [-1, ...targetSize, 3]);
    let normalizedImage = reshapedImage.div(tf.scalar(255));

    let result = model.predict(normalizedImage, {batchSize: 1});
    let predicted = await result.array().then(d => d[0]);
    let maxIndices = iMaxN(predicted, nLabels);

    let resultArr = [];
    for (let i of maxIndices)
        resultArr.push({
            logits: predicted[i],
            word: await getLabelWord(i),
        })
    return resultArr.sort((a, b) => b.logits - a.logits)
}

async function getLabelWord(idx) {
    try {
        let ss = syns[idx];
        let word = await wordnet.getAsync(+ss.substr(1), ss.substring(0, 1));
        return {
            names: [...new Set([...word.synonyms, word.lemma])],
            synset: ss,
            glossary: word.gloss.trim(),
        };
    } catch (e) {
        return {names: [labels[idx]], synset: null, glossary: ''};
    }
}

// classify('./photos/IMG_20200731_203422.jpg').then(c => {
//     console.log(c);
// })
