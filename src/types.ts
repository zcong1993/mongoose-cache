import { Redis } from 'ioredis'
import { Model, Document } from 'mongoose'

export interface Context {
  redis: Redis
  enable?: boolean
  externalKeys?: string[]
  extQuery?: any
}

export interface ContextWithModel<T extends Document, QueryHelpers = {}>
  extends Context {
  model: Model<T, QueryHelpers>
}
