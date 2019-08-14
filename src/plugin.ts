import { Document, Schema, Model } from 'mongoose'
import { Context } from './types'
import {
  get,
  getMany,
  buildDelKeys,
  delCache,
  buildKeysWithoOpt
} from './cache'
import { flat } from './helper'

const HOOK_METHODS = [
  'save',
  'findOneAndUpdate',
  'findOneAndRemove',
  'findOneAndDelete'
]
const HOOK_MULTI_UPDATE_METHODS = ['update', 'updateMany', 'updateOne']

export interface CacheModel<T extends Document, QueryHelpers = {}>
  extends Model<T, QueryHelpers> {
  getBy(key: string, field?: string): Promise<T>
  getManyBy(keys: string[], field?: string): Promise<T[]>
  delDocCache(doc: T | T[]): Promise<void>
  delCache(key: string | string[], field?: string): Promise<void>
}

export const createCachePlugin = <
  T extends Document = Document,
  QueryHelpers = {}
>(
  ctx: Context
) => {
  const hookRemove = async (doc: any) => {
    if (!ctx.enable) {
      return
    }

    const model = doc.constructor
    const options = {
      ...ctx,
      model
    }

    const delKeys = buildDelKeys(options, doc)
    await delCache(options, delKeys)
  }

  const hookMultiUpdate = async function() {
    const options = {
      ...ctx,
      model: this.model
    }

    // todo: concern multi options
    const updateDocs = await this.model.find(
      this._conditions,
      options.externalKeys.toString()
    )

    const delKeys = flat<string>(
      updateDocs.map((doc: any) => buildDelKeys(options, doc))
    )

    await delCache(options, delKeys)
  }

  return (schema: Schema) => {
    HOOK_METHODS.forEach(method => {
      schema.post(method, hookRemove)
    })

    HOOK_MULTI_UPDATE_METHODS.forEach(method => {
      schema.pre(method, hookMultiUpdate)
    })

    schema.statics.getBy = async function(key: string, field: string = '_id') {
      return get<T, QueryHelpers>(
        {
          ...ctx,
          model: this
        },
        key,
        field
      )
    }

    schema.statics.getManyBy = async function(
      keys: string[],
      field: string = '_id'
    ) {
      return getMany<T, QueryHelpers>(
        {
          ...ctx,
          model: this
        },
        keys,
        field
      )
    }

    schema.statics.delDocCache = async function(docs: T | T[]) {
      const options = {
        ...ctx,
        model: this
      }

      const ds = Array.isArray(docs) ? docs : [docs]

      const delKeys = flat<string>(
        ds.filter(Boolean).map(doc => buildDelKeys(options, doc))
      )

      return delCache(options, delKeys)
    }

    schema.statics.delCache = async function(
      keys: string | string[],
      field: string = '_id'
    ) {
      const options = {
        ...ctx,
        model: this
      }
      const kk = Array.isArray(keys) ? keys : [keys]
      const delKeys = flat<string>(
        kk.map(key => buildKeysWithoOpt(options, field, key))
      )
      return delCache(options, delKeys)
    }
  }
}
