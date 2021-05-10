import WordNet from 'node-wordnet'

const wordnet = new WordNet();

// let res = await wordnet.findSenseAsync('tabby#a#1');
// console.log(res)

// let result = await wordnet.lookupAsync('background');
// console.log(result);
//
// let ss = 'n01440764';
// let syn = await wordnet.getAsync(+ss.substr(1), ss.substring(0, 1));
// console.log(syn);

let syn = await wordnet.getAsync(1529491, 'v');
console.log(syn);
