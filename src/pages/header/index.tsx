import { useLocation } from 'react-router-dom'
import { useParams, Link } from 'react-router-dom'
import useDPoolAddress from '../../hooks/useDPoolAddress'
import Connector from './Connector'
import Network from './Network'

export default function LayoutHeader() {
  const { dPoolAddress } = useDPoolAddress()
  const { pathname } = useLocation()
  return (
    <header className="w-full flex justify-between items-center mt-2 px-5 gap-10">
      <div className="flex flex-col">
        <h2>dPool</h2>
        {dPoolAddress && pathname !== '/dPoolFactory' ? (
          <span className="mr-1 text-xs text-gray-500">{dPoolAddress}</span>
        ) : null}
      </div>
      <div>
        <Link
          to="/"
          className={`border-solid  rounded p-1.5 py-0.5 inline-block border text-gray-500 ${
            pathname === '/' ? 'text-black border-black' : 'border-gray-400'
          }`}
        >
          Create
        </Link>
        <Link
          to="/distributions"
          className={`border-solid  rounded p-1.5 py-0.5 inline-block border ml-4 text-gray-500 ${
            pathname.includes('/distributions')
              ? 'text-black border-black'
              : 'border-gray-400'
          }`}
        >
          Distributions
        </Link>
        <Link
          to="/addressBook"
          className={`border-solid  rounded p-1.5 py-0.5 inline-block border ml-4 text-gray-500 ${
            pathname.includes('/addressBook')
              ? 'text-black border-black'
              : 'border-gray-400'
          }`}
        >
          Address Book
        </Link>
      </div>
      <div className="flex gap-4">
        <Network />
        <Connector />
      </div>
    </header>
  )
}
