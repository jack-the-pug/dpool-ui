import { values, get, del, set, setMany } from 'idb-keyval'
export interface AddressBookRow {
  address: string
  name: string
  id: string
  index: number
}

export const getBookRow = async (id: string) => {
  return await get(id.toLowerCase())
}

export const updateBookRow = async (meta: AddressBookRow) => {
  const row = { ...meta }
  return await set(row.id.toLowerCase(), row)
}

export const deleteBookRow = async (id: string) => {
  return await del(id.toLowerCase())
}

export const getBook = async () => {
  const val = await values()
  val.sort((a, b) => a.index - b.index)
  return val
}

export const bulkAdd = async (rows: AddressBookRow[]) => {
  const list = rows.map((row): [string, AddressBookRow] => [
    row.id.toLowerCase(),
    row,
  ])
  return setMany(list)
}
