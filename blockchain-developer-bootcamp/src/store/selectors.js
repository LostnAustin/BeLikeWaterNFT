import { get, reject, groupBy, maxBy, minBy } from 'lodash'
import moment from 'moment'
import { createSelector } from 'reselect'
import { ETHER_ADDRESS, tokens, ether, GREEN, RED } from '../helpers'



const account = state => get(state, 'web3.account')
export const accountSelector = createSelector(account, a => a)

const web3 = state => get(state, 'web3.connection')
export const web3Selector = createSelector(web3, w => w)

const tokenLoaded = state => get(state, 'token.loaded', false)
export const tokenLoadedSelector = createSelector(account, tl => tl)

const exchangeLoaded = state => get(state, 'exchange.loaded', false)
export const exchangeLoadedSelector = createSelector(account, el => el)

const exchange = state => get(state, 'exchange.contract')
export const exchangeSelector = createSelector(exchange, e => e)

export const contractsLoadedSelector = createSelector(
    tokenLoaded,
    exchangeLoaded,
    (tl, el) => (tl && el)
  )

// all orders
const allOrdersLoaded = state => get(state, 'exchange.allOrders.loaded', false)
const allOrders = state => get(state, 'exchange.allOrders.data', [])

// Cancelled orders
const cancelledOrdersLoaded = state => get(state, 'exchange.cancelledOrders.loaded', false)
export const cancelledOrdersLoadedSelector = createSelector(cancelledOrdersLoaded, loaded => loaded)

const cancelledOrders = state => get(state, 'exchange.cancelledOrders.data', [])
export const cancelledOrdersSelector = createSelector(cancelledOrders, o => o)


const filledOrdersLoaded = state => get(state, 'exchange.filledOrders.loaded', false)
export const filledOrdersLoadedSelector = createSelector(filledOrdersLoaded, loaded => loaded)


const filledOrders = state => get(state, 'exchange.filledOrders.data', [])
export const filledOrdersSelector = createSelector(
  filledOrders,
  (orders) =>
    {
      // sort orders by ascending
      orders = orders.sort((a, b) => a.timestamp - b.timestamp)
      
      //decorate orders
      orders = decorateFilledOrders(orders)


      //sort orders in descending order
      orders = orders.sort((a, b) => b.timestamp - a.timestamp)
    return orders
    }
)

const decorateFilledOrders = (orders) => {
  let previousOrder = orders[0]
  
  return(
    orders.map((order) => {
     order = decorateOrder(order)
     order = decorateFilledOrder(order, previousOrder)
     previousOrder = order //updates the previous order after it is decorated
     return order

    })
  )  
}

const decorateOrder = (order) => {
  // return order
  let etherAmount
  let tokenAmount
 
  if(order.tokenGive === ETHER_ADDRESS) {
    etherAmount = order.amountGive
    tokenAmount = order.amountGet

  } else {
    etherAmount = order.amountGet
    tokenAmount = order.amountGive
  }

  const precision = 100000
  let tokenPrice = (etherAmount / tokenAmount)
  tokenPrice = Math.round(tokenPrice * precision) / precision

  return({
    ...order,
    etherAmount: ether(etherAmount),
    tokenAmount: tokens(tokenAmount),
    tokenPrice,
    formattedTimestamp: moment.unix(order.timestamp).format('h:mm:ss a M/D')
  })

}

const decorateFilledOrder = (order, previousOrder) => {
  return({
    ...order,
    tokenPriceClass: tokenPriceClass(order.tokenPrice, order.id, previousOrder)
  })
}

const tokenPriceClass = (tokenPrice, orderId, previousOrder) => {
  if(previousOrder.id === orderId) {
    return GREEN 
  }
  
  // display price in green if higher order price than previous
  // display price in red if lower order price than previous
  
  
  if(previousOrder.tokenPrice <= tokenPrice) {
    return GREEN  //success
  } else {
    return RED   //danger
  }
}


const openOrders = state => {
  const all = allOrders(state)
  const cancelled = cancelledOrders(state)
  const filled = filledOrders(state)

  const openOrders = reject(all, (order) => {
    const orderCancelled = cancelled.some((o) => o.id === order.id)
    const orderFilled = filled.some((o) => o.id === order.id)
    return(orderFilled || orderCancelled)

  })
  return openOrders
}



const orderBookLoaded = state => cancelledOrdersLoaded(state) && filledOrdersLoaded(state) && allOrdersLoaded(state)
export const orderBookLoadedSelector = createSelector(orderBookLoaded, loaded => loaded)

//create the Order book
export const orderBookSelector = createSelector(
  openOrders,
  (orders) => {
    //decorate orders
    orders = decorateOrderBookOrders(orders)
    orders = groupBy(orders, 'orderType')

    const buyOrders = get(orders, 'buy', [])
    //sort by price
    orders = {
      ...orders, 
      buyOrders: buyOrders.sort((a,b) => b.tokenPrice - a.tokenPrice)
    }

    const sellOrders = get(orders, 'sell', [])
    //sort by price
    orders = {
      ...orders, 
      sellOrders: sellOrders.sort((a,b) => b.tokenPrice - a.tokenPrice)
    }
    return orders
  }
)

const decorateOrderBookOrders = (orders) => {
  return(
    orders.map((order) => {
      //standard decoration
      order = decorateOrder(order)
      
      //add order book specific decoration
      order = decorateOrderBookOrder(order)
      return(order)
    })
  )
}

const decorateOrderBookOrder = (order) => {
  const orderType = order.tokenGive === ETHER_ADDRESS ? 'buy' : 'sell'
  return({
    ...order,
    orderType,
    orderTypeClass: (orderType === 'buy' ? GREEN : RED),
    orderFillClass: orderType === 'buy' ? 'sell' : 'buy'
  })
}


export const myFilledOrdersLoadedSelector = createSelector(filledOrdersLoaded, loaded => loaded)

export const myFilledOrdersSelector = createSelector(
  account,
  filledOrders,
  (account, orders) => {
    orders = orders.filter((o) => o.user === account || o.userFill === account)
    orders = orders.sort((a,b) => a.timestamp = b.timestamp)

    orders = decorateMyFilledOrders(orders, account)
    return orders
  }
)

const decorateMyFilledOrders = (orders, account) => {
  return(
    orders.map((order) => {
      order = decorateOrder(order)
      order = decorateMyFilledOrder(order, account)
      return(order)
    })
  )
}


const decorateMyFilledOrder = (order, account) => { 
  const myOrder = order.user === account

let orderType
  if(myOrder) {
    orderType = order.tokenGive === ETHER_ADDRESS ? 'buy' : 'sell'
  } else {
    orderType = order.tokenGive === ETHER_ADDRESS ? 'sell' : 'buy'
  }

  return({
    ...order,
    orderType,
    orderTypeClass: (orderType === 'buy' ? GREEN : RED),
    orderSign: (orderType === 'buy' ? '+' : '-')
  })
}

export const myOpenOrdersLoadedSelector = createSelector(orderBookLoaded, loaded => loaded)

export const myOpenOrdersSelector = createSelector(
  account,
  openOrders,
  (account, orders) => {
    // Filter orders created by current account
    orders = orders.filter((o) => o.user === account)
    // Decorate orders - add display attributes
    orders = decorateMyOpenOrders(orders)
    // Sort orders by date descending
    orders = orders.sort((a,b) => b.timestamp - a.timestamp)
    return orders
  }
)

  const decorateMyOpenOrders = (orders, account) => {
    return(
      orders.map((order) => {
        order = decorateOrder(order)
        order = decorateMyOpenOrder(order, account)
        return(order)
      })
    )
  }
  
  const decorateMyOpenOrder = (order, account) => {
    let orderType = order.tokenGive === ETHER_ADDRESS ? 'buy' : 'sell'
  
    return({
      ...order,
      orderType,
      orderTypeClass: (orderType === 'buy' ? GREEN : RED)
    })
  }

  export const priceChartLoadedSelector = createSelector(filledOrdersLoaded, loaded => loaded)

  export const priceChartSelector = createSelector(
    filledOrders,
    (orders) => {
      //sort orders by ascending
      orders = orders.sort((a,b) => a.timestamp - b.timestamp)
      //decorate
      orders = orders.map((o) => decorateOrder(o))
      //get last 2 orders for final price and price change
      let secondLastOrder, lastOrder
      [secondLastOrder, lastOrder] = orders.slice(orders.length - 2, orders.length)
      //last order price
      const lastPrice = get(lastOrder, 'tokenPrice', 0)
      const secondLastPrice = get(secondLastOrder, 'tokenPrice', 0)
      
      return({
        lastPrice,
        lastPriceChange: (lastPrice >= secondLastPrice ? "+" : "-"),
        series: [{
          data: buildGraphData(orders)
        }]
      })
    }
  )

  const buildGraphData = (orders) => {
    //group orders by the hour and converted to unix
    orders = groupBy(orders, (o) => moment.unix(o.timestamp).startOf('hour').format())
    //get hours where data exists
    const hours = Object.keys(orders)
    //build the graph in series
    const graphData = hours.map((hour) => {
      //fetch open orders
      const group = orders[hour]
      //calculate price values for: open/high/low/close
      const open = group[0] // first order
      const high = maxBy(group, 'tokenPrice')
      const low = minBy(group, 'tokenPrice')
      const close = group[group.length -1] // last order
      
      return({
        x: new Date(hour),
        y: [open.tokenPrice, high.tokenPrice, low.tokenPrice, close.tokenPrice]
      })
    })
    return graphData
  }