import Distribution from './distribution/index'
import AddressBook from './addressBook/index'
import { Routes, Route } from 'react-router-dom'
import PoolList, { PoolDetailList } from './pool/PoolList'

export default function Home() {
  return (
    <Routes>
      <Route path="/" element={<Distribution />} />
      <Route path="/distributions" element={<PoolList />} />
      <Route path="/distributions/:poolIds" element={<PoolDetailList />} />
      <Route path="/addressBook" element={<AddressBook />} />
    </Routes>
  )
}
