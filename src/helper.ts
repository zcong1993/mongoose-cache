export const buildKey = (...args: string[]): string => {
  return args.join(':')
}

export const buildMap = <T = any>(arr: T[], field: string): Map<any, T> => {
  const mp = new Map<any, T>()

  arr.forEach(item => {
    let key = (item as any)[field]
    if (typeof key === 'object') {
      key = key.toString()
    }
    mp.set(key, item)
  })

  return mp
}

export const flat = <T = any>(arr: any[]): T[] => {
  return arr.reduce((pre, cur) => {
    return pre.concat(Array.isArray(cur) ? flat<T>(cur) : cur)
  }, [])
}
