import DPool from './CreatePool'
import DPoolFactory from './dPoolFactory/index'
import useDPoolAddress from '../../hooks/useDPoolAddress'

export default function Distribution() {
  const { isOwner } = useDPoolAddress()
  return isOwner ? <DPool /> : <DPoolFactory />
}
