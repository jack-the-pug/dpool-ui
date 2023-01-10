import { useLocation } from 'react-router-dom'
import { useParams, Link } from 'react-router-dom'
import { VscodeIconsFileTypeDependencies } from '../../components/icon'
import useDPoolAddress from '../../hooks/useDPoolAddress'
import Connector from './Connector'
import Network from './Network'

export default function LayoutHeader() {
  const { dPoolAddress } = useDPoolAddress()
  const { pathname } = useLocation()
  return (
    <header className="w-full flex justify-between items-center mt-2 px-5 gap-10">
      <div className='flex items-center'>
        <div className="flex items-center">
          <VscodeIconsFileTypeDependencies />
          <h2 className='text-2xl ml-2'>dPool</h2>
        </div>
        <div className='ml-8'>
          <Link
            to="/"
            className={`font-medium ${pathname === '/' && 'text-green-500'}`}
          >
            Create
          </Link>
          <Link
            to="/distributions"
            className={`ml-4 font-medium ${pathname.includes('/distributions') && 'text-green-500'}`}
          >
            Distributions
          </Link>
          <Link
            to="/addressBook"
            className={`ml-4 font-medium ${pathname.includes('/addressBook') && 'text-green-500'}`}
          >
            AddressBook
          </Link>
        </div>
      </div>
      <div className="flex gap-4">
        <Network />
        <Connector />
      </div>
    </header>
  )
}
