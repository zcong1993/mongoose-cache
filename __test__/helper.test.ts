import { buildKey, buildMap, flat } from '../src/helper'

it('buildKey should work well', () => {
  expect(buildKey('a', 'b', 'c')).toBe('a:b:c')
  expect(buildKey('aa', 'b', 'ccc')).toBe('aa:b:ccc')
})

it('buildMap should works well', () => {
  const test1 = {
    key: 'test1'
  }

  const test2 = {
    key: 'test2'
  }

  const fixtureArr = [test1, test2]

  const mp = new Map()
  mp.set('test1', test1)
  mp.set('test2', test2)

  expect(buildMap(fixtureArr, 'key')).toEqual(mp)
})

it('flat should works well', () => {
  expect(flat([1, 2, 3, [4, 5]])).toEqual([1, 2, 3, 4, 5])
})
