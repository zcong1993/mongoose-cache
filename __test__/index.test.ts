import * as Redis from 'ioredis'
import * as mongoose from 'mongoose'
import { createCachePlugin, CacheModel } from '../src'

const redis = new Redis(process.env.REDIS_URI)
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false
})

const TestSchema = new mongoose.Schema({
  name: String,
  age: Number,
  is_deleted: Boolean
})

createCachePlugin({
  redis,
  enable: true,
  externalKeys: ['name'],
  extQuery: { is_deleted: false }
})(TestSchema)

const Test = mongoose.model<any, CacheModel<any>>('Test', TestSchema)

const Test2Schema = new mongoose.Schema({
  name: String,
  age: Number,
  is_deleted: Boolean
})

createCachePlugin({
  redis,
  enable: false,
  externalKeys: ['name']
})(Test2Schema)

const Test2 = mongoose.model<any, CacheModel<any>>('Test2', Test2Schema)

const Test3Schema = new mongoose.Schema({
  name: String,
  age: Number,
  is_deleted: Boolean
})

createCachePlugin({
  redis,
  enable: true,
  externalKeys: ['name']
})(Test3Schema)

const Test3 = mongoose.model<any, CacheModel<any>>('Test3', Test3Schema)

const Test4Schema = new mongoose.Schema({
  name: String,
  age: Number,
  is_deleted: Boolean
})

createCachePlugin({
  redis,
  enable: true
})(Test4Schema)

const Test4 = mongoose.model<any, CacheModel<any>>('Test4', Test4Schema)

const test1 = {
  name: 'test1',
  age: 18,
  is_deleted: false
}

const test2 = {
  name: 'test2',
  age: 19,
  is_deleted: false
}

const test3 = {
  name: 'test3',
  age: 20,
  is_deleted: true
}

beforeEach(async () => {
  await Test.create([test1, test2, test3])
  await Test2.create([test1, test2, test3])
  await Test3.create([test1, test2, test3])
  await Test4.create([test1, test2, test3])
})

afterEach(async () => {
  await Test.deleteMany({})
  await Test2.deleteMany({})
  await Test3.deleteMany({})
  await Test4.deleteMany({})
  await redis.flushdb()
})

it('should work well', async () => {
  const test1Record = await Test.findOne({ name: 'test1' })
  const test2Record = await Test.findOne({ name: 'test2' })
  for (const _ of Array(10).fill(null)) {
    const test1Res = await Test.getBy('test1', 'name')
    expect(test1Res.toObject()).toEqual(test1Record.toObject())

    const test2Res = await Test.getBy('test2', 'name')
    expect(test2Res.toObject()).toEqual(test2Record.toObject())

    const test3Res = await Test.getBy('test3', 'name')
    expect(test3Res).toBe(null)
  }

  let keys = await redis.keys('*')
  expect(keys.length).toBe(2)

  for (const _ of Array(10).fill(null)) {
    const test1Res = await Test.getBy(test1Record._id.toString())
    expect(test1Res.toObject()).toEqual(test1Record.toObject())

    const test2Res = await Test.getBy(test2Record._id.toString())
    expect(test2Res.toObject()).toEqual(test2Record.toObject())
  }

  keys = await redis.keys('*')
  expect(keys.length).toBe(4)

  const getManyRes = await Test.getManyBy(['test1', 'test2', 'test3'], 'name')
  expect(getManyRes.map(r => (r ? r.toObject() : r))).toEqual([
    test1Record.toObject(),
    test2Record.toObject(),
    null
  ])

  const getManyByIdRes = await Test.getManyBy([
    test1Record._id.toString(),
    test2Record._id.toString()
  ])
  expect(getManyByIdRes.map(r => (r ? r.toObject() : r))).toEqual([
    test1Record.toObject(),
    test2Record.toObject()
  ])
})

it('should works well without extQuery', async () => {
  const test1Record = await Test3.findOne({ name: 'test1' })
  const test2Record = await Test3.findOne({ name: 'test2' })
  for (const _ of Array(10).fill(null)) {
    const test1Res = await Test3.getBy('test1', 'name')
    expect(test1Res.toObject()).toEqual(test1Record.toObject())

    const test2Res = await Test3.getBy('test2', 'name')
    expect(test2Res.toObject()).toEqual(test2Record.toObject())
  }

  let keys = await redis.keys('*')
  expect(keys.length).toBe(2)

  for (const _ of Array(10).fill(null)) {
    const test1Res = await Test3.getBy(test1Record._id.toString())
    expect(test1Res.toObject()).toEqual(test1Record.toObject())

    const test2Res = await Test3.getBy(test2Record._id.toString())
    expect(test2Res.toObject()).toEqual(test2Record.toObject())
  }

  keys = await redis.keys('*')
  expect(keys.length).toBe(4)

  const getManyRes = await Test3.getManyBy(['test1', 'test2'], 'name')
  expect(getManyRes.map(r => (r ? r.toObject() : r))).toEqual([
    test1Record.toObject(),
    test2Record.toObject()
  ])

  const getManyByIdRes = await Test3.getManyBy([
    test1Record._id.toString(),
    test2Record._id.toString()
  ])
  expect(getManyByIdRes.map(r => (r ? r.toObject() : r))).toEqual([
    test1Record.toObject(),
    test2Record.toObject()
  ])
})

it('should works well without externalKeys', async () => {
  const test1Record = await Test4.findOne({ name: 'test1' })
  const test2Record = await Test4.findOne({ name: 'test2' })

  let keys = await redis.keys('*')
  expect(keys.length).toBe(0)

  for (const _ of Array(10).fill(null)) {
    const test1Res = await Test4.getBy(test1Record._id.toString())
    expect(test1Res.toObject()).toEqual(test1Record.toObject())

    const test2Res = await Test4.getBy(test2Record._id.toString())
    expect(test2Res.toObject()).toEqual(test2Record.toObject())
  }

  keys = await redis.keys('*')
  expect(keys.length).toBe(2)

  const getManyByIdRes = await Test4.getManyBy([
    test1Record._id.toString(),
    test2Record._id.toString()
  ])
  expect(getManyByIdRes.map(r => (r ? r.toObject() : r))).toEqual([
    test1Record.toObject(),
    test2Record.toObject()
  ])
})

it('not enable should work well', async () => {
  const test1Record = await Test2.findOne({ name: 'test1' })
  const test2Record = await Test2.findOne({ name: 'test2' })
  const test3Record = await Test2.findOne({ name: 'test3' })

  let keys = await redis.keys('*')
  expect(keys.length).toBe(0)

  for (const _ of Array(10).fill(null)) {
    const test1Res = await Test2.getBy(test1Record._id.toString())
    expect(test1Res.toObject()).toEqual(test1Record.toObject())

    const test2Res = await Test2.getBy(test2Record._id.toString())
    expect(test2Res.toObject()).toEqual(test2Record.toObject())
  }

  keys = await redis.keys('*')
  expect(keys.length).toBe(0)

  const getManyRes = await Test2.getManyBy(['test1', 'test2', 'test3'], 'name')
  expect(getManyRes.map(r => (r ? r.toObject() : r))).toEqual([
    test1Record.toObject(),
    test2Record.toObject(),
    test3Record.toObject()
  ])

  const getManyByIdRes = await Test2.getManyBy([
    test1Record._id.toString(),
    test2Record._id.toString()
  ])
  expect(getManyByIdRes.map(r => (r ? r.toObject() : r))).toEqual([
    test1Record.toObject(),
    test2Record.toObject()
  ])
})

it('delete should works well', async () => {
  const res = await Test.getManyBy(['test1', 'test2', 'test3'], 'name')
  let keys = await redis.keys('*')
  expect(keys.length).toBe(2)

  await Test.delDocCache(res[0])
  keys = await redis.keys('*')
  expect(keys.length).toBe(1)

  await Test.delCache('test2', 'name')
  keys = await redis.keys('*')
  expect(keys.length).toBe(0)
})

it('delete cache should works well', async () => {
  const test1Record = await Test.findOne({ name: 'test1' })
  await Test.getBy(test1Record._id.toString())
  let keys = await redis.keys('*')
  expect(keys.length).toBe(1)

  await Test.delCache(test1Record._id.toString())
  keys = await redis.keys('*')
  expect(keys.length).toBe(0)
})

it('delete doc multi should works well', async () => {
  const res = await Test.getManyBy(['test1', 'test2', 'test3'], 'name')
  let keys = await redis.keys('*')
  expect(keys.length).toBe(2)

  await Test.delDocCache(res)
  keys = await redis.keys('*')
  expect(keys.length).toBe(0)
})

it('delete multi should works well', async () => {
  const res = await Test.getManyBy(['test1', 'test2', 'test3'], 'name')
  let keys = await redis.keys('*')
  expect(keys.length).toBe(2)

  await Test.delCache(res.filter(Boolean).map(r => r.name), 'name')
  keys = await redis.keys('*')
  expect(keys.length).toBe(0)
})

it('update should remove cache', async () => {
  const res = await Test.getManyBy(['test1', 'test2', 'test3'], 'name')
  let keys = await redis.keys('*')
  expect(keys.length).toBe(2)

  await Test.updateMany({ name: 'test1' }, { $inc: { age: 1 } })

  keys = await redis.keys('*')
  expect(keys.length).toBe(1)
})
