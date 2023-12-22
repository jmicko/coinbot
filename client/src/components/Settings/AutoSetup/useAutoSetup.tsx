import { useState, useEffect, useRef } from 'react';
import { AutoSetupOptions, AutoSetupOrderParams, AutoSetupResult, Order, OrderParams, User } from '../../../types';
import { useUser } from '../../../contexts/useUser';
import { useData } from '../../../contexts/useData';

function useAutoSetup(user: User, currentPrice: number, pqd: number) {
  const { productID, currentProduct } = useData();
  const resultStillValid = useRef(true);
  resultStillValid.current = true;

  const [options, setOptions] = useState<AutoSetupOptions>({
    product: currentProduct,
    startingValue: Number(((currentPrice) / 2).toFixed(pqd)),
    skipFirst: false,
    endingValue: Number(((currentPrice) * 1.5).toFixed(pqd)),
    ignoreFunds: false,
    increment: 0.5,
    incrementType: 'percentage',
    size: 10,
    maxSize: 20,
    sizeType: 'quote',
    sizeCurve: 'linear',
    steepness: 100,
    tradePairRatio: 5,
    // availableQuote: Number(user.availableFunds?.[productID]?.quote_available),
  });

  const [result, setResult] = useState<AutoSetupResult>(null);
  const [calculating, setCalculating] = useState(false);
  const [recentInput, setRecentInput] = useState(false);
  const availableQuote = Number(user.availableFunds?.[productID]?.quote_available)

  const setResultIfValid = (result: AutoSetupResult) => {
    if (resultStillValid.current) {
      setResult(result)
    } else {
      console.log('result is no longer valid');
    }
  }

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    setRecentInput(true);
    function autoSetup() {
      setCalculating(true);

      // console.log(user,'< user', options, '<options', 'autoSetup running');


      const orderList: AutoSetupOrderParams[] = [];
      // const options = { ...options };
      const {
        size,
        startingValue,
        endingValue,
        increment,
        incrementType,
        tradePairRatio,
        skipFirst,
        sizeType,
        sizeCurve,
        maxSize,
        steepness,
        product,
        ignoreFunds,
      } = options;

      // starting values for the big loop
      // let availableFunds = options.availableQuote;
      let cost = Number(options.startingValue);
      let availableFunds = Number(availableQuote);
      let buyPrice = Number(startingValue);
      let quoteToReserve = 0;
      let btcToBuy = 0;
      let buyCount = 0;
      let sellCount = 0;
      const loopDirection = (Number(endingValue) - Number(startingValue) < 0) ? "down" : "up";



      if ((Number(startingValue) === 0 && !skipFirst) ||
        Number(startingValue) <= 0 ||
        // startingValue === null ||
        // startingValue === undefined ||
        (Number(startingValue) === 0 && incrementType === 'percentage') ||
        (endingValue <= startingValue && loopDirection === "up") ||
        size <= 0 ||
        increment <= 0 ||
        tradePairRatio <= 0 ||
        steepness <= 0 ||
        maxSize <= 0 ||
        currentPrice <= 0) {
        setResultIfValid(null);
        setCalculating(false);
        return;
      }

      let stop = false;

      for (let i = 0; (!stop && i < 1000); i++) {
        if (i === 0 && skipFirst) {
          incrementBuyPrice();
          stopChecker();
          if (stop) {
            setResultIfValid(null);
            setCalculating(false);
            return;
          }
        }

        const side = (buyPrice > currentPrice)
          ? 'SELL'
          : 'BUY'

        const actualSize = getActualSize();

        if (!ignoreFunds && ((actualSize * buyPrice) > availableFunds)) {
          console.log('ran out of funds!', availableFunds);
          stop = true;
          continue;
        }

        // count up how much base currency will need to be purchased to reserve for all the sell orders
        if (side === 'SELL') {
          // devLog(actualSize, 'actualSize', (actualSize * product.base_inverse_increment));
          // okay why does this multiply by product.base_inverse_increment??
          // because later on, the actualSize is divided by product.base_inverse_increment before returning it
          // was this originally a rounding thing the just got lost in the loop?
          btcToBuy += (actualSize * product.base_inverse_increment)
          console.log(product.base_inverse_increment, '< product.base_inverse_increment');

        }

        // THIS IS NOT OLD CODE FROM WHEN BTC-USD WAS THE ONLY PRODUCT. 
        // Using 100 here because the trade_pair_ratio is a percentage. 
        // const original_sell_price = (Math.round((buyPrice * (Number(tradePairRatio) + 100))) / 100);

        // that equation is wrong. It should be:\

        const original_sell_price = Number((buyPrice * (Number(tradePairRatio) + 100) / 100).toFixed(pqd))

        // console.log( (buyPrice * (Number(tradePairRatio) + 100) / 100).toFixed(pqd), '< test');

        // console.log('buyPrice', buyPrice, 'tradePairRatio', tradePairRatio, 'original_sell_price', original_sell_price);

        /////// CREATE VALUES FOR AN ORDER ///////

        const singleOrder: AutoSetupOrderParams = {
          side: side,
          original_sell_price: Number(original_sell_price),
          // get buy price rounded to cents the precision of the quote currency
          original_buy_price: Number(buyPrice.toFixed(pqd)),
          base_size: actualSize,
          buy_quote_size: Number((actualSize * buyPrice).toFixed(pqd)),
          sell_quote_size: Number((actualSize * original_sell_price).toFixed(pqd)),
          limit_price: (side === 'SELL') ? original_sell_price : buyPrice,
          trade_pair_ratio: tradePairRatio,
        };

        if (singleOrder.base_size && singleOrder.base_size <= 0
          || singleOrder.limit_price && singleOrder.limit_price <= 0
          || singleOrder.buy_quote_size <= 0
          || singleOrder.sell_quote_size <= 0
        ) {
          stop = true;
          continue;
        }

        orderList.push(singleOrder);

        side === 'BUY'
          ? buyCount++
          : sellCount++;

        ////////////////////////////
        // SETUP FOR NEXT LOOP - do some math to figure out next iteration, and if we should keep looping
        ////////////////////////////

        // subtract the buy size USD from the available funds
        // if sizeType is base, then we need to convert
        if (sizeType === 'base') {
          // let USDSize = size * buyPrice;
          // need to convert to USD. If is a buy, use the buy price, if a sell, use the trading price because that is what the bot will use
          const conversionPrice = (side === 'BUY')
            ? buyPrice
            : currentPrice;

          const USDSize = size * conversionPrice;
          availableFunds -= USDSize;
          cost += USDSize;
          // buy orders need to add quote value to quoteToReserve
          side === 'BUY' && (quoteToReserve += USDSize);
        } else {
          let quoteSize = size;
          // if it is a sell, need to convert from quote to base size based on the buy price
          // then get the cost of the base size at the trading price,
          // then get the cost of the quote at the current price
          if (side === 'SELL') {
            // convert to base size
            const baseSize = quoteSize / buyPrice;
            // convert to USD
            const USDSize = baseSize * currentPrice;
            // devLog('USD size', USDSize);
            quoteSize = USDSize;
            // devLog(quoteSize, 'quote size actual cost SELLING');
          } else {
            // buy orders need to add quote value to quoteToReserve
            quoteToReserve += quoteSize;
          }

          availableFunds -= quoteSize;
          cost += quoteSize;
        }

        // increment the buy price
        incrementBuyPrice();

        stopChecker();

      }




      setResultIfValid({
        valid: true,
        cost: cost,
        orderList: orderList,
        lastBuyPrice: orderList[orderList.length - 1]?.original_buy_price || 0,
        btcToBuy: (btcToBuy / product.base_inverse_increment),
        options: options,
        quoteToReserve: quoteToReserve,
        buyCount: buyCount,
        sellCount: sellCount,
      });
      setCalculating(false);
      setRecentInput(false)


      function stopChecker() {
        const USDSize = size * buyPrice;
        // calc next round funds
        const nextFunds = (sizeType === 'base')
          ? availableFunds - USDSize
          : availableFunds - size
        // devLog(((availableFunds - nextFunds) < 0) && !options.ignoreFunds, nextFunds, 'next funds', availableFunds, !options.ignoreFunds);
        if (((nextFunds) < 0) && !ignoreFunds) {
          console.log('ran out of funds!', availableFunds);
          stop = true;
        }
        // devLog('available funds is', availableFunds);
        // stop if the buy price passes the ending value
        if (loopDirection === 'up' && buyPrice > endingValue) {
          stop = true;
        } else if (loopDirection === 'down' && buyPrice < endingValue) {
          stop = true;
        } else if (loopDirection === 'down' && buyPrice <= 0) {
          stop = true;
        }
      }

      function incrementBuyPrice() {
        // can have either percentage or dollar amount increment
        if (incrementType === 'dollars') {
          // if incrementing by dollar amount
          (loopDirection === 'up')
            ? buyPrice += Number(increment)
            : buyPrice -= Number(increment);
        } else {
          // if incrementing by percentage
          (loopDirection === 'up')
            // the hardcoded 100 is because the increment is a percentage, not old code
            ? buyPrice = buyPrice * (1 + (increment / 100))
            : buyPrice = buyPrice / (1 + (increment / 100));
        }
      }

      function getActualSize() {
        // if the increment type is percentage, convert it to a number
        // this is the same as the increment in the bellCurve, which is a dollar amount
        const newIncrement = incrementType === 'percentage'
          ? increment * buyPrice
          : increment

        // if sizeCurve is curve, use the bellCurve
        const newSize = (sizeCurve === 'curve')
          ? (maxSize - size) / (1 + (1 / (steepness * 10 * newIncrement)) * (buyPrice - currentPrice) ** 2) + size
          : size;

        if (sizeType === 'quote') {
          // if the size is in quote, convert it to base
          // use floor rounding because we can't ever round up or we risk overspending
          const bii = product.base_inverse_increment;
          const convertedToBase
            = Number(Math.floor((newSize / buyPrice) * bii)) / bii
          // devLog(convertedToBase, 'convertedToBase', buyPrice, 'buyPrice', product.base_inverse_increment, 'product.base_inverse_increment');
          return convertedToBase
        } else {
          // if the size is in base, it will not change. 
          return newSize
        }
      }
    }

    // Start a new timeout
    timeoutId = setTimeout(() => {
      autoSetup();
    }, 500); // 500ms delay

    return () => {
      console.log(resultStillValid.current, 'autoSetup cleanup');
      resultStillValid.current = false
      console.log(resultStillValid.current, 'autoSetup cleanup');
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [user, options, currentPrice]); // Re-run autoSetup whenever user or options change

  return { result, options, setOptions, calculating, recentInput, availableQuote };
}

export default useAutoSetup;