export interface FairLaunchCoinMeta {
  id: string;
  coinPaprikaId?: string;
  utopiaExplorer?: boolean;
  logoUrl?: string;
  name: string;
  symbol: string;
  launchYear: number;
  consensusType: string;
  algorithm: string;
  whyFair: string;
  isFeatured: boolean;
  website?: string;
  explorer?: string;
  github?: string;
  stakingApy?: number | null;
  yieldType?: string | null;
}

export const FAIR_LAUNCH_COINS: FairLaunchCoinMeta[] = [
  {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    launchYear: 2009,
    consensusType: "PoW",
    algorithm: "SHA-256",
    website: "https://bitcoin.org",
    explorer: "https://blockstream.info",
    github: "https://github.com/bitcoin/bitcoin",
    whyFair:
      "Launched by Satoshi Nakamoto with no pre-mine. First blocks mined publicly from genesis. Zero team allocation or insider wallets.",
    isFeatured: false,
  },
  {
    id: "litecoin",
    name: "Litecoin",
    symbol: "LTC",
    launchYear: 2011,
    consensusType: "PoW",
    algorithm: "Scrypt",
    website: "https://litecoin.org",
    explorer: "https://blockchair.com/litecoin",
    github: "https://github.com/litecoin-project/litecoin",
    whyFair:
      "Announced publicly on Bitcointalk before launch. No pre-mine, Scrypt PoW, CPU-mineable at launch so anyone could participate from day one.",
    isFeatured: false,
  },
  {
    id: "monero",
    name: "Monero",
    symbol: "XMR",
    launchYear: 2014,
    consensusType: "PoW",
    algorithm: "RandomX",
    website: "https://getmonero.org",
    explorer: "https://xmrchain.net",
    github: "https://github.com/monero-project/monero",
    whyFair:
      "Launched as Bytecoin fork with no pre-mine. No dev tax, no insider allocations. Community-driven from day one, RandomX algorithm designed for CPU mining fairness.",
    isFeatured: false,
  },
  {
    id: "dogecoin",
    name: "Dogecoin",
    symbol: "DOGE",
    launchYear: 2013,
    consensusType: "PoW",
    algorithm: "Scrypt",
    website: "https://dogecoin.com",
    explorer: "https://dogechain.info",
    github: "https://github.com/dogecoin/dogecoin",
    whyFair:
      "Fair launch announced on Reddit. No pre-mine, open from day 1, Scrypt PoW. Originally a joke coin but never had insider allocations.",
    isFeatured: false,
  },
  {
    id: "kaspa",
    name: "Kaspa",
    symbol: "KAS",
    launchYear: 2021,
    consensusType: "PoW",
    algorithm: "kHeavyHash",
    website: "https://kaspa.org",
    explorer: "https://explorer.kaspa.org",
    github: "https://github.com/kaspanet/kaspad",
    whyFair:
      "Launched with no pre-mine, no ICO, no VC funding. Uses GHOSTDAG protocol, mineable from day one. Community-vetted as one of the cleanest modern fair launches.",
    isFeatured: false,
  },
  {
    id: "ravencoin",
    name: "Ravencoin",
    symbol: "RVN",
    launchYear: 2018,
    consensusType: "PoW",
    algorithm: "KAWPOW",
    website: "https://ravencoin.org",
    explorer: "https://ravencoin.network",
    github: "https://github.com/RavenProject/Ravencoin",
    whyFair:
      "Launched on January 3, 2018 (Bitcoin's birthday) with no ICO, no pre-mine, no founder reward. X16R algorithm for GPU mining fairness.",
    isFeatured: false,
  },
  {
    id: "zcash",
    name: "Zcash",
    symbol: "ZEC",
    launchYear: 2016,
    consensusType: "PoW",
    algorithm: "Equihash",
    website: "https://z.cash",
    explorer: "https://zcashblockexplorer.com",
    github: "https://github.com/zcash/zcash",
    whyFair:
      "Fair launch with publicly mined genesis block. Founders reward was transparent and time-limited (ended). Privacy-first PoW coin with no hidden supply.",
    isFeatured: false,
  },
  {
    id: "zencash",
    name: "Horizen",
    symbol: "ZEN",
    launchYear: 2017,
    consensusType: "PoW",
    algorithm: "Equihash",
    website: "https://horizen.io",
    explorer: "https://explorer.horizen.io",
    github: "https://github.com/HorizenOfficial/zen",
    whyFair:
      "Fair fork of Zcash in 2017 with no additional pre-mine or ICO. Community-driven from the split, treasury funded transparently by block rewards with public governance.",
    isFeatured: false,
    stakingApy: 3.5,
    yieldType: "Secure Node",
  },
  {
    id: "nano",
    name: "Nano",
    symbol: "XNO",
    launchYear: 2015,
    consensusType: "PoS",
    algorithm: "Open Representative Voting",
    website: "https://nano.org",
    explorer: "https://nanexplorer.com",
    github: "https://github.com/nanocurrency/nano-node",
    whyFair:
      "No pre-mine and no ICO. All supply was distributed freely via a public captcha faucet over four years, ensuring broad community ownership from day one.",
    isFeatured: false,
  },
  {
    id: "verge",
    name: "Verge",
    symbol: "XVG",
    launchYear: 2014,
    consensusType: "PoW",
    algorithm: "Multi-algo (5)",
    website: "https://vergecurrency.com",
    explorer: "https://verge-blockchain.info",
    github: "https://github.com/vergecurrency/verge",
    whyFair:
      "Launched as DogeCoin Dark in 2014 with no pre-mine. Five PoW algorithms for mining decentralization. Fully community-driven with no team wallet or insider allocation.",
    isFeatured: false,
  },
  {
    id: "pirate-chain",
    name: "Pirate Chain",
    symbol: "ARRR",
    launchYear: 2018,
    consensusType: "PoW",
    algorithm: "Equihash",
    website: "https://pirate.black",
    explorer: "https://explorer.pirate.black",
    github: "https://github.com/PirateNetwork/pirate",
    whyFair:
      "No pre-mine, no ICO, no dev fund. Launched as a privacy-first Equihash chain requiring shielded transactions by default. Entirely community-mined from genesis.",
    isFeatured: false,
  },
  {
    id: "grin",
    name: "Grin",
    symbol: "GRIN",
    launchYear: 2019,
    consensusType: "PoW",
    algorithm: "Cuckatoo32+",
    website: "https://grin.mw",
    explorer: "https://grinexplorer.net",
    github: "https://github.com/mimblewimble/grin",
    whyFair:
      "No pre-mine, no ICO, no dev allocation. MimbleWimble protocol implementation launched anonymously. Purely community-funded and mined from genesis.",
    isFeatured: false,
  },
  {
    id: "vertcoin",
    name: "Vertcoin",
    symbol: "VTC",
    launchYear: 2014,
    consensusType: "PoW",
    algorithm: "Lyra2REv3",
    website: "https://vertcoin.org",
    explorer: "https://insight.vertcoin.org",
    github: "https://github.com/vertcoin-project/vertcoin-core",
    whyFair:
      "No pre-mine, Lyra2RE ASIC-resistant algorithm specifically designed to keep mining decentralized and accessible to regular GPU miners.",
    isFeatured: false,
  },
  {
    id: "zelcash",
    name: "Flux",
    symbol: "FLUX",
    launchYear: 2018,
    consensusType: "PoW",
    algorithm: "ZelHash",
    website: "https://runonflux.io",
    explorer: "https://explorer.runonflux.io",
    github: "https://github.com/RunOnFlux/flux",
    whyFair:
      "Launched as ZelCash with no pre-mine, PoW mined. Equihash algorithm, community-built decentralized infrastructure network from day one.",
    isFeatured: false,
    stakingApy: 25,
    yieldType: "Node Operator",
  },
  {
    id: "ergo",
    name: "Ergo",
    symbol: "ERG",
    launchYear: 2019,
    consensusType: "PoW",
    algorithm: "Autolykos v2",
    website: "https://ergoplatform.org",
    explorer: "https://explorer.ergoplatform.com",
    github: "https://github.com/ergoplatform/ergo",
    whyFair:
      "No ICO, no pre-mine, no VC allocation. Autolykos PoW algorithm, ASIC-resistant and designed for GPU miners. Smart contract platform launched fair.",
    isFeatured: false,
  },
  {
    id: "beam",
    name: "Beam",
    symbol: "BEAM",
    launchYear: 2019,
    consensusType: "PoW",
    algorithm: "BeamHash III",
    website: "https://beam.mw",
    explorer: "https://explorer.beam.mw",
    github: "https://github.com/BeamMW/beam",
    whyFair:
      "MimbleWimble privacy coin with transparent treasury (capped at 20% of block rewards for 5 years). Publicly announced before launch, no hidden pre-mine.",
    isFeatured: false,
  },
  {
    id: "digibyte",
    name: "DigiByte",
    symbol: "DGB",
    launchYear: 2014,
    consensusType: "PoW",
    algorithm: "Multi-algo (5)",
    website: "https://digibyte.org",
    explorer: "https://digiexplorer.info",
    github: "https://github.com/digibyte-core/digibyte",
    whyFair:
      "No pre-mine, no ICO. Five merged-mining algorithms for maximum decentralization. Among the longest-running fair-launch PoW chains.",
    isFeatured: false,
  },
  {
    id: "feathercoin",
    name: "Feathercoin",
    symbol: "FTC",
    launchYear: 2013,
    consensusType: "PoW",
    algorithm: "NeoScrypt",
    website: "https://feathercoin.com",
    explorer: "https://explorer.feathercoin.com",
    github: "https://github.com/FeatherCoin/Feathercoin",
    whyFair:
      "Litecoin-based fork with no pre-mine. NeoScrypt algorithm, publicly announced launch. One of the earliest altcoins with a genuinely clean launch.",
    isFeatured: false,
  },
  {
    id: "groestlcoin",
    name: "Groestlcoin",
    symbol: "GRS",
    launchYear: 2014,
    consensusType: "PoW",
    algorithm: "Groestl",
    website: "https://groestlcoin.org",
    explorer: "https://groestlsight.groestlcoin.org",
    github: "https://github.com/Groestlcoin/Groestlcoin",
    whyFair:
      "No pre-mine, no ICO. Groestl algorithm from day 1, announced on Bitcointalk. Privacy-optional SegWit-adopting chain with a clean fair-launch history.",
    isFeatured: false,
  },
  {
    id: "namecoin",
    name: "Namecoin",
    symbol: "NMC",
    launchYear: 2011,
    consensusType: "PoW",
    algorithm: "SHA-256",
    website: "https://namecoin.org",
    explorer: "https://namecha.in",
    github: "https://github.com/namecoin/namecoin-core",
    whyFair:
      "First Bitcoin fork, no pre-mine. Launched as decentralized DNS replacement. One of the original Bitcoin-era fair-launch experiments still running.",
    isFeatured: false,
  },
  {
    id: "peercoin",
    name: "Peercoin",
    symbol: "PPC",
    launchYear: 2012,
    consensusType: "PoS",
    algorithm: "SHA-256 / PoS",
    website: "https://peercoin.net",
    explorer: "https://blockbook.peercoin.net",
    github: "https://github.com/peercoin/peercoin",
    whyFair:
      "First proof-of-stake coin, mined from genesis with PoW distribution then transitioning to PoS. No pre-mine, the original energy-efficient alternative.",
    isFeatured: false,
    stakingApy: 1,
    yieldType: "PoS Minting",
  },
  {
    id: "zcoin",
    name: "Firo",
    symbol: "FIRO",
    launchYear: 2016,
    consensusType: "PoW",
    algorithm: "FiroPoW",
    website: "https://firo.org",
    explorer: "https://explorer.firo.org",
    github: "https://github.com/firoproject/firo",
    whyFair:
      "Originally Zcoin, launched with no pre-mine and transparent founder reward structure (limited to 6% for development, publicly disclosed). Privacy-focused PoW.",
    isFeatured: false,
  },
  {
    id: "syscoin",
    name: "Syscoin",
    symbol: "SYS",
    launchYear: 2014,
    consensusType: "PoW",
    algorithm: "SHA-256",
    website: "https://syscoin.org",
    explorer: "https://blockbook.syscoin.org",
    github: "https://github.com/syscoin/syscoin",
    whyFair:
      "No pre-mine ICO-free launch. SHA-256 merge-mined with Bitcoin. Community-developed asset platform built on a fair foundation from genesis.",
    isFeatured: false,
  },
  {
    id: "handshake",
    name: "Handshake",
    symbol: "HNS",
    launchYear: 2020,
    consensusType: "PoW",
    algorithm: "Blake2b+SHA3",
    website: "https://handshake.org",
    explorer: "https://hnsnetwork.com",
    github: "https://github.com/handshake-org/hsd",
    whyFair:
      "No ICO, no pre-mine for insiders. 70% of total supply airdropped to open-source developers and the FOSS community. Remaining 30% mined via PoW from genesis.",
    isFeatured: false,
  },
  {
    id: "signum",
    name: "Signum",
    symbol: "SIGNA",
    launchYear: 2014,
    consensusType: "PoC",
    algorithm: "Proof of Capacity",
    website: "https://signum.network",
    explorer: "https://explorer.signum.network",
    github: "https://github.com/signum-network/signum-node",
    whyFair:
      "Launched as Burst in 2014 with no pre-mine and no ICO. Uses Proof of Capacity (hard-drive mining) for broad participation. Community rebranded to Signum; no insiders.",
    isFeatured: false,
    stakingApy: 5,
    yieldType: "Forging",
  },
  {
    id: "crp-crypton",
    coinPaprikaId: "crp-crypton",
    utopiaExplorer: true,
    logoUrl: "/crp-logo.png",
    name: "Crypton",
    symbol: "CRP",
    launchYear: 2019,
    consensusType: "PoW/PoS",
    algorithm: "PoW + PoS Hybrid",
    website: "https://u.is/en/",
    explorer: "https://utopian.is",
    whyFair:
      "Launched inside the Utopia P2P ecosystem with no pre-mine, limited and stable emissions from block 1. Privacy-focused, community-mined from genesis with zero insider allocation.",
    isFeatured: true,
    stakingApy: 1,
    yieldType: "PoS Staking",
  },
];

export const COINGECKO_IDS = FAIR_LAUNCH_COINS
  .filter((c) => !c.coinPaprikaId)
  .map((c) => c.id)
  .join(",");

export const COINPAPRIKA_COINS = FAIR_LAUNCH_COINS.filter(
  (c) => c.coinPaprikaId != null,
);
