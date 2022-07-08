import { Link } from 'react-router-dom'
import {
  RiBitCoinLine,
  MaterialSymbolsTableRowsOutline,
  RiContactsBookLine,
} from '../../components/icon'

export default function Footer() {
  return (
    <div className="w-full flex gap-5 justify-center py-6">
      <div title="Distribution">
        <Link to="/">
          <RiBitCoinLine className="cursor-pointer" />
        </Link>
      </div>
      <div title="Distribution Pool">
        <Link to="/pool">
          <MaterialSymbolsTableRowsOutline className="cursor-pointer" />
        </Link>
      </div>
    </div>
  )
}
