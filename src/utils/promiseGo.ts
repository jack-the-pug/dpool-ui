type PromiseGoReturn<T> = [T, false] | [null, Error]
export function promiseGo<R>(fn: Function, ...arg: any) {
  return new Promise((resolve: (r: PromiseGoReturn<R>) => void) => {
    fn(...arg)
      .then((res: R) => resolve([res, false]))
      .catch((err: Error) => resolve([null, err]))
  })
}
