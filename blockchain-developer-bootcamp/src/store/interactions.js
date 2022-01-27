import Web3 from 'web3'
import {
    web3Loaded,
    web3AccountLoaded,
    tokenLoaded,
    exchangeLoaded,
    cancelledOrdersLoaded,
    filledOrdersLoaded,
    allOrdersLoaded,
    orderCancelling
 } from "./actions"

import Token from "../abis/Token.json"
import Exchange from "../abis/Exchange.json"



export const loadWeb3 = async (dispatch) => {
    if(typeof window.ethereum!=='undefined'){
        const web3 = new Web3(window.ethereum)
        dispatch(web3Loaded(web3))
        return web3
      } else {
        window.alert('Please install MetaMask')
        window.location.assign("https://metamask.io/")
      }
}


export const loadAccount = async (web3, dispatch) => {
    const accounts = await web3.eth.getAccounts()
    const account = accounts[0]
    // console.log(account)
    dispatch(web3AccountLoaded(account))
    return account
}

export const loadToken = async (web3, networkId, dispatch) => {
    try {
    const token = new web3.eth.Contract(Token.abi, Token.networks[networkId].address)
    dispatch(tokenLoaded(token))
    return token
    }   catch (error) {
        console.log('Contract not deployed to the current network. Please select another network with Metamask.')
    return null
    }
}

export const loadExchange = async (web3, networkId, dispatch) => {
    
  try {
    const exchange = new web3.eth.Contract(Exchange.abi, Exchange.networks[networkId].address)
    dispatch(exchangeLoaded(exchange))
    return exchange
  } catch (error) {
        console.log('Contract not deployed to the current network. Please select another network with Metamask.')
        return null
  }
}



export const loadAllOrders = async (exchange, dispatch) => {
    //fetch cancel orders with cancel event stream
    const cancelStream = await exchange.getPastEvents('Cancel', { fromBlock: 0, toBlock: 'latest' })

    //format the cancelled orders
    const cancelledOrders = cancelStream.map((event) => event.returnValues)
    // console.log(cancelledOrders)

    //add the cancelled order to the Redux Store
    dispatch(cancelledOrdersLoaded(cancelledOrders))
   

    //fetch filled orders with trade event stream
    const tradeStream = await exchange.getPastEvents('Trade', { fromBlock: 0, toBlock: 'latest' })
    
    //format orders
    const filledOrders = tradeStream.map((event) => event.returnValues)
    
    //add the filled store to redux
    dispatch(filledOrdersLoaded(filledOrders))

    //fetch all orders with order event stream
    const orderStream = await exchange.getPastEvents('Order', { fromBlock: 0, toBlock: 'latest' })
    //format the stream
    const allOrders = orderStream.map((event) => event.returnValues)
    //add order to redux store
    dispatch(allOrdersLoaded(allOrders))

}

export const cancelOrder =  (dispatch, exchange, order, account) => {
  exchange.methods.cancelOrder(order.id).send({ from: account })
  .on('transactionHash', (hash) => {
    dispatch(orderCancelling())
  })
  .on('error', (error) => {
    console.log(error)
    window.alert('There was an error')
  })
}