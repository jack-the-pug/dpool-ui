import './App.css'
import LayoutHeader from './pages/header'
import LayoutHome from './pages/Home'
import ReactDom from 'react-dom'
import { MetaMask } from '@web3-react/metamask'
import { Web3ReactProvider, Web3ReactHooks } from '@web3-react/core'
import { hooks as metaMaskHooks, metaMask } from './connectors/metaMask'
import { hooks as networkHooks, network } from './connectors/network'
import { ToastContainer } from 'react-toastify'
import { HashRouter } from 'react-router-dom'
import { RecoilRoot } from 'recoil'
import { Network } from '@web3-react/network'
const connectors: [MetaMask | Network, Web3ReactHooks][] = [
  [metaMask, metaMaskHooks],
  [network, networkHooks],
]
function App() {
  return (
    <Web3ReactProvider connectors={connectors}>
      <HashRouter>
        <RecoilRoot>
          <div className="w-full h-full flex flex-col items-center">
            <LayoutHeader />
            <div className="max-w-7xl mt-8">
              <LayoutHome />
            </div>
            {ReactDom.createPortal(
              <ToastContainer
                position="top-left"
                closeOnClick={false}
                autoClose={6000}
                toastClassName="bg-neutral-200 z-50 break-all"
              />,
              document.body
            )}
          </div>
        </RecoilRoot>
      </HashRouter>
    </Web3ReactProvider>
  )
}
export default App
