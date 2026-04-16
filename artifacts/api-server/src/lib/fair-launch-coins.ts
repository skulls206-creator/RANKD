export interface FairLaunchCoinMeta {
  id: string;
  coinPaprikaId?: string;
  utopiaExplorer?: boolean;
  name: string;
  symbol: string;
  launchYear: number;
  consensusType: string;
  whyFair: string;
  isFeatured: boolean;
}

export const FAIR_LAUNCH_COINS: FairLaunchCoinMeta[] = [
  {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    launchYear: 2009,
    consensusType: "PoW",
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
    whyFair:
      "Fair launch with publicly mined genesis block. Founders reward was transparent and time-limited (ended). Privacy-first PoW coin with no hidden supply.",
    isFeatured: false,
  },
  {
    id: "grin",
    name: "Grin",
    symbol: "GRIN",
    launchYear: 2019,
    consensusType: "PoW",
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
    whyFair:
      "Launched as ZelCash with no pre-mine, PoW mined. Equihash algorithm, community-built decentralized infrastructure network from day one.",
    isFeatured: false,
  },
  {
    id: "ergo",
    name: "Ergo",
    symbol: "ERG",
    launchYear: 2019,
    consensusType: "PoW",
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
    whyFair:
      "First proof-of-stake coin, mined from genesis with PoW distribution then transitioning to PoS. No pre-mine, the original energy-efficient alternative.",
    isFeatured: false,
  },
  {
    id: "zcoin",
    name: "Firo",
    symbol: "FIRO",
    launchYear: 2016,
    consensusType: "PoW",
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
    whyFair:
      "No pre-mine ICO-free launch. SHA-256 merge-mined with Bitcoin. Community-developed asset platform built on a fair foundation from genesis.",
    isFeatured: false,
  },
  {
    id: "crp-crypton",
    coinPaprikaId: "crp-crypton",
    utopiaExplorer: true,
    name: "Crypton",
    symbol: "CRP",
    launchYear: 2019,
    consensusType: "PoW/PoS",
    whyFair:
      "Launched inside the Utopia P2P ecosystem with no pre-mine, limited and stable emissions from block 1. Privacy-focused, community-mined from genesis with zero insider allocation.",
    isFeatured: true,
  },
];

export const COINGECKO_IDS = FAIR_LAUNCH_COINS
  .filter((c) => !c.coinPaprikaId)
  .map((c) => c.id)
  .join(",");

export const COINPAPRIKA_COINS = FAIR_LAUNCH_COINS.filter(
  (c) => c.coinPaprikaId != null,
);
