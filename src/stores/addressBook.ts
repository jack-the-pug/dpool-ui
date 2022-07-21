import Dexie, { Table } from 'dexie'

export interface AddressBookRow {
  address: string
  name: string
  id: string
}

class AddressBook extends Dexie {
  addressBook!: Table<AddressBookRow>
  constructor() {
    super('addressBook')
    this.version(1).stores({
      addressBook: '&id, &address, name',
    })
  }
}

export const db = new AddressBook()

export const getBookRow = async (id: string) => {
  return await db.addressBook.where('id').equals(id).first()
}

export const updateBookRow = async (meta: AddressBookRow) => {
  const row = { ...meta }
  console.log('updateBookRow', row)
  return await db.addressBook.put(row)
}

export const deleteBookRow = async (id: string) => {
  return await db.addressBook.delete(id)
}

export const getBook = async () => {
  return await db.addressBook.orderBy('address').toArray()
}

export const bulkAdd = async (rows: AddressBookRow[]) => {
  return await db.addressBook.bulkPut(rows)
}
