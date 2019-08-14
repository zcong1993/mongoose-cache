import { Document } from 'mongoose'
import * as debug from 'debug'
import { ContextWithModel } from './types'
import { buildKey, buildMap } from './helper'

const cacheDebugger = debug('mongoose-cache')

export const buildKeysWithoOpt = <
  T extends Document = Document,
  QueryHelpers = {}
>(
  ctx: ContextWithModel<T, QueryHelpers>,
  field: string,
  key: string
): string => {
  return ctx.extQuery
    ? buildKey(ctx.model.modelName, field, key, JSON.stringify(ctx.extQuery))
    : buildKey(ctx.model.modelName, field, key)
}

const findMany = async <T extends Document = Document, QueryHelpers = {}>(
  ctx: ContextWithModel<T, QueryHelpers>,
  keys: string[],
  field: string = '_id'
) => {
  return ctx.model.find({
    [field]: {
      $in: keys
    },
    ...ctx.extQuery
  })
}

const setCacheMany = async <T extends Document = Document, QueryHelpers = {}>(
  ctx: ContextWithModel<T, QueryHelpers>,
  mp: Map<any, T>,
  field: string
) => {
  const commands: string[][] = []
  for (const [key, value] of mp.entries()) {
    commands.push([
      'set',
      buildKeysWithoOpt(ctx, field, key),
      JSON.stringify(value)
    ])
  }

  return ctx.redis.multi(commands).exec()
}

export const delCache = async <
  T extends Document = Document,
  QueryHelpers = {}
>(
  ctx: ContextWithModel<T, QueryHelpers>,
  keys: string[]
) => {
  cacheDebugger('del keys: ', keys)
  return ctx.redis.multi(keys.map(key => ['del', key])).exec()
}

export const getMany = async <T extends Document = Document, QueryHelpers = {}>(
  ctx: ContextWithModel<T, QueryHelpers>,
  keys: string[],
  field: string = '_id'
) => {
  if (!ctx.enable) {
    return findMany(ctx, keys, field)
  }
  const cacheRes = await ctx.redis.mget(
    ...keys.map(key => buildKeysWithoOpt(ctx, field, key))
  )
  cacheDebugger('cacheRes', cacheRes)
  const missingKeys = keys.filter((_, i) => !cacheRes[i])
  cacheDebugger('missingKeys', missingKeys)
  const missingRecords = await findMany(ctx, missingKeys, field)
  const missingRecordsMap = buildMap(missingRecords, field)
  await setCacheMany(ctx, missingRecordsMap, field)
  // merge record
  return keys.map((key, i) => {
    if (cacheRes[i]) {
      return new ctx.model(JSON.parse(cacheRes[i]))
    }

    return missingRecordsMap.get(key) || null
  })
}

export const get = async <T extends Document = Document, QueryHelpers = {}>(
  ctx: ContextWithModel<T, QueryHelpers>,
  key: string,
  field: string = '_id'
) => {
  const [value] = await getMany(ctx, [key], field)
  return value
}

export const buildDelKeys = <T extends Document = Document, QueryHelpers = {}>(
  ctx: ContextWithModel<T, QueryHelpers>,
  doc: T
) => {
  const fields = [...ctx.externalKeys] || []
  fields.push('_id')

  return fields.map(field => buildKeysWithoOpt(ctx, field, (doc as any)[field]))
}
