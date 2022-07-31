import axios from "axios";
import assetList from "./asset.json";
import fs from 'fs';


let tokensArr: Array<Token> = [];
let tokenSet: Set<string> = new Set<string>;
let poolsArr: Array<BalancerPool> = [];
let cosmoJson={};

interface Token {
  address: string;
  decimal: number;
  symbol: string;
  name: string;
  paused: boolean;
}

function convertDeciToHex(num: string) {
  return "0x" + parseInt(num).toString(16);
}
for (let asset of assetList.assets) {
    tokenSet.add(asset.base);
  tokensArr.push({
    address: asset.base,
    decimal: asset.denom_units[0].exponent,
    symbol: asset.symbol,
    name: asset.display,
    paused: false,
  });
}

console.log(tokensArr);

const instance = axios.create({
  baseURL: "https://lcd.osmosis.zone",
});

interface Pool {
  type: string;
  dex_id: string;
  address: string;
  fee: Array<string>;
}

interface BalancerPool extends Pool {
  tokens: Array<string>;
  balances: Array<string>;
  weights: Array<string>;
}

interface SolidlyPool extends Pool {
  token_a: string;
  token_b: string;
  balance_a: number;
  balance_b: number;
  decimals_a: number;
  decimals_b: number;
}

(async () => {
  const result = await instance.get("/osmosis/gamm/v1beta1/pools", {
    params: {
      "pagination.limit": 70,
      "pagination.count_total": true,
    },
  });

  let feeDeno = 100000;
  for (let pool of result.data.pools) {
    let tokens: Array<string> = [];
    let balances: Array<string> = [];
    let weights: Array<string> = [];
    let feeNumer = convertDeciToHex(
      Math.floor(parseFloat(pool.poolParams.swapFee) * feeDeno).toString()
    );
    let fee: Array<string> = [feeNumer, convertDeciToHex(feeDeno.toString())];

    let contain = true;
    for (let tokWithWeight of pool.poolAssets) {
      if (!tokenSet.has(tokWithWeight.token.denom) ){
        contain=false;
      } 
      tokens.push(tokWithWeight.token.denom);
      balances.push(convertDeciToHex(tokWithWeight.token.amount));
      weights.push(convertDeciToHex(tokWithWeight.weight));
    }
    if(!contain){
        continue;
    }

    poolsArr.push({
      type: "Balancer",
      dex_id: "OsmosisBalancer",
      address: pool.address,
      tokens,
      balances,
      weights,
      fee,
    });
  }

  cosmoJson['tokens']=tokensArr;
  cosmoJson['pools']=poolsArr;
  fs.writeFile('./cosmos_snapshot.json', JSON.stringify(cosmoJson),function(err) {
    if (err) throw err;
    console.log('complete');
    });
})();
