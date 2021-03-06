export default function determineCarType(symbol: string) {
    switch (symbol) {
        case 'BW':
            return 'landevo';
        case 'BWTSLR':
            return 'teslerr';
        case 'TreeFiddy':
            return 'treefiddy';
        case 'BWGOJ':
            return 'gojira';
        default:
            throw new Error(`This NFT (Symbol: ${symbol}) is not supposed to be in the displayed list!`);
    }
}