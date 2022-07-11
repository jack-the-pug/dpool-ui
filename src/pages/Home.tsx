import Distribution from './distribution/index'
import AddressBook from './addressBook/index'
import { Routes, Route } from 'react-router-dom'
import PoolList from './pool/PoolList'
import PoolDetail from './pool/PoolDetail'

export default function Home() {
  return (
    <Routes>
      <Route path="/" element={<Distribution />} />
      <Route path="/distributions" element={<PoolList />} />
      <Route path="/distributions/:poolId" element={<PoolDetail />} />
      <Route path="/addressBook" element={<AddressBook />} />
    </Routes>
  )
}
