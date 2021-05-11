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

let syn = await wordnet.getAsync(2123045, 'n');
console.log(syn);
let syns = [];
while (true) {
    syns.push(syn);
    let parent = syn.ptrs.find(p => p.pointerSymbol === '@');
    if (!parent)
        break;
    syn = await wordnet.getAsync(parent.synsetOffset, parent.pos);
}
console.log(syns)
