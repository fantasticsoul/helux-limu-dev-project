export type ReactNode = any;

export type PropsWithChildren<P> = P & { children?: ReactNode | undefined };

type ReactElement = any;

export interface FunctionComponent<P = {}> {
  (props: PropsWithChildren<P>, context?: any): ReactElement | null;
  propTypes?: any;
  contextTypes?: any;
  defaultProps?: Partial<P> | undefined;
  displayName?: string | undefined;
}

export interface MutableRefObject<T> {
  current: T;
}

export type ForwardedRef<T> = ((instance: T | null) => void) | MutableRefObject<T | null> | null;
