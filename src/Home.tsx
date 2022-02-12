import { WalletDisconnectButton, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet, useConnection, useAnchorWallet, AnchorWallet } from '@solana/wallet-adapter-react';
import { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { LoadingContext } from './LoadingState';
import determineCarType from './utils/determineCarType';

import './carwash.css';

//@ts-ignore
import bwLogo from './images/bw_logo.png';
//@ts-ignore
import LoadingOverlay from './LoadingOverlay';

type NFTMeta = {
    name: string;
    symbol: string;
    description: string;
    image: string;
    attributes: { trait_type: string; value: string }[];
    mint: string;
};

const blockedAttr = [
    'Pitboss',
    'Douglas Degen',
    'Bean',
    'BigBrain',
    'Puzz',
    'Custom',
    'Rageki',
    'Devonair',
    'Gecko',
    'PonyBoy',
    'Silver',
    'Bronze',
    'Slow AF',
    'Nemov',
    'Rocketeer',

    'Teslerr Model J',
    'Toasty',
    'Kachow',
    'Souls',
    'Coug',
    'DatWank',
    'Legend',
    'Starbase',
    'Dexter',
];

const allowedModels = [
    'BW',
    'BWTSLR'
];


function shortenAddress(addr: string, digits: number) {
    return addr.slice(0, digits) + '.....' + addr.slice(-digits, addr.length);
}

export default function Home() {
    const { publicKey, sendTransaction, wallet } = useWallet();
    const anchor = useAnchorWallet();
    const { connection } = useConnection();

    const [successTxn, setSuccessTxn] = useState(false);

    const [highProcessing, setHighProcessing] = useContext(LoadingContext);

    const sendTxn = async (to: string) => {
        const txn = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: anchor.publicKey,
                lamports: 0.001 * LAMPORTS_PER_SOL,
                toPubkey: new PublicKey(to),
            })
        );
        const sig = await sendTransaction(txn, connection);
        console.log(`Signature: ${sig}`);
        return sig;
    };

    useEffect(() => {
        if (highProcessing) {
            ReactDOM.render(<LoadingOverlay successTxn={successTxn} />, document.getElementById('overlay'));
        } else {
            ReactDOM.unmountComponentAtNode(document.getElementById('overlay'));
        }
        return (() => {
            ReactDOM.unmountComponentAtNode(document.getElementById('overlay'));
        })
    }, [highProcessing]);

    return (
        <div>
            {!anchor && (
                <nav>
                    <WalletMultiButton />
                    <img className='logoimg' src={bwLogo} />
                </nav>
            )}
            {anchor && (
                <div>
                    <nav>
                        <WalletDisconnectButton />
                        <h3>{shortenAddress(anchor.publicKey.toBase58(), 5)}</h3>
                        {/* <button
                            onClick={() => {
                                setHighProcessing(true);
                                setTimeout(() => setHighProcessing(false), 5000);
                            }}>
                            Load Up
                        </button> */}
                        <img className='logoimg' src={bwLogo} />
                    </nav>
                    <div className='container'>
                        <h1>Select a BitWhip to wash!</h1>
                    </div>
                    <NFTDisplay
                        payForWash={() => sendTxn('8ciei6XBAgjLHJjfRYSXducTWzzA5JLY9GajCzYBhLit')}
                        wallet={anchor}
                        processing={[highProcessing, setHighProcessing]}
                        successState={[successTxn, setSuccessTxn]}
                    />
                </div>
            )}
        </div>
    );
}

function NFTDisplay(props: {
    wallet: AnchorWallet;
    payForWash: Function;
    processing: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
    successState: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
}) {
    const filterNonCleaned = (metadataArray: Array<NFTMeta>) => {
        const cleanedInAttributes = (attrs: { trait_type: string; value: string }[]) => {
            for (const attr of attrs) {
                if (attr.trait_type === 'Washed' || blockedAttr.includes(attr.value)) {
                    return true;
                }
            }
            return false;
        };

        return metadataArray.filter(v => !cleanedInAttributes(v.attributes));
    };

    const filterDisallowedModels = (metadataArray: Array<NFTMeta>) => {
        return metadataArray.filter(v => allowedModels.includes(v.symbol));
    };

    const [nftData, setNFTData] = useState<Array<NFTMeta>>(undefined);
    const [successTxn, setSuccessTxn] = props.successState;

    useEffect(() => {
        const fetchMetadata = async () => {
            const metadata = await(
                await fetch(
                    `https://bitwhipsmintback.herokuapp.com/getallwhips?wallet=${props.wallet.publicKey.toBase58()}&includeTopLevel=true`,
                    {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                    }
                )
            ).json();
            setNFTData(metadata);
        };
        fetchMetadata();
    }, []);

    return (
        <div className='container'>
            {nftData && (
                <div className='nftContainer'>
                    {filterNonCleaned(filterDisallowedModels(nftData)).map((v, k) => (
                        <NFTImage
                            successSetter={setSuccessTxn}
                            payForWash={props.payForWash}
                            wallet={props.wallet}
                            nftMetadata={v}
                            key={k}
                        />
                    ))}
                </div>
            )}
            {!nftData && (
                <div className='nftContainer'>
                    <h1 style={{ color: 'white' }}>Loading...</h1>
                </div>
            )}
        </div>
    );
}

function NFTImage(props: { nftMetadata: NFTMeta; payForWash: Function; wallet: AnchorWallet, successSetter: React.Dispatch<React.SetStateAction<boolean>> }) {

    const [loading, setLoading] = useContext(LoadingContext);

    const submitNFTToWash = useCallback(async () => {

        setLoading(true);
        try {
            try {
                const pingres = await fetch('https://bitwhipsmintback.herokuapp.com/ping', { method: 'GET' });
            } catch {
                alert('The server did not respond. Please try again later!');
                return;
            }
            const sig = await props.payForWash();
            if (sig) {
                try {
                    const processRes = await fetch('https://bitwhipsmintback.herokuapp.com/processcarwash', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            signature: sig,
                            nft: props.nftMetadata,
                            type: determineCarType(props.nftMetadata.symbol),
                            fromWallet: props.wallet.publicKey.toBase58(),
                        }),
                    });
                    if (processRes.status == 200) {
                        props.successSetter(true);
                        setTimeout(() => window.location.reload(), 3000);
                    } else {
                        alert(
                            "Fatal error with the washing process. Notify Quellen immediately that you've received this error!"
                        );
                        alert('Refresh the page!');
                    }
                } catch {
                    alert('Fatal error with the washing process. Notify Quellen immediately that you\'ve received this error!');
                    alert('Refresh the page!');
                }
            }
        } catch (txnError) {
            console.log('User rejected txn');
            setLoading(false);
        }
    }, []);
    return (
        <div style={{ position: 'relative' }}>
            <img className='nftImage' src={props.nftMetadata.image} onClick={submitNFTToWash} />
            {/* <div className='washImageOverlay'>
                <img src={washme} />
            </div> */}
        </div>
    );
}
